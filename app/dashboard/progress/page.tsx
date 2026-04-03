"use client";

import Link from "next/link";
import {
  BarChart3,
  Brain,
  Calendar,
  ChevronRight,
  Flame,
  Target,
  TrendingUp,
} from "lucide-react";

import { TopicRadarChart } from "@/components/dashboard/charts/TopicRadarChart";
import { ProgressBar, getProgressVariant } from "@/components/dashboard/ui/ProgressBar";
import { SkeletonCard } from "@/components/dashboard/ui/SkeletonCard";
import { StatCard } from "@/components/dashboard/ui/StatCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDashboardStats } from "@/context/DashboardStatsContext";
import { cn } from "@/lib/utils";

function formatWeekday(dateValue: string) {
  return new Date(`${dateValue}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
  });
}

export default function ProgressPage() {
  const { stats, isLoading } = useDashboardStats();
  const topicMastery = stats?.topicMastery ?? [];
  const studyActivity = stats?.studyActivity ?? [];
  const recentQuizzes = stats?.recentQuizzes ?? [];
  const weakAreas = stats?.weakAreas ?? [];

  const totalCardsReviewed = studyActivity.reduce((acc, item) => acc + item.flashcards, 0);
  const totalQuizzesTaken = studyActivity.reduce((acc, item) => acc + item.quizzes, 0);
  const avgDailyMinutes = Math.round(
    studyActivity.reduce((acc, item) => acc + item.minutes, 0) /
      Math.max(studyActivity.length, 1)
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-surface-elevated rounded animate-pulse" />
          <div className="h-5 w-64 bg-surface-elevated rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-accent-red mb-2">Unable to load progress data.</p>
        <p className="text-text-secondary text-sm">
          Refresh the page after signing in again.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-[family-name:var(--font-syne)] font-bold text-text-primary flex items-center gap-2">
          <BarChart3 className="h-7 w-7 text-accent-cyan" />
          Progress Tracker
        </h1>
        <p className="text-text-secondary mt-1">
          Track your study habits and learning progress over time.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Flame}
          value={stats.streakDays}
          label="Day Streak"
          iconColor="text-accent-green"
        />
        <StatCard
          icon={Target}
          value={totalCardsReviewed}
          label="Cards This Week"
          iconColor="text-accent-cyan"
        />
        <StatCard
          icon={Brain}
          value={totalQuizzesTaken}
          label="Quizzes This Week"
          iconColor="text-accent-purple"
        />
        <StatCard
          icon={TrendingUp}
          value={avgDailyMinutes}
          suffix=" min"
          label="Avg Daily Study"
          iconColor="text-accent-amber"
        />
      </div>

      <div className="bg-surface-elevated border border-border-custom rounded-xl p-4 md:p-6">
        <h2 className="text-lg font-medium text-text-primary mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-accent-cyan" />
          This Week&apos;s Activity
        </h2>

        <div className="grid grid-cols-7 gap-2">
          {studyActivity.map((activity, index) => {
            const intensity = Math.min(activity.minutes / 60, 1);
            const isToday = index === studyActivity.length - 1;

            return (
              <div key={activity.date} className="text-center">
                <p
                  className={cn(
                    "text-xs mb-2",
                    isToday ? "text-accent-cyan font-medium" : "text-text-secondary"
                  )}
                >
                  {formatWeekday(activity.date)}
                </p>
                <div
                  className={cn(
                    "aspect-square rounded-lg flex items-center justify-center transition-all",
                    intensity > 0.7
                      ? "bg-accent-green"
                      : intensity > 0.4
                        ? "bg-accent-green/60"
                        : intensity > 0
                          ? "bg-accent-green/30"
                          : "bg-surface"
                  )}
                >
                  <span
                    className={cn(
                      "text-xs font-mono",
                      intensity > 0.4 ? "text-background" : "text-text-secondary"
                    )}
                  >
                    {activity.minutes > 0 ? `${activity.minutes}m` : "-"}
                  </span>
                </div>
                <p className="text-xs text-text-secondary mt-1">
                  {activity.flashcards > 0 ? `${activity.flashcards} cards` : ""}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <Tabs defaultValue="mastery" className="space-y-4">
        <TabsList className="bg-surface-elevated">
          <TabsTrigger value="mastery">Topic Mastery</TabsTrigger>
          <TabsTrigger value="history">Quiz History</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="mastery" className="space-y-4">
          <div className="bg-surface-elevated border border-border-custom rounded-xl p-4 md:p-6">
            {topicMastery.length === 0 ? (
              <p className="text-sm text-text-secondary">
                Topic mastery will appear after your first quiz attempts and card
                reviews.
              </p>
            ) : (
              <div className="grid lg:grid-cols-2 gap-6 items-center">
                <TopicRadarChart data={topicMastery.slice(0, 6)} />

                <div className="space-y-4">
                  {topicMastery.map((topic) => (
                    <div key={topic.topic}>
                      <div className="flex items-center justify-between mb-1 gap-3">
                        <div>
                          <span className="text-sm text-text-primary">{topic.topic}</span>
                          <p className="text-xs text-text-secondary">
                            {topic.quizzes} quiz{topic.quizzes === 1 ? "" : "zes"} and{" "}
                            {topic.flashcardsDone}/{topic.flashcardsTotal} flashcards mastered
                          </p>
                        </div>
                        <span
                          className={cn(
                            "text-xs font-mono",
                            topic.mastery >= 80
                              ? "text-accent-green"
                              : topic.mastery >= 60
                                ? "text-accent-amber"
                                : "text-accent-red"
                          )}
                        >
                          {topic.mastery}%
                        </span>
                      </div>
                      <ProgressBar
                        value={topic.mastery}
                        max={100}
                        variant={getProgressVariant(topic.mastery)}
                        size="sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-surface-elevated border border-border-custom rounded-xl p-4 md:p-6">
            <h3 className="font-medium text-text-primary mb-3">Areas to Focus On</h3>
            {weakAreas.length === 0 ? (
              <p className="text-sm text-text-secondary">
                No weak areas are currently flagged. Keep the streak going.
              </p>
            ) : (
              <div className="space-y-2">
                {weakAreas.map((topic) => (
                  <Link
                    key={topic.topic}
                    href="/dashboard/flashcards"
                    className="flex items-center justify-between p-3 rounded-lg bg-surface hover:bg-surface-elevated border border-border-custom transition-all group"
                  >
                    <div>
                      <p className="text-sm text-text-primary">{topic.topic} Radiology</p>
                      <p className="text-xs text-text-secondary">
                        Mastery {topic.mastery}% and weak-area score {topic.weakAreaScore}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-text-secondary group-hover:text-accent-cyan transition-colors" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <div className="bg-surface-elevated border border-border-custom rounded-xl p-4 md:p-6">
            <h3 className="font-medium text-text-primary mb-4">Recent Quiz Performance</h3>
            {recentQuizzes.length === 0 ? (
              <p className="text-sm text-text-secondary">
                Quiz history will appear after your first completed attempt.
              </p>
            ) : (
              <div className="space-y-3">
                {recentQuizzes.map((quiz, index) => (
                  <div
                    key={`${quiz.title}-${index}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-surface border border-border-custom"
                  >
                    <div>
                      <p className="text-sm text-text-primary">{quiz.title}</p>
                      <p className="text-xs text-text-secondary">
                        {quiz.daysAgo === 0 ? "Today" : `${quiz.daysAgo} days ago`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <ProgressBar
                        value={quiz.score}
                        max={100}
                        variant={getProgressVariant(quiz.score)}
                        size="sm"
                        className="w-24"
                      />
                      <span
                        className={cn(
                          "text-sm font-mono w-12 text-right",
                          quiz.score >= 80
                            ? "text-accent-green"
                            : quiz.score >= 60
                              ? "text-accent-amber"
                              : "text-accent-red"
                        )}
                      >
                        {quiz.score}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <div className="bg-surface-elevated border border-border-custom rounded-xl p-4 md:p-6">
            <h3 className="font-medium text-text-primary mb-4">Study Trends</h3>

            <div className="h-48 flex items-end justify-around gap-2">
              {studyActivity.map((day) => {
                const maxMinutes = Math.max(...studyActivity.map((item) => item.minutes), 1);
                const height = (day.minutes / maxMinutes) * 100;

                return (
                  <div
                    key={day.date}
                    className="flex-1 flex flex-col items-center gap-2"
                  >
                    <div
                      className="w-full bg-accent-cyan rounded-t-lg transition-all"
                      style={{ height: `${height}%`, minHeight: height > 0 ? "8px" : "0" }}
                    />
                    <span className="text-xs text-text-secondary">
                      {formatWeekday(day.date)}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pt-4 border-t border-border-custom grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-lg font-bold text-text-primary">
                  {studyActivity.reduce((acc, item) => acc + item.minutes, 0)}
                </p>
                <p className="text-xs text-text-secondary">Total Minutes</p>
              </div>
              <div>
                <p className="text-lg font-bold text-text-primary">{totalCardsReviewed}</p>
                <p className="text-xs text-text-secondary">Cards Reviewed</p>
              </div>
              <div>
                <p className="text-lg font-bold text-text-primary">{totalQuizzesTaken}</p>
                <p className="text-xs text-text-secondary">Quizzes Taken</p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
