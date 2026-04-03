"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Copy,
  Layers,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  createAdminFlashcardDeck,
  getAdminFlashcardDeck,
  updateAdminFlashcardDeck,
  type AdminContentStatus,
} from "@/lib/api/adminContent";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Card = {
  id: string;
  frontText: string;
  backText: string;
  sourceDocument: string;
  sourcePage: string;
  tagsText: string;
  expanded: boolean;
};

const TOPICS = ["Chest", "Neuro", "MSK", "Abdominal", "Cardiac", "Paediatric"];
const makeId = () => Math.random().toString(36).slice(2, 10);
const blankCard = (): Card => ({
  id: makeId(),
  frontText: "",
  backText: "",
  sourceDocument: "",
  sourcePage: "",
  tagsText: "",
  expanded: true,
});

function FlashcardBuilderPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-32 rounded bg-surface-elevated animate-pulse" />
      <div className="h-40 rounded-xl bg-surface-elevated/40 animate-pulse" />
      <div className="h-[400px] rounded-xl bg-surface-elevated/40 animate-pulse" />
    </div>
  );
}

function FlashcardBuilderPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deckId = searchParams.get("id");

  const [loading, setLoading] = useState(Boolean(deckId));
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [topic, setTopic] = useState("");
  const [status, setStatus] = useState<AdminContentStatus>("draft");
  const [cards, setCards] = useState<Card[]>([blankCard()]);

  useEffect(() => {
    let cancelled = false;
    const currentDeckId = deckId;
    if (!currentDeckId) {
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    async function load() {
      if (!currentDeckId) return;

      try {
        const deck = await getAdminFlashcardDeck(currentDeckId);
        if (cancelled) return;
        setTitle(deck.title);
        setDescription(deck.description ?? "");
        setTopic(deck.topic ?? "");
        setStatus(deck.status);
        setCards(
          deck.cards.map((card, index) => ({
            id: card.id ?? makeId(),
            frontText: card.frontText,
            backText: card.backText,
            sourceDocument: card.sourceDocument ?? "",
            sourcePage: card.sourcePage ? String(card.sourcePage) : "",
            tagsText: card.tags?.join(", ") ?? "",
            expanded: index === 0,
          }))
        );
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load deck.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [deckId]);

  const updateCard = (id: string, updates: Partial<Card>) =>
    setCards((items) =>
      items.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );

  async function save(nextStatus: AdminContentStatus) {
    if (!title.trim()) {
      toast.error("Deck title is required.");
      return;
    }
    for (const [index, card] of cards.entries()) {
      if (!card.frontText.trim() || !card.backText.trim()) {
        toast.error(`Card ${index + 1} needs both front and back text.`);
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        topic: topic || undefined,
        status: nextStatus,
        cards: cards.map((card, index) => ({
          frontText: card.frontText.trim(),
          backText: card.backText.trim(),
          sourceDocument: card.sourceDocument.trim() || undefined,
          sourcePage: card.sourcePage ? Number.parseInt(card.sourcePage, 10) : undefined,
          tags: card.tagsText.split(",").map((tag) => tag.trim()).filter(Boolean),
          orderIndex: index,
        })),
      };
      const saved = deckId
        ? await updateAdminFlashcardDeck(deckId, payload)
        : await createAdminFlashcardDeck(payload);
      setStatus(saved.status);
      toast.success(
        nextStatus === "published"
          ? `Deck "${saved.title}" published.`
          : `Deck "${saved.title}" saved as draft.`
      );
      if (!deckId) {
        router.replace(`/admin/dashboard/content/flashcard-builder?id=${saved.id}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save deck.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <FlashcardBuilderPageSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin/dashboard/content" className="p-2 hover:bg-surface-elevated rounded-lg transition-colors">
            <ArrowLeft className="h-5 w-5 text-text-secondary" />
          </Link>
          <div>
            <p className="text-accent-red font-mono text-xs font-semibold tracking-wider mb-1">// FLASHCARD BUILDER</p>
            <h1 className="text-2xl font-[family-name:var(--font-syne)] font-bold text-text-primary">
              {deckId ? "Edit Flashcard Deck" : "Create New Flashcard Deck"}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn("px-3 py-1 rounded-full text-xs font-medium", status === "published" ? "bg-accent-green/20 text-accent-green" : status === "draft" ? "bg-accent-amber/20 text-accent-amber" : "bg-text-secondary/20 text-text-secondary")}>
            {status}
          </span>
          <Button variant="outline" onClick={() => void save("draft")} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          <Button className="bg-gradient-to-r from-accent-red to-orange-500 text-white hover:opacity-90" onClick={() => void save("published")} disabled={saving}>
            {saving ? "Saving..." : "Save and Publish"}
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <div className="bg-surface-elevated/40 border border-border-custom rounded-xl p-6 space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={(event) => setTitle(event.target.value)} className="bg-surface border-border-custom" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(event) => setDescription(event.target.value)} className="bg-surface border-border-custom min-h-[96px]" />
            </div>
            <div className="space-y-2">
              <Label>Topic</Label>
              <Select value={topic} onValueChange={setTopic}>
                <SelectTrigger className="bg-surface border-border-custom"><SelectValue placeholder="Select topic" /></SelectTrigger>
                <SelectContent className="bg-surface border-border-custom">
                  {TOPICS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-text-secondary">
              {cards.length} card{cards.length === 1 ? "" : "s"} in this deck.
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {cards.map((card, index) => (
            <div key={card.id} className="bg-surface-elevated/40 border border-border-custom rounded-xl overflow-hidden">
              <div className="flex items-center gap-3 p-4 border-b border-border-custom cursor-pointer hover:bg-surface/30 transition-colors" onClick={() => updateCard(card.id, { expanded: !card.expanded })}>
                <Layers className="h-5 w-5 text-text-secondary" />
                <span className="bg-accent-red/20 text-accent-red text-xs font-semibold px-2 py-1 rounded">Card {index + 1}</span>
                <span className="text-text-primary flex-1 truncate">{card.frontText.trim() || `Untitled card ${index + 1}`}</span>
                {card.expanded ? <ChevronUp className="h-5 w-5 text-text-secondary" /> : <ChevronDown className="h-5 w-5 text-text-secondary" />}
              </div>

              {card.expanded && (
                <div className="p-4 space-y-4">
                  <Textarea placeholder="Front text" value={card.frontText} onChange={(event) => updateCard(card.id, { frontText: event.target.value })} className="bg-surface border-border-custom min-h-[96px]" />
                  <Textarea placeholder="Back text" value={card.backText} onChange={(event) => updateCard(card.id, { backText: event.target.value })} className="bg-surface border-border-custom min-h-[96px]" />
                  <div className="grid md:grid-cols-2 gap-4">
                    <Input placeholder="Source document" value={card.sourceDocument} onChange={(event) => updateCard(card.id, { sourceDocument: event.target.value })} className="bg-surface border-border-custom" />
                    <Input type="number" min={1} placeholder="Source page" value={card.sourcePage} onChange={(event) => updateCard(card.id, { sourcePage: event.target.value })} className="bg-surface border-border-custom" />
                  </div>
                  <Input placeholder="Comma-separated tags" value={card.tagsText} onChange={(event) => updateCard(card.id, { tagsText: event.target.value })} className="bg-surface border-border-custom" />
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-custom">
                    <Button variant="ghost" size="sm" onClick={() => setCards((items) => { const idx = items.findIndex((item) => item.id === card.id); const copy = { ...card, id: makeId(), expanded: true }; const next = [...items]; next.splice(idx + 1, 0, copy); return next; })}>
                      <Copy className="h-4 w-4 mr-1" />
                      Duplicate
                    </Button>
                    {cards.length > 1 && (
                      <Button variant="ghost" size="sm" onClick={() => setCards((items) => items.filter((item) => item.id !== card.id))} className="text-accent-red hover:text-accent-red/80">
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          <Button variant="outline" onClick={() => setCards((items) => [...items, blankCard()])} className="w-full border-dashed border-border-custom py-8 hover:border-accent-red/50">
            <Plus className="h-5 w-5 mr-2" />
            Add Card
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function FlashcardBuilderPage() {
  return (
    <Suspense fallback={<FlashcardBuilderPageSkeleton />}>
      <FlashcardBuilderPageContent />
    </Suspense>
  );
}
