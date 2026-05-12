import { AuthApiError } from "@/lib/api/auth";
import { apiUrl } from "@/lib/api/base";
import type { Citation } from "@/types/dashboard";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AgentStep {
  stepIndex: number;
  stepType: "planner" | "retriever" | "scorer" | "generator" | "verifier" | "decider" | string;
  inputJson?: Record<string, unknown> | null;
  outputJson?: Record<string, unknown> | null;
  elapsedMs?: number | null;
}

interface AssistantAskPayload {
  chatSessionId: string;
  traceId: string;
  answer: string;
  confidence: number;
  citations: Citation[];
  agentSteps: AgentStep[];
}

interface AssistantSessionSummaryResponse {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  documentCount: number;
  topicHints: string[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function parseResponse<T>(response: Response): Promise<T> {
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

// ── Endpoints ────────────────────────────────────────────────────────────────

export async function askAssistant(params: {
  question: string;
  chatSessionId?: string | null;
  documentIds?: string[] | null;
  topK?: number;
  mode?: "rag" | "medical_chat";
}): Promise<{
  chatSessionId: string;
  traceId: string;
  message: string;
  confidence: number;
  citations: Citation[];
  agentSteps: AgentStep[];
}> {
  const response = await fetch(apiUrl("/assistant/ask"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      question: params.question,
      chatSessionId: params.chatSessionId ?? undefined,
      documentIds: params.documentIds ?? undefined,
      topK: params.topK ?? 6,
      mode: params.mode ?? "rag",
    }),
  });

  const payload = await parseResponse<AssistantAskPayload>(response);

  return {
    chatSessionId: payload.chatSessionId,
    traceId: payload.traceId,
    message: payload.answer,
    confidence: payload.confidence,
    citations: payload.citations,
    agentSteps: payload.agentSteps ?? [],
  };
}

export interface AssistantSessionSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  documentCount: number;
  topicHints: string[];
}

export interface AssistantSessionMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  citations?: Citation[];
  confidence?: number | null;
  traceId?: string | null;
  agentSteps?: AgentStep[];
}

export interface AssistantSessionDetail {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: AssistantSessionMessage[];
}

export async function listAssistantSessions(): Promise<AssistantSessionSummary[]> {
  const response = await fetch(apiUrl("/assistant/sessions"), {
    credentials: "include",
    cache: "no-store",
  });
  return parseResponse<AssistantSessionSummaryResponse[]>(response);
}

export async function getAssistantSession(
  sessionId: string
): Promise<AssistantSessionDetail> {
  const response = await fetch(apiUrl(`/assistant/sessions/${sessionId}`), {
    credentials: "include",
    cache: "no-store",
  });
  return parseResponse<AssistantSessionDetail>(response);
}
