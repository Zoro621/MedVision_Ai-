"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  Bookmark,
  Brain,
  ChevronLeft,
  ChevronRight,
  CloudUpload,
  Copy,
  FileText,
  Image as ImageIcon,
  Lightbulb,
  Paperclip,
  Scan,
  ThumbsDown,
  ThumbsUp,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ProgressBar } from "@/components/dashboard/ui/ProgressBar";
import { cn } from "@/lib/utils";
import type { ChatMessage, Citation, UploadedSource } from "@/types/dashboard";
import {
  listDocuments,
  uploadDocument,
} from "@/lib/api/documents";
import { askAssistant } from "@/lib/api/assistant";

const SUGGESTED_PROMPTS = [
  "What are the signs of PE on CT?",
  "Show indexed passages about chest radiology",
  "Find pages discussing MRI anatomy",
];

const INTRO_MESSAGE: ChatMessage = {
  id: "msg_001",
  role: "assistant",
  content:
    "Upload your PDFs, scanned notes, DICOM files, or standard images here. Phase 2 now indexes those materials and lets you search the extracted passages with page-level citations.",
  timestamp: new Date().toISOString(),
};

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([INTRO_MESSAGE]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sources, setSources] = useState<UploadedSource[]>([]);
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [assistantMode, setAssistantMode] = useState<
    "rag" | "medical_chat"
  >("rag");
  const [contextPanelOpen, setContextPanelOpen] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [savedAnswers, setSavedAnswers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const loadSources = async () => {
      try {
        setSources(await listDocuments());
      } catch {
        toast.error("Failed to load indexed materials.");
      }
    };

    loadSources();
  }, []);

  useEffect(() => {
    const hasProcessingSources = sources.some(
      (source) => source.status === "processing"
    );
    if (!hasProcessingSources) return;

    const interval = setInterval(async () => {
      try {
        setSources(await listDocuments());
      } catch {
        // Ignore polling failures and keep the last known state.
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [sources]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    try {
      const result = await askAssistant({
        question: userMessage.content,
        chatSessionId,
        mode: assistantMode,
      });
      setChatSessionId(result.chatSessionId);
      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: "assistant",
        content: result.message,
        timestamp: new Date().toISOString(),
        confidence: result.confidence,
        citations: result.citations,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg_${Date.now() + 1}`,
          role: "assistant",
          content:
            "I ran into a problem while answering from your indexed materials. Please try again in a moment.",
          timestamp: new Date().toISOString(),
          confidence: 0,
        },
      ]);
      toast.error("Assistant request failed. Please try again.");
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    await handleFilesSelected(Array.from(event.dataTransfer.files));
  };

  const handleFilesSelected = async (files: File[]) => {
    for (const file of files) {
      try {
        const uploaded = await uploadDocument(file);
        setSources((prev) => [uploaded, ...prev]);
        toast.success(`${file.name} uploaded`, {
          description:
            "Ingestion started. Search becomes available once indexing completes.",
        });
      } catch {
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    try {
      setSources(await listDocuments());
    } catch {
      // Ignore follow-up refresh errors.
    }
  };

  const getSourceIcon = (type: UploadedSource["type"]) => {
    switch (type) {
      case "pdf":
        return FileText;
      case "image":
        return ImageIcon;
      case "dicom":
        return Scan;
      default:
        return FileText;
    }
  };

  const totalSize = sources.reduce((total, source) => {
    const size = parseFloat(source.size);
    if (source.size.includes("MB")) return total + size * 1024;
    if (source.size.includes("KB")) return total + size;
    return total;
  }, 0);

  const latestAssistantMessage = [...messages]
    .reverse()
    .find((message) => message.role === "assistant");
  const latestCitations = latestAssistantMessage?.citations || [];

  return (
    <div className="flex h-[calc(100vh-64px-2rem)] -m-4 md:-m-6 lg:-m-8">
      <div className="w-72 border-r border-border-custom bg-surface flex-col hidden lg:flex">
        <div className="p-4 border-b border-border-custom">
          <p className="text-xs font-mono text-accent-cyan uppercase tracking-wider">
            // Indexed Materials
          </p>
        </div>

        <div
          className={cn(
            "m-4 p-6 border-2 border-dashed rounded-xl text-center transition-all cursor-pointer",
            dragOver
              ? "border-accent-cyan bg-accent-cyan/5"
              : "border-border-custom hover:border-accent-cyan/50"
          )}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <CloudUpload className="h-8 w-8 text-text-secondary mx-auto mb-2" />
          <p className="text-sm text-text-primary mb-1">Drop files here</p>
          <p className="text-xs text-text-secondary">or click to browse</p>
          <p className="text-xs text-text-secondary mt-2">
            PDF - Images - DICOM
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.dcm,.dicom"
          className="hidden"
          multiple
          onChange={async (event) => {
            const files = Array.from(event.target.files ?? []);
            if (files.length > 0) {
              await handleFilesSelected(files);
            }
            event.currentTarget.value = "";
          }}
        />

        <div className="flex-1 overflow-y-auto px-4 space-y-2">
          {sources.length === 0 ? (
            <div className="p-4 rounded-lg bg-surface-elevated border border-border-custom text-sm text-text-secondary">
              No materials uploaded yet.
            </div>
          ) : (
            sources.map((source) => {
              const Icon = getSourceIcon(source.type);
              return (
                <div
                  key={source.id}
                  className="p-3 rounded-lg bg-surface-elevated border border-border-custom hover:border-accent-cyan/50 transition-all group relative"
                >
                  <div className="flex items-start gap-3">
                    <Icon className="h-5 w-5 text-text-secondary shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary truncate">
                        {source.name}
                      </p>
                      {source.pages && (
                        <p className="text-xs text-text-secondary">
                          {source.chapters || `${source.pages} pages`}
                        </p>
                      )}
                      {source.status === "processing" &&
                        source.progress !== undefined && (
                          <ProgressBar
                            value={source.progress}
                            max={100}
                            variant="amber"
                            size="sm"
                            className="mt-2"
                          />
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                      {source.status === "indexed" && (
                        <span className="text-xs text-accent-green">
                          Indexed
                        </span>
                      )}
                      {source.status === "processing" && (
                        <span className="text-xs text-accent-amber">
                          Processing...
                        </span>
                      )}
                      {source.status === "failed" && (
                        <span className="text-xs text-accent-red">Failed</span>
                      )}
                      <button
                        type="button"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-4 w-4 text-text-secondary hover:text-accent-red" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-4 border-t border-border-custom">
          <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
            <span>Storage used</span>
            <span>{(totalSize / 1024).toFixed(1)} MB / 50 MB</span>
          </div>
          <ProgressBar value={totalSize / 1024} max={50} variant="cyan" size="sm" />
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-background">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 1 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-cyan to-accent-green flex items-center justify-center mb-4">
                <Brain className="h-8 w-8 text-background" />
              </div>
              <h2 className="text-xl font-medium text-text-primary mb-2">
                Search your indexed materials
              </h2>
              <p className="text-sm text-text-secondary max-w-md mb-6">
                Phase 2 now uploads and indexes your documents, then searches the extracted passages with page-level citations.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => setInput(prompt)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-elevated border border-border-custom hover:border-accent-cyan/50 transition-all text-sm text-text-secondary hover:text-text-primary"
                  >
                    <Lightbulb className="h-4 w-4 text-accent-amber" />
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              savedAnswers={savedAnswers}
              onSave={() =>
                setSavedAnswers((prev) =>
                  prev.includes(message.id) ? prev : [...prev, message.id]
                )
              }
            />
          ))}

          {isTyping && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-cyan to-accent-green flex items-center justify-center shrink-0">
                <Brain className="h-4 w-4 text-background" />
              </div>
              <div className="bg-surface-elevated border border-border-custom rounded-2xl p-4">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-text-secondary mr-2">
                    MedVision AI
                  </span>
                  <span className="w-2 h-2 bg-accent-cyan rounded-full animate-bounce" />
                  <span
                    className="w-2 h-2 bg-accent-cyan rounded-full animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="w-2 h-2 bg-accent-cyan rounded-full animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-border-custom bg-surface">
          <div className="flex items-end gap-2 bg-surface-elevated rounded-xl border border-border-custom focus-within:border-accent-cyan transition-colors p-2">
            <div className="flex items-center gap-1 pr-2 border-r border-border-custom">
              <button
                type="button"
                onClick={() => setAssistantMode("rag")}
                className={cn(
                  "px-2 py-1 rounded-md text-xs font-mono transition-colors",
                  assistantMode === "rag"
                    ? "bg-accent-cyan text-background"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                RAG
              </button>
              <button
                type="button"
                onClick={() => setAssistantMode("medical_chat")}
                className={cn(
                  "px-2 py-1 rounded-md text-xs font-mono transition-colors",
                  assistantMode === "medical_chat"
                    ? "bg-accent-amber text-background"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                Chat
              </button>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-text-secondary hover:text-accent-cyan transition-colors"
            >
              <Paperclip className="h-5 w-5" />
            </button>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                assistantMode === "rag"
                  ? "Ask from your indexed materials (RAG)..."
                  : "Chest X-ray medical chat (Gemini)..."
              }
              rows={1}
              className="flex-1 bg-transparent border-0 outline-none resize-none text-sm text-text-primary placeholder:text-text-secondary min-h-[40px] max-h-[120px] py-2"
              style={{ height: "auto" }}
            />
            {input.length > 200 && (
              <span className="text-xs text-text-secondary px-2">
                {input.length} / 2000
              </span>
            )}
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              size="icon"
              className="bg-accent-cyan text-background hover:bg-accent-cyan/90 disabled:opacity-50"
            >
              <ArrowUp className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "border-l border-border-custom bg-surface transition-all hidden md:flex flex-col",
          contextPanelOpen ? "w-80" : "w-0"
        )}
      >
        {contextPanelOpen && (
          <>
            <div className="p-4 border-b border-border-custom flex items-center justify-between">
              <p className="text-xs font-mono text-text-secondary uppercase tracking-wider">
                Context
              </p>
              <button
                type="button"
                onClick={() => setContextPanelOpen(false)}
                className="p-1 hover:bg-surface-elevated rounded transition-colors"
              >
                <ChevronRight className="h-4 w-4 text-text-secondary" />
              </button>
            </div>

            <Tabs defaultValue="details" className="flex-1 flex flex-col">
              <TabsList className="mx-4 mt-2 bg-surface-elevated">
                <TabsTrigger value="details" className="text-xs">
                  Answer Details
                </TabsTrigger>
                <TabsTrigger value="related" className="text-xs">
                  Related
                </TabsTrigger>
                <TabsTrigger value="saved" className="text-xs">
                  Saved
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="flex-1 p-4 space-y-4">
                <div>
                  <p className="text-xs text-text-secondary mb-2">
                    Confidence Score
                  </p>
                  <div className="flex items-center gap-2">
                    <ProgressBar
                      value={Math.max(latestAssistantMessage?.confidence || 0, 0)}
                      max={100}
                      variant="green"
                      size="md"
                      className="flex-1"
                    />
                    <span className="text-sm font-mono text-accent-green">
                      {latestAssistantMessage?.confidence || 0}%
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-text-secondary mb-2">
                    Sources Used
                  </p>
                  <div className="space-y-1">
                    {latestCitations.length === 0 ? (
                      <p className="text-xs text-text-secondary">
                        No citations yet
                      </p>
                    ) : (
                      latestCitations.map((citation, index) => (
                        <div
                          key={`${citation.documentName}-${citation.page}-${index}`}
                          className="flex items-center gap-2 text-sm text-text-primary"
                        >
                          <FileText className="h-4 w-4 text-accent-cyan" />
                          {citation.documentName}
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-text-secondary mb-2">
                    Retrieval Method
                  </p>
                  <span className="text-xs font-mono bg-surface-elevated px-2 py-1 rounded">
                    Hybrid Dense + BM25
                  </span>
                </div>
                <div>
                  <p className="text-xs text-text-secondary mb-2">
                    Indexed Files
                  </p>
                  <span className="text-xs font-mono text-text-secondary">
                    {sources.filter((source) => source.status === "indexed").length} ready
                  </span>
                </div>
              </TabsContent>

              <TabsContent value="related" className="flex-1 p-4">
                <p className="text-xs text-text-secondary mb-3">
                  Explore related searches
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    "Hybrid retrieval citations",
                    "Pulmonary embolism",
                    "DICOM metadata",
                    "Chest CT findings",
                  ].map((topic) => (
                    <button
                      key={topic}
                      onClick={() => setInput(topic)}
                      className="px-3 py-1.5 rounded-full border border-border-custom text-xs text-text-secondary hover:border-accent-cyan/50 hover:text-text-primary transition-all"
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="saved" className="flex-1 p-4">
                {savedAnswers.length === 0 ? (
                  <div className="text-center py-8">
                    <Bookmark className="h-8 w-8 text-text-secondary mx-auto mb-2" />
                    <p className="text-sm text-text-secondary">
                      No saved answers yet
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {savedAnswers.map((id) => (
                      <div
                        key={id}
                        className="p-3 rounded-lg bg-surface-elevated border border-border-custom"
                      >
                        <p className="text-xs text-text-primary line-clamp-2">
                          Saved retrieval result
                        </p>
                        <button
                          type="button"
                          className="text-xs text-accent-red mt-2"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>

      {!contextPanelOpen && (
        <button
          type="button"
          onClick={() => setContextPanelOpen(true)}
          className="absolute right-0 top-1/2 -translate-y-1/2 p-2 bg-surface border border-border-custom rounded-l-lg hidden md:block"
        >
          <ChevronLeft className="h-4 w-4 text-text-secondary" />
        </button>
      )}
    </div>
  );
}

function MessageBubble({
  message,
  savedAnswers,
  onSave,
}: {
  message: ChatMessage;
  savedAnswers: string[];
  onSave: () => void;
}) {
  return (
    <div
      className={cn("flex gap-3", message.role === "user" && "flex-row-reverse")}
    >
      {message.role === "assistant" && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-cyan to-accent-green flex items-center justify-center shrink-0">
          <Brain className="h-4 w-4 text-background" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[70%] rounded-2xl p-4",
          message.role === "user"
            ? "bg-accent-cyan/10 border border-accent-cyan/20"
            : "bg-surface-elevated border border-border-custom"
        )}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-text-secondary">
            {message.role === "assistant" ? "MedVision AI" : "You"}
          </span>
          <span className="text-xs text-text-secondary">
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        <div className="text-sm text-text-primary whitespace-pre-wrap">
          {message.content}
        </div>

        {message.citations && message.citations.length > 0 && (
          <CitationList citations={message.citations} />
        )}

        {message.role === "assistant" && message.id !== "msg_001" && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border-custom">
            <button
              type="button"
              className="p-1.5 rounded hover:bg-surface transition-colors text-text-secondary hover:text-accent-green"
            >
              <ThumbsUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="p-1.5 rounded hover:bg-surface transition-colors text-text-secondary hover:text-accent-red"
            >
              <ThumbsDown className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="p-1.5 rounded hover:bg-surface transition-colors text-text-secondary hover:text-text-primary"
            >
              <Copy className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onSave}
              className={cn(
                "p-1.5 rounded hover:bg-surface transition-colors",
                savedAnswers.includes(message.id)
                  ? "text-accent-cyan"
                  : "text-text-secondary hover:text-accent-cyan"
              )}
            >
              <Bookmark className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CitationList({ citations }: { citations: Citation[] }) {
  return (
    <div className="mt-3 space-y-2">
      {citations.map((citation, index) => (
        <div
          key={`${citation.documentName}-${citation.page}-${index}`}
          className="p-3 rounded-lg bg-background border-l-2 border-accent-cyan"
        >
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-4 w-4 text-accent-cyan" />
            <span className="text-xs text-text-primary font-medium">
              {citation.documentName} - Page {citation.page}
            </span>
          </div>
          <p className="text-xs text-text-secondary">{citation.chapter}</p>
          <p className="text-xs text-text-secondary mt-1 font-mono">
            "{citation.snippet}"
          </p>
        </div>
      ))}
    </div>
  );
}
