"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { MobileNav } from "./MobileNav";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Topbar onMobileMenuOpen={() => setMobileNavOpen(true)} />
      <Sidebar collapsed={sidebarCollapsed} onCollapse={setSidebarCollapsed} />
      <MobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      
      <main
        className={cn(
          "pt-16 min-h-screen transition-all duration-300",
          "lg:pl-60",
          sidebarCollapsed && "lg:pl-14"
        )}
      >
        <div className="p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
