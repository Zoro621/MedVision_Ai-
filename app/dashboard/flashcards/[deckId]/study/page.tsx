"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { X, Brain, FileText, Flame, Check, RotateCcw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/dashboard/ui/ProgressBar";
import { MOCK_DECKS, MOCK_FLASHCARDS, delay } from "@/lib/mockData/dashboard";
import { cn } from "@/lib/utils";

type Rating = "again" | "hard" | "good" | "easy";

const RATING_CONFIG: Record<Rating, { label: string; icon: string; color: string; key: string }> = {
  again: { label: "Again", icon: "😰", color: "bg-accent-red hover:bg-accent-red/80", key: "1" },
  hard: { label: "Hard", icon: "😕", color: "bg-accent-amber hover:bg-accent-amber/80", key: "2" },
  good: { label: "Good", icon: "🙂", color: "bg-accent-green hover:bg-accent-green/80", key: "3" },
  easy: { label: "Easy", icon: "😊", color: "bg-accent-cyan hover:bg-accent-cyan/80", key: "4" },
};

export default function FlashcardStudyPage() {
  const params = useParams();
  const router = useRouter();
  const deckId = params.deckId as string;

  const deck = MOCK_DECKS.find((d) => d.id === deckId);
  const cards = MOCK_FLASHCARDS[deckId] || MOCK_FLASHCARDS["deck_001"];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionStreak, setSessionStreak] = useState(0);
  const [ratings, setRatings] = useState<Record<string, Rating>>({});
  const [isComplete, setIsComplete] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);

  const currentCard = cards[currentIndex];
  const totalCards = cards.length;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isFlipped) {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          setIsFlipped(true);
        }
      } else {
        if (e.key === "1") handleRate("again");
        if (e.key === "2") handleRate("hard");
        if (e.key === "3") handleRate("good");
        if (e.key === "4") handleRate("easy");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFlipped, currentIndex]);

  const handleRate = (rating: Rating) => {
    setRatings((prev) => ({ ...prev, [currentCard.id]: rating }));
    
    if (rating === "good" || rating === "easy") {
      setSessionStreak((s) => s + 1);
      setXpEarned((x) => x + (rating === "easy" ? 5 : 4));
    } else {
      setSessionStreak(0);
      setXpEarned((x) => x + 2);
    }

    if (currentIndex < totalCards - 1) {
      setCurrentIndex((i) => i + 1);
      setIsFlipped(false);
    } else {
      setIsComplete(true);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setSessionStreak(0);
    setRatings({});
    setIsComplete(false);
    setXpEarned(0);
  };

  if (isComplete) {
    const ratingCounts = Object.values(ratings).reduce(
      (acc, r) => {
        acc[r]++;
        return acc;
      },
      { again: 0, hard: 0, good: 0, easy: 0 } as Record<Rating, number>
    );

    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center -m-4 md:-m-6 lg:-m-8 bg-background">
        <div className="max-w-md w-full mx-4 text-center">
          <div className="w-20 h-20 rounded-full bg-accent-green/20 flex items-center justify-center mx-auto mb-6">
            <Check className="h-10 w-10 text-accent-green" />
          </div>
          
          <h1 className="text-2xl font-[family-name:var(--font-syne)] font-bold text-text-primary mb-2">
            Session Complete!
          </h1>
          <p className="text-text-secondary mb-6">
            Cards reviewed: {totalCards}
          </p>

          {/* Rating breakdown */}
          <div className="grid grid-cols-4 gap-2 mb-6">
            {(Object.keys(RATING_CONFIG) as Rating[]).map((rating) => (
              <div
                key={rating}
                className="bg-surface-elevated border border-border-custom rounded-lg p-3"
              >
                <p className="text-lg font-bold text-text-primary">{ratingCounts[rating]}</p>
                <p className="text-xs text-text-secondary capitalize">{rating}</p>
              </div>
            ))}
          </div>

          {/* XP earned */}
          <div className="bg-surface-elevated border border-border-custom rounded-xl p-4 mb-6">
            <div className="flex items-center justify-center gap-2 text-accent-green">
              <span className="text-2xl font-bold">+{xpEarned}</span>
              <span className="text-sm">XP earned</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleRestart}
              className="flex-1"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Review Again
            </Button>
            <Link href="/dashboard/flashcards" className="flex-1">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Decks
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col -m-4 md:-m-6 lg:-m-8 bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border-custom bg-surface">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/flashcards">
            <Button variant="ghost" size="icon">
              <X className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-sm font-medium text-text-primary">
              {deck?.title || "Flashcard Study"}
            </h1>
            <p className="text-xs text-text-secondary">
              Card {currentIndex + 1} of {totalCards}
            </p>
          </div>
        </div>

        {sessionStreak > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-accent-green/20 rounded-full">
            <Flame className="h-4 w-4 text-accent-green" />
            <span className="text-sm font-mono text-accent-green">{sessionStreak} streak</span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="px-4 pt-4">
        <ProgressBar
          value={currentIndex + 1}
          max={totalCards}
          variant="cyan"
          size="sm"
        />
      </div>

      {/* Card Area */}
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
            {/* Front */}
            <div
              className="absolute inset-0 bg-surface-elevated border-2 border-accent-cyan rounded-2xl p-6 md:p-8 flex flex-col backface-hidden"
              style={{ backfaceVisibility: "hidden" }}
            >
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-xs font-mono text-accent-cyan mb-4 uppercase tracking-wider">
                    Question
                  </p>
                  <p className="text-lg md:text-xl text-text-primary">
                    {currentCard.front}
                  </p>
                </div>
              </div>

              <div className="text-center mt-4">
                <p className="text-sm text-text-secondary">Tap to reveal answer</p>
              </div>

              {/* Source citation */}
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border-custom text-xs text-text-secondary">
                <FileText className="h-4 w-4" />
                <span>{currentCard.sourceDocument} · p.{currentCard.sourcePage}</span>
              </div>
            </div>

            {/* Back */}
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

              {/* Source citation */}
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border-custom text-xs text-text-secondary">
                <FileText className="h-4 w-4" />
                <span>{currentCard.sourceDocument} · p.{currentCard.sourcePage}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rating buttons (shown after flip) */}
      {isFlipped && (
        <div className="p-4 border-t border-border-custom bg-surface">
          <p className="text-xs text-text-secondary text-center mb-3">
            How well did you know this?
          </p>
          <div className="grid grid-cols-4 gap-2 max-w-xl mx-auto">
            {(Object.entries(RATING_CONFIG) as [Rating, typeof RATING_CONFIG[Rating]][]).map(
              ([rating, config]) => (
                <Button
                  key={rating}
                  onClick={() => handleRate(rating)}
                  className={cn("flex-col h-auto py-3 text-background", config.color)}
                >
                  <span className="text-lg mb-1">{config.icon}</span>
                  <span className="text-xs">{config.label}</span>
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
