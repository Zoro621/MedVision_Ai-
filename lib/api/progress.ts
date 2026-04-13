import { apiUrl } from "@/lib/api/base";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TopicMastery {
  topic: string;
  mastery: number;
  quizzes: number;
  flashcardsTotal: number;
  flashcardsDone: number;
  weakAreaScore: number;
}

export interface RecentQuiz {
  title: string;
  score: number;
  daysAgo: number;
}

export interface WeakArea {
  topic: string;
  mastery: number;
  weakAreaScore: number;
}

export interface ChatAreasToReview {
  chatSessionId: string;
  title: string;
  updatedAt: string;
  weakTopics: WeakArea[];
}

export interface StudyActivity {
  date: string;
  quizzes: number;
  flashcards: number;
  minutes: number;
}

export interface DashboardStats {
  streakDays: number;
  xp: number;
  level: number;
  levelTitle: string;
  xpToNextLevel: number;
  avgQuizScore: number;
  totalDueCards: number;
  topicMastery: TopicMastery[];
  recentQuizzes: RecentQuiz[];
  weakAreas: WeakArea[];
  areasToReviewByChat: ChatAreasToReview[];
  studyActivity: StudyActivity[];
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

export async function getDashboardStats(): Promise<DashboardStats> {
  return authFetch(apiUrl("/progress/stats"));
}
