import React, { useState, useRef } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import type { PatientData } from "../types/patient";

interface LabChartProps {
  patient: PatientData;
  selectedOption: string;
}

interface ChartDataItem {
  date: string;
  value: number | null;
}

const LabChart: React.FC<LabChartProps> = ({ patient, selectedOption }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [hoveredBar, setHoveredBar] = useState<ChartDataItem | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const formatDateToShort = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "--";
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });
  };

  const normalizeLabData = (): ChartDataItem[] => {
    // Access labwork from the patient object
    const labEntries = patient?.labwork || [];
    
    const formatted = labEntries
      .map((entry: any) => ({
        date: formatDateToShort(entry.date),
        rawDate: new Date(entry.date).getTime(),
        value:
          entry[selectedOption] !== undefined && entry[selectedOption] !== null
            ? Number(entry[selectedOption])
            : null,
      }))
      .sort((a, b) => a.rawDate - b.rawDate);

    const cleaned: ChartDataItem[] = formatted.map(({ date, value }) => ({ date, value }));

    // Pad to 5 entries to maintain consistent bar width
    const result = [...cleaned];
    while (result.length < 5) {
      result.push({ date: "--", value: null });
    }

    return result.slice(0, 5);
  };

  const normalizedData = normalizeLabData();

  const handleMouseMove = (e: any) => {
    if (e && e.activePayload && e.activePayload.length) {
      setHoveredBar(e.activePayload[0].payload);
      setTooltipPos({ x: e.chartX, y: e.chartY });
    } else {
      setHoveredBar(null);
    }
  };

  return (
    <div className="w-full h-[90%] relative" ref={chartRef}>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart
          data={normalizedData}
          margin={{ left: -20, bottom: 0 }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredBar(null)}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            fontSize={11}
            tick={{ fill: "#9ca3af" }}
            tickMargin={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            fontSize={11}
            tick={{ fill: "#9ca3af" }}
            tickMargin={5}
            allowDecimals={true}
          />
          <Bar
            dataKey="value"
            fill="#F8D798"
            radius={[10, 10, 0, 0]}
            barSize={40}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* Manual Custom Tooltip */}
      {hoveredBar && (
        <div
          className="absolute pointer-events-none bg-slate-800 text-white p-2 rounded shadow-lg z-[1000] whitespace-nowrap text-xs flex flex-col gap-0.5"
          style={{
            top: tooltipPos.y + 10,
            left: Math.max(0, tooltipPos.x - 60),
          }}
        >
          <div className="capitalize">
            <span className="font-bold">{selectedOption}: </span>
            {hoveredBar.value !== null ? hoveredBar.value : "No data"}
          </div>
          <div className="opacity-70 text-[10px]">{hoveredBar.date}</div>
        </div>
      )}
    </div>
  );
};

export default LabChart;