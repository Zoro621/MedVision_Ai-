"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
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
import { ProgressBar, getProgressVariant } from "@/components/dashboard/ui/ProgressBar";
import { MOCK_QUIZZES, MOCK_QUIZ_QUESTIONS } from "@/lib/mockData/dashboard";
import { cn } from "@/lib/utils";
import type { QuizQuestion } from "@/types/dashboard";

interface QuizResult {
  score: number;
  correct: number;
  total: number;
  answers: Record<string, QuizQuestion["correctAnswer"]>;
  timeTaken: number;
}

export default function QuizResultsPage() {
  const params = useParams();
  const quizId = params.quizId as string;

  const quiz = MOCK_QUIZZES.find((q) => q.id === quizId);
  const questions = MOCK_QUIZ_QUESTIONS;

  const [result, setResult] = useState<QuizResult | null>(null);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());

  useEffect(() => {
    const stored = sessionStorage.getItem(`quiz_result_${quizId}`);
    if (stored) {
      setResult(JSON.parse(stored));
    } else {
      // Fallback mock result
      setResult({
        score: 80,
        correct: 8,
        total: 10,
        answers: {},
        timeTaken: 420,
      });
    }
  }, [quizId]);

  const toggleQuestion = (id: string) => {
    setExpandedQuestions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getScoreMessage = (score: number) => {
    if (score >= 90) return { title: "Excellent!", subtitle: "Outstanding performance" };
    if (score >= 80) return { title: "Great job!", subtitle: "Keep up the good work" };
    if (score >= 70) return { title: "Good effort!", subtitle: "Room for improvement" };
    if (score >= 60) return { title: "Decent attempt", subtitle: "Review the material" };
    return { title: "Keep practicing", subtitle: "Don&apos;t give up" };
  };

  if (!result) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-accent-cyan border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-text-secondary">Loading results...</p>
        </div>
      </div>
    );
  }

  const { title, subtitle } = getScoreMessage(result.score);
  const variant = getProgressVariant(result.score);
  const xpEarned = result.correct * 5 + (result.score >= 80 ? 20 : 0);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Back link */}
      <Link
        href="/dashboard/quizzes"
        className="inline-flex items-center text-sm text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Quizzes
      </Link>

      {/* Score card */}
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

        {/* Score display */}
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

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-accent-green">{result.correct}</p>
            <p className="text-xs text-text-secondary">Correct</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-accent-red">{result.total - result.correct}</p>
            <p className="text-xs text-text-secondary">Incorrect</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-text-primary">{formatTime(result.timeTaken)}</p>
            <p className="text-xs text-text-secondary">Time</p>
          </div>
        </div>

        {/* XP earned */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent-green/20 rounded-full text-accent-green">
          <Sparkles className="h-4 w-4" />
          <span className="font-medium">+{xpEarned} XP earned</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Link href={`/dashboard/quizzes/${quizId}/take`} className="flex-1">
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

      {/* Question Review */}
      <div>
        <h2 className="text-lg font-medium text-text-primary mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-accent-cyan" />
          Question Review
        </h2>

        <div className="space-y-3">
          {questions.map((question, idx) => {
            const userAnswer = result.answers[question.id];
            const isCorrect = userAnswer === question.correctAnswer;
            const isExpanded = expandedQuestions.has(question.id);

            return (
              <div
                key={question.id}
                className={cn(
                  "border rounded-xl overflow-hidden transition-all",
                  isCorrect ? "border-accent-green/30" : "border-accent-red/30"
                )}
              >
                <button
                  onClick={() => toggleQuestion(question.id)}
                  className="w-full p-4 flex items-center justify-between bg-surface-elevated hover:bg-surface transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isCorrect ? (
                      <CheckCircle className="h-5 w-5 text-accent-green shrink-0" />
                    ) : (
                      <XCircle className="h-5 w-5 text-accent-red shrink-0" />
                    )}
                    <span className="text-sm text-text-primary text-left">
                      Q{idx + 1}: {question.questionText}
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
                      const isUserAnswer = userAnswer === option.label;
                      const isCorrectOption = question.correctAnswer === option.label;

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

                    {/* Explanation */}
                    {question.explanation && (
                      <div className="mt-4 p-3 rounded-lg bg-accent-cyan/10 border border-accent-cyan/20">
                        <p className="text-xs font-mono text-accent-cyan mb-1">Explanation</p>
                        <p className="text-sm text-text-primary">{question.explanation}</p>
                        {question.sourceDocument && (
                          <p className="text-xs text-text-secondary mt-2">
                            Source: {question.sourceDocument} · p.{question.sourcePage}
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
