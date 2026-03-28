"use client";

import Link from "next/link";
import { FileText, Layers, ArrowRight } from "lucide-react";

interface ContentStatusCardProps {
  quizzes: { published: number; draft: number; archived: number };
  flashcards: { published: number; draft: number; archived: number };
}

export function ContentStatusCard({ quizzes, flashcards }: ContentStatusCardProps) {
  return (
    <div className="bg-surface-elevated/40 backdrop-blur-sm border border-border-custom rounded-xl p-6">
      <h3 className="text-accent-red font-mono text-xs font-semibold tracking-wider mb-4">
        // CONTENT STATUS
      </h3>

      <div className="space-y-4">
        {/* Quizzes */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-text-primary">
            <FileText className="h-4 w-4 text-accent-cyan" />
            <span className="text-sm font-medium">Quizzes</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-surface/50 rounded p-2">
              <span className="text-accent-green font-mono">{quizzes.published}</span>
              <span className="text-text-secondary ml-1">Published</span>
            </div>
            <div className="bg-surface/50 rounded p-2">
              <span className="text-accent-amber font-mono">{quizzes.draft}</span>
              <span className="text-text-secondary ml-1">Draft</span>
            </div>
            <div className="bg-surface/50 rounded p-2">
              <span className="text-text-secondary font-mono">{quizzes.archived}</span>
              <span className="text-text-secondary ml-1">Archived</span>
            </div>
          </div>
        </div>

        {/* Flashcards */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-text-primary">
            <Layers className="h-4 w-4 text-accent-purple" />
            <span className="text-sm font-medium">Flashcard Templates</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-surface/50 rounded p-2">
              <span className="text-accent-green font-mono">{flashcards.published}</span>
              <span className="text-text-secondary ml-1">Published</span>
            </div>
            <div className="bg-surface/50 rounded p-2">
              <span className="text-accent-amber font-mono">{flashcards.draft}</span>
              <span className="text-text-secondary ml-1">Draft</span>
            </div>
            <div className="bg-surface/50 rounded p-2">
              <span className="text-text-secondary font-mono">{flashcards.archived}</span>
              <span className="text-text-secondary ml-1">Archived</span>
            </div>
          </div>
        </div>
      </div>

      <Link
        href="/admin/dashboard/content"
        className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-border-custom text-text-secondary hover:text-accent-red transition-colors text-sm"
      >
        Manage Content
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
