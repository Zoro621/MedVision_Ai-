"use client";

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { TopicMastery } from "@/types/dashboard";

interface TopicRadarChartProps {
  data: TopicMastery[];
}

export function TopicRadarChart({ data }: TopicRadarChartProps) {
  const chartData = data.map((item) => ({
    topic: item.topic,
    mastery: item.mastery,
    fullMark: 100,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
        <PolarGrid stroke="#1A2F4A" />
        <PolarAngleAxis 
          dataKey="topic" 
          tick={{ fill: "#7A9BB5", fontSize: 12 }}
        />
        <Radar
          name="Mastery"
          dataKey="mastery"
          stroke="#00C2FF"
          fill="#00C2FF"
          fillOpacity={0.3}
          strokeWidth={2}
          animationDuration={1000}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#0D1424",
            border: "1px solid #1A2F4A",
            borderRadius: "8px",
            color: "#E8F4FD",
          }}
          formatter={(value: number) => [`${value}%`, "Mastery"]}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
