import React, { useState } from 'react';
import { IoArrowBackOutline } from 'react-icons/io5';
import { HiOutlineDownload } from 'react-icons/hi';
import { TbBrain } from 'react-icons/tb';
import { LuActivity, LuTriangleAlert, LuFlaskConical, LuHeartPulse, LuHistory, LuListChecks, LuShieldAlert, LuStethoscope, LuGitCompare } from 'react-icons/lu';
import type { PatientData } from '../types/patient';
import RiskScoreTimeline from './RiskScoreTimeline';
import ReasoningDiff from './ReasoningDiff';
import ActionChecklist from './ActionChecklist';
import RiskFactorBreakdown from './RiskFactorBreakdown';

interface SymptomReportProps {
  report: any;
  patient?: PatientData;
  onBack?: () => void;
  /** Full history array from symptom_reasoning_report_history (newest-first) */
  reportHistory?: any[];
  /** Called when clinician escalates a CRITICAL alert */
  onEscalate?: (message: string) => Promise<void>;
}

// ─── HELPERS ────────────────────────────────────────────────────────────────

const RISK_CONFIG: Record<string, { bg: string; text: string; border: string; dot: string; label: string }> = {
  CRITICAL: { bg: '#fef2f2', text: '#dc2626', border: '#fecaca', dot: '#dc2626', label: 'Critical' },
  HIGH:     { bg: '#fff7ed', text: '#ea580c', border: '#fed7aa', dot: '#ea580c', label: 'High' },
  MODERATE: { bg: '#fefce8', text: '#ca8a04', border: '#fde68a', dot: '#ca8a04', label: 'Moderate' },
  LOW:      { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0', dot: '#16a34a', label: 'Low' },
};

const getRisk = (level?: string) =>
  RISK_CONFIG[(level ?? '').toUpperCase()] ?? RISK_CONFIG.MODERATE;

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

const formatDate = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
};

const scoreBar = (score: number) => {
  const pct = Math.round(Math.min(Math.max(score, 0), 1) * 100);
  const color = pct >= 80 ? '#dc2626' : pct >= 60 ? '#ea580c' : pct >= 40 ? '#ca8a04' : '#16a34a';
  return { pct, color };
};

// ─── SUB-COMPONENTS ──────────────────────────────────────────────────────────

const Section = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
  <div style={{ marginBottom: 20 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <span style={{ color: '#6b7280', display: 'flex' }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280' }}>{title}</span>
    </div>
    {children}
  </div>
);

const Chip = ({ text, variant = 'neutral' }: { text: string; variant?: 'danger' | 'warn' | 'ok' | 'neutral' }) => {
  const styles: Record<string, { bg: string; color: string }> = {
    danger:  { bg: '#fef2f2', color: '#dc2626' },
    warn:    { bg: '#fff7ed', color: '#ea580c' },
    ok:      { bg: '#f0fdf4', color: '#16a34a' },
    neutral: { bg: '#f3f4f6', color: '#374151' },
  };
  const s = styles[variant];
  return (
    <span style={{
      display: 'inline-block', fontSize: 11, fontWeight: 500,
      padding: '3px 9px', borderRadius: 20, marginRight: 6, marginBottom: 6,
      background: s.bg, color: s.color,
    }}>
      {text}
    </span>
  );
};

const BulletList = ({ items, variant = 'neutral' }: { items: string[]; variant?: 'danger' | 'warn' | 'ok' | 'neutral' }) => {
  if (!items.length) return <span style={{ fontSize: 13, color: '#9ca3af' }}>—</span>;
  return (
    <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
      {items.map((item, i) => (
        <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6, fontSize: 13, color: '#374151', lineHeight: 1.5 }}>
          <span style={{ marginTop: 5, width: 6, height: 6, borderRadius: '50%', background: variant === 'danger' ? '#dc2626' : variant === 'warn' ? '#ea580c' : '#6b7280', flexShrink: 0 }} />
          {item}
        </li>
      ))}
    </ul>
  );
};

const ProseBlock = ({ text }: { text?: string }) => {
  if (!text) return <span style={{ fontSize: 13, color: '#9ca3af' }}>—</span>;
  return (
    <p style={{ margin: 0, fontSize: 13, color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
      {text}
    </p>
  );
};

// ─── DOWNLOAD ────────────────────────────────────────────────────────────────

const downloadReport = (report: any, patient?: PatientData) => {
  const risk = getRisk(report?.riskLevel);
  const medical = report?.medicalReasoning ?? report?.medical_reasoning ?? {};
  const hr = '─'.repeat(60);
  const lines = [
    (patient?.hospital ?? 'Medical Facility').toUpperCase(),
    'SYMPTOM-BASED REASONING REPORT — CONFIDENTIAL',
    hr,
    `Patient   : ${patient?.name ?? '—'}`,
    `Risk Level: ${risk.label.toUpperCase()} (Score: ${report?.riskScore ?? '—'})`,
    `Generated : ${formatDate(report?.createdAt ?? report?.timestamp)}`,
    hr, '',
    'KEY RISK FACTORS',
    ...parseList(medical?.key_risk_factors ?? report?.keyRiskFactors).map(f => `  • ${f}`),
    '', 'RECOMMENDATIONS',
    ...parseList(report?.recommendations ?? medical?.recommendations).map(r => `  • ${r}`),
    '', 'CLINICAL REASONING',
    medical?.clinical_reasoning ?? report?.clinicalReasoning ?? '—',
    '', 'MONITORING REQUIREMENTS',
    ...parseList(medical?.monitoring_requirements ?? report?.monitoringRequirements).map(m => `  • ${m}`),
    '', hr,
    'Confidential — Authorised medical personnel only',
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), {
    href: url, download: `Symptom_Report_${patient?.name?.replace(/\s+/g, '_') ?? 'patient'}.txt`,
  });
  a.click();
  URL.revokeObjectURL(url);
};

// ─── MAIN ────────────────────────────────────────────────────────────────────

const SymptomReport: React.FC<SymptomReportProps> = ({ report, patient, onBack, reportHistory = [], onEscalate }) => {
  const [activePanel, setActivePanel] = useState<'report' | 'diff' | 'timeline'>('report');

  if (!report) return null;

  // Normalise — API returns camelCase from DB, raw API uses snake_case
  const medical = report?.medicalReasoning ?? report?.medical_reasoning ?? {};
  const riskAssessment = medical?.risk_assessment ?? {};
  const currentState = report?.currentState ?? report?.current_state ?? {};
  const analysisDetails = report?.analysisDetails ?? report?.analysis_details ?? {};

  const riskLevel = (report?.riskLevel ?? report?.risk_level ?? riskAssessment?.level ?? 'UNKNOWN').toUpperCase();
  const riskScore = parseFloat(report?.riskScore ?? report?.risk_score ?? riskAssessment?.score ?? 0);
  const { pct, color: barColor } = scoreBar(riskScore);
  const risk = getRisk(riskLevel);

  const keyRiskFactors   = parseList(medical?.key_risk_factors   ?? report?.keyRiskFactors);
  const primaryConcerns  = parseList(riskAssessment?.primary_concerns ?? report?.primaryConcerns);
  const recommendations  = parseList(report?.recommendations     ?? medical?.recommendations);
  const monitoring       = parseList(medical?.monitoring_requirements ?? report?.monitoringRequirements);
  const clinicalSymptoms = parseList(analysisDetails?.clinical_symptoms);
  const riskFactorsList  = parseList(analysisDetails?.risk_factors);

  const clinicalReasoning    = medical?.clinical_reasoning    ?? report?.clinicalReasoning    ?? '';
  const vitalSigns           = medical?.vital_signs_assessment ?? report?.vitalSignsAssessment ?? '';
  const labInterpretation    = medical?.laboratory_interpretation ?? report?.laboratoryInterpretation ?? '';
  const historicalFactors    = medical?.historical_risk_factors ?? report?.historicalRiskFactors ?? '';
  const gestationalNotes     = medical?.gestational_considerations ?? '';
  const immediateActions     = parseList(medical?.immediate_actions ?? report?.immediateActions);

  const hospitalName = patient?.hospital ?? 'Medical Facility';
  const generatedAt  = formatDate(report?.createdAt ?? report?.updatedAt ?? report?.timestamp);

  // History is newest-first; the second entry is the "previous" report
  const previousReport = reportHistory.length > 1 ? reportHistory[1] : null;

  return (
    <div style={{
      width: '100%', maxWidth: 760, fontFamily: "var(--font-title, 'DM Sans', sans-serif)",
      color: '#111827', marginBottom: 32,
    }}>

      {/* ── HEADER ── */}
      <div style={{
        background: '#008540',
        borderRadius: '12px 12px 0 0',
        padding: '20px 24px 18px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {onBack && (
            <button onClick={onBack} style={{
              background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 7, cursor: 'pointer', color: '#fff',
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 12, padding: '5px 11px', fontFamily: 'inherit',
            }}>
              <IoArrowBackOutline size={13} /> Back
            </button>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <TbBrain size={20} color="#fff" />
            </div>            <div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>
                {hospitalName}
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>
                Symptom-Based Reasoning Report
              </div>
            </div>
          </div>
        </div>
        <button
          onClick={() => downloadReport(report, patient)}
          style={{
            background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 7, cursor: 'pointer', color: '#fff',
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 12, padding: '6px 12px', fontFamily: 'inherit',
          }}
        >
          <HiOutlineDownload size={13} /> Download
        </button>
      </div>

      {/* ── RISK BANNER ── */}
      <div style={{
        background: risk.bg, border: `1px solid ${risk.border}`,
        borderTop: 'none', padding: '16px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: `${risk.dot}18`,
            border: `2px solid ${risk.dot}40`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <LuShieldAlert size={20} color={risk.dot} />
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>
              Risk Level
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: risk.text, letterSpacing: '-0.02em' }}>
              {risk.label}
            </div>
          </div>
        </div>

        {/* Score bar */}
        <div style={{ flex: 1, minWidth: 160, maxWidth: 260 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 11, color: '#9ca3af' }}>Risk Score</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: barColor }}>{pct}%</span>
          </div>
          <div style={{ height: 7, borderRadius: 4, background: '#e5e7eb', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 4, transition: 'width 0.6s ease' }} />
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>Generated</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{generatedAt}</div>
        </div>
      </div>

      {/* ── CURRENT STATE STRIP ── */}
      {(currentState.overall_status || currentState.maternal_wellbeing || currentState.fetal_status) && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          borderBottom: '1px solid #f3f4f6', background: '#fafafa',
        }}>
          {[
            { label: 'Overall Status', value: currentState.overall_status },
            { label: 'Maternal Wellbeing', value: currentState.maternal_wellbeing },
            { label: 'Fetal Status', value: currentState.fetal_status },
          ].map(({ label, value }, i) => value ? (
            <div key={i} style={{
              padding: '12px 20px',
              borderRight: i < 2 ? '1px solid #f3f4f6' : 'none',
            }}>
              <div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', textTransform: 'capitalize' }}>{value}</div>
            </div>
          ) : <div key={i} />)}
        </div>
      )}

      {/* ── BODY ── */}
      <div style={{ padding: '20px 24px', background: '#fff', border: '1px solid #f3f4f6', borderTop: 'none' }}>

        {/* ── Panel Tabs ── */}
        {/* <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid #f3f4f6', paddingBottom: 12 }}>
          {([
            { key: 'report', label: 'Report', icon: <TbBrain size={13} /> },
            { key: 'diff', label: 'Changes', icon: <LuGitCompare size={13} />, disabled: !previousReport },
            { key: 'timeline', label: 'Timeline', icon: <LuBarChart2 size={13} />, disabled: reportHistory.length < 2 },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => !tab.disabled && setActivePanel(tab.key)}
              disabled={tab.disabled}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 12px', borderRadius: 7, cursor: tab.disabled ? 'not-allowed' : 'pointer',
                background: activePanel === tab.key ? '#008540' : 'transparent',
                color: activePanel === tab.key ? '#fff' : tab.disabled ? '#d1d5db' : '#6b7280',
                border: activePanel === tab.key ? 'none' : '1px solid #e5e7eb',
                fontSize: 12, fontWeight: 500, fontFamily: 'inherit',
                opacity: tab.disabled ? 0.5 : 1,
                transition: 'all 0.15s',
              }}
            >
              {tab.icon} {tab.label}
              {tab.key === 'diff' && !tab.disabled && (
                <span style={{ fontSize: 9, background: '#fef9c3', color: '#854d0e', borderRadius: 10, padding: '1px 5px', marginLeft: 2 }}>
                  NEW
                </span>
              )}
            </button>
          ))}
        </div> */}

        {/* ── DIFF PANEL ── */}
        {activePanel === 'diff' && previousReport && (
          <ReasoningDiff current={report} previous={previousReport} />
        )}

        {/* ── TIMELINE PANEL ── */}
        {activePanel === 'timeline' && reportHistory.length >= 2 && (
          <div style={{ paddingBottom: 8 }}>
            <RiskScoreTimeline history={reportHistory} />
          </div>
        )}

        {/* ── MAIN REPORT PANEL ── */}
        {activePanel === 'report' && (<>

        {/* Clinical Symptoms + Risk Factors chips */}
        {(clinicalSymptoms.length > 0 || riskFactorsList.length > 0) && (
          <Section icon={<LuActivity size={14} />} title="Presenting Symptoms & Risk Factors">
            <div style={{ marginBottom: clinicalSymptoms.length ? 8 : 0 }}>
              {clinicalSymptoms.map((s, i) => <Chip key={i} text={s} variant="warn" />)}
            </div>
            <div>
              {riskFactorsList.map((r, i) => <Chip key={i} text={r} variant="neutral" />)}
            </div>
          </Section>
        )}

        {/* Key Risk Factors — now with visual breakdown */}
        {keyRiskFactors.length > 0 && (
          <Section icon={<LuTriangleAlert size={14} />} title="Key Risk Factors">
            <RiskFactorBreakdown keyRiskFactors={keyRiskFactors} />
          </Section>
        )}

        {/* Primary Concerns */}
        {primaryConcerns.length > 0 && (
          <Section icon={<LuShieldAlert size={14} />} title="Primary Concerns">
            <BulletList items={primaryConcerns} variant="warn" />
          </Section>
        )}

        {/* Action Checklist — replaces the three separate bullet lists */}
        {(immediateActions.length > 0 || monitoring.length > 0 || recommendations.length > 0) && (
          <Section icon={<LuListChecks size={14} />} title="Action Checklist">
            <ActionChecklist
              immediateActions={immediateActions}
              monitoringRequirements={monitoring}
              recommendations={recommendations}
              riskLevel={riskLevel}
              patientName={patient?.name}
              onEscalate={onEscalate}
            />
          </Section>
        )}

        {/* Vital Signs */}
        {vitalSigns && (
          <Section icon={<LuHeartPulse size={14} />} title="Vital Signs Assessment">
            <ProseBlock text={vitalSigns} />
          </Section>
        )}

        {/* Lab Interpretation */}
        {labInterpretation && (
          <Section icon={<LuFlaskConical size={14} />} title="Laboratory Interpretation">
            <ProseBlock text={labInterpretation} />
          </Section>
        )}

        {/* Clinical Reasoning */}
        {clinicalReasoning && (
          <Section icon={<TbBrain size={14} />} title="Clinical Reasoning">
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '14px 16px' }}>
              <ProseBlock text={clinicalReasoning} />
            </div>
          </Section>
        )}

        {/* Historical Risk Factors */}
        {historicalFactors && (
          <Section icon={<LuHistory size={14} />} title="Historical Risk Factors">
            <ProseBlock text={historicalFactors} />
          </Section>
        )}

        {/* Gestational Considerations */}
        {gestationalNotes && (
          <Section icon={<LuStethoscope size={14} />} title="Gestational Considerations">
            <ProseBlock text={gestationalNotes} />
          </Section>
        )}

        </>)}

      </div>

      {/* ── FOOTER ── */}
      <div style={{
        padding: '10px 24px',
        borderRadius: '0 0 12px 12px',
        border: '1px solid #f3f4f6', borderTop: 'none',
        background: '#fafafa',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: 10, color: '#d1d5db', letterSpacing: '0.04em' }}>
          CONFIDENTIAL — AUTHORISED MEDICAL PERSONNEL ONLY
        </span>
        <span style={{ fontSize: 10, color: '#d1d5db' }}>AI-assisted · {new Date().getFullYear()}</span>
      </div>
    </div>
  );
};

export default SymptomReport;
