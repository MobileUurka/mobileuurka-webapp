import React, { useEffect, useState } from "react";
import Piechart from "../charts/Piechart";
import { FaAngleLeft, FaAngleRight } from "react-icons/fa6";
import type { PatientData } from "../types/patient";

interface RiskAssessmentProps {
  patient: PatientData;
}

interface DateDisplay {
  day: number;
  month: string;
}

const Riskassessment: React.FC<RiskAssessmentProps> = ({ patient }) => {
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [dateRange, setDateRange] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  useEffect(() => {
    if (patient) {
      const explanationDates = patient?.explanation?.map((exp: any) => exp.date.split("T")[0]) || [];
      const visitDates = patient?.visits?.map((visit: any) => visit.date.split("T")[0]) || [];
      const lastVisit = patient?.visits?.[patient?.visits?.length - 1];
      const nextVisitDate = lastVisit?.nextVisit;

      const combined = [...explanationDates, ...visitDates];
      if (nextVisitDate) combined.push(nextVisitDate);

      const allDates = [...new Set(combined)].sort(
        (a, b) => new Date(a).getTime() - new Date(b).getTime()
      );

      setDateRange(allDates);

      if (allDates.length > 0) {
        const defaultIndex = allDates.length > 1 ? allDates.length - 2 : 0;
        setSelectedDate(allDates[defaultIndex]);
        setCurrentIndex(Math.max(0, defaultIndex - 2));
      }
    }
  }, [patient]);

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const handleNext = () => {
    if (currentIndex + 5 < dateRange.length) setCurrentIndex(currentIndex + 1);
  };

  const formatDate = (dateStr: string): DateDisplay | null => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return {
      day: date.getDate(),
      month: date.toLocaleString("default", { month: "short" }),
    };
  };

  const visibleDates = dateRange.slice(currentIndex, currentIndex + 5);


  return (
    <div className="w-full p-4">
      <div className="m-0 mb-2">
        <span className="font-bold text-sm text-gray-700">Risk Assessment Overview</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[42%_58%] w-full h-[calc(100%-45px)]">
        {/* Left Side: The Pie Chart */}
        <div className="w-full h-full flex justify-center items-center">
          <Piechart patient={patient} selectedDate={selectedDate} />
        </div>

        {/* Right Side: Date Picker & Analysis Text */}
        <div className="w-full my-auto flex flex-col gap-5 ml-[10px]">
          {/* Top Date Selection */}
          <div className="h-[30%] flex flex-row gap-5 lg:gap-[10px] items-center">
            <div
              className={`cursor-pointer ${currentIndex === 0 ? "cursor-not-allowed opacity-50" : ""}`}
              onClick={handlePrev}
            >
              <FaAngleLeft />
            </div>

            {visibleDates.map((date, index) => {
              const formatted = formatDate(date);
              const isFutureVisit = patient?.visits?.[patient?.visits?.length - 1]?.nextVisit === date;
              const isActive = selectedDate === date;

              return (
                <div
                  key={index}
                  onClick={() => setSelectedDate(date)}
                  className={`h-[90%] w-[50px] rounded-[30px] lg:rounded-[20px] pb-2 lg:h-full cursor-pointer transition-colors
                    ${isActive 
                      ? "bg-[rgba(133,198,154,0.16)]" 
                      : isFutureVisit 
                        ? "bg-[rgba(239,166,92,0.13)]" 
                        : "bg-[rgba(196,196,196,0.12)]"}
                  `}
                >
                  {formatted && (
                    <div className="flex flex-col items-center">
                      <div className={`w-[70%] aspect-square rounded-full mx-auto my-[16%] flex justify-center items-center text-[0.9em] font-extrabold transition-colors
                        ${isActive 
                          ? "bg-[#008540] text-white" 
                          : isFutureVisit 
                            ? "bg-[#EFA65C] text-white" 
                            : "bg-[rgba(221,221,221,0.39)] text-black"}
                      `}>
                        {formatted.day}
                      </div>
                      <div className="flex justify-center items-center text-[0.8em] -mt-[2px] text-black/60">
                        {formatted.month}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            <div
              className={`cursor-pointer ${currentIndex + 5 >= dateRange.length ? "cursor-not-allowed opacity-50" : ""}`}
              onClick={handleNext}
            >
              <FaAngleRight />
            </div>
          </div>

          {/* Bottom Analysis Box */}
          <div className="max-h-[calc(60%-20px)] w-[calc(100%-50px)] bg-white rounded-lg flex flex-col p-[5px_25px_15px] gap-[10px]">
            <div className="flex flex-row items-center gap-[10px] text-[1.1em] my-[10px] lg:my-[6px]">
              <div className="w-[6px] aspect-square rounded-full bg-[#008540]"></div>
              <h4 className="m-0 text-[0.8em] lg:text-[0.75em] font-semibold">Risk Assessment Analysis</h4>
            </div>
            <p className="text-[rgba(51,51,51,0.75)] text-[0.8em] lg:text-[0.7em] m-0 w-[98%] -mt-2">
              {(() => {
                const isNextVisit = patient?.visits?.[patient?.visits?.length - 1]?.nextVisit === selectedDate;
                const currentExp = patient?.explanation?.find((exp: any) => exp.date.split("T")[0] === selectedDate);
                const currentVisit = patient?.visits?.find((v: any) => v.date.split("T")[0] === selectedDate);

                if (isNextVisit) return "Patient is scheduled for their next visit. Risk analysis will be updated after the appointment.";
                if (currentExp) return currentExp.features || "Detailed assessment recorded for this date.";
                if (currentVisit) return currentVisit.visitExplanation || "No detailed notes provided for this visit.";
                return "No assessment data available for the selected date.";
              })()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Riskassessment;