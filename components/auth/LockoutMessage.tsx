"use client";

import { useState, useEffect } from "react";
import { Lock } from "lucide-react";

interface LockoutMessageProps {
  lockoutEndTime: number;
}

export function LockoutMessage({ lockoutEndTime }: LockoutMessageProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  useEffect(() => {
    const updateTimer = () => {
      const remaining = Math.max(0, lockoutEndTime - Date.now());
      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, "0")}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [lockoutEndTime]);

  return (
    <div className="w-full p-8 rounded-2xl bg-[rgba(255,107,107,0.08)] border border-[#FF6B6B]/30 text-center">
      <Lock className="h-12 w-12 text-[#FF6B6B] mx-auto mb-4" />
      <h3 className="text-xl font-[family-name:var(--font-syne)] font-bold text-text-primary mb-2">
        Account Temporarily Locked
      </h3>
      <p className="text-text-secondary mb-4">
        Too many failed attempts. Try again in{" "}
        <span className="font-mono text-[#FF6B6B]">{timeRemaining}</span>
      </p>
      <p className="text-sm text-text-secondary">
        Contact your system administrator if this persists.
      </p>
    </div>
  );
}
