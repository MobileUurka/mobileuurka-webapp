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
    <div className="w-full h-full flex flex-col min-w-0 overflow-hidden">

      {/* HEADER */}
      <div className="flex justify-between items-center px-2 pb-2">
        <h3 className="font-bold text-sm text-gray-700">Triage</h3>

        <div className="z-10">
          <DropdownMenu
            data={[
              "systolic",
              "diastolic",
              "temperature",
              "bmi",
              "heartRate",
            ]}
            selected={selectedOption}
            length={"110px"}
            onChange={(value: string) => setSelectedOption(value)}
          />
        </div>
      </div>

      {/* CHART AREA */}
      <div className="flex-1 min-h-0 w-full rounded-xl p-2 lg:p-3 overflow-hidden">
        <BloodPressureChart
          patient={patient}
          selectedOption={selectedOption}
        />
      </div>

    </div>
  );
};

export default BloodPressure;