"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useAuth } from "@/context/AuthContext";
import { getDashboardStats, type DashboardStats } from "@/lib/api/progress";

interface DashboardStatsContextValue {
  stats: DashboardStats | null;
  isLoading: boolean;
  refreshStats: () => Promise<void>;
}

const DashboardStatsContext = createContext<
  DashboardStatsContextValue | undefined
>(undefined);

export function DashboardStatsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { isAuthenticated } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshStats = useCallback(async () => {
    if (!isAuthenticated) {
      setStats(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const nextStats = await getDashboardStats();
      setStats(nextStats);
    } catch {
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  const value = useMemo(
    () => ({
      stats,
      isLoading,
      refreshStats,
    }),
    [stats, isLoading, refreshStats]
  );

  return (
    <DashboardStatsContext.Provider value={value}>
      {children}
    </DashboardStatsContext.Provider>
  );
}

export function useDashboardStats() {
  const context = useContext(DashboardStatsContext);
  if (!context) {
    throw new Error(
      "useDashboardStats must be used within a DashboardStatsProvider"
    );
  }
  return context;
}
