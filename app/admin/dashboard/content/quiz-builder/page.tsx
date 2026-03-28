"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  GripVertical,
  Trash2,
  Copy,
  ImagePlus,
  Sparkles,
  Save,
  Eye,
  Check,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { delay } from "@/lib/mockData/admin";

type QuestionType = "multiple-choice" | "true-false" | "image-hotspot";

interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface Question {
  id: string;
  type: QuestionType;
  text: string;
  options: QuestionOption[];
  explanation: string;
  imageUrl?: string;
  points: number;
  expanded: boolean;
}

const createEmptyQuestion = (): Question => ({
  id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  type: "multiple-choice",
  text: "",
  options: [
    { id: `o-${Date.now()}-1`, text: "", isCorrect: true },
    { id: `o-${Date.now()}-2`, text: "", isCorrect: false },
    { id: `o-${Date.now()}-3`, text: "", isCorrect: false },
    { id: `o-${Date.now()}-4`, text: "", isCorrect: false },
  ],
  explanation: "",
  points: 10,
  expanded: true,
});

export default function QuizBuilderPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [quizTitle, setQuizTitle] = useState("");
  const [quizTopic, setQuizTopic] = useState<string>("");
  const [quizDifficulty, setQuizDifficulty] = useState<string>("intermediate");
  const [timeLimit, setTimeLimit] = useState(30);
  const [passingScore, setPassingScore] = useState(70);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [showExplanations, setShowExplanations] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([createEmptyQuestion()]);

  useEffect(() => {
    const loadData = async () => {
      await delay(500);
      setIsLoading(false);
    };
    loadData();
  }, []);

  const addQuestion = () => {
    setQuestions([...questions, createEmptyQuestion()]);
  };

  const removeQuestion = (id: string) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((q) => q.id !== id));
    }
  };

  const duplicateQuestion = (id: string) => {
    const idx = questions.findIndex((q) => q.id === id);
    if (idx !== -1) {
      const newQ = {
        ...questions[idx],
        id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        options: questions[idx].options.map((o) => ({
          ...o,
          id: `o-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        })),
      };
      const newQuestions = [...questions];
      newQuestions.splice(idx + 1, 0, newQ);
      setQuestions(newQuestions);
    }
  };

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setQuestions(questions.map((q) => (q.id === id ? { ...q, ...updates } : q)));
  };

  const updateOption = (questionId: string, optionId: string, updates: Partial<QuestionOption>) => {
    setQuestions(
      questions.map((q) =>
        q.id === questionId
          ? {
              ...q,
              options: q.options.map((o) => (o.id === optionId ? { ...o, ...updates } : o)),
            }
          : q
      )
    );
  };

  const setCorrectOption = (questionId: string, optionId: string) => {
    setQuestions(
      questions.map((q) =>
        q.id === questionId
          ? {
              ...q,
              options: q.options.map((o) => ({ ...o, isCorrect: o.id === optionId })),
            }
          : q
      )
    );
  };

  const addOption = (questionId: string) => {
    setQuestions(
      questions.map((q) =>
        q.id === questionId && q.options.length < 6
          ? {
              ...q,
              options: [
                ...q.options,
                { id: `o-${Date.now()}`, text: "", isCorrect: false },
              ],
            }
          : q
      )
    );
  };

  const removeOption = (questionId: string, optionId: string) => {
    setQuestions(
      questions.map((q) =>
        q.id === questionId && q.options.length > 2
          ? {
              ...q,
              options: q.options.filter((o) => o.id !== optionId),
            }
          : q
      )
    );
  };

  const toggleExpanded = (id: string) => {
    updateQuestion(id, { expanded: !questions.find((q) => q.id === id)?.expanded });
  };

  const handleSave = async (publish: boolean = false) => {
    setIsSaving(true);
    await delay(1500);
    setIsSaving(false);
    // In real app, would save to database
  };

  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-32 bg-surface-elevated rounded animate-pulse" />
        <div className="h-40 bg-surface-elevated/40 rounded-xl animate-pulse" />
        <div className="h-[400px] bg-surface-elevated/40 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/dashboard/content"
            className="p-2 hover:bg-surface-elevated rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-text-secondary" />
          </Link>
          <div>
            <p className="text-accent-red font-mono text-xs font-semibold tracking-wider mb-1">
              // QUIZ BUILDER
            </p>
            <h1 className="text-2xl font-[family-name:var(--font-syne)] font-bold text-text-primary">
              Create New Quiz
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="border-border-custom"
            onClick={() => handleSave(false)}
            disabled={isSaving}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          <Button
            className="bg-gradient-to-r from-accent-red to-orange-500 text-white hover:opacity-90"
            onClick={() => handleSave(true)}
            disabled={isSaving}
          >
            <Eye className="h-4 w-4 mr-2" />
            Save & Publish
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quiz Settings */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-surface-elevated/40 backdrop-blur-sm border border-border-custom rounded-xl p-6 space-y-4">
            <h2 className="text-text-primary font-semibold">Quiz Settings</h2>

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="e.g., Chest X-Ray Fundamentals"
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                className="bg-surface border-border-custom"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="topic">Topic</Label>
              <Select value={quizTopic} onValueChange={setQuizTopic}>
                <SelectTrigger className="bg-surface border-border-custom">
                  <SelectValue placeholder="Select topic" />
                </SelectTrigger>
                <SelectContent className="bg-surface border-border-custom">
                  <SelectItem value="Chest">Chest</SelectItem>
                  <SelectItem value="Neuro">Neuro</SelectItem>
                  <SelectItem value="MSK">MSK</SelectItem>
                  <SelectItem value="Abdominal">Abdominal</SelectItem>
                  <SelectItem value="Cardiac">Cardiac</SelectItem>
                  <SelectItem value="Paediatric">Paediatric</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="difficulty">Difficulty</Label>
              <Select value={quizDifficulty} onValueChange={setQuizDifficulty}>
                <SelectTrigger className="bg-surface border-border-custom">
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent className="bg-surface border-border-custom">
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                  <SelectItem value="expert">Expert</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeLimit">Time Limit (minutes)</Label>
              <Input
                id="timeLimit"
                type="number"
                min={5}
                max={180}
                value={timeLimit}
                onChange={(e) => setTimeLimit(parseInt(e.target.value) || 30)}
                className="bg-surface border-border-custom"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="passingScore">Passing Score (%)</Label>
              <Input
                id="passingScore"
                type="number"
                min={0}
                max={100}
                value={passingScore}
                onChange={(e) => setPassingScore(parseInt(e.target.value) || 70)}
                className="bg-surface border-border-custom"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="shuffle" className="cursor-pointer">
                Shuffle Questions
              </Label>
              <Switch
                id="shuffle"
                checked={shuffleQuestions}
                onCheckedChange={setShuffleQuestions}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="explanations" className="cursor-pointer">
                Show Explanations
              </Label>
              <Switch
                id="explanations"
                checked={showExplanations}
                onCheckedChange={setShowExplanations}
              />
            </div>
          </div>

          {/* Quiz Stats */}
          <div className="bg-surface-elevated/40 backdrop-blur-sm border border-border-custom rounded-xl p-6">
            <h2 className="text-text-primary font-semibold mb-4">Quiz Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-text-secondary">Questions</span>
                <span className="text-text-primary font-medium">{questions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Total Points</span>
                <span className="text-text-primary font-medium">{totalPoints}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Est. Duration</span>
                <span className="text-text-primary font-medium">{timeLimit} min</span>
              </div>
            </div>
          </div>

          {/* AI Generate */}
          <Button
            variant="outline"
            className="w-full border-accent-purple/50 text-accent-purple hover:bg-accent-purple/10"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Generate with AI
          </Button>
        </div>

        {/* Questions Editor */}
        <div className="lg:col-span-2 space-y-4">
          {questions.map((question, idx) => (
            <div
              key={question.id}
              className="bg-surface-elevated/40 backdrop-blur-sm border border-border-custom rounded-xl overflow-hidden"
            >
              {/* Question Header */}
              <div
                className="flex items-center gap-3 p-4 border-b border-border-custom cursor-pointer hover:bg-surface/30 transition-colors"
                onClick={() => toggleExpanded(question.id)}
              >
                <button className="cursor-grab">
                  <GripVertical className="h-5 w-5 text-text-secondary" />
                </button>
                <span className="bg-accent-red/20 text-accent-red text-xs font-semibold px-2 py-1 rounded">
                  Q{idx + 1}
                </span>
                <span className="text-text-primary flex-1 truncate">
                  {question.text || "Untitled Question"}
                </span>
                <span className="text-text-secondary text-sm">{question.points} pts</span>
                {question.expanded ? (
                  <ChevronUp className="h-5 w-5 text-text-secondary" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-text-secondary" />
                )}
              </div>

              {/* Question Body */}
              {question.expanded && (
                <div className="p-4 space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-1 space-y-2">
                      <Label>Question Type</Label>
                      <Select
                        value={question.type}
                        onValueChange={(v) => updateQuestion(question.id, { type: v as QuestionType })}
                      >
                        <SelectTrigger className="bg-surface border-border-custom">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-surface border-border-custom">
                          <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                          <SelectItem value="true-false">True / False</SelectItem>
                          <SelectItem value="image-hotspot">Image Hotspot</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-24 space-y-2">
                      <Label>Points</Label>
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        value={question.points}
                        onChange={(e) =>
                          updateQuestion(question.id, { points: parseInt(e.target.value) || 10 })
                        }
                        className="bg-surface border-border-custom"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Question Text</Label>
                    <Textarea
                      placeholder="Enter the question..."
                      value={question.text}
                      onChange={(e) => updateQuestion(question.id, { text: e.target.value })}
                      className="bg-surface border-border-custom min-h-[80px]"
                    />
                  </div>

                  {/* Image Upload */}
                  <Button
                    variant="outline"
                    className="border-border-custom border-dashed w-full py-8"
                  >
                    <ImagePlus className="h-5 w-5 mr-2" />
                    Add Image (Optional)
                  </Button>

                  {/* Options */}
                  {question.type === "multiple-choice" && (
                    <div className="space-y-3">
                      <Label>Answer Options</Label>
                      {question.options.map((option, optIdx) => (
                        <div key={option.id} className="flex items-center gap-2">
                          <button
                            onClick={() => setCorrectOption(question.id, option.id)}
                            className={cn(
                              "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                              option.isCorrect
                                ? "border-accent-green bg-accent-green/20"
                                : "border-border-custom hover:border-accent-green/50"
                            )}
                          >
                            {option.isCorrect && <Check className="h-4 w-4 text-accent-green" />}
                          </button>
                          <Input
                            placeholder={`Option ${optIdx + 1}`}
                            value={option.text}
                            onChange={(e) =>
                              updateOption(question.id, option.id, { text: e.target.value })
                            }
                            className="bg-surface border-border-custom flex-1"
                          />
                          {question.options.length > 2 && (
                            <button
                              onClick={() => removeOption(question.id, option.id)}
                              className="p-2 text-text-secondary hover:text-accent-red transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      {question.options.length < 6 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => addOption(question.id)}
                          className="text-text-secondary hover:text-text-primary"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Option
                        </Button>
                      )}
                    </div>
                  )}

                  {question.type === "true-false" && (
                    <div className="space-y-3">
                      <Label>Correct Answer</Label>
                      <div className="flex gap-4">
                        <Button
                          variant={question.options[0]?.isCorrect ? "default" : "outline"}
                          onClick={() =>
                            updateQuestion(question.id, {
                              options: [
                                { id: "true", text: "True", isCorrect: true },
                                { id: "false", text: "False", isCorrect: false },
                              ],
                            })
                          }
                          className={
                            question.options[0]?.isCorrect
                              ? "bg-accent-green hover:bg-accent-green/90"
                              : "border-border-custom"
                          }
                        >
                          <Check className="h-4 w-4 mr-2" />
                          True
                        </Button>
                        <Button
                          variant={question.options[1]?.isCorrect ? "default" : "outline"}
                          onClick={() =>
                            updateQuestion(question.id, {
                              options: [
                                { id: "true", text: "True", isCorrect: false },
                                { id: "false", text: "False", isCorrect: true },
                              ],
                            })
                          }
                          className={
                            question.options[1]?.isCorrect
                              ? "bg-accent-red hover:bg-accent-red/90"
                              : "border-border-custom"
                          }
                        >
                          <X className="h-4 w-4 mr-2" />
                          False
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Explanation */}
                  <div className="space-y-2">
                    <Label>Explanation (shown after answer)</Label>
                    <Textarea
                      placeholder="Explain the correct answer..."
                      value={question.explanation}
                      onChange={(e) => updateQuestion(question.id, { explanation: e.target.value })}
                      className="bg-surface border-border-custom min-h-[60px]"
                    />
                  </div>

                  {/* Question Actions */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-custom">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => duplicateQuestion(question.id)}
                      className="text-text-secondary hover:text-text-primary"
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Duplicate
                    </Button>
                    {questions.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeQuestion(question.id)}
                        className="text-accent-red hover:text-accent-red/80"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Add Question Button */}
          <Button
            variant="outline"
            onClick={addQuestion}
            className="w-full border-dashed border-border-custom py-8 hover:border-accent-red/50"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Question
          </Button>
        </div>
      </div>
    </div>
  );
}
