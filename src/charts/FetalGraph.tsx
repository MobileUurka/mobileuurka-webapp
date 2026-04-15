import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface FetalEntry {
  gestationWeek: number;
  [key: string]: any;
}

interface FetalGraphProps {
  patient?: FetalEntry[];
  selectedOption: string;
}

const FetalGraph: React.FC<FetalGraphProps> = ({
  patient = [],
  selectedOption,
}) => {
  const normalizedData = useMemo(() => {
    const formatted = patient
      .map((entry) => ({
        date: `${entry.gestationWeek}`,
        rawWeek: entry.gestationWeek,
        value:
          entry[selectedOption] != null
            ? Number(entry[selectedOption])
            : null,
      }))
      .sort((a, b) => b.rawWeek - a.rawWeek)
      .slice(0, 5)
      .reverse();

    while (formatted.length < 5) {
      formatted.push({ date: "--", rawWeek: 0, value: null });
    }

    return [{ date: "0", rawWeek: 0, value: 0 }, ...formatted];
  }, [patient, selectedOption]);

  return (
    <div className="w-full h-[90%] mx-auto relative z-10">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={normalizedData} margin={{ left: -30, top: 10 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#EEE"
          />

          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={(props: any) => {
              const { x, y, payload, index } = props;
              return (
                <text
                  x={x + (index === 0 ? 20 : 0)}
                  y={y + 10}
                  textAnchor="middle"
                  fill="#999"
                  fontSize="11px"
                >
                  {payload.value}
                </text>
              );
            }}
          />

          <YAxis
            axisLine={false}
            tickLine={false}
            fontSize={11}
            tickMargin={5}
            stroke="#999"
          />

          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;

              const value = payload[0].value;

              return (
                <div className="bg-black/80 text-white p-2 rounded-md shadow-lg border border-white/20 backdrop-blur-sm">
                  <div className="text-[12px] font-bold capitalize">
                    {selectedOption}: {value}
                  </div>
                  <div className="text-[10px] opacity-70">
                    Week {label}
                  </div>
                </div>
              );
            }}
          />

          <Line
            type="monotone"
            dataKey="value"
            stroke="#ffc187"
            strokeWidth={3}
            dot={{ r: 4, stroke: "#ffc187", strokeWidth: 2, fill: "#fff" }}
            activeDot={{ r: 6, fill: "#ffc187" }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default FetalGraph;