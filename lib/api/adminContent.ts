import { AuthApiError } from "@/lib/api/auth";
import { apiUrl } from "@/lib/api/base";

export type AdminContentStatus = "draft" | "published" | "archived";
export type AdminDifficulty = "beginner" | "intermediate" | "advanced";

export interface AdminQuizOption {
  label: string;
  text: string;
}

export interface AdminQuizQuestion {
  id?: string;
  prompt: string;
  options: AdminQuizOption[];
  correctAnswer: string;
  explanation?: string;
  topic?: string;
  difficulty?: number;
  sourceDocument?: string;
  sourcePage?: number;
  irtDifficulty?: number;
  irtDiscrimination?: number;
  irtGuessing?: number;
  orderIndex: number;
  attemptCount?: number;
  averageScore?: number;
  discriminationIndex?: number;
}

export interface AdminQuizSummary {
  id: string;
  title: string;
  topic?: string;
  documentId?: string | null;
  difficulty?: string;
  questionCount: number;
  status: AdminContentStatus;
  usedBy: number;
  avgScore: number;
  estimatedMinutes: number;
  lastEditedAt?: string | null;
}

export interface AdminQuizDetail {
  id: string;
  title: string;
  description?: string | null;
  topic?: string | null;
  documentId?: string | null;
  difficulty?: string | null;
  estimatedMinutes: number;
  status: AdminContentStatus;
  questions: AdminQuizQuestion[];
}

export interface AdminFlashcardCard {
  id?: string;
  frontText: string;
  backText: string;
  topic?: string;
  difficulty?: number;
  sourceDocument?: string;
  sourcePage?: number;
  tags?: string[];
  orderIndex: number;
}

export interface AdminFlashcardDeckSummary {
  id: string;
  title: string;
  topic?: string | null;
  documentId?: string | null;
  cardCount: number;
  status: AdminContentStatus;
  usedBy: number;
  lastEditedAt?: string | null;
}

export interface AdminFlashcardDeckDetail {
  id: string;
  title: string;
  description?: string | null;
  topic?: string | null;
  documentId?: string | null;
  status: AdminContentStatus;
  cards: AdminFlashcardCard[];
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), {
    credentials: "include",
    cache: "no-store",
    ...init,
  });

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : null;

  if (!response.ok) {
    const detail = payload?.detail;
    const message =
      typeof detail === "string"
        ? detail
        : detail?.message || payload?.message || "Request failed";
    throw new AuthApiError(message, response.status, detail);
  }

  return payload as T;
}

export async function listAdminQuizzes() {
  return request<AdminQuizSummary[]>("/admin/quizzes");
}

export async function getAdminQuiz(id: string) {
  return request<AdminQuizDetail>(`/admin/quizzes/${id}`);
}

export async function createAdminQuiz(input: Omit<AdminQuizDetail, "id">) {
  return request<AdminQuizDetail>("/admin/quizzes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function updateAdminQuiz(id: string, input: Omit<AdminQuizDetail, "id">) {
  return request<AdminQuizDetail>(`/admin/quizzes/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function publishAdminQuiz(id: string) {
  return request<AdminQuizDetail>(`/admin/quizzes/${id}/publish`, {
    method: "POST",
  });
}

export async function archiveAdminQuiz(id: string) {
  return request<AdminQuizDetail>(`/admin/quizzes/${id}/archive`, {
    method: "POST",
  });
}

export async function deleteAdminQuiz(id: string) {
  return request<void>(`/admin/quizzes/${id}`, {
    method: "DELETE",
  });
}

export async function listAdminFlashcardDecks() {
  return request<AdminFlashcardDeckSummary[]>("/admin/flashcard-decks");
}

export async function getAdminFlashcardDeck(id: string) {
  return request<AdminFlashcardDeckDetail>(`/admin/flashcard-decks/${id}`);
}

export async function createAdminFlashcardDeck(
  input: Omit<AdminFlashcardDeckDetail, "id">
) {
  return request<AdminFlashcardDeckDetail>("/admin/flashcard-decks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function updateAdminFlashcardDeck(
  id: string,
  input: Omit<AdminFlashcardDeckDetail, "id">
) {
  return request<AdminFlashcardDeckDetail>(`/admin/flashcard-decks/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function publishAdminFlashcardDeck(id: string) {
  return request<AdminFlashcardDeckDetail>(`/admin/flashcard-decks/${id}/publish`, {
    method: "POST",
  });
}

export async function archiveAdminFlashcardDeck(id: string) {
  return request<AdminFlashcardDeckDetail>(`/admin/flashcard-decks/${id}/archive`, {
    method: "POST",
  });
}

export async function deleteAdminFlashcardDeck(id: string) {
  return request<void>(`/admin/flashcard-decks/${id}`, {
    method: "DELETE",
  });
}

export interface AdminContentStats {
  questionPreview: string;
  attempts: number;
  avgScore: number;
  difficulty: string;
}

export async function getAdminContentStats(): Promise<AdminContentStats[]> {
  return request<AdminContentStats[]>("/admin/content/stats");
}
