import React, { useMemo, useState } from "react";
import { IoIosWarning } from "react-icons/io";
import { MdBubbleChart } from "react-icons/md";
import { FaChartSimple } from "react-icons/fa6";
import type { PatientData, TabType } from '../types/patient';
import DiagnosisVerificationDialog, { type VerificationData } from '../components/DiagnosisVerificationDialog';
import VerificationStatusBar from '../components/VerificationStatusBar';
import { diagnosisVerificationService } from '../services/diagnosisVerificationService';
import { useClinicalVerification } from '../hooks/useClinicalVerification';

interface PredispositionProps {
  patient: PatientData;
  setActiveTab?: (tab: TabType) => void;
}



const Predisposition: React.FC<PredispositionProps> = ({ patient }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const parseDiagnosis = (raw: string | undefined): string => {
    if (!raw) return "No diagnosis records";

    const parsePostgresArray = (str: string) =>
      str
        .replace(/^{|}$/g, "")
        .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
        .map((item) => item.replace(/^"(.*)"$/, "$1").trim());

    const isNegativeResult = (s: string) =>
      /^no\b/i.test(s) ||
      /^not\b/i.test(s) ||
      /^none\b/i.test(s) ||
      /no specific conditions/i.test(s) ||
      /no condition/i.test(s) ||
      /not of any/i.test(s);

    const parsed = parsePostgresArray(raw);
    const cleaned = parsed
      .filter((x) => x && x !== "NULL")
      .map((entry) =>
        entry
          .replace(/Highly\s+/i, "")
          .replace(/Suspected to have\s+/i, "")
          .replace(/\.$/, "")
          .trim()
      );

    if (cleaned.length === 0) return "No diagnosis data found";
    if (isNegativeResult(cleaned[0])) return "No specific conditions detected";

    const positive = cleaned.filter((c) => !isNegativeResult(c));
    if (positive.length === 0) return "No specific conditions detected";

    return `Suspected to have ${positive.join(" & ")}`;
  };

  const checkPredisposition = (riskAssessment: any): string => {
    if (!riskAssessment) return "";

    try {
      let assessment = riskAssessment;
      if (typeof assessment === "string") {
        try {
          assessment = JSON.parse(assessment);
        } catch {
          assessment = assessment.replace(/[{}"]/g, "").split(/[,;]/);
        }
      }

      const list = Array.isArray(assessment) ? assessment : [assessment];
      const cleaned = list
        .map((item) =>
          item
            .toString()
            .replace(/predispositioned to\s*/i, "")
            .replace(/\.$/, "")
            .trim()
        )
        .filter((item) => item.length > 0 && !item.toLowerCase().includes("no disease"));

      if (cleaned.length === 0) return "no signs of predisposition";

      const formatted = cleaned.map((d) => d.charAt(0).toUpperCase() + d.slice(1));
      return `signs of predisposition to ${formatted.join(", ")}`;
    } catch (error) {
      console.error("Error parsing risk assessment:", error);
      return "undetermined predisposition status";
    }
  };

  const latestRisk = patient?.riskAssessment?.[patient.riskAssessment.length - 1];
  const latestLab = patient?.labwork?.[patient.labwork.length - 1];
  const latestExplanation = patient?.explanation?.[patient.explanation.length - 1];

  const diagnosisText = parseDiagnosis(latestLab?.diagnosis);
  const predispositionSummary = checkPredisposition(latestRisk?.riskassessment);
  const riskLevel = latestExplanation?.risklevel;
  const sourceId = latestLab?.id ?? null;

  const { latestVerification, loading, addVerification } = useClinicalVerification(
    patient?.id,
    'predisposition',
    sourceId,
  );


  const recordDate = useMemo(() => {
    const d = latestLab?.date ?? latestExplanation?.date;
    if (!d) return undefined;
    try {
      return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return undefined;
    }
  }, [latestLab?.date, latestExplanation?.date]);

  const verificationFindings = useMemo(() => [
    { label: 'Lab Diagnosis', value: diagnosisText, wide: true },
    { label: 'Predisposition', value: predispositionSummary || '—', wide: true },
    ...(latestExplanation?.risklevel
      ? [{ label: 'Risk Level', value: String(latestExplanation.risklevel).toUpperCase() }]
      : []),
    ...(latestLab?.gestationweek != null
      ? [{ label: 'Gestation', value: `${latestLab.gestationweek} weeks` }]
      : []),
  ], [diagnosisText, predispositionSummary, latestExplanation?.risklevel, latestLab?.gestationweek]);

  const handleVerificationSubmit = async (verificationData: VerificationData) => {
    const res = await diagnosisVerificationService.submit({
      patientId: verificationData.patientId,
      patientName: verificationData.patientName,
      diagnosisText: verificationData.diagnosisText,
      riskLevel: verificationData.riskLevel,
      isAccurate: verificationData.isAccurate,
      obgynNotes: verificationData.obgynNotes,
      sourceType: verificationData.sourceType,
      sourceId: sourceId ?? undefined,
    });
    if (res.data?.verification) addVerification(res.data.verification);
    return res.data?.verification;
  };

  const hasData = latestRisk?.riskassessment || latestLab?.diagnosis;

  return (
    <div className="w-full h-full p-3 flex flex-col">
      <div className="w-full flex flex-col gap-3">


        {!hasData ? (
          <div className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center">
            <p className="text-xs text-gray-500">No predisposition data available yet.</p>
            <p className="text-[10px] text-gray-400 mt-1">Complete lab work and risk assessment first.</p>
          </div>
        ) : (
          <>
            {/* Summary banner */}
            <div className="flex items-start gap-2.5 rounded-lg px-3 py-2.5">
              <IoIosWarning className="text-yellow-500 text-2xl mt-1 shrink-0" />
              <p className="text-xs text-gray-600 leading-relaxed font-medium">
                Patient exhibits{' '}
                <span className="font-semibold text-gray-900">{predispositionSummary}</span>
              </p>
            </div>

            {/* Findings cards */}
            <div className="grid grid-cols-1 gap-2">
              <div className="flex items-start gap-3 rounded-lg px-3 py-2.5">
                <div className="w-10 h-10 rounded-full bg-blue-200/50 flex items-center justify-center text-blue-500 text-xl shrink-0">
                  <FaChartSimple size={14} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">AI Lab Diagnosis</p>
                  <p className="text-xs text-gray-700 font-medium">{diagnosisText}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg px-3 py-2.5">
                <div className="w-10 h-10 rounded-full bg-orange-200/50 flex items-center justify-center text-orange-500 text-xl shrink-0">
                  <MdBubbleChart size={16} />
                </div>
                <div className="w-[95%] min-w-0 flex flex-col">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Risk Level</p>
                  <span className="text-xs text-gray-700 font-medium capitalize">
                    Patient Risk : {riskLevel || 'unavailable'}
                  </span>
                </div>
              </div>
            </div>

            {/* Verification status */}
            <VerificationStatusBar
              verification={latestVerification}
              loading={loading}
              onReview={() => setIsDialogOpen(true)}
              subjectLabel="diagnosis"
              compact
            />
          </>
        )}
      </div>

      <DiagnosisVerificationDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSubmit={handleVerificationSubmit}
        diagnosisText={diagnosisText}
        riskLevel={riskLevel}
        sourceType="predisposition"
        patientId={patient.id}
        patientName={patient.name}
        findings={verificationFindings}
        recordDate={recordDate}
        existingVerification={latestVerification}
      />
    </div>
  );
};

export default Predisposition;
