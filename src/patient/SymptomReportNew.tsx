import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { IoArrowBackOutline } from 'react-icons/io5';
import { HiOutlineDownload } from 'react-icons/hi';
import { LuActivity, LuListChecks, LuCircleCheck, LuCircle, LuMessageSquare } from 'react-icons/lu';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { PatientData } from '../types/patient';
import RiskScoreTimeline from './RiskScoreTimeline';
import ReasoningDiff from './ReasoningDiff';
import ActionChecklist from './ActionChecklist';
import useSelectionMenu from "../hooks/useSelectionMenu";
import SelectionMenu from "../components/SelectionMenu"
import RiskFactorBreakdown from './RiskFactorBreakdown';
import CommentsPanel, { type CommentPayload } from '../components/CommentsPanel';
import NotesDrawer, { type VersionedComment } from '../components/NotesDrawer';
import ReportVersionPicker from '../components/ReportVersionPicker';
import { patientService } from '../services/patientServices';
import ClinicalReasoningVerificationDialog, {
  type RubricVerificationData,
  type ReportSectionPreview,
} from '../components/ClinicalReasoningVerificationDialog';
import VerificationStatusBar from '../components/VerificationStatusBar';
import { diagnosisVerificationService } from '../services/diagnosisVerificationService';
import { useClinicalVerification } from '../hooks/useClinicalVerification';
import { isScoreAcceptable } from '../constants/clinicalReasoningRubric';
import { resolveSymptomReportDocumentId } from '../utils/symptomReportDocumentId';
import { applyCommentHighlights } from '../utils/commentHighlights';
import { buildSymptomReportVersions, getVersionShortLabel } from '../utils/symptomReportVersions';

interface SymptomReportProps {
  report: any;
  patient?: PatientData;
  onBack?: () => void;
  reportHistory?: any[];
  onEscalate?: (message: string) => Promise<void>;
  onSaveComment?: (payload: CommentPayload) => Promise<void>;
}

const RISK_COLORS: Record<string, string> = {
  CRITICAL: '#dc2626',
  HIGH: '#ea580c',
  MODERATE: '#ca8a04',
  LOW: '#16a34a',
};

type ParseListField = 'keyRiskFactors' | 'primaryConcerns' | 'immediateActions' | 'monitoring' | 'recommendations' | 'default';

const parseList = (raw: any, field: ParseListField = 'default'): string[] => {
  if (!raw) return [];

  // Helper to optionally clean markdown based on field
  const clean = (s: string) => {
    const str = String(s).trim();
    if (field === 'keyRiskFactors') {
      return cleanMarkdown(str);
    }
    return str;
  };

  // Already an array — just clean it up
  if (Array.isArray(raw)) {
    return raw.filter(Boolean).map(s => clean(s)).filter(Boolean);
  }

  // Try JSON array string
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(Boolean).map(s => clean(s)).filter(Boolean);
    }
  } catch { /* not valid JSON — fall through */ }

  const str = (field === 'keyRiskFactors' ? cleanMarkdown(String(raw)) : String(raw)).replace(/^\[|\]$/g, '').trim();

  if (field === 'keyRiskFactors') {
    // Try newline first
    const byNewline = str.split(/\n+/).map(s => s.trim()).filter(Boolean);
    if (byNewline.length > 1) return byNewline;

    // Split on ", " only when followed by a capital letter or digit
    // This avoids splitting mid-item on things like "120.0; unit/date not documented, Platelets..."
    const byCommaCapital = str
      .split(/,\s+(?=[A-Z0-9])/)
      .map(s => s.replace(/\.$/, '').trim())
      .filter(Boolean);
    if (byCommaCapital.length > 1) return byCommaCapital;

    // fallback: "., " separator
    return str
      .split(/\.,\s+/)
      .map(s => s.replace(/\.$/, '').trim())
      .filter(Boolean);
  }

  // primaryConcerns: backend sends semicolon-separated
  // e.g. "Concern one; Concern two; Concern three"
  if (field === 'primaryConcerns') {
    const bySemicolon = str.split(/;\s+/).map(s => s.trim()).filter(Boolean);
    if (bySemicolon.length > 1) return bySemicolon;

    // fallback: newline
    const byNewline = str.split(/\n+/).map(s => s.trim()).filter(Boolean);
    if (byNewline.length > 1) return byNewline;

    return [str];
  }

  // immediateActions / monitoring / recommendations:
  // backend sends "., " (period-comma-space) as item boundary
  // e.g. "Do X because Y., Do Z because W."
  if (field === 'immediateActions' || field === 'monitoring' || field === 'recommendations') {
    const byPeriodComma = str.split(/\.,\s+/).map(s => s.replace(/\.$/, '').trim()).filter(Boolean);
    if (byPeriodComma.length > 1) return byPeriodComma;

    // fallback: newline
    const byNewline = str.split(/\n+/).map(s => s.trim()).filter(Boolean);
    if (byNewline.length > 1) return byNewline;

    return [str];
  }

  // default: standard comma split
  return str
    .split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
    .map(s => s.replace(/^["']|["']$/g, '').trim())
    .filter(Boolean);
};

const formatDate = (iso?: string, format: 'long' | 'short' = 'long') => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  if (format === 'short') {
    return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
  }
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};


// ─── Clinical reasoning parser ────────────────────────────────────────────────

interface ReasoningSection {
  title: string;
  body: string;
}

const sanitizeClinicalText = (text = "") =>
  text
    .replace(/\r/g, "")
    .replace(/\[(?:LOCALIZED_CONTEXT|\d+)\]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const cleanMarkdown = (text = "") =>
  sanitizeClinicalText(
    text
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/__(.*?)__/g, "$1")
      .replace(/_(.*?)_/g, "$1")
      .replace(/`(.*?)`/g, "$1"),
  );

function parseClinicalReasoning(raw: string): ReasoningSection[] {
  if (!raw) return [];

  const normalized = cleanMarkdown(raw);

  // Support markdown-inline section headers like "**Overview:** details..."
  if (/\*\*[A-Za-z0-9 &/()\-]+:\*\*/.test(normalized)) {
    const regex = /\*\*([A-Za-z0-9 &/()\-]+):\*\*/g;
    const found: Array<{ title: string; start: number; end: number }> = [];
    let match: RegExpExecArray | null;

    while ((match = regex.exec(normalized)) !== null) {
      found.push({ title: match[1].trim(), start: match.index, end: regex.lastIndex });
    }

    const sections = found.map((curr, i) => {
      const nextStart = i + 1 < found.length ? found[i + 1].start : normalized.length;
      return {
        title: curr.title,
        body: normalized.slice(curr.end, nextStart).trim(),
      };
    });
    return sections.filter((s) => s.body.length > 0);
  }

  const headerRegex = /^([A-Za-z0-9 &/()\-]+):\s*$/gm;
  const matches: { title: string; index: number }[] = [];

  let match;
  while ((match = headerRegex.exec(normalized)) !== null) {
    matches.push({
      title: match[1].trim(),
      index: match.index,
    });
  }

  if (!matches.length) {
    return [{ title: "Overview", body: normalized }];
  }

  const sections: ReasoningSection[] = [];

  if (matches[0].index > 0) {
    sections.push({
      title: "Overview",
      body: normalized.slice(0, matches[0].index).trim(),
    });
  }

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end =
      i + 1 < matches.length ? matches[i + 1].index : normalized.length;

    const title = matches[i].title;
    const body = normalized.slice(start + title.length + 1, end).trim();

    sections.push({ title, body });
  }

  return sections.filter((s) => s.body.length > 0);
}

interface BodyItem {
  type: 'bullet' | 'number' | 'paragraph';
  text: string;
  num?: string;
}

function parseSectionBody(bodyText: string): BodyItem[] {
  const lines = bodyText.split('\n').map(l => l.trim()).filter(Boolean);
  const items: BodyItem[] = [];

  for (const line of lines) {
    // Check for bullet list item
    const bulletMatch = line.match(/^[-*•]\s+(.*)$/);
    if (bulletMatch) {
      items.push({ type: 'bullet', text: bulletMatch[1] });
      continue;
    }

    // Check for numbered list item
    const numberMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (numberMatch) {
      items.push({ type: 'number', text: numberMatch[2], num: numberMatch[1] });
      continue;
    }

    // Otherwise it's a normal paragraph
    items.push({ type: 'paragraph', text: line });
  }

  return items;
}

const renderFormattedText = (text: string) => {
  if (!text) return null;
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return (
    <>
      {parts.map((part, index) => {
        if (index % 2 === 1) {
          return (
            <strong key={index} style={{ fontWeight: 700, color: '#111827' }}>
              {part}
            </strong>
          );
        }
        return sanitizeClinicalText(part);
      })}
    </>
  );
};

const formatListItemText = (text: string): string => {
  const colonIndex = text.indexOf(':');
  if (colonIndex > 0 && colonIndex <= 35) {
    const prefix = text.substring(0, colonIndex);
    const suffix = text.substring(colonIndex + 1);
    if (!prefix.includes('**')) {
      return `**${prefix}:**${suffix}`;
    }
  }
  return text;
};

const ClinicalReasoningBlock: React.FC<{ text: string }> = ({ text }) => {
  const trimmed = text.trim();
  if (trimmed.toLowerCase() === 'not documented') {
    return (
      <div style={{ fontSize: 12, color: '#6b7280', fontStyle: 'italic', paddingLeft: 4 }}>
        Not documented
      </div>
    );
  }

  const sections = parseClinicalReasoning(text);

  if (!sections.length) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {sections.map((section, index) => {
        const items = parseSectionBody(section.body);
        return (
          <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {section.title && (
              <div style={{ fontSize: 12, fontWeight: 700, color: '#111827', marginTop: index > 0 ? 8 : 2 }}>
                {section.title}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {items.map((item, idx) => {
                const formatted = formatListItemText(item.text);
                if (item.type === 'bullet') {
                  return (
                    <div key={idx} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <span style={{ color: '#9ca3af', marginTop: 6, fontSize: 5, flexShrink: 0 }}>●</span>
                      <span style={{ fontSize: 12, color: '#374151', lineHeight: 1.7 }}>
                        {renderFormattedText(formatted)}
                      </span>
                    </div>
                  );
                } else if (item.type === 'number') {
                  return (
                    <div key={idx} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <span style={{ color: '#4b5563', fontSize: 12, fontWeight: 600, flexShrink: 0, minWidth: 15 }}>
                        {item.num}.
                      </span>
                      <span style={{ fontSize: 12, color: '#374151', lineHeight: 1.7 }}>
                        {renderFormattedText(formatted)}
                      </span>
                    </div>
                  );
                } else {
                  return (
                    <p key={idx} style={{ fontSize: 12, color: '#374151', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>
                      {renderFormattedText(formatted)}
                    </p>
                  );
                }
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

const EMPTY_COMMENTS: any[] = [];

function mapCommentRows(rows: any[]): { notes: CommentPayload[]; ids: (string | undefined)[] } {
  const sorted = [...rows].sort(
    (a, b) => new Date(a.createdAt ?? a.date ?? 0).getTime() - new Date(b.createdAt ?? b.date ?? 0).getTime(),
  );
  return {
    notes: sorted.map((r) => ({
      quotedText: r.selection,
      note: r.text,
      editedBy: r.editorName ?? r.editor ?? 'Clinician',
      savedAt: r.createdAt ?? r.date ?? new Date().toISOString(),
    })),
    ids: sorted.map((r) => r.id),
  };
}

const SymptomReportNew: React.FC<SymptomReportProps> = ({
  report, patient, onBack, reportHistory = [], onEscalate, onSaveComment
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [activePanel, setActivePanel] = useState<'report' | 'diff' | 'timeline' | 'monitoring' | 'recommendations'>('report');
  const [activeComment, setActiveComment] = useState<string | null>(null);
  const [savedNotes, setSavedNotes] = useState<CommentPayload[]>([]);
  const [commentIds, setCommentIds] = useState<(string | undefined)[]>([]);
  const [notesDrawerOpen, setNotesDrawerOpen] = useState(false);
  const [allVersionNotes, setAllVersionNotes] = useState<VersionedComment[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [isVerificationDialogOpen, setIsVerificationDialogOpen] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState('');
  const toggle = useCallback((key: string) => setChecked(p => ({ ...p, [key]: !p[key] })), []);

  const versions = useMemo(
    () => (report ? buildSymptomReportVersions(report, reportHistory) : []),
    [report, reportHistory],
  );
  const latestVersionId = versions.find((v) => v.isLatest)?.id ?? versions[0]?.id ?? '';
  const activeVersion = versions.find((v) => v.id === selectedVersionId) ?? versions[0];
  const activeReport = activeVersion?.data ?? report;
  const isViewingLatest = activeVersion?.isLatest ?? true;
  useEffect(() => {
    if (latestVersionId && (!selectedVersionId || !versions.some((v) => v.id === selectedVersionId))) {
      setSelectedVersionId(latestVersionId);
    }
  }, [latestVersionId, selectedVersionId, versions]);

  const profileComments = (patient as { comments?: any[] } | undefined)?.comments ?? EMPTY_COMMENTS;
  const versionIds = useMemo(() => versions.map((v) => v.id), [versions]);

  const commentCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const id of versionIds) counts.set(id, 0);

    const source = allVersionNotes.length > 0 ? allVersionNotes : profileComments;
    for (const item of source) {
      const docId = String(item.documentId ?? '');
      if (counts.has(docId)) counts.set(docId, (counts.get(docId) ?? 0) + 1);
    }
    return counts;
  }, [versionIds, profileComments, allVersionNotes]);

  const totalCommentCount = useMemo(() => {
    let total = 0;
    commentCounts.forEach((count) => { total += count; });
    return total;
  }, [commentCounts]);

  const documentId = selectedVersionId || resolveSymptomReportDocumentId(activeReport, patient?.id);

  const toVersionedNotes = useCallback((rows: any[]): VersionedComment[] => {
    const sorted = [...rows].sort(
      (a, b) => new Date(b.createdAt ?? b.date ?? 0).getTime() - new Date(a.createdAt ?? a.date ?? 0).getTime(),
    );
    return sorted.map((row) => {
      const docId = String(row.documentId);
      const versionIndex = versions.findIndex((v) => v.id === docId);
      const version = versionIndex >= 0 ? versions[versionIndex] : null;
      return {
        quotedText: row.selection,
        note: row.text,
        editedBy: row.editorName ?? row.editor ?? 'Clinician',
        savedAt: row.createdAt ?? row.date ?? new Date().toISOString(),
        commentId: row.id,
        documentId: docId,
        versionLabel: version
          ? getVersionShortLabel(version, versionIndex, versions.length)
          : 'Report',
        isCurrentVersion: docId === selectedVersionId,
      };
    });
  }, [versions, selectedVersionId]);

  // Load all comments across every report version (for badges + notes drawer)
  useEffect(() => {
    if (!patient?.id || versionIds.length === 0) {
      setAllVersionNotes([]);
      return;
    }
    let cancelled = false;

    const versionIdSet = new Set(versionIds);
    const fromProfile = profileComments.filter((c) => versionIdSet.has(String(c.documentId)));
    const primaryId = versionIds[0];
    const extraIds = versionIds.slice(1);

    patientService.getComments(patient.id, primaryId, extraIds)
      .then((res: any) => {
        if (cancelled) return;
        const merged = new Map<string, any>();
        for (const row of [...fromProfile, ...(res?.data?.comments ?? [])]) {
          if (row?.id && versionIdSet.has(String(row.documentId))) {
            merged.set(row.id, row);
          }
        }
        setAllVersionNotes(toVersionedNotes([...merged.values()]));
      })
      .catch(() => {
        if (!cancelled) setAllVersionNotes(toVersionedNotes(fromProfile));
      });

    return () => { cancelled = true; };
  }, [patient?.id, versionIds, profileComments, toVersionedNotes]);

  const { latestVerification, loading: verificationLoading, addVerification } = useClinicalVerification(
    patient?.id,
    'symptom_report',
  );

  // Stores the exact DOM Range at the moment the user clicks "Add comment"
  // so we can use surroundContents() for precise single-occurrence highlighting.
  const pendingRangeRef = useRef<Range | null>(null);
  const rangeHighlightedIndices = useRef<Set<number>>(new Set());
  const menu = useSelectionMenu(printRef, menuRef);

  // ── Load comments for the selected report version ─────────────────────────
  useEffect(() => {
    if (!patient?.id || !documentId) return;
    let cancelled = false;

    const profileMatches = profileComments.filter(
      (c) => String(c.documentId) === String(documentId),
    );

    const applyRows = (rows: any[]) => {
      if (cancelled) return;
      const { notes, ids } = mapCommentRows(rows);
      setSavedNotes(notes);
      setCommentIds(ids);
      rangeHighlightedIndices.current = new Set();
    };

    applyRows(profileMatches);

    patientService.getComments(patient.id, documentId)
      .then((res: any) => {
        const apiRows: any[] = res?.data?.comments ?? [];
        const merged = new Map<string, any>();
        for (const row of [...profileMatches, ...apiRows]) {
          if (row?.id && String(row.documentId) === String(documentId)) {
            merged.set(row.id, row);
          }
        }
        applyRows([...merged.values()]);
        setAllVersionNotes((prev) => {
          const others = prev.filter((n) => n.documentId !== documentId);
          const current = toVersionedNotes([...merged.values()]);
          return [...others, ...current].sort(
            (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
          );
        });
      })
      .catch((err) => {
        console.error('Failed to load report comments:', err);
        if (!cancelled) applyRows(profileMatches);
      });

    return () => { cancelled = true; };
  }, [patient?.id, documentId, profileComments, toVersionedNotes]);

  useEffect(() => {
    setAllVersionNotes((prev) =>
      prev.map((note) => ({ ...note, isCurrentVersion: note.documentId === selectedVersionId })),
    );
  }, [selectedVersionId]);

  useEffect(() => {
    if (!printRef.current || savedNotes.length === 0 || activePanel !== 'report') return;

    const applyHighlights = () => {
      if (!printRef.current) return;
      const phrases = savedNotes
        .map((n, i) => ({ text: n.quotedText, index: i }))
        .filter((p) => p.text);
      applyCommentHighlights(printRef.current, phrases, rangeHighlightedIndices.current);
    };

    applyHighlights();
    const frameId = requestAnimationFrame(applyHighlights);
    const timeoutId = window.setTimeout(applyHighlights, 150);
    return () => {
      cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
    };
  }, [savedNotes, activePanel, activeReport, documentId]);
  if (!report || !activeReport) return null;

  const versionIndex = versions.findIndex((v) => v.id === selectedVersionId);
  const previousReport = versionIndex >= 0 && versionIndex < versions.length - 1
    ? versions[versionIndex + 1].data
    : null;

  const medical = activeReport?.medicalReasoning ?? activeReport?.medical_reasoning ?? {};
  const riskLevel = (activeReport?.riskLevel ?? activeReport?.risk_level ?? 'UNKNOWN').toUpperCase();
  const riskScore = parseFloat(activeReport?.riskScore ?? activeReport?.risk_score ?? 0);
  const riskColor = RISK_COLORS[riskLevel] || RISK_COLORS.MODERATE;

  const keyRiskFactors = parseList(medical?.key_risk_factors ?? activeReport?.keyRiskFactors, 'keyRiskFactors');
  const primaryConcerns = parseList(medical?.primary_concerns ?? activeReport?.primaryConcerns, 'primaryConcerns');
  const recommendations = parseList(activeReport?.recommendations ?? medical?.recommendations, 'recommendations');
  const monitoring = parseList(medical?.monitoring_requirements ?? activeReport?.monitoringRequirements, 'monitoring');
  const immediateActions = parseList(medical?.immediate_actions ?? activeReport?.immediateActions, 'immediateActions');

  const clinicalReasoning = medical?.clinical_reasoning ?? activeReport?.clinicalReasoning ?? '';
  const vitalSigns = medical?.vital_signs_assessment ?? activeReport?.vitalSignsAssessment ?? '';
  const labInterpretation = medical?.laboratory_interpretation ?? activeReport?.laboratoryInterpretation ?? '';
  const historicalFactors = medical?.historical_risk_factors ?? activeReport?.historicalRiskFactors ?? '';
  const followUpTiming = medical?.follow_up_timing ?? activeReport?.followUpTiming ?? '';

  const gestationWeeks = activeReport?.gestationWeeksInt ?? 0;
  const gestationTotal = activeReport?.gestationWeeksTotal ?? 40;
  const generatedDate = formatDate(activeReport?.createdAt ?? activeReport?.updatedAt, 'long');

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    try {
      const patientName = patient?.name?.replace(/\s+/g, ' ').trim() || 'Patient';
      const dateStr = formatDate(activeReport?.createdAt ?? activeReport?.updatedAt, 'short').replace(/\//g, '-');
      const filename = `AI Analysis - ${patientName} - ${dateStr}.pdf`;

      const canvas = await html2canvas(printRef.current, {
        scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff',
      });

      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pdf = new jsPDF('p', 'mm', 'a4');
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(filename);
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  // Capture the exact DOM Range at the moment the user opens the comment panel
  const handleComment = (text: string) => {
    pendingRangeRef.current = menu.rangeRef.current
      ? menu.rangeRef.current.cloneRange()
      : null;
    setActiveComment(text);
  };

  const handleVerificationSubmit = async (verificationData: RubricVerificationData) => {
    const summaryParts = [
      `Risk: ${riskLevel} (${riskScore.toFixed(2)})`,
      `Rubric: ${verificationData.totalScore}/100 · ${verificationData.scoreCategory}`,
      keyRiskFactors.length > 0 ? `Factors: ${keyRiskFactors.slice(0, 2).join('; ')}` : '',
      primaryConcerns.length > 0 ? `Concerns: ${primaryConcerns.slice(0, 2).join('; ')}` : '',
    ].filter(Boolean).join(' | ');

    const res = await diagnosisVerificationService.submit({
      patientId: verificationData.patientId,
      patientName: verificationData.patientName,
      diagnosisText: summaryParts || verificationData.diagnosisText,
      riskLevel: verificationData.riskLevel,
      isAccurate: isScoreAcceptable(verificationData.totalScore),
      obgynNotes: verificationData.obgynNotes,
      sourceType: verificationData.sourceType,
      sourceId: documentId || undefined,
      rubricScores: verificationData.rubricScores,
      totalScore: verificationData.totalScore,
      scoreCategory: verificationData.scoreCategory,
    });
    if (res.data?.verification) addVerification(res.data.verification);
    return res.data?.verification;
  };

  const verificationReportSections: ReportSectionPreview[] = [
    { title: 'Key Risk Factors', content: keyRiskFactors.join('\n• '), hasContent: keyRiskFactors.length > 0 },
    { title: 'Primary Concerns', content: primaryConcerns.join('\n• '), hasContent: primaryConcerns.length > 0 },
    { title: 'Clinical Reasoning', content: clinicalReasoning, hasContent: !!clinicalReasoning.trim() },
    { title: 'Vital Signs', content: vitalSigns, hasContent: !!vitalSigns.trim() },
    { title: 'Laboratory', content: labInterpretation, hasContent: !!labInterpretation.trim() },
    { title: 'Historical Risk', content: historicalFactors, hasContent: !!historicalFactors.trim() },
    { title: 'Follow-Up Timing', content: followUpTiming, hasContent: !!followUpTiming.trim() },
    { title: 'Immediate Actions', content: immediateActions.join('\n• '), hasContent: immediateActions.length > 0 },
    { title: 'Monitoring', content: monitoring.join('\n• '), hasContent: monitoring.length > 0 },
    { title: 'Recommendations', content: recommendations.join('\n• '), hasContent: recommendations.length > 0 },
  ];



  return (
    <>
      {isViewingLatest && (
        <SelectionMenu ref={menuRef} menu={menu} onComment={handleComment} />
      )}

      {/* Screen-only controls */}
      <div className="print:hidden mb-3 flex items-center gap-2 flex-wrap">
        {onBack && (
          <button
            onClick={onBack}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-[13px] font-medium transition-colors flex items-center gap-1.5"
          >
            <IoArrowBackOutline size={14} />
            Back
          </button>
        )}
        <button
          onClick={handleDownloadPDF}
          className="px-3 py-1.5 bg-[#008540] hover:bg-[#007036] text-white rounded text-[13px] font-medium transition-colors flex items-center gap-1.5"
        >
          <HiOutlineDownload size={14} />
          Download PDF
        </button>

        {versions.length > 1 && (
          <ReportVersionPicker
            versions={versions}
            selectedVersionId={selectedVersionId}
            commentCounts={commentCounts}
            onSelect={(id) => {
              setSelectedVersionId(id);
              setActivePanel('report');
              setChecked({});
            }}
          />
        )}

        <button
          onClick={() => setNotesDrawerOpen(true)}
          className="px-3 py-1.5 rounded text-[13px] font-medium transition-colors flex items-center gap-1.5"
          style={{
            background: totalCommentCount > 0 ? "#f0fdf4" : "#f9fafb",
            color: totalCommentCount > 0 ? "#008540" : "#6b7280",
            border: `1px solid ${totalCommentCount > 0 ? "#bbf7d0" : "#e5e7eb"}`,
          }}
        >
          <LuMessageSquare size={14} />
          Notes
          {totalCommentCount > 0 && (
            <span style={{
              background: "#008540", color: "#fff",
              borderRadius: 10, fontSize: 10, fontWeight: 700,
              padding: "0 5px", lineHeight: "16px",
            }}>
              {totalCommentCount}
            </span>
          )}
        </button>
      </div>

      {!isViewingLatest && activeVersion && (
        <div
          className="print:hidden mb-3 flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg border text-[13px]"
          style={{ background: '#fffbeb', borderColor: '#fde68a', color: '#92400e' }}
        >
          <span>
            Viewing an older analysis from{' '}
            <strong>
              {new Date(activeVersion.createdAt).toLocaleString('en-GB', {
                day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
              })}
            </strong>
            . Comments and highlights match this version.
          </span>
          <button
            type="button"
            onClick={() => {
              setSelectedVersionId(latestVersionId);
              setActivePanel('report');
            }}
            className="shrink-0 px-2.5 py-1 rounded bg-white border border-amber-200 text-amber-800 font-medium hover:bg-amber-50"
          >
            Back to latest
          </button>
        </div>
      )}

      {/* Clinical verification status */}
      {isViewingLatest && (
      <div className="print:hidden mb-4">
        <VerificationStatusBar
          verification={latestVerification}
          loading={verificationLoading}
          onReview={() => setIsVerificationDialogOpen(true)}
          subjectLabel="analysis"
        />
      </div>
      )}

      {/* Panel tabs */}
      <div className="print:hidden flex gap-2 mb-4 flex-wrap">
        {([
          { key: 'report' as const, label: 'Report', icon: null as React.ReactNode, disabled: false },
          { key: 'monitoring' as const, label: 'Monitoring', icon: <LuListChecks size={12} />, disabled: monitoring.length === 0 },
          { key: 'recommendations' as const, label: 'Recommendations', icon: <LuCircleCheck size={12} />, disabled: recommendations.length === 0 },
          { key: 'timeline' as const, label: 'Timeline', icon: <LuActivity size={12} />, disabled: reportHistory.length < 2 },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => !tab.disabled && setActivePanel(tab.key)}
            disabled={tab.disabled}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] font-medium transition-all"
            style={{
              background: activePanel === tab.key ? '#008540' : 'transparent',
              color: activePanel === tab.key ? '#fff' : tab.disabled ? '#d1d5db' : '#6b7280',
              border: activePanel === tab.key ? 'none' : '1px solid #e5e7eb',
              cursor: tab.disabled ? 'not-allowed' : 'pointer',
              opacity: tab.disabled ? 0.5 : 1,
            }}
          >
            {tab.icon} {tab.label}
            {(tab.key === 'monitoring' || tab.key === 'recommendations') && !tab.disabled && (
              <span style={{
                marginLeft: 4, fontSize: 10, fontWeight: 700,
                background: activePanel === tab.key ? 'rgba(255,255,255,0.25)' : '#f3f4f6',
                color: activePanel === tab.key ? '#fff' : '#6b7280',
                borderRadius: 10, padding: '0 5px', lineHeight: '16px',
              }}>
                {tab.key === 'monitoring' ? monitoring.length : recommendations.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Monitoring panel */}
      {activePanel === 'monitoring' && (
        <div className="print:hidden mb-4 rounded-lg border border-gray-200 bg-white overflow-hidden">
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #f3f4f6', background: '#fefce8', display: 'flex', alignItems: 'center', gap: 8 }}>
            <LuListChecks size={15} color="#ca8a04" />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Monitoring Requirements
            </span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: '#ca8a04', fontWeight: 600 }}>
              {monitoring.filter((_, i) => checked[`mon-${i}`]).length}/{monitoring.length} done
            </span>
          </div>
          <div style={{ padding: '8px 12px' }}>
            {monitoring.map((item, i) => {
              const key = `mon-${i}`;
              const done = !!checked[key];
              return (
                <div
                  key={key}
                  onClick={() => toggle(key)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '7px 4px', cursor: 'pointer',
                    borderBottom: i < monitoring.length - 1 ? '1px solid #f3f4f6' : 'none',
                    opacity: done ? 0.5 : 1, transition: 'opacity 0.15s',
                  }}
                >
                  <span style={{ color: done ? '#16a34a' : '#d1d5db', flexShrink: 0, marginTop: 1 }}>
                    {done ? <LuCircleCheck size={16} /> : <LuCircle size={16} />}
                  </span>
                  <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.5, textDecoration: done ? 'line-through' : 'none' }}>
                    {renderFormattedText(item)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recommendations panel */}
      {activePanel === 'recommendations' && (
        <div className="print:hidden mb-4 rounded-lg border border-gray-200 bg-white overflow-hidden">
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #f3f4f6', background: '#f0fdf4', display: 'flex', alignItems: 'center', gap: 8 }}>
            <LuCircleCheck size={15} color="#16a34a" />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#14532d', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Recommendations
            </span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: '#16a34a', fontWeight: 600 }}>
              {recommendations.filter((_, i) => checked[`rec-${i}`]).length}/{recommendations.length} done
            </span>
          </div>
          <div style={{ padding: '8px 12px' }}>
            {recommendations.map((item, i) => {
              const key = `rec-${i}`;
              const done = !!checked[key];
              return (
                <div
                  key={key}
                  onClick={() => toggle(key)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '7px 4px', cursor: 'pointer',
                    borderBottom: i < recommendations.length - 1 ? '1px solid #f3f4f6' : 'none',
                    opacity: done ? 0.5 : 1, transition: 'opacity 0.15s',
                  }}
                >
                  <span style={{ color: done ? '#16a34a' : '#d1d5db', flexShrink: 0, marginTop: 1 }}>
                    {done ? <LuCircleCheck size={16} /> : <LuCircle size={16} />}
                  </span>
                  <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.5, textDecoration: done ? 'line-through' : 'none' }}>
                    {renderFormattedText(item)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Diff panel */}
      {activePanel === 'diff' && previousReport && (
        <div className="print:hidden mb-4 p-4 rounded-lg border border-gray-200 bg-white">
          <ReasoningDiff current={activeReport} previous={previousReport} />
        </div>
      )}

      {/* Timeline panel */}
      {activePanel === 'timeline' && reportHistory.length >= 2 && (
        <div className="print:hidden mb-4 p-4 rounded-lg border border-gray-200 bg-white">
          <RiskScoreTimeline history={reportHistory} />
        </div>
      )}

      {/* Action checklist */}
      {activePanel === 'report' && immediateActions.length > 0 && (
        <div className="w-full max-w-[210mm] print:hidden mb-4 p-4 rounded-lg border border-gray-200 bg-white">
          <ActionChecklist
            immediateActions={immediateActions}
            monitoringRequirements={[]}
            recommendations={[]}
            riskLevel={riskLevel}
            patientName={patient?.name}
            onEscalate={onEscalate}
          />
        </div>
      )}

      {/* Printable Report */}
      {activePanel === 'report' && (
        <div
          ref={printRef}
          className="mt-5 w-full max-w-[210mm] p-8 print:p-0 rounded-lg"
          style={{ fontSize: '13px', backgroundColor: '#ffffff', border: '1px solid #e5e7eb', color: '#000000' }}
        >
          {/* Header */}
          <div className="flex flex-col lg:flex-row items-start justify-between mb-5">
            <div className="flex items-center gap-2">
              <img src="/images/logo.png" alt="Mobileuurka" className="w-12 h-12" />
              <div>
                <h1 className="text-base font-bold" style={{ color: '#111827' }}>Mobileuurka</h1>
                <p className="text-[13px]" style={{ color: '#4b5563' }}>Healthcare Services</p>
              </div>
            </div>
            <div className="mt-2 lg:text-right lg:mt-0">
              <h2 className="text-sm font-bold" style={{ color: '#111827' }}>AI Analysis</h2>
              <p className="text-[13px]" style={{ color: '#4b5563' }}>Date: {generatedDate}</p>
            </div>
          </div>

          {/* Patient Information */}
          <div className="mb-5">
            <h3 className="text-sm font-bold mb-3" style={{ color: '#111827' }}>Patient Information</h3>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2.5">
              <div>
                <p className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: '#6b7280' }}>FULL NAME</p>
                <p className="text-[13px] font-medium" style={{ color: '#111827' }}>{patient?.name || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: '#6b7280' }}>GESTATION</p>
                <p className="text-[13px] font-medium" style={{ color: '#111827' }}>{gestationWeeks} weeks (of {gestationTotal})</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: '#6b7280' }}>NATIONAL ID</p>
                <p className="text-[13px] font-medium" style={{ color: '#111827' }}>{patient?.nationalId || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: '#6b7280' }}>PHONE NUMBER</p>
                <p className="text-[13px] font-medium" style={{ color: '#111827' }}>{patient?.phone || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: '#6b7280' }}>EMAIL ADDRESS</p>
                <p className="text-[13px] font-medium" style={{ color: '#111827' }}>{patient?.email || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: '#6b7280' }}>ADDRESS</p>
                <p className="text-[13px] font-medium" style={{ color: '#111827' }}>{patient?.address || '—'}</p>
              </div>
            </div>
          </div>

          {/* Risk Assessment */}
          <div className="mb-5">
            <h3 className="text-sm font-bold mb-3" style={{ color: '#111827' }}>Risk Assessment</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: '#6b7280' }}>RISK LEVEL</p>
                <p className="font-bold" style={{ color: riskColor }}>{riskLevel}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: '#6b7280' }}>RISK SCORE</p>
                <p className="font-bold" style={{ color: '#111827' }}>{riskScore.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Key Risk Factors */}
          {keyRiskFactors.length > 0 && (
            <div className="mb-4">
              <h3 className="text-[13px] font-bold mb-1.5" style={{ color: '#111827' }}>Key Risk Factors</h3>
              {keyRiskFactors.some(f => f.toLowerCase().includes('incomplete structured model output')) ? (
                <div style={{ padding: '8px 12px', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: 6, fontSize: 12, color: '#b45309' }}>
                  Incomplete structured model output - clinical validation required.
                </div>
              ) : (
                <RiskFactorBreakdown keyRiskFactors={keyRiskFactors} compact />
              )}
            </div>
          )}

          {/* Primary Concerns */}
          {primaryConcerns.length > 0 && (
            <div className="mb-4">
              <h3 className="text-[13px] font-bold mb-1.5" style={{ color: '#111827' }}>Primary Concerns</h3>
              {primaryConcerns.some(c => c.toLowerCase().includes('partially malformed')) ? (
                <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 6, fontSize: 12, color: '#b91c1c' }}>
                  Structured output was partially malformed. Please prioritize manual clinical validation of the patient details.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {primaryConcerns.map((concern, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <span style={{ color: '#9ca3af', flexShrink: 0, marginTop: 6, fontSize: 5 }}>●</span>
                      <span className="capitalize" style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
                        {renderFormattedText(concern)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Clinical Reasoning */}
          {clinicalReasoning && (
            <div className="mb-4">
              <h3 className="text-[13px] font-bold mb-1.5" style={{ color: '#111827' }}>Clinical Reasoning</h3>
              <ClinicalReasoningBlock text={clinicalReasoning} />
            </div>
          )}

          {/* Vital Signs Assessment */}
          {vitalSigns && (
            <div className="mb-4">
              <h3 className="text-[13px] font-bold mb-1.5" style={{ color: '#111827' }}>Vital Signs Assessment</h3>
              <ClinicalReasoningBlock text={vitalSigns} />
            </div>
          )}

          {/* Laboratory Interpretation */}
          {labInterpretation && (
            <div className="mb-4">
              <h3 className="text-[13px] font-bold mb-1.5" style={{ color: '#111827' }}>Laboratory Interpretation</h3>
              <ClinicalReasoningBlock text={labInterpretation} />
            </div>
          )}

          {/* Historical Risk Factors */}
          {historicalFactors && (
            <div className="mb-4">
              <h3 className="text-[13px] font-bold mb-1.5" style={{ color: '#111827' }}>Historical Risk Factors</h3>
              <ClinicalReasoningBlock text={historicalFactors} />
            </div>
          )}

          {/* Follow Up Timing */}
          {followUpTiming && (
            <div className="mb-4">
              <h3 className="text-[13px] font-bold mb-1.5" style={{ color: '#111827' }}>Follow Up Timing</h3>
              <p className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: '#374151' }}>
                {renderFormattedText(followUpTiming)}
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-3" style={{ borderTop: '1px solid #e5e7eb' }}>
            <p className="text-[10px] text-center mb-1" style={{ color: '#6b7280' }}>
              This document is confidential and contains protected health information.
            </p>
            <p className="text-[10px] text-center" style={{ color: '#9ca3af' }}>
              Generated on {formatDate(activeReport?.createdAt ?? activeReport?.updatedAt, 'short')} at{' '}
              {new Date(activeReport?.createdAt ?? activeReport?.updatedAt).toLocaleTimeString('en-US', {
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
              }).replace(/:/g, '')}
            </p>
          </div>
        </div>
      )}

      {/* Comments panel */}
      {activeComment !== null && (
        <CommentsPanel
          quotedText={activeComment}
          onClose={() => {
            pendingRangeRef.current = null;
            setActiveComment(null);
          }}
          onSave={async (payload) => {
            const noteIndex = savedNotes.length;
            let highlightApplied = false;

            // 1. Highlight the EXACT selection using the stored Range
            if (pendingRangeRef.current) {
              try {
                const mark = document.createElement('mark');
                mark.setAttribute('data-comment-highlight', 'true');
                mark.setAttribute('data-comment-index', String(noteIndex));
                mark.style.cssText = 'background:#fef08a;border-radius:2px;padding:0 1px;';
                pendingRangeRef.current.surroundContents(mark);
                rangeHighlightedIndices.current.add(noteIndex);
                highlightApplied = true;
              } catch {
                // surroundContents throws if the selection crosses element boundaries.
              }
              pendingRangeRef.current = null;
            }

            // 2. Save to DB — required so all clinicians see the comment
            if (!patient?.id || !documentId) {
              if (highlightApplied) {
                const mark = printRef.current?.querySelector(`mark[data-comment-index="${noteIndex}"]`);
                if (mark?.parentNode) {
                  mark.parentNode.replaceChild(document.createTextNode(mark.textContent ?? ''), mark);
                  mark.parentNode.normalize();
                }
                rangeHighlightedIndices.current.delete(noteIndex);
              }
              alert('Could not save comment: report is missing a document identifier.');
              return;
            }

            let newId: string | undefined;
            try {
              const res: any = await patientService.createComment(patient.id, {
                documentId,
                selection: payload.quotedText,
                text: payload.note,
              });
              newId = res?.data?.comment?.id;
              if (!newId) throw new Error('Comment was not persisted');
            } catch (err) {
              console.error('Failed to persist comment:', err);
              if (highlightApplied) {
                const mark = printRef.current?.querySelector(`mark[data-comment-index="${noteIndex}"]`);
                if (mark?.parentNode) {
                  mark.parentNode.replaceChild(document.createTextNode(mark.textContent ?? ''), mark);
                  mark.parentNode.normalize();
                }
                rangeHighlightedIndices.current.delete(noteIndex);
              }
              alert('Failed to save comment. Please try again.');
              return;
            }

            // 3. Update local state only after successful persistence
            setSavedNotes(prev => [...prev, payload]);
            setCommentIds(prev => [...prev, newId]);
            setAllVersionNotes((prev) => [
              {
                ...payload,
                commentId: newId,
                documentId,
                versionLabel: activeVersion
                  ? getVersionShortLabel(activeVersion, versions.findIndex((v) => v.id === selectedVersionId), versions.length)
                  : 'Latest',
                isCurrentVersion: true,
              },
              ...prev,
            ]);
            await onSaveComment?.(payload);
            setActiveComment(null);
          }}
        />
      )}

      {/* Notes drawer */}
      {notesDrawerOpen && (
        <NotesDrawer
          notes={allVersionNotes}
          onClose={() => setNotesDrawerOpen(false)}
          onGoToVersion={(docId) => {
            setSelectedVersionId(docId);
            setActivePanel('report');
            setNotesDrawerOpen(false);
          }}
          onDelete={async (commentId) => {
            const noteIndex = commentIds.findIndex((id) => id === commentId);
            if (noteIndex >= 0) {
              rangeHighlightedIndices.current.delete(noteIndex);
              const mark = printRef.current?.querySelector(`mark[data-comment-index="${noteIndex}"]`);
              if (mark?.parentNode) {
                mark.parentNode.replaceChild(document.createTextNode(mark.textContent ?? ''), mark);
                mark.parentNode.normalize();
              }
              setSavedNotes((prev) => prev.filter((_, idx) => idx !== noteIndex));
              setCommentIds((prev) => prev.filter((_, idx) => idx !== noteIndex));
            }

            if (patient?.id) {
              try {
                await patientService.deleteComment(patient.id, commentId);
              } catch (err) {
                console.error('Failed to delete comment from DB:', err);
              }
            }

            setAllVersionNotes((prev) => prev.filter((n) => n.commentId !== commentId));
          }}
        />
      )}

      {/* Print Styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #root, #root * { visibility: hidden; }
          ${printRef.current ? `
            .print\\:block { display: block !important; }
            .print\\:hidden { display: none !important; }
          ` : ''}
        }
        @page { size: A4; margin: 20mm; }
      `}</style>

      {/* Clinical Reasoning Evaluation Dialog */}
      {isViewingLatest && (
      <ClinicalReasoningVerificationDialog
        isOpen={isVerificationDialogOpen}
        onClose={() => setIsVerificationDialogOpen(false)}
        onSubmit={handleVerificationSubmit}
        diagnosisText={`${riskLevel} risk · score ${riskScore.toFixed(2)} · ${gestationWeeks}/${gestationTotal} wks`}
        riskLevel={riskLevel}
        patientId={patient?.id || ''}
        patientName={patient?.name}
        reportSections={verificationReportSections}
        recordDate={generatedDate}
        existingVerification={latestVerification}
      />
      )}
    </>
  );
};

export default SymptomReportNew;