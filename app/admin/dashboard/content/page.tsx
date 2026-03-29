"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  FileText,
  Layers,
  MoreHorizontal,
  Eye,
  Edit,
  Copy,
  Trash2,
  Filter,
  Grid3X3,
  List,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  MOCK_QUIZZES_ADMIN,
  MOCK_FLASHCARD_TEMPLATES,
  delay,
} from "@/lib/mockData/admin";

type ViewMode = "grid" | "list";
type ContentTab = "quizzes" | "flashcards";

export default function ContentPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ContentTab>("quizzes");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [topicFilter, setTopicFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    const loadData = async () => {
      await delay(800);
      setIsLoading(false);
    };
    loadData();
  }, []);

  const filteredQuizzes = useMemo(() => {
    let result = [...MOCK_QUIZZES_ADMIN];
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((q) => q.title.toLowerCase().includes(query));
    }
    if (topicFilter !== "all") {
      result = result.filter((q) => q.topic === topicFilter);
    }
    if (statusFilter !== "all") {
      result = result.filter((q) => q.status === statusFilter);
    }
    return result;
  }, [searchQuery, topicFilter, statusFilter]);

  const filteredFlashcards = useMemo(() => {
    let result = [...MOCK_FLASHCARD_TEMPLATES];
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((d) => d.title.toLowerCase().includes(query));
    }
    if (topicFilter !== "all") {
      result = result.filter((d) => d.topic === topicFilter);
    }
    if (statusFilter !== "all") {
      result = result.filter((d) => d.status === statusFilter);
    }
    return result;
  }, [searchQuery, topicFilter, statusFilter]);

  const getStatusColor = (status: string) => {
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
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-surface-elevated rounded animate-pulse" />
        <div className="h-12 bg-surface-elevated rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-surface-elevated/40 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-accent-red font-mono text-xs font-semibold tracking-wider mb-1">
            // CONTENT
          </p>
          <h1 className="text-2xl md:text-3xl font-[family-name:var(--font-syne)] font-bold text-text-primary">
            Content Manager
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Manage quizzes, flashcard decks, and learning materials.
          </p>
        </div>
        <Button asChild className="bg-gradient-to-r from-accent-red to-orange-500 text-white hover:opacity-90">
          <Link href="/admin/dashboard/content/quiz-builder">
            <Plus className="h-4 w-4 mr-2" />
            Create New
          </Link>
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ContentTab)}>
        <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
          <TabsList className="bg-surface-elevated border border-border-custom">
            <TabsTrigger value="quizzes" className="gap-2">
              <FileText className="h-4 w-4" />
              Quizzes ({MOCK_QUIZZES_ADMIN.length})
            </TabsTrigger>
            <TabsTrigger value="flashcards" className="gap-2">
              <Layers className="h-4 w-4" />
              Flashcards ({MOCK_FLASHCARD_TEMPLATES.length})
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

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
            <Input
              placeholder="Search content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-surface-elevated border-border-custom"
            />
          </div>
          <div className="flex gap-2">
            <Select value={topicFilter} onValueChange={setTopicFilter}>
              <SelectTrigger className="w-[130px] bg-surface-elevated border-border-custom">
                <SelectValue placeholder="Topic" />
              </SelectTrigger>
              <SelectContent className="bg-surface border-border-custom">
                <SelectItem value="all">All Topics</SelectItem>
                <SelectItem value="Chest">Chest</SelectItem>
                <SelectItem value="Neuro">Neuro</SelectItem>
                <SelectItem value="MSK">MSK</SelectItem>
                <SelectItem value="Abdominal">Abdominal</SelectItem>
                <SelectItem value="Cardiac">Cardiac</SelectItem>
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

        {/* Quizzes Tab */}
        <TabsContent value="quizzes" className="mt-6">
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredQuizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  className="bg-surface-elevated/40 backdrop-blur-sm border border-border-custom rounded-xl p-5 hover:border-accent-red/30 transition-colors group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className={cn("px-2 py-1 rounded text-xs font-medium", getStatusColor(quiz.status))}>
                      {quiz.status.charAt(0).toUpperCase() + quiz.status.slice(1)}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 hover:bg-surface rounded transition-colors opacity-0 group-hover:opacity-100">
                          <MoreHorizontal className="h-4 w-4 text-text-secondary" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-surface border-border-custom">
                        <DropdownMenuItem>
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/dashboard/content/quiz-builder?id=${quiz.id}`}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-border-custom" />
                        <DropdownMenuItem className="text-accent-red focus:text-accent-red">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <h3 className="text-text-primary font-semibold mb-1">{quiz.title}</h3>
                  <p className="text-text-secondary text-sm mb-3">{quiz.topic}</p>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">{quiz.questions} questions</span>
                    <div className="flex items-center gap-1 text-text-secondary">
                      <Activity className="h-4 w-4" />
                      <span>{quiz.usedBy} learners</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-border-custom flex items-center justify-between text-xs text-text-secondary">
                    <span>Avg: {quiz.avgScore}%</span>
                    <span>Updated: {quiz.lastEditedAt ?? "Not set"}</span>
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
                      <td className="p-4 text-text-secondary">{quiz.topic}</td>
                      <td className="p-4 text-text-secondary">{quiz.questions}</td>
                      <td className="p-4 text-text-secondary">{quiz.usedBy}</td>
                      <td className="p-4 text-text-secondary">{quiz.avgScore}%</td>
                      <td className="p-4">
                        <span className={cn("px-2 py-1 rounded text-xs font-medium", getStatusColor(quiz.status))}>
                          {quiz.status.charAt(0).toUpperCase() + quiz.status.slice(1)}
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
                            <DropdownMenuItem>
                              <Eye className="h-4 w-4 mr-2" />
                              Preview
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/dashboard/content/quiz-builder?id=${quiz.id}`}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-border-custom" />
                            <DropdownMenuItem className="text-accent-red focus:text-accent-red">
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

        {/* Flashcards Tab */}
        <TabsContent value="flashcards" className="mt-6">
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFlashcards.map((deck) => (
                <div
                  key={deck.id}
                  className="bg-surface-elevated/40 backdrop-blur-sm border border-border-custom rounded-xl p-5 hover:border-accent-red/30 transition-colors group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className={cn("px-2 py-1 rounded text-xs font-medium", getStatusColor(deck.status))}>
                      {deck.status.charAt(0).toUpperCase() + deck.status.slice(1)}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 hover:bg-surface rounded transition-colors opacity-0 group-hover:opacity-100">
                          <MoreHorizontal className="h-4 w-4 text-text-secondary" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-surface border-border-custom">
                        <DropdownMenuItem>
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-border-custom" />
                        <DropdownMenuItem className="text-accent-red focus:text-accent-red">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <h3 className="text-text-primary font-semibold mb-1">{deck.title}</h3>
                  <p className="text-text-secondary text-sm mb-3">{deck.topic}</p>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">{deck.cardCount} cards</span>
                    <div className="flex items-center gap-1 text-text-secondary">
                      <Activity className="h-4 w-4" />
                      <span>{deck.usedBy} learners</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-border-custom flex items-center justify-between text-xs text-text-secondary">
                    <span>Used by: {deck.usedBy} students</span>
                    <span>Updated: {deck.lastEditedAt ?? "Not set"}</span>
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
                      <td className="p-4 text-text-secondary">{deck.topic}</td>
                      <td className="p-4 text-text-secondary">{deck.cardCount}</td>
                      <td className="p-4 text-text-secondary">{deck.usedBy}</td>
                      <td className="p-4 text-text-secondary">{deck.lastEditedAt ?? "Not set"}</td>
                      <td className="p-4">
                        <span className={cn("px-2 py-1 rounded text-xs font-medium", getStatusColor(deck.status))}>
                          {deck.status.charAt(0).toUpperCase() + deck.status.slice(1)}
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
                            <DropdownMenuItem>
                              <Eye className="h-4 w-4 mr-2" />
                              Preview
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-border-custom" />
                            <DropdownMenuItem className="text-accent-red focus:text-accent-red">
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
