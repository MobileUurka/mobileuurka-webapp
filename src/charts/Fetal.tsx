import React, { useState } from 'react';
import type { PatientData } from '../types/patient';
import DropdownMenu from '../components/DropdownMenu';
import FetalGraph from './FetalGraph';

// Define the allowed graph types
type FetalOption = "fhr" | "femurHeight" | "headCircumference";

interface FetalProps {
  // Assuming fetalInfos is the specific property inside patient
  // If passing the whole patient object, keep it as PatientData
  patient: any; 
}

const Fetal: React.FC<FetalProps> = ({ patient }) => {
  const [selectedOption, setSelectedOption] = useState<FetalOption>("fhr");

  const dropdownData = [
    { value: "fhr", label: "FHR" },
    { value: "femurHeight", label: "Femur Height" },
    { value: "headCircumference", label: "Head Circumference" },
  ];

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