import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MdClose } from 'react-icons/md';
import { LuChevronDown, LuChevronRight, LuShieldCheck, LuClipboardList, LuInfo } from 'react-icons/lu';
import type { VerificationEntry } from '../services/diagnosisVerificationService';
import {
  CLINICAL_REASONING_RUBRIC,
  RUBRIC_SECTION_REPORT_TITLE,
  RUBRIC_TOTAL_POINTS,
  createEmptyRubricScores,
  getCriterionHint,
  getScoreCategory,
  getSectionScore,
  sumRubricScores,
  type RubricCriterion,
  type RubricScores,
  type RubricSection,
} from '../constants/clinicalReasoningRubric';

export interface RubricVerificationData {
  patientId: string;
  patientName?: string;
  diagnosisText: string;
  riskLevel?: string;
  sourceType: 'symptom_report';
  rubricScores: RubricScores;
  totalScore: number;
  scoreCategory: string;
  obgynNotes?: string;
}

export interface ReportSectionPreview {
  title: string;
  content: string;
  hasContent: boolean;
}

interface ClinicalReasoningVerificationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: RubricVerificationData) => Promise<VerificationEntry | void>;
  patientId: string;
  patientName?: string;
  riskLevel?: string;
  diagnosisText: string;
  recordDate?: string;
  reportSections: ReportSectionPreview[];
  existingVerification?: VerificationEntry | null;
}

const TOOLTIP_MAX_CHARS = 520;
const TOOLTIP_WIDTH = 288;
const TOOLTIP_GAP = 8;
const TOOLTIP_EST_HEIGHT = 220;

function truncateText(text: string, max = TOOLTIP_MAX_CHARS): string {
  const cleaned = text
    .replace(/\r/g, '')
    .replace(/\*\*/g, '')
    .replace(/\[(?:LOCALIZED_CONTEXT|\d+)\]/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (!cleaned) return 'Not documented in this AI output.';
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max).trim()}…`;
}

type SectionNotes = Record<string, string>;

function sectionNoteKey(sectionId: string, subsectionTitle?: string): string {
  return subsectionTitle ? `${sectionId}::${subsectionTitle}` : sectionId;
}

function parseStoredNotes(notes?: string | null): { generalNotes: string; sectionNotes: SectionNotes } {
  if (!notes?.trim()) return { generalNotes: '', sectionNotes: {} };

  const marker = '\n\n--- Section Notes ---\n';
  const markerIndex = notes.indexOf(marker);
  if (markerIndex === -1) return { generalNotes: notes.trim(), sectionNotes: {} };

  const generalNotes = notes.slice(0, markerIndex).trim();
  const sectionBlock = notes.slice(markerIndex + marker.length).trim();
  const parsed: SectionNotes = {};
  const matches = [...sectionBlock.matchAll(/^### (.+)\n([\s\S]*?)(?=^### |\Z)/gm)];

  for (const match of matches) {
    const label = match[1]?.trim();
    const body = match[2]?.trim();
    if (!label || !body) continue;
    parsed[label] = body;
  }

  return { generalNotes, sectionNotes: parsed };
}

function serializeNotes(generalNotes: string, sectionNotes: SectionNotes): string | undefined {
  const cleanedGeneral = generalNotes.trim();
  const sectionEntries = Object.entries(sectionNotes)
    .map(([key, value]) => [key.trim(), value.trim()] as const)
    .filter(([, value]) => value.length > 0);

  if (!cleanedGeneral && sectionEntries.length === 0) return undefined;

  if (sectionEntries.length === 0) return cleanedGeneral;

  const sectionBlock = sectionEntries
    .map(([key, value]) => `### ${key}\n${value}`)
    .join('\n\n');

  return [cleanedGeneral, '--- Section Notes ---', sectionBlock]
    .filter(Boolean)
    .join('\n\n');
}

function extractReasoningSubsection(fullText: string, subsectionTitle: string): string {
  if (!fullText.trim()) return '';
  const escaped = subsectionTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = fullText.match(new RegExp(`${escaped}\\s*:\\s*([\\s\\S]*?)(?=\\n[A-Za-z0-9 &/()\\-]+:\\s*$|\\n[A-Za-z0-9 &/()\\-]+:\\s*\\n|$)`, 'im'));
  return match?.[1]?.trim() ?? '';
}

function buildContentMap(sections: ReportSectionPreview[]): Record<string, string> {
  return Object.fromEntries(sections.map((s) => [s.title, s.content]));
}

function getSectionExcerpt(
  sectionId: string,
  contentMap: Record<string, string>,
  subsectionTitle?: string,
): string {
  if (sectionId === 'clinical_reasoning') {
    const full = contentMap['Clinical Reasoning'] ?? '';
    if (subsectionTitle) {
      const sub = extractReasoningSubsection(full, subsectionTitle);
      if (sub) return sub;
    }
    return full;
  }

  if (sectionId === 'follow_up') {
    const parts = ['Follow-Up Timing', 'Immediate Actions', 'Monitoring', 'Recommendations']
      .filter((title) => contentMap[title]?.trim())
      .map((title) => `${title}: ${contentMap[title]}`);
    return parts.join('\n\n');
  }

  const reportTitle = RUBRIC_SECTION_REPORT_TITLE[sectionId];
  return reportTitle ? (contentMap[reportTitle] ?? '') : '';
}

type TooltipPlacement = 'above' | 'below';

interface TooltipPosition {
  top: number;
  left: number;
  placement: TooltipPlacement;
}

function CrossCheckTooltip({
  hint,
  aiExcerpt,
  reportLabel,
}: {
  hint: string;
  aiExcerpt: string;
  reportLabel: string;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<TooltipPosition | null>(null);
  const excerpt = truncateText(aiExcerpt);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    let left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
    left = Math.max(12, Math.min(left, window.innerWidth - TOOLTIP_WIDTH - 12));

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const placement: TooltipPlacement =
      spaceBelow < TOOLTIP_EST_HEIGHT && spaceAbove > spaceBelow ? 'above' : 'below';

    const top =
      placement === 'below'
        ? rect.bottom + TOOLTIP_GAP
        : rect.top - TOOLTIP_GAP;

    setPosition({ top, left, placement });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open, updatePosition, hint, excerpt, reportLabel]);

  useEffect(() => {
    if (!open) return;

    const handleReposition = () => updatePosition();
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);

    return () => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [open, updatePosition]);

  const tooltipNode =
    open &&
    position &&
    createPortal(
      <div
        className="fixed z-[10000] rounded-lg border border-gray-200 bg-white shadow-xl p-3 text-left"
        style={{
          top: position.top,
          left: position.left,
          width: TOOLTIP_WIDTH,
          transform: position.placement === 'above' ? 'translateY(-100%)' : undefined,
        }}
        role="tooltip"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1.5">
          What to check
        </p>
        <p className="text-[11px] text-gray-600 leading-relaxed mb-2">{hint}</p>
        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">
          AI output · {reportLabel}
        </p>
          <p className="text-[11px] text-gray-800 leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto">
          {excerpt}
        </p>
      </div>,
      document.body,
    );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="p-0.5 rounded text-gray-400 hover:text-[#008540] hover:bg-green-50 transition-colors shrink-0"
        aria-label={`Cross-check: ${reportLabel}`}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        <LuInfo size={13} />
      </button>
      {tooltipNode}
    </>
  );
}

function SectionReferenceBar({
  sectionId,
  contentMap,
  subsectionTitle,
}: {
  sectionId: string;
  contentMap: Record<string, string>;
  subsectionTitle?: string;
}) {
  const excerpt = getSectionExcerpt(sectionId, contentMap, subsectionTitle);
  const reportLabel = subsectionTitle ?? RUBRIC_SECTION_REPORT_TITLE[sectionId] ?? 'Report';
  const preview = truncateText(excerpt, 140);
  const hasContent = excerpt.trim().length > 0;

  return (
    <div className="mb-2 mt-1 mx-0.5 rounded-md border border-dashed border-gray-200 bg-white px-2.5 py-2">
      <div className="flex items-start gap-2">
        <CrossCheckTooltip
          hint="Cross-check this section against the AI output before scoring each criterion."
          aiExcerpt={excerpt}
          reportLabel={reportLabel}
        />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold text-gray-500 mb-0.5">
            AI reference · {reportLabel}
          </p>
          <p className={`text-[11px] leading-snug line-clamp-2 ${hasContent ? 'text-gray-700' : 'text-gray-400 italic'}`}>
            {preview}
          </p>
        </div>
      </div>
    </div>
  );
}

function PointSelector({
  criterion,
  value,
  onChange,
  disabled,
}: {
  criterion: RubricCriterion;
  value: number;
  onChange: (points: number) => void;
  disabled?: boolean;
}) {
  const options = Array.from({ length: criterion.maxPoints + 1 }, (_, i) => i);

  return (
    <div className="flex flex-wrap items-center gap-1">
      {options.map((pts) => (
        <button
          key={pts}
          type="button"
          disabled={disabled}
          onClick={() => onChange(pts)}
          className={`min-w-[2rem] h-8 px-2 rounded-md text-[11px] font-semibold transition-all ${
            value === pts
              ? 'bg-[#008540] text-white shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
          }`}
          title={`${pts} / ${criterion.maxPoints}`}
        >
          {pts}
        </button>
      ))}
    </div>
  );
}

function CriterionRow({
  criterion,
  value,
  onChange,
  disabled,
  sectionId,
  contentMap,
  subsectionTitle,
}: {
  criterion: RubricCriterion;
  value: number;
  onChange: (points: number) => void;
  disabled?: boolean;
  sectionId: string;
  contentMap: Record<string, string>;
  subsectionTitle?: string;
}) {
  const hint = criterion.hint ?? getCriterionHint(criterion.id);
  const aiExcerpt = getSectionExcerpt(sectionId, contentMap, subsectionTitle);
  const reportLabel = subsectionTitle ?? RUBRIC_SECTION_REPORT_TITLE[sectionId] ?? 'Report';

  return (
    <div className="py-2.5 border-b border-gray-100 last:border-0">
      <div className="flex items-start gap-1.5 mb-1.5">
        <p className="text-[12px] text-gray-700 leading-snug flex-1 min-w-0">{criterion.label}</p>
        <CrossCheckTooltip hint={hint} aiExcerpt={aiExcerpt} reportLabel={reportLabel} />
        <span className="text-[10px] text-gray-400 shrink-0 tabular-nums">/{criterion.maxPoints}</span>
      </div>
      <PointSelector criterion={criterion} value={value} onChange={onChange} disabled={disabled} />
    </div>
  );
}

function SectionPanel({
  section,
  scores,
  onScoreChange,
  expanded,
  onToggle,
  disabled,
  contentMap,
  sectionNotes,
  onSectionNoteChange,
}: {
  section: RubricSection;
  scores: RubricScores;
  onScoreChange: (criterionId: string, points: number) => void;
  expanded: boolean;
  onToggle: () => void;
  disabled?: boolean;
  contentMap: Record<string, string>;
  sectionNotes: SectionNotes;
  onSectionNoteChange: (key: string, value: string) => void;
}) {
  const sectionScore = getSectionScore(section, scores);
  const complete = sectionScore === section.maxPoints;

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 transition-colors"
      >
        {expanded ? (
          <LuChevronDown size={13} className="text-gray-400 shrink-0" />
        ) : (
          <LuChevronRight size={13} className="text-gray-400 shrink-0" />
        )}
        <span className="text-[12px] font-medium text-gray-800 flex-1 min-w-0">{section.title}</span>
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded tabular-nums shrink-0"
          style={{
            background: complete ? '#f0fdf4' : '#f3f4f6',
            color: complete ? '#15803d' : '#6b7280',
          }}
        >
          {sectionScore}/{section.maxPoints}
        </span>
      </button>

      {expanded && (
        <div className="px-3 pb-2 border-t border-gray-100 bg-gray-50/40">
          {!section.subsections && (
            <SectionReferenceBar sectionId={section.id} contentMap={contentMap} />
          )}
          {section.criteria?.map((c) => (
            <CriterionRow
              key={c.id}
              criterion={c}
              value={scores[c.id] ?? 0}
              onChange={(pts) => onScoreChange(c.id, pts)}
              disabled={disabled}
              sectionId={section.id}
              contentMap={contentMap}
            />
          ))}
          {section.subsections?.map((sub) => (
            <div key={sub.title} className="mt-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1 px-0.5">
                {sub.title}
              </p>
              <SectionReferenceBar
                sectionId={section.id}
                contentMap={contentMap}
                subsectionTitle={sub.title}
              />
              {sub.criteria.map((c) => (
                <CriterionRow
                  key={c.id}
                  criterion={c}
                  value={scores[c.id] ?? 0}
                  onChange={(pts) => onScoreChange(c.id, pts)}
                  disabled={disabled}
                  sectionId={section.id}
                  contentMap={contentMap}
                  subsectionTitle={sub.title}
                />
              ))}
              <div className="pt-2">
                <label className="text-[10px] font-medium text-gray-500 block mb-1">
                  Notes for {sub.title}
                </label>
                <textarea
                  value={sectionNotes[sectionNoteKey(section.id, sub.title)] ?? ''}
                  onChange={(e) => onSectionNoteChange(sectionNoteKey(section.id, sub.title), e.target.value)}
                  className="w-full px-2.5 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#008540]/20 focus:border-[#008540] resize-y text-[11px] text-gray-700 bg-white"
                  rows={2}
                  placeholder={`Add notes for ${sub.title.toLowerCase()}...`}
                  disabled={disabled}
                />
              </div>
            </div>
          ))}
          {!section.subsections && (
            <div className="pt-2">
              <label className="text-[10px] font-medium text-gray-500 block mb-1">
                Notes for {section.title}
              </label>
              <textarea
                value={sectionNotes[sectionNoteKey(section.id)] ?? ''}
                onChange={(e) => onSectionNoteChange(sectionNoteKey(section.id), e.target.value)}
                className="w-full px-2.5 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#008540]/20 focus:border-[#008540] resize-y text-[11px] text-gray-700 bg-white"
                rows={2}
                placeholder={`Add notes for ${section.title.toLowerCase()}...`}
                disabled={disabled}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const ClinicalReasoningVerificationDialog = ({
  isOpen,
  onClose,
  onSubmit,
  patientId,
  patientName,
  riskLevel,
  diagnosisText,
  recordDate,
  reportSections,
  existingVerification,
}: ClinicalReasoningVerificationDialogProps) => {
  const [scores, setScores] = useState<RubricScores>(createEmptyRubricScores);
  const [obgynNotes, setObgynNotes] = useState('');
  const [sectionNotes, setSectionNotes] = useState<SectionNotes>({});
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    () => new Set([CLINICAL_REASONING_RUBRIC[0].id]),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const totalScore = useMemo(() => sumRubricScores(scores), [scores]);
  const category = useMemo(() => getScoreCategory(totalScore), [totalScore]);
  const scoredCount = useMemo(
    () => Object.values(scores).filter((v) => v > 0).length,
    [scores],
  );
  const contentMap = useMemo(() => buildContentMap(reportSections), [reportSections]);

  useEffect(() => {
    if (!isOpen) return;
    const parsedNotes = parseStoredNotes(existingVerification?.obgynNotes);
    setScores(existingVerification?.rubricScores ?? createEmptyRubricScores());
    setObgynNotes(parsedNotes.generalNotes);
    setSectionNotes(parsedNotes.sectionNotes);
    setExpandedSections(new Set([CLINICAL_REASONING_RUBRIC[0].id]));
    setSubmitted(false);
  }, [isOpen, existingVerification]);

  const handleScoreChange = (criterionId: string, points: number) => {
    setScores((prev) => ({ ...prev, [criterionId]: points }));
  };

  const handleSectionNoteChange = (key: string, value: string) => {
    setSectionNotes((prev) => ({ ...prev, [key]: value }));
  };

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({
        patientId,
        patientName,
        diagnosisText,
        riskLevel,
        sourceType: 'symptom_report',
        rubricScores: scores,
        totalScore,
        scoreCategory: category.label,
        obgynNotes: serializeNotes(obgynNotes, sectionNotes),
      });
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 1400);
    } catch (error) {
      console.error('Failed to submit rubric evaluation:', error);
      alert('Failed to submit evaluation. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[min(92vh,760px)] overflow-hidden shadow-2xl flex flex-col my-auto">
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-gray-100 shrink-0 bg-white">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <LuShieldCheck size={17} className="text-[#008540] shrink-0" />
                <h2 className="text-[15px] font-semibold text-gray-900 leading-snug">
                  Clinical Reasoning Evaluation
                </h2>
              </div>
              <p className="text-[12px] text-gray-500 leading-relaxed">
                {patientName ? `${patientName} · ` : ''}
                100-point rubric · reasoning quality, not diagnosis correctness
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 shrink-0"
              disabled={isSubmitting}
              aria-label="Close"
            >
              <MdClose size={20} />
            </button>
          </div>
        </div>

        {submitted ? (
          <div className="flex flex-col items-center justify-center py-14 px-5 text-center">
            <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mb-4">
              <LuShieldCheck size={28} className="text-[#008540]" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Evaluation recorded</h3>
            <p className="text-sm text-gray-500 max-w-sm">
              Score {totalScore}/{RUBRIC_TOTAL_POINTS} · {category.label}. Saved to the audit trail.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col min-h-0 overflow-hidden min-w-2xl">
            {/* Score summary bar */}
            <div
              className="px-4 py-2.5 border-b shrink-0"
              style={{ background: category.bg, borderColor: category.border }}
            >
              <div className="flex items-center gap-3">
                <div className="flex items-baseline gap-1 shrink-0">
                  <span className="text-xl font-bold tabular-nums" style={{ color: category.color }}>
                    {totalScore}
                  </span>
                  <span className="text-xs text-gray-500">/ {RUBRIC_TOTAL_POINTS}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold leading-tight" style={{ color: category.color }}>
                    {category.label}
                  </p>
                  <p className="text-[10px] text-gray-500 truncate">{category.supervision}</p>
                </div>
                <span className="text-[10px] text-gray-400 shrink-0 tabular-nums">
                  {scoredCount} scored
                </span>
              </div>
            </div>

            <div className="overflow-y-auto overflow-x-hidden px-4 py-3 space-y-3 flex-1">
              {/* Compact report context */}
              <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                    Under review
                  </p>
                  {recordDate && (
                    <span className="text-[10px] text-gray-400">{recordDate}</span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-[13px] text-gray-800 font-medium truncate">{diagnosisText}</p>
                  {riskLevel && (
                    <span className="text-[10px] font-bold uppercase text-gray-700 bg-white border border-gray-200 px-2 py-0.5 rounded shrink-0">
                      {riskLevel}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {reportSections.map((sec) => (
                    <span
                      key={sec.title}
                      className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full border ${
                        sec.hasContent
                          ? 'bg-white border-[#bbf7d0] text-[#166534]'
                          : 'bg-white border-gray-200 text-gray-400'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${sec.hasContent ? 'bg-[#16a34a]' : 'bg-gray-300'}`} />
                      {sec.title}
                    </span>
                  ))}
                </div>
              </div>

              {/* Framework hint — inline, no blue box */}
              <p className="text-[11px] text-gray-500 leading-relaxed px-0.5">
                <LuClipboardList size={12} className="inline -mt-px mr-1 text-gray-400" />
                Rate each criterion 0 to max. Hover the{' '}
                <LuInfo size={11} className="inline -mt-px text-gray-400" /> icon to cross-check AI output.
              </p>

              {/* Rubric sections */}
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold text-gray-700 uppercase tracking-wide px-0.5">
                  Rubric scoring
                </p>
                {CLINICAL_REASONING_RUBRIC.map((section) => (
                  <SectionPanel
                    key={section.id}
                    section={section}
                    scores={scores}
                    onScoreChange={handleScoreChange}
                    expanded={expandedSections.has(section.id)}
                    onToggle={() => toggleSection(section.id)}
                    disabled={isSubmitting}
                    contentMap={contentMap}
                    sectionNotes={sectionNotes}
                    onSectionNoteChange={handleSectionNoteChange}
                  />
                ))}
              </div>

              {/* Notes */}
              <div>
                <label className="text-[12px] font-medium text-gray-700 mb-1 block">
                  Clinical notes <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={obgynNotes}
                  onChange={(e) => setObgynNotes(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008540]/25 focus:border-[#008540] resize-none text-sm"
                  rows={2}
                  placeholder="Context, gaps, or teaching points…"
                  disabled={isSubmitting}
                />
              </div>

              {existingVerification && (
                <p className="text-[10px] text-gray-400 text-center pb-1">
                  Previously reviewed {existingVerification.verifiedByName ? `by ${existingVerification.verifiedByName}` : ''}.
                  Submitting again adds a new entry.
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-gray-100 flex justify-between items-center gap-3 shrink-0 bg-white">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 text-sm text-gray-500 hover:text-gray-800 transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#008540] text-white rounded-lg hover:bg-[#007235] transition-colors disabled:opacity-50 text-sm font-semibold flex items-center gap-2"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving…
                  </>
                ) : existingVerification ? (
                  'Update Evaluation'
                ) : (
                  'Submit Evaluation'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ClinicalReasoningVerificationDialog;
