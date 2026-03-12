import React, { useState } from "react";
import DropdownMenu from "../components/DropdownMenu";
import BloodPressureChart from "./BloodPressureChart";
import type { PatientData } from "../types/patient";

interface OverviewProps {
  patient: PatientData;
}

const BloodPressure: React.FC<OverviewProps> = ({ patient }) => {
  const [selectedOption, setSelectedOption] = useState<string>("systolic");

  return (
    <div className="w-[95%] h-full flex flex-col p-4">
      <div className="flex justify-between items-center mb-2 px-2">
        <h3 className="font-bold text-sm text-gray-700">Triage</h3>
        <div className="z-10">
          <DropdownMenu
            data={["systolic", "diastolic", "temperature", "bmi", "heartRate"]}
            selected={selectedOption}
            length={"110px"}
            onChange={(value: string) => setSelectedOption(value)}
          />
        </div>
      </div>
      
      <div className="grow rounded-xl p-4 min-h-0">
        <BloodPressureChart patient={patient} selectedOption={selectedOption} />
      </div>
    </div>
  );
};

export default BloodPressure;