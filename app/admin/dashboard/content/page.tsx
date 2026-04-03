"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Edit,
  FileText,
  Grid3X3,
  Layers,
  List,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  archiveAdminFlashcardDeck,
  archiveAdminQuiz,
  deleteAdminFlashcardDeck,
  deleteAdminQuiz,
  listAdminFlashcardDecks,
  listAdminQuizzes,
  publishAdminFlashcardDeck,
  publishAdminQuiz,
  type AdminContentStatus,
  type AdminFlashcardDeckSummary,
  type AdminQuizSummary,
} from "@/lib/api/adminContent";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ViewMode = "grid" | "list";
type ContentTab = "quizzes" | "flashcards";

function formatTimestamp(value?: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Date(value).toLocaleDateString();
}

function getStatusColor(status: AdminContentStatus) {
  switch (status) {
    case "published":
      return "bg-accent-green/20 text-accent-green";
    case "draft":
      return "bg-accent-amber/20 text-accent-amber";
    case "archived":
      return "bg-text-secondary/20 text-text-secondary";
    default:
      return "bg-text-secondary/20 text-text-secondary";
  }
}

export default function ContentPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ContentTab>("quizzes");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [topicFilter, setTopicFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [quizzes, setQuizzes] = useState<AdminQuizSummary[]>([]);
  const [flashcardDecks, setFlashcardDecks] = useState<AdminFlashcardDeckSummary[]>(
    []
  );
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadContent() {
    setError(null);

    try {
      const [nextQuizzes, nextDecks] = await Promise.all([
        listAdminQuizzes(),
        listAdminFlashcardDecks(),
      ]);
      setQuizzes(nextQuizzes);
      setFlashcardDecks(nextDecks);
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Failed to load content."
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadContent();
  }, []);

  const topicOptions = useMemo(() => {
    const source = activeTab === "quizzes" ? quizzes : flashcardDecks;
    const topics = new Set<string>();

    source.forEach((item) => {
      if (item.topic) {
        topics.add(item.topic);
      }
    });

    return [...topics].sort();
  }, [activeTab, flashcardDecks, quizzes]);

  const filteredQuizzes = useMemo(() => {
    return quizzes.filter((quiz) => {
      const matchesQuery =
        searchQuery.trim().length === 0 ||
        quiz.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTopic = topicFilter === "all" || quiz.topic === topicFilter;
      const matchesStatus =
        statusFilter === "all" || quiz.status === statusFilter;
      return matchesQuery && matchesTopic && matchesStatus;
    });
  }, [quizzes, searchQuery, statusFilter, topicFilter]);

  const filteredFlashcards = useMemo(() => {
    return flashcardDecks.filter((deck) => {
      const matchesQuery =
        searchQuery.trim().length === 0 ||
        deck.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTopic = topicFilter === "all" || deck.topic === topicFilter;
      const matchesStatus =
        statusFilter === "all" || deck.status === statusFilter;
      return matchesQuery && matchesTopic && matchesStatus;
    });
  }, [flashcardDecks, searchQuery, statusFilter, topicFilter]);

  async function handleQuizStatus(
    quiz: AdminQuizSummary,
    nextStatus: "publish" | "archive"
  ) {
    setBusyId(quiz.id);

    try {
      if (nextStatus === "publish") {
        await publishAdminQuiz(quiz.id);
        toast.success(`Published "${quiz.title}".`);
      } else {
        await archiveAdminQuiz(quiz.id);
        toast.success(`Archived "${quiz.title}".`);
      }

      await loadContent();
    } catch (nextError) {
      toast.error(
        nextError instanceof Error ? nextError.message : "Action failed."
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeckStatus(
    deck: AdminFlashcardDeckSummary,
    nextStatus: "publish" | "archive"
  ) {
    setBusyId(deck.id);

    try {
      if (nextStatus === "publish") {
        await publishAdminFlashcardDeck(deck.id);
        toast.success(`Published "${deck.title}".`);
      } else {
        await archiveAdminFlashcardDeck(deck.id);
        toast.success(`Archived "${deck.title}".`);
      }

      await loadContent();
    } catch (nextError) {
      toast.error(
        nextError instanceof Error ? nextError.message : "Action failed."
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleQuizDelete(quiz: AdminQuizSummary) {
    if (!window.confirm(`Delete "${quiz.title}"? This cannot be undone.`)) {
      return;
    }

    setBusyId(quiz.id);

    try {
      await deleteAdminQuiz(quiz.id);
      toast.success(`Deleted "${quiz.title}".`);
      await loadContent();
    } catch (nextError) {
      toast.error(
        nextError instanceof Error ? nextError.message : "Delete failed."
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeckDelete(deck: AdminFlashcardDeckSummary) {
    if (!window.confirm(`Delete "${deck.title}"? This cannot be undone.`)) {
      return;
    }

    setBusyId(deck.id);

    try {
      await deleteAdminFlashcardDeck(deck.id);
      toast.success(`Deleted "${deck.title}".`);
      await loadContent();
    } catch (nextError) {
      toast.error(
        nextError instanceof Error ? nextError.message : "Delete failed."
      );
    } finally {
      setBusyId(null);
    }
  }

  const createHref =
    activeTab === "quizzes"
      ? "/admin/dashboard/content/quiz-builder"
      : "/admin/dashboard/content/flashcard-builder";

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-surface-elevated rounded animate-pulse" />
        <div className="h-12 bg-surface-elevated rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, index) => (
            <div
              key={index}
              className="h-48 bg-surface-elevated/40 rounded-xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-accent-red font-mono text-xs font-semibold tracking-wider mb-1">
            // CONTENT
          </p>
          <h1 className="text-2xl md:text-3xl font-[family-name:var(--font-syne)] font-bold text-text-primary">
            Content Manager
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Manage quizzes, flashcard decks, and the Phase 5 learning content stack.
          </p>
        </div>
        <Button
          asChild
          className="bg-gradient-to-r from-accent-red to-orange-500 text-white hover:opacity-90"
        >
          <Link href={createHref}>
            <Plus className="h-4 w-4 mr-2" />
            {activeTab === "quizzes" ? "Create Quiz" : "Create Deck"}
          </Link>
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-accent-red/30 bg-accent-red/10 p-4 text-sm text-accent-red">
          {error}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ContentTab)}>
        <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
          <TabsList className="bg-surface-elevated border border-border-custom">
            <TabsTrigger value="quizzes" className="gap-2">
              <FileText className="h-4 w-4" />
              Quizzes ({quizzes.length})
            </TabsTrigger>
            <TabsTrigger value="flashcards" className="gap-2">
              <Layers className="h-4 w-4" />
              Flashcards ({flashcardDecks.length})
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("grid")}
              className={viewMode === "grid" ? "bg-accent-red" : "border-border-custom"}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("list")}
              className={viewMode === "list" ? "bg-accent-red" : "border-border-custom"}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
            <Input
              placeholder="Search content..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="pl-10 bg-surface-elevated border-border-custom"
            />
          </div>
          <div className="flex gap-2">
            <Select value={topicFilter} onValueChange={setTopicFilter}>
              <SelectTrigger className="w-[150px] bg-surface-elevated border-border-custom">
                <SelectValue placeholder="Topic" />
              </SelectTrigger>
              <SelectContent className="bg-surface border-border-custom">
                <SelectItem value="all">All Topics</SelectItem>
                {topicOptions.map((topic) => (
                  <SelectItem key={topic} value={topic}>
                    {topic}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px] bg-surface-elevated border-border-custom">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-surface border-border-custom">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value="quizzes" className="mt-6">
          {filteredQuizzes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border-custom p-8 text-center">
              <p className="text-text-primary font-medium">No quizzes match these filters.</p>
              <p className="text-sm text-text-secondary mt-1">
                Adjust the filters or create a new quiz to continue.
              </p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredQuizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  className="bg-surface-elevated/40 backdrop-blur-sm border border-border-custom rounded-xl p-5 hover:border-accent-red/30 transition-colors group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span
                      className={cn(
                        "px-2 py-1 rounded text-xs font-medium",
                        getStatusColor(quiz.status)
                      )}
                    >
                      {quiz.status}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 hover:bg-surface rounded transition-colors opacity-0 group-hover:opacity-100">
                          <MoreHorizontal className="h-4 w-4 text-text-secondary" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-surface border-border-custom">
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/dashboard/content/quiz-builder?id=${quiz.id}`}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() =>
                            void handleQuizStatus(
                              quiz,
                              quiz.status === "published" ? "archive" : "publish"
                            )
                          }
                          disabled={busyId === quiz.id}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          {quiz.status === "published" ? "Archive" : "Publish"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-border-custom" />
                        <DropdownMenuItem
                          onSelect={() => void handleQuizDelete(quiz)}
                          disabled={busyId === quiz.id}
                          className="text-accent-red focus:text-accent-red"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <h3 className="text-text-primary font-semibold mb-1">{quiz.title}</h3>
                  <p className="text-text-secondary text-sm mb-3">
                    {(quiz.topic ?? "General") + " - " + (quiz.difficulty ?? "Mixed")}
                  </p>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">
                      {quiz.questionCount} questions
                    </span>
                    <div className="flex items-center gap-1 text-text-secondary">
                      <Activity className="h-4 w-4" />
                      <span>{quiz.usedBy} learners</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-border-custom flex items-center justify-between text-xs text-text-secondary">
                    <span>Avg: {quiz.avgScore}%</span>
                    <span>Updated: {formatTimestamp(quiz.lastEditedAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-surface-elevated/40 backdrop-blur-sm border border-border-custom rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border-custom bg-surface/50">
                    <th className="p-4 text-left text-text-secondary text-xs font-semibold uppercase tracking-wider">Title</th>
                    <th className="p-4 text-left text-text-secondary text-xs font-semibold uppercase tracking-wider">Topic</th>
                    <th className="p-4 text-left text-text-secondary text-xs font-semibold uppercase tracking-wider">Questions</th>
                    <th className="p-4 text-left text-text-secondary text-xs font-semibold uppercase tracking-wider">Learners</th>
                    <th className="p-4 text-left text-text-secondary text-xs font-semibold uppercase tracking-wider">Avg Score</th>
                    <th className="p-4 text-left text-text-secondary text-xs font-semibold uppercase tracking-wider">Status</th>
                    <th className="p-4 text-left text-text-secondary text-xs font-semibold uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQuizzes.map((quiz) => (
                    <tr key={quiz.id} className="border-b border-border-custom hover:bg-accent-red/[0.04]">
                      <td className="p-4 text-text-primary font-medium">{quiz.title}</td>
                      <td className="p-4 text-text-secondary">{quiz.topic ?? "General"}</td>
                      <td className="p-4 text-text-secondary">{quiz.questionCount}</td>
                      <td className="p-4 text-text-secondary">{quiz.usedBy}</td>
                      <td className="p-4 text-text-secondary">{quiz.avgScore}%</td>
                      <td className="p-4">
                        <span
                          className={cn(
                            "px-2 py-1 rounded text-xs font-medium",
                            getStatusColor(quiz.status)
                          )}
                        >
                          {quiz.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-2 hover:bg-surface rounded transition-colors">
                              <MoreHorizontal className="h-4 w-4 text-text-secondary" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-surface border-border-custom">
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/dashboard/content/quiz-builder?id=${quiz.id}`}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() =>
                                void handleQuizStatus(
                                  quiz,
                                  quiz.status === "published" ? "archive" : "publish"
                                )
                              }
                              disabled={busyId === quiz.id}
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              {quiz.status === "published" ? "Archive" : "Publish"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-border-custom" />
                            <DropdownMenuItem
                              onSelect={() => void handleQuizDelete(quiz)}
                              disabled={busyId === quiz.id}
                              className="text-accent-red focus:text-accent-red"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="flashcards" className="mt-6">
          {filteredFlashcards.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border-custom p-8 text-center">
              <p className="text-text-primary font-medium">No flashcard decks match these filters.</p>
              <p className="text-sm text-text-secondary mt-1">
                Adjust the filters or create a new deck to continue.
              </p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFlashcards.map((deck) => (
                <div
                  key={deck.id}
                  className="bg-surface-elevated/40 backdrop-blur-sm border border-border-custom rounded-xl p-5 hover:border-accent-red/30 transition-colors group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span
                      className={cn(
                        "px-2 py-1 rounded text-xs font-medium",
                        getStatusColor(deck.status)
                      )}
                    >
                      {deck.status}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 hover:bg-surface rounded transition-colors opacity-0 group-hover:opacity-100">
                          <MoreHorizontal className="h-4 w-4 text-text-secondary" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-surface border-border-custom">
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/dashboard/content/flashcard-builder?id=${deck.id}`}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() =>
                            void handleDeckStatus(
                              deck,
                              deck.status === "published" ? "archive" : "publish"
                            )
                          }
                          disabled={busyId === deck.id}
                        >
                          <Layers className="h-4 w-4 mr-2" />
                          {deck.status === "published" ? "Archive" : "Publish"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-border-custom" />
                        <DropdownMenuItem
                          onSelect={() => void handleDeckDelete(deck)}
                          disabled={busyId === deck.id}
                          className="text-accent-red focus:text-accent-red"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <h3 className="text-text-primary font-semibold mb-1">{deck.title}</h3>
                  <p className="text-text-secondary text-sm mb-3">
                    {(deck.topic ?? "General") + " radiology"}
                  </p>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">{deck.cardCount} cards</span>
                    <div className="flex items-center gap-1 text-text-secondary">
                      <Activity className="h-4 w-4" />
                      <span>{deck.usedBy} learners</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-border-custom flex items-center justify-between text-xs text-text-secondary">
                    <span>Updated: {formatTimestamp(deck.lastEditedAt)}</span>
                    <span>{deck.usedBy} learners</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-surface-elevated/40 backdrop-blur-sm border border-border-custom rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border-custom bg-surface/50">
                    <th className="p-4 text-left text-text-secondary text-xs font-semibold uppercase tracking-wider">Title</th>
                    <th className="p-4 text-left text-text-secondary text-xs font-semibold uppercase tracking-wider">Topic</th>
                    <th className="p-4 text-left text-text-secondary text-xs font-semibold uppercase tracking-wider">Cards</th>
                    <th className="p-4 text-left text-text-secondary text-xs font-semibold uppercase tracking-wider">Learners</th>
                    <th className="p-4 text-left text-text-secondary text-xs font-semibold uppercase tracking-wider">Updated</th>
                    <th className="p-4 text-left text-text-secondary text-xs font-semibold uppercase tracking-wider">Status</th>
                    <th className="p-4 text-left text-text-secondary text-xs font-semibold uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFlashcards.map((deck) => (
                    <tr key={deck.id} className="border-b border-border-custom hover:bg-accent-red/[0.04]">
                      <td className="p-4 text-text-primary font-medium">{deck.title}</td>
                      <td className="p-4 text-text-secondary">{deck.topic ?? "General"}</td>
                      <td className="p-4 text-text-secondary">{deck.cardCount}</td>
                      <td className="p-4 text-text-secondary">{deck.usedBy}</td>
                      <td className="p-4 text-text-secondary">
                        {formatTimestamp(deck.lastEditedAt)}
                      </td>
                      <td className="p-4">
                        <span
                          className={cn(
                            "px-2 py-1 rounded text-xs font-medium",
                            getStatusColor(deck.status)
                          )}
                        >
                          {deck.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-2 hover:bg-surface rounded transition-colors">
                              <MoreHorizontal className="h-4 w-4 text-text-secondary" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-surface border-border-custom">
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/dashboard/content/flashcard-builder?id=${deck.id}`}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() =>
                                void handleDeckStatus(
                                  deck,
                                  deck.status === "published" ? "archive" : "publish"
                                )
                              }
                              disabled={busyId === deck.id}
                            >
                              <Layers className="h-4 w-4 mr-2" />
                              {deck.status === "published" ? "Archive" : "Publish"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-border-custom" />
                            <DropdownMenuItem
                              onSelect={() => void handleDeckDelete(deck)}
                              disabled={busyId === deck.id}
                              className="text-accent-red focus:text-accent-red"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
