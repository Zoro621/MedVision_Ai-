"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Layers, MoreHorizontal, Upload, BookOpen } from "lucide-react";
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
import { MOCK_DECKS, delay } from "@/lib/mockData/dashboard";
import { cn } from "@/lib/utils";
import type { RadiologyTopic } from "@/types/dashboard";

const TOPIC_COLORS: Record<RadiologyTopic, string> = {
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
  const [decks, setDecks] = useState(MOCK_DECKS);

  useEffect(() => {
    delay(800).then(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-surface-elevated rounded animate-pulse" />
            <div className="h-5 w-80 bg-surface-elevated rounded animate-pulse" />
          </div>
          <div className="h-10 w-32 bg-surface-elevated rounded animate-pulse" />
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonDeckCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (decks.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-[family-name:var(--font-syne)] font-bold text-text-primary flex items-center gap-2">
              <Layers className="h-7 w-7 text-accent-cyan" />
              Flashcard Decks
            </h1>
            <p className="text-text-secondary mt-1">
              Review your AI-generated flashcards with spaced repetition.
            </p>
          </div>
        </div>
        <EmptyState
          icon={Layers}
          title="No flashcard decks yet"
          description="Upload a PDF and MedVision AI will generate flashcards from your materials automatically."
          action={{ label: "Upload Materials", onClick: () => {} }}
          secondaryAction={{ label: "Browse Templates", onClick: () => {} }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-[family-name:var(--font-syne)] font-bold text-text-primary flex items-center gap-2">
            <Layers className="h-7 w-7 text-accent-cyan" />
            Flashcard Decks
          </h1>
          <p className="text-text-secondary mt-1">
            Review your AI-generated flashcards with spaced repetition.
          </p>
        </div>
        <Button className="bg-accent-cyan text-background hover:bg-accent-cyan/90">
          <Plus className="h-4 w-4 mr-2" />
          Create Deck
        </Button>
      </div>

      {/* Deck Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {decks.map((deck) => {
          const progress = (deck.masteredCards / deck.totalCards) * 100;
          const topicColor = TOPIC_COLORS[deck.topic] || "bg-accent-cyan";

          return (
            <div
              key={deck.id}
              className="bg-surface-elevated border border-border-custom rounded-xl overflow-hidden hover:shadow-lg hover:shadow-accent-cyan/5 hover:-translate-y-1 transition-all group"
            >
              {/* Topic stripe */}
              <div className={cn("h-1.5", topicColor)} />

              <div className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-medium text-text-primary group-hover:text-accent-cyan transition-colors">
                      {deck.title}
                    </h3>
                    <p className="text-xs text-text-secondary mt-0.5">{deck.topic} Radiology</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="glass-elevated">
                      <DropdownMenuItem>Edit Deck</DropdownMenuItem>
                      <DropdownMenuItem>Export</DropdownMenuItem>
                      <DropdownMenuItem className="text-accent-red">Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Stats */}
                <div className="space-y-1 mb-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary">Cards due</span>
                    {deck.dueCards > 0 ? (
                      <span className="px-2 py-0.5 bg-accent-red/20 text-accent-red text-xs font-mono rounded-full">
                        {deck.dueCards}
                      </span>
                    ) : (
                      <span className="text-accent-green text-xs font-mono">None</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary">Mastered</span>
                    <span className="text-accent-green text-xs font-mono">{deck.masteredCards}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary">Total</span>
                    <span className="text-text-secondary text-xs font-mono">{deck.totalCards}</span>
                  </div>
                </div>

                {/* Last studied */}
                {deck.lastStudied && (
                  <p className="text-xs text-text-secondary mb-3">
                    Last studied: {deck.lastStudied}
                  </p>
                )}

                {/* Progress bar */}
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

                {/* Action */}
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
