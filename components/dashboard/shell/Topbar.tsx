"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  Bot,
  Brain,
  FileQuestion,
  Flame,
  Layers,
  LogOut,
  Menu,
  Search,
  Settings,
  Trophy,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAuth } from "@/context/AuthContext";
import { useDashboardStats } from "@/context/DashboardStatsContext";
import { getDashboardUser } from "@/lib/dashboard/currentUser";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/dashboard/ui/ThemeToggle";

interface TopbarProps {
  onMobileMenuOpen: () => void;
}

const PAGE_NAMES: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/assistant": "AI Assistant",
  "/dashboard/flashcards": "Flashcards",
  "/dashboard/quizzes": "Quizzes",
  "/dashboard/progress": "Progress",
  "/dashboard/achievements": "Achievements",
  "/dashboard/settings": "Settings",
};

export function Topbar({ onMobileMenuOpen }: TopbarProps) {
  const pathname = usePathname();
  const { logout, user: authUser } = useAuth();
  const { stats } = useDashboardStats();
  const [commandOpen, setCommandOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const user = getDashboardUser(authUser, stats);

  const notifications = [
    ...(stats && stats.totalDueCards > 0
      ? [
          {
            id: "due-cards",
            title: "Cards due",
            message: `${stats.totalDueCards} flashcards are ready for review.`,
            read: false,
          },
        ]
      : []),
    ...(stats && stats.weakAreas.length > 0
      ? [
          {
            id: "weak-area",
            title: "Focus area",
            message: `${stats.weakAreas[0].topic} needs attention next.`,
            read: false,
          },
        ]
      : []),
  ];
  const unreadCount = notifications.filter((notification) => !notification.read).length;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setCommandOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const currentPage =
    Object.entries(PAGE_NAMES).find(
      ([path]) => pathname === path || (path !== "/dashboard" && pathname.startsWith(path))
    )?.[1] ?? "Dashboard";

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 flex h-16 items-center gap-4 border-b border-border-custom bg-surface px-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onMobileMenuOpen}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent-cyan to-accent-green">
              <Brain className="h-5 w-5 text-background" />
            </div>
            <span className="hidden text-lg font-bold text-accent-cyan sm:inline font-[family-name:var(--font-syne)]">
              MedVision AI
            </span>
          </Link>

          <span className="hidden text-text-secondary lg:inline">/</span>
          <span className="hidden text-sm text-text-secondary lg:inline">{currentPage}</span>
        </div>

        <div className="mx-auto hidden max-w-xl flex-1 md:block">
          <button
            onClick={() => setCommandOpen(true)}
            className="flex h-10 w-full items-center gap-2 rounded-full border border-border-custom bg-surface-elevated px-4 text-text-secondary transition-colors hover:border-accent-cyan/50"
          >
            <Search className="h-4 w-4" />
            <span className="flex-1 text-left text-sm">
              Search your materials, flashcards, topics...
            </span>
            <kbd className="hidden items-center gap-1 rounded bg-surface px-2 py-0.5 font-mono text-xs text-text-secondary lg:inline-flex">
              Ctrl/Cmd K
            </kbd>
          </button>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {mounted && (
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1.5 rounded-lg px-2 py-1 transition-colors hover:bg-surface-elevated">
                  <Flame className="h-4 w-4 text-accent-green" />
                  <span className="font-mono text-sm text-accent-green">{user.streakDays}</span>
                  <span className="hidden text-xs text-text-secondary sm:inline">day streak</span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 glass-elevated">
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Study Streak Calendar</h4>
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: 14 }).map((_, index) => (
                      <div
                        key={index}
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-sm text-xs",
                          index < user.streakDays
                            ? "bg-accent-green/20 text-accent-green"
                            : "bg-surface text-text-secondary"
                        )}
                      >
                        {index < user.streakDays ? "*" : "o"}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-text-secondary">
                    Next milestone: 14-day streak ({14 - user.streakDays} days away)
                  </p>
                </div>
              </PopoverContent>
            </Popover>
          )}

          {mounted && (
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1.5 rounded-lg px-2 py-1 transition-colors hover:bg-surface-elevated">
                  <Zap className="h-4 w-4 text-accent-purple" />
                  <span className="font-mono text-sm text-accent-purple">
                    {user.xp.toLocaleString()}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 glass-elevated">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">Level Progress</h4>
                    <span className="font-mono text-xs text-accent-purple">
                      Level {user.level}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="h-2 overflow-hidden rounded-full bg-surface">
                      <div
                        className="h-full rounded-full bg-accent-purple"
                        style={{
                          width: `${
                            user.xp + user.xpToNextLevel > 0
                              ? (user.xp / (user.xp + user.xpToNextLevel)) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                    <p className="text-right text-xs text-text-secondary">
                      {user.xpToNextLevel} XP to Level {user.level + 1}
                    </p>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}

          {mounted && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent-red text-[10px] font-bold">
                      {unreadCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="glass-elevated w-80 p-0">
                <div className="border-b border-border-custom p-3">
                  <h4 className="text-sm font-medium">Notifications</h4>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="p-4 text-center text-sm text-text-secondary">
                      No notifications
                    </p>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={cn(
                          "border-b border-border-custom p-3 transition-colors last:border-0 hover:bg-surface-elevated",
                          !notification.read && "bg-accent-cyan/5"
                        )}
                      >
                        <p className="text-sm font-medium">{notification.title}</p>
                        <p className="mt-1 text-xs text-text-secondary">
                          {notification.message}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>
          )}

          <ThemeToggle />

          {mounted && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-accent-cyan to-accent-green text-sm font-semibold text-background">
                  {user.avatarInitials}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="glass-elevated w-56">
                <div className="px-2 py-2">
                  <p className="text-sm font-medium">{user.fullName}</p>
                  <p className="text-xs text-text-secondary">{user.email}</p>
                  <p className="mt-1 text-xs text-accent-cyan">{user.trainingLevel}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings" className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/progress" className="cursor-pointer">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    My Progress
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/achievements" className="cursor-pointer">
                    <Trophy className="mr-2 h-4 w-4" />
                    Achievements
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-accent-red focus:text-accent-red"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <CommandInput placeholder="Search flashcards, quizzes, topics..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Quick Actions">
            <CommandItem onSelect={() => setCommandOpen(false)}>
              <Layers className="mr-2 h-4 w-4" />
              Review Flashcards
            </CommandItem>
            <CommandItem onSelect={() => setCommandOpen(false)}>
              <FileQuestion className="mr-2 h-4 w-4" />
              Start Quiz
            </CommandItem>
            <CommandItem onSelect={() => setCommandOpen(false)}>
              <Bot className="mr-2 h-4 w-4" />
              Ask AI Assistant
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Topics">
            <CommandItem>Chest Radiology</CommandItem>
            <CommandItem>Neuro Imaging</CommandItem>
            <CommandItem>MSK Radiology</CommandItem>
            <CommandItem>Abdominal CT</CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
