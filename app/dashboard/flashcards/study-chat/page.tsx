"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  FileText,
  Flame,
  Layers,
  RotateCcw,
  X,
  Brain,
  AlertTriangle,
} from "lucide-react";

import { ProgressBar } from "@/components/dashboard/ui/ProgressBar";
import { Button } from "@/components/ui/button";
import { useDashboardStats } from "@/context/DashboardStatsContext";
import {
  submitReview,
  getDueCardsForChat,
  type FlashcardItem,
} from "@/lib/api/flashcards";
import { getActiveSession } from "@/lib/activeSession";
import { cn } from "@/lib/utils";

type Rating = "again" | "hard" | "good" | "easy";

const RATING_CONFIG: Record<
  Rating,
  { label: string; color: string; key: string }
> = {
  again: {
    label: "Again",
    color: "bg-accent-red hover:bg-accent-red/80",
    key: "1",
  },
  hard: {
    label: "Hard",
    color: "bg-accent-amber hover:bg-accent-amber/80",
    key: "2",
  },
  good: {
    label: "Good",
    color: "bg-accent-green hover:bg-accent-green/80",
    key: "3",
  },
  easy: {
    label: "Easy",
    color: "bg-accent-cyan hover:bg-accent-cyan/80",
    key: "4",
  },
};

function getCitation(card: FlashcardItem) {
  if (!card.sourceDocument && !card.sourcePage) {
    return null;
  }

  const parts = [card.sourceDocument ?? "Source"];
  if (card.sourcePage) {
    parts.push(`p.${card.sourcePage}`);
  }
  return parts.join(" - ");
}

export default function StudyChatFlashcardsPage() {
  const { refreshStats } = useDashboardStats();

  const [cards, setCards] = useState<FlashcardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionStreak, setSessionStreak] = useState(0);
  const [ratings, setRatings] = useState<Record<string, Rating>>({});
  const [isComplete, setIsComplete] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReloading, setIsReloading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadDueCards() {
      setLoading(true);
      setError(null);

      try {
        const chatSessionId = getActiveSession();
        if (!chatSessionId) {
          setError("No active chat session. Please start a chat first.");
          setLoading(false);
          return;
        }

        const dueCards = await getDueCardsForChat(chatSessionId);

        if (!cancelled) {
          setCards(dueCards);
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(
            nextError instanceof Error
              ? nextError.message
              : "Failed to load due cards."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDueCards();

    return () => {
      cancelled = true;
    };
  }, []);

  const currentCard = cards[currentIndex];
  const totalCards = cards.length;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isSubmitting || isComplete || !currentCard) {
        return;
      }

      if (!isFlipped) {
        if (event.key === " " || event.key === "Enter") {
          event.preventDefault();
          setIsFlipped(true);
        }
        return;
      }

      if (event.key === "1") void handleRate("again");
      if (event.key === "2") void handleRate("hard");
      if (event.key === "3") void handleRate("good");
      if (event.key === "4") void handleRate("easy");
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentCard, isComplete, isFlipped, isSubmitting]);

  const ratingCounts = Object.values(ratings).reduce(
    (accumulator, rating) => {
      accumulator[rating] += 1;
      return accumulator;
    },
    { again: 0, hard: 0, good: 0, easy: 0 } as Record<Rating, number>
  );

  async function handleRate(rating: Rating) {
    if (!currentCard || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const chatSessionId = getActiveSession();
      const result = await submitReview(
        currentCard.deckId,
        currentCard.id,
        rating,
        chatSessionId
      );

      setRatings((previous) => ({ ...previous, [currentCard.id]: rating }));
      setXpEarned((previous) => previous + result.xpEarned);
      setSessionStreak((previous) =>
        rating === "good" || rating === "easy" ? previous + 1 : 0
      );
      void refreshStats();

      if (currentIndex < totalCards - 1) {
        setCurrentIndex((value) => value + 1);
        setIsFlipped(false);
      } else {
        setIsComplete(true);
      }
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Failed to submit review."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function reloadDueCards() {
    setIsReloading(true);
    setError(null);

    try {
      const chatSessionId = getActiveSession();
      const dueCards = await getDueCardsForChat(chatSessionId);

      setCards(dueCards);
      setCurrentIndex(0);
      setIsFlipped(false);
      setSessionStreak(0);
      setRatings({});
      setIsComplete(false);
      setXpEarned(0);
      void refreshStats();
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Failed to refresh due cards."
      );
    } finally {
      setIsReloading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center -m-4 md:-m-6 lg:-m-8">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-accent-cyan border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-text-secondary">Loading flashcards...</p>
        </div>
      </div>
    );
  }

  if (error && cards.length === 0) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center -m-4 md:-m-6 lg:-m-8">
        <div className="text-center max-w-md px-4">
          <AlertTriangle className="h-12 w-12 text-accent-red mx-auto mb-4" />
          <p className="text-accent-red mb-2">{error}</p>
          <Link href="/dashboard/assistant">
            <Button variant="outline">Start a Chat</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center -m-4 md:-m-6 lg:-m-8 bg-background">
        <div className="max-w-xl w-full mx-4 text-center">
          <div className="w-20 h-20 rounded-full bg-accent-green/20 flex items-center justify-center mx-auto mb-6">
            <Check className="h-10 w-10 text-accent-green" />
          </div>

          <h1 className="text-2xl font-[family-name:var(--font-syne)] font-bold text-text-primary mb-2">
            Session Complete
          </h1>
          <p className="text-text-secondary mb-6">
            You reviewed {totalCards} card{totalCards === 1 ? "" : "s"} from your chat session.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {(Object.keys(RATING_CONFIG) as Rating[]).map((rating) => (
              <div
                key={rating}
                className="bg-surface-elevated border border-border-custom rounded-lg p-3"
              >
                <p className="text-lg font-bold text-text-primary">
                  {ratingCounts[rating]}
                </p>
                <p className="text-xs text-text-secondary capitalize">
                  {RATING_CONFIG[rating].label}
                </p>
              </div>
            ))}
          </div>

          <div className="bg-surface-elevated border border-border-custom rounded-xl p-4 mb-6">
            <div className="flex items-center justify-center gap-2 text-accent-green">
              <span className="text-2xl font-bold">+{xpEarned}</span>
              <span className="text-sm">XP earned</span>
            </div>
          </div>

          {error && (
            <div className="mb-6 rounded-xl border border-accent-red/30 bg-accent-red/10 p-4 text-sm text-accent-red">
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={() => void reloadDueCards()}
              className="flex-1"
              disabled={isReloading}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              {isReloading ? "Refreshing..." : "Refresh Due Cards"}
            </Button>
            <Link href="/dashboard/flashcards" className="flex-1">
              <Button className="w-full bg-accent-cyan text-background hover:bg-accent-cyan/90">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Flashcards
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center -m-4 md:-m-6 lg:-m-8 bg-background">
        <div className="max-w-lg w-full mx-4 text-center">
          <div className="w-20 h-20 rounded-full bg-accent-green/20 flex items-center justify-center mx-auto mb-6">
            <Check className="h-10 w-10 text-accent-green" />
          </div>
          <h1 className="text-2xl font-[family-name:var(--font-syne)] font-bold text-text-primary mb-2">
            All Caught Up
          </h1>
          <p className="text-text-secondary mb-6">
            All caught up for this chat session. Come back later when new cards are due.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={() => void reloadDueCards()}
              disabled={isReloading}
              className="flex-1"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              {isReloading ? "Checking..." : "Check Again"}
            </Button>
            <Link href="/dashboard/assistant" className="flex-1">
              <Button className="w-full bg-accent-cyan text-background hover:bg-accent-cyan/90">
                <Brain className="h-4 w-4 mr-2" />
                Start New Chat
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const citation = currentCard ? getCitation(currentCard) : null;

  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col -m-4 md:-m-6 lg:-m-8 bg-background">
      <div className="flex items-center justify-between p-4 border-b border-border-custom bg-surface">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/flashcards">
            <Button variant="ghost" size="icon">
              <X className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-sm font-medium text-text-primary flex items-center gap-2">
              <Brain className="h-4 w-4 text-accent-cyan" />
              Flashcards from Chat
            </h1>
            <p className="text-xs text-text-secondary">
              Card {currentIndex + 1} of {totalCards}
            </p>
          </div>
        </div>

        {sessionStreak > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-accent-green/20 rounded-full">
            <Flame className="h-4 w-4 text-accent-green" />
            <span className="text-sm font-mono text-accent-green">
              {sessionStreak} streak
            </span>
          </div>
        )}
      </div>

      <div className="px-4 pt-4 space-y-2">
        <ProgressBar
          value={currentIndex + 1}
          max={Math.max(totalCards, 1)}
          variant="cyan"
          size="sm"
        />
        <div className="flex items-center justify-between text-xs text-text-secondary">
          <span>{currentCard.topic ?? "General"} radiology</span>
          <span>{totalCards} cards in this session</span>
        </div>
        {error && (
          <div className="rounded-lg border border-accent-red/30 bg-accent-red/10 p-3 text-sm text-accent-red">
            {error}
          </div>
        )}
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div
          onClick={() => !isFlipped && setIsFlipped(true)}
          className={cn(
            "relative w-full max-w-xl aspect-[4/3] cursor-pointer perspective-1000",
            !isFlipped && "hover:scale-[1.02] transition-transform"
          )}
        >
          <div
            className={cn(
              "absolute inset-0 transition-transform duration-500 preserve-3d",
              isFlipped && "rotate-y-180"
            )}
            style={{
              transformStyle: "preserve-3d",
              transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
            }}
          >
            <div
              className="absolute inset-0 bg-surface-elevated border-2 border-accent-cyan rounded-2xl p-6 md:p-8 flex flex-col backface-hidden"
              style={{ backfaceVisibility: "hidden" }}
            >
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-xs font-mono text-accent-cyan mb-4 uppercase tracking-wider">
                    Prompt
                  </p>
                  <p className="text-lg md:text-xl text-text-primary">
                    {currentCard.front}
                  </p>
                </div>
              </div>

              <div className="text-center mt-4">
                <p className="text-sm text-text-secondary">
                  Tap or press space to reveal the answer
                </p>
              </div>

              {citation && (
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border-custom text-xs text-text-secondary">
                  <FileText className="h-4 w-4" />
                  <span>{citation}</span>
                </div>
              )}
            </div>

            <div
              className="absolute inset-0 bg-surface-elevated border-2 border-accent-green rounded-2xl p-6 md:p-8 flex flex-col rotate-y-180 backface-hidden"
              style={{
                backfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
              }}
            >
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-xs font-mono text-accent-green mb-4 uppercase tracking-wider">
                    Answer
                  </p>
                  <p className="text-lg md:text-xl text-text-primary whitespace-pre-wrap">
                    {currentCard.back}
                  </p>
                </div>
              </div>

              {citation && (
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border-custom text-xs text-text-secondary">
                  <FileText className="h-4 w-4" />
                  <span>{citation}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {isFlipped && (
        <div className="p-4 border-t border-border-custom bg-surface">
          <p className="text-xs text-text-secondary text-center mb-3">
            How well did you know this?
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-xl mx-auto">
            {(Object.entries(RATING_CONFIG) as [Rating, (typeof RATING_CONFIG)[Rating]][]).map(
              ([rating, config]) => (
                <Button
                  key={rating}
                  onClick={() => void handleRate(rating)}
                  disabled={isSubmitting}
                  className={cn("flex-col h-auto py-3 text-background", config.color)}
                >
                  <span className="text-sm font-medium">{config.label}</span>
                  <span className="text-[10px] opacity-70">({config.key})</span>
                </Button>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
