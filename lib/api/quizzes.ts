const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api";

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
  sourceDocument?: string;
  sourcePage?: number;
}

export interface QuizSummary {
  id: string;
  title: string;
  topic?: string;
  difficulty?: string;
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
  estimatedMinutes: number;
  questions: QuizQuestion[];
}

export interface QuizSubmitAnswer {
  questionId: string;
  selectedAnswer: string;
}

export interface QuizSubmitResult {
  attemptId: string;
  score: number;
  correct: number;
  total: number;
  xpEarned: number;
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
  score: number;
  correctCount: number;
  totalCount: number;
  xpEarned: number;
  timeTakenSeconds?: number;
  completedAt: string;
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

export async function listQuizzes(): Promise<QuizSummary[]> {
  return authFetch(`${API_BASE}/quizzes`);
}

export async function getQuiz(quizId: string): Promise<QuizDetail> {
  return authFetch(`${API_BASE}/quizzes/${quizId}`);
}

export async function submitQuiz(
  quizId: string,
  answers: QuizSubmitAnswer[],
  timeTakenSeconds?: number
): Promise<QuizSubmitResult> {
  return authFetch(`${API_BASE}/quizzes/${quizId}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answers, timeTakenSeconds }),
  });
}

export async function getQuizAttemptDetail(
  attemptId: string
): Promise<QuizAttemptDetail> {
  return authFetch(`${API_BASE}/quizzes/attempts/${attemptId}`);
}
