"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageSquareText } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  listAssistantSessions,
  type AssistantSessionSummary,
} from "@/lib/api/assistant";

interface StudySessionSelectorProps {
  value: string | null;
  onChange: (chatSessionId: string) => void;
  label?: string;
}

export function StudySessionSelector({
  value,
  onChange,
  label = "Active Study Session",
}: StudySessionSelectorProps) {
  const [sessions, setSessions] = useState<AssistantSessionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    listAssistantSessions()
      .then((nextSessions) => {
        if (!cancelled) {
          setSessions(nextSessions);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSessions([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedSession = sessions.find((session) => session.id === value) ?? null;

  return (
    <div className="rounded-xl border border-border-custom bg-surface-elevated p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-accent-cyan">
            {label}
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            {selectedSession
              ? `Using "${selectedSession.title}"${selectedSession.topicHints.length > 0 ? ` · ${selectedSession.topicHints.join(", ")}` : ""}`
              : "Select a chat session so quizzes and flashcards stay tied to one document conversation."}
          </p>
        </div>

        {sessions.length > 0 ? (
          <Select value={value ?? undefined} onValueChange={onChange} disabled={loading}>
            <SelectTrigger className="w-full md:w-[320px] bg-surface border-border-custom">
              <SelectValue placeholder={loading ? "Loading sessions..." : "Choose a chat session"} />
            </SelectTrigger>
            <SelectContent className="bg-surface border-border-custom">
              {sessions.map((session) => (
                <SelectItem key={session.id} value={session.id}>
                  {session.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Link href="/dashboard/assistant">
            <Button className="w-full md:w-auto bg-accent-cyan text-background hover:bg-accent-cyan/90">
              <MessageSquareText className="mr-2 h-4 w-4" />
              Open Assistant
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
