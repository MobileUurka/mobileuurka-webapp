import React, { useEffect, useRef, useState } from "react";
import { FaAngleUp } from "react-icons/fa";
import { IoIosWarning } from "react-icons/io";
import DropdownMenu from "../components/DropdownMenu";
import LabChart from "./LabChart";
import type { PatientData } from '../types/patient';

interface OverviewProps {
  patient: PatientData;
}

const monitoredKeys = [
  "haemoglobin",
  "platelets",
  "creatinine",
  "bun",
  "ast",
  "alt",
  "tsh",
  "glutamyl",
  "wbc",
];

const Lab: React.FC<OverviewProps> = ({ patient }) => {
  const [active, setActive] = useState(false);
  const [typedText, setTypedText] = useState("");
  const [selectedOption, setSelectedOption] = useState("");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Access the latest lab entry from the labwork array
  const latestLabData = patient?.labwork?.[patient.labwork.length - 1] || {};

  // Extract keys that exist in the latest entry and are in our monitored list
  const intKeys = Object.entries(latestLabData)
    .filter(([key, value]) => typeof value === "number" && monitoredKeys.includes(key))
    .map(([key]) => key);

  // Set default selection to platelets if available
  useEffect(() => {
    if (intKeys.includes("platelets") && !selectedOption) {
      setSelectedOption("platelets");
    } else if (intKeys.length > 0 && !selectedOption) {
      setSelectedOption(intKeys[0]);
    }
  }, [intKeys, selectedOption]);

  // Typing effect logic
  useEffect(() => {
    const fullText =
      "Findings suggest early preeclampsia, with proteinuria, elevated liver enzymes, and mild thrombocytopenia indicating renal and hepatic involvement. Elevated LDH may signal early HELLP syndrome";

    if (active) {
      setTypedText("");
      let index = 0;

      const type = () => {
        setTypedText((prev) => {
          const char = fullText.charAt(index);
          index++;
          if (index < fullText.length) {
            timeoutRef.current = setTimeout(type, 20);
          }
          return prev + char;
        });
      };

      timeoutRef.current = setTimeout(type, 10);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [active]);

  return (
    <div className="mx-auto w-full h-full flex flex-col p-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-sm text-gray-700">Lab Results</h3>
        <div className="z-10">
          <DropdownMenu
            data={intKeys}
            selected={selectedOption}
            length={"140px"}
            onChange={(value: string) => setSelectedOption(value)}
          />
        </div>
      </div>

      <div className="grow flex flex-col relative overflow-hidden">
        {/* Graph Container */}
        <div className="grow w-full py-4 px-1">
          <LabChart patient={patient} selectedOption={selectedOption} />
        </div>

        {/* AI Analysis Drawer */}
        <div
          className={`absolute bottom-0 left-0 w-full bg-white border-0 p-4 rounded-xl transition-all duration-300`}
        >
          {/* HEADER — always visible */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {active ? (
                <IoIosWarning className="text-amber-500 text-xl animate-pulse" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-green-500" />
              )}

              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                AI Analysis
              </p>
            </div>

            {/* Toggle Arrow */}
            <div
              className={`cursor-pointer hover:bg-gray-200 rounded-full transition-transform duration-300 ${active ? "rotate-180" : "rotate-0"
                }`}
              onClick={() => setActive((prev) => !prev)}
            >
              <FaAngleUp className="text-gray-400" />
            </div>
          </div>

          {/* EXPANDABLE CONTENT */}
          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${active ? "max-h-40 mt-3 opacity-100" : "max-h-0 opacity-0"
              }`}
          >
            <p className="text-xs text-gray-700 leading-relaxed">
              {typedText}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Lab;