"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Award, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LiveActivityItem } from "@/types/admin";

interface LiveActivityFeedProps {
  activities: LiveActivityItem[];
}

const TYPE_STYLES: Record<LiveActivityItem["type"], string> = {
  success: "bg-accent-green",
  warning: "bg-accent-amber",
  neutral: "bg-accent-cyan",
  achievement: "bg-accent-purple",
};

export function LiveActivityFeed({ activities }: LiveActivityFeedProps) {
  const [items, setItems] = useState(activities);

  // Simulate live updates
  useEffect(() => {
    const interval = setInterval(() => {
      // In production, this would fetch new activities
      setItems((prev) => [...prev]);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-surface-elevated/40 backdrop-blur-sm border border-border-custom rounded-xl p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-accent-red font-mono text-xs font-semibold tracking-wider">
          // LIVE ACTIVITY
        </h3>
        <span className="w-2 h-2 bg-accent-green rounded-full animate-pulse" />
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
        {items.map((activity) => (
          <div
            key={activity.id}
            className="flex items-start gap-3 p-3 bg-surface/50 rounded-lg border border-border-custom/50 hover:border-accent-red/30 transition-all"
          >
            <span
              className={cn(
                "w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
                TYPE_STYLES[activity.type]
              )}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-text-primary text-sm font-medium truncate">
                  {activity.studentName}
                </span>
                {activity.type === "warning" && (
                  <AlertTriangle className="h-3 w-3 text-accent-amber flex-shrink-0" />
                )}
                {activity.type === "achievement" && (
                  <Award className="h-3 w-3 text-accent-purple flex-shrink-0" />
                )}
              </div>
              <p className="text-text-secondary text-xs">
                {activity.action}
                {activity.detail && (
                  <span className="text-text-primary"> · {activity.detail}</span>
                )}
              </p>
              <span className="text-text-secondary/60 text-xs font-mono">
                {activity.timestamp}
              </span>
            </div>
          </div>
        ))}
      </div>

      <Link
        href="/admin/dashboard/audit"
        className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-border-custom text-text-secondary hover:text-accent-red transition-colors text-sm"
      >
        View Full Audit Log
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
