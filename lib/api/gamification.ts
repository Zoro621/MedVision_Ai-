const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  tier: "bronze" | "silver" | "gold" | "platinum";
  unlockedAt: string | null;
  progress: number;
  maxProgress: number;
  category: "learning" | "performance" | "specialty" | "consistency";
  xpReward: number;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  xp: number;
  streak: number;
  level: number;
  isCurrentUser?: boolean;
}

export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  topic: string;
  difficulty: string;
  xpReward: number;
  badgeProgress?: string | null;
  expiresAt: string;
  completed: boolean;
}

export interface WeeklyQuest {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  progress: number;
  maxProgress: number;
  completed: boolean;
}

export interface GamificationSummary {
  achievements: Achievement[];
  leaderboard: LeaderboardEntry[];
  dailyChallenge: DailyChallenge;
  weeklyQuests: WeeklyQuest[];
}

async function authFetch(url: string, init?: RequestInit) {
  const response = await fetch(url, { credentials: "include", ...init });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(payload.detail ?? "Request failed");
  }
  return response.json();
}

export async function getGamificationSummary(): Promise<GamificationSummary> {
  return authFetch(`${API_BASE}/gamification/summary`);
}
