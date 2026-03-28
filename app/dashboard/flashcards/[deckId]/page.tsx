"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Play, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/dashboard/ui/ProgressBar";
import { MOCK_DECKS, MOCK_FLASHCARDS } from "@/lib/mockData/dashboard";
import { cn } from "@/lib/utils";

export default function DeckDetailPage() {
  const params = useParams();
  const deckId = params.deckId as string;

  const deck = MOCK_DECKS.find((d) => d.id === deckId);
  const cards = MOCK_FLASHCARDS[deckId] || MOCK_FLASHCARDS["deck_001"];

  if (!deck) {
    return (
      <div className="text-center py-12">
        <p className="text-text-secondary">Deck not found</p>
        <Link href="/dashboard/flashcards">
          <Button variant="outline" className="mt-4">
            Back to Decks
          </Button>
        </Link>
      </div>
    );
  }

  const progress = (deck.masteredCards / deck.totalCards) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/dashboard/flashcards"
            className="inline-flex items-center text-sm text-text-secondary hover:text-text-primary mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Decks
          </Link>
          <h1 className="text-2xl md:text-3xl font-[family-name:var(--font-syne)] font-bold text-text-primary">
            {deck.title}
          </h1>
          <p className="text-text-secondary mt-1">
            {deck.topic} Radiology · {deck.totalCards} cards
          </p>
        </div>
        <Link href={`/dashboard/flashcards/${deckId}/study`}>
          <Button className="bg-accent-cyan text-background hover:bg-accent-cyan/90">
            <Play className="h-4 w-4 mr-2" />
            Start Study
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface-elevated border border-border-custom rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-accent-red">{deck.dueCards}</p>
          <p className="text-xs text-text-secondary">Due Today</p>
        </div>
        <div className="bg-surface-elevated border border-border-custom rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-accent-green">{deck.masteredCards}</p>
          <p className="text-xs text-text-secondary">Mastered</p>
        </div>
        <div className="bg-surface-elevated border border-border-custom rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-text-primary">{deck.totalCards}</p>
          <p className="text-xs text-text-secondary">Total Cards</p>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-surface-elevated border border-border-custom rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-text-secondary">Mastery Progress</span>
          <span className="text-sm font-mono text-accent-green">{Math.round(progress)}%</span>
        </div>
        <ProgressBar value={deck.masteredCards} max={deck.totalCards} variant="green" size="md" />
      </div>

      {/* Card List */}
      <div>
        <h2 className="text-lg font-medium text-text-primary mb-4">Cards in this Deck</h2>
        <div className="space-y-3">
          {cards.map((card, index) => (
            <div
              key={card.id}
              className="bg-surface-elevated border border-border-custom rounded-xl p-4 hover:border-accent-cyan/50 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-xs font-mono text-text-secondary mb-1">Card {index + 1}</p>
                  <p className="text-sm text-text-primary line-clamp-2">{card.front}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-mono capitalize",
                      card.difficulty === "easy" && "bg-accent-green/20 text-accent-green",
                      card.difficulty === "good" && "bg-accent-cyan/20 text-accent-cyan",
                      card.difficulty === "hard" && "bg-accent-amber/20 text-accent-amber",
                      card.difficulty === "again" && "bg-accent-red/20 text-accent-red"
                    )}
                  >
                    {card.difficulty}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2 text-xs text-text-secondary">
                <FileText className="h-3 w-3" />
                <span>{card.sourceDocument} · p.{card.sourcePage}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
