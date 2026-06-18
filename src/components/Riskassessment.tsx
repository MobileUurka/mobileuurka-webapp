import React, { useEffect, useState } from "react";
import Piechart from "../charts/Piechart";
import { FaAngleLeft, FaAngleRight } from "react-icons/fa6";
import { Tooltip } from "react-tooltip";
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
  const [tooltipContent, setTooltipContent] = useState<string>("");

  if (tooltipContent) console.log(tooltipContent);
  const isLongText = (text: string) => text && text.length > 180;

  useEffect(() => {
    if (patient) {
      const explanationDates =
        patient?.explanation?.map((exp: any) => exp.date.split("T")[0]) || [];
      const visitDates =
        patient?.visits?.map((visit: any) => visit.date.split("T")[0]) || [];
      const lastVisit = patient?.visits?.[patient?.visits?.length - 1];
      const nextVisitDate = lastVisit?.nextVisit;

      const combined = [...explanationDates, ...visitDates];
      if (nextVisitDate) combined.push(nextVisitDate);

      const allDates = [...new Set(combined)].sort(
        (a, b) => new Date(a).getTime() - new Date(b).getTime()
      );

      setDateRange(allDates);

      if (allDates.length > 0) {
        const defaultIndex = allDates.length - 1;
        setSelectedDate(allDates[defaultIndex]);
        setCurrentIndex(Math.max(0, defaultIndex - 3));
      }
    }
  }, [patient]);

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const handleNext = () => {
    if (currentIndex + 4 < dateRange.length)
      setCurrentIndex(currentIndex + 1);
  };

  const formatDate = (dateStr: string): DateDisplay | null => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return {
      day: date.getDate(),
      month: date.toLocaleString("default", { month: "short" }),
    };
  };

  const visibleDates = dateRange.slice(currentIndex, currentIndex + 4);

  return (
    <div className="w-full p-4">
      <Tooltip
        id="risk-tooltip"
        place="top"
        style={{
          fontSize: ".8em",
          zIndex: 9999,
          borderRadius: "8px",
          maxWidth: "300px",
        }}
      />

      <div className="m-0 mb-2">
        <span className="font-bold text-sm text-gray-700">
          Risk Assessment Overview
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[42%_58%] w-full h-[calc(100%-45px)]">
        {/* LEFT */}
        <div className="w-full h-full flex justify-center items-center">
          <Piechart patient={patient} selectedDate={selectedDate} />
        </div>

        {/* RIGHT */}
        <div className="w-full my-auto flex flex-col gap-5 ml-[10px]">
          {/* DATE PICKER */}
          <div className="h-[30%] flex flex-row gap-5 lg:gap-[10px] items-center">
            <div
              className={`cursor-pointer ${currentIndex === 0 ? "cursor-not-allowed opacity-50" : ""
                }`}
              onClick={handlePrev}
            >
              <FaAngleLeft />
            </div>

            {visibleDates.map((date, index) => {
              const formatted = formatDate(date);

              const isFutureVisit =
                patient?.visits?.[patient?.visits?.length - 1]?.nextVisit ===
                date;

              const isActive = selectedDate === date;

              const hasExp = patient?.explanation?.some(
                (exp: any) =>
                  exp.date.split("T")[0] === date && exp.features
              );

              return (
                <div
                  key={index}
                  onClick={() => setSelectedDate(date)}
                  className={`h-[90%] w-[50px] rounded-[30px] lg:rounded-[20px] pb-2 lg:h-full cursor-pointer transition-colors
                    ${isActive
                      ? "bg-[rgba(180,130,90,0.13)]"
                      : isFutureVisit
                        ? "bg-[rgba(239,166,92,0.13)]"
                        : hasExp
                          ? "bg-[rgba(133,198,154,0.16)]"
                          : "bg-[rgba(196,196,196,0.12)]"
                    }
                  `}
                >
                  {formatted && (
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-[70%] aspect-square rounded-full mx-auto my-[16%] flex justify-center items-center text-[0.9em] font-extrabold transition-colors
                        ${isActive
                            ? "bg-[#A0714F] text-white"
                            : isFutureVisit
                              ? "bg-[#EFA65C] text-white"
                              : hasExp
                                ? "bg-[#008540] text-white"
                                : "bg-[rgba(221,221,221,0.39)] text-black"
                          }`}
                      >
                        {formatted.day}
                      </div>

                      <div className="text-[0.8em] text-black/60">
                        {formatted.month}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            <div
              className={`cursor-pointer ${currentIndex + 4 >= dateRange.length
                ? "cursor-not-allowed opacity-50"
                : ""
                }`}
              onClick={handleNext}
            >
              <FaAngleRight />
            </div>
          </div>

          {/* ANALYSIS BOX */}
          <div className="pt-5 max-h-[calc(60%-20px)] w-[calc(100%-10px)] bg-white rounded-lg flex flex-col p-[5px_25px_15px] gap-[10px]">
            {(() => {
              const lastVisit =
                patient?.visits?.[patient?.visits?.length - 1];

              const isNextVisitDate =
                lastVisit?.nextVisit === selectedDate;

              const currentExp = patient?.explanation?.find(
                (exp: any) => exp.date.split("T")[0] === selectedDate
              );

              const currentVisit = patient?.visits?.find(
                (v: any) => v.date.split("T")[0] === selectedDate
              );

              const isScheduledOnly =
                isNextVisitDate && !currentVisit && !currentExp;

              const title = isScheduledOnly
                ? "Scheduled Visit"
                : currentExp
                  ? "Risk Assessment Analysis"
                  : currentVisit
                    ? "Visit Reason"
                    : "Risk Assessment Analysis";

              const text = isScheduledOnly
                ? "Patient is scheduled for their next visit. Risk analysis will be updated after the appointment."
                : currentExp
                  ? currentExp.features ||
                  "Detailed assessment recorded for this date."
                  : currentVisit
                    ? currentVisit.visitReason ||
                    currentVisit.visitExplanation ||
                    "No detailed notes provided for this visit."
                    : "No assessment data available for the selected date.";

              const shouldTrim = isLongText(text);
              const displayText =
                shouldTrim ? text.slice(0, 180) + "..." : text;

              return (
                <>
                  <div className="flex items-center gap-2 text-[0.8em] font-semibold">
                    <div className="w-2 h-2 rounded-full bg-[#008540]" />
                    {title}
                  </div>

                  <p className="text-[0.75em] text-gray-600">
                    {displayText}
                  </p>

                  {/* MORE BUTTON */}
                  {shouldTrim && (
                    <button
                      className="text-[#008540] text-xs font-medium self-start hover:underline"
                      onClick={() => setTooltipContent(text)}
                      data-tooltip-id="risk-tooltip"
                      data-tooltip-content={text}
                    >
                      More
                    </button>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Riskassessment;