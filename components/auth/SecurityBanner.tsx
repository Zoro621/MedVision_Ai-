"use client";

import { ShieldAlert } from "lucide-react";

export function SecurityBanner() {
  return (
    <div className="w-full max-w-[440px] mb-6 p-4 rounded-lg bg-[rgba(255,107,107,0.08)] border border-[#FF6B6B]/30">
      <div className="flex items-start gap-3">
        <ShieldAlert className="h-5 w-5 text-[#FF6B6B] shrink-0 mt-0.5" />
        <div>
          <p className="text-[#FF6B6B] font-medium text-sm">Restricted Area</p>
          <p className="text-text-secondary text-sm mt-1">
            This portal is for authorized administrators only. All access
            attempts are logged.
          </p>
        </div>
      </div>
    </div>
  );
}
