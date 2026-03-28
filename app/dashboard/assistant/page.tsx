"use client";

import { useState, useRef, useEffect } from "react";
import { 
  CloudUpload, 
  FileText, 
  Image as ImageIcon, 
  Scan, 
  Trash2,
  Paperclip,
  ArrowUp,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Bookmark,
  Brain,
  ChevronRight,
  ChevronLeft,
  Lightbulb,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProgressBar } from "@/components/dashboard/ui/ProgressBar";
import { cn } from "@/lib/utils";
import { MOCK_UPLOADED_SOURCES, delay } from "@/lib/mockData/dashboard";
import type { ChatMessage, UploadedSource, Citation } from "@/types/dashboard";

const SUGGESTED_PROMPTS = [
  "What are the signs of PE on CT?",
  "Explain GradCAM in chest X-ray",
  "Show CT findings for pneumonia",
];

const MOCK_MESSAGES: ChatMessage[] = [
  {
    id: "msg_001",
    role: "assistant",
    content: "Hello! I'm your AI radiology assistant. Ask me anything about your uploaded study materials. All my answers are grounded in your documents — no hallucinations, always cited.",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
  },
];

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_MESSAGES);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sources, setSources] = useState<UploadedSource[]>(MOCK_UPLOADED_SOURCES);
  const [contextPanelOpen, setContextPanelOpen] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [savedAnswers, setSavedAnswers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

    // Simulate AI response
    await delay(1500);

    const assistantMessage: ChatMessage = {
      id: `msg_${Date.now() + 1}`,
      role: "assistant",
      content: "Pulmonary embolism appears as a filling defect within the pulmonary artery on CT angiography. The thrombus prevents contrast from filling the vessel lumen, creating the characteristic \"polo mint sign\" on axial images. Key findings include:\n\n1. **Direct signs:** Intraluminal filling defect, complete or partial vessel occlusion\n2. **Indirect signs:** Hampton hump, mosaic attenuation, pleural effusion\n3. **Right heart strain:** RV:LV ratio > 1.0 indicates adverse prognosis",
      timestamp: new Date().toISOString(),
      confidence: 94,
      citations: [
        {
          documentName: "Radiology_Textbook.pdf",
          page: 243,
          chapter: "Chapter 8: Pulmonary Vasculature",
          snippet: "...appears as a filling defect within the pulmonary artery...",
        },
      ],
    };

    setIsTyping(false);
    setMessages((prev) => [...prev, assistantMessage]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    // Handle file upload logic here
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

  const totalSize = sources.reduce((acc, s) => {
    const size = parseFloat(s.size);
    return acc + (s.size.includes("MB") ? size * 1024 : size);
  }, 0);

  return (
    <div className="flex h-[calc(100vh-64px-2rem)] -m-4 md:-m-6 lg:-m-8">
      {/* Left Panel - Sources */}
      <div className="w-72 border-r border-border-custom bg-surface flex-col hidden lg:flex">
        <div className="p-4 border-b border-border-custom">
          <p className="text-xs font-mono text-accent-cyan uppercase tracking-wider">
            // YOUR MATERIALS
          </p>
        </div>

        {/* Upload Zone */}
        <div
          className={cn(
            "m-4 p-6 border-2 border-dashed rounded-xl text-center transition-all cursor-pointer",
            dragOver
              ? "border-accent-cyan bg-accent-cyan/5"
              : "border-border-custom hover:border-accent-cyan/50"
          )}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <CloudUpload className="h-8 w-8 text-text-secondary mx-auto mb-2" />
          <p className="text-sm text-text-primary mb-1">Drop files here</p>
          <p className="text-xs text-text-secondary">or click to browse</p>
          <p className="text-xs text-text-secondary mt-2">PDF · Images · DICOM</p>
        </div>

        {/* Sources List */}
        <div className="flex-1 overflow-y-auto px-4 space-y-2">
          {sources.map((source) => {
            const Icon = getSourceIcon(source.type);
            return (
              <div
                key={source.id}
                className="p-3 rounded-lg bg-surface-elevated border border-border-custom hover:border-accent-cyan/50 transition-all group relative"
              >
                <div className="flex items-start gap-3">
                  <Icon className="h-5 w-5 text-text-secondary shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary truncate">{source.name}</p>
                    {source.pages && (
                      <p className="text-xs text-text-secondary">
                        {source.chapters || `${source.pages} pages`}
                      </p>
                    )}
                    {source.status === "processing" && source.progress !== undefined && (
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
                      <span className="text-xs text-accent-green">Indexed</span>
                    )}
                    {source.status === "processing" && (
                      <span className="text-xs text-accent-amber">Processing...</span>
                    )}
                    <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="h-4 w-4 text-text-secondary hover:text-accent-red" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Storage Usage */}
        <div className="p-4 border-t border-border-custom">
          <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
            <span>Storage used</span>
            <span>{(totalSize / 1024).toFixed(1)} MB / 50 MB</span>
          </div>
          <ProgressBar value={totalSize / 1024} max={50} variant="cyan" size="sm" />
        </div>
      </div>

      {/* Center Panel - Chat */}
      <div className="flex-1 flex flex-col bg-background">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 1 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-cyan to-accent-green flex items-center justify-center mb-4">
                <Brain className="h-8 w-8 text-background" />
              </div>
              <h2 className="text-xl font-medium text-text-primary mb-2">Ask MedVision AI anything</h2>
              <p className="text-sm text-text-secondary max-w-md mb-6">
                Your questions are answered from your uploaded study materials only. No hallucination. Always cited.
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
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                message.role === "user" && "flex-row-reverse"
              )}
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
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <div className="text-sm text-text-primary whitespace-pre-wrap">
                  {message.content}
                </div>

                {/* Citations */}
                {message.citations && message.citations.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {message.citations.map((citation, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-background border-l-2 border-accent-cyan"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="h-4 w-4 text-accent-cyan" />
                          <span className="text-xs text-text-primary font-medium">
                            {citation.documentName} · Page {citation.page}
                          </span>
                        </div>
                        <p className="text-xs text-text-secondary">{citation.chapter}</p>
                        <p className="text-xs text-text-secondary mt-1 font-mono">
                          &quot;{citation.snippet}&quot;
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Action buttons for assistant messages */}
                {message.role === "assistant" && message.id !== "msg_001" && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border-custom">
                    <button className="p-1.5 rounded hover:bg-surface transition-colors text-text-secondary hover:text-accent-green">
                      <ThumbsUp className="h-4 w-4" />
                    </button>
                    <button className="p-1.5 rounded hover:bg-surface transition-colors text-text-secondary hover:text-accent-red">
                      <ThumbsDown className="h-4 w-4" />
                    </button>
                    <button className="p-1.5 rounded hover:bg-surface transition-colors text-text-secondary hover:text-text-primary">
                      <Copy className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => setSavedAnswers((prev) => [...prev, message.id])}
                      className={cn(
                        "p-1.5 rounded hover:bg-surface transition-colors",
                        savedAnswers.includes(message.id) ? "text-accent-cyan" : "text-text-secondary hover:text-accent-cyan"
                      )}
                    >
                      <Bookmark className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-cyan to-accent-green flex items-center justify-center shrink-0">
                <Brain className="h-4 w-4 text-background" />
              </div>
              <div className="bg-surface-elevated border border-border-custom rounded-2xl p-4">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-text-secondary mr-2">MedVision AI</span>
                  <span className="w-2 h-2 bg-accent-cyan rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-accent-cyan rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-accent-cyan rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-border-custom bg-surface">
          <div className="flex items-end gap-2 bg-surface-elevated rounded-xl border border-border-custom focus-within:border-accent-cyan transition-colors p-2">
            <button className="p-2 text-text-secondary hover:text-accent-cyan transition-colors">
              <Paperclip className="h-5 w-5" />
            </button>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your radiology materials..."
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

      {/* Right Panel - Context (collapsible) */}
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
                onClick={() => setContextPanelOpen(false)}
                className="p-1 hover:bg-surface-elevated rounded transition-colors"
              >
                <ChevronRight className="h-4 w-4 text-text-secondary" />
              </button>
            </div>

            <Tabs defaultValue="details" className="flex-1 flex flex-col">
              <TabsList className="mx-4 mt-2 bg-surface-elevated">
                <TabsTrigger value="details" className="text-xs">Answer Details</TabsTrigger>
                <TabsTrigger value="related" className="text-xs">Related</TabsTrigger>
                <TabsTrigger value="saved" className="text-xs">Saved</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="flex-1 p-4 space-y-4">
                <div>
                  <p className="text-xs text-text-secondary mb-2">Confidence Score</p>
                  <div className="flex items-center gap-2">
                    <ProgressBar value={94} max={100} variant="green" size="md" className="flex-1" />
                    <span className="text-sm font-mono text-accent-green">94%</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-text-secondary mb-2">Sources Used</p>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-text-primary">
                      <FileText className="h-4 w-4 text-accent-cyan" />
                      Radiology_Textbook.pdf
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-text-secondary mb-2">Retrieval Method</p>
                  <span className="text-xs font-mono bg-surface-elevated px-2 py-1 rounded">
                    Hybrid Dense + BM25
                  </span>
                </div>
                <div>
                  <p className="text-xs text-text-secondary mb-2">Response Tokens</p>
                  <span className="text-xs font-mono text-text-secondary">142 tokens</span>
                </div>
              </TabsContent>

              <TabsContent value="related" className="flex-1 p-4">
                <p className="text-xs text-text-secondary mb-3">Explore related topics</p>
                <div className="flex flex-wrap gap-2">
                  {["CT angiography technique", "PE risk factors", "D-dimer correlation", "Treatment protocols"].map((topic) => (
                    <button
                      key={topic}
                      onClick={() => setInput(`Tell me about ${topic.toLowerCase()}`)}
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
                    <p className="text-sm text-text-secondary">No saved answers yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {savedAnswers.map((id) => (
                      <div key={id} className="p-3 rounded-lg bg-surface-elevated border border-border-custom">
                        <p className="text-xs text-text-primary line-clamp-2">Saved answer...</p>
                        <button className="text-xs text-accent-red mt-2">Remove</button>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>

      {/* Collapse toggle when panel is closed */}
      {!contextPanelOpen && (
        <button
          onClick={() => setContextPanelOpen(true)}
          className="absolute right-0 top-1/2 -translate-y-1/2 p-2 bg-surface border border-border-custom rounded-l-lg hidden md:block"
        >
          <ChevronLeft className="h-4 w-4 text-text-secondary" />
        </button>
      )}
    </div>
  );
}
