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
    <div className="w-full h-full flex flex-col overflow-y-auto pb-5 scrollbar-hide">
      
      {/* Grid 3: Weight, Fetal, Predisposition */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-[32.5%_32.5%_32.5%] gap-[0.75%]">
        <div className="w-full aspect-square bg-[#F6F6F6] rounded-[10px] flex relative overflow-visible">
          <Weight patient={patient.triage} />
        </div>
        <div className="w-full aspect-square bg-[#F6F6F6] rounded-[10px] flex relative overflow-visible">
          <Fetal patient={patient?.fetalInfo} />
        </div>
        <div className="w-full aspect-square bg-[#F6F6F6] rounded-[10px] flex relative overflow-visible">
          <Predisposition patient={patient} setActiveTab={setActiveTab} />
        </div>
      </div>

      {/* Grid 2: Risk Assessment & Lab */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-[66.375%_32.375%] gap-[0.75%] my-[10px]">
        <div className="w-full h-auto lg:aspect-[1/0.49] bg-[#F6F6F6] rounded-[10px] flex mt-3 lg:mt-0">
          <Riskassessment patient={patient} />
        </div>
        <div className="w-full aspect-square bg-[#F6F6F6] rounded-[10px] flex relative ">
          <Lab patient={patient} />
        </div>
      </div>

      {/* Grid 2 Reverse: Medications & (Blood Pressure + Symptoms) */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-[32.5%_32.5%_32.5%] gap-[0.75%] mb-[30px]">
        <div className="w-full aspect-square bg-[#F6F6F6] rounded-[10px] flex relative">
          <Medications patient={patient} setActiveTab={setActiveTab} />
        </div>
        
        {/* Right side of Reverse Grid (x2 height/width container) */}
        {/* <div className="w-full aspect-[1/0.49] bg-[#F6F6F6] rounded-[10px] flex">
          <div className="w-full px-[15px] grid grid-cols-[54%_44%] gap-[2%] m-auto">
            <div className="w-full m-auto bg-[#EDEDED] rounded-[5px] aspect-[1/0.85]">
              <BloodPressure patient={patient?.triages} />
            </div>
            <div className="w-full m-auto bg-[#EDEDED] rounded-[5px] aspect-[1/1.05]">
              <Symptom patient={patient} setActiveTab={setActiveTab} />
            </div>
          </div>
        </div> */}

        <div className="w-full aspect-square m-auto bg-[#F6F6F6]  rounded-[10px]">
              <BloodPressure patient={patient} />
            </div>
            <div className="w-full m-auto bg-[#F6F6F6]  rounded-[10px] aspect-square">
              <Symptom patient={patient} setActiveTab={setActiveTab} />
            </div>
      </div>

      {/* Global tooltip container for overview charts */}
      <Tooltip
        id="overview-tooltip"
        style={{ fontSize: ".8em", zIndex: 99999 }}
      />
    </div>
  );
};

export default Overview;