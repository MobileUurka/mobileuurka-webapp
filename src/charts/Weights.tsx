import React, { useEffect, useState } from "react";
import { FaArrowTrendDown, FaArrowTrendUp } from "react-icons/fa6";
import { IoFlagSharp } from "react-icons/io5";
import { Tooltip } from "react-tooltip";
import WeightChart from "./WeightChart";
import OverviewEmptyState from "../components/OverviewEmptyState";
import { hasWeightData } from "../utils/overviewData";

// Interfaces
interface TriageEntry {
  date: string;
  weight: number;
  gestationweek: number;
}

interface WeightAnalysis {
  latestWeight: number;
  previousWeight: number;
  change: number;
  direction: "increased" | "decreased" | "no change";
  dateDiff: number;
  changePerWeek: number;
  trimester: "first" | "second" | "third";
  gestationWeek: number;
}

interface WeightsProps {
    patient?: TriageEntry[] | null;
    patientId: string;
    patientName: string;
}

const Weights: React.FC<WeightsProps> = ({ patient, patientId, patientName }) => {
  const [weightAnalysis, setWeightAnalysis] = useState<WeightAnalysis | null>(null);
  const [latestWeights, setLatestWeights] = useState<{ date: string; weight: number }[]>([]);
  const [showFlag, setShowFlag] = useState<boolean>(false);
  const [flagMessage, setFlagMessage] = useState<string>("");

  useEffect(() => {
    if (!Array.isArray(patient) || patient.length === 0) return;

    const sorted = [...patient].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const latestGestationWeek = sorted[0]?.gestationweek;

    const latest = sorted.slice(0, 5).map((entry) => ({
      date: entry.date,
      weight: entry.weight,
    }));
    setLatestWeights(latest);

    if (sorted.length >= 2) {
      const [latestEntry, previousEntry] = [sorted[0], sorted[1]];
      const currWeight = latestEntry.weight;
      const prevWeight = previousEntry.weight;
      const change = currWeight - prevWeight;
      
      const direction: "increased" | "decreased" | "no change" =
        change > 0 ? "increased" : change < 0 ? "decreased" : "no change";

      const diffDays = Math.max(1, Math.round(
        (new Date(latestEntry.date).getTime() - new Date(previousEntry.date).getTime()) /
          (1000 * 60 * 60 * 24)
      ));

      const changePerWeek = (change / diffDays) * 7;

      let trimester: "first" | "second" | "third";
      if (latestGestationWeek < 14) trimester = "first";
      else if (latestGestationWeek < 28) trimester = "second";
      else trimester = "third";

      let shouldFlag = false;
      let message = "";

      if (direction === "decreased") {
        shouldFlag = true;
        message = "Weight loss during pregnancy should be evaluated.";
      } else if (direction === "increased") {
        switch (trimester) {
          case "first":
            if (changePerWeek > 0.17 || changePerWeek < 0.04) {
              shouldFlag = true;
              message = `Expected weight gain in first trimester: 0.5-2kg total. Current change: ${changePerWeek.toFixed(2)}kg/week.`;
            }
            break;
          case "second":
          case "third":
            if (changePerWeek > 0.9 || changePerWeek < 0.45) {
              shouldFlag = true;
              message = `Expected weight gain: 0.45-0.9kg/week. Current change: ${changePerWeek.toFixed(2)}kg/week.`;
            }
            break;
        }
      }

      setShowFlag(shouldFlag);
      setFlagMessage(message);

      setWeightAnalysis({
        latestWeight: currWeight,
        previousWeight: prevWeight,
        change,
        direction,
        dateDiff: diffDays,
        changePerWeek,
        trimester,
        gestationWeek: latestGestationWeek,
      });
    }
  }, [patient]);

  const getWeightChangeUI = (change: number, direction: string) => {
    const absChange = Math.abs(change).toFixed(1);

    const scenarios: Record<string, any> = {
      increased: {
        message: `Increased by ${absChange} kg`,
        icon: <FaArrowTrendUp className="text-emerald-500" />,
        bgClass: "bg-emerald-500/10",
        textClass: "text-emerald-600",
        change: absChange,
      },
      decreased: {
        message: `Decreased by ${absChange} kg`,
        icon: <FaArrowTrendDown className="text-red-500" />,
        bgClass: "bg-red-500/10",
        textClass: "text-red-600",
        change: absChange,
      },
      "no change": {
        message: "No weight change",
        icon: <span className="text-gray-400">➖</span>,
        bgClass: "bg-gray-100",
        textClass: "text-gray-500",
        change: "0",
      },
    };

    return scenarios[direction] || scenarios["no change"];
  };

  if (!hasWeightData(patient)) {
    return (
      <OverviewEmptyState
        title="No weight data"
        description="Record triage vitals including weight to track changes over time."
        screeningTab="Triage"
        patientId={patientId}
        patientName={patientName}
      />
    );
  }

  return (
    <div className="w-full h-full flex flex-col p-4 relative overflow-visible">
      {/* Top Header Section */}
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold text-sm text-gray-700">Weight</span>
        {weightAnalysis && (() => {
          const ui = getWeightChangeUI(weightAnalysis.change, weightAnalysis.direction);
          return (
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-medium ${ui.bgClass} ${ui.textClass}`}>
              {ui.icon}
              <span>{ui.change} kg(s)</span>
            </div>
          );
        })()}
      </div>

      {/* Middle Chart Section */}
      <div className="flex-1 min-h-0 flex items-center justify-center">
        <WeightChart data={latestWeights} />
      </div>

      {/* Bottom Analysis Section */}
      <div className="mt-2">
        {weightAnalysis && (() => {
          const ui = getWeightChangeUI(weightAnalysis.change, weightAnalysis.direction);
          return (
            <div className={`flex items-center justify-between w-full p-2.5 rounded-lg text-xs font-medium border border-transparent ${ui.bgClass} ${ui.textClass}`}>
              <div className="flex items-center gap-2">
                {ui.icon}
                <p>
                  <span className="font-medium">{ui.message}</span> in {weightAnalysis.dateDiff} days
                </p>
              </div>
              {showFlag && (
                <div className="cursor-help">
                  <IoFlagSharp
                    data-tooltip-id="weight-tooltip"
                    data-tooltip-content={flagMessage}
                    className="text-red-600 animate-pulse"
                    size={16}
                  />
                </div>
              )}
            </div>
          );
        })()}
      </div>

      <Tooltip
        id="weight-tooltip"
        style={{ fontSize: "11px", zIndex: 99999, maxWidth: "200px" }}
      />
    </div>
  );
};

export default Weights;