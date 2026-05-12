"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Trophy,
  XCircle,
  CheckCircle,
  ArrowLeft,
  RotateCcw,
  Share2,
  FileText,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  ProgressBar,
  getProgressVariant,
} from "@/components/dashboard/ui/ProgressBar";
import { cn } from "@/lib/utils";
import {
  getQuizAttemptDetail,
  type QuizAttemptDetail,
} from "@/lib/api/quizzes";

function QuizResultsPageSkeleton() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-accent-cyan border-t-transparent" />
        <p className="text-text-secondary">Loading results...</p>
      </div>
    </div>
  );
}

function QuizResultsPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const quizId = params.quizId as string;
  const attemptId = searchParams.get("attemptId");
  const chatSessionId = searchParams.get("chatSessionId");

  const [result, setResult] = useState<QuizAttemptDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    if (!attemptId) {
      setError("Missing attempt reference.");
      return;
    }

    getQuizAttemptDetail(attemptId)
      .then(setResult)
      .catch((err: Error) => setError(err.message));
  }, [attemptId]);

  const toggleQuestion = (id: string) => {
    setExpandedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const formatTime = (seconds?: number) => {
    const safeSeconds = seconds ?? 0;
    const mins = Math.floor(safeSeconds / 60);
    const secs = safeSeconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getScoreMessage = (score: number) => {
    if (score >= 90) {
      return { title: "Excellent!", subtitle: "Outstanding performance" };
    }
    if (score >= 80) {
      return { title: "Great job!", subtitle: "Keep up the good work" };
    }
    if (score >= 70) {
      return { title: "Good effort!", subtitle: "Room for improvement" };
    }
    if (score >= 60) {
      return { title: "Decent attempt", subtitle: "Review the material" };
    }
    return { title: "Keep practicing", subtitle: "Don't give up" };
  };

  if (error) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <Link
          href="/dashboard/quizzes"
          className="inline-flex items-center text-sm text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Quizzes
        </Link>
        <div className="bg-surface-elevated border border-border-custom rounded-2xl p-8 text-center">
          <p className="text-accent-red mb-4">{error}</p>
          <Link
            href={
              chatSessionId
                ? `/dashboard/quizzes/${quizId}/take?chatSessionId=${encodeURIComponent(chatSessionId)}`
                : `/dashboard/quizzes/${quizId}/take`
            }
          >
            <Button variant="outline">Retake Quiz</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!result) return <QuizResultsPageSkeleton />;

  const { title, subtitle } = getScoreMessage(result.score);
  const variant = getProgressVariant(result.score);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Link
        href="/dashboard/quizzes"
        className="inline-flex items-center text-sm text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Quizzes
      </Link>

      <div className="bg-surface-elevated border border-border-custom rounded-2xl p-6 md:p-8 text-center">
        <div
          className={cn(
            "w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4",
            result.score >= 70 ? "bg-accent-green/20" : "bg-accent-red/20"
          )}
        >
          {result.score >= 70 ? (
            <Trophy
              className={cn(
                "h-12 w-12",
                result.score >= 90 ? "text-accent-amber" : "text-accent-green"
              )}
            />
          ) : (
            <XCircle className="h-12 w-12 text-accent-red" />
          )}
        </div>

        <h1 className="text-2xl md:text-3xl font-[family-name:var(--font-syne)] font-bold text-text-primary mb-1">
          {title}
        </h1>
        <p className="text-text-secondary mb-6">{subtitle}</p>

        <div className="flex items-center justify-center gap-2 mb-4">
          <span
            className={cn(
              "text-5xl font-bold font-mono",
              variant === "green"
                ? "text-accent-green"
                : variant === "amber"
                  ? "text-accent-amber"
                  : "text-accent-red"
            )}
          >
            {result.score}%
          </span>
        </div>

        <ProgressBar
          value={result.score}
          max={100}
          variant={variant}
          size="lg"
          className="max-w-xs mx-auto mb-6"
        />

        <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-accent-green">
              {result.correctCount}
            </p>
            <p className="text-xs text-text-secondary">Correct</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-accent-red">
              {result.totalCount - result.correctCount}
            </p>
            <p className="text-xs text-text-secondary">Incorrect</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-text-primary">
              {formatTime(result.timeTakenSeconds)}
            </p>
            <p className="text-xs text-text-secondary">Time</p>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent-green/20 rounded-full text-accent-green">
          <Sparkles className="h-4 w-4" />
          <span className="font-medium">+{result.xpEarned} XP earned</span>
        </div>
      </div>

      <div className="flex gap-3">
        <Link
          href={
            chatSessionId
              ? `/dashboard/quizzes/${quizId}/take?chatSessionId=${encodeURIComponent(chatSessionId)}`
              : `/dashboard/quizzes/${quizId}/take`
          }
          className="flex-1"
        >
          <Button variant="outline" className="w-full">
            <RotateCcw className="h-4 w-4 mr-2" />
            Retake Quiz
          </Button>
        </Link>
        <Button variant="outline" className="flex-1">
          <Share2 className="h-4 w-4 mr-2" />
          Share Result
        </Button>
      </div>

      <div>
        <h2 className="text-lg font-medium text-text-primary mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-accent-cyan" />
          Question Review
        </h2>

        <div className="space-y-3">
          {result.questions.map((question, index) => {
            const isExpanded = expandedQuestions.has(question.questionId);

            return (
              <div
                key={question.questionId}
                className={cn(
                  "border rounded-xl overflow-hidden transition-all",
                  question.isCorrect
                    ? "border-accent-green/30"
                    : "border-accent-red/30"
                )}
              >
                <button
                  onClick={() => toggleQuestion(question.questionId)}
                  className="w-full p-4 flex items-center justify-between bg-surface-elevated hover:bg-surface transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {question.isCorrect ? (
                      <CheckCircle className="h-5 w-5 text-accent-green shrink-0" />
                    ) : (
                      <XCircle className="h-5 w-5 text-accent-red shrink-0" />
                    )}
                    <span className="text-sm text-text-primary text-left">
                      Q{index + 1}: {question.questionText}
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-text-secondary shrink-0" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-text-secondary shrink-0" />
                  )}
                </button>

                {isExpanded && (
                  <div className="p-4 bg-surface border-t border-border-custom space-y-3">
                    {question.options.map((option) => {
                      const isUserAnswer =
                        question.selectedAnswer === option.label;
                      const isCorrectOption =
                        question.correctAnswer === option.label;

                      return (
                        <div
                          key={option.label}
                          className={cn(
                            "p-3 rounded-lg flex items-start gap-3",
                            isCorrectOption
                              ? "bg-accent-green/10 border border-accent-green/30"
                              : isUserAnswer
                                ? "bg-accent-red/10 border border-accent-red/30"
                                : "bg-surface-elevated"
                          )}
                        >
                          <span
                            className={cn(
                              "flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium shrink-0",
                              isCorrectOption
                                ? "bg-accent-green text-background"
                                : isUserAnswer
                                  ? "bg-accent-red text-background"
                                  : "bg-surface text-text-secondary"
                            )}
                          >
                            {option.label}
                          </span>
                          <span
                            className={cn(
                              "text-sm",
                              isCorrectOption
                                ? "text-accent-green"
                                : isUserAnswer
                                  ? "text-accent-red"
                                  : "text-text-secondary"
                            )}
                          >
                            {option.text}
                          </span>
                        </div>
                      );
                    })}

                    {question.explanation && (
                      <div className="mt-4 p-3 rounded-lg bg-accent-cyan/10 border border-accent-cyan/20">
                        <p className="text-xs font-mono text-accent-cyan mb-1">
                          Explanation
                        </p>
                        <p className="text-sm text-text-primary">
                          {question.explanation}
                        </p>
                        {question.sourceDocument && (
                          <p className="text-xs text-text-secondary mt-2">
                            Source: {question.sourceDocument} · p.
                            {question.sourcePage}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function QuizResultsPage() {
  return (
    <Suspense fallback={<QuizResultsPageSkeleton />}>
      <QuizResultsPageContent />
    </Suspense>
  );
}
