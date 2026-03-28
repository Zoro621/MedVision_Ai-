"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Bot, 
  Layers, 
  FileQuestion, 
  BarChart3, 
  Trophy,
  Settings,
  HelpCircle,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MOCK_USER, MOCK_DECKS, MOCK_QUIZZES } from "@/lib/mockData/dashboard";
import { useAuth } from "@/context/AuthContext";

const NAV_ITEMS = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "AI Assistant", href: "/dashboard/assistant", icon: Bot },
  { label: "Flashcards", href: "/dashboard/flashcards", icon: Layers, badge: MOCK_DECKS.reduce((acc, d) => acc + d.dueCards, 0), badgeColor: "red" },
  { label: "Quizzes", href: "/dashboard/quizzes", icon: FileQuestion, badge: MOCK_QUIZZES.filter(q => q.isNew).length, badgeColor: "cyan" },
  { label: "GradCAM Overlay", href: "/dashboard/gradcam", icon: Eye },
  { label: "Progress", href: "/dashboard/progress", icon: BarChart3 },
  { label: "Achievements", href: "/dashboard/achievements", icon: Trophy },
];

const UTILITY_ITEMS = [
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
  { label: "Help & Docs", href: "#", icon: HelpCircle },
];

interface SidebarProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
}

export function Sidebar({ collapsed, onCollapse }: SidebarProps) {
  const pathname = usePathname();
  const { logout } = useAuth();
  const user = MOCK_USER;

  const xpProgress = (user.xp / user.xpToNextLevel) * 100;

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "fixed left-0 top-16 h-[calc(100vh-64px)] bg-surface border-r border-border-custom z-40 transition-all duration-300 hidden lg:flex flex-col",
          collapsed ? "w-14" : "w-60"
        )}
      >
        {/* User Identity Card */}
        {!collapsed && (
          <div className="p-4 border-b border-border-custom">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-cyan to-accent-green flex items-center justify-center text-background font-semibold text-sm">
                {user.avatarInitials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-text-primary font-medium text-sm truncate">{user.fullName}</p>
                <p className="text-text-secondary text-xs font-mono">{user.trainingLevel}</p>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-accent-green font-mono">Level {user.level} · {user.levelTitle}</span>
              </div>
              <div className="h-2 bg-surface-elevated rounded-full overflow-hidden">
                <div 
                  className="h-full bg-accent-cyan rounded-full transition-all duration-500"
                  style={{ width: `${xpProgress}%` }}
                />
              </div>
              <p className="text-text-secondary text-xs font-mono text-right">
                {user.xp.toLocaleString()} / {user.xpToNextLevel.toLocaleString()} XP
              </p>
            </div>
          </div>
        )}

        {/* Collapsed user avatar */}
        {collapsed && (
          <div className="p-2 border-b border-border-custom flex justify-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-cyan to-accent-green flex items-center justify-center text-background font-semibold text-sm cursor-pointer">
                  {user.avatarInitials}
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p className="font-medium">{user.fullName}</p>
                <p className="text-xs text-muted-foreground">{user.trainingLevel}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 py-2 overflow-y-auto">
          <ul className="space-y-1 px-2">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
              const Icon = item.icon;

              const linkContent = (
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 h-12 px-3 rounded-lg transition-all relative group",
                    isActive 
                      ? "bg-surface-elevated text-accent-cyan border-l-[3px] border-accent-cyan -ml-[3px] pl-[15px]" 
                      : "text-text-secondary hover:bg-surface-elevated hover:text-text-primary",
                    collapsed && "justify-center px-0"
                  )}
                >
                  <Icon className={cn("h-5 w-5 shrink-0", isActive && "text-accent-cyan")} />
                  {!collapsed && (
                    <>
                      <span className="text-sm font-medium">{item.label}</span>
                      {item.badge && item.badge > 0 && (
                        <span 
                          className={cn(
                            "ml-auto text-xs font-mono px-2 py-0.5 rounded-full",
                            item.badgeColor === "red" 
                              ? "bg-accent-red/20 text-accent-red" 
                              : "bg-accent-cyan/20 text-accent-cyan"
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </Link>
              );

              return (
                <li key={item.href}>
                  {collapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                      <TooltipContent side="right" className="flex items-center gap-2">
                        {item.label}
                        {item.badge && item.badge > 0 && (
                          <span 
                            className={cn(
                              "text-xs font-mono px-1.5 py-0.5 rounded-full",
                              item.badgeColor === "red" 
                                ? "bg-accent-red/20 text-accent-red" 
                                : "bg-accent-cyan/20 text-accent-cyan"
                            )}
                          >
                            {item.badge}
                          </span>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    linkContent
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Utility Links */}
        <div className="border-t border-border-custom py-2 px-2">
          <ul className="space-y-1">
            {UTILITY_ITEMS.map((item) => {
              const Icon = item.icon;
              const linkContent = (
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 h-10 px-3 rounded-lg text-text-secondary hover:bg-surface-elevated hover:text-text-primary transition-all",
                    collapsed && "justify-center px-0"
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span className="text-sm">{item.label}</span>}
                </Link>
              );

              return (
                <li key={item.label}>
                  {collapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                      <TooltipContent side="right">{item.label}</TooltipContent>
                    </Tooltip>
                  ) : (
                    linkContent
                  )}
                </li>
              );
            })}
            <li>
              {collapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={logout}
                      className="flex items-center justify-center gap-3 h-10 w-full px-3 rounded-lg text-accent-red/70 hover:bg-accent-red/10 hover:text-accent-red transition-all"
                    >
                      <LogOut className="h-5 w-5 shrink-0" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Sign Out</TooltipContent>
                </Tooltip>
              ) : (
                <button
                  onClick={logout}
                  className="flex items-center gap-3 h-10 w-full px-3 rounded-lg text-accent-red/70 hover:bg-accent-red/10 hover:text-accent-red transition-all"
                >
                  <LogOut className="h-5 w-5 shrink-0" />
                  <span className="text-sm">Sign Out</span>
                </button>
              )}
            </li>
          </ul>
        </div>

        {/* Collapse Toggle */}
        <div className="p-2 border-t border-border-custom">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCollapse(!collapsed)}
            className={cn("w-full h-8", collapsed && "px-0")}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            {!collapsed && <span className="ml-2 text-xs">Collapse</span>}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
