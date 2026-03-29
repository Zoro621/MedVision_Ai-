"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Zap, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DailyChallenge } from "@/types/dashboard";
import { cn } from "@/lib/utils";

interface DailyChallengeBannerProps {
  challenge: DailyChallenge;
}

export function DailyChallengeBanner({ challenge }: DailyChallengeBannerProps) {
  const [timeLeft, setTimeLeft] = useState("");
  const [completed, setCompleted] = useState(challenge.completed);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const expires = new Date(challenge.expiresAt);
      const diff = expires.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft("Expired");
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(
        `${hours.toString().padStart(2, "0")}:${minutes
          .toString()
          .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [challenge.expiresAt]);

  if (completed) {
    return (
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-accent-green/20 to-surface-elevated border-l-4 border-accent-green p-4 md:p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-accent-green/20 flex items-center justify-center">
            <Check className="h-5 w-5 text-accent-green" />
          </div>
          <div>
            <p className="text-accent-green font-medium">Daily Challenge Completed!</p>
            <p className="text-sm text-text-secondary">+{challenge.xpReward} XP earned</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-surface-elevated to-surface border-l-4 border-accent-cyan p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-accent-cyan" />
          <span className="text-sm font-mono text-accent-cyan uppercase tracking-wider">
            Daily Challenge
          </span>
        </div>
        <span className="text-sm font-mono text-text-secondary">
          Expires in {timeLeft}
        </span>
      </div>

      {/* Content */}
      <h3 className="text-lg font-medium text-text-primary mb-2">
        &quot;{challenge.title}&quot;
      </h3>
      <p className="text-sm text-text-secondary mb-4">
        Topic: {challenge.topic} · Difficulty: {challenge.difficulty}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-text-secondary">
          <span className="text-accent-green font-medium">Reward: +{challenge.xpReward} XP</span>
          {challenge.badgeProgress && (
            <span className="ml-2">+ {challenge.badgeProgress}</span>
          )}
        </div>
        <Link href="/dashboard/quizzes">
          <Button className="bg-accent-cyan text-background hover:bg-accent-cyan/90">
            Start Challenge
          </Button>
        </Link>
      </div>
    </div>
  );
}
