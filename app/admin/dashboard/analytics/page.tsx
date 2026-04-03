"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Calendar,
  Clock,
  Download,
  FileText,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAdminAnalyticsReport, type AnalyticsReport } from "@/lib/api/adminAnalytics";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
}

function MetricCard({ icon: Icon, label, value, change, changeLabel }: MetricCardProps) {
  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;

  return (
    <div className="rounded-xl border border-border-custom bg-surface-elevated/40 p-5 backdrop-blur-sm">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-red/10">
          <Icon className="h-5 w-5 text-accent-red" />
        </div>
        <span className="text-sm text-text-secondary">{label}</span>
      </div>
      <p className="mb-1 text-2xl font-bold text-text-primary">{value}</p>
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
              isPositive
                ? "text-accent-green"
                : isNegative
                  ? "text-accent-red"
                  : "text-text-secondary"
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

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 rounded bg-surface-elevated animate-pulse" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-32 rounded-xl bg-surface-elevated/40 animate-pulse" />
        ))}
      </div>
      <div className="h-[400px] rounded-xl bg-surface-elevated/40 animate-pulse" />
    </div>
  );
}

export default function AnalyticsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState("30d");
  const [report, setReport] = useState<AnalyticsReport | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const nextReport = await getAdminAnalyticsReport();
        if (!cancelled) {
          setReport(nextReport);
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(
            nextError instanceof Error
              ? nextError.message
              : "Failed to load analytics."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [dateRange]);

  if (isLoading) {
    return <AnalyticsSkeleton />;
  }

  if (!report || error) {
    return (
      <div className="rounded-xl border border-accent-red/30 bg-surface-elevated p-6">
        <p className="text-accent-red">{error ?? "Unable to load analytics."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="mb-1 font-mono text-xs font-semibold tracking-wider text-accent-red">
            // ANALYTICS
          </p>
          <h1 className="text-2xl font-bold text-text-primary md:text-3xl font-[family-name:var(--font-syne)]">
            Platform Analytics
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Comprehensive performance metrics and engagement trends from persisted activity.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[150px] border-border-custom bg-surface-elevated">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-border-custom bg-surface">
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="border-border-custom">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MetricCard
          icon={Users}
          label="Active Students"
          value={report.metrics.activeStudents.value}
          change={report.metrics.activeStudents.change}
          changeLabel="vs prior window"
        />
        <MetricCard
          icon={FileText}
          label="Quiz Completions"
          value={report.metrics.quizCompletions.value}
          change={report.metrics.quizCompletions.change}
          changeLabel="vs prior window"
        />
        <MetricCard
          icon={Clock}
          label="Avg. Study Time"
          value={`${report.metrics.avgStudyTimeMinutes.value} min`}
          change={report.metrics.avgStudyTimeMinutes.change}
          changeLabel="vs prior window"
        />
        <MetricCard
          icon={Target}
          label="Avg. Quiz Score"
          value={`${report.metrics.avgQuizScore.value}%`}
          change={report.metrics.avgQuizScore.change}
          changeLabel="vs prior window"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border-custom bg-surface-elevated/40 p-6 backdrop-blur-sm">
          <h3 className="mb-4 font-semibold text-text-primary">User Engagement</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={report.engagementData}>
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
                <Area type="monotone" dataKey="activeUsers" stroke="#00C2FF" fill="url(#activeGradient)" name="Active Users" />
                <Area type="monotone" dataKey="newUsers" stroke="#22C55E" fill="url(#newGradient)" name="New Users" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border-custom bg-surface-elevated/40 p-6 backdrop-blur-sm">
          <h3 className="mb-4 font-semibold text-text-primary">Content Usage by Topic</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={report.contentUsage} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1A2F4A" horizontal={false} />
                <XAxis type="number" stroke="#7A9BB5" fontSize={12} />
                <YAxis dataKey="name" type="category" stroke="#7A9BB5" fontSize={12} width={90} />
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-border-custom bg-surface-elevated/40 p-6 backdrop-blur-sm">
          <h3 className="mb-4 font-semibold text-text-primary">Student Distribution</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={report.studentDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {report.studentDistribution.map((entry, index) => (
                    <Cell key={`distribution-${index}`} fill={entry.color} />
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
                  formatter={(value) => <span className="text-sm text-text-secondary">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border-custom bg-surface-elevated/40 p-6 backdrop-blur-sm">
          <h3 className="mb-4 font-semibold text-text-primary">AI Tutor Performance</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={report.aiMetrics}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1A2F4A" />
                <XAxis dataKey="date" stroke="#7A9BB5" fontSize={12} />
                <YAxis yAxisId="left" stroke="#7A9BB5" fontSize={12} domain={[0, 100]} />
                <YAxis yAxisId="right" orientation="right" stroke="#7A9BB5" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0D1424",
                    border: "1px solid #1A2F4A",
                    borderRadius: "8px",
                  }}
                />
                <Line yAxisId="left" type="monotone" dataKey="accuracy" stroke="#22C55E" strokeWidth={2} dot={{ fill: "#22C55E" }} name="Accuracy %" />
                <Line yAxisId="right" type="monotone" dataKey="usage" stroke="#A855F7" strokeWidth={2} dot={{ fill: "#A855F7" }} name="Sessions" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border-custom bg-surface-elevated/40 p-6 backdrop-blur-sm">
          <h3 className="mb-4 font-semibold text-text-primary">Retention Curve</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={report.retentionData}>
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
                <Area type="monotone" dataKey="rate" stroke="#F59E0B" fill="url(#retentionGradient)" name="Retention %" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border-custom bg-surface-elevated/40 p-6 backdrop-blur-sm">
        <h3 className="mb-4 font-semibold text-text-primary">Top Performing Quizzes</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-custom">
                <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Quiz Title
                </th>
                <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Attempts
                </th>
                <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Avg Score
                </th>
                <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Trend
                </th>
              </tr>
            </thead>
            <tbody>
              {report.topQuizzes.map((quiz) => (
                <tr key={quiz.title} className="border-b border-border-custom/50 hover:bg-accent-red/[0.04]">
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
