import React, { useState, useRef } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts'

interface WeightData {
  date: string;
  weight: number | null;
}

interface WeightChartProps {
  data: { date: string; weight: number }[];
}

const WeightChart: React.FC<WeightChartProps> = ({ data }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [hoveredBar, setHoveredBar] = useState<WeightData | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // 1. Formatting Utility
  const formatDateToShort = (dateStr: string): string => {
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? "--" : date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });
  };

  // 2. Data Normalization (Padding to 5 entries)
  const normalizedData: WeightData[] = React.useMemo(() => {
    const formatted = data.map((entry) => ({
      ...entry,
      shortDate: formatDateToShort(entry.date),
      rawDate: new Date(entry.date).getTime(),
    }));

    // Sort ascending by date
    formatted.sort((a, b) => a.rawDate - b.rawDate);

    const cleaned: WeightData[] = formatted.map((item) => ({
      date: item.shortDate,
      weight: item.weight,
    }));

    while (cleaned.length < 5) {
      cleaned.push({ date: "--", weight: null });
    }

    return cleaned.slice(0, 5);
  }, [data]);

  // 3. Tooltip Handler
  const handleMouseMove = (e: any) => {
    if (e && e.activePayload && e.activePayload.length > 0) {
      const payload = e.activePayload[0].payload;
      setHoveredBar(payload);
      
      setTooltipPos({
        x: e.chartX || 0,
        y: e.chartY || 0,
      });
    }
  };

  const handleMouseLeave = () => {
    setHoveredBar(null);
  };

  // 4. Custom Tooltip Component
  const CustomTooltip = ({ item, position }: { item: WeightData | null, position: { x: number, y: number } }) => {
    if (!item || item.weight === null) return null;

    return (
      <div
        className="absolute bg-black/90 text-white p-2.5 rounded-lg pointer-events-none shadow-xl border border-white/20 backdrop-blur-sm z-[99999] whitespace-nowrap transition-transform duration-75"
        style={{
          top: Math.max(0, position.y - 60),
          left: Math.max(10, position.x - 40),
          transform: "translateZ(0)",
        }}
      >
        <div className="font-bold text-sm">{item.weight} kg</div>
        <div className="text-[10px] opacity-80 uppercase tracking-wider">{item.date}</div>
      </div>
    );
  };

  return (
    <div className="w-full h-[90%] pt-2.5 relative z-[50] overflow-visible" ref={chartRef}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={normalizedData}
          margin={{ left: -30, top: 20, right: 10, bottom: 5 }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
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
          <Bar
            dataKey="weight"
            fill="#79B49A"
            radius={[20, 20, 0, 0]}
            cursor="pointer"
            barSize={30}
          />
        </BarChart>
      </ResponsiveContainer>
      
      <CustomTooltip item={hoveredBar} position={tooltipPos} />
    </div>
  );
};

export default WeightChart;