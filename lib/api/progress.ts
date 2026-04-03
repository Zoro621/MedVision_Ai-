const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TopicMastery {
  topic: string;
  mastery: number;
  quizzes: number;
  flashcardsTotal: number;
  flashcardsDone: number;
}

export interface RecentQuiz {
  title: string;
  score: number;
  daysAgo: number;
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
  return authFetch(`${API_BASE}/progress/stats`);
}
