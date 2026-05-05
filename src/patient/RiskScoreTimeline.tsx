/**
 * RiskScoreTimeline
 *
 * Full history of AI symptom reasoning reports rendered as a rich vertical
 * timeline. Each entry shows: date, gestation week, risk level badge, risk
 * score bar, key risk factors, and primary concerns.
 *
 * A compact sparkline variant is still available for the Overview panel.
 */

import React, { useMemo, useState } from 'react';
import { LuTrendingUp, LuTrendingDown, LuMinus, LuChevronDown, LuChevronUp, LuActivity } from 'react-icons/lu';

interface HistoryPoint {
  id: string;
  riskScore: string | number;
  riskLevel: string;
  createdAt: string;
  gestationWeeksInt?: number;
  keyRiskFactors?: string;
  primaryConcerns?: string;
  clinicalReasoning?: string;
}

interface RiskScoreTimelineProps {
  history: HistoryPoint[];
  compact?: boolean;
}

const RISK_COLOR: Record<string, { line: string; bg: string; text: string; border: string }> = {
  CRITICAL: { line: '#dc2626', bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
  HIGH:     { line: '#ea580c', bg: '#fff7ed', text: '#ea580c', border: '#fed7aa' },
  MODERATE: { line: '#ca8a04', bg: '#fefce8', text: '#ca8a04', border: '#fde68a' },
  LOW:      { line: '#16a34a', bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
};

const SIGNIFICANT_JUMP = 0.2;

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

const fmt = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

// ─── Compact sparkline (unchanged, used in Overview) ─────────────────────────
const CompactSparkline: React.FC<{ history: HistoryPoint[] }> = ({ history }) => {
  const points = useMemo(() =>
    [...history].reverse().map(h => ({
      ...h,
      score: Math.min(Math.max(parseFloat(String(h.riskScore)) || 0, 0), 1),
    })), [history]);

  if (points.length === 0) return <span style={{ fontSize: 12, color: '#9ca3af' }}>No history</span>;

  const W = 120, H = 32, PAD = 4;
  const latest = points[points.length - 1];
  const previous = points.length > 1 ? points[points.length - 2] : null;
  const delta = previous ? latest.score - previous.score : 0;
  const trendColor = delta > 0.01 ? '#dc2626' : delta < -0.01 ? '#16a34a' : '#6b7280';
  const TrendIcon = delta > 0.01 ? LuTrendingUp : delta < -0.01 ? LuTrendingDown : LuMinus;

  const svgPoints = points.length === 1
    ? `${PAD},${H - PAD}`
    : points.map((p, i) => {
        const x = PAD + (i / (points.length - 1)) * (W - PAD * 2);
        const y = PAD + (1 - p.score) * (H - PAD * 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(' ');

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <svg width={W} height={H} style={{ overflow: 'visible' }}>
        <polyline points={svgPoints} fill="none" stroke="#d1d5db" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => {
          if (i === 0) return null;
          const prev = points[i - 1];
          if (Math.abs(p.score - prev.score) <= SIGNIFICANT_JUMP) return null;
          const x = PAD + (i / (points.length - 1)) * (W - PAD * 2);
          const y = PAD + (1 - p.score) * (H - PAD * 2);
          return <circle key={i} cx={x} cy={y} r={3} fill="#dc2626" />;
        })}
        {(() => {
          const x = W - PAD;
          const y = PAD + (1 - latest.score) * (H - PAD * 2);
          const c = RISK_COLOR[(latest.riskLevel ?? '').toUpperCase()]?.line ?? '#6b7280';
          return <circle cx={x} cy={y} r={3} fill={c} />;
        })()}
      </svg>
      <TrendIcon size={14} color={trendColor} />
      <span style={{ fontSize: 11, color: trendColor, fontWeight: 600 }}>
        {(latest.score * 100).toFixed(0)}%
      </span>
    </div>
  );
};

// ─── Full timeline entry ──────────────────────────────────────────────────────
const TimelineEntry: React.FC<{
  point: HistoryPoint & { score: number };
  prev: (HistoryPoint & { score: number }) | null;
  isLatest: boolean;
  isFirst: boolean;
}> = ({ point, prev, isLatest, isFirst }) => {
  const [expanded, setExpanded] = useState(false);

  const level = (point.riskLevel ?? '').toUpperCase();
  const colors = RISK_COLOR[level] ?? { line: '#6b7280', bg: '#f9fafb', text: '#6b7280', border: '#e5e7eb' };
  const delta = prev ? point.score - prev.score : null;
  const isJump = delta !== null && Math.abs(delta) > SIGNIFICANT_JUMP;
  const TrendIcon = delta === null ? null : delta > 0.01 ? LuTrendingUp : delta < -0.01 ? LuTrendingDown : LuMinus;
  const trendColor = delta === null ? '#6b7280' : delta > 0.01 ? '#dc2626' : delta < -0.01 ? '#16a34a' : '#9ca3af';

  const factors = parseList(point.keyRiskFactors);
  const concerns = parseList(point.primaryConcerns);
  const hasDetail = factors.length > 0 || concerns.length > 0 || !!point.clinicalReasoning;

  return (
    <div style={{ display: 'flex', gap: 0, position: 'relative' }}>
      {/* Vertical connector line */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 32, flexShrink: 0 }}>
        <div style={{
          width: 12, height: 12, borderRadius: '50%', flexShrink: 0, marginTop: 14,
          background: colors.line, border: `2px solid ${colors.border}`,
          boxShadow: isLatest ? `0 0 0 3px ${colors.bg}` : 'none',
          zIndex: 1,
        }} />
        {!isFirst && (
          <div style={{ width: 2, flex: 1, background: '#e5e7eb', minHeight: 16 }} />
        )}
      </div>

      {/* Card */}
      <div style={{
        flex: 1, marginBottom: 12, marginLeft: 8,
        border: `1px solid ${isLatest ? colors.border : '#e5e7eb'}`,
        borderRadius: 10,
        background: isLatest ? colors.bg : '#fff',
        overflow: 'hidden',
      }}>
        {/* Card header */}
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px',
            cursor: hasDetail ? 'pointer' : 'default',
            borderBottom: expanded ? '1px solid #f3f4f6' : 'none',
          }}
          onClick={() => hasDetail && setExpanded(e => !e)}
        >
          {/* Date + gestation */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
                {fmt(point.createdAt)}
              </span>
              {point.gestationWeeksInt != null && (
                <span style={{
                  fontSize: 11, padding: '1px 7px', borderRadius: 20,
                  background: '#f3f4f6', color: '#6b7280', fontWeight: 500,
                }}>
                  Week {point.gestationWeeksInt}
                </span>
              )}
              {isLatest && (
                <span style={{
                  fontSize: 10, padding: '1px 7px', borderRadius: 20,
                  background: '#008540', color: '#fff', fontWeight: 600,
                }}>
                  Latest
                </span>
              )}
              {isJump && (
                <span style={{
                  fontSize: 10, padding: '1px 7px', borderRadius: 20,
                  background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', fontWeight: 600,
                }}>
                  ⚠ Significant change
                </span>
              )}
            </div>
          </div>

          {/* Risk badge */}
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
            background: colors.bg, color: colors.text, border: `1px solid ${colors.border}`,
            flexShrink: 0,
          }}>
            {level || 'UNKNOWN'}
          </span>

          {/* Score bar */}
          <div style={{ width: 80, flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 10, color: '#9ca3af' }}>Score</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: colors.text }}>
                {(point.score * 100).toFixed(0)}%
              </span>
            </div>
            <div style={{ height: 4, borderRadius: 2, background: '#e5e7eb', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${point.score * 100}%`, background: colors.line, borderRadius: 2, transition: 'width 0.3s' }} />
            </div>
          </div>

          {/* Delta */}
          {TrendIcon && delta !== null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0, minWidth: 52 }}>
              <TrendIcon size={13} color={trendColor} />
              <span style={{ fontSize: 11, fontWeight: 600, color: trendColor }}>
                {delta > 0 ? '+' : ''}{(delta * 100).toFixed(0)}%
              </span>
            </div>
          )}

          {/* Expand toggle */}
          {hasDetail && (
            <span style={{ color: '#9ca3af', flexShrink: 0 }}>
              {expanded ? <LuChevronUp size={14} /> : <LuChevronDown size={14} />}
            </span>
          )}
        </div>

        {/* Expanded detail */}
        {expanded && (
          <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {factors.length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#9ca3af', marginBottom: 5 }}>
                  Key Risk Factors
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {factors.map((f, i) => (
                    <span key={i} style={{
                      fontSize: 11, padding: '2px 9px', borderRadius: 20,
                      background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa',
                    }}>{f}</span>
                  ))}
                </div>
              </div>
            )}
            {concerns.length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#9ca3af', marginBottom: 5 }}>
                  Primary Concerns
                </div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {concerns.map((c, i) => (
                    <li key={i} style={{ display: 'flex', gap: 7, fontSize: 12, color: '#374151' }}>
                      <span style={{ color: colors.line, fontWeight: 700, flexShrink: 0 }}>·</span>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {point.clinicalReasoning && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#9ca3af', marginBottom: 4 }}>
                  Clinical Reasoning
                </div>
                <p style={{ margin: 0, fontSize: 12, color: '#374151', lineHeight: 1.6 }}>
                  {point.clinicalReasoning}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
const RiskScoreTimeline: React.FC<RiskScoreTimelineProps> = ({ history, compact = false }) => {
  const [significantOnly, setSignificantOnly] = useState(false);

  const points = useMemo(() =>
    [...history].reverse().map(h => ({
      ...h,
      score: Math.min(Math.max(parseFloat(String(h.riskScore)) || 0, 0), 1),
    })), [history]);

  if (compact) return <CompactSparkline history={history} />;

  if (points.length === 0) {
    return (
      <div style={{ fontSize: 12, color: '#9ca3af', padding: '12px 0' }}>
        No history available yet.
      </div>
    );
  }

  // Newest-first for display
  const displayPoints = [...points].reverse();

  // Count significant jumps (excluding the latest which is always shown)
  const significantCount = displayPoints.slice(1).filter((p, i) => {
    const prev = displayPoints[i + 2]; // the one before this in chronological order
    const chronoPrev = points[points.length - 2 - i]; // previous in time
    return chronoPrev && Math.abs(p.score - chronoPrev.score) > SIGNIFICANT_JUMP;
  }).length;

  // When filter is on: keep latest + any entry that had a significant jump vs its predecessor
  const filteredPoints = significantOnly
    ? displayPoints.filter((p, i) => {
        if (i === 0) return true; // always show latest
        // Find this point's predecessor in chronological order
        const chronoIdx = points.findIndex(pt => pt.id === p.id || (pt.createdAt === p.createdAt && pt.riskScore === p.riskScore));
        const chronoPrev = chronoIdx > 0 ? points[chronoIdx - 1] : null;
        return chronoPrev && Math.abs(p.score - chronoPrev.score) > SIGNIFICANT_JUMP;
      })
    : displayPoints;

  const latest = points[points.length - 1];
  const previous = points.length > 1 ? points[points.length - 2] : null;
  const delta = previous ? latest.score - previous.score : 0;
  const TrendIcon = delta > 0.01 ? LuTrendingUp : delta < -0.01 ? LuTrendingDown : LuMinus;
  const trendColor = delta > 0.01 ? '#dc2626' : delta < -0.01 ? '#16a34a' : '#6b7280';

  return (
    <div style={{ width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <LuActivity size={15} color="#008540" />
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280' }}>
          Risk History
        </span>
        <span style={{ fontSize: 11, color: '#9ca3af' }}>
          {points.length} report{points.length !== 1 ? 's' : ''}
        </span>

        {/* Significant changes filter toggle */}
        <button
          onClick={() => setSignificantOnly(v => !v)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 11px', borderRadius: 20, fontSize: 11, fontWeight: 600,
            cursor: 'pointer', transition: 'all 0.15s', border: 'none',
            background: significantOnly ? '#fef2f2' : '#f3f4f6',
            color: significantOnly ? '#dc2626' : '#6b7280',
            outline: significantOnly ? '1.5px solid #fecaca' : '1.5px solid transparent',
          }}
        >
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: significantOnly ? '#dc2626' : '#d1d5db',
            display: 'inline-block', flexShrink: 0,
          }} />
          Significant changes
          {significantOnly && points.length > 1 && (
            <span style={{
              marginLeft: 2, fontSize: 10, fontWeight: 700,
              background: '#fecaca', color: '#dc2626',
              borderRadius: 10, padding: '0 5px', lineHeight: '16px',
            }}>
              {filteredPoints.length}
            </span>
          )}
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
          <TrendIcon size={13} color={trendColor} />
          <span style={{ fontSize: 12, fontWeight: 700, color: trendColor }}>
            {delta > 0 ? '+' : ''}{(delta * 100).toFixed(0)}% since last report
          </span>
        </div>
      </div>

      {/* Filtered note */}
      {significantOnly && filteredPoints.length < displayPoints.length && (
        <div style={{
          fontSize: 11, color: '#9ca3af', marginBottom: 12,
          padding: '6px 10px', borderRadius: 8, background: '#f9fafb',
          border: '1px solid #f3f4f6',
        }}>
          Showing {filteredPoints.length} of {displayPoints.length} reports — latest always included
        </div>
      )}

      {/* Entries */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {filteredPoints.map((point, i) => {
          // Find the chronological predecessor for delta calculation
          const chronoIdx = points.findIndex(pt =>
            pt.id === point.id || (pt.createdAt === point.createdAt && pt.riskScore === point.riskScore)
          );
          const chronoPrev = chronoIdx > 0 ? points[chronoIdx - 1] : null;
          return (
            <TimelineEntry
              key={point.id ?? i}
              point={point}
              prev={chronoPrev ?? null}
              isLatest={i === 0}
              isFirst={i === filteredPoints.length - 1}
            />
          );
        })}
      </div>
    </div>
  );
};

export default RiskScoreTimeline;
