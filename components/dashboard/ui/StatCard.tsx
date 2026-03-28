"use client";

import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  value: number;
  label: string;
  suffix?: string;
  iconColor?: string;
  animate?: boolean;
}

export function StatCard({ 
  icon: Icon, 
  value, 
  label, 
  suffix = "",
  iconColor = "text-accent-cyan",
  animate = true,
}: StatCardProps) {
  const [displayValue, setDisplayValue] = useState(animate ? 0 : value);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!animate || hasAnimated.current) return;
    hasAnimated.current = true;

    const duration = 500;
    const startTime = performance.now();

    const tick = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      setDisplayValue(Math.floor(value * easeOut));

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        setDisplayValue(value);
      }
    };

    requestAnimationFrame(tick);
  }, [value, animate]);

  return (
    <div className="bg-surface-elevated border border-border-custom rounded-xl p-4 hover:shadow-lg hover:shadow-accent-cyan/5 hover:-translate-y-0.5 transition-all group">
      <div className="flex items-start justify-between mb-2">
        <Icon className={cn("h-6 w-6", iconColor)} />
      </div>
      <div className="space-y-1">
        <p className="text-2xl md:text-3xl font-[family-name:var(--font-syne)] font-bold text-text-primary">
          {displayValue.toLocaleString()}{suffix}
        </p>
        <p className="text-xs font-mono text-text-secondary uppercase tracking-wide">
          {label}
        </p>
      </div>
    </div>
  );
}
