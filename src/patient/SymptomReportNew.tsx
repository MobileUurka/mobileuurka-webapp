import React, { useRef, useState, useCallback, useEffect } from 'react';
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
import NotesDrawer from '../components/NotesDrawer';
import { patientService } from '../services/patientServices';
import DiagnosisVerificationDialog, { type VerificationData } from '../components/DiagnosisVerificationDialog';
import VerificationStatusBar from '../components/VerificationStatusBar';
import { diagnosisVerificationService } from '../services/diagnosisVerificationService';
import { useClinicalVerification } from '../hooks/useClinicalVerification';

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

const cleanMarkdown = (text = "") =>
  text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .replace(/\r/g, "")
    .trim();

function parseClinicalReasoning(raw: string): ReasoningSection[] {
  if (!raw) return [];

  raw = raw.replace(/\r/g, "").trim();

  // Match ANY "Title:" line
  const headerRegex = /^([A-Za-z0-9 &/()\-]+):\s*$/gm;

  const matches: { title: string; index: number }[] = [];

  let match;
  while ((match = headerRegex.exec(raw)) !== null) {
    matches.push({
      title: match[1].trim(),
      index: match.index,
    });
  }

  if (!matches.length) {
    return [{ title: "Overview", body: raw }];
  }

  const sections: ReasoningSection[] = [];

  // pre-header text
  if (matches[0].index > 0) {
    sections.push({
      title: "Overview",
      body: raw.slice(0, matches[0].index).trim(),
    });
  }

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end =
      i + 1 < matches.length ? matches[i + 1].index : raw.length;

    const title = matches[i].title;
    const body = raw.slice(start + title.length + 1, end).trim();

    sections.push({ title, body });
  }

  return sections;
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
        return part;
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
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [isVerificationDialogOpen, setIsVerificationDialogOpen] = useState(false);
  const toggle = useCallback((key: string) => setChecked(p => ({ ...p, [key]: !p[key] })), []);

  const documentId: string = report?.id ?? report?.historyId ?? '';

  const { latestVerification, loading: verificationLoading, addVerification } = useClinicalVerification(
    patient?.id,
    'symptom_report',
    documentId || null,
  );

  // Stores the exact DOM Range at the moment the user clicks "Add comment"
  // so we can use surroundContents() for precise single-occurrence highlighting.
  const pendingRangeRef = useRef<Range | null>(null);
  const menu = useSelectionMenu(printRef, menuRef);

  // ── Load existing comments from DB on mount ──────────────────────────────
  useEffect(() => {
    if (!patient?.id || !documentId) return;
    patientService.getComments(patient.id, documentId)
      .then((res: any) => {
        const rows: any[] = res?.data?.comments ?? [];
        setSavedNotes(rows.map(r => ({
          quotedText: r.selection,
          note: r.text,
          editedBy: r.editorName,
          savedAt: r.createdAt ?? r.date ?? new Date().toISOString(),
        })));
        setCommentIds(rows.map(r => r.id));
      })
      .catch(() => { /* silently ignore */ });
  }, [patient?.id, documentId]);

  // Track which comment indices were highlighted via surroundContents (not text-search)
  const rangeHighlightedIndices = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!printRef.current || savedNotes.length === 0) return;

    // Only process notes that weren't already highlighted via surroundContents
    const phrases = savedNotes
      .map((n, i) => ({ text: n.quotedText, index: i }))
      .filter(p => p.text && !rangeHighlightedIndices.current.has(p.index));

    // Remove only marks for text-search indices (leave surroundContents marks alone)
    printRef.current.querySelectorAll('mark[data-comment-highlight]').forEach(m => {
      const idx = Number(m.getAttribute('data-comment-index'));
      if (rangeHighlightedIndices.current.has(idx)) return;
      const parent = m.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(m.textContent ?? ''), m);
        parent.normalize();
      }
    });

    if (phrases.length === 0) return;

    const walker = document.createTreeWalker(
      printRef.current,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          if ((node.parentElement as HTMLElement)?.closest('mark[data-comment-highlight]')) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const textNodes: Text[] = [];
    let node: Node | null;
    while ((node = walker.nextNode())) textNodes.push(node as Text);

    const matched = new Set<number>();

    for (const textNode of textNodes) {
      const text = textNode.textContent ?? '';
      for (const { text: phrase, index } of phrases) {
        if (matched.has(index)) continue;
        const idx = text.indexOf(phrase);
        if (idx === -1) continue;

        matched.add(index);

        const before = text.slice(0, idx);
        const after = text.slice(idx + phrase.length);

        const mark = document.createElement('mark');
        mark.setAttribute('data-comment-highlight', 'true');
        mark.setAttribute('data-comment-index', String(index));
        mark.style.cssText = 'background:#fef08a;border-radius:2px;padding:0 1px;';
        mark.textContent = phrase;

        const frag = document.createDocumentFragment();
        if (before) frag.appendChild(document.createTextNode(before));
        frag.appendChild(mark);
        if (after) frag.appendChild(document.createTextNode(after));

        textNode.parentNode?.replaceChild(frag, textNode);
        break;
      }
    }
  }, [savedNotes, activePanel]);
  if (!report) return null;

  const previousReport = reportHistory.length > 1 ? reportHistory[1] : null;

  const medical = report?.medicalReasoning ?? report?.medical_reasoning ?? {};
  const riskLevel = (report?.riskLevel ?? report?.risk_level ?? 'UNKNOWN').toUpperCase();
  const riskScore = parseFloat(report?.riskScore ?? report?.risk_score ?? 0);
  const riskColor = RISK_COLORS[riskLevel] || RISK_COLORS.MODERATE;

  const keyRiskFactors = parseList(medical?.key_risk_factors ?? report?.keyRiskFactors, 'keyRiskFactors');
  const primaryConcerns = parseList(medical?.primary_concerns ?? report?.primaryConcerns, 'primaryConcerns');
  const recommendations = parseList(report?.recommendations ?? medical?.recommendations, 'recommendations');
  const monitoring = parseList(medical?.monitoring_requirements ?? report?.monitoringRequirements, 'monitoring');
  const immediateActions = parseList(medical?.immediate_actions ?? report?.immediateActions, 'immediateActions');

  const clinicalReasoning = medical?.clinical_reasoning ?? report?.clinicalReasoning ?? '';
  const vitalSigns = medical?.vital_signs_assessment ?? report?.vitalSignsAssessment ?? '';
  const labInterpretation = medical?.laboratory_interpretation ?? report?.laboratoryInterpretation ?? '';
  const historicalFactors = medical?.historical_risk_factors ?? report?.historicalRiskFactors ?? '';
  const followUpTiming = medical?.follow_up_timing ?? report?.followUpTiming ?? '';

  const gestationWeeks = report?.gestationWeeksInt ?? 0;
  const gestationTotal = report?.gestationWeeksTotal ?? 40;
  const generatedDate = formatDate(report?.createdAt ?? report?.updatedAt, 'long');

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    try {
      const patientName = patient?.name?.replace(/\s+/g, ' ').trim() || 'Patient';
      const dateStr = formatDate(report?.createdAt ?? report?.updatedAt, 'short').replace(/\//g, '-');
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

  const handleVerificationSubmit = async (verificationData: VerificationData) => {
    const summaryParts = [
      `Risk: ${riskLevel} (${riskScore.toFixed(2)})`,
      keyRiskFactors.length > 0 ? `Factors: ${keyRiskFactors.slice(0, 2).join('; ')}` : '',
      primaryConcerns.length > 0 ? `Concerns: ${primaryConcerns.slice(0, 2).join('; ')}` : '',
    ].filter(Boolean).join(' | ');

    const res = await diagnosisVerificationService.submit({
      patientId: verificationData.patientId,
      patientName: verificationData.patientName,
      diagnosisText: summaryParts || verificationData.diagnosisText,
      riskLevel: verificationData.riskLevel,
      isAccurate: verificationData.isAccurate,
      obgynNotes: verificationData.obgynNotes,
      sourceType: verificationData.sourceType,
      sourceId: documentId || undefined,
    });
    if (res.data?.verification) addVerification(res.data.verification);
    return res.data?.verification;
  };

  const verificationFindings = [
    { label: 'Risk Score', value: riskScore.toFixed(2) },
    { label: 'Gestation', value: `${gestationWeeks} of ${gestationTotal} weeks` },
    { label: 'Report Date', value: generatedDate },
  ];

  const verificationBullets = [
    ...(keyRiskFactors.length > 0 ? [{ title: 'Key Risk Factors', items: keyRiskFactors }] : []),
    ...(primaryConcerns.length > 0 ? [{ title: 'Primary Concerns', items: primaryConcerns }] : []),
    ...(immediateActions.length > 0 ? [{ title: 'Immediate Actions', items: immediateActions }] : []),
  ];



  return (
    <>
      <SelectionMenu ref={menuRef} menu={menu} onComment={handleComment} />

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

        {savedNotes.length > 0 && (
          <button
            onClick={() => setNotesDrawerOpen(true)}
            className="px-3 py-1.5 rounded text-[13px] font-medium transition-colors flex items-center gap-1.5"
            style={{ background: "#f0fdf4", color: "#008540", border: "1px solid #bbf7d0" }}
          >
            <LuMessageSquare size={14} />
            Notes
            <span style={{
              background: "#008540", color: "#fff",
              borderRadius: 10, fontSize: 10, fontWeight: 700,
              padding: "0 5px", lineHeight: "16px",
            }}>
              {savedNotes.length}
            </span>
          </button>
        )}
      </div>

      {/* Clinical verification status */}
      <div className="print:hidden mb-4">
        <VerificationStatusBar
          verification={latestVerification}
          loading={verificationLoading}
          onReview={() => setIsVerificationDialogOpen(true)}
          subjectLabel="analysis"
        />
      </div>

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
          <ReasoningDiff current={report} previous={previousReport} />
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
              Generated on {formatDate(report?.createdAt ?? report?.updatedAt, 'short')} at{' '}
              {new Date(report?.createdAt ?? report?.updatedAt).toLocaleTimeString('en-US', {
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
            // 1. Highlight the EXACT selection using the stored Range
            //    surroundContents() wraps only the selected nodes — no text search,
            //    no repeated matches anywhere else in the document.
            if (pendingRangeRef.current) {
              try {
                const mark = document.createElement('mark');
                mark.setAttribute('data-comment-highlight', 'true');
                mark.setAttribute('data-comment-index', String(savedNotes.length));
                mark.style.cssText = 'background:#fef08a;border-radius:2px;padding:0 1px;';
                pendingRangeRef.current.surroundContents(mark);
                rangeHighlightedIndices.current.add(savedNotes.length); // ← add this line
              } catch {
                // surroundContents throws if the selection crosses element boundaries.
                // In that case we skip the highlight silently — the comment is still saved.
              }
              pendingRangeRef.current = null;
            }

            // 2. Save to DB
            let newId: string | undefined;
            if (patient?.id && documentId) {
              try {
                const res: any = await patientService.createComment(patient.id, {
                  documentId,
                  selection: payload.quotedText,
                  text: payload.note,
                });
                newId = res?.data?.comment?.id;
              } catch (err) {
                console.error('Failed to persist comment:', err);
              }
            }

            // 3. Update local state
            setSavedNotes(prev => [...prev, payload]);
            setCommentIds(prev => [...prev, newId]);
            await onSaveComment?.(payload);
            setActiveComment(null);
          }}
        />
      )}

      {/* Notes drawer */}
      {notesDrawerOpen && (
        <NotesDrawer
          notes={savedNotes}
          onClose={() => setNotesDrawerOpen(false)}
          onDelete={async (i) => {

            rangeHighlightedIndices.current.delete(i); // ← add this line
            const mark = printRef.current?.querySelector(`mark[data-comment-index="${i}"]`);
            // ... rest unchanged
            // Remove the highlight mark from the DOM by index
            if (mark) {
              const parent = mark.parentNode;
              if (parent) {
                parent.replaceChild(document.createTextNode(mark.textContent ?? ''), mark);
                parent.normalize();
              }
            }

            // Delete from DB
            const id = commentIds[i];
            if (id && patient?.id) {
              try {
                await patientService.deleteComment(patient.id, id);
              } catch (err) {
                console.error('Failed to delete comment from DB:', err);
              }
            }
            setSavedNotes(prev => prev.filter((_, idx) => idx !== i));
            setCommentIds(prev => prev.filter((_, idx) => idx !== i));
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

      {/* Verification Dialog */}
      <DiagnosisVerificationDialog
        isOpen={isVerificationDialogOpen}
        onClose={() => setIsVerificationDialogOpen(false)}
        onSubmit={handleVerificationSubmit}
        diagnosisText={`${riskLevel} risk · score ${riskScore.toFixed(2)}`}
        riskLevel={riskLevel}
        sourceType="symptom_report"
        patientId={patient?.id || ''}
        patientName={patient?.name}
        findings={verificationFindings}
        bulletSections={verificationBullets}
        recordDate={generatedDate}
        existingVerification={latestVerification}
      />
    </>
  );
};

export default SymptomReportNew;