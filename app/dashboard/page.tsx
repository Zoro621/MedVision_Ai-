"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  CheckCircle,
  ChevronRight,
  Flame,
  Layers,
  Target,
  Zap,
} from "lucide-react";

import { TopicRadarChart } from "@/components/dashboard/charts/TopicRadarChart";
import { DailyChallengeBanner } from "@/components/dashboard/ui/DailyChallengeBanner";
import { ProgressBar, getProgressVariant } from "@/components/dashboard/ui/ProgressBar";
import { SkeletonCard } from "@/components/dashboard/ui/SkeletonCard";
import { StatCard } from "@/components/dashboard/ui/StatCard";
import { StreakCalendar } from "@/components/dashboard/ui/StreakCalendar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useDashboardStats } from "@/context/DashboardStatsContext";
import { listDecks, type FlashcardDeckSummary } from "@/lib/api/flashcards";
import { getGamificationSummary, type DailyChallenge } from "@/lib/api/gamification";
import { getDashboardUser } from "@/lib/dashboard/currentUser";
import { cn } from "@/lib/utils";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function DashboardOverviewPage() {
  const { user: authUser } = useAuth();
  const { stats, isLoading: statsLoading } = useDashboardStats();
  const [decks, setDecks] = useState<FlashcardDeckSummary[]>([]);
  const [dailyChallenge, setDailyChallenge] = useState<DailyChallenge | null>(null);
  const [deckError, setDeckError] = useState<string | null>(null);
  const [deckLoading, setDeckLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadDecks() {
      setDeckLoading(true);
      setDeckError(null);

      try {
        const nextDecks = await listDecks();
        if (!cancelled) {
          setDecks(nextDecks);
        }
      } catch (error) {
        if (!cancelled) {
          setDeckError(
            error instanceof Error ? error.message : "Failed to load deck data."
          );
        }
      } finally {
        if (!cancelled) {
          setDeckLoading(false);
        }
      }
    }

    void loadDecks();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    getGamificationSummary()
      .then((summary) => {
        if (!cancelled) {
          setDailyChallenge(summary.dailyChallenge);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDailyChallenge(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const user = getDashboardUser(authUser, stats);
  const loading = statsLoading || deckLoading;
  const topicMastery = stats?.topicMastery ?? [];
  const recentQuizzes = stats?.recentQuizzes ?? [];
  const topWeakArea = stats?.weakAreas[0];
  const priorityDecks = useMemo(
    () =>
      [...decks]
        .sort((left, right) => {
          if (right.dueCards !== left.dueCards) {
            return right.dueCards - left.dueCards;
          }
          return right.totalCards - left.totalCards;
        })
        .slice(0, 3),
    [decks]
  );

  if (loading) {
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
        <p className="text-accent-red mb-2">Unable to load your dashboard.</p>
        <p className="text-text-secondary text-sm">
          Refresh the page after signing in again.
        </p>
      </div>
    );
  }

  const radarTopics = topicMastery.slice(0, 6);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-[family-name:var(--font-syne)] font-bold text-text-primary">
          {getGreeting()}, {user.fullName.split(" ")[0]}.
        </h1>
        <p className="text-text-secondary mt-1">
          Here is your live study summary for today.
        </p>
      </div>

      {dailyChallenge && <DailyChallengeBanner challenge={dailyChallenge} />}

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
          value={stats.avgQuizScore}
          suffix="%"
          label="Avg Quiz Score"
          iconColor="text-accent-cyan"
        />
        <StatCard
          icon={Layers}
          value={stats.totalDueCards}
          label="Cards Due Today"
          iconColor="text-accent-red"
        />
      </div>

      <div className="bg-surface-elevated border border-border-custom rounded-xl p-4 md:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-accent-cyan mb-2">
              Priority Focus
            </p>
            {topWeakArea ? (
              <>
                <h2 className="text-xl font-semibold text-text-primary">
                  Strengthen {topWeakArea.topic} next
                </h2>
                <p className="text-text-secondary mt-1">
                  Current mastery is {topWeakArea.mastery}% with a weak-area score
                  of {topWeakArea.weakAreaScore}.
                </p>
              </>
            ) : (
              <>
                <h2 className="text-xl font-semibold text-text-primary">
                  Your learning loop is on track
                </h2>
                <p className="text-text-secondary mt-1">
                  Keep your streak active and continue reviewing due material to
                  build mastery.
                </p>
              </>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/dashboard/progress">
              <Button variant="outline" className="w-full sm:w-auto">
                View Progress
              </Button>
            </Link>
            <Link href="/dashboard/flashcards">
              <Button className="w-full sm:w-auto bg-accent-cyan text-background hover:bg-accent-cyan/90">
                Review Flashcards
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 bg-surface-elevated border border-border-custom rounded-xl p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-accent-cyan" />
              <h3 className="font-medium text-text-primary">Flashcards Due Today</h3>
            </div>
          </div>

          {deckError ? (
            <p className="text-sm text-accent-red">{deckError}</p>
          ) : priorityDecks.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border-custom p-6 text-center">
              <p className="text-text-primary font-medium">No published decks yet</p>
              <p className="text-sm text-text-secondary mt-1">
                Once decks are published, they will appear here for review.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {priorityDecks.map((deck) => {
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
                            {(deck.topic ?? "General") + " Radiology"}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-text-secondary group-hover:text-accent-cyan transition-colors" />
                      </div>
                      <div className="flex items-center gap-3">
                        <ProgressBar
                          value={deck.masteredCards}
                          max={Math.max(deck.totalCards, 1)}
                          variant={isComplete ? "green" : "cyan"}
                          size="sm"
                          className="flex-1"
                        />
                        <span
                          className={cn(
                            "text-xs font-mono",
                            isComplete ? "text-accent-green" : "text-text-secondary"
                          )}
                        >
                          {isComplete
                            ? "All caught up"
                            : `${deck.dueCards} / ${deck.totalCards} cards due`}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          <div className="mt-4">
            <Link href="/dashboard/flashcards">
              <Button variant="outline" className="w-full">
                View All Decks
              </Button>
            </Link>
          </div>
        </div>

        <div className="lg:col-span-2 bg-surface-elevated border border-border-custom rounded-xl p-4 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-accent-cyan" />
            <h3 className="font-medium text-text-primary">Recent Quizzes</h3>
          </div>

          {recentQuizzes.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border-custom p-6 text-center">
              <p className="text-text-primary font-medium">No quiz attempts yet</p>
              <p className="text-sm text-text-secondary mt-1">
                Start your first quiz to begin tracking performance.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentQuizzes.map((quiz, index) => {
                const variant = getProgressVariant(quiz.score);
                const needsReview = quiz.score < 70;

                return (
                  <div key={`${quiz.title}-${index}`} className="space-y-2">
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
                      <span
                        className={cn(
                          "text-xs font-mono",
                          variant === "green"
                            ? "text-accent-green"
                            : variant === "amber"
                              ? "text-accent-amber"
                              : "text-accent-red"
                        )}
                      >
                        {quiz.score}%
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary">
                      {quiz.daysAgo === 0 ? "Today" : `${quiz.daysAgo} days ago`}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4">
            <Link href="/dashboard/quizzes">
              <Button variant="outline" className="w-full">
                View All Quizzes
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="bg-surface-elevated border border-border-custom rounded-xl p-4 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-accent-cyan" />
          <h3 className="font-medium text-text-primary">Topic Mastery Overview</h3>
        </div>

        {topicMastery.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border-custom p-6 text-center">
            <p className="text-text-primary font-medium">No mastery data yet</p>
            <p className="text-sm text-text-secondary mt-1">
              Complete quizzes and flashcard reviews to populate this section.
            </p>
          </div>
        ) : (
          <>
            <div className="grid lg:grid-cols-2 gap-6 items-center">
              <TopicRadarChart data={radarTopics} />

              <div className="grid grid-cols-1 gap-3">
                {topicMastery.map((topic) => (
                  <div
                    key={topic.topic}
                    className="rounded-lg bg-surface border border-border-custom p-3"
                  >
                    <div className="flex items-center justify-between mb-2 gap-3">
                      <div>
                        <span className="text-sm text-text-primary">{topic.topic}</span>
                        <p className="text-xs text-text-secondary">
                          {topic.quizzes} quiz{topic.quizzes === 1 ? "" : "zes"} and{" "}
                          {topic.flashcardsDone}/{topic.flashcardsTotal} cards mastered
                        </p>
                      </div>
                      <span className="text-xs font-mono text-text-secondary">
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

            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border-custom">
              {topicMastery.map((topic) => (
                <Link
                  key={topic.topic}
                  href="/dashboard/progress"
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-mono transition-colors",
                    topic.mastery >= 80
                      ? "border-accent-green/30 bg-accent-green/10 text-accent-green"
                      : topic.mastery >= 50
                        ? "border-accent-amber/30 bg-accent-amber/10 text-accent-amber"
                        : "border-accent-red/30 bg-accent-red/10 text-accent-red"
                  )}
                >
                  <Target className="h-3.5 w-3.5" />
                  <span>{topic.topic}</span>
                  <span>{topic.mastery}%</span>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      <StreakCalendar streakDays={user.streakDays} nextMilestone={14} />
    </div>
  );
}
