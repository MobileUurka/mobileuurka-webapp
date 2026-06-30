import { useEffect, useState, type ReactNode } from 'react';
import { MdClose } from 'react-icons/md';
import { LuShieldCheck, LuClipboardList } from 'react-icons/lu';
import type { VerificationEntry } from '../services/diagnosisVerificationService';

export interface VerificationFinding {
  label: string;
  value: ReactNode;
  wide?: boolean;
}

export interface VerificationBulletSection {
  title: string;
  items: string[];
}

interface DiagnosisVerificationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (verificationData: VerificationData) => Promise<VerificationEntry | void>;
  diagnosisText: string;
  riskLevel?: string;
  sourceType: 'predisposition' | 'symptom_report';
  patientId: string;
  patientName?: string;
  findings?: VerificationFinding[];
  bulletSections?: VerificationBulletSection[];
  recordDate?: string;
  existingVerification?: VerificationEntry | null;
}

export interface VerificationData {
  isAccurate: boolean;
  obgynNotes?: string;
  patientId: string;
  patientName?: string;
  diagnosisText: string;
  riskLevel?: string;
  sourceType: 'predisposition' | 'symptom_report';
}

const RISK_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  CRITICAL: { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
  HIGH: { bg: '#fff7ed', text: '#ea580c', border: '#fed7aa' },
  MODERATE: { bg: '#fefce8', text: '#ca8a04', border: '#fef08a' },
  LOW: { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
};

function RiskPill({ level }: { level: string }) {
  const key = level.toUpperCase();
  const style = RISK_STYLES[key] ?? { bg: '#f3f4f6', text: '#6b7280', border: '#e5e7eb' };
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide"
      style={{ background: style.bg, color: style.text, border: `1px solid ${style.border}` }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: style.text }} />
      {key}
    </span>
  );
}

const DiagnosisVerificationDialog = ({
  isOpen,
  onClose,
  onSubmit,
  diagnosisText,
  riskLevel,
  sourceType,
  patientId,
  patientName,
  findings = [],
  bulletSections = [],
  recordDate,
  existingVerification,
}: DiagnosisVerificationDialogProps) => {
  const [isAccurate, setIsAccurate] = useState<boolean | null>(null);
  const [obgynNotes, setObgynNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const isPredisposition = sourceType === 'predisposition';
  const subject = isPredisposition ? 'diagnosis' : 'analysis';

  useEffect(() => {
    if (!isOpen) return;
    setIsAccurate(existingVerification?.isAccurate ?? null);
    setObgynNotes(existingVerification?.obgynNotes ?? '');
    setSubmitted(false);
  }, [isOpen, existingVerification]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAccurate === null) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        isAccurate,
        obgynNotes: obgynNotes.trim() || undefined,
        patientId,
        patientName,
        diagnosisText,
        riskLevel,
        sourceType,
      });
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 1400);
    } catch (error) {
      console.error('Failed to submit verification:', error);
      alert('Failed to submit verification. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[min(90vh,720px)] overflow-hidden shadow-2xl flex flex-col my-auto">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 shrink-0" style={{ background: 'linear-gradient(180deg, #f9fafb 0%, #ffffff 100%)' }}>
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <LuShieldCheck size={18} className="text-[#008540] shrink-0" />
                <h2 className="text-base font-semibold text-gray-900 leading-snug">
                  Clinical Review — AI {isPredisposition ? 'Diagnosis' : 'Analysis'}
                </h2>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">
                {patientName ? `${patientName} · ` : ''}
                Confirm whether this AI-generated {subject} aligns with your clinical judgment.
                Your review is saved to the audit trail.
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 shrink-0 -mr-1 -mt-1"
              disabled={isSubmitting}
              aria-label="Close"
            >
              <MdClose size={22} />
            </button>
          </div>
        </div>

        {submitted ? (
          <div className="flex flex-col items-center justify-center py-14 px-5 text-center">
            <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mb-4">
              <LuShieldCheck size={28} className="text-[#008540]" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Review recorded</h3>
            <p className="text-sm text-gray-500 max-w-sm">
              Your clinical verification has been saved. The status on this {subject} will update momentarily.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col min-h-0 overflow-hidden w-full min-w-2xl">
            <div className="overflow-y-auto overflow-x-hidden px-5 py-4 space-y-4 max-h-[calc(min(90vh,720px)-8.5rem)]">
              {/* What you're reviewing */}
              <div className="rounded-lg border border-blue-100 bg-blue-50/50 px-4 py-3">
                <div className="flex items-start gap-2.5">
                  <LuClipboardList size={16} className="text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-blue-900 mb-1">What you are verifying</p>
                    <p className="text-[11px] text-blue-800/90 leading-relaxed">
                      {isPredisposition
                        ? 'The AI interpreted lab work and risk data to suggest a predisposition diagnosis. You are confirming whether this matches your assessment of the patient.'
                        : 'The AI analysed symptoms, vitals, and history to produce a risk assessment and care recommendations. You are confirming whether this output is clinically appropriate.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* AI findings panel */}
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap" style={{ background: '#fafafa' }}>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">
                    AI Findings Under Review
                  </p>
                  {recordDate && (
                    <span className="text-[10px] text-gray-400 shrink-0">Record: {recordDate}</span>
                  )}
                </div>

                <div className="p-4 space-y-4">
                  {riskLevel && (
                    <div className="flex items-center justify-between gap-3 pb-3 border-b border-gray-100">
                      <span className="text-xs font-medium text-gray-500 shrink-0">Risk Level</span>
                      <RiskPill level={riskLevel} />
                    </div>
                  )}

                  {findings.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3">
                      {findings.map((f, i) => (
                        <div key={i} className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">
                            {f.label}
                          </p>
                          <div className="text-sm text-gray-800 font-medium leading-snug break-words">{f.value}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">
                        {isPredisposition ? 'AI Diagnosis' : 'Summary'}
                      </p>
                      <p className="text-sm text-gray-800 leading-relaxed break-words">{diagnosisText}</p>
                    </div>
                  )}

                  {bulletSections.map((section, si) =>
                    section.items.length > 0 ? (
                      <div key={si} className="pt-2 border-t border-gray-100">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-2">
                          {section.title}
                        </p>
                        <ul className="space-y-1.5">
                          {section.items.slice(0, 5).map((item, ii) => (
                            <li key={ii} className="flex gap-2 text-[13px] text-gray-700 leading-snug min-w-0">
                              <span className="text-gray-300 shrink-0 mt-1.5 text-[6px]">●</span>
                              <span className="break-words min-w-0">{item}</span>
                            </li>
                          ))}
                          {section.items.length > 5 && (
                            <li className="text-[11px] text-gray-400 pl-3">
                              +{section.items.length - 5} more
                            </li>
                          )}
                        </ul>
                      </div>
                    ) : null,
                  )}
                </div>
              </div>

              {/* Decision */}
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-1">
                  Does this {subject} align with your clinical judgment?
                </p>
                <p className="text-[11px] text-gray-500 mb-3">
                  Select agree if the AI output is clinically sound. Select disagree if it needs correction — add notes below.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAccurate(true)}
                    className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${isAccurate === true
                        ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-200'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                      }`}
                    disabled={isSubmitting}
                  >
                    Accurate
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsAccurate(false)}
                    className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${isAccurate === false
                        ? 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                      }`}
                    disabled={isSubmitting}
                  >
                     Correction
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                  Clinical notes {isAccurate === false ? '(recommended)' : '(optional)'}
                </label>
                <textarea
                  value={obgynNotes}
                  onChange={(e) => setObgynNotes(e.target.value)}
                  className="w-full px-3 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008540]/30 focus:border-[#008540] resize-none text-sm"
                  rows={3}
                  placeholder={
                    isAccurate === false
                      ? 'Describe what should be corrected or your alternative assessment…'
                      : 'Add context, caveats, or follow-up actions…'
                  }
                  disabled={isSubmitting}
                />
              </div>

              {existingVerification && (
                <p className="text-[10px] text-gray-400 text-center">
                  Previously reviewed {existingVerification.verifiedByName ? `by ${existingVerification.verifiedByName}` : ''}.
                  Submitting again adds a new review entry.
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3.5 border-t border-gray-100 flex justify-between items-center gap-3 shrink-0 bg-gray-50/50">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#008540] text-white rounded-lg hover:bg-[#007235] transition-colors disabled:opacity-50 text-sm font-semibold flex items-center gap-2"
                disabled={isSubmitting || isAccurate === null}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving review…
                  </>
                ) : existingVerification ? (
                  'Update Clinical Review'
                ) : (
                  'Submit Clinical Review'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default DiagnosisVerificationDialog;
