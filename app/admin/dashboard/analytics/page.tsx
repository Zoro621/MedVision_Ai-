"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  Download,
  TrendingUp,
  TrendingDown,
  Users,
  FileText,
  Layers,
  Bot,
  Clock,
  Target,
  Zap,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { delay } from "@/lib/mockData/admin";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

// Mock data
const ENGAGEMENT_DATA = [
  { date: "Jan", activeUsers: 120, newUsers: 45, returningUsers: 75 },
  { date: "Feb", activeUsers: 145, newUsers: 52, returningUsers: 93 },
  { date: "Mar", activeUsers: 168, newUsers: 38, returningUsers: 130 },
  { date: "Apr", activeUsers: 192, newUsers: 61, returningUsers: 131 },
  { date: "May", activeUsers: 215, newUsers: 48, returningUsers: 167 },
  { date: "Jun", activeUsers: 247, newUsers: 55, returningUsers: 192 },
];

const CONTENT_USAGE = [
  { name: "Chest", quizzes: 450, flashcards: 1200 },
  { name: "Neuro", quizzes: 320, flashcards: 890 },
  { name: "MSK", quizzes: 280, flashcards: 750 },
  { name: "Abdominal", quizzes: 195, flashcards: 520 },
  { name: "Cardiac", quizzes: 150, flashcards: 410 },
  { name: "Paediatric", quizzes: 85, flashcards: 230 },
];

const AI_METRICS = [
  { date: "W1", accuracy: 91, usage: 340 },
  { date: "W2", accuracy: 92, usage: 420 },
  { date: "W3", accuracy: 89, usage: 380 },
  { date: "W4", accuracy: 94, usage: 510 },
  { date: "W5", accuracy: 93, usage: 485 },
  { date: "W6", accuracy: 95, usage: 560 },
];

const STUDENT_DISTRIBUTION = [
  { name: "Thriving", value: 45, color: "#22C55E" },
  { name: "On Track", value: 38, color: "#00C2FF" },
  { name: "At Risk", value: 17, color: "#EF4444" },
];

const RETENTION_DATA = [
  { week: "Week 1", rate: 100 },
  { week: "Week 2", rate: 85 },
  { week: "Week 3", rate: 72 },
  { week: "Week 4", rate: 68 },
  { week: "Week 5", rate: 65 },
  { week: "Week 6", rate: 63 },
  { week: "Week 7", rate: 61 },
  { week: "Week 8", rate: 60 },
];

const TOP_QUIZZES = [
  { title: "Chest X-Ray Basics", attempts: 1240, avgScore: 78, trend: "up" },
  { title: "Brain MRI Fundamentals", attempts: 890, avgScore: 72, trend: "up" },
  { title: "MSK Ultrasound", attempts: 756, avgScore: 81, trend: "down" },
  { title: "PE Protocol CT", attempts: 642, avgScore: 74, trend: "up" },
  { title: "Abdominal Pathology", attempts: 521, avgScore: 69, trend: "down" },
];

interface MetricCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
}

function MetricCard({ icon: Icon, label, value, change, changeLabel }: MetricCardProps) {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  return (
    <div className="bg-surface-elevated/40 backdrop-blur-sm border border-border-custom rounded-xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-accent-red/10 flex items-center justify-center">
          <Icon className="h-5 w-5 text-accent-red" />
        </div>
        <span className="text-text-secondary text-sm">{label}</span>
      </div>
      <p className="text-2xl font-bold text-text-primary mb-1">{value}</p>
      {change !== undefined && (
        <div className="flex items-center gap-1">
          {isPositive ? (
            <TrendingUp className="h-4 w-4 text-accent-green" />
          ) : isNegative ? (
            <TrendingDown className="h-4 w-4 text-accent-red" />
          ) : null}
          <span
            className={cn(
              "text-sm",
              isPositive ? "text-accent-green" : isNegative ? "text-accent-red" : "text-text-secondary"
            )}
          >
            {isPositive ? "+" : ""}
            {change}% {changeLabel}
          </span>
        </div>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30d");

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
        <div className="h-8 w-48 bg-surface-elevated rounded animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-surface-elevated/40 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-[400px] bg-surface-elevated/40 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-accent-red font-mono text-xs font-semibold tracking-wider mb-1">
            // ANALYTICS
          </p>
          <h1 className="text-2xl md:text-3xl font-[family-name:var(--font-syne)] font-bold text-text-primary">
            Platform Analytics
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Comprehensive performance metrics and insights.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[150px] bg-surface-elevated border-border-custom">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-surface border-border-custom">
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="border-border-custom">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          icon={Users}
          label="Active Students"
          value="247"
          change={15}
          changeLabel="vs last month"
        />
        <MetricCard
          icon={FileText}
          label="Quiz Completions"
          value="3,842"
          change={23}
          changeLabel="vs last month"
        />
        <MetricCard
          icon={Clock}
          label="Avg. Study Time"
          value="42 min"
          change={8}
          changeLabel="vs last month"
        />
        <MetricCard
          icon={Target}
          label="Avg. Quiz Score"
          value="76%"
          change={-2}
          changeLabel="vs last month"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Engagement */}
        <div className="bg-surface-elevated/40 backdrop-blur-sm border border-border-custom rounded-xl p-6">
          <h3 className="text-text-primary font-semibold mb-4">User Engagement</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ENGAGEMENT_DATA}>
                <defs>
                  <linearGradient id="activeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00C2FF" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00C2FF" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="newGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1A2F4A" />
                <XAxis dataKey="date" stroke="#7A9BB5" fontSize={12} />
                <YAxis stroke="#7A9BB5" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0D1424",
                    border: "1px solid #1A2F4A",
                    borderRadius: "8px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="activeUsers"
                  stroke="#00C2FF"
                  fill="url(#activeGradient)"
                  name="Active Users"
                />
                <Area
                  type="monotone"
                  dataKey="newUsers"
                  stroke="#22C55E"
                  fill="url(#newGradient)"
                  name="New Users"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Content Usage by Topic */}
        <div className="bg-surface-elevated/40 backdrop-blur-sm border border-border-custom rounded-xl p-6">
          <h3 className="text-text-primary font-semibold mb-4">Content Usage by Topic</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={CONTENT_USAGE} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1A2F4A" horizontal={false} />
                <XAxis type="number" stroke="#7A9BB5" fontSize={12} />
                <YAxis dataKey="name" type="category" stroke="#7A9BB5" fontSize={12} width={80} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0D1424",
                    border: "1px solid #1A2F4A",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="quizzes" fill="#EF4444" name="Quizzes" radius={[0, 4, 4, 0]} />
                <Bar dataKey="flashcards" fill="#00C2FF" name="Flashcards" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Student Distribution */}
        <div className="bg-surface-elevated/40 backdrop-blur-sm border border-border-custom rounded-xl p-6">
          <h3 className="text-text-primary font-semibold mb-4">Student Distribution</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={STUDENT_DISTRIBUTION}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {STUDENT_DISTRIBUTION.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0D1424",
                    border: "1px solid #1A2F4A",
                    borderRadius: "8px",
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value) => <span className="text-text-secondary text-sm">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Tutor Metrics */}
        <div className="bg-surface-elevated/40 backdrop-blur-sm border border-border-custom rounded-xl p-6">
          <h3 className="text-text-primary font-semibold mb-4">AI Tutor Performance</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={AI_METRICS}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1A2F4A" />
                <XAxis dataKey="date" stroke="#7A9BB5" fontSize={12} />
                <YAxis yAxisId="left" stroke="#7A9BB5" fontSize={12} domain={[80, 100]} />
                <YAxis yAxisId="right" orientation="right" stroke="#7A9BB5" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0D1424",
                    border: "1px solid #1A2F4A",
                    borderRadius: "8px",
                  }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="accuracy"
                  stroke="#22C55E"
                  strokeWidth={2}
                  dot={{ fill: "#22C55E" }}
                  name="Accuracy %"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="usage"
                  stroke="#A855F7"
                  strokeWidth={2}
                  dot={{ fill: "#A855F7" }}
                  name="Sessions"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Retention Curve */}
        <div className="bg-surface-elevated/40 backdrop-blur-sm border border-border-custom rounded-xl p-6">
          <h3 className="text-text-primary font-semibold mb-4">Retention Curve</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={RETENTION_DATA}>
                <defs>
                  <linearGradient id="retentionGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1A2F4A" />
                <XAxis dataKey="week" stroke="#7A9BB5" fontSize={10} />
                <YAxis stroke="#7A9BB5" fontSize={12} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0D1424",
                    border: "1px solid #1A2F4A",
                    borderRadius: "8px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="rate"
                  stroke="#F59E0B"
                  fill="url(#retentionGradient)"
                  name="Retention %"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Quizzes Table */}
      <div className="bg-surface-elevated/40 backdrop-blur-sm border border-border-custom rounded-xl p-6">
        <h3 className="text-text-primary font-semibold mb-4">Top Performing Quizzes</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-custom">
                <th className="p-3 text-left text-text-secondary text-xs font-semibold uppercase tracking-wider">
                  Quiz Title
                </th>
                <th className="p-3 text-left text-text-secondary text-xs font-semibold uppercase tracking-wider">
                  Attempts
                </th>
                <th className="p-3 text-left text-text-secondary text-xs font-semibold uppercase tracking-wider">
                  Avg Score
                </th>
                <th className="p-3 text-left text-text-secondary text-xs font-semibold uppercase tracking-wider">
                  Trend
                </th>
              </tr>
            </thead>
            <tbody>
              {TOP_QUIZZES.map((quiz, idx) => (
                <tr key={idx} className="border-b border-border-custom/50 hover:bg-accent-red/[0.04]">
                  <td className="p-3 text-text-primary">{quiz.title}</td>
                  <td className="p-3 text-text-secondary">{quiz.attempts.toLocaleString()}</td>
                  <td className="p-3">
                    <span
                      className={cn(
                        "font-mono",
                        quiz.avgScore >= 75
                          ? "text-accent-green"
                          : quiz.avgScore >= 60
                          ? "text-accent-amber"
                          : "text-accent-red"
                      )}
                    >
                      {quiz.avgScore}%
                    </span>
                  </td>
                  <td className="p-3">
                    {quiz.trend === "up" ? (
                      <TrendingUp className="h-4 w-4 text-accent-green" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-accent-red" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
