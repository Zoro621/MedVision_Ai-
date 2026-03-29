"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Filter, Plus, BookOpen, Clock, Target, Brain, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProgressBar, getProgressVariant } from "@/components/dashboard/ui/ProgressBar";
import { EmptyState } from "@/components/dashboard/ui/EmptyState";
import { SkeletonCard } from "@/components/dashboard/ui/SkeletonCard";
import { MOCK_QUIZZES, delay } from "@/lib/mockData/dashboard";
import { cn } from "@/lib/utils";
import type { RadiologyTopic, Quiz } from "@/types/dashboard";

const TOPIC_COLORS: Record<RadiologyTopic, string> = {
  Chest: "bg-accent-cyan",
  Neuro: "bg-accent-purple",
  MSK: "bg-accent-amber",
  Abdominal: "bg-accent-green",
  Cardiac: "bg-accent-red",
  Paediatric: "bg-pink-500",
  Interventional: "bg-orange-500",
};

const DIFFICULTY_BADGES: Record<Quiz["difficulty"], string> = {
  Beginner: "bg-accent-green/20 text-accent-green",
  Intermediate: "bg-accent-amber/20 text-accent-amber",
  Advanced: "bg-accent-red/20 text-accent-red",
};

export default function QuizzesPage() {
  const [loading, setLoading] = useState(true);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [activeFilter, setActiveFilter] = useState<RadiologyTopic | "all">("all");

  useEffect(() => {
    delay(800).then(() => {
      setQuizzes(MOCK_QUIZZES);
      setLoading(false);
    });
  }, []);

  const filteredQuizzes =
    activeFilter === "all" ? quizzes : quizzes.filter((q) => q.topic === activeFilter);

  const topics: (RadiologyTopic | "all")[] = ["all", "Chest", "Neuro", "MSK", "Abdominal", "Cardiac"];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-surface-elevated rounded animate-pulse" />
            <div className="h-5 w-80 bg-surface-elevated rounded animate-pulse" />
          </div>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-[family-name:var(--font-syne)] font-bold text-text-primary flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-accent-cyan" />
            Quiz Center
          </h1>
          <p className="text-text-secondary mt-1">
            Test your knowledge with AI-generated quizzes.
          </p>
        </div>
        <Button className="bg-accent-cyan text-background hover:bg-accent-cyan/90">
          <Plus className="h-4 w-4 mr-2" />
          Generate Quiz
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {topics.map((topic) => (
          <button
            key={topic}
            onClick={() => setActiveFilter(topic)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
              activeFilter === topic
                ? "bg-accent-cyan text-background"
                : "bg-surface-elevated text-text-secondary hover:text-text-primary"
            )}
          >
            {topic === "all" ? "All Topics" : topic}
          </button>
        ))}
      </div>

      {/* Quiz Grid */}
      {filteredQuizzes.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No quizzes yet"
          description="Generate a quiz from your uploaded materials to start testing your knowledge."
          action={{ label: "Generate Quiz", onClick: () => {} }}
        />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredQuizzes.map((quiz) => {
            const topicColor = TOPIC_COLORS[quiz.topic] || "bg-accent-cyan";
            const hasAttempts = quiz.bestScore !== undefined;

            return (
              <div
                key={quiz.id}
                className="bg-surface-elevated border border-border-custom rounded-xl overflow-hidden hover:shadow-lg hover:shadow-accent-cyan/5 hover:-translate-y-1 transition-all group"
              >
                {/* Topic stripe */}
                <div className={cn("h-1.5", topicColor)} />

                <div className="p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-medium text-text-primary group-hover:text-accent-cyan transition-colors line-clamp-2">
                        {quiz.title}
                      </h3>
                      <p className="text-xs text-text-secondary mt-0.5">{quiz.topic} Radiology</p>
                    </div>
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full text-xs font-medium capitalize shrink-0 ml-2",
                        DIFFICULTY_BADGES[quiz.difficulty]
                      )}
                    >
                      {quiz.difficulty}
                    </span>
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center gap-4 text-xs text-text-secondary mb-4">
                    <div className="flex items-center gap-1">
                      <Target className="h-3.5 w-3.5" />
                      <span>{quiz.questionCount} Qs</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{quiz.estimatedMinutes} min</span>
                    </div>
                    {quiz.isNew && (
                      <div className="flex items-center gap-1 text-accent-cyan">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>New</span>
                      </div>
                    )}
                  </div>

                  {/* Best score */}
                  {hasAttempts && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-text-secondary">Best score</span>
                        <span
                          className={cn(
                            "font-mono",
                            quiz.bestScore! >= 80 ? "text-accent-green" : quiz.bestScore! >= 60 ? "text-accent-amber" : "text-accent-red"
                          )}
                        >
                          {quiz.bestScore}%
                        </span>
                      </div>
                      <ProgressBar
                        value={quiz.bestScore!}
                        max={100}
                        variant={getProgressVariant(quiz.bestScore!)}
                        size="sm"
                      />
                    </div>
                  )}

                  {/* Action */}
                  <Link href={`/dashboard/quizzes/${quiz.id}/take`}>
                    <Button
                      variant={hasAttempts ? "outline" : "default"}
                      className={cn(
                        "w-full",
                        !hasAttempts && "bg-accent-cyan text-background hover:bg-accent-cyan/90"
                      )}
                    >
                      {hasAttempts ? "Retake Quiz" : "Start Quiz"}
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
