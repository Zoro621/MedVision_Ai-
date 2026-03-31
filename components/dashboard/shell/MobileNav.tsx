"use client";

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
  Brain,
  X,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MOCK_DECKS, MOCK_QUIZZES } from "@/lib/mockData/dashboard";
import { useAuth } from "@/context/AuthContext";
import { getDashboardUser } from "@/lib/dashboard/currentUser";

const NAV_ITEMS = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "AI Assistant", href: "/dashboard/assistant", icon: Bot },
  { label: "Flashcards", href: "/dashboard/flashcards", icon: Layers, badge: MOCK_DECKS.reduce((acc, d) => acc + d.dueCards, 0), badgeColor: "red" },
  { label: "Quizzes", href: "/dashboard/quizzes", icon: FileQuestion, badge: MOCK_QUIZZES.filter(q => q.isNew).length, badgeColor: "cyan" },
  { label: "Progress", href: "/dashboard/progress", icon: BarChart3 },
  { label: "Achievements", href: "/dashboard/achievements", icon: Trophy },
];

const UTILITY_ITEMS = [
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
  { label: "Help & Docs", href: "#", icon: HelpCircle },
];

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
}

export function MobileNav({ open, onClose }: MobileNavProps) {
  const pathname = usePathname();
  const { logout, user: authUser } = useAuth();
  const user = getDashboardUser(authUser);
  const xpProgress = (user.xp / user.xpToNextLevel) * 100;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="left" className="w-72 bg-surface border-r-border-custom p-0">
        <SheetHeader className="p-4 border-b border-border-custom">
          <SheetTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-cyan to-accent-green flex items-center justify-center">
              <Brain className="h-5 w-5 text-background" />
            </div>
            <span className="font-[family-name:var(--font-syne)] text-lg font-bold text-accent-cyan">
              MedVision AI
            </span>
          </SheetTitle>
        </SheetHeader>

        {/* User Identity Card */}
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

        {/* Navigation */}
        <nav className="flex-1 py-2 overflow-y-auto">
          <ul className="space-y-1 px-2">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
              const Icon = item.icon;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 h-12 px-3 rounded-lg transition-all relative",
                      isActive 
                        ? "bg-surface-elevated text-accent-cyan border-l-[3px] border-accent-cyan -ml-[3px] pl-[15px]" 
                        : "text-text-secondary hover:bg-surface-elevated hover:text-text-primary"
                    )}
                  >
                    <Icon className={cn("h-5 w-5 shrink-0", isActive && "text-accent-cyan")} />
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
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Utility Links */}
        <div className="border-t border-border-custom py-2 px-2 mt-auto">
          <ul className="space-y-1">
            {UTILITY_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className="flex items-center gap-3 h-10 px-3 rounded-lg text-text-secondary hover:bg-surface-elevated hover:text-text-primary transition-all"
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="text-sm">{item.label}</span>
                  </Link>
                </li>
              );
            })}
            <li>
              <button
                onClick={() => { logout(); onClose(); }}
                className="flex items-center gap-3 h-10 w-full px-3 rounded-lg text-accent-red/70 hover:bg-accent-red/10 hover:text-accent-red transition-all"
              >
                <LogOut className="h-5 w-5 shrink-0" />
                <span className="text-sm">Sign Out</span>
              </button>
            </li>
          </ul>
        </div>
      </SheetContent>
    </Sheet>
  );
}
