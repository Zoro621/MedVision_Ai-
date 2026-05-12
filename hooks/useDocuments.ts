"use client";

import { useCallback, useEffect, useState } from "react";
import { listDocuments } from "@/lib/api/documents";
import type { UploadedSource } from "@/types/dashboard";

export function useDocuments() {
  const [documents, setDocuments] = useState<UploadedSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await listDocuments();
      setDocuments(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load documents");
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { documents, loading, error, refresh };
}
