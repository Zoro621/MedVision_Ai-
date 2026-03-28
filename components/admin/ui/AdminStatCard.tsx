"use client";

import { useEffect, useState } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface AdminStatCardProps {
  icon: LucideIcon;
  value: number;
  label: string;
  sublabel?: string;
  href?: string;
  variant?: "default" | "danger" | "success";
  suffix?: string;
}

export function AdminStatCard({
  icon: Icon,
  value,
  label,
  sublabel,
  href,
  variant = "default",
  suffix = "",
}: AdminStatCardProps) {
  const [displayValue, setDisplayValue] = useState(0);

  // Animate counter on mount
  useEffect(() => {
    const duration = 1000;
    const steps = 60;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  const content = (
    <div
      className={cn(
        "bg-surface-elevated/40 backdrop-blur-sm border rounded-xl p-5 transition-all group",
        variant === "danger" && "border-accent-red/30 hover:border-accent-red/60 hover:shadow-[0_0_30px_rgba(255,107,107,0.15)]",
        variant === "success" && "border-accent-green/30 hover:border-accent-green/60 hover:shadow-[0_0_30px_rgba(78,255,160,0.15)]",
        variant === "default" && "border-border-custom hover:border-accent-red/40 hover:shadow-[0_0_30px_rgba(255,107,107,0.1)]",
        href && "cursor-pointer"
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={cn(
          "p-2 rounded-lg",
          variant === "danger" && "bg-accent-red/10",
          variant === "success" && "bg-accent-green/10",
          variant === "default" && "bg-accent-red/10"
        )}>
          <Icon className={cn(
            "h-5 w-5",
            variant === "danger" && "text-accent-red",
            variant === "success" && "text-accent-green",
            variant === "default" && "text-accent-red"
          )} />
        </div>
      </div>
      <div className={cn(
        "text-3xl font-bold font-[family-name:var(--font-syne)] mb-1",
        variant === "danger" && "text-accent-red",
        variant === "success" && "text-accent-green",
        variant === "default" && "text-text-primary"
      )}>
        {displayValue.toLocaleString()}{suffix}
      </div>
      <div className="text-text-secondary text-sm">{label}</div>
      {sublabel && <div className="text-text-secondary/70 text-xs mt-1">{sublabel}</div>}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
