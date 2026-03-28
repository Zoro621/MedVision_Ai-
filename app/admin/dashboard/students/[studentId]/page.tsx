"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Mail,
  FileBarChart,
  Settings,
  RefreshCw,
  Pause,
  Trash2,
  Zap,
  Trophy,
  Flame,
  Clock,
  Calendar,
  FileText,
  Layers,
  Upload,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { StatusDot } from "@/components/admin/ui/StatusDot";
import { RiskBadge } from "@/components/admin/ui/RiskBadge";
import {
  MOCK_STUDENTS,
  MOCK_STUDENT_NOTES,
  MOCK_QUIZ_ATTEMPTS_ADMIN,
  delay,
} from "@/lib/mockData/admin";
import { cn } from "@/lib/utils";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const MOCK_TOPIC_MASTERY = [
  { topic: "Chest", mastery: 78 },
  { topic: "Neuro", mastery: 65 },
  { topic: "MSK", mastery: 72 },
  { topic: "Abdominal", mastery: 55 },
  { topic: "Cardiac", mastery: 45 },
  { topic: "Paediatric", mastery: 30 },
];

const MOCK_ACTIVITY_TIMELINE = [
  { date: "Today", items: [
    { time: "10:42", icon: FileText, action: 'Completed quiz "Chest CT"', detail: "Score: 85%" },
    { time: "09:15", icon: Layers, action: "Reviewed 12 flashcards", detail: 'Deck: "PE"' },
  ]},
  { date: "Yesterday", items: [
    { time: "20:30", icon: Upload, action: 'Uploaded "Chest_Notes.pdf"', detail: null },
    { time: "19:15", icon: FileText, action: 'Started quiz "Neuro MRI"', detail: "Score: 62%" },
  ]},
  { date: "2 days ago", items: [
    { time: "18:00", icon: Award, action: 'Earned badge "Streak Starter"', detail: null },
  ]},
];

const MOCK_SCORE_HISTORY = [
  { date: "Feb 20", score: 65 },
  { date: "Feb 25", score: 70 },
  { date: "Mar 1", score: 68 },
  { date: "Mar 5", score: 75 },
  { date: "Mar 8", score: 78 },
  { date: "Mar 9", score: 85 },
];

export default function StudentDetailPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = use(params);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [newNote, setNewNote] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);

  const student = MOCK_STUDENTS.find((s) => s.id === studentId);
  const notes = MOCK_STUDENT_NOTES[studentId] || [];
  const quizAttempts = MOCK_QUIZ_ATTEMPTS_ADMIN[studentId] || [];

  useEffect(() => {
    const loadData = async () => {
      await delay(800);
      setIsLoading(false);
    };
    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-32 bg-surface-elevated rounded animate-pulse" />
        <div className="h-40 bg-surface-elevated/40 rounded-xl animate-pulse" />
        <div className="h-[400px] bg-surface-elevated/40 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="space-y-6">
        <Link
          href="/admin/dashboard/students"
          className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Students
        </Link>
        <div className="text-center py-16">
          <h2 className="text-text-primary text-xl font-semibold">Student not found</h2>
          <p className="text-text-secondary mt-2">The requested student does not exist.</p>
        </div>
      </div>
    );
  }

  const formatStudyTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="space-y-6">
      {/* Back Navigation */}
      <Link
        href="/admin/dashboard/students"
        className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Students
      </Link>

      {/* Student Header Card */}
      <div className="bg-surface-elevated/40 backdrop-blur-sm border border-border-custom rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent-cyan to-accent-purple flex items-center justify-center text-white font-bold text-xl">
              {student.avatarInitials || student.name.split(" ").map(n => n[0]).join("")}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-[family-name:var(--font-syne)] font-bold text-text-primary">
                  {student.name}
                </h1>
                <StatusDot
                  status={student.status === "active" ? "success" : student.status === "inactive" ? "warning" : "info"}
                  label={student.status.charAt(0).toUpperCase() + student.status.slice(1)}
                />
              </div>
              <p className="text-text-secondary">
                L{student.level} {student.levelTitle} · {student.radiologyFocus?.join(" & ")} focus
              </p>
              <p className="text-text-secondary text-sm mt-1">
                {student.email} · Joined: {student.joinedAt}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" className="border-border-custom">
              <Mail className="h-4 w-4 mr-2" />
              Message
            </Button>
            <Button variant="outline" className="border-border-custom">
              <FileBarChart className="h-4 w-4 mr-2" />
              Export Report
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="border-border-custom">
                  <Settings className="h-4 w-4 mr-2" />
                  Manage
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-surface border-border-custom">
                <DropdownMenuItem>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset Password
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setShowSuspendDialog(true)}
                  className="text-accent-amber focus:text-accent-amber"
                >
                  <Pause className="h-4 w-4 mr-2" />
                  Suspend Account
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border-custom" />
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-accent-red focus:text-accent-red"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Account
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-surface-elevated border border-border-custom">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="quiz-history">Quiz History</TabsTrigger>
          <TabsTrigger value="flashcards">Flashcard Activity</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-surface-elevated/40 backdrop-blur-sm border border-border-custom rounded-xl p-4">
              <div className="flex items-center gap-2 text-text-secondary text-sm mb-2">
                <Zap className="h-4 w-4 text-accent-cyan" />
                Total XP
              </div>
              <p className="text-2xl font-bold text-text-primary">{student.xp.toLocaleString()}</p>
            </div>
            <div className="bg-surface-elevated/40 backdrop-blur-sm border border-border-custom rounded-xl p-4">
              <div className="flex items-center gap-2 text-text-secondary text-sm mb-2">
                <Trophy className="h-4 w-4 text-accent-amber" />
                Avg Quiz Score
              </div>
              <p className="text-2xl font-bold text-text-primary">{student.avgScore}%</p>
            </div>
            <div className="bg-surface-elevated/40 backdrop-blur-sm border border-border-custom rounded-xl p-4">
              <div className="flex items-center gap-2 text-text-secondary text-sm mb-2">
                <Flame className="h-4 w-4 text-accent-red" />
                Study Streak
              </div>
              <p className="text-2xl font-bold text-text-primary">{student.streak} days</p>
            </div>
            <div className="bg-surface-elevated/40 backdrop-blur-sm border border-border-custom rounded-xl p-4">
              <div className="flex items-center gap-2 text-text-secondary text-sm mb-2">
                <Clock className="h-4 w-4 text-accent-green" />
                Study Time
              </div>
              <p className="text-2xl font-bold text-text-primary">{formatStudyTime(student.totalStudyTime || 0)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Topic Mastery Radar */}
            <div className="bg-surface-elevated/40 backdrop-blur-sm border border-border-custom rounded-xl p-6">
              <h3 className="text-text-primary font-semibold mb-4">Topic Mastery</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={MOCK_TOPIC_MASTERY}>
                    <PolarGrid stroke="#1A2F4A" />
                    <PolarAngleAxis dataKey="topic" tick={{ fill: "#7A9BB5", fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "#7A9BB5", fontSize: 10 }} />
                    <Radar
                      name="Mastery"
                      dataKey="mastery"
                      stroke="#00C2FF"
                      fill="#00C2FF"
                      fillOpacity={0.3}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Activity Timeline */}
            <div className="bg-surface-elevated/40 backdrop-blur-sm border border-border-custom rounded-xl p-6">
              <h3 className="text-text-primary font-semibold mb-4">Recent Activity</h3>
              <div className="space-y-4 max-h-[300px] overflow-y-auto">
                {MOCK_ACTIVITY_TIMELINE.map((day) => (
                  <div key={day.date}>
                    <p className="text-text-secondary text-xs font-semibold uppercase tracking-wider mb-2">
                      {day.date}
                    </p>
                    <div className="space-y-2">
                      {day.items.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-2 bg-surface/50 rounded-lg">
                          <span className="text-text-secondary font-mono text-xs mt-1">{item.time}</span>
                          <item.icon className="h-4 w-4 text-accent-cyan mt-0.5" />
                          <div>
                            <p className="text-text-primary text-sm">{item.action}</p>
                            {item.detail && (
                              <p className="text-text-secondary text-xs">{item.detail}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Quiz History Tab */}
        <TabsContent value="quiz-history" className="mt-6">
          <div className="bg-surface-elevated/40 backdrop-blur-sm border border-border-custom rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-custom bg-surface/50">
                  <th className="p-4 text-left text-text-secondary text-xs font-semibold uppercase tracking-wider">Quiz</th>
                  <th className="p-4 text-left text-text-secondary text-xs font-semibold uppercase tracking-wider">Date</th>
                  <th className="p-4 text-left text-text-secondary text-xs font-semibold uppercase tracking-wider">Score</th>
                  <th className="p-4 text-left text-text-secondary text-xs font-semibold uppercase tracking-wider">Time</th>
                  <th className="p-4 text-left text-text-secondary text-xs font-semibold uppercase tracking-wider">XP</th>
                  <th className="p-4 text-left text-text-secondary text-xs font-semibold uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {quizAttempts.map((attempt) => (
                  <tr key={attempt.id} className="border-b border-border-custom hover:bg-accent-red/[0.04]">
                    <td className="p-4 text-text-primary">{attempt.quizTitle}</td>
                    <td className="p-4 text-text-secondary">{attempt.date}</td>
                    <td className="p-4">
                      <span className={cn(
                        "font-mono",
                        attempt.score >= 75 ? "text-accent-green" :
                        attempt.score >= 50 ? "text-accent-amber" : "text-accent-red"
                      )}>
                        {attempt.score}%
                      </span>
                    </td>
                    <td className="p-4 text-text-secondary">{attempt.timeMinutes}m</td>
                    <td className="p-4 text-accent-cyan font-mono">+{attempt.xpEarned}</td>
                    <td className="p-4">
                      <span className={cn(
                        "px-2 py-1 rounded text-xs font-medium",
                        attempt.status === "passed" ? "bg-accent-green/20 text-accent-green" : "bg-accent-red/20 text-accent-red"
                      )}>
                        {attempt.status === "passed" ? "Passed" : "At Risk"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Flashcard Activity Tab */}
        <TabsContent value="flashcards" className="mt-6">
          <div className="bg-surface-elevated/40 backdrop-blur-sm border border-border-custom rounded-xl p-8 text-center">
            <Layers className="h-12 w-12 text-text-secondary mx-auto mb-4" />
            <h3 className="text-text-primary font-semibold mb-2">Flashcard Activity</h3>
            <p className="text-text-secondary">Detailed flashcard review history coming soon.</p>
          </div>
        </TabsContent>

        {/* Progress Tab */}
        <TabsContent value="progress" className="space-y-6 mt-6">
          <div className="bg-surface-elevated/40 backdrop-blur-sm border border-border-custom rounded-xl p-6">
            <h3 className="text-text-primary font-semibold mb-4">Quiz Score Over Time</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={MOCK_SCORE_HISTORY}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1A2F4A" />
                  <XAxis dataKey="date" stroke="#7A9BB5" fontSize={12} />
                  <YAxis domain={[0, 100]} stroke="#7A9BB5" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0D1424",
                      border: "1px solid #1A2F4A",
                      borderRadius: "8px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#00C2FF"
                    strokeWidth={2}
                    dot={{ fill: "#00C2FF" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="space-y-6 mt-6">
          <div className="bg-surface-elevated/40 backdrop-blur-sm border border-border-custom rounded-xl p-6">
            <h3 className="text-accent-red font-mono text-xs font-semibold tracking-wider mb-4">
              // ADMIN NOTES — visible to admins only
            </h3>
            <Textarea
              placeholder="Add private notes about this student..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="bg-surface border-border-custom min-h-[100px] mb-4"
            />
            <Button
              onClick={() => setNewNote("")}
              className="bg-gradient-to-r from-accent-red to-orange-500 text-white"
            >
              Save Note
            </Button>
          </div>

          {notes.length > 0 && (
            <div className="space-y-4">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="bg-surface-elevated/40 backdrop-blur-sm border border-border-custom rounded-xl p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-text-secondary text-xs">
                      {note.author} · {new Date(note.createdAt).toLocaleDateString()}
                    </span>
                    <button className="text-text-secondary hover:text-accent-red">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-text-primary text-sm">{note.content}</p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <AlertDialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
        <AlertDialogContent className="bg-surface border-border-custom">
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to suspend {student.name}&apos;s account?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border-custom">Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-accent-amber text-background hover:bg-accent-amber/90">
              Suspend
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-surface border-border-custom">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete {student.name}&apos;s account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border-custom">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => router.push("/admin/dashboard/students")}
              className="bg-accent-red text-white hover:bg-accent-red/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
