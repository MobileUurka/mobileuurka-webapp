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
import { padChartSlotsLeft, EMPTY_SLOT_LABEL } from "../utils/chartSlots";

interface WeightData {
  date: string;
  weight: number | null;
}

interface WeightChartProps {
  data: { date: string; weight: number }[];
}

const WeightChart: React.FC<WeightChartProps> = ({ data }) => {

  // Format date
  const formatDateToShort = (dateStr: string): string => {
    const date = new Date(dateStr);
    return isNaN(date.getTime())
      ? "--"
      : date.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
        });
  };

  // Normalize data (max 5 points)
  const normalizedData: WeightData[] = React.useMemo(() => {
    const formatted = data.map((entry) => ({
      ...entry,
      shortDate: formatDateToShort(entry.date),
      rawDate: new Date(entry.date).getTime(),
    }));

    formatted.sort((a, b) => a.rawDate - b.rawDate);

    const cleaned: WeightData[] = formatted
      .filter((item) => item.weight != null && !Number.isNaN(item.weight))
      .map((item) => ({
        date: item.shortDate,
        weight: item.weight,
      }));

    return padChartSlotsLeft(cleaned, () => ({ date: EMPTY_SLOT_LABEL, weight: null }));
  }, [data]);

  // Custom Tooltip (Recharts-controlled)
  const CustomTooltip = ({ active, payload, coordinate }: any) => {
    if (!active || !payload || !payload.length) return null;

    const item = payload[0].payload;
    if (!item || item.weight === null) return null;

    return (
      <div
        className="w-20 pointer-events-none absolute bg-black/90 text-white px-3 py-2 rounded-md shadow-lg text-xs backdrop-blur-sm"
        style={{
          transform: `translate(${coordinate.x}px, ${coordinate.y - 50}px)`,
        }}
      >
        <div className="font-semibold text-sm">{item.weight} kg</div>
        <div className="opacity-70 text-[10px] uppercase tracking-wide">
          {item.date}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-[90%] pt-2.5 relative">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={normalizedData}
          margin={{ left: -30, top: 20, right: 10, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#E5E5E5"
          />

          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            fontSize={11}
            tickMargin={10}
            stroke="#9CA3AF"
          />

          <YAxis
            axisLine={false}
            tickLine={false}
            fontSize={11}
            tickMargin={5}
            stroke="#9CA3AF"
          />

          <Tooltip cursor={false} content={<CustomTooltip />} />

          <Bar
            dataKey="weight"
            fill="#79B49A"
            radius={[20, 20, 0, 0]}
            barSize={30}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default WeightChart;