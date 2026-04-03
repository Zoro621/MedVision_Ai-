"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Copy,
  GripVertical,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  createAdminQuiz,
  getAdminQuiz,
  updateAdminQuiz,
  type AdminContentStatus,
  type AdminDifficulty,
} from "@/lib/api/adminContent";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type QuestionType = "multiple-choice" | "true-false";
type Option = { id: string; text: string };
type Question = {
  id: string;
  type: QuestionType;
  prompt: string;
  options: Option[];
  correctAnswer: string;
  explanation: string;
  sourceDocument: string;
  sourcePage: string;
  irtDifficulty: string;
  irtDiscrimination: string;
  irtGuessing: string;
  expanded: boolean;
};

const TOPICS = ["Chest", "Neuro", "MSK", "Abdominal", "Cardiac", "Paediatric"];
const DIFFICULTIES: AdminDifficulty[] = ["beginner", "intermediate", "advanced"];
const makeId = () => Math.random().toString(36).slice(2, 10);
const labelFor = (index: number) => String.fromCharCode(65 + index);
const blankQuestion = (): Question => ({
  id: makeId(),
  type: "multiple-choice",
  prompt: "",
  options: [
    { id: makeId(), text: "" },
    { id: makeId(), text: "" },
  ],
  correctAnswer: "A",
  explanation: "",
  sourceDocument: "",
  sourcePage: "",
  irtDifficulty: "",
  irtDiscrimination: "",
  irtGuessing: "",
  expanded: true,
});

function QuizBuilderPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-32 rounded bg-surface-elevated animate-pulse" />
      <div className="h-40 rounded-xl bg-surface-elevated/40 animate-pulse" />
      <div className="h-[400px] rounded-xl bg-surface-elevated/40 animate-pulse" />
    </div>
  );
}

function QuizBuilderPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const quizId = searchParams.get("id");

  const [loading, setLoading] = useState(Boolean(quizId));
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] =
    useState<AdminDifficulty>("intermediate");
  const [minutes, setMinutes] = useState("30");
  const [status, setStatus] = useState<AdminContentStatus>("draft");
  const [questions, setQuestions] = useState<Question[]>([blankQuestion()]);

  useEffect(() => {
    let cancelled = false;
    const currentQuizId = quizId;
    if (!currentQuizId) {
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    async function load() {
      if (!currentQuizId) return;

      try {
        const quiz = await getAdminQuiz(currentQuizId);
        if (cancelled) return;
        setTitle(quiz.title);
        setDescription(quiz.description ?? "");
        setTopic(quiz.topic ?? "");
        setDifficulty((quiz.difficulty as AdminDifficulty) ?? "intermediate");
        setMinutes(String(quiz.estimatedMinutes));
        setStatus(quiz.status);
        setQuestions(
          quiz.questions.map((question, index) => ({
            id: question.id ?? makeId(),
            type:
              question.options.length === 2 &&
              question.options[0]?.text.toLowerCase() === "true" &&
              question.options[1]?.text.toLowerCase() === "false"
                ? "true-false"
                : "multiple-choice",
            prompt: question.prompt,
            options: question.options.map((option) => ({
              id: makeId(),
              text: option.text,
            })),
            correctAnswer: question.correctAnswer,
            explanation: question.explanation ?? "",
            sourceDocument: question.sourceDocument ?? "",
            sourcePage: question.sourcePage ? String(question.sourcePage) : "",
            irtDifficulty:
              question.irtDifficulty !== undefined && question.irtDifficulty !== null
                ? String(question.irtDifficulty)
                : "",
            irtDiscrimination:
              question.irtDiscrimination !== undefined &&
              question.irtDiscrimination !== null
                ? String(question.irtDiscrimination)
                : "",
            irtGuessing:
              question.irtGuessing !== undefined && question.irtGuessing !== null
                ? String(question.irtGuessing)
                : "",
            expanded: index === 0,
          }))
        );
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load quiz.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [quizId]);

  const updateQuestion = (id: string, updates: Partial<Question>) =>
    setQuestions((items) =>
      items.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );

  async function save(nextStatus: AdminContentStatus) {
    if (!title.trim()) {
      toast.error("Quiz title is required.");
      return;
    }

    const payloadQuestions = [];
    for (const [index, question] of questions.entries()) {
      if (!question.prompt.trim()) {
        toast.error(`Question ${index + 1} needs a prompt.`);
        return;
      }
      if (question.type === "multiple-choice" && question.options.some((o) => !o.text.trim())) {
        toast.error(`Question ${index + 1} has an empty option.`);
        return;
      }
      payloadQuestions.push({
        prompt: question.prompt.trim(),
        options:
          question.type === "true-false"
            ? [
                { label: "A", text: "True" },
                { label: "B", text: "False" },
              ]
            : question.options.map((option, optionIndex) => ({
                label: labelFor(optionIndex),
                text: option.text.trim(),
              })),
        correctAnswer:
          question.type === "true-false"
            ? question.correctAnswer === "B"
              ? "B"
              : "A"
            : question.correctAnswer,
        explanation: question.explanation.trim() || undefined,
        sourceDocument: question.sourceDocument.trim() || undefined,
        sourcePage: question.sourcePage ? Number.parseInt(question.sourcePage, 10) : undefined,
        irtDifficulty: question.irtDifficulty ? Number.parseInt(question.irtDifficulty, 10) : undefined,
        irtDiscrimination: question.irtDiscrimination ? Number.parseFloat(question.irtDiscrimination) : undefined,
        irtGuessing: question.irtGuessing ? Number.parseFloat(question.irtGuessing) : undefined,
        orderIndex: index,
      });
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        topic: topic || undefined,
        difficulty,
        estimatedMinutes: Math.max(1, Number.parseInt(minutes, 10) || 0),
        status: nextStatus,
        questions: payloadQuestions,
      };
      const saved = quizId
        ? await updateAdminQuiz(quizId, payload)
        : await createAdminQuiz(payload);
      setStatus(saved.status);
      toast.success(
        nextStatus === "published"
          ? `Quiz "${saved.title}" published.`
          : `Quiz "${saved.title}" saved as draft.`
      );
      if (!quizId) {
        router.replace(`/admin/dashboard/content/quiz-builder?id=${saved.id}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save quiz.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <QuizBuilderPageSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin/dashboard/content" className="p-2 hover:bg-surface-elevated rounded-lg transition-colors">
            <ArrowLeft className="h-5 w-5 text-text-secondary" />
          </Link>
          <div>
            <p className="text-accent-red font-mono text-xs font-semibold tracking-wider mb-1">// QUIZ BUILDER</p>
            <h1 className="text-2xl font-[family-name:var(--font-syne)] font-bold text-text-primary">
              {quizId ? "Edit Quiz" : "Create New Quiz"}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn("px-3 py-1 rounded-full text-xs font-medium", status === "published" ? "bg-accent-green/20 text-accent-green" : status === "draft" ? "bg-accent-amber/20 text-accent-amber" : "bg-text-secondary/20 text-text-secondary")}>
            {status}
          </span>
          <Button variant="outline" onClick={() => void save("draft")} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          <Button className="bg-gradient-to-r from-accent-red to-orange-500 text-white hover:opacity-90" onClick={() => void save("published")} disabled={saving}>
            {saving ? "Saving..." : "Save and Publish"}
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <div className="bg-surface-elevated/40 border border-border-custom rounded-xl p-6 space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={(event) => setTitle(event.target.value)} className="bg-surface border-border-custom" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(event) => setDescription(event.target.value)} className="bg-surface border-border-custom min-h-[96px]" />
            </div>
            <div className="space-y-2">
              <Label>Topic</Label>
              <Select value={topic} onValueChange={setTopic}>
                <SelectTrigger className="bg-surface border-border-custom"><SelectValue placeholder="Select topic" /></SelectTrigger>
                <SelectContent className="bg-surface border-border-custom">
                  {TOPICS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Difficulty</Label>
              <Select value={difficulty} onValueChange={(value) => setDifficulty(value as AdminDifficulty)}>
                <SelectTrigger className="bg-surface border-border-custom"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-surface border-border-custom">
                  {DIFFICULTIES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Estimated Minutes</Label>
              <Input type="number" min={1} max={180} value={minutes} onChange={(event) => setMinutes(event.target.value)} className="bg-surface border-border-custom" />
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {questions.map((question, index) => (
            <div key={question.id} className="bg-surface-elevated/40 border border-border-custom rounded-xl overflow-hidden">
              <div className="flex items-center gap-3 p-4 border-b border-border-custom cursor-pointer hover:bg-surface/30 transition-colors" onClick={() => updateQuestion(question.id, { expanded: !question.expanded })}>
                <GripVertical className="h-5 w-5 text-text-secondary" />
                <span className="bg-accent-red/20 text-accent-red text-xs font-semibold px-2 py-1 rounded">Q{index + 1}</span>
                <span className="text-text-primary flex-1 truncate">{question.prompt.trim() || `Untitled question ${index + 1}`}</span>
                {question.expanded ? <ChevronUp className="h-5 w-5 text-text-secondary" /> : <ChevronDown className="h-5 w-5 text-text-secondary" />}
              </div>

              {question.expanded && (
                <div className="p-4 space-y-4">
                  <div className="grid md:grid-cols-[180px_1fr] gap-4">
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select
                        value={question.type}
                        onValueChange={(value) =>
                          updateQuestion(question.id, {
                            type: value as QuestionType,
                            options:
                              value === "true-false"
                                ? [
                                    { id: makeId(), text: "True" },
                                    { id: makeId(), text: "False" },
                                  ]
                                : [
                                    { id: makeId(), text: "" },
                                    { id: makeId(), text: "" },
                                  ],
                            correctAnswer: "A",
                          })
                        }
                      >
                        <SelectTrigger className="bg-surface border-border-custom"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-surface border-border-custom">
                          <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                          <SelectItem value="true-false">True / False</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Prompt</Label>
                      <Textarea value={question.prompt} onChange={(event) => updateQuestion(question.id, { prompt: event.target.value })} className="bg-surface border-border-custom min-h-[96px]" />
                    </div>
                  </div>

                  {question.type === "multiple-choice" ? (
                    <div className="space-y-3">
                      <Label>Options</Label>
                      {question.options.map((option, optionIndex) => {
                        const label = labelFor(optionIndex);
                        return (
                          <div key={option.id} className="flex items-center gap-2">
                            <button type="button" onClick={() => updateQuestion(question.id, { correctAnswer: label })} className={cn("w-8 h-8 rounded-full border-2 text-sm font-medium transition-colors", question.correctAnswer === label ? "border-accent-green bg-accent-green/20 text-accent-green" : "border-border-custom text-text-secondary hover:border-accent-green/50")}>{label}</button>
                            <Input value={option.text} onChange={(event) => setQuestions((items) => items.map((item) => item.id === question.id ? { ...item, options: item.options.map((entry) => entry.id === option.id ? { ...entry, text: event.target.value } : entry) } : item))} className="bg-surface border-border-custom flex-1" />
                            {question.options.length > 2 && (
                              <button type="button" onClick={() => setQuestions((items) => items.map((item) => item.id === question.id ? { ...item, options: item.options.filter((entry) => entry.id !== option.id), correctAnswer: "A" } : item))} className="p-2 text-text-secondary hover:text-accent-red transition-colors">
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                      {question.options.length < 6 && (
                        <Button variant="ghost" size="sm" onClick={() => setQuestions((items) => items.map((item) => item.id === question.id ? { ...item, options: [...item.options, { id: makeId(), text: "" }] } : item))}>
                          <Plus className="h-4 w-4 mr-1" />
                          Add Option
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <Button variant={question.correctAnswer === "A" ? "default" : "outline"} onClick={() => updateQuestion(question.id, { correctAnswer: "A" })}>True</Button>
                      <Button variant={question.correctAnswer === "B" ? "default" : "outline"} onClick={() => updateQuestion(question.id, { correctAnswer: "B" })}>False</Button>
                    </div>
                  )}

                  <Textarea placeholder="Explanation" value={question.explanation} onChange={(event) => updateQuestion(question.id, { explanation: event.target.value })} className="bg-surface border-border-custom min-h-[80px]" />
                  <div className="grid md:grid-cols-2 gap-4">
                    <Input placeholder="Source document" value={question.sourceDocument} onChange={(event) => updateQuestion(question.id, { sourceDocument: event.target.value })} className="bg-surface border-border-custom" />
                    <Input type="number" min={1} placeholder="Source page" value={question.sourcePage} onChange={(event) => updateQuestion(question.id, { sourcePage: event.target.value })} className="bg-surface border-border-custom" />
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <Input type="number" placeholder="IRT difficulty" value={question.irtDifficulty} onChange={(event) => updateQuestion(question.id, { irtDifficulty: event.target.value })} className="bg-surface border-border-custom" />
                    <Input type="number" step="0.1" placeholder="IRT discrimination" value={question.irtDiscrimination} onChange={(event) => updateQuestion(question.id, { irtDiscrimination: event.target.value })} className="bg-surface border-border-custom" />
                    <Input type="number" step="0.01" placeholder="IRT guessing" value={question.irtGuessing} onChange={(event) => updateQuestion(question.id, { irtGuessing: event.target.value })} className="bg-surface border-border-custom" />
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-custom">
                    <Button variant="ghost" size="sm" onClick={() => setQuestions((items) => { const indexToCopy = items.findIndex((item) => item.id === question.id); const copy = { ...question, id: makeId(), options: question.options.map((option) => ({ ...option, id: makeId() })), expanded: true }; const next = [...items]; next.splice(indexToCopy + 1, 0, copy); return next; })}>
                      <Copy className="h-4 w-4 mr-1" />
                      Duplicate
                    </Button>
                    {questions.length > 1 && (
                      <Button variant="ghost" size="sm" onClick={() => setQuestions((items) => items.filter((item) => item.id !== question.id))} className="text-accent-red hover:text-accent-red/80">
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          <Button variant="outline" onClick={() => setQuestions((items) => [...items, blankQuestion()])} className="w-full border-dashed border-border-custom py-8 hover:border-accent-red/50">
            <Plus className="h-5 w-5 mr-2" />
            Add Question
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function QuizBuilderPage() {
  return (
    <Suspense fallback={<QuizBuilderPageSkeleton />}>
      <QuizBuilderPageContent />
    </Suspense>
  );
}
