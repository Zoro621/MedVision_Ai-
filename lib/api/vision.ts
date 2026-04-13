import { AuthApiError } from "@/lib/api/auth";
import { apiUrl } from "@/lib/api/base";
import type { Citation } from "@/types/dashboard";

interface VisionAnalyzeResponse {
  traceId: string;
  documentId: string;
  caption: string;
  heatmapDataUrl: string;
  vqaAnswer?: string | null;
  citations?: Citation[];
}

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

export async function analyzeVision(params: {
  documentId: string;
  question?: string;
  includeTextEvidence?: boolean;
  topK?: number;
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
      }),
    }
  );

  return parseResponse<VisionAnalyzeResponse>(response);
}

