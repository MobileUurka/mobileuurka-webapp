import React from "react";
import {
  PieChart as RechartsPie,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import type { PatientData } from "../types/patient";

interface PayloadItem {
  name: string;
  value: number;
  color: string;
  payload: any;
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: PayloadItem[] }) => {
  if (active && payload && payload.length) {
    const { name, value, color } = payload[0];
    return (
      <div className="bg-white p-2 border border-gray-200 rounded shadow-sm text-xs flex flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }}></div>
          <span className="font-medium text-gray-700">{name}</span>
        </div>
        <div className="pl-3 text-gray-500">{`${value}%`}</div>
      </div>
    );
  }
  return null;
};

const Piechart: React.FC<{ patient: PatientData; selectedDate: string }> = ({ patient, selectedDate }) => {

  const getActiveData = () => {
    const assessments = patient?.explanation || [];
    if (assessments.length === 0) return { cp: 0, ms: 0, oh: 0, rf: 0 };
    const selectedStr = selectedDate.split('T')[0];
    const match = assessments.find((a: any) => a.date?.split('T')[0] === selectedStr);
    
    if (match) return match;

    const previous = assessments
      .filter((a: any) => new Date(a.date) <= new Date(selectedStr))
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return previous[0] || assessments[0];
  };

  const risk = getActiveData();

  const chartData = [
    { name: "Current Pregnancy", value: risk?.cp || 0, color: "#6fc996" },
    { name: "Medical & Surgical", value: risk?.ms || 0, color: "#ffc38f" },
    { name: "Obstetric History", value: risk?.oh || 0, color: "#fed68e" },
    { name: "Risk factor", value: risk?.rf || 0, color: "#65b698" },
  ];

  return (
    <ResponsiveContainer width="90%" height="90%" minHeight={200}>
      <RechartsPie>
        <Pie
          data={chartData}
          dataKey="value"
          innerRadius="55%"
          outerRadius="100%"
          stroke="none"
          cornerRadius={10}
          paddingAngle={5}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
      </RechartsPie>
    </ResponsiveContainer>
  );
};

export default Piechart;