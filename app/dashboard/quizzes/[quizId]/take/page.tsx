"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { X, Clock, ArrowRight, ArrowLeft, Flag, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/dashboard/ui/ProgressBar";
import { MOCK_QUIZZES, MOCK_QUIZ_QUESTIONS, delay } from "@/lib/mockData/dashboard";
import { cn } from "@/lib/utils";
import type { QuizQuestion } from "@/types/dashboard";

export default function TakeQuizPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.quizId as string;

  const quiz = MOCK_QUIZZES.find((q) => q.id === quizId);
  const questions = MOCK_QUIZ_QUESTIONS;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState((quiz?.timeLimit || 10) * 60);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(answers).length;

  // Timer
  useEffect(() => {
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
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSelectAnswer = (optionIndex: number) => {
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: optionIndex }));
  };

  const handleToggleFlag = () => {
    setFlaggedQuestions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(currentQuestion.id)) {
        newSet.delete(currentQuestion.id);
      } else {
        newSet.add(currentQuestion.id);
      }
      return newSet;
    });
  };

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    await delay(500);
    
    // Calculate score
    let correct = 0;
    questions.forEach((q) => {
      if (answers[q.id] === q.correctAnswer) {
        correct++;
      }
    });
    const score = Math.round((correct / totalQuestions) * 100);

    // Store results in sessionStorage for results page
    sessionStorage.setItem(
      `quiz_result_${quizId}`,
      JSON.stringify({
        score,
        correct,
        total: totalQuestions,
        answers,
        timeTaken: (quiz?.timeLimit || 10) * 60 - timeLeft,
      })
    );

    router.push(`/dashboard/quizzes/${quizId}/results`);
  }, [answers, questions, totalQuestions, quiz, timeLeft, quizId, router]);

  const isLowTime = timeLeft < 60;

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
            <h1 className="text-sm font-medium text-text-primary">
              {quiz?.title || "Quiz"}
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
        <ProgressBar
          value={answeredCount}
          max={totalQuestions}
          variant="cyan"
          size="sm"
        />
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
                    : flaggedQuestions.has(q.id)
                      ? "bg-accent-amber/20 text-accent-amber"
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
            <div className="flex items-start justify-between mb-4">
              <span className="text-xs font-mono text-accent-cyan">
                Question {currentIndex + 1}
              </span>
              <button
                onClick={handleToggleFlag}
                className={cn(
                  "p-1.5 rounded transition-colors",
                  flaggedQuestions.has(currentQuestion.id)
                    ? "text-accent-amber"
                    : "text-text-secondary hover:text-accent-amber"
                )}
              >
                <Flag className="h-4 w-4" />
              </button>
            </div>
            <p className="text-lg text-text-primary">{currentQuestion.question}</p>
          </div>

          {/* Options */}
          <div className="space-y-3">
            {currentQuestion.options.map((option, idx) => {
              const isSelected = answers[currentQuestion.id] === idx;
              const optionLetter = String.fromCharCode(65 + idx);

              return (
                <button
                  key={idx}
                  onClick={() => handleSelectAnswer(idx)}
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
                        isSelected
                          ? "bg-accent-cyan text-background"
                          : "bg-surface text-text-secondary"
                      )}
                    >
                      {optionLetter}
                    </span>
                    <span className="text-text-primary pt-1">{option}</span>
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
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentIndex === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          {currentIndex < totalQuestions - 1 ? (
            <Button
              onClick={handleNext}
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
              {isSubmitting ? (
                <>Submitting...</>
              ) : (
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
