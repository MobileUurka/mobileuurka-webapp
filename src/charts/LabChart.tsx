import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { PatientData } from "../types/patient";
import { padChartSlotsLeft, EMPTY_SLOT_LABEL } from "../utils/chartSlots";

interface LabChartProps {
  patient: PatientData;
  selectedOption: string;
}

interface ChartDataItem {
  date: string;
  value: number | null;
}

const LabChart: React.FC<LabChartProps> = ({ patient, selectedOption }) => {

  // Format date
  const formatDateToShort = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "--";
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });
  };

  // Normalize data
  const normalizedData: ChartDataItem[] = React.useMemo(() => {
    const labEntries = patient?.labwork || [];

    const formatted = labEntries
      .map((entry: any) => ({
        date: formatDateToShort(entry.date),
        rawDate: new Date(entry.date).getTime(),
        value:
          entry[selectedOption] !== undefined &&
          entry[selectedOption] !== null
            ? Number(entry[selectedOption])
            : null,
      }))
      .sort((a, b) => a.rawDate - b.rawDate);

    const cleaned: ChartDataItem[] = formatted
      .filter((item) => item.value !== null && !Number.isNaN(item.value))
      .map(({ date, value }) => ({ date, value }));

    return padChartSlotsLeft(cleaned, () => ({ date: EMPTY_SLOT_LABEL, value: null }));
  }, [patient, selectedOption]);

  // Custom Tooltip (Recharts-controlled)
  const CustomTooltip = ({ active, payload, coordinate }: any) => {
    if (!active || !payload || !payload.length) return null;

    const item = payload[0].payload;
    if (!item || item.value === null) return null;

    return (
      <div
        className="pointer-events-none absolute bg-slate-800 text-white px-3 py-2 rounded-md shadow-lg text-xs"
        style={{
          transform: `translate(${coordinate.x}px, ${coordinate.y - 50}px)`,
        }}
      >
        <div className="min-w-15 font-semibold capitalize">
          {selectedOption}: {item.value}
        </div>
        <div className="opacity-70 text-[10px]">
          {item.date}
        </div>
      </div>
    );
  };

  return (
    <div className="w-[98%] mx-auto h-[80%] relative">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={normalizedData}
          margin={{ left: -20, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#f0f0f0"
          />

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
            allowDecimals
          />

          {/* ✅ FIXED TOOLTIP */}
          <Tooltip cursor={false} content={<CustomTooltip />} />

          <Bar
            dataKey="value"
            fill="#F8D798"
            radius={[10, 10, 0, 0]}
            barSize={40}
            activeBar={{ fill: "#e6c278" }} // optional highlight
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default LabChart;