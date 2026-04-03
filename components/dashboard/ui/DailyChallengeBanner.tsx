"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { DailyChallenge } from "@/lib/api/gamification";

interface DailyChallengeBannerProps {
  challenge: DailyChallenge;
}

export function DailyChallengeBanner({ challenge }: DailyChallengeBannerProps) {
  const [timeLeft, setTimeLeft] = useState("");
  const [completed] = useState(challenge.completed);

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
      <div className="relative overflow-hidden rounded-xl border-l-4 border-accent-green bg-gradient-to-r from-accent-green/20 to-surface-elevated p-4 md:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-green/20">
            <Check className="h-5 w-5 text-accent-green" />
          </div>
          <div>
            <p className="font-medium text-accent-green">Daily Challenge Completed!</p>
            <p className="text-sm text-text-secondary">+{challenge.xpReward} XP earned</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl border-l-4 border-accent-cyan bg-gradient-to-r from-surface-elevated to-surface p-4 md:p-6">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-accent-cyan" />
          <span className="font-mono text-sm uppercase tracking-wider text-accent-cyan">
            Daily Challenge
          </span>
        </div>
        <span className="font-mono text-sm text-text-secondary">
          Expires in {timeLeft}
        </span>
      </div>

      <h3 className="mb-2 text-lg font-medium text-text-primary">
        &quot;{challenge.title}&quot;
      </h3>
      <p className="mb-4 text-sm text-text-secondary">
        Topic: {challenge.topic} - Difficulty: {challenge.difficulty}
      </p>

      <div className="flex items-center justify-between">
        <div className="text-sm text-text-secondary">
          <span className="font-medium text-accent-green">
            Reward: +{challenge.xpReward} XP
          </span>
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
