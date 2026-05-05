import React, { useRef, useState, useCallback } from 'react';
import { IoArrowBackOutline } from 'react-icons/io5';
import { HiOutlineDownload } from 'react-icons/hi';
import { LuActivity, LuListChecks, LuCircleCheck, LuCircle } from 'react-icons/lu';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
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

const RISK_COLORS: Record<string, string> = {
  CRITICAL: '#dc2626',
  HIGH: '#ea580c',
  MODERATE: '#ca8a04',
  LOW: '#16a34a',
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
// The AI returns one long string with "Title: content; NextTitle: content" pattern.
// Split it into labelled sections for readable display.
interface ReasoningSection { title: string; body: string }

function parseClinicalReasoning(raw: string): ReasoningSection[] {
  if (!raw) return [];

  const HEADERS = [
    'Overview', 'Maternal Assessment', 'Fetal Assessment',
    'Risk Factor Synthesis', 'Differential Considerations',
    'Management Rationale', 'Monitoring & Escalation Plan',
    'Kenya-Specific Adaptations',
  ];

  // Find all header positions in the string
  const found: { title: string; start: number; contentStart: number }[] = [];
  for (const h of HEADERS) {
    let searchFrom = 0;
    while (true) {
      const idx = raw.indexOf(`${h}:`, searchFrom);
      if (idx === -1) break;
      found.push({ title: h, start: idx, contentStart: idx + h.length + 1 });
      searchFrom = idx + 1;
    }
  }

  if (found.length === 0) {
    // No headers found — split on semicolons as sentences
    const sentences = raw.split(/;\s+/).map(s => s.trim()).filter(Boolean);
    return [{ title: '', body: sentences.join('\n') }];
  }

  // Sort by position
  found.sort((a, b) => a.start - b.start);

  // Extract each section's body = text from contentStart to next header's start
  const sections: ReasoningSection[] = found.map((h, i) => {
    const end = i + 1 < found.length ? found[i + 1].start : raw.length;
    const body = raw.slice(h.contentStart, end).trim().replace(/;?\s*$/, '').trim();
    return { title: h.title, body };
  });

  return sections.filter(s => s.body.length > 0);
}

// Split a section body into individual bullet points.
// Splits on ALL semicolons — the AI uses them as statement separators within sections.
// Also splits on ". " before a capital letter for full-stop separated sentences.
function splitIntoSentences(body: string): string[] {
  return body
    .split(/;\s*|\.\s+(?=[A-Z])/)
    .map(s => s.trim().replace(/[;.]$/, '').trim())
    .filter(s => s.length > 8)
    .map(s => s.charAt(0).toUpperCase() + s.slice(1));
}

// Render parsed clinical reasoning sections
const ClinicalReasoningBlock: React.FC<{ text: string }> = ({ text }) => {
  const sections = parseClinicalReasoning(text);
  if (sections.length === 0) return null;

  const BulletList = ({ sentences }: { sentences: string[] }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {sentences.map((s, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span style={{ color: '#9ca3af', flexShrink: 0, marginTop: 6, fontSize: 5 }}>●</span>
          <span style={{ fontSize: 12, color: '#374151', lineHeight: 1.7 }}>{s}</span>
        </div>
      ))}
    </div>
  );

  // Single section with no title
  if (sections.length === 1 && !sections[0].title) {
    return <BulletList sentences={splitIntoSentences(sections[0].body)} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {sections.map((s, i) => {
        const sentences = splitIntoSentences(s.body);
        return (
          <div key={i}>
            {/* Title in sentence case, dark, readable */}
            <div style={{ fontSize: 12, fontWeight: 700, color: '#111827', marginBottom: 7 }}>
              {s.title}
            </div>
            {sentences.length > 0
              ? <BulletList sentences={sentences} />
              : <span style={{ fontSize: 12, color: '#374151', lineHeight: 1.7 }}>{s.body}</span>
            }
          </div>
        );
      })}
    </div>
  );
};

const SymptomReportNew: React.FC<SymptomReportProps> = ({ report, patient, onBack, reportHistory = [], onEscalate }) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [activePanel, setActivePanel] = useState<'report' | 'diff' | 'timeline' | 'monitoring' | 'recommendations'>('report');
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const toggle = useCallback((key: string) => setChecked(p => ({ ...p, [key]: !p[key] })), []);

  if (!report) return null;

  const previousReport = reportHistory.length > 1 ? reportHistory[1] : null;

  const medical = report?.medicalReasoning ?? report?.medical_reasoning ?? {};
  const riskLevel = (report?.riskLevel ?? report?.risk_level ?? 'UNKNOWN').toUpperCase();
  const riskScore = parseFloat(report?.riskScore ?? report?.risk_score ?? 0);
  const riskColor = RISK_COLORS[riskLevel] || RISK_COLORS.MODERATE;

  const keyRiskFactors = parseList(medical?.key_risk_factors ?? report?.keyRiskFactors);
  const primaryConcerns = parseList(medical?.primary_concerns ?? report?.primaryConcerns);
  const recommendations = parseList(report?.recommendations ?? medical?.recommendations);
  const monitoring = parseList(medical?.monitoring_requirements ?? report?.monitoringRequirements);
  const immediateActions = parseList(medical?.immediate_actions ?? report?.immediateActions);
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
      // Generate filename: "AI Analysis - PatientName - Date"
      const patientName = patient?.name?.replace(/\s+/g, ' ').trim() || 'Patient';
      const dateStr = formatDate(report?.createdAt ?? report?.updatedAt, 'short').replace(/\//g, '-');
      const filename = `AI Analysis - ${patientName} - ${dateStr}.pdf`;

      // Capture the element as canvas
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      // Calculate PDF dimensions (A4 size)
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(filename);
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  return (
    <>
      {/* Screen-only controls */}
      <div className="print:hidden mb-3 flex items-center gap-2">
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
      </div>

      {/* Panel tabs — screen only */}
      <div className="print:hidden flex gap-2 mb-4 flex-wrap">
        {(
          [
            { key: 'report' as const,           label: 'Report',          icon: null as React.ReactNode,                                    disabled: false },
            { key: 'monitoring' as const,        label: 'Monitoring',      icon: <LuListChecks size={12} /> as React.ReactNode,              disabled: monitoring.length === 0 },
            { key: 'recommendations' as const,   label: 'Recommendations', icon: <LuCircleCheck size={12} /> as React.ReactNode,             disabled: recommendations.length === 0 },
            // Changes tab hidden for now — will be re-enabled later
            // { key: 'diff' as const,           label: 'Changes',         icon: <LuGitCompare size={12} /> as React.ReactNode,              disabled: !previousReport },
            { key: 'timeline' as const,          label: 'Timeline',        icon: <LuActivity size={12} /> as React.ReactNode,                disabled: reportHistory.length < 2 },
          ]
        ).map(tab => (
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

      {/* Monitoring panel — screen only */}
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
                    opacity: done ? 0.5 : 1,
                    transition: 'opacity 0.15s',
                  }}
                >
                  <span style={{ color: done ? '#16a34a' : '#d1d5db', flexShrink: 0, marginTop: 1 }}>
                    {done
                      ? <LuCircleCheck size={16} />
                      : <LuCircle size={16} />
                    }
                  </span>
                  <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.5, textDecoration: done ? 'line-through' : 'none' }}>
                    {item}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recommendations panel — screen only */}
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
                    opacity: done ? 0.5 : 1,
                    transition: 'opacity 0.15s',
                  }}
                >
                  <span style={{ color: done ? '#16a34a' : '#d1d5db', flexShrink: 0, marginTop: 1 }}>
                    {done
                      ? <LuCircleCheck size={16} />
                      : <LuCircle size={16} />
                    }
                  </span>
                  <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.5, textDecoration: done ? 'line-through' : 'none' }}>
                    {item}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Diff panel — screen only */}
      {activePanel === 'diff' && previousReport && (
        <div className="print:hidden mb-4 p-4 rounded-lg border border-gray-200 bg-white">
          <ReasoningDiff current={report} previous={previousReport} />
        </div>
      )}

      {/* Timeline panel — screen only */}
      {activePanel === 'timeline' && reportHistory.length >= 2 && (
        <div className="print:hidden mb-4 p-4 rounded-lg border border-gray-200 bg-white">
          <RiskScoreTimeline history={reportHistory} />
        </div>
      )}

      {/* Action checklist — screen only, shown in report panel. Only immediate actions here;
          monitoring and recommendations have their own dedicated tabs. */}
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

      {/* Printable Report — only shown on the Report tab */}
      {activePanel === 'report' && (
      <div
        ref={printRef}
        className="mt-5 w-full max-w-[210mm] p-8 print:p-0 rounded-lg"
        style={{ 
          fontSize: '13px',
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          color: '#000000'
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-2">
            <img src="/images/logo.png" alt="Mobileuurka" className="w-12 h-12" />
            <div>
              <h1 className="text-base font-bold" style={{ color: '#111827' }}>Mobileuurka</h1>
              <p className="text-[13px]" style={{ color: '#4b5563' }}>Healthcare Services</p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-sm font-bold" style={{ color: '#111827' }}>AI Analysis</h2>
            <p className="text-[13px]" style={{ color: '#4b5563' }}>Date: {generatedDate}</p>
          </div>
        </div>

        {/* Patient Information */}
        <div className="mb-5">
          <h3 className="text-sm font-bold mb-3" style={{ color: '#111827' }}>Patient Information</h3>
          
          <div className="grid grid-cols-3 gap-x-6 gap-y-2.5">
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
              <p className="font-bold " style={{ color: riskColor }}>{riskLevel}</p>
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
            <RiskFactorBreakdown keyRiskFactors={keyRiskFactors} compact />
          </div>
        )}

        {/* Primary Concerns */}
        {primaryConcerns.length > 0 && (
          <div className="mb-4">
            <h3 className="text-[13px] font-bold mb-1.5" style={{ color: '#111827' }}>Primary Concerns</h3>
            <p className="text-[13px] leading-relaxed" style={{ color: '#374151' }}>
              {primaryConcerns.join(', ')}
            </p>
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

        {/* Immediate Actions — shown in ActionChecklist above the report, not repeated here */}

        {/* Follow Up Timing */}
        {followUpTiming && (
          <div className="mb-4">
            <h3 className="text-[13px] font-bold mb-1.5" style={{ color: '#111827' }}>Follow Up Timing</h3>
            <p className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: '#374151' }}>
              {followUpTiming}
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
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false,
            }).replace(/:/g, '')}
          </p>
        </div>
      </div>
      )}

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #root, #root * {
            visibility: hidden;
          }
          ${printRef.current ? `
            .print\\:block {
              display: block !important;
            }
            .print\\:hidden {
              display: none !important;
            }
          ` : ''}
        }
        @page {
          size: A4;
          margin: 20mm;
        }
      `}</style>
    </>
  );
};

export default SymptomReportNew;
