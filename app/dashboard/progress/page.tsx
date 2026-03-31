"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BarChart3, TrendingUp, Calendar, Flame, Brain, Target, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatCard } from "@/components/dashboard/ui/StatCard";
import { ProgressBar, getProgressVariant } from "@/components/dashboard/ui/ProgressBar";
import { TopicRadarChart } from "@/components/dashboard/charts/TopicRadarChart";
import { SkeletonCard } from "@/components/dashboard/ui/SkeletonCard";
import {
  MOCK_TOPIC_MASTERY,
  MOCK_STUDY_ACTIVITY,
  MOCK_RECENT_QUIZZES,
  delay,
} from "@/lib/mockData/dashboard";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { getDashboardUser } from "@/lib/dashboard/currentUser";

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function ProgressPage() {
  const [loading, setLoading] = useState(true);
  const { user: authUser } = useAuth();

  useEffect(() => {
    delay(800).then(() => setLoading(false));
  }, []);

  const user = getDashboardUser(authUser);
  const topicMastery = MOCK_TOPIC_MASTERY;
  const studyActivity = MOCK_STUDY_ACTIVITY.slice(-7); // Last 7 days
  const recentQuizzes = MOCK_RECENT_QUIZZES;

  const totalCardsReviewed = studyActivity.reduce((acc, d) => acc + d.flashcards, 0);
  const totalQuizzesTaken = studyActivity.reduce((acc, d) => acc + d.quizzes, 0);
  const avgDailyMinutes = Math.round(
    studyActivity.reduce((acc, d) => acc + d.minutes, 0) / 7
  );

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
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-[family-name:var(--font-syne)] font-bold text-text-primary flex items-center gap-2">
          <BarChart3 className="h-7 w-7 text-accent-cyan" />
          Progress Tracker
        </h1>
        <p className="text-text-secondary mt-1">
          Track your study habits and learning progress over time.
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Flame}
          value={user.streakDays}
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

      {/* Weekly Activity Grid */}
      <div className="bg-surface-elevated border border-border-custom rounded-xl p-4 md:p-6">
        <h2 className="text-lg font-medium text-text-primary mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-accent-cyan" />
          This Week&apos;s Activity
        </h2>

        <div className="grid grid-cols-7 gap-2">
          {DAYS_OF_WEEK.map((day, idx) => {
            const activity = studyActivity[idx] || { minutes: 0, flashcards: 0 };
            const intensity = Math.min(activity.minutes / 60, 1);
            const isToday = idx === 4; // Friday for demo

            return (
              <div key={day} className="text-center">
                <p className={cn("text-xs mb-2", isToday ? "text-accent-cyan font-medium" : "text-text-secondary")}>
                  {day}
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
                  <span className={cn("text-xs font-mono", intensity > 0.4 ? "text-background" : "text-text-secondary")}>
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

      {/* Tabs for different views */}
      <Tabs defaultValue="mastery" className="space-y-4">
        <TabsList className="bg-surface-elevated">
          <TabsTrigger value="mastery">Topic Mastery</TabsTrigger>
          <TabsTrigger value="history">Quiz History</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="mastery" className="space-y-4">
          <div className="bg-surface-elevated border border-border-custom rounded-xl p-4 md:p-6">
            <div className="grid lg:grid-cols-2 gap-6 items-center">
              <TopicRadarChart data={topicMastery} />

              <div className="space-y-4">
                {topicMastery.map((topic) => (
                  <div key={topic.topic}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-text-primary">{topic.topic}</span>
                      <span className={cn(
                        "text-xs font-mono",
                        topic.mastery >= 80 ? "text-accent-green" : topic.mastery >= 60 ? "text-accent-amber" : "text-accent-red"
                      )}>
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
          </div>

          {/* Weak areas */}
          <div className="bg-surface-elevated border border-border-custom rounded-xl p-4 md:p-6">
            <h3 className="font-medium text-text-primary mb-3">Areas to Focus On</h3>
            <div className="space-y-2">
              {topicMastery
                .filter((t) => t.mastery < 70)
                .map((topic) => (
                  <Link
                    key={topic.topic}
                    href={`/dashboard/flashcards?topic=${topic.topic}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-surface hover:bg-surface-elevated border border-border-custom transition-all group"
                  >
                    <div>
                      <p className="text-sm text-text-primary">{topic.topic} Radiology</p>
                      <p className="text-xs text-text-secondary">
                        {100 - topic.mastery}% more to master
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-text-secondary group-hover:text-accent-cyan transition-colors" />
                  </Link>
                ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <div className="bg-surface-elevated border border-border-custom rounded-xl p-4 md:p-6">
            <h3 className="font-medium text-text-primary mb-4">Recent Quiz Performance</h3>
            <div className="space-y-3">
              {recentQuizzes.map((quiz, idx) => (
                <div
                  key={idx}
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
                    <span className={cn(
                      "text-sm font-mono w-12 text-right",
                      quiz.score >= 80 ? "text-accent-green" : quiz.score >= 60 ? "text-accent-amber" : "text-accent-red"
                    )}>
                      {quiz.score}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <div className="bg-surface-elevated border border-border-custom rounded-xl p-4 md:p-6">
            <h3 className="font-medium text-text-primary mb-4">Study Trends</h3>
            
            {/* Simple bar chart visualization */}
            <div className="h-48 flex items-end justify-around gap-2">
              {studyActivity.map((day, idx) => {
                const maxMinutes = Math.max(...studyActivity.map((d) => d.minutes));
                const height = maxMinutes > 0 ? (day.minutes / maxMinutes) * 100 : 0;

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                    <div
                      className="w-full bg-accent-cyan rounded-t-lg transition-all"
                      style={{ height: `${height}%`, minHeight: height > 0 ? "8px" : "0" }}
                    />
                    <span className="text-xs text-text-secondary">{DAYS_OF_WEEK[idx]}</span>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pt-4 border-t border-border-custom grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-lg font-bold text-text-primary">
                  {studyActivity.reduce((acc, d) => acc + d.minutes, 0)}
                </p>
                <p className="text-xs text-text-secondary">Total Minutes</p>
              </div>
              <div>
                <p className="text-lg font-bold text-text-primary">
                  {totalCardsReviewed}
                </p>
                <p className="text-xs text-text-secondary">Cards Reviewed</p>
              </div>
              <div>
                <p className="text-lg font-bold text-text-primary">
                  {totalQuizzesTaken}
                </p>
                <p className="text-xs text-text-secondary">Quizzes Taken</p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
