"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  BarChart2, 
  ScrollText, 
  ServerCog,
  Settings,
  Eye,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MOCK_AI_CORRECTIONS, MOCK_STUDENTS } from "@/lib/mockData/admin";

const NAV_ITEMS = [
  { label: "Overview", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Students", href: "/admin/dashboard/students", icon: Users, badge: MOCK_STUDENTS.filter(s => s.risk === 'at-risk').length, badgeColor: "red" },
  { label: "Content", href: "/admin/dashboard/content", icon: BookOpen },
  { label: "Analytics", href: "/admin/dashboard/analytics", icon: BarChart2 },
  { label: "Audit Log", href: "/admin/dashboard/audit-log", icon: ScrollText, badge: MOCK_AI_CORRECTIONS.filter(c => c.status === 'pending').length, badgeColor: "amber" },
  { label: "System Health", href: "/admin/dashboard/system", icon: ServerCog },
];

const BOTTOM_NAV = [
  { label: "Admin Settings", href: "/admin/dashboard/settings", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href: string) => {
    if (href === "/admin/dashboard") return pathname === href;
    return pathname.startsWith(href);
  };

  const handleLogout = () => {
    router.push("/admin/login");
  };

  const handlePreviewAsStudent = () => {
    router.push("/dashboard");
  };

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "fixed left-0 top-0 h-screen bg-surface border-r border-border-custom flex flex-col z-40 transition-all duration-300",
          collapsed ? "w-[56px]" : "w-[240px]"
        )}
      >
        {/* Admin Identity Card */}
        <div className={cn("p-4 border-b border-border-custom", collapsed && "px-2")}>
          {!collapsed ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-red to-orange-500 flex items-center justify-center text-white font-bold text-sm">
                  AD
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-text-primary font-semibold text-sm truncate">Admin User</p>
                  <p className="text-text-secondary text-xs truncate">Administrator</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Shield className="h-3 w-3 text-accent-green" />
                <span className="text-accent-green font-mono">Secure Session</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-text-secondary">
                <Clock className="h-3 w-3" />
                <span>Last login: Today, 09:14 AM</span>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-red to-orange-500 flex items-center justify-center text-white font-bold text-xs">
                AD
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-1 px-2">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              
              const navButton = (
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all relative group",
                    active
                      ? "bg-surface-elevated text-accent-red border-l-[3px] border-accent-red ml-[-2px]"
                      : "text-text-secondary hover:text-text-primary hover:bg-surface-elevated"
                  )}
                >
                  <Icon className={cn("h-5 w-5 flex-shrink-0", active && "text-accent-red")} />
                  {!collapsed && (
                    <>
                      <span className={cn("flex-1 text-sm font-medium", active && "text-accent-red")}>
                        {item.label}
                      </span>
                      {item.badge && item.badge > 0 && (
                        <span className={cn(
                          "px-1.5 py-0.5 text-xs font-bold rounded-full",
                          item.badgeColor === "red" 
                            ? "bg-accent-red/20 text-accent-red"
                            : "bg-accent-amber/20 text-accent-amber"
                        )}>
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                  {collapsed && item.badge && item.badge > 0 && (
                    <span className={cn(
                      "absolute -top-1 -right-1 w-4 h-4 text-[10px] font-bold rounded-full flex items-center justify-center",
                      item.badgeColor === "red"
                        ? "bg-accent-red text-white"
                        : "bg-accent-amber text-background"
                    )}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              );

              return (
                <li key={item.href}>
                  {collapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>{navButton}</TooltipTrigger>
                      <TooltipContent side="right" className="bg-surface-elevated border-border-custom">
                        <p>{item.label}</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    navButton
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom Section */}
        <div className="border-t border-border-custom p-2 space-y-1">
          {BOTTOM_NAV.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;

            const navButton = (
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                  active
                    ? "bg-surface-elevated text-accent-red"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-elevated"
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
              </Link>
            );

            return collapsed ? (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>{navButton}</TooltipTrigger>
                <TooltipContent side="right" className="bg-surface-elevated border-border-custom">
                  <p>{item.label}</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <div key={item.href}>{navButton}</div>
            );
          })}

          {/* Preview as Student */}
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handlePreviewAsStudent}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-text-secondary hover:text-text-primary hover:bg-surface-elevated w-full"
                >
                  <Eye className="h-5 w-5 flex-shrink-0" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-surface-elevated border-border-custom">
                <p>Preview as Student</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={handlePreviewAsStudent}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-text-secondary hover:text-text-primary hover:bg-surface-elevated w-full"
            >
              <Eye className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm font-medium">Preview as Student</span>
            </button>
          )}

          {/* Sign Out */}
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-text-secondary hover:text-accent-red hover:bg-accent-red/10 w-full"
                >
                  <LogOut className="h-5 w-5 flex-shrink-0" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-surface-elevated border-border-custom">
                <p>Sign Out</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-text-secondary hover:text-accent-red hover:bg-accent-red/10 w-full"
            >
              <LogOut className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm font-medium">Sign Out</span>
            </button>
          )}
        </div>

        {/* Collapse Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 h-6 w-6 rounded-full bg-surface-elevated border border-border-custom hover:bg-accent-red/20 hover:border-accent-red/50"
        >
          {collapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </Button>
      </aside>
    </TooltipProvider>
  );
}
