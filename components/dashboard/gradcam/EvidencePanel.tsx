"use client";

import type { Citation } from "@/types/dashboard";
import { FileText } from "lucide-react";

interface EvidencePanelProps {
  citations?: Citation[] | null;
}

export function EvidencePanel({ citations }: EvidencePanelProps) {
  const items = citations ?? [];
  if (items.length === 0) return null;

  return (
    <div className="bg-surface-elevated/40 backdrop-blur-sm border border-border-custom rounded-xl p-6">
      <h3 className="text-text-primary font-semibold text-sm mb-4 flex items-center gap-2">
        <FileText className="h-4 w-4 text-accent-cyan" />
        Text Evidence
      </h3>

      <div className="space-y-3">
        {items.slice(0, 6).map((c, idx) => (
          <div
            key={`${c.documentName}-${c.page}-${idx}`}
            className="p-3 bg-surface rounded-lg border border-border-custom/60"
          >
            <div className="text-text-primary text-xs font-semibold">
              {c.documentName} (p. {c.page})
            </div>
            <div className="text-text-secondary text-xs mt-1">{c.chapter}</div>
            <div className="text-text-secondary text-sm mt-2 leading-relaxed">
              {c.snippet}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

