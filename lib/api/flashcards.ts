const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FlashcardDeckSummary {
  id: string;
  title: string;
  topic?: string;
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

export async function listDecks(): Promise<FlashcardDeckSummary[]> {
  return authFetch(`${API_BASE}/flashcards/decks`);
}

export async function getDeck(deckId: string): Promise<FlashcardDeckDetail> {
  return authFetch(`${API_BASE}/flashcards/decks/${deckId}`);
}

export async function getDueCards(deckId: string): Promise<FlashcardItem[]> {
  return authFetch(`${API_BASE}/flashcards/decks/${deckId}/due`);
}

export async function submitReview(
  deckId: string,
  cardId: string,
  rating: "again" | "hard" | "good" | "easy"
): Promise<ReviewResponse> {
  return authFetch(`${API_BASE}/flashcards/decks/${deckId}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cardId, rating }),
  });
}
