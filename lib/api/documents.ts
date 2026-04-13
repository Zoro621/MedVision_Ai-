import { AuthApiError } from "@/lib/api/auth";
import { apiUrl } from "@/lib/api/base";
import type { Citation, UploadedSource } from "@/types/dashboard";

interface DocumentSummary {
  id: string;
  title: string;
  fileName: string;
  fileType: string;
  kind: "pdf" | "image" | "dicom";
  status: "pending" | "processing" | "ready" | "failed";
  fileSizeBytes?: number | null;
  pageCount?: number | null;
  chunkCount: number;
  isShared: boolean;
  ingestionStage?: string | null;
  ingestionProgress?: number | null;
  ingestionError?: string | null;
}

interface DocumentSearchHit {
  chunkId: string;
  documentId: string;
  documentName: string;
  pageStart: number;
  pageEnd: number;
  score: number;
  denseScore: number;
  lexicalScore: number;
  snippet: string;
  sectionHeading?: string | null;
  citation: {
    documentId: string;
    documentName: string;
    pageStart: number;
    pageEnd: number;
    sectionHeading?: string | null;
    citationLabel: string;
  };
}

interface DocumentSearchResponse {
  hits: DocumentSearchHit[];
  totalHits: number;
  retrievalMode: string;
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

export async function listDocuments(): Promise<UploadedSource[]> {
  const response = await fetch(apiUrl("/documents"), {
    credentials: "include",
    cache: "no-store",
  });
  const payload = await parseResponse<{ documents: DocumentSummary[] }>(response);
  return payload.documents.map(mapDocumentToSource);
}

export async function uploadDocument(file: File): Promise<UploadedSource> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(apiUrl("/documents/upload"), {
    method: "POST",
    body: formData,
    credentials: "include",
  });
  const payload = await parseResponse<DocumentSummary>(response);
  return mapDocumentToSource(payload);
}

export async function searchDocuments(query: string): Promise<{
  citations: Citation[];
  message: string;
  confidence: number;
}> {
  const response = await fetch(apiUrl("/documents/search"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ query, topK: 4 }),
  });
  const payload = await parseResponse<DocumentSearchResponse>(response);

  if (payload.hits.length === 0) {
    return {
      citations: [],
      message:
        "I could not find indexed material matching that query yet. Upload or wait for documents to finish processing, then try again.",
      confidence: 0,
    };
  }

  const citations: Citation[] = payload.hits.map((hit) => ({
    documentName: hit.citation.documentName,
    page: hit.citation.pageStart,
    chapter: hit.sectionHeading || hit.citation.citationLabel,
    snippet: hit.snippet,
  }));

  const summaryLines = payload.hits.map(
    (hit, index) =>
      `${index + 1}. ${hit.documentName} (page ${hit.pageStart})${hit.sectionHeading ? ` - ${hit.sectionHeading}` : ""}\n${hit.snippet}`
  );

  return {
    citations,
    message: `I found the most relevant indexed passages for your query:\n\n${summaryLines.join("\n\n")}`,
    confidence: Math.round((payload.hits[0]?.score ?? 0) * 100),
  };
}

function mapDocumentToSource(document: DocumentSummary): UploadedSource {
  return {
    id: document.id,
    name: document.fileName,
    type: document.kind,
    status:
      document.status === "ready"
        ? "indexed"
        : document.status === "failed"
          ? "failed"
          : "processing",
    progress: document.ingestionProgress ?? undefined,
    pages: document.pageCount ?? undefined,
    chapters:
      document.pageCount && document.chunkCount
        ? `${document.pageCount} pages - ${document.chunkCount} chunks`
        : undefined,
    size: formatBytes(document.fileSizeBytes ?? 0),
  };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
