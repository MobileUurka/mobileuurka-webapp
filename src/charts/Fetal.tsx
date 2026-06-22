import React, { useState } from 'react';
import DropdownMenu from '../components/DropdownMenu';
import FetalGraph from './FetalGraph';
import OverviewEmptyState from '../components/OverviewEmptyState';
import { hasFetalData } from '../utils/overviewData';

// Define the allowed graph types
type FetalOption = "fhr" | "femurHeight" | "headCircumference";

interface FetalProps {
  patient?: any[];
  patientId: string;
  patientName: string;
}

const Fetal: React.FC<FetalProps> = ({ patient, patientId, patientName }) => {
  const [selectedOption, setSelectedOption] = useState<FetalOption>("fhr");

  const dropdownData = [
    { value: "fhr", label: "FHR" },
    { value: "femurHeight", label: "Femur Height" },
    { value: "headCircumference", label: "Head Circumference" },
  ];

  if (!hasFetalData(patient)) {
    return (
      <OverviewEmptyState
        title="No fetal data"
        description="FHR, femur length, and head circumference can be recorded in screening."
        screeningTab="Fetal"
        patientId={patientId}
        patientName={patientName}
      />
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* Title & Dropdown Container */}
      <div className="flex flex-row justify-between items-center w-[90%] mx-auto my-5">
        <span className="font-bold text-sm text-gray-700 tracking-wide">
          Fetal
        </span>
        <div className="z-20">
          <DropdownMenu
            data={dropdownData}
            selected={selectedOption}
            length="150px"
            // Cast the value to FetalOption to satisfy TypeScript
            onChange={(value) => setSelectedOption(value as FetalOption)}
          />
        </div>
      </div>

      {/* Graph Container */}
      <div className=" w-[90%] h-[75%] mx-auto overflow-visible">
        <FetalGraph selectedOption={selectedOption} patient={patient} />
      </div>
    </div>
  );
};

export default Fetal;