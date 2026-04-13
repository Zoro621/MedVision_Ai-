"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { X, Clock, ArrowRight, ArrowLeft, CheckCircle, Brain, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/dashboard/ui/ProgressBar";
import { generateQuiz, submitQuiz, type QuizDetail, type QuizSubmitAnswer, type QuizSubmitResult } from "@/lib/api/quizzes";
import { getActiveSession } from "@/lib/activeSession";
import { cn } from "@/lib/utils";
import { useDashboardStats } from "@/context/DashboardStatsContext";

export default function GenerateQuizPage() {
  const router = useRouter();
  const { refreshStats } = useDashboardStats();

  const [quiz, setQuiz] = useState<QuizDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(600);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<QuizSubmitResult | null>(null);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    const chatSessionId = getActiveSession();
    if (!chatSessionId) {
      setError("No active chat session. Please start a chat first.");
      setLoading(false);
      return;
    }

    generateQuiz(chatSessionId, 10)
      .then((q) => {
        setQuiz(q);
        setTimeLeft(q.estimatedMinutes * 60);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!quiz || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const answerList: QuizSubmitAnswer[] = Object.entries(answers).map(([questionId, selectedAnswer]) => ({
        questionId,
        selectedAnswer,
      }));
      const chatSessionId = getActiveSession();
      const quizResult = await submitQuiz(
        quiz.id,
        answerList,
        quiz.estimatedMinutes * 60 - timeLeft,
        chatSessionId
      );
      setResult(quizResult);
      setShowResults(true);
      await refreshStats();
    } catch (e: any) {
      setError(e.message);
      setIsSubmitting(false);
    }
  }, [quiz, isSubmitting, answers, timeLeft, refreshStats]);

  useEffect(() => {
    if (showResults || !quiz) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [handleSubmit, showResults, quiz]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-accent-cyan border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-text-secondary">Generating quiz from chat session...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertTriangle className="h-12 w-12 text-accent-red mx-auto mb-4" />
          <p className="text-accent-red mb-4">{error}</p>
          <Link href="/dashboard/assistant">
            <Button variant="outline">Start a Chat</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (showResults && result) {
    return <QuizResults result={result} onRestart={() => router.push("/dashboard/quizzes/generate")} />;
  }

  if (!quiz) return null;

  const questions = quiz.questions;
  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(answers).length;
  const isLowTime = timeLeft < 60;

  const handleSelectAnswer = (label: string) => {
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: label }));
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col -m-4 md:-m-6 lg:-m-8 bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border-custom bg-surface">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/quizzes">
            <Button variant="ghost" size="icon">
              <X className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-sm font-medium text-text-primary flex items-center gap-2">
              <Brain className="h-4 w-4 text-accent-cyan" />
              Quiz from Chat
            </h1>
            <p className="text-xs text-text-secondary">
              Question {currentIndex + 1} of {totalQuestions}
            </p>
          </div>
        </div>

        {/* Timer */}
        <div
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono text-sm",
            isLowTime
              ? "bg-accent-red/20 text-accent-red animate-pulse"
              : "bg-surface-elevated text-text-primary"
          )}
        >
          <Clock className={cn("h-4 w-4", isLowTime && "text-accent-red")} />
          {formatTime(timeLeft)}
        </div>
      </div>

      {/* Progress */}
      <div className="px-4 pt-4">
        <ProgressBar value={answeredCount} max={totalQuestions} variant="cyan" size="sm" />
        <p className="text-xs text-text-secondary mt-1 text-right">
          {answeredCount} of {totalQuestions} answered
        </p>
      </div>

      {/* Question navigator */}
      <div className="px-4 pt-2">
        <div className="flex flex-wrap gap-2">
          {questions.map((q, i) => (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(i)}
              className={cn(
                "w-8 h-8 rounded-lg text-xs font-mono flex items-center justify-center transition-all",
                i === currentIndex
                  ? "bg-accent-cyan text-background"
                  : answers[q.id] !== undefined
                    ? "bg-accent-green/20 text-accent-green"
                    : "bg-surface-elevated text-text-secondary hover:bg-surface"
              )}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Question Content */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          {/* Question */}
          <div className="bg-surface-elevated border border-border-custom rounded-xl p-6 mb-4">
            <span className="text-xs font-mono text-accent-cyan">Question {currentIndex + 1}</span>
            <p className="text-lg text-text-primary mt-2">{currentQuestion.questionText}</p>
          </div>

          {/* Options */}
          <div className="space-y-3">
            {currentQuestion.options.map((option) => {
              const isSelected = answers[currentQuestion.id] === option.label;
              return (
                <button
                  key={option.label}
                  onClick={() => handleSelectAnswer(option.label)}
                  className={cn(
                    "w-full text-left p-4 rounded-xl border-2 transition-all",
                    isSelected
                      ? "border-accent-cyan bg-accent-cyan/10"
                      : "border-border-custom bg-surface-elevated hover:border-accent-cyan/50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium shrink-0",
                        isSelected ? "bg-accent-cyan text-background" : "bg-surface text-text-secondary"
                      )}
                    >
                      {option.label}
                    </span>
                    <span className="text-text-primary pt-1">{option.text}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="p-4 border-t border-border-custom bg-surface">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <Button variant="outline" onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))} disabled={currentIndex === 0}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          {currentIndex < totalQuestions - 1 ? (
            <Button
              onClick={() => setCurrentIndex((i) => Math.min(totalQuestions - 1, i + 1))}
              className="bg-accent-cyan text-background hover:bg-accent-cyan/90"
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-accent-green text-background hover:bg-accent-green/90"
            >
              {isSubmitting ? "Submitting..." : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Submit Quiz
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function QuizResults({ result, onRestart }: { result: QuizSubmitResult; onRestart: () => void }) {
  const getScoreMessage = (score: number) => {
    if (score >= 90) return { title: "Excellent!", subtitle: "Outstanding performance" };
    if (score >= 80) return { title: "Great job!", subtitle: "Keep up the good work" };
    if (score >= 70) return { title: "Good effort!", subtitle: "Room for improvement" };
    if (score >= 60) return { title: "Decent attempt", subtitle: "Review the material" };
    return { title: "Keep practicing", subtitle: "Don't give up" };
  };

  const { title, subtitle } = getScoreMessage(result.score);
  const variant = result.score >= 80 ? "green" : result.score >= 60 ? "amber" : "red";

  return (
    <div className="space-y-6 max-w-3xl mx-auto p-4">
      <Link
        href="/dashboard/quizzes"
        className="inline-flex items-center text-sm text-text-secondary hover:text-text-primary"
      >
        Back to Quizzes
      </Link>

      <div className="bg-surface-elevated border border-border-custom rounded-2xl p-6 md:p-8 text-center">
        <h1 className="text-2xl md:text-3xl font-[family-name:var(--font-syne)] font-bold text-text-primary mb-1">
          {title}
        </h1>
        <p className="text-text-secondary mb-6">{subtitle}</p>

        <div className="flex items-center justify-center gap-2 mb-4">
          <span className={cn("text-5xl font-bold font-mono", variant === "green" ? "text-accent-green" : variant === "amber" ? "text-accent-amber" : "text-accent-red")}>
            {result.score}%
          </span>
        </div>

        <ProgressBar value={result.score} max={100} variant={variant} size="lg" className="max-w-xs mx-auto mb-6" />

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
            <p className="text-2xl font-bold text-text-primary">{result.total}</p>
            <p className="text-xs text-text-secondary">Total</p>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent-green/20 rounded-full text-accent-green">
          <span className="font-medium">+{result.xpEarned} XP earned</span>
        </div>
      </div>

      {/* Weak Topics */}
      {result.wrongTopics && result.wrongTopics.length > 0 && (
        <div className="bg-surface-elevated border border-border-custom rounded-xl p-6">
          <h2 className="text-lg font-medium text-text-primary mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-accent-amber" />
            Areas to Review
          </h2>
          <div className="flex flex-wrap gap-2">
            {result.wrongTopics.map((topic) => (
              <span key={topic} className="px-3 py-1.5 rounded-full bg-accent-amber/20 text-accent-amber text-sm">
                {topic}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Wrong Questions */}
      <div className="bg-surface-elevated border border-border-custom rounded-xl p-6">
        <h2 className="text-lg font-medium text-text-primary mb-4">Question Review</h2>
        <div className="space-y-3">
          {result.questions.map((question, index) => {
            const isCorrect = question.correctAnswer === question.options.find((o) => o.label === question.options[0].label)?.label;
            const userAnswer = question.options.find((o) => o.label === question.options[0].label)?.label;
            
            return (
              <div
                key={question.id}
                className={cn("border rounded-xl p-4", isCorrect ? "border-accent-green/30 bg-accent-green/5" : "border-accent-red/30 bg-accent-red/5")}
              >
                <p className="text-sm text-text-primary mb-2">
                  Q{index + 1}: {question.questionText}
                </p>
                <div className="text-xs text-text-secondary">
                  Correct: <span className="text-accent-green font-medium">{question.correctAnswer}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Button onClick={onRestart} className="w-full bg-accent-cyan text-background hover:bg-accent-cyan/90">
        Generate New Quiz
      </Button>
    </div>
  );
}
