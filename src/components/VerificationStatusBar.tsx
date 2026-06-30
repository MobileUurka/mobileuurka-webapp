import { LuCircleCheck, LuShieldCheck, LuPenLine } from 'react-icons/lu';
import type { VerificationEntry } from '../services/diagnosisVerificationService';
import { formatVerificationAgo } from '../hooks/useClinicalVerification';

interface VerificationStatusBarProps {
  verification: VerificationEntry | null;
  loading?: boolean;
  onReview: () => void;
  subjectLabel: string;
  compact?: boolean;
}

const VerificationStatusBar = ({
  verification,
  loading,
  onReview,
  subjectLabel,
  compact = false,
}: VerificationStatusBarProps) => {
  if (loading) {
    return (
      <div
        className={`rounded-lg border border-gray-200 bg-gray-50 animate-pulse ${compact ? 'px-3 py-2' : 'px-4 py-3'}`}
        style={{ minHeight: compact ? 36 : 52 }}
      />
    );
  }

  if (!verification) {
    return (
      <button
        type="button"
        onClick={onReview}
        className={`w-full text-left rounded-lg border transition-colors hover:border-amber-300 hover:bg-amber-50/60 ${
          compact ? 'px-3 py-2' : 'px-4 py-3'
        }`}
        style={{ borderColor: '#fde68a', background: '#fffbeb' }}
      >
        <div className="flex items-start gap-2.5">
          <LuShieldCheck size={compact ? 16 : 18} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className={`font-semibold text-amber-900 ${compact ? 'text-[11px]' : 'text-xs'}`}>
              Clinical review required
            </p>
            {/* <p className={`text-amber-800/80 leading-snug ${compact ? 'text-[10px] mt-0.5' : 'text-[11px] mt-1'}`}>
              Confirm whether this AI {subjectLabel} matches your clinical judgment.
            </p> */}
          </div>
          <span
            className={`shrink-0 font-semibold text-white rounded-md bg-amber-500 hover:bg-amber-600 transition-colors ${
              compact ? 'text-[10px] px-2 py-1' : 'text-[11px] px-2.5 py-1.5'
            }`}
          >
            Review
          </span>
        </div>
      </button>
    );
  }

  const accurate = verification.isAccurate;

  return (
    <div
      className={`rounded-lg border ${compact ? 'px-3 py-2' : 'px-4 py-3'}`}
      style={{
        borderColor: accurate ? '#bbf7d0' : '#fecaca',
        background: accurate ? '#f0fdf4' : '#fef2f2',
      }}
    >
      <div className="flex items-start gap-2.5">
        <LuCircleCheck
          size={compact ? 16 : 18}
          className="shrink-0 mt-0.5"
          style={{ color: accurate ? '#16a34a' : '#dc2626' }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={`font-semibold ${compact ? 'text-[11px]' : 'text-xs'}`} style={{ color: accurate ? '#14532d' : '#7f1d1d' }}>
              {accurate ? 'Clinically verified' : 'Flagged for correction'}
            </p>
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded"
              style={{
                background: accurate ? 'rgba(22,163,74,0.12)' : 'rgba(220,38,38,0.12)',
                color: accurate ? '#15803d' : '#b91c1c',
              }}
            >
              {accurate ? 'Agreed' : 'Disagreed'}
            </span>
          </div>
          <p className={`text-gray-600 ${compact ? 'text-[10px] mt-0.5' : 'text-[11px] mt-1'}`}>
            {verification.verifiedByName || 'Clinician'}
            {verification.verifiedByRole ? ` · ${verification.verifiedByRole}` : ''}
            {' · '}
            {formatVerificationAgo(verification.createdAt)}
          </p>
          {verification.obgynNotes && (
            <p
              className={`italic text-gray-700 leading-snug ${compact ? 'text-[10px] mt-1 line-clamp-2' : 'text-[11px] mt-1.5 line-clamp-3'}`}
            >
              &ldquo;{verification.obgynNotes}&rdquo;
            </p>
          )}
          <p className={`text-gray-400 ${compact ? 'text-[9px] mt-1' : 'text-[10px] mt-1.5'}`}>
            Recorded in audit trail · visible in Feedback
          </p>
        </div>
        <button
          type="button"
          onClick={onReview}
          className={`shrink-0 flex items-center gap-1 font-medium rounded-md border transition-colors hover:bg-white/80 ${
            compact ? 'text-[10px] px-2 py-1' : 'text-[11px] px-2.5 py-1.5'
          }`}
          style={{
            borderColor: accurate ? '#86efac' : '#fca5a5',
            color: accurate ? '#166534' : '#991b1b',
          }}
        >
          <LuPenLine size={12} />
          Update
        </button>
      </div>
    </div>
  );
};

export default VerificationStatusBar;
