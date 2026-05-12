/**
 * Admin Operations API client — Student management + Audit logs.
 * Wires to: GET /api/admin/operations/students
 *           POST /api/admin/operations/students/{id}/suspend
 *           POST /api/admin/operations/students/{id}/reset-password
 *           GET /api/admin/operations/audit-log
 */
import { apiUrl } from "@/lib/api/base";
import type { AdminStudentRow } from "@/types/admin";

async function authFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: "include", ...init });
  if (!response.ok) {
    const payload = await response
      .json()
      .catch(() => ({ detail: "Request failed" }));
    throw new Error(payload.detail ?? "Request failed");
  }
  return response.json();
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  resource: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface AuditLogPage {
  items: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
}

export interface StudentSuspendResult {
  success: boolean;
  message: string;
}

export interface AdminSystemService {
  name: string;
  status: string;
  detail: string;
  metric?: string | null;
}

export interface AdminSystemStatusResponse {
  overallStatus: string;
  overallLabel: string;
  uptimePercent: string;
  lastUpdated: string;
  services: AdminSystemService[];
}

// ── Students ──────────────────────────────────────────────────────────────────

export async function getAdminStudents(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
}): Promise<{ students: AdminStudentRow[]; total: number }> {
  const qs = new URLSearchParams();
  if (params?.page)     qs.set("page", String(params.page));
  if (params?.pageSize) qs.set("page_size", String(params.pageSize));
  if (params?.search)   qs.set("search", params.search);
  return authFetch<{ students: AdminStudentRow[]; total: number }>(
    apiUrl(`/admin/operations/students?${qs.toString()}`)
  );
}

export async function suspendStudent(
  studentId: string
): Promise<StudentSuspendResult> {
  return authFetch<StudentSuspendResult>(
    apiUrl(`/admin/operations/students/${studentId}/suspend`),
    { method: "POST" }
  );
}

export async function resetStudentPassword(
  studentId: string
): Promise<{ temporaryPassword: string }> {
  return authFetch<{ temporaryPassword: string }>(
    apiUrl(`/admin/operations/students/${studentId}/reset-password`),
    { method: "POST" }
  );
}

export async function getAdminSystemStatus(): Promise<AdminSystemStatusResponse> {
  return authFetch<AdminSystemStatusResponse>(apiUrl("/admin/system"));
}

// ── Audit Log ─────────────────────────────────────────────────────────────────

export async function getAuditLog(params?: {
  page?: number;
  pageSize?: number;
  userId?: string;
  action?: string;
}): Promise<AuditLogPage> {
  const qs = new URLSearchParams();
  if (params?.page)     qs.set("page", String(params.page));
  if (params?.pageSize) qs.set("page_size", String(params.pageSize));
  if (params?.userId)   qs.set("user_id", params.userId);
  if (params?.action)   qs.set("action", params.action);
  return authFetch<AuditLogPage>(
    apiUrl(`/admin/operations/audit-log?${qs.toString()}`)
  );
}

// ── Student detail (GET /api/admin/students/{id}) ───────────────────────────

export interface AdminStudentRowApi {
  id: string;
  name: string;
  email: string;
  level: number;
  levelTitle: string;
  avgScore: number;
  streak: number;
  xp: number;
  status: string;
  risk: string;
  avatarInitials: string;
  joinedAt?: string | null;
  radiologyFocus?: string[];
  totalStudyTime?: number;
  quizzesTaken?: number;
  lastActive?: string | null;
}

export interface AdminStudentDetailResponse {
  student: AdminStudentRowApi;
  topicMastery: { topic: string; mastery: number }[];
  activity: {
    id: string;
    occurredAt: string;
    action: string;
    detail?: string | null;
    icon: string;
  }[];
  quizAttempts: {
    id: string;
    quizTitle: string;
    date: string;
    score: number;
    timeMinutes: number;
    xpEarned: number;
    status: string;
  }[];
  flashcardActivity: {
    deckTitle: string;
    topic: string;
    reviews: number;
    xpEarned: number;
    lastReviewedAt?: string | null;
  }[];
  scoreHistory: { date: string; score: number }[];
  recommendations: string[];
  badges: string[];
}

export async function getAdminStudentDetail(
  studentId: string
): Promise<AdminStudentDetailResponse> {
  return authFetch<AdminStudentDetailResponse>(
    apiUrl(`/admin/students/${studentId}`)
  );
}
