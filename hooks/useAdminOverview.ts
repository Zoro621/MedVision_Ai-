"use client";

import { useEffect, useState } from "react";
import { getAdminOverview } from "@/lib/api/adminAnalytics";
import type { AdminOverviewData } from "@/lib/api/adminAnalytics";

let cache: AdminOverviewData | null = null;
let inflight: Promise<AdminOverviewData> | null = null;

/**
 * Shared admin overview for nav badges (dedupes requests across Sidebar / MobileNav).
 */
export function useAdminOverview(): AdminOverviewData | null {
  const [data, setData] = useState<AdminOverviewData | null>(cache);
  useEffect(() => {
    if (cache) {
      setData(cache);
      return;
    }
    if (!inflight) {
      inflight = getAdminOverview()
        .then((d) => {
          cache = d;
          return d;
        })
        .finally(() => {
          inflight = null;
        });
    }
    inflight.then(setData).catch(() => {});
  }, []);
  return data;
}
