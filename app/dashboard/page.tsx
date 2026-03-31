"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Flame, Zap, CheckCircle, Layers, ChevronRight, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/ui/StatCard";
import { ProgressBar, getProgressVariant } from "@/components/dashboard/ui/ProgressBar";
import { TopicMasteryBadge } from "@/components/dashboard/ui/TopicMasteryBadge";
import { DailyChallengeBanner } from "@/components/dashboard/ui/DailyChallengeBanner";
import { StreakCalendar } from "@/components/dashboard/ui/StreakCalendar";
import { TopicRadarChart } from "@/components/dashboard/charts/TopicRadarChart";
import { SkeletonCard } from "@/components/dashboard/ui/SkeletonCard";
import {
  MOCK_DECKS,
  MOCK_TOPIC_MASTERY,
  MOCK_DAILY_CHALLENGE,
  MOCK_RECENT_QUIZZES,
  delay,
} from "@/lib/mockData/dashboard";
import { getDashboardUser } from "@/lib/dashboard/currentUser";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function DashboardOverviewPage() {
  const [loading, setLoading] = useState(true);
  const { user: authUser } = useAuth();

  useEffect(() => {
    delay(800).then(() => setLoading(false));
  }, []);

  const user = getDashboardUser(authUser);
  const decks = MOCK_DECKS;
  const topicMastery = MOCK_TOPIC_MASTERY;
  const dailyChallenge = MOCK_DAILY_CHALLENGE;
  const recentQuizzes = MOCK_RECENT_QUIZZES;

  const totalDueCards = decks.reduce((acc, d) => acc + d.dueCards, 0);
  const avgQuizScore = Math.round(recentQuizzes.reduce((acc, q) => acc + q.score, 0) / recentQuizzes.length);

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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-[family-name:var(--font-syne)] font-bold text-text-primary">
          {getGreeting()}, {user.fullName.split(" ")[0]}.
        </h1>
        <p className="text-text-secondary mt-1">
          Here&apos;s your study summary for today.
        </p>
      </div>

      {/* Section A: Top Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Flame}
          value={user.streakDays}
          label="Day Streak"
          iconColor="text-accent-green"
        />
        <StatCard
          icon={Zap}
          value={user.xp}
          label="Total XP"
          iconColor="text-accent-purple"
        />
        <StatCard
          icon={CheckCircle}
          value={avgQuizScore}
          suffix="%"
          label="Avg Quiz Score"
          iconColor="text-accent-cyan"
        />
        <StatCard
          icon={Layers}
          value={totalDueCards}
          label="Cards Due Today"
          iconColor="text-accent-red"
        />
      </div>

      {/* Section B: Daily Challenge Banner */}
      <DailyChallengeBanner challenge={dailyChallenge} />

      {/* Section C: Two-column layout */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* Left column (60%) - Flashcards Due */}
        <div className="lg:col-span-3 bg-surface-elevated border border-border-custom rounded-xl p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-accent-cyan" />
              <h3 className="font-medium text-text-primary">Flashcards Due Today</h3>
            </div>
          </div>

          <div className="space-y-3">
            {decks.slice(0, 3).map((deck) => {
              const isComplete = deck.dueCards === 0;

              return (
                <Link
                  key={deck.id}
                  href={`/dashboard/flashcards/${deck.id}/study`}
                  className="block group"
                >
                  <div className="bg-surface border border-border-custom rounded-lg p-4 hover:border-accent-cyan/50 transition-all">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium text-text-primary group-hover:text-accent-cyan transition-colors">
                          {deck.title}
                        </h4>
                        <p className="text-xs text-text-secondary">
                          Chapter — {deck.topic} Radiology
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-text-secondary group-hover:text-accent-cyan transition-colors" />
                    </div>
                    <div className="flex items-center gap-3">
                      <ProgressBar
                        value={deck.masteredCards}
                        max={deck.totalCards}
                        variant={isComplete ? "green" : "cyan"}
                        size="sm"
                        className="flex-1"
                      />
                      <span className={cn(
                        "text-xs font-mono",
                        isComplete ? "text-accent-green" : "text-text-secondary"
                      )}>
                        {isComplete ? "All done" : `${deck.dueCards} / ${deck.totalCards} cards due`}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="mt-4">
            <Link href="/dashboard/flashcards">
              <Button variant="outline" className="w-full">
                View All Decks
              </Button>
            </Link>
          </div>
        </div>

        {/* Right column (40%) - Recent Quiz Performance */}
        <div className="lg:col-span-2 bg-surface-elevated border border-border-custom rounded-xl p-4 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-accent-cyan" />
            <h3 className="font-medium text-text-primary">Recent Quizzes</h3>
          </div>

          <div className="space-y-4">
            {recentQuizzes.map((quiz, index) => {
              const variant = getProgressVariant(quiz.score);
              const needsReview = quiz.score < 70;

              return (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-primary">{quiz.title}</span>
                    {needsReview && (
                      <span className="text-xs text-accent-red font-mono">Review</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <ProgressBar
                      value={quiz.score}
                      max={100}
                      variant={variant}
                      size="sm"
                      className="flex-1"
                    />
                    <span className={cn(
                      "text-xs font-mono",
                      variant === "green" ? "text-accent-green" : variant === "amber" ? "text-accent-amber" : "text-accent-red"
                    )}>
                      {quiz.score}%
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary">{quiz.daysAgo} days ago</p>
                </div>
              );
            })}
          </div>

          <div className="mt-4">
            <Link href="/dashboard/quizzes">
              <Button variant="outline" className="w-full">
                View All Quizzes
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Section D: Topic Mastery Radar Chart */}
      <div className="bg-surface-elevated border border-border-custom rounded-xl p-4 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-accent-cyan" />
          <h3 className="font-medium text-text-primary">Topic Mastery Overview</h3>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 items-center">
          <TopicRadarChart data={topicMastery} />

          <div className="grid grid-cols-2 gap-3">
            {topicMastery.map((topic) => (
              <div key={topic.topic} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-text-primary">{topic.topic}</span>
                    <span className="text-xs font-mono text-text-secondary">{topic.mastery}%</span>
                  </div>
                  <ProgressBar
                    value={topic.mastery}
                    max={100}
                    variant={getProgressVariant(topic.mastery)}
                    size="sm"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Topic pills */}
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border-custom">
          {topicMastery.map((topic) => (
            <TopicMasteryBadge key={topic.topic} mastery={topic.mastery} />
          ))}
        </div>
      </div>

      {/* Section E: Study Streak Calendar */}
      <StreakCalendar streakDays={user.streakDays} nextMilestone={14} />
    </div>
  );
}
