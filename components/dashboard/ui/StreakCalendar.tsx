"use client";

import { Flame, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface StreakCalendarProps {
  streakDays: number;
  nextMilestone?: number;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function StreakCalendar({
  streakDays,
  nextMilestone = 14,
}: StreakCalendarProps) {
  const daysToShow = 14;
  const daysAway = nextMilestone - streakDays;

  return (
    <div className="bg-surface-elevated border border-border-custom rounded-xl p-4 md:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Flame className="h-5 w-5 text-accent-green" />
        <h3 className="font-medium text-text-primary">
          Study Streak - {streakDays} Days
        </h3>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-2">
        {DAYS.map((day) => (
          <div key={day} className="text-xs text-text-secondary text-center font-mono">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2 mb-4">
        {Array.from({ length: daysToShow }).map((_, index) => {
          const isStudied = index < streakDays;
          const isToday = index === streakDays - 1;
          const isMilestone = index + 1 === nextMilestone;

          return (
            <div
              key={index}
              className={cn(
                "aspect-square rounded-lg flex items-center justify-center text-sm transition-all relative",
                isStudied
                  ? "bg-accent-green/20 text-accent-green"
                  : "bg-surface text-text-secondary",
                isToday && "ring-2 ring-accent-cyan animate-pulse",
                "hover:scale-105"
              )}
            >
              <span
                className={cn(
                  "block w-2.5 h-2.5 rounded-full border",
                  isStudied
                    ? "bg-current border-current"
                    : "bg-transparent border-current"
                )}
              />
              {isMilestone && (
                <Trophy className="absolute -top-1 -right-1 h-3 w-3 text-accent-amber" />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 text-sm text-text-secondary">
        <Trophy className="h-4 w-4 text-accent-amber" />
        <span>
          Next milestone: {nextMilestone}-day streak (
          {daysAway > 0 ? `${daysAway} days away` : "Achieved!"})
        </span>
      </div>
    </div>
  );
}
