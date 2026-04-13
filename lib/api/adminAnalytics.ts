import type {
  AdminStudentRow,
  LiveActivityItem,
  PlatformActivityData,
  PlatformStats,
  TopicPerformance,
} from "@/types/admin";
import { apiUrl } from "@/lib/api/base";

export interface ContentStatusSummary {
  quizzes: { published: number; draft: number; archived: number };
  flashcards: { published: number; draft: number; archived: number };
}

export interface AdminOverviewData {
  platformStats: PlatformStats;
  platformActivity: PlatformActivityData[];
  liveActivity: LiveActivityItem[];
  topicPerformance: TopicPerformance[];
  contentStatus: ContentStatusSummary;
  studentsAtRisk: AdminStudentRow[];
}

export interface AnalyticsMetric {
  value: number;
  change: number;
}

export interface AnalyticsReport {
  metrics: {
    activeStudents: AnalyticsMetric;
    quizCompletions: AnalyticsMetric;
    avgStudyTimeMinutes: AnalyticsMetric;
    avgQuizScore: AnalyticsMetric;
  };
  engagementData: Array<{
    date: string;
    activeUsers: number;
    newUsers: number;
    returningUsers: number;
  }>;
  contentUsage: Array<{
    name: string;
    quizzes: number;
    flashcards: number;
  }>;
  aiMetrics: Array<{
    date: string;
    accuracy: number;
    usage: number;
  }>;
  studentDistribution: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  retentionData: Array<{
    week: string;
    rate: number;
  }>;
  topQuizzes: Array<{
    title: string;
    attempts: number;
    avgScore: number;
    trend: "up" | "down";
  }>;
}

async function authFetch(url: string, init?: RequestInit) {
  const response = await fetch(url, { credentials: "include", ...init });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(payload.detail ?? "Request failed");
  }
  return response.json();
}

export async function getAdminOverview(): Promise<AdminOverviewData> {
  return authFetch(apiUrl("/admin/analytics/overview"));
}

export async function getAdminAnalyticsReport(): Promise<AnalyticsReport> {
  return authFetch(apiUrl("/admin/analytics/report"));
}
