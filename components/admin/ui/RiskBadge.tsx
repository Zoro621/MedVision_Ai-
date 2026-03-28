"use client";

import { cn } from "@/lib/utils";
import type { StudentRisk } from "@/types/admin";

interface RiskBadgeProps {
  risk: StudentRisk;
  size?: "sm" | "md";
}

const RISK_STYLES: Record<StudentRisk, { bg: string; text: string; label: string }> = {
  "at-risk": { 
    bg: "bg-accent-red/20", 
    text: "text-accent-red", 
    label: "At Risk" 
  },
  "on-track": { 
    bg: "bg-accent-amber/20", 
    text: "text-accent-amber", 
    label: "On Track" 
  },
  "thriving": { 
    bg: "bg-accent-green/20", 
    text: "text-accent-green", 
    label: "Thriving" 
  },
};

export function RiskBadge({ risk, size = "md" }: RiskBadgeProps) {
  const style = RISK_STYLES[risk];
  
  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-full",
        style.bg,
        style.text,
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs"
      )}
    >
      {style.label}
    </span>
  );
}
