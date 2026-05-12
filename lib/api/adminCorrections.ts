/**
 * Admin Corrections API client — Human-in-the-Loop review workflow.
 *
 * Backend routes (see `backend/app/api/routes/admin_corrections.py`):
 *
 *   GET  /api/admin/corrections/queue
 *   GET  /api/admin/corrections/traces/{kind}/{id}
 *   POST /api/admin/corrections
 *   GET  /api/admin/corrections
 *   GET  /api/admin/corrections/{id}
 *   POST /api/admin/corrections/{id}/review
 *   GET  /api/admin/corrections/export.jsonl
 */
import { apiUrl } from "@/lib/api/base";

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

// ── Types ────────────────────────────────────────────────────────────────

export type CorrectionTargetKind = "assistant" | "vision";
export type CorrectionStatus = "pending" | "applied" | "rejected";

export interface TraceQueueItem {
  trace_id: string;
  target_kind: CorrectionTargetKind;
  user_id?: string | null;
  user_name?: string | null;
  user_email?: string | null;
  created_at: string;
  question_preview?: string | null;
  answer_preview?: string | null;
  image_thumbnail_url?: string | null;
  confidence?: number | null;
  has_existing_correction: boolean;
}

export interface TraceQueueResponse {
  items: TraceQueueItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface TraceCitation {
  document_id?: string | null;
  document_title?: string | null;
  page?: number | null;
  snippet?: string | null;
  score?: number | null;
}

export interface AgentStep {
  step_index: number;
  step_type: string;
  input_json?: Record<string, unknown> | null;
  output_json?: Record<string, unknown> | null;
  elapsed_ms?: number | null;
}

export interface AdminCorrection {
  id: string;
  target_kind: CorrectionTargetKind;
  assistant_trace_id?: string | null;
  vision_trace_id?: string | null;

  admin_user_id?: string | null;
  admin_name?: string | null;

  original_text?: string | null;
  original_payload?: Record<string, unknown> | null;

  corrected_text: string;
  corrected_payload?: Record<string, unknown> | null;
  rationale?: string | null;
  concept_tags?: string[] | null;

  status: CorrectionStatus;
  reviewed_by_user_id?: string | null;
  reviewed_by_name?: string | null;
  reviewed_at?: string | null;
  review_notes?: string | null;

  created_at: string;
  updated_at: string;
}

export interface TraceDetail {
  trace_id: string;
  target_kind: CorrectionTargetKind;
  user_id?: string | null;
  user_name?: string | null;
  created_at: string;

  question?: string | null;
  answer: string;
  answer_payload?: Record<string, unknown> | null;
  citations: TraceCitation[];

  image_url?: string | null;
  heatmap_url?: string | null;
  findings?: Record<string, unknown>[] | null;

  confidence?: number | null;
  faithfulness_score?: number | null;
  agent_steps: AgentStep[];

  existing_correction?: AdminCorrection | null;
}

export interface AdminCorrectionList {
  items: AdminCorrection[];
  total: number;
  page: number;
  page_size: number;
}

export interface AdminCorrectionCreatePayload {
  target_kind: CorrectionTargetKind;
  assistant_trace_id?: string;
  vision_trace_id?: string;
  corrected_text: string;
  corrected_payload?: Record<string, unknown>;
  rationale?: string;
  concept_tags?: string[];
}

export interface AdminCorrectionReviewPayload {
  decision: "apply" | "reject";
  review_notes?: string;
}

// ── API ──────────────────────────────────────────────────────────────────

export async function getCorrectionQueue(params?: {
  targetKind?: CorrectionTargetKind;
  onlyUncorrected?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<TraceQueueResponse> {
  const qs = new URLSearchParams();
  if (params?.targetKind) qs.set("target_kind", params.targetKind);
  if (params?.onlyUncorrected) qs.set("only_uncorrected", "true");
  if (params?.page) qs.set("page", String(params.page));
  if (params?.pageSize) qs.set("page_size", String(params.pageSize));
  return authFetch<TraceQueueResponse>(
    apiUrl(`/admin/corrections/queue?${qs.toString()}`)
  );
}

export async function getTraceDetail(
  kind: CorrectionTargetKind,
  traceId: string
): Promise<TraceDetail> {
  return authFetch<TraceDetail>(
    apiUrl(`/admin/corrections/traces/${kind}/${traceId}`)
  );
}

export async function submitCorrection(
  payload: AdminCorrectionCreatePayload
): Promise<AdminCorrection> {
  return authFetch<AdminCorrection>(apiUrl(`/admin/corrections`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function listCorrections(params?: {
  status?: CorrectionStatus;
  targetKind?: CorrectionTargetKind;
  page?: number;
  pageSize?: number;
}): Promise<AdminCorrectionList> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.targetKind) qs.set("target_kind", params.targetKind);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.pageSize) qs.set("page_size", String(params.pageSize));
  return authFetch<AdminCorrectionList>(
    apiUrl(`/admin/corrections?${qs.toString()}`)
  );
}

export async function getCorrection(id: string): Promise<AdminCorrection> {
  return authFetch<AdminCorrection>(apiUrl(`/admin/corrections/${id}`));
}

export async function reviewCorrection(
  id: string,
  payload: AdminCorrectionReviewPayload
): Promise<AdminCorrection> {
  return authFetch<AdminCorrection>(apiUrl(`/admin/corrections/${id}/review`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function exportCorrectionsJsonlUrl(status: "pending" | "applied" | "rejected" | "all" = "applied"): string {
  return apiUrl(`/admin/corrections/export.jsonl?status=${status}`);
}
