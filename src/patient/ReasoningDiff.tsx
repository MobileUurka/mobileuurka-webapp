/**
 * ReasoningDiff — Changes tab
 *
 * Compact at-a-glance comparison for OB/GYNs.
 * No text walls — everything is scannable in seconds.
 *
 * Layout:
 *  1. Risk score card  — big number, direction arrow, level badge change
 *  2. What's new       — new concerns / risk factors as pills (orange)
 *  3. What's resolved  — removed items as pills (green strikethrough)
 *  4. Recommendations  — only new ones shown
 *  5. Follow-up        — previous vs current in one line each
 */

import React, { useMemo } from 'react';
import { LuTrendingUp, LuTrendingDown, LuMinus, LuArrowRight } from 'react-icons/lu';

interface ReportSnapshot {
  riskLevel: string;
  riskScore: string | number;
  primaryConcerns?: string;
  recommendations?: string;
  monitoringRequirements?: string;
  keyRiskFactors?: string;
  followUpTiming?: string;
  createdAt?: string;
  gestationWeeksInt?: number;
}

interface ReasoningDiffProps {
  current: ReportSnapshot;
  previous: ReportSnapshot;
}

const RISK_COLOR: Record<string, { text: string; bg: string; border: string }> = {
  CRITICAL: { text: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  HIGH:     { text: '#ea580c', bg: '#fff7ed', border: '#fed7aa' },
  MODERATE: { text: '#ca8a04', bg: '#fefce8', border: '#fde68a' },
  LOW:      { text: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
};

const parseList = (raw: any): string[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean).map(String);
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
  } catch {}
  return String(raw)
    .replace(/^\[|\]$/g, '')
    .split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
    .map(s => s.replace(/^["']|["']$/g, '').trim())
    .filter(Boolean);
};

const fmtDate = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

// ─── Pill ─────────────────────────────────────────────────────────────────────
const Pill: React.FC<{
  label: string;
  variant: 'new' | 'gone' | 'same';
}> = ({ label, variant }) => {
  const styles = {
    new:  { bg: '#fff7ed', text: '#c2410c', border: '1px solid #fed7aa' },
    gone: { bg: '#f0fdf4', text: '#15803d', border: '1px solid #bbf7d0' },
    same: { bg: '#f9fafb', text: '#9ca3af', border: '1px solid #e5e7eb' },
  }[variant];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 20,
      background: styles.bg, color: styles.text, border: styles.border,
      textDecoration: variant === 'gone' ? 'line-through' : 'none',
    }}>
      {variant === 'new' && <span style={{ fontWeight: 700 }}>+</span>}
      {variant === 'gone' && <span style={{ fontWeight: 700 }}>−</span>}
      {label}
    </span>
  );
};

// ─── Section ──────────────────────────────────────────────────────────────────
const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{ marginBottom: 16 }}>
    <div style={{
      fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.08em', color: '#9ca3af', marginBottom: 8,
    }}>
      {title}
    </div>
    {children}
  </div>
);

// ─── Main ─────────────────────────────────────────────────────────────────────
const ReasoningDiff: React.FC<ReasoningDiffProps> = ({ current, previous }) => {
  const currScore = parseFloat(String(current.riskScore)) || 0;
  const prevScore = parseFloat(String(previous.riskScore)) || 0;
  const delta     = currScore - prevScore;
  const deltaAbs  = Math.abs(delta);
  const isUp      = delta > 0.005;
  const isDown    = delta < -0.005;

  const currLevel = (current.riskLevel ?? '').toUpperCase();
  const prevLevel = (previous.riskLevel ?? '').toUpperCase();
  const levelChanged = currLevel !== prevLevel;

  const currColors = RISK_COLOR[currLevel] ?? { text: '#6b7280', bg: '#f9fafb', border: '#e5e7eb' };
  const prevColors = RISK_COLOR[prevLevel] ?? { text: '#6b7280', bg: '#f9fafb', border: '#e5e7eb' };

  const TrendIcon = isUp ? LuTrendingUp : isDown ? LuTrendingDown : LuMinus;
  const trendColor = isUp ? '#dc2626' : isDown ? '#16a34a' : '#9ca3af';

  // Diff helpers
  const diff = (currRaw: any, prevRaw: any) => {
    const curr = parseList(currRaw);
    const prev = parseList(prevRaw);
    const prevSet = new Set(prev.map(s => s.toLowerCase()));
    const currSet = new Set(curr.map(s => s.toLowerCase()));
    return {
      added:   curr.filter(s => !prevSet.has(s.toLowerCase())),
      removed: prev.filter(s => !currSet.has(s.toLowerCase())),
    };
  };

  const factorsDiff  = useMemo(() => diff(current.keyRiskFactors,        previous.keyRiskFactors),        [current, previous]);
  const concernsDiff = useMemo(() => diff(current.primaryConcerns,       previous.primaryConcerns),       [current, previous]);
  const recsDiff     = useMemo(() => diff(current.recommendations,       previous.recommendations),       [current, previous]);
  const monDiff      = useMemo(() => diff(current.monitoringRequirements, previous.monitoringRequirements), [current, previous]);

  const newItems    = [...factorsDiff.added, ...concernsDiff.added];
  const removedItems = [...factorsDiff.removed, ...concernsDiff.removed];
  const newRecs     = recsDiff.added;
  const newMon      = monDiff.added;

  const followupChanged = (current.followUpTiming ?? '') !== (previous.followUpTiming ?? '');
  const nothingChanged  = !levelChanged && deltaAbs <= 0.005 && newItems.length === 0 && removedItems.length === 0 && newRecs.length === 0 && !followupChanged;

  return (
    <div style={{ width: '100%' }}>

      {/* ── Date header ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14, color: '#9ca3af', fontSize: 11 }}>
        <span>{fmtDate(previous.createdAt)}</span>
        <LuArrowRight size={12} />
        <span style={{ color: '#374151', fontWeight: 600 }}>{fmtDate(current.createdAt)}</span>
        {current.gestationWeeksInt != null && (
          <span style={{
            marginLeft: 4, fontSize: 10, padding: '1px 7px', borderRadius: 20,
            background: '#f3f4f6', color: '#6b7280', fontWeight: 500,
          }}>
            Week {current.gestationWeeksInt}
          </span>
        )}
      </div>

      {/* ── Risk score card ──────────────────────────────────────────────── */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr auto', gap: 16,
        padding: '14px 16px', borderRadius: 10, marginBottom: 16,
        background: isUp ? '#fef2f2' : isDown ? '#f0fdf4' : '#f9fafb',
        border: `1px solid ${isUp ? '#fecaca' : isDown ? '#bbf7d0' : '#e5e7eb'}`,
      }}>
        {/* Score */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#9ca3af', marginBottom: 4 }}>
            Risk Score
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 28, fontWeight: 800, color: trendColor, lineHeight: 1 }}>
              {(currScore * 100).toFixed(0)}%
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <TrendIcon size={16} color={trendColor} />
              <span style={{ fontSize: 13, fontWeight: 600, color: trendColor }}>
                {deltaAbs > 0.005
                  ? `${isUp ? '+' : ''}${(delta * 100).toFixed(0)}%`
                  : 'no change'}
              </span>
            </div>
          </div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>
            was {(prevScore * 100).toFixed(0)}%
          </div>
        </div>

        {/* Level change */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', gap: 6 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#9ca3af' }}>
            Risk Level
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
              color: prevColors.text, background: prevColors.bg, border: `1px solid ${prevColors.border}`,
              opacity: 0.7,
            }}>
              {prevLevel || '—'}
            </span>
            <LuArrowRight size={12} color="#9ca3af" />
            <span style={{
              fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
              color: currColors.text, background: currColors.bg, border: `1px solid ${currColors.border}`,
              boxShadow: levelChanged ? `0 0 0 2px ${currColors.border}` : 'none',
            }}>
              {currLevel || '—'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Nothing changed ──────────────────────────────────────────────── */}
      {nothingChanged && (
        <div style={{
          textAlign: 'center', padding: '20px 0', color: '#9ca3af', fontSize: 13,
        }}>
          No clinical changes since the previous report.
        </div>
      )}

      {/* ── New concerns / risk factors ──────────────────────────────────── */}
      {newItems.length > 0 && (
        <Section title="New this report">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {newItems.map((item, i) => <Pill key={i} label={item} variant="new" />)}
          </div>
        </Section>
      )}

      {/* ── Resolved ─────────────────────────────────────────────────────── */}
      {removedItems.length > 0 && (
        <Section title="No longer flagged">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {removedItems.map((item, i) => <Pill key={i} label={item} variant="gone" />)}
          </div>
        </Section>
      )}

      {/* ── New recommendations ───────────────────────────────────────────── */}
      {newRecs.length > 0 && (
        <Section title="New recommendations">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {newRecs.map((r, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ color: '#008540', fontWeight: 700, fontSize: 14, lineHeight: 1.4, flexShrink: 0 }}>+</span>
                <span style={{ fontSize: 12, color: '#374151', lineHeight: 1.5 }}>{r}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── New monitoring ────────────────────────────────────────────────── */}
      {newMon.length > 0 && (
        <Section title="New monitoring requirements">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {newMon.map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ color: '#ca8a04', fontWeight: 700, fontSize: 14, lineHeight: 1.4, flexShrink: 0 }}>·</span>
                <span style={{ fontSize: 12, color: '#374151', lineHeight: 1.5 }}>{m}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── Follow-up timing ─────────────────────────────────────────────── */}
      {followupChanged && current.followUpTiming && (
        <Section title="Follow-up">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {previous.followUpTiming && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', minWidth: 52 }}>Before</span>
                <span style={{ fontSize: 12, color: '#9ca3af', textDecoration: 'line-through' }}>{previous.followUpTiming}</span>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: '#008540', minWidth: 52 }}>Now</span>
              <span style={{ fontSize: 12, color: '#374151', fontWeight: 500 }}>{current.followUpTiming}</span>
            </div>
          </div>
        </Section>
      )}

    </div>
  );
};

export default ReasoningDiff;
