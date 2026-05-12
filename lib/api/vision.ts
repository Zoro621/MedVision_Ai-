import { AuthApiError } from "@/lib/api/auth";
import { apiUrl } from "@/lib/api/base";
import type { Citation } from "@/types/dashboard";

// ── Types ────────────────────────────────────────────────────────────────────

export interface LimeSuperpixel {
  id: number;
  importance: number;
  positive: boolean;
  bbox: { x: number; y: number; w: number; h: number };
}

export interface LimeResult {
  traceId: string;
  documentId: string;
  overlayDataUrl: string;
  superpixels: LimeSuperpixel[];
  numSamples: number;
  method: string;
}

export interface ShapResult {
  traceId: string;
  documentId: string;
  overlayDataUrl: string;
  topPixels: { x: number; y: number; w: number; h: number; value: number }[];
  explanation: string;
  method: string;
}

export interface AttentionToken {
  token: string;
  heatmapDataUrl: string;
  importance: number;
}

export interface ExplanationLink {
  regionBbox: { x: number; y: number; w: number; h: number };
  regionLabel: string;
  chunkId: string;
  chunkSnippet: string;
  citation: string;
  similarity: number;
}

export interface AttentionResult {
  traceId: string;
  documentId: string;
  tokenHeatmaps: AttentionToken[];
  explanationLinks: ExplanationLink[];
  method: string;
}

export interface GradcamResult {
  traceId: string;
  documentId: string;
  heatmapDataUrl: string;
  overlayDataUrl?: string | null;
  method: string;
  regionBboxes: { x: number; y: number; w: number; h: number; intensity: number }[];
}

export interface VisionAnalyzeResponse {
  traceId: string;
  documentId: string;
  caption: string;
  heatmapDataUrl: string;
  overlayDataUrl?: string | null;
  gradcamMethod: string;
  regionBboxes: { x: number; y: number; w: number; h: number; intensity: number }[];
  vqaAnswer?: string | null;
  citations?: Citation[];
  lime?: LimeResult | null;
  shap?: ShapResult | null;
  attention?: AttentionResult | null;
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

export async function analyzeVision(params: {
  documentId: string;
  question?: string;
  includeTextEvidence?: boolean;
  topK?: number;
  includeLime?: boolean;
  includeShap?: boolean;
  includeAttention?: boolean;
}): Promise<VisionAnalyzeResponse> {
  const response = await fetch(
    apiUrl(`/vision/documents/${params.documentId}/analyze`),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        question: params.question ?? "Describe the key findings in this image.",
        includeTextEvidence: params.includeTextEvidence ?? true,
        topK: params.topK ?? 4,
        includeLime: params.includeLime ?? false,
        includeShap: params.includeShap ?? false,
        includeAttention: params.includeAttention ?? false,
      }),
    }
  );
  return parseResponse<VisionAnalyzeResponse>(response);
}

export async function getGradcam(documentId: string): Promise<GradcamResult> {
  const response = await fetch(
    apiUrl(`/vision/documents/${documentId}/gradcam`),
    { method: "POST", credentials: "include" }
  );
  return parseResponse<GradcamResult>(response);
}

export async function getLimeExplanation(
  documentId: string,
  question: string
): Promise<LimeResult> {
  const response = await fetch(
    apiUrl(`/vision/documents/${documentId}/lime`),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ question, topK: 4 }),
    }
  );
  return parseResponse<LimeResult>(response);
}

export async function getShapExplanation(documentId: string): Promise<ShapResult> {
  const response = await fetch(
    apiUrl(`/vision/documents/${documentId}/shap`),
    { method: "POST", credentials: "include" }
  );
  return parseResponse<ShapResult>(response);
}

export async function getAttentionVisualization(
  documentId: string,
  question: string
): Promise<AttentionResult> {
  const response = await fetch(
    apiUrl(`/vision/documents/${documentId}/attention`),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ question, topK: 4 }),
    }
  );
  return parseResponse<AttentionResult>(response);
}
