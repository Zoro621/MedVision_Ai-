"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Layers, MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProgressBar } from "@/components/dashboard/ui/ProgressBar";
import { EmptyState } from "@/components/dashboard/ui/EmptyState";
import { SkeletonDeckCard } from "@/components/dashboard/ui/SkeletonCard";
import { cn } from "@/lib/utils";
import { listDecks, type FlashcardDeckSummary } from "@/lib/api/flashcards";

const TOPIC_COLORS: Record<string, string> = {
  Chest: "bg-accent-cyan",
  Neuro: "bg-accent-purple",
  MSK: "bg-accent-amber",
  Abdominal: "bg-accent-green",
  Cardiac: "bg-accent-red",
  Paediatric: "bg-pink-500",
  Interventional: "bg-orange-500",
};

export default function FlashcardsPage() {
  const [loading, setLoading] = useState(true);
  const [decks, setDecks] = useState<FlashcardDeckSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listDecks()
      .then(setDecks)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

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
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonDeckCard key={index} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-accent-red mb-2">Failed to load flashcard decks</p>
        <p className="text-text-secondary text-sm">{error}</p>
      </div>
    );
  }

  if (decks.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-[family-name:var(--font-syne)] font-bold text-text-primary flex items-center gap-2">
            <Layers className="h-7 w-7 text-accent-cyan" />
            Flashcard Decks
          </h1>
          <p className="text-text-secondary mt-1">
            Review your published decks with spaced repetition.
          </p>
        </div>
        <EmptyState
          icon={Layers}
          title="No flashcard decks yet"
          description="Your admin can publish flashcard decks here once learning content is ready."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-[family-name:var(--font-syne)] font-bold text-text-primary flex items-center gap-2">
          <Layers className="h-7 w-7 text-accent-cyan" />
          Flashcard Decks
        </h1>
        <p className="text-text-secondary mt-1">
          Review your published decks with spaced repetition.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {decks.map((deck) => {
          const progress =
            deck.totalCards > 0 ? (deck.masteredCards / deck.totalCards) * 100 : 0;
          const topicColor = TOPIC_COLORS[deck.topic ?? ""] || "bg-accent-cyan";

          return (
            <div
              key={deck.id}
              className="bg-surface-elevated border border-border-custom rounded-xl overflow-hidden hover:shadow-lg hover:shadow-accent-cyan/5 hover:-translate-y-1 transition-all group"
            >
              <div className={cn("h-1.5", topicColor)} />

              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-medium text-text-primary group-hover:text-accent-cyan transition-colors">
                      {deck.title}
                    </h3>
                    <p className="text-xs text-text-secondary mt-0.5">
                      {(deck.topic ?? "General") + " Radiology"}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="glass-elevated">
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/flashcards/${deck.id}`}>
                          View Deck
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-1 mb-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary">Cards due</span>
                    {deck.dueCards > 0 ? (
                      <span className="px-2 py-0.5 bg-accent-red/20 text-accent-red text-xs font-mono rounded-full">
                        {deck.dueCards}
                      </span>
                    ) : (
                      <span className="text-accent-green text-xs font-mono">
                        None
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary">Mastered</span>
                    <span className="text-accent-green text-xs font-mono">
                      {deck.masteredCards}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary">Total</span>
                    <span className="text-text-secondary text-xs font-mono">
                      {deck.totalCards}
                    </span>
                  </div>
                </div>

                {deck.lastStudied && (
                  <p className="text-xs text-text-secondary mb-3">
                    Last studied: {deck.lastStudied}
                  </p>
                )}

                <div className="mb-4">
                  <ProgressBar
                    value={deck.masteredCards}
                    max={deck.totalCards}
                    variant="green"
                    size="sm"
                  />
                  <p className="text-xs text-text-secondary text-right mt-1">
                    {Math.round(progress)}% mastered
                  </p>
                </div>

                <Link href={`/dashboard/flashcards/${deck.id}/study`}>
                  <Button className="w-full bg-accent-cyan text-background hover:bg-accent-cyan/90">
                    Study Now
                  </Button>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
