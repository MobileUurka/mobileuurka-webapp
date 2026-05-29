/**
 * RiskFactorBreakdown
 *
 * Parses the `keyRiskFactors` text field and renders each factor as a
 * severity-coloured tag. Severity is inferred from keywords in the text —
 * no schema or LLM changes required.
 *
 * Severity heuristics (keyword-based):
 *   CRITICAL  — eclampsia, haemorrhage, hemorrhage, sepsis, rupture, abruption, embolism
 *   HIGH      — preeclampsia, hypertension, diabetes, anaemia, anemia, infection, preterm
 *   MODERATE  — elevated, abnormal, borderline, mild, moderate, risk, history
 *   LOW       — everything else
 */

import React, { useMemo } from 'react';
import { LuTriangleAlert } from 'react-icons/lu';

interface RiskFactorBreakdownProps {
  keyRiskFactors: string[];
  /** Show a compact inline version (no header, smaller tags) */
  compact?: boolean;
}

type Severity = 'critical' | 'high' | 'moderate' | 'low';

const SEVERITY_STYLES: Record<Severity, { bg: string; color: string; border: string; dot: string }> = {
  critical: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca', dot: '#dc2626' },
  high: { bg: '#fff7ed', color: '#ea580c', border: '#fed7aa', dot: '#ea580c' },
  moderate: { bg: '#fefce8', color: '#ca8a04', border: '#fde68a', dot: '#ca8a04' },
  low: { bg: '#f3f4f6', color: '#374151', border: '#e5e7eb', dot: '#6b7280' },
};

const CRITICAL_KEYWORDS = [
  'eclampsia', 'haemorrhage', 'hemorrhage', 'sepsis', 'rupture',
  'abruption', 'embolism', 'cardiac arrest', 'stroke', 'coma',
];
const HIGH_KEYWORDS = [
  'preeclampsia', 'hypertension', 'diabetes', 'anaemia', 'anemia',
  'infection', 'preterm', 'premature', 'placenta previa', 'gestational',
  'hiv', 'malaria', 'tuberculosis', 'severe',
];
const MODERATE_KEYWORDS = [
  'elevated', 'abnormal', 'borderline', 'mild', 'moderate', 'risk',
  'history', 'previous', 'prior', 'increased', 'high', 'low',
  'deficiency', 'insufficiency',
];

function inferSeverity(factor: string): Severity {
  const lower = factor.toLowerCase();
  if (CRITICAL_KEYWORDS.some(k => lower.includes(k))) return 'critical';
  if (HIGH_KEYWORDS.some(k => lower.includes(k))) return 'high';
  if (MODERATE_KEYWORDS.some(k => lower.includes(k))) return 'moderate';
  return 'low';
}

const RiskFactorBreakdown: React.FC<RiskFactorBreakdownProps> = ({ keyRiskFactors, compact = false }) => {
  const factors = useMemo(() =>
    keyRiskFactors.map(f => ({ text: f, severity: inferSeverity(f) })),
    [keyRiskFactors]
  );

  const criticalCount = factors.filter(f => f.severity === 'critical').length;
  const highCount = factors.filter(f => f.severity === 'high').length;

  if (factors.length === 0) {
    return <span style={{ fontSize: 13, color: '#9ca3af' }}>No key risk factors recorded.</span>;
  }

  if (compact) {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {factors.map((f, i) => {
          const s = SEVERITY_STYLES[f.severity];
          return (
            <span key={i} style={{
              display: 'inline-flex',
              alignItems: 'flex-start', // 👈 Changed from 'center' to snap to the top
              gap: 6,                   // Slight increase for cleaner badge spacing
              fontSize: 10,
              fontWeight: 500,
              padding: '8px 12px',
              borderRadius: 20,
              background: s.bg,
              color: s.color,
              border: `1px solid ${s.border}`,
              lineHeight: '14px'        // Explicit line-height ensures predictable alignment
            }}>
              <span style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: s.dot,
                flexShrink: 0,
                marginTop: '4.5px'      // 👈 Offsets the dot to align perfectly with the first line of text
              }} />
              <span style={{ textAlign: 'left' }}>
                {f.text}
              </span>
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      {/* Summary bar */}
      {(criticalCount > 0 || highCount > 0) && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
          padding: '8px 12px', borderRadius: 7,
          background: criticalCount > 0 ? '#fef2f2' : '#fff7ed',
          border: `1px solid ${criticalCount > 0 ? '#fecaca' : '#fed7aa'}`,
        }}>
          <LuTriangleAlert size={14} color={criticalCount > 0 ? '#dc2626' : '#ea580c'} />
          <span style={{ fontSize: 12, color: criticalCount > 0 ? '#dc2626' : '#ea580c', fontWeight: 600 }}>
            {criticalCount > 0 && `${criticalCount} critical factor${criticalCount > 1 ? 's' : ''}`}
            {criticalCount > 0 && highCount > 0 && ' · '}
            {highCount > 0 && `${highCount} high-severity factor${highCount > 1 ? 's' : ''}`}
          </span>
        </div>
      )}

      {/* Factor tags */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
        {factors.map((f, i) => {
          const s = SEVERITY_STYLES[f.severity];
          return (
            <span key={i} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 12, fontWeight: 500, padding: '5px 11px', borderRadius: 20,
              background: s.bg, color: s.color, border: `1px solid ${s.border}`,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
              {f.text}
            </span>
          );
        })}
      </div>

      {/* Severity legend */}
      <div style={{ display: 'flex', gap: 14, marginTop: 10, flexWrap: 'wrap' }}>
        {(['critical', 'high', 'moderate', 'low'] as Severity[]).map(sev => {
          const count = factors.filter(f => f.severity === sev).length;
          if (count === 0) return null;
          const s = SEVERITY_STYLES[sev];
          return (
            <div key={sev} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.dot }} />
              <span style={{ fontSize: 10, color: '#6b7280', textTransform: 'capitalize' }}>
                {sev} ({count})
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RiskFactorBreakdown;
