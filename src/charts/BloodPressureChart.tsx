import React, { useState, useRef } from "react";
import { IoFlagSharp } from "react-icons/io5";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import type { PatientData } from "../types/patient";

interface ChartProps {
  patient: PatientData;
  selectedOption: string;
}

interface ChartDataItem {
  date: string;
  value: number | null;
  isAbnormal: boolean;
  abnormalMessage: string;
}

const BloodPressureChart: React.FC<ChartProps> = ({ patient, selectedOption }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [hoveredData, setHoveredData] = useState<ChartDataItem | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const formatDateToShort = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "--";
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };

  const calculateYAxisDomain = (data: ChartDataItem[]) => {
    const values = data.map((item) => item.value).filter((val): val is number => val !== null);
    if (values.length === 0) return [0, 100];
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const padding = Math.max((maxValue - minValue) * 0.1, 5);

    switch (selectedOption) {
      case "diastolic": return [Math.max(40, minValue - padding), Math.min(140, maxValue + padding)];
      case "systolic": return [Math.max(70, minValue - padding), Math.min(220, maxValue + padding)];
      case "heartRate": return [Math.max(30, minValue - padding), Math.min(160, maxValue + padding)];
      default: return [Math.floor(minValue - padding), Math.ceil(maxValue + padding)];
    }
  };

  const checkAbnormality = (value: number | null) => {
    if (value === null) return { isAbnormal: false, message: "" };
    if (selectedOption === "systolic") {
      if (value >= 140) return { isAbnormal: true, message: "Systolic hypertension (≥140)" };
      if (value < 90) return { isAbnormal: true, message: "Systolic hypotension (<90)" };
    }
    if (selectedOption === "diastolic") {
      if (value >= 90) return { isAbnormal: true, message: "Diastolic hypertension (≥90)" };
      if (value < 60) return { isAbnormal: true, message: "Diastolic hypotension (<60)" };
    }
    if (selectedOption === "heartRate") {
      if (value > 100) return { isAbnormal: true, message: "Tachycardia (>100 bpm)" };
      if (value < 60) return { isAbnormal: true, message: "Bradycardia (<60 bpm)" };
    }
    return { isAbnormal: false, message: "" };
  };

  const normalizeData = (): ChartDataItem[] => {
    const vitals = patient?.triage || [];
    const formatted = vitals.map((entry: any) => {
      const val = entry[selectedOption] != null ? Number(entry[selectedOption]) : null;
      const { isAbnormal, message } = checkAbnormality(val);
      return {
        date: formatDateToShort(entry.date),
        value: val,
        isAbnormal,
        abnormalMessage: message,
        rawTime: new Date(entry.date).getTime()
      };
    }).sort((a, b) => a.rawTime - b.rawTime);

    const cleaned = formatted.map(({ rawTime, ...rest }) => rest);
    while (cleaned.length < 5) {
      cleaned.push({ date: "--", value: null, isAbnormal: false, abnormalMessage: "" });
    }
    return cleaned.slice(-5);
  };

  const chartData = normalizeData();
  const yDomain = calculateYAxisDomain(chartData);

  // FIXED: Using 'any' for the Recharts event because internal types are inconsistent across versions
  const handleMouseMove = (e: any) => {
    if (e && e.activePayload && e.activePayload.length > 0) {
      setHoveredData(e.activePayload[0].payload as ChartDataItem);
      setTooltipPos({ 
        x: e.chartX ?? 0, 
        y: e.chartY ?? 0 
      });
    } else {
      setHoveredData(null);
    }
  };

  return (
    <div className="w-full h-full relative" ref={chartRef}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ left: -30 }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredData(null)}
        >
          <defs>
            <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#66BB6A" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#66BB6A" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            axisLine={false} 
            tickLine={false} 
            fontSize={11} 
            tickMargin={10} 
            padding={{right:10}}
            tick={{ fill: '#9ca3af' }}
          />
          <YAxis 
            domain={yDomain} 
            axisLine={false} 
            tickLine={false} 
            fontSize={11} 
            tick={{ fill: '#9ca3af' }}
            tickSize={10}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#66BB6A"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorVal)"
            connectNulls
          />
        </AreaChart>
      </ResponsiveContainer>

      {hoveredData && hoveredData.value !== null && (
        <div
          className="absolute pointer-events-none bg-slate-800 text-white p-2.5 rounded-lg shadow-xl z-[10000] text-xs flex flex-col gap-1 border border-white/10"
          style={{ 
            top: tooltipPos.y - 70, 
            left: Math.max(0, tooltipPos.x - 60) 
          }}
        >
          <div className="flex items-center gap-2 font-bold capitalize">
            {selectedOption}: {hoveredData.value}
            {hoveredData.isAbnormal && <IoFlagSharp className="text-red-500 animate-pulse" />}
          </div>
          <div className="opacity-60 text-[10px]">{hoveredData.date}</div>
          {hoveredData.isAbnormal && (
            <div className="text-red-300 text-[10px] font-medium pt-1 border-t border-white/10 mt-1">
              {hoveredData.abnormalMessage}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BloodPressureChart;