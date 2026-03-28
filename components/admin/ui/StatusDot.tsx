"use client";

import { cn } from "@/lib/utils";

type StatusType = "success" | "warning" | "danger" | "info" | "neutral";

interface StatusDotProps {
  status: StatusType;
  label?: string;
  pulse?: boolean;
  size?: "sm" | "md";
}

const STATUS_COLORS: Record<StatusType, { dot: string; text: string }> = {
  success: { dot: "bg-accent-green", text: "text-accent-green" },
  warning: { dot: "bg-accent-amber", text: "text-accent-amber" },
  danger: { dot: "bg-accent-red", text: "text-accent-red" },
  info: { dot: "bg-accent-cyan", text: "text-accent-cyan" },
  neutral: { dot: "bg-text-secondary", text: "text-text-secondary" },
};

export function StatusDot({ status, label, pulse = false, size = "md" }: StatusDotProps) {
  const colors = STATUS_COLORS[status];
  
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "rounded-full",
          colors.dot,
          pulse && "animate-pulse",
          size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2"
        )}
      />
      {label && (
        <span className={cn("text-sm", colors.text)}>
          {label}
        </span>
      )}
    </div>
  );
}
