"use client";

import { useState, useEffect } from "react";
import { Users, UserPlus, FileText, Layers, Bot, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminStatCard } from "@/components/admin/ui/AdminStatCard";
import { PlatformActivityChart } from "@/components/admin/charts/PlatformActivityChart";
import { LiveActivityFeed } from "@/components/admin/ui/LiveActivityFeed";
import { TopicPerformanceBar } from "@/components/admin/charts/TopicPerformanceBar";
import { ContentStatusCard } from "@/components/admin/ui/ContentStatusCard";
import { StudentsAtRiskCard } from "@/components/admin/ui/StudentsAtRiskCard";
import {
  MOCK_PLATFORM_STATS,
  MOCK_PLATFORM_ACTIVITY,
  MOCK_LIVE_ACTIVITY,
  MOCK_TOPIC_PERFORMANCE,
  MOCK_CONTENT_STATUS,
  MOCK_STUDENTS,
  delay,
} from "@/lib/mockData/admin";

export default function AdminOverviewPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      await delay(800);
      setIsLoading(false);
    };
    loadData();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await delay(1000);
    setLastRefreshed(new Date());
    setIsRefreshing(false);
  };

  const getTimeSinceRefresh = () => {
    const diff = Math.floor((new Date().getTime() - lastRefreshed.getTime()) / 60000);
    if (diff < 1) return "Just now";
    return `${diff} minute${diff > 1 ? "s" : ""} ago`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <div className="h-4 w-32 bg-surface-elevated rounded animate-pulse" />
            <div className="h-8 w-64 bg-surface-elevated rounded animate-pulse" />
          </div>
        </div>

        {/* KPI Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-surface-elevated/40 rounded-xl animate-pulse" />
          ))}
        </div>

        {/* Chart Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-[400px] bg-surface-elevated/40 rounded-xl animate-pulse" />
          <div className="h-[400px] bg-surface-elevated/40 rounded-xl animate-pulse" />
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
            // ADMIN OVERVIEW
          </p>
          <h1 className="text-2xl md:text-3xl font-[family-name:var(--font-syne)] font-bold text-text-primary">
            Platform Health & Activity
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-text-secondary text-sm">
            Last refreshed: {getTimeSinceRefresh()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="border-border-custom hover:border-accent-red/50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <AdminStatCard
          icon={Users}
          value={MOCK_PLATFORM_STATS.totalStudents}
          label="Total Students"
        />
        <AdminStatCard
          icon={UserPlus}
          value={MOCK_PLATFORM_STATS.newToday}
          label="New Today"
        />
        <AdminStatCard
          icon={FileText}
          value={MOCK_PLATFORM_STATS.quizzesToday}
          label="Quizzes Taken"
          sublabel="Today"
        />
        <AdminStatCard
          icon={Layers}
          value={MOCK_PLATFORM_STATS.flashcardsToday}
          label="Cards Reviewed"
          sublabel="Today"
        />
        <AdminStatCard
          icon={Bot}
          value={MOCK_PLATFORM_STATS.aiAccuracy}
          label="AI Accuracy"
          suffix="%"
          variant="success"
          href="/admin/dashboard/analytics"
        />
        <AdminStatCard
          icon={AlertTriangle}
          value={MOCK_PLATFORM_STATS.studentsAtRisk}
          label="Students At Risk"
          variant="danger"
          href="/admin/dashboard/students?filter=at-risk"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PlatformActivityChart data={MOCK_PLATFORM_ACTIVITY} />
        </div>
        <div>
          <LiveActivityFeed activities={MOCK_LIVE_ACTIVITY} />
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <TopicPerformanceBar data={MOCK_TOPIC_PERFORMANCE} />
        <ContentStatusCard
          quizzes={MOCK_CONTENT_STATUS.quizzes}
          flashcards={MOCK_CONTENT_STATUS.flashcards}
        />
        <StudentsAtRiskCard students={MOCK_STUDENTS} />
      </div>
    </div>
  );
}
