"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TopicPerformance } from "@/types/admin";

interface TopicPerformanceBarProps {
  data: TopicPerformance[];
}

export function TopicPerformanceBar({ data }: TopicPerformanceBarProps) {
  const getColor = (score: number) => {
    if (score >= 75) return { bar: "bg-accent-green", text: "text-accent-green", dot: "bg-accent-green" };
    if (score >= 50) return { bar: "bg-accent-amber", text: "text-accent-amber", dot: "bg-accent-amber" };
    return { bar: "bg-accent-red", text: "text-accent-red", dot: "bg-accent-red" };
  };

  return (
    <div className="bg-surface-elevated/40 backdrop-blur-sm border border-border-custom rounded-xl p-6">
      <h3 className="text-accent-red font-mono text-xs font-semibold tracking-wider mb-4">
        // TOPIC PERFORMANCE
      </h3>

      <div className="space-y-3">
        {data.map((topic) => {
          const colors = getColor(topic.avgScore);
          return (
            <div key={topic.topic} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-text-primary text-sm">{topic.topic}</span>
                <div className="flex items-center gap-2">
                  <span className={cn("text-sm font-mono", colors.text)}>
                    {topic.avgScore}% avg
                  </span>
                  <span className={cn("w-2 h-2 rounded-full", colors.dot)} />
                </div>
              </div>
              <div className="h-2 bg-surface rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", colors.bar)}
                  style={{ width: `${topic.avgScore}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <Link
        href="/admin/dashboard/analytics"
        className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-border-custom text-text-secondary hover:text-accent-red transition-colors text-sm"
      >
        View Full Analytics
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
