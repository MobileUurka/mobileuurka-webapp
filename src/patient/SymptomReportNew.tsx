import React, { useRef } from 'react';
import { IoArrowBackOutline } from 'react-icons/io5';
import { HiOutlineDownload } from 'react-icons/hi';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { PatientData } from '../types/patient';

interface SymptomReportProps {
  report: any;
  patient?: PatientData;
  onBack?: () => void;
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

const SymptomReportNew: React.FC<SymptomReportProps> = ({ report, patient, onBack }) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!report) return null;

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

      {/* Printable Report */}
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
            <p className="text-[13px] leading-relaxed" style={{ color: '#374151' }}>
              {keyRiskFactors.join(', ')}
            </p>
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
            <p className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: '#374151' }}>
              {clinicalReasoning}
            </p>
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="mb-4">
            <h3 className="text-[13px] font-bold mb-1.5" style={{ color: '#111827' }}>Recommendations</h3>
            <p className="text-[13px] leading-relaxed" style={{ color: '#374151' }}>
              {recommendations.join(', ')}
            </p>
          </div>
        )}

        {/* Monitoring Requirements */}
        {monitoring.length > 0 && (
          <div className="mb-4">
            <h3 className="text-[13px] font-bold mb-1.5" style={{ color: '#111827' }}>Monitoring Requirements</h3>
            <p className="text-[13px] leading-relaxed" style={{ color: '#374151' }}>
              {monitoring.join(', ')}
            </p>
          </div>
        )}

        {/* Vital Signs Assessment */}
        {vitalSigns && (
          <div className="mb-4">
            <h3 className="text-[13px] font-bold mb-1.5" style={{ color: '#111827' }}>Vital Signs Assessment</h3>
            <p className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: '#374151' }}>
              {vitalSigns}
            </p>
          </div>
        )}

        {/* Laboratory Interpretation */}
        {labInterpretation && (
          <div className="mb-4">
            <h3 className="text-[13px] font-bold mb-1.5" style={{ color: '#111827' }}>Laboratory Interpretation</h3>
            <p className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: '#374151' }}>
              {labInterpretation}
            </p>
          </div>
        )}

        {/* Historical Risk Factors */}
        {historicalFactors && (
          <div className="mb-4">
            <h3 className="text-[13px] font-bold mb-1.5" style={{ color: '#111827' }}>Historical Risk Factors</h3>
            <p className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: '#374151' }}>
              {historicalFactors}
            </p>
          </div>
        )}

        {/* Immediate Actions */}
        {immediateActions.length > 0 && (
          <div className="mb-4">
            <h3 className="text-[13px] font-bold mb-1.5" style={{ color: '#111827' }}>Immediate Actions</h3>
            <p className="text-[13px] leading-relaxed" style={{ color: '#374151' }}>
              {immediateActions.join(', ')}
            </p>
          </div>
        )}

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
