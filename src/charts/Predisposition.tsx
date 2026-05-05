import React from "react";
import { IoIosWarning } from "react-icons/io";
import { MdBubbleChart } from "react-icons/md";
import { FaChartSimple } from "react-icons/fa6";
import type { PatientData, TabType } from '../types/patient';

interface PredispositionProps {
  patient: PatientData;
  setActiveTab: (tab: TabType) => void;
}

const Predisposition: React.FC<PredispositionProps> = ({ patient, setActiveTab }) => {
  
  // 1. Diagnosis Parsing Logic
  const parseDiagnosis = (raw: string | undefined): string => {
    if (!raw) return "No diagnosis records";

    const parsePostgresArray = (str: string) => {
      return str
        .replace(/^{|}$/g, "") 
        .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/) 
        .map((item) => item.replace(/^"(.*)"$/, "$1").trim());
    };

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
    if (/^no specific conditions detected/i.test(cleaned[0])) return cleaned[0];

    return `Suspected to have ${cleaned.join(" & ")}`;
  };

  // 2. Risk Assessment Logic
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

  const latestRisk = patient?.riskAssessment  ?.[patient.riskAssessment.length - 1];
  const latestLab = patient?.labwork?.[patient.labwork.length - 1];
  const latestExplanation = patient?.explanation?.[patient.explanation.length - 1];

  return (
    <div className="w-full h-full p-4 flex flex-col justify-center items-center">
      <div className="w-full max-w-md flex flex-col gap-4">
        
        {/* Warning Banner */}
        <div className="flex items-start gap-3">
          <div className=" text-yellow-500 text-2xl mt-1 shrink-0">
            <IoIosWarning />
          </div>
          <p className="text-xs text-gray-600 leading-relaxed font-medium">
            {!latestRisk?.riskassessment 
              ? "No risk assessment records available" 
              : "Patient exhibits "}
            <span className="text-gray-900 font-semibold">
              {checkPredisposition(latestRisk?.riskassessment)}
            </span>
          </p>
        </div>

        {/* Results Grid */}
        <div className="flex flex-col gap-4 py-4 border-y border-gray-100">
          
          {/* Diagnosis Row */}
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-200/50 flex items-center justify-center text-blue-500 text-xl">
              <FaChartSimple />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Diagnosis</span>
              <span className="text-xs text-gray-700 font-medium">
                {parseDiagnosis(latestLab?.diagnosis)}
              </span>
            </div>
          </div>

          {/* Risk Level Row */}
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-orange-200/50 flex items-center justify-center text-orange-500 text-xl">
              <MdBubbleChart />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Risk Level</span>
              <span className="text-xs text-gray-700 font-medium capitalize">
                Patient risk: {latestExplanation?.risklevel || "unavailable"}
              </span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button 
          onClick={() => setActiveTab("documents")}
          className="cursor-pointer w-full py-3 bg-[#ffc187] text-white rounded-xl font-semibold text-xs  transition-colors active:scale-95 duration-200"
        >
          View Documents
        </button>
      </div>
    </div>
  );
};

export default Predisposition;