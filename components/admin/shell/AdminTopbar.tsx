"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { 
  Search, 
  Bell, 
  Menu,
  Settings,
  ScrollText,
  ServerCog,
  Eye,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { AdminMobileNav } from "./AdminMobileNav";
import {
  getAdminStudentDetail,
  getAdminSystemStatus,
  getAdminStudents,
} from "@/lib/api/adminOperations";
import { listAdminQuizzes } from "@/lib/api/adminContent";
import type { AdminStudentRow } from "@/types/admin";
import type { AdminQuizSummary } from "@/lib/api/adminContent";
import { useAuth } from "@/context/AuthContext";

const BREADCRUMB_MAP: Record<string, string> = {
  "/admin/dashboard": "Overview",
  "/admin/dashboard/students": "Students",
  "/admin/dashboard/content": "Content",
  "/admin/dashboard/analytics": "Analytics",
  "/admin/dashboard/audit-log": "Audit Log",
  "/admin/dashboard/system": "System Health",
  "/admin/dashboard/settings": "Settings",
};

export function AdminTopbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user } = useAuth();
  const [commandOpen, setCommandOpen] = useState(false);
  const [studentBreadcrumbName, setStudentBreadcrumbName] = useState<string | null>(null);
  const [systemUi, setSystemUi] = useState<{
    dot: "operational" | "degraded" | "outage";
    label: string;
  }>({ dot: "operational", label: "All Systems Operational" });
  const [cmdStudents, setCmdStudents] = useState<AdminStudentRow[]>([]);
  const [cmdQuizzes, setCmdQuizzes] = useState<AdminQuizSummary[]>([]);

  const studentIdMatch = pathname.match(/\/admin\/dashboard\/students\/([^/]+)/);
  const studentIdFromPath = studentIdMatch?.[1];

  useEffect(() => {
    if (!studentIdFromPath) {
      setStudentBreadcrumbName(null);
      return;
    }
    let cancelled = false;
    getAdminStudentDetail(studentIdFromPath)
      .then((d) => {
        if (!cancelled) setStudentBreadcrumbName(d.student.name);
      })
      .catch(() => {
        if (!cancelled) setStudentBreadcrumbName(null);
      });
    return () => {
      cancelled = true;
    };
  }, [studentIdFromPath]);

  useEffect(() => {
    let cancelled = false;
    getAdminSystemStatus()
      .then((s) => {
        if (cancelled) return;
        const st = s.overallStatus;
        if (st === "down") {
          setSystemUi({ dot: "outage", label: s.overallLabel || "Down" });
        } else if (st === "degraded") {
          setSystemUi({ dot: "degraded", label: s.overallLabel || "Degraded" });
        } else {
          setSystemUi({
            dot: "operational",
            label: "All Systems Operational",
          });
        }
      })
      .catch(() => {
        if (!cancelled) setSystemUi({ dot: "degraded", label: "Status unavailable" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!commandOpen) return;
    if (cmdStudents.length > 0 && cmdQuizzes.length > 0) return;
    let cancelled = false;
    Promise.all([
      getAdminStudents({ pageSize: 50 }),
      listAdminQuizzes(),
    ])
      .then(([s, q]) => {
        if (cancelled) return;
        setCmdStudents(s.students);
        setCmdQuizzes(q);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [commandOpen, cmdStudents.length, cmdQuizzes.length]);

  // Get breadcrumb
  const getBreadcrumb = () => {
    const parts = pathname.split("/").filter(Boolean);
    const crumbs: string[] = ["Admin"];

    // Check for specific routes
    if (BREADCRUMB_MAP[pathname]) {
      crumbs.push(BREADCRUMB_MAP[pathname]);
    } else if (pathname.includes("/students/")) {
      crumbs.push("Students");
      const studentId = parts[parts.length - 1];
      if (studentBreadcrumbName) {
        crumbs.push(studentBreadcrumbName);
      } else if (studentId) {
        crumbs.push("Student");
      }
    } else if (pathname.includes("/content/quiz-builder")) {
      crumbs.push("Content", "Quiz Builder");
    }

    return crumbs;
  };

  const handleLogout = async () => {
    // Clear backend session + cookies before navigating, otherwise the
    // middleware redirects /admin/login back to /admin/dashboard because
    // medvision_token is still set.
    try {
      await logout();
    } finally {
      router.replace("/admin/login");
      router.refresh();
    }
  };

  const handleViewAsStudent = async () => {
    // The middleware blocks /dashboard for users whose role cookie is "admin",
    // so we have to log out first, then send them to the student login.
    try {
      await logout();
    } finally {
      router.replace("/login");
      router.refresh();
    }
  };

  return (
    <>
      <header className="fixed top-0 right-0 left-0 lg:left-[240px] h-16 bg-surface border-b border-accent-red/30 flex items-center justify-between px-4 lg:px-6 z-30">
        {/* Left: Mobile menu + Logo + Breadcrumb */}
        <div className="flex items-center gap-3">
          {/* Mobile Menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-0 bg-surface border-border-custom">
              <AdminMobileNav />
            </SheetContent>
          </Sheet>

          {/* Logo + Admin Badge */}
          <div className="flex items-center gap-2">
            <span className="font-[family-name:var(--font-syne)] font-bold text-text-primary text-lg hidden sm:block">
              MedVision AI
            </span>
            <span className="px-2 py-0.5 bg-accent-red/20 text-accent-red text-xs font-mono font-bold rounded">
              ADMIN
            </span>
          </div>

          {/* Breadcrumb separator */}
          <span className="text-text-secondary hidden md:block">·</span>

          {/* Breadcrumb */}
          <nav className="hidden md:flex items-center gap-1 text-sm">
            {getBreadcrumb().map((crumb, idx, arr) => (
              <span key={idx} className="flex items-center gap-1">
                <span className={cn(
                  idx === arr.length - 1 ? "text-text-primary" : "text-text-secondary"
                )}>
                  {crumb}
                </span>
                {idx < arr.length - 1 && (
                  <ChevronRight className="h-3 w-3 text-text-secondary" />
                )}
              </span>
            ))}
          </nav>
        </div>

        {/* Center: Search */}
        <div className="hidden lg:flex flex-1 max-w-md mx-8">
          <button
            onClick={() => setCommandOpen(true)}
            className="w-full flex items-center gap-2 px-4 py-2 bg-surface-elevated border border-border-custom rounded-lg text-text-secondary hover:border-accent-red/30 transition-colors"
          >
            <Search className="h-4 w-4" />
            <span className="text-sm">Search students, quizzes, logs...</span>
            <kbd className="ml-auto text-xs bg-surface px-1.5 py-0.5 rounded border border-border-custom">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right: Status, Notifications, Avatar */}
        <div className="flex items-center gap-2 lg:gap-4">
          {/* System Status */}
          <div className="hidden md:flex items-center gap-2">
            <span className={cn(
              "w-2 h-2 rounded-full animate-pulse",
              systemUi.dot === 'operational' && "bg-accent-green",
              systemUi.dot === 'degraded' && "bg-accent-amber",
              systemUi.dot === 'outage' && "bg-accent-red"
            )} />
            <span className={cn(
              "text-xs font-mono",
              systemUi.dot === 'operational' && "text-accent-green",
              systemUi.dot === 'degraded' && "text-accent-amber",
              systemUi.dot === 'outage' && "text-accent-red"
            )}>
              {systemUi.label}
            </span>
          </div>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent-red text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              3
            </span>
          </Button>

          {/* Mobile Search */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="lg:hidden"
            onClick={() => setCommandOpen(true)}
          >
            <Search className="h-5 w-5" />
          </Button>

          {/* Avatar Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 p-1 rounded-lg hover:bg-surface-elevated transition-colors">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-red to-orange-500 flex items-center justify-center text-white font-bold text-xs">
                  {user?.avatarInitials || "AD"}
                </div>
                <div className="hidden lg:block text-left">
                  <p className="text-text-primary text-sm font-medium">
                    {user?.fullName || "Admin"}
                  </p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-surface border-border-custom">
              <div className="px-2 py-2 border-b border-border-custom">
                <p className="text-text-primary font-medium text-sm">
                  {user?.fullName || "Admin User"}
                </p>
                <p className="text-text-secondary text-xs">
                  {user?.email || "admin@medvision.ai"}
                </p>
                <p className="text-accent-red text-xs font-medium mt-1">Administrator</p>
              </div>
              <DropdownMenuItem onClick={() => router.push("/admin/dashboard/settings")}>
                <Settings className="h-4 w-4 mr-2" />
                Admin Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/admin/dashboard/audit-log")}>
                <ScrollText className="h-4 w-4 mr-2" />
                Audit Log
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/admin/dashboard/system")}>
                <ServerCog className="h-4 w-4 mr-2" />
                System Health
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border-custom" />
              <DropdownMenuItem onClick={handleViewAsStudent}>
                <Eye className="h-4 w-4 mr-2" />
                View as Student
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="text-accent-red focus:text-accent-red">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Command Dialog */}
      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <CommandInput placeholder="Search students, quizzes, logs..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Students">
            {cmdStudents.slice(0, 8).map((student) => (
              <CommandItem
                key={student.id}
                onSelect={() => {
                  router.push(`/admin/dashboard/students/${student.id}`);
                  setCommandOpen(false);
                }}
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-accent-cyan to-accent-purple flex items-center justify-center text-white text-xs mr-2">
                  {student.avatarInitials}
                </div>
                <span>{student.name}</span>
                <span className="ml-auto text-text-secondary text-xs">{student.email}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Quizzes">
            {cmdQuizzes.slice(0, 6).map((quiz) => (
              <CommandItem
                key={quiz.id}
                onSelect={() => {
                  router.push(`/admin/dashboard/content/quiz-builder?id=${quiz.id}`);
                  setCommandOpen(false);
                }}
              >
                <span>{quiz.title}</span>
                <span className="ml-auto text-text-secondary text-xs">{quiz.topic ?? ""}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Quick Actions">
            <CommandItem onSelect={() => { router.push("/admin/dashboard/content/quiz-builder"); setCommandOpen(false); }}>
              Add Quiz
            </CommandItem>
            <CommandItem onSelect={() => { router.push("/admin/dashboard/analytics"); setCommandOpen(false); }}>
              Export Report
            </CommandItem>
            <CommandItem onSelect={() => { router.push("/admin/dashboard/system"); setCommandOpen(false); }}>
              View System Health
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
