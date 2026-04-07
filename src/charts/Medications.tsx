import React from "react";
import { TbPillFilled } from "react-icons/tb";
import { FaInfo } from "react-icons/fa6";
import { IoFlagSharp } from "react-icons/io5";
import { Tooltip } from "react-tooltip";
import type { PatientData, TabType } from '../types/patient';

interface OverviewProps {
  patient: PatientData;
  setActiveTab: (tab: TabType) => void;
}

const Medications: React.FC<OverviewProps> = ({ patient, setActiveTab }) => {
  const colors = {
    green: {
      color: "#008540",
      bg: "bg-[#85C69A]/20",
    },
    red: {
      color: "#E31C23",
      bg: "bg-[#FF494F]/10",
    },
  };

  const allMedications = patient?.medications || [];
  const allergies = patient?.allergies || [];

  // Filter for active medications (stopDate is in future or today)
  const currentDate = new Date().toISOString().split("T")[0];
  const activeMedications = allMedications.filter((med) => med.stopDate >= currentDate);

  return (
    <div className="w-[88%] h-[92%] mx-auto flex flex-col">
      {/* Title Block */}
      <div className="w-full h-[45px] my-5 lg:my-[15px] flex flex-row justify-between items-center">
        <h3 className="text-base font-bold text-gray-800">Medication</h3>
      </div>

      <div className="w-full h-[calc(100%-45px)] relative">
        <div className="w-full lg:w-full h-[80%] flex flex-col gap-2">
          {activeMedications.length > 0 ? (
            activeMedications.slice(0, 3).map((med, index) => {
              const isAllergic = allergies.some(
                (a) => a.allergies.toLowerCase() === med.medicine.toLowerCase()
              );

              return (
                <div
                  key={index}
                  className="flex w-full flex-row gap-2.5 p-2.5 lg:p-2 items-center bg-white rounded-md relative"
                >
                  {/* Pill Icon */}
                  <div
                    className={`w-10 lg:w-[27px] aspect-square flex justify-center items-center rounded-[4px] text-lg lg:text-[0.7em]
                      ${isAllergic ? colors.red.bg : colors.green.bg}`}
                    style={{ color: isAllergic ? colors.red.color : colors.green.color }}
                  >
                    <TbPillFilled />
                  </div>

                  {/* Details */}
                  <div className="flex flex-col ml-1 text-[0.9em] lg:text-[0.8em] font-bold">
                    <div className="text-gray-800">{med.medicine}</div>
                    <div className="font-normal text-[0.8em] text-black/60">{med.dosage}</div>
                  </div>

                  {/* Right Action (Flag or Info) */}
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 cursor-pointer">
                    {isAllergic ? (
                      <>
                        <IoFlagSharp
                          color={colors.red.color}
                          data-tooltip-id={`allergy-${index}`}
                          data-tooltip-content="Patient has an allergic reaction to medication"
                          className="text-base lg:text-sm"
                        />
                        <Tooltip
                          id={`allergy-${index}`}
                          style={{ fontSize: "12px", zIndex: 99999, backgroundColor: colors.red.color }}
                        />
                      </>
                    ) : (
                      <>
                        <div
                          data-tooltip-id={`info-${index}`}
                          data-tooltip-content={med.medicationPurpose}
                          className="w-[15px] lg:w-[11px] aspect-square rounded-full border border-gray-400 flex justify-center items-center text-[8px] text-gray-500"
                        >
                          <FaInfo />
                        </div>
                        <Tooltip
                          id={`info-${index}`}
                          style={{ fontSize: "12px", zIndex: 99999 }}
                        />
                      </>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            /* No Medications State */
            <div className="flex w-full flex-row gap-2.5 p-2.5 items-center bg-white rounded-md shadow-sm">
              <div className={`w-10 aspect-square flex justify-center items-center rounded-[4px] text-lg ${colors.green.bg}`} style={{ color: colors.green.color }}>
                <TbPillFilled />
              </div>
              <div className="flex flex-col ml-1 text-[0.9em] font-bold">
                <div className="text-gray-800">No medications</div>
                <div className="font-normal text-[0.8em] text-black/60">Available</div>
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div
          onClick={() => setActiveTab("medication" as TabType)}
          className="w-full absolute bottom-[15px] h-[50px] lg:h-[40px] bg-[#FFC187] rounded-md text-white flex justify-center items-center cursor-pointer text-[0.9em] lg:text-[0.8em] hover:bg-[#ffb36b] transition-colors"
        >
          View Medications
        </div>
      </div>
    </div>
  );
};

export default Medications;