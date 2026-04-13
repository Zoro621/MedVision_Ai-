import { apiUrl } from "@/lib/api/base";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FlashcardDeckSummary {
  id: string;
  title: string;
  topic?: string;
  chatSessionId?: string;
  documentId?: string;
  totalCards: number;
  dueCards: number;
  masteredCards: number;
  lastStudied?: string;
}

export interface FlashcardItem {
  id: string;
  deckId: string;
  front: string;
  back: string;
  topic?: string;
  difficultyLevel?: number;
  sourceDocument?: string;
  sourcePage?: number;
  difficulty: string;
  nextReviewDate?: string;
  reviewCount: number;
}

export interface FlashcardDeckDetail {
  id: string;
  title: string;
  topic?: string;
  chatSessionId?: string;
  documentId?: string;
  totalCards: number;
  dueCards: number;
  masteredCards: number;
  cards: FlashcardItem[];
}

export interface ReviewResponse {
  cardId: string;
  rating: string;
  nextReviewDate: string;
  intervalDays: number;
  easeFactor: number;
  xpEarned: number;
}

// ─── API calls ───────────────────────────────────────────────────────────────

async function authFetch(url: string, init?: RequestInit) {
  const res = await fetch(url, { credentials: "include", ...init });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(err.detail ?? "Request failed");
  }
  return res.json();
}

export async function listDecks(
  chatSessionId?: string | null
): Promise<FlashcardDeckSummary[]> {
  const query = chatSessionId
    ? `?${new URLSearchParams({ chatSessionId }).toString()}`
    : "";
  return authFetch(apiUrl(`/flashcards/decks${query}`));
}

export async function getDeck(
  deckId: string,
  chatSessionId?: string | null
): Promise<FlashcardDeckDetail> {
  const query = chatSessionId
    ? `?${new URLSearchParams({ chatSessionId }).toString()}`
    : "";
  return authFetch(apiUrl(`/flashcards/decks/${deckId}${query}`));
}

export async function getDueCards(
  deckId: string,
  chatSessionId?: string | null
): Promise<FlashcardItem[]> {
  const query = chatSessionId
    ? `?${new URLSearchParams({ chatSessionId }).toString()}`
    : "";
  return authFetch(apiUrl(`/flashcards/decks/${deckId}/due${query}`));
}

export async function submitReview(
  deckId: string,
  cardId: string,
  rating: "again" | "hard" | "good" | "easy",
  chatSessionId?: string | null
): Promise<ReviewResponse> {
  return authFetch(apiUrl(`/flashcards/decks/${deckId}/review`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cardId, rating, chatSessionId }),
  });
}

export async function generateFlashcardDeck(
  chatSessionId: string,
  count = 8
): Promise<FlashcardDeckDetail> {
  return authFetch(apiUrl("/flashcards/generate"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chatSessionId, count }),
  });
}
