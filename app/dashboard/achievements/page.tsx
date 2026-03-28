"use client";

import { useState, useEffect } from "react";
import {
  Trophy,
  Star,
  Flame,
  Target,
  Brain,
  Zap,
  Calendar,
  BookOpen,
  Medal,
  Lock,
  CheckCircle,
} from "lucide-react";
import { ProgressBar } from "@/components/dashboard/ui/ProgressBar";
import { StatCard } from "@/components/dashboard/ui/StatCard";
import { SkeletonCard } from "@/components/dashboard/ui/SkeletonCard";
import { MOCK_USER, MOCK_ACHIEVEMENTS, delay } from "@/lib/mockData/dashboard";
import { cn } from "@/lib/utils";
import type { Achievement } from "@/types/dashboard";

const TIER_COLORS = {
  bronze: "from-orange-600 to-orange-400",
  silver: "from-gray-400 to-gray-200",
  gold: "from-yellow-500 to-yellow-300",
  platinum: "from-cyan-400 to-cyan-200",
};

const TIER_BORDERS = {
  bronze: "border-orange-500/50",
  silver: "border-gray-300/50",
  gold: "border-yellow-400/50",
  platinum: "border-cyan-300/50",
};

const CATEGORY_ICONS: Record<string, typeof Trophy> = {
  streak: Flame,
  mastery: Brain,
  quiz: Target,
  cards: BookOpen,
  xp: Zap,
  milestone: Star,
};

export default function AchievementsPage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    delay(800).then(() => setLoading(false));
  }, []);

  const user = MOCK_USER;
  const achievements = MOCK_ACHIEVEMENTS;

  const unlockedCount = achievements.filter((a) => a.unlockedAt).length;
  const totalRewards = unlockedCount * 50; // Example: 50 XP per achievement

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-surface-elevated rounded animate-pulse" />
          <div className="h-5 w-64 bg-surface-elevated rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  // Group by category
  const categorized = achievements.reduce(
    (acc, achievement) => {
      const cat = achievement.category || "milestone";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(achievement);
      return acc;
    },
    {} as Record<string, Achievement[]>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-[family-name:var(--font-syne)] font-bold text-text-primary flex items-center gap-2">
          <Trophy className="h-7 w-7 text-accent-amber" />
          Achievements
        </h1>
        <p className="text-text-secondary mt-1">
          Celebrate your learning milestones and earn XP rewards.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Trophy}
          value={unlockedCount}
          suffix={`/${achievements.length}`}
          label="Unlocked"
          iconColor="text-accent-amber"
        />
        <StatCard
          icon={Zap}
          value={totalRewards}
          label="XP from Achievements"
          iconColor="text-accent-purple"
        />
        <StatCard
          icon={Star}
          value={user.level}
          label="Current Level"
          iconColor="text-accent-cyan"
        />
        <StatCard
          icon={Medal}
          value={achievements.filter((a) => a.tier === "gold" && a.unlockedAt).length}
          label="Gold Badges"
          iconColor="text-yellow-500"
        />
      </div>

      {/* Overall progress */}
      <div className="bg-surface-elevated border border-border-custom rounded-xl p-4 md:p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-text-secondary">Collection Progress</span>
          <span className="text-sm font-mono text-accent-cyan">
            {Math.round((unlockedCount / achievements.length) * 100)}%
          </span>
        </div>
        <ProgressBar
          value={unlockedCount}
          max={achievements.length}
          variant="cyan"
          size="md"
        />
      </div>

      {/* Achievements by category */}
      {Object.entries(categorized).map(([category, items]) => {
        const Icon = CATEGORY_ICONS[category] || Trophy;
        const unlockedInCategory = items.filter((a) => a.unlockedAt).length;

        return (
          <div key={category} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-text-primary flex items-center gap-2 capitalize">
                <Icon className="h-5 w-5 text-accent-cyan" />
                {category} Achievements
              </h2>
              <span className="text-sm text-text-secondary">
                {unlockedInCategory}/{items.length}
              </span>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((achievement) => (
                <AchievementCard key={achievement.id} achievement={achievement} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AchievementCard({ achievement }: { achievement: Achievement }) {
  const isLocked = !achievement.unlockedAt;

  return (
    <div
      className={cn(
        "relative rounded-xl border-2 overflow-hidden transition-all",
        isLocked
          ? "border-border-custom bg-surface opacity-60"
          : TIER_BORDERS[achievement.tier],
        !isLocked && "bg-surface-elevated hover:shadow-lg hover:-translate-y-1"
      )}
    >
      {/* Tier gradient header */}
      <div
        className={cn(
          "h-1.5 bg-gradient-to-r",
          isLocked ? "from-gray-600 to-gray-500" : TIER_COLORS[achievement.tier]
        )}
      />

      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon/Badge */}
          <div
            className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
              isLocked
                ? "bg-surface"
                : `bg-gradient-to-br ${TIER_COLORS[achievement.tier]}`
            )}
          >
            {isLocked ? (
              <Lock className="h-5 w-5 text-text-secondary" />
            ) : (
              <CheckCircle className="h-5 w-5 text-background" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className={cn("font-medium", isLocked ? "text-text-secondary" : "text-text-primary")}>
                {achievement.title}
              </h3>
              {!isLocked && (
                <CheckCircle className="h-4 w-4 text-accent-green shrink-0" />
              )}
            </div>
            <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">
              {achievement.description}
            </p>
          </div>
        </div>

        {/* Progress bar for locked achievements */}
        {isLocked && achievement.progress !== undefined && achievement.maxProgress !== undefined && (
          <div className="mt-3">
            <ProgressBar
              value={achievement.progress}
              max={achievement.maxProgress}
              variant="amber"
              size="sm"
            />
            <p className="text-xs text-text-secondary mt-1 text-right">
              {achievement.progress}/{achievement.maxProgress}
            </p>
          </div>
        )}

        {/* XP reward & unlock date */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-custom">
          <div className="flex items-center gap-1 text-xs">
            <Zap className={cn("h-3.5 w-3.5", isLocked ? "text-text-secondary" : "text-accent-purple")} />
            <span className={isLocked ? "text-text-secondary" : "text-accent-purple"}>
              +50 XP
            </span>
          </div>
          {achievement.unlockedAt && (
            <span className="text-xs text-text-secondary">
              {new Date(achievement.unlockedAt).toLocaleDateString()}
            </span>
          )}
          {isLocked && (
            <span className="text-xs text-text-secondary capitalize">{achievement.tier}</span>
          )}
        </div>
      </div>
    </div>
  );
}
