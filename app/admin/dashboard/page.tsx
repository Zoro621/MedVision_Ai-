"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Bot,
  FileText,
  Layers,
  RefreshCw,
  UserPlus,
  Users,
} from "lucide-react";

import { PlatformActivityChart } from "@/components/admin/charts/PlatformActivityChart";
import { TopicPerformanceBar } from "@/components/admin/charts/TopicPerformanceBar";
import { AdminStatCard } from "@/components/admin/ui/AdminStatCard";
import { ContentStatusCard } from "@/components/admin/ui/ContentStatusCard";
import { LiveActivityFeed } from "@/components/admin/ui/LiveActivityFeed";
import { StudentsAtRiskCard } from "@/components/admin/ui/StudentsAtRiskCard";
import { Button } from "@/components/ui/button";
import { getAdminOverview, type AdminOverviewData } from "@/lib/api/adminAnalytics";
import { getAdminContentStats, type AdminContentStats } from "@/lib/api/adminContent";
import { cn } from "@/lib/utils";

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="h-4 w-32 rounded bg-surface-elevated animate-pulse" />
          <div className="h-8 w-64 rounded bg-surface-elevated animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-32 rounded-xl bg-surface-elevated/40 animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="h-[400px] rounded-xl bg-surface-elevated/40 animate-pulse lg:col-span-2" />
        <div className="h-[400px] rounded-xl bg-surface-elevated/40 animate-pulse" />
      </div>
    </div>
  );
}

export default function AdminOverviewPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [overview, setOverview] = useState<AdminOverviewData | null>(null);
  const [contentStats, setContentStats] = useState<AdminContentStats[]>([]);
  const [contentStatsLoading, setContentStatsLoading] = useState(true);

  const loadOverview = useCallback(async (showRefresh = false) => {
    if (showRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const nextOverview = await getAdminOverview();
      setOverview(nextOverview);
      setLastRefreshed(new Date());
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Failed to load admin overview."
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    let cancelled = false;

    async function loadContentStats() {
      setContentStatsLoading(true);
      try {
        const stats = await getAdminContentStats();
        if (!cancelled) {
          setContentStats(stats);
        }
      } catch {
        if (!cancelled) {
          setContentStats([]);
        }
      } finally {
        if (!cancelled) {
          setContentStatsLoading(false);
        }
      }
    }

    void loadContentStats();

    return () => {
      cancelled = true;
    };
  }, []);

  const getTimeSinceRefresh = () => {
    const diff = Math.floor((new Date().getTime() - lastRefreshed.getTime()) / 60000);
    if (diff < 1) return "Just now";
    return `${diff} minute${diff > 1 ? "s" : ""} ago`;
  };

  if (isLoading) {
    return <OverviewSkeleton />;
  }

  if (!overview || error) {
    return (
      <div className="rounded-xl border border-accent-red/30 bg-surface-elevated p-6">
        <p className="text-accent-red">{error ?? "Unable to load admin overview."}</p>
        <Button
          variant="outline"
          className="mt-4 border-border-custom hover:border-accent-red/50"
          onClick={() => void loadOverview(true)}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="mb-1 font-mono text-xs font-semibold tracking-wider text-accent-red">
            // ADMIN OVERVIEW
          </p>
          <h1 className="text-2xl font-bold text-text-primary md:text-3xl font-[family-name:var(--font-syne)]">
            Platform Health & Activity
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-text-secondary">
            Last refreshed: {getTimeSinceRefresh()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadOverview(true)}
            disabled={isRefreshing}
            className="border-border-custom hover:border-accent-red/50"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <AdminStatCard
          icon={Users}
          value={overview.platformStats.totalStudents}
          label="Total Students"
        />
        <AdminStatCard
          icon={UserPlus}
          value={overview.platformStats.newToday}
          label="New Today"
        />
        <AdminStatCard
          icon={FileText}
          value={overview.platformStats.quizzesToday}
          label="Quizzes Taken"
          sublabel="Today"
        />
        <AdminStatCard
          icon={Layers}
          value={overview.platformStats.flashcardsToday}
          label="Cards Reviewed"
          sublabel="Today"
        />
        <AdminStatCard
          icon={Bot}
          value={overview.platformStats.aiAccuracy}
          label="AI Accuracy"
          suffix="%"
          variant="success"
          href="/admin/dashboard/analytics"
        />
        <AdminStatCard
          icon={AlertTriangle}
          value={overview.platformStats.studentsAtRisk}
          label="Students At Risk"
          variant="danger"
          href="/admin/dashboard/students?filter=at-risk"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PlatformActivityChart data={overview.platformActivity} />
        </div>
        <div>
          <LiveActivityFeed activities={overview.liveActivity} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <TopicPerformanceBar data={overview.topicPerformance} />
        <ContentStatusCard
          quizzes={overview.contentStatus.quizzes}
          flashcards={overview.contentStatus.flashcards}
        />
        <StudentsAtRiskCard students={overview.studentsAtRisk} />
      </div>

      {/* Content Stats Panel */}
      <div className="bg-surface-elevated border border-border-custom rounded-xl p-4 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-5 w-5 text-accent-cyan" />
          <h3 className="font-medium text-text-primary">Content Performance Stats</h3>
        </div>

        {contentStatsLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-surface rounded-lg animate-pulse" />
            ))}
          </div>
        ) : contentStats.length === 0 ? (
          <p className="text-sm text-text-secondary">No content stats available yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-custom">
                  <th className="text-left py-2 px-3 text-text-secondary font-medium">Question Preview</th>
                  <th className="text-left py-2 px-3 text-text-secondary font-medium">Attempts</th>
                  <th className="text-left py-2 px-3 text-text-secondary font-medium">Avg Score</th>
                  <th className="text-left py-2 px-3 text-text-secondary font-medium">Difficulty</th>
                </tr>
              </thead>
              <tbody>
                {contentStats.map((stat, index) => (
                  <tr key={index} className="border-b border-border-custom last:border-0">
                    <td className="py-2 px-3 text-text-primary">
                      {stat.questionPreview.length > 60
                        ? stat.questionPreview.slice(0, 60) + "..."
                        : stat.questionPreview}
                    </td>
                    <td className="py-2 px-3 text-text-secondary">{stat.attempts}</td>
                    <td className="py-2 px-3 text-text-secondary">{stat.avgScore}%</td>
                    <td className="py-2 px-3">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-xs font-medium capitalize",
                        stat.difficulty === "beginner" ? "bg-accent-green/20 text-accent-green" :
                        stat.difficulty === "intermediate" ? "bg-accent-amber/20 text-accent-amber" :
                        "bg-accent-red/20 text-accent-red"
                      )}>
                        {stat.difficulty}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
