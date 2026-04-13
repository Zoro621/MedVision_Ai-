import { apiUrl } from "@/lib/api/base";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface QuizOption {
  label: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  questionText: string;
  options: QuizOption[];
  correctAnswer: string;
  explanation?: string;
  topic?: string;
  difficultyLevel?: number;
  sourceDocument?: string;
  sourcePage?: number;
}

export interface QuizSummary {
  id: string;
  title: string;
  topic?: string;
  difficulty?: string;
  chatSessionId?: string;
  documentId?: string;
  questionCount: number;
  estimatedMinutes: number;
  bestScore?: number;
  attempts: number;
  isNew: boolean;
}

export interface QuizDetail {
  id: string;
  title: string;
  topic?: string;
  difficulty?: string;
  chatSessionId?: string;
  documentId?: string;
  estimatedMinutes: number;
  questions: QuizQuestion[];
}

export interface QuizSubmitAnswer {
  questionId: string;
  selectedAnswer: string;
}

export interface QuizSubmitResult {
  attemptId: string;
  chatSessionId?: string;
  score: number;
  correct: number;
  total: number;
  xpEarned: number;
  wrongTopics: string[];
  questions: QuizQuestion[];
}

export interface QuizAttemptQuestionResult {
  questionId: string;
  questionText: string;
  options: QuizOption[];
  correctAnswer: string;
  selectedAnswer?: string;
  isCorrect: boolean;
  explanation?: string;
  sourceDocument?: string;
  sourcePage?: number;
}

export interface QuizAttemptDetail {
  id: string;
  quizId: string;
  quizTitle: string;
  chatSessionId?: string;
  score: number;
  correctCount: number;
  totalCount: number;
  xpEarned: number;
  timeTakenSeconds?: number;
  completedAt: string;
  wrongTopics: string[];
  questions: QuizAttemptQuestionResult[];
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

export async function listQuizzes(chatSessionId?: string | null): Promise<QuizSummary[]> {
  const query = chatSessionId
    ? `?${new URLSearchParams({ chatSessionId }).toString()}`
    : "";
  return authFetch(apiUrl(`/quizzes${query}`));
}

export async function getQuiz(
  quizId: string,
  chatSessionId?: string | null
): Promise<QuizDetail> {
  const query = chatSessionId
    ? `?${new URLSearchParams({ chatSessionId }).toString()}`
    : "";
  return authFetch(apiUrl(`/quizzes/${quizId}${query}`));
}

export async function submitQuiz(
  quizId: string,
  answers: QuizSubmitAnswer[],
  timeTakenSeconds?: number,
  chatSessionId?: string | null
): Promise<QuizSubmitResult> {
  return authFetch(apiUrl(`/quizzes/${quizId}/submit`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_session_id: chatSessionId, answers }),
  });
}

export async function getQuizAttemptDetail(
  attemptId: string
): Promise<QuizAttemptDetail> {
  return authFetch(apiUrl(`/quizzes/attempts/${attemptId}`));
}

export async function generateQuiz(
  chatSessionId: string,
  count = 5
): Promise<QuizDetail> {
  return authFetch(apiUrl("/quizzes/generate"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_session_id: chatSessionId, count }),
  });
}
