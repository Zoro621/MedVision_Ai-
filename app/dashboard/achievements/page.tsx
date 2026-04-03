"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Brain,
  CheckCircle,
  Flame,
  Lock,
  Medal,
  Star,
  Target,
  Trophy,
  Zap,
} from "lucide-react";

import { DailyChallengeBanner } from "@/components/dashboard/ui/DailyChallengeBanner";
import { ProgressBar } from "@/components/dashboard/ui/ProgressBar";
import { SkeletonCard } from "@/components/dashboard/ui/SkeletonCard";
import { StatCard } from "@/components/dashboard/ui/StatCard";
import { useAuth } from "@/context/AuthContext";
import { useDashboardStats } from "@/context/DashboardStatsContext";
import {
  getGamificationSummary,
  type Achievement,
  type LeaderboardEntry,
  type WeeklyQuest,
} from "@/lib/api/gamification";
import { getDashboardUser } from "@/lib/dashboard/currentUser";
import { cn } from "@/lib/utils";

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

const CATEGORY_ICONS = {
  consistency: Flame,
  learning: BookOpen,
  performance: Target,
  specialty: Brain,
} as const;

export default function AchievementsPage() {
  const { user: authUser } = useAuth();
  const { stats } = useDashboardStats();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [weeklyQuests, setWeeklyQuests] = useState<WeeklyQuest[]>([]);
  const [dailyChallenge, setDailyChallenge] =
    useState<Awaited<ReturnType<typeof getGamificationSummary>>["dailyChallenge"] | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const summary = await getGamificationSummary();
        if (cancelled) return;
        setAchievements(summary.achievements);
        setLeaderboard(summary.leaderboard);
        setWeeklyQuests(summary.weeklyQuests);
        setDailyChallenge(summary.dailyChallenge);
      } catch (nextError) {
        if (!cancelled) {
          setError(
            nextError instanceof Error
              ? nextError.message
              : "Failed to load gamification data."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const user = getDashboardUser(authUser, stats);
  const unlockedCount = achievements.filter((achievement) => achievement.unlockedAt).length;
  const totalRewards = achievements
    .filter((achievement) => achievement.unlockedAt)
    .reduce((sum, achievement) => sum + achievement.xpReward, 0);
  const currentRank =
    leaderboard.find((entry) => entry.isCurrentUser)?.rank ?? null;

  const categorized = useMemo(() => {
    return achievements.reduce(
      (accumulator, achievement) => {
        const category = achievement.category ?? "learning";
        if (!accumulator[category]) accumulator[category] = [];
        accumulator[category].push(achievement);
        return accumulator;
      },
      {} as Record<string, Achievement[]>
    );
  }, [achievements]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-48 rounded bg-surface-elevated animate-pulse" />
          <div className="h-5 w-64 rounded bg-surface-elevated animate-pulse" />
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-accent-red/30 bg-surface-elevated p-6">
        <p className="text-accent-red">{error}</p>
        <p className="mt-2 text-sm text-text-secondary">
          Refresh the page after confirming the backend is running.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-text-primary md:text-3xl font-[family-name:var(--font-syne)]">
          <Trophy className="h-7 w-7 text-accent-amber" />
          Achievements
        </h1>
        <p className="mt-1 text-text-secondary">
          Real progress, real rewards, and your current standing on the leaderboard.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
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
          label="Achievement XP"
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
          value={currentRank ?? 0}
          label={currentRank ? "Leaderboard Rank" : "Leaderboard Rank"}
          iconColor="text-accent-green"
        />
      </div>

      {dailyChallenge && <DailyChallengeBanner challenge={dailyChallenge} />}

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="rounded-xl border border-border-custom bg-surface-elevated p-4 md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-medium text-text-primary">Weekly Quests</h2>
            <span className="text-sm text-text-secondary">
              {weeklyQuests.filter((quest) => quest.completed).length}/{weeklyQuests.length}
            </span>
          </div>
          <div className="space-y-4">
            {weeklyQuests.map((quest) => (
              <QuestRow key={quest.id} quest={quest} />
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border-custom bg-surface-elevated p-4 md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-medium text-text-primary">Leaderboard</h2>
            <span className="text-sm text-text-secondary">Current season</span>
          </div>
          <div className="space-y-3">
            {leaderboard.map((entry) => (
              <LeaderboardRow key={entry.rank} entry={entry} />
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border-custom bg-surface-elevated p-4 md:p-6">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm text-text-secondary">Collection Progress</span>
          <span className="text-sm font-mono text-accent-cyan">
            {achievements.length > 0
              ? Math.round((unlockedCount / achievements.length) * 100)
              : 0}
            %
          </span>
        </div>
        <ProgressBar value={unlockedCount} max={Math.max(achievements.length, 1)} variant="cyan" />
      </div>

      {Object.entries(categorized).map(([category, items]) => {
        const Icon = CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS] ?? Trophy;
        const unlockedInCategory = items.filter((item) => item.unlockedAt).length;

        return (
          <section key={category} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-medium capitalize text-text-primary">
                <Icon className="h-5 w-5 text-accent-cyan" />
                {category}
              </h2>
              <span className="text-sm text-text-secondary">
                {unlockedInCategory}/{items.length}
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((achievement) => (
                <AchievementCard key={achievement.id} achievement={achievement} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function QuestRow({ quest }: { quest: WeeklyQuest }) {
  return (
    <div className="rounded-lg border border-border-custom bg-surface p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-medium text-text-primary">{quest.title}</h3>
          <p className="mt-1 text-sm text-text-secondary">{quest.description}</p>
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-medium",
            quest.completed
              ? "bg-accent-green/20 text-accent-green"
              : "bg-accent-amber/20 text-accent-amber"
          )}
        >
          {quest.completed ? "Complete" : "In Progress"}
        </span>
      </div>
      <ProgressBar value={quest.progress} max={quest.maxProgress} variant={quest.completed ? "green" : "amber"} size="sm" />
      <div className="mt-2 flex items-center justify-between text-xs text-text-secondary">
        <span>
          {quest.progress}/{quest.maxProgress}
        </span>
        <span className="text-accent-purple">+{quest.xpReward} XP</span>
      </div>
    </div>
  );
}

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border p-3",
        entry.isCurrentUser
          ? "border-accent-cyan/40 bg-accent-cyan/5"
          : "border-border-custom bg-surface"
      )}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-elevated font-mono text-sm text-text-primary">
        {entry.rank}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-text-primary">
          {entry.name}
          {entry.isCurrentUser ? " (You)" : ""}
        </p>
        <p className="text-xs text-text-secondary">
          Level {entry.level} - {entry.streak} day streak
        </p>
      </div>
      <div className="text-right">
        <p className="font-mono text-sm text-accent-purple">{entry.xp.toLocaleString()}</p>
        <p className="text-xs text-text-secondary">XP</p>
      </div>
    </div>
  );
}

function AchievementCard({ achievement }: { achievement: Achievement }) {
  const isLocked = !achievement.unlockedAt;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border-2 transition-all",
        isLocked
          ? "border-border-custom bg-surface opacity-70"
          : TIER_BORDERS[achievement.tier],
        !isLocked && "bg-surface-elevated hover:-translate-y-1 hover:shadow-lg"
      )}
    >
      <div
        className={cn(
          "h-1.5 bg-gradient-to-r",
          isLocked ? "from-gray-600 to-gray-500" : TIER_COLORS[achievement.tier]
        )}
      />

      <div className="p-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
              isLocked ? "bg-surface" : `bg-gradient-to-br ${TIER_COLORS[achievement.tier]}`
            )}
          >
            {isLocked ? (
              <Lock className="h-5 w-5 text-text-secondary" />
            ) : (
              <CheckCircle className="h-5 w-5 text-background" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className={cn("font-medium", isLocked ? "text-text-secondary" : "text-text-primary")}>
                {achievement.title}
              </h3>
              {!isLocked && <CheckCircle className="h-4 w-4 shrink-0 text-accent-green" />}
            </div>
            <p className="mt-0.5 line-clamp-2 text-xs text-text-secondary">
              {achievement.description}
            </p>
          </div>
        </div>

        {isLocked && (
          <div className="mt-3">
            <ProgressBar value={achievement.progress} max={achievement.maxProgress} variant="amber" size="sm" />
            <p className="mt-1 text-right text-xs text-text-secondary">
              {achievement.progress}/{achievement.maxProgress}
            </p>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between border-t border-border-custom pt-3">
          <div className="flex items-center gap-1 text-xs">
            <Zap className={cn("h-3.5 w-3.5", isLocked ? "text-text-secondary" : "text-accent-purple")} />
            <span className={isLocked ? "text-text-secondary" : "text-accent-purple"}>
              +{achievement.xpReward} XP
            </span>
          </div>
          {achievement.unlockedAt ? (
            <span className="text-xs text-text-secondary">
              {new Date(achievement.unlockedAt).toLocaleDateString()}
            </span>
          ) : (
            <span className="text-xs capitalize text-text-secondary">
              {achievement.tier}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
