"use client";

import { useState } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import type { PlatformActivityData } from "@/types/admin";

interface PlatformActivityChartProps {
  data: PlatformActivityData[];
}

export function PlatformActivityChart({ data }: PlatformActivityChartProps) {
  const [dateRange, setDateRange] = useState<"7d" | "14d" | "30d">("14d");

  const filteredData = () => {
    const days = dateRange === "7d" ? 7 : dateRange === "14d" ? 14 : 30;
    return data.slice(-days);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="bg-surface-elevated/40 backdrop-blur-sm border border-border-custom rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-text-primary font-semibold">Platform Activity</h3>
        <div className="flex gap-1 p-1 bg-surface rounded-lg">
          {(["7d", "14d", "30d"] as const).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded transition-all",
                dateRange === range
                  ? "bg-accent-red text-white"
                  : "text-text-secondary hover:text-text-primary"
              )}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={filteredData()} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1A2F4A" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              stroke="#7A9BB5"
              fontSize={12}
              tickLine={false}
            />
            <YAxis
              yAxisId="left"
              stroke="#7A9BB5"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#7A9BB5"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0D1424",
                border: "1px solid #1A2F4A",
                borderRadius: "8px",
              }}
              labelStyle={{ color: "#E8F4FD" }}
            />
            <Legend
              wrapperStyle={{ paddingTop: "20px" }}
              formatter={(value) => <span className="text-text-secondary text-xs">{value}</span>}
            />
            <Bar
              yAxisId="left"
              dataKey="quizAttempts"
              name="Quiz Attempts"
              fill="#00C2FF"
              fillOpacity={0.4}
              radius={[4, 4, 0, 0]}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="activeStudents"
              name="Active Students"
              stroke="#4EFFA0"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
