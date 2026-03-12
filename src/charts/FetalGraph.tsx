import React, { useState, useRef, useMemo } from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    ResponsiveContainer,
} from "recharts";

interface FetalEntry {
    gestationWeek: number;
    [key: string]: any;
}

interface FetalGraphProps {
    patient?: FetalEntry[];
    selectedOption: string;
}

const FetalGraph: React.FC<FetalGraphProps> = ({ patient = [], selectedOption }) => {
    const chartRef = useRef<HTMLDivElement>(null);
    const [hoveredPoint, setHoveredPoint] = useState<any>(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });


    const normalizedData = useMemo(() => {
        const formatted = patient
            .map((entry) => ({
                date: `${entry.gestationWeek}`,
                rawWeek: entry.gestationWeek,
                value: entry[selectedOption] != null ? Number(entry[selectedOption]) : null,
            }))
            .sort((a, b) => b.rawWeek - a.rawWeek)
            .slice(0, 5)
            .reverse();

        while (formatted.length < 5) {
            formatted.push({ date: "--", rawWeek: 0, value: null });
        }

        return [{ date: "0", rawWeek: 0, value: 0 }, ...formatted];
    }, [patient, selectedOption]);

    const handleMouseMove = (e: any) => {
        if (e?.activePayload?.length > 0) {
            setHoveredPoint(e.activePayload[0].payload);
            setTooltipPos({ x: e.chartX || 0, y: e.chartY || 0 });
        } else {
            setHoveredPoint(null);
        }
    };

    return (
        <div className="w-full h-[90%] mx-auto relative  z-10" ref={chartRef}>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={normalizedData}
                    margin={{ left: -30 ,top:10}}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={() => setHoveredPoint(null)}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEE" />
                    <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        // Use any to bypass the complex Recharts internal type mismatch
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
                        allowDecimals={true}
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

            {/* Tooltip */}
            {hoveredPoint && hoveredPoint.value !== null && (
                <div
                    className="absolute bg-black/80 text-white p-2 rounded-md shadow-lg pointer-events-none z-[10000] border border-white/20 backdrop-blur-sm transition-all duration-75"
                    style={{
                        top: Math.max(0, tooltipPos.y - 50),
                        left: Math.max(0, tooltipPos.x - 60),
                    }}
                >
                    <div className="text-[12px] font-bold capitalize">
                        {selectedOption}: {hoveredPoint.value}
                    </div>
                    <div className="text-[10px] opacity-70">Week {hoveredPoint.date}</div>
                </div>
            )}
        </div>
    );
};

export default FetalGraph;