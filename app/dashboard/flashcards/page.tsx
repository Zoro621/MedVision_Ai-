"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Layers, MoreHorizontal, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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
import {
  generateFlashcardDeck,
  listDecks,
  type FlashcardDeckSummary,
} from "@/lib/api/flashcards";
import { getActiveSession } from "@/lib/activeSession";

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
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [decks, setDecks] = useState<FlashcardDeckSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [chatSessionId, setChatSessionId] = useState<string>("");
  const [genTopic, setGenTopic] = useState("");
  const [genCount, setGenCount] = useState(5);
  const [showGenOptions, setShowGenOptions] = useState(false);

  const loadDecks = async (sessionId: string) => {
    setLoading(true);
    setError(null);
    try {
      setDecks(await listDecks(sessionId || null));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load flashcard decks.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const sessionId = getActiveSession();
    setChatSessionId(sessionId);
    void loadDecks(sessionId);
  }, []);

  const handleGenerate = async () => {
    if (!chatSessionId) {
      toast.error("Start a document chat first so flashcards can be generated from that indexed session.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    try {
      const deck = await generateFlashcardDeck(chatSessionId, genCount, genTopic || undefined);
      toast.success("Flashcards generated from the active chat session.");
      await loadDecks(chatSessionId);
      const qs = deck.chatSessionId || chatSessionId;
      router.push(
        qs
          ? `/dashboard/flashcards/${deck.id}?chatSessionId=${encodeURIComponent(qs)}`
          : `/dashboard/flashcards/${deck.id}`
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to generate flashcards.";
      setError(message);
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  };

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
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-[family-name:var(--font-syne)] font-bold text-text-primary flex items-center gap-2">
              <Layers className="h-7 w-7 text-accent-cyan" />
              Flashcard Decks
            </h1>
            <p className="text-text-secondary mt-1">
              Review or generate decks from your active indexed chat session.
            </p>
          </div>
          <Button
            onClick={() => setShowGenOptions((p) => !p)}
            disabled={isGenerating || !chatSessionId}
            className="bg-accent-cyan text-background hover:bg-accent-cyan/90"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {isGenerating ? "Generating..." : "Generate Flashcards"}
          </Button>
        </div>

        {showGenOptions && (
          <div className="bg-surface-elevated border border-border-custom rounded-xl p-4 space-y-4">
            <div>
              <label className="text-sm text-text-secondary mb-1 block">Topic (optional)</label>
              <input
                type="text"
                placeholder="e.g. Pulmonary Embolism, Cardiac anatomy..."
                value={genTopic}
                onChange={(e) => setGenTopic(e.target.value)}
                className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-accent-cyan"
              />
            </div>
            <div>
              <label className="text-sm text-text-secondary mb-1 block">Number of cards: {genCount}</label>
              <input
                type="range"
                min={1}
                max={20}
                value={genCount}
                onChange={(e) => setGenCount(Number(e.target.value))}
                className="w-full accent-accent-cyan"
              />
              <div className="flex justify-between text-xs text-text-secondary">
                <span>1</span>
                <span>20</span>
              </div>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="bg-accent-cyan text-background hover:bg-accent-cyan/90"
            >
              {isGenerating ? "Generating..." : `Generate ${genCount} Flashcards`}
            </Button>
          </div>
        )}

        <EmptyState
          icon={Layers}
          title="No flashcard decks yet"
          description={
            chatSessionId
              ? "Generate a deck from your latest indexed chat session to start studying."
              : "Open the AI Assistant, ask questions against an indexed document, then come back here to generate flashcards."
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-[family-name:var(--font-syne)] font-bold text-text-primary flex items-center gap-2">
            <Layers className="h-7 w-7 text-accent-cyan" />
            Flashcard Decks
          </h1>
          <p className="text-text-secondary mt-1">
            Review or generate decks from your active indexed chat session.
          </p>
        </div>
        <Button
          onClick={() => setShowGenOptions((p) => !p)}
          disabled={isGenerating || !chatSessionId}
          className="bg-accent-cyan text-background hover:bg-accent-cyan/90"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          {isGenerating ? "Generating..." : "Generate Flashcards"}
        </Button>
      </div>

      {showGenOptions && (
        <div className="bg-surface-elevated border border-border-custom rounded-xl p-4 space-y-4">
          <div>
            <label className="text-sm text-text-secondary mb-1 block">Topic (optional)</label>
            <input
              type="text"
              placeholder="e.g. Pulmonary Embolism, Cardiac anatomy..."
              value={genTopic}
              onChange={(e) => setGenTopic(e.target.value)}
              className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-accent-cyan"
            />
          </div>
          <div>
            <label className="text-sm text-text-secondary mb-1 block">Number of cards: {genCount}</label>
            <input
              type="range"
              min={1}
              max={20}
              value={genCount}
              onChange={(e) => setGenCount(Number(e.target.value))}
              className="w-full accent-accent-cyan"
            />
            <div className="flex justify-between text-xs text-text-secondary">
              <span>1</span>
              <span>20</span>
            </div>
          </div>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="bg-accent-cyan text-background hover:bg-accent-cyan/90"
          >
            {isGenerating ? "Generating..." : `Generate ${genCount} Flashcards`}
          </Button>
        </div>
      )}

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
                        <Link
                          href={
                            (deck.chatSessionId || chatSessionId)
                              ? `/dashboard/flashcards/${deck.id}?chatSessionId=${encodeURIComponent(deck.chatSessionId || chatSessionId)}`
                              : `/dashboard/flashcards/${deck.id}`
                          }
                        >
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

                <Link
                  href={
                    (deck.chatSessionId || chatSessionId)
                      ? `/dashboard/flashcards/${deck.id}/study?chatSessionId=${encodeURIComponent(deck.chatSessionId || chatSessionId)}`
                      : `/dashboard/flashcards/${deck.id}/study`
                  }
                >
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
