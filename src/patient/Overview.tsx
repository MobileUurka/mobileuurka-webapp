import React from "react";
import { type PatientData, type TabType } from "../types/patient";
import { Tooltip } from "react-tooltip";

// Components
import Predisposition from "../charts/Predisposition";
import Symptom from "../charts/Symptom";
import Lab from "../charts/Lab";
import Medications from "../charts/Medications";
import Fetal from "../charts/Fetal";
import Riskassessment from "../components/Riskassessment";
import Weight from "../charts/Weights";
import BloodPressure from "../charts/BloodPressure";

interface OverviewProps {
  patient: PatientData;
  setActiveTab: (tab: TabType) => void;
}

const Overview: React.FC<OverviewProps> = ({ patient, setActiveTab }) => {
  return (
    <div className="w-full h-full flex flex-col overflow-y-auto pb-10 px-2 sm:px-4 lg:px-0 scrollbar-hide overscroll-contain">

      {/* ================= GRID 1 ================= */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Increased mobile height for Weight Chart */}
        <div className="w-full min-w-0 bg-[#F6F6F6] rounded-[10px] p-4 h-auto min-h-[340px] lg:min-h-0">
          <Weight patient={patient.triage} />
        </div>

        {/* Increased mobile height for Blood Pressure Chart */}
        <div className="w-full min-w-0 bg-[#F6F6F6] rounded-[10px] p-4 h-auto min-h-[340px] lg:min-h-0">
          <BloodPressure patient={patient} />
        </div>

        {/* Kept descriptive card slightly shorter than charts */}
        <div className="w-full min-w-0 bg-[#F6F6F6] rounded-[10px] p-4 h-auto min-h-[240px] lg:min-h-0">
          <Predisposition patient={patient} setActiveTab={setActiveTab} />
        </div>

      </div>

      {/* ================= GRID 2 ================= */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">

        {/* Increased mobile height for Risk Assessment Donut Chart layout */}
        <div className="lg:col-span-2 w-full min-w-0 bg-[#F6F6F6] rounded-[10px] p-4 h-auto min-h-[420px] lg:h-[380px]">
          <Riskassessment patient={patient} />
        </div>

        {/* Increased mobile height for Lab Results Chart */}
        <div className="w-full min-w-0 bg-[#F6F6F6] rounded-[10px] p-4 h-auto min-h-[360px] lg:h-[380px]">
          <Lab patient={patient} />
        </div>

      </div>

      {/* ================= GRID 3 ================= */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4 mb-6">

        <div className="w-full min-w-0 bg-[#F6F6F6] rounded-[10px] p-4 h-auto min-h-[240px] lg:h-[320px]">
          <Medications patient={patient} setActiveTab={setActiveTab} />
        </div>

        {/* Increased mobile height for Fetal Chart info if it renders a canvas */}
        <div className="w-full min-w-0 bg-[#F6F6F6] rounded-[10px] p-4 h-auto min-h-[300px] lg:h-[320px]">
          <Fetal patient={patient?.fetalInfo} />
        </div>

        <div className="w-full min-w-0 bg-[#F6F6F6] rounded-[10px] p-4 h-auto min-h-[240px] lg:h-[320px]">
          <Symptom patient={patient} setActiveTab={setActiveTab} />
        </div>

      </div>

      {/* TOOLTIP */}
      <Tooltip
        id="overview-tooltip"
        style={{ fontSize: ".8em", zIndex: 99999 }}
      />
    </div>
  );
};

export default Overview;