"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Menu, 
  Search, 
  Flame, 
  Zap, 
  Bell, 
  Settings, 
  BarChart3, 
  Trophy, 
  LogOut,
  Brain,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { MOCK_NOTIFICATIONS } from "@/lib/mockData/dashboard";
import { useAuth } from "@/context/AuthContext";
import { getDashboardUser } from "@/lib/dashboard/currentUser";

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
  const [commandOpen, setCommandOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const user = getDashboardUser(authUser);
  const notifications = MOCK_NOTIFICATIONS;
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const currentPage = Object.entries(PAGE_NAMES).find(([path]) => 
    pathname === path || (path !== "/dashboard" && pathname.startsWith(path))
  )?.[1] || "Dashboard";

  return (
    <>
      <header className="fixed top-0 left-0 right-0 h-16 bg-surface border-b border-border-custom z-50 flex items-center px-4 gap-4">
        {/* Left: Mobile menu + Logo */}
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
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-cyan to-accent-green flex items-center justify-center">
              <Brain className="h-5 w-5 text-background" />
            </div>
            <span className="font-[family-name:var(--font-syne)] text-lg font-bold text-accent-cyan hidden sm:inline">
              MedVision AI
            </span>
          </Link>

          <span className="text-text-secondary hidden lg:inline">/</span>
          <span className="text-text-secondary text-sm hidden lg:inline">{currentPage}</span>
        </div>

        {/* Center: Search */}
        <div className="flex-1 max-w-xl mx-auto hidden md:block">
          <button
            onClick={() => setCommandOpen(true)}
            className="w-full flex items-center gap-2 h-10 px-4 rounded-full bg-surface-elevated border border-border-custom text-text-secondary hover:border-accent-cyan/50 transition-colors"
          >
            <Search className="h-4 w-4" />
            <span className="text-sm flex-1 text-left">Search your materials, flashcards, topics...</span>
            <kbd className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 bg-surface rounded text-xs font-mono text-text-secondary">
              <span className="text-xs">⌘</span>K
            </kbd>
          </button>
        </div>

        {/* Right: Stats + User */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Streak Badge */}
          {mounted && (
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-surface-elevated transition-colors">
                  <Flame className="h-4 w-4 text-accent-green" />
                  <span className="text-sm font-mono text-accent-green">{user.streakDays}</span>
                  <span className="text-xs text-text-secondary hidden sm:inline">day streak</span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 glass-elevated">
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Study Streak Calendar</h4>
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: 14 }).map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "w-6 h-6 rounded-sm flex items-center justify-center text-xs",
                          i < user.streakDays ? "bg-accent-green/20 text-accent-green" : "bg-surface text-text-secondary"
                        )}
                      >
                        {i < user.streakDays ? "✓" : "○"}
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

          {/* XP Badge */}
          {mounted && (
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-surface-elevated transition-colors">
                  <Zap className="h-4 w-4 text-accent-purple" />
                  <span className="text-sm font-mono text-accent-purple">{user.xp.toLocaleString()}</span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 glass-elevated">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">Level Progress</h4>
                    <span className="text-xs text-accent-purple font-mono">Level {user.level}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="h-2 bg-surface rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-accent-purple rounded-full"
                        style={{ width: `${(user.xp / user.xpToNextLevel) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-text-secondary text-right">
                      {user.xpToNextLevel - user.xp} XP to Level {user.level + 1}
                    </p>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Notifications */}
          {mounted && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent-red text-[10px] font-bold rounded-full flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 glass-elevated p-0">
                <div className="p-3 border-b border-border-custom">
                  <h4 className="font-medium text-sm">Notifications</h4>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="text-sm text-text-secondary p-4 text-center">No notifications</p>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={cn(
                          "p-3 border-b border-border-custom last:border-0 hover:bg-surface-elevated transition-colors",
                          !notif.read && "bg-accent-cyan/5"
                        )}
                      >
                        <p className="text-sm font-medium">{notif.title}</p>
                        <p className="text-xs text-text-secondary mt-1">{notif.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* User Menu */}
          {mounted && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-9 h-9 rounded-full bg-gradient-to-br from-accent-cyan to-accent-green flex items-center justify-center text-background font-semibold text-sm">
                  {user.avatarInitials}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 glass-elevated">
                <div className="px-2 py-2">
                  <p className="font-medium text-sm">{user.fullName}</p>
                  <p className="text-xs text-text-secondary">{user.email}</p>
                  <p className="text-xs text-accent-cyan mt-1">{user.trainingLevel}</p>
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
                  className="text-accent-red focus:text-accent-red cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      {/* Command Dialog */}
      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <CommandInput placeholder="Search flashcards, quizzes, topics..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Quick Actions">
            <CommandItem onSelect={() => { setCommandOpen(false); }}>
              <Layers className="mr-2 h-4 w-4" />
              Review Flashcards
            </CommandItem>
            <CommandItem onSelect={() => { setCommandOpen(false); }}>
              <FileQuestion className="mr-2 h-4 w-4" />
              Start Quiz
            </CommandItem>
            <CommandItem onSelect={() => { setCommandOpen(false); }}>
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

// Import missing icons
import { Layers, FileQuestion, Bot } from "lucide-react";
