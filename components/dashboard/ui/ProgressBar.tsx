"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  max: number;
  variant?: "cyan" | "green" | "amber" | "red" | "purple";
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  animate?: boolean;
  className?: string;
}

const variantColors = {
  cyan: "bg-accent-cyan",
  green: "bg-accent-green",
  amber: "bg-accent-amber",
  red: "bg-accent-red",
  purple: "bg-accent-purple",
};

const sizeClasses = {
  sm: "h-1",
  md: "h-2",
  lg: "h-3",
};

export function ProgressBar({
  value,
  max,
  variant = "cyan",
  size = "md",
  showLabel = false,
  animate = true,
  className,
}: ProgressBarProps) {
  const safeMax = Math.max(max, 1);
  const percentage = Math.min((value / safeMax) * 100, 100);
  const [displayPercentage, setDisplayPercentage] = useState(animate ? 0 : percentage);

  useEffect(() => {
    if (!animate) {
      setDisplayPercentage(percentage);
      return;
    }

    const timeout = setTimeout(() => {
      setDisplayPercentage(percentage);
    }, 100);

    return () => clearTimeout(timeout);
  }, [percentage, animate]);

  return (
    <div className={cn("space-y-1", className)}>
      <div className={cn("bg-surface rounded-full overflow-hidden", sizeClasses[size])}>
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            variantColors[variant]
          )}
          style={{ width: `${displayPercentage}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-xs font-mono text-text-secondary text-right">
          {value} / {max}
        </p>
      )}
    </div>
  );
}

export function getProgressVariant(percentage: number): "green" | "amber" | "red" {
  if (percentage >= 80) return "green";
  if (percentage >= 50) return "amber";
  return "red";
}
