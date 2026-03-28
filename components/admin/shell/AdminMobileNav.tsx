"use client";

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
  Shield,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SheetClose } from "@/components/ui/sheet";
import { MOCK_AI_CORRECTIONS, MOCK_STUDENTS } from "@/lib/mockData/admin";

const NAV_ITEMS = [
  { label: "Overview", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Students", href: "/admin/dashboard/students", icon: Users, badge: MOCK_STUDENTS.filter(s => s.risk === 'at-risk').length, badgeColor: "red" },
  { label: "Content", href: "/admin/dashboard/content", icon: BookOpen },
  { label: "Analytics", href: "/admin/dashboard/analytics", icon: BarChart2 },
  { label: "Audit Log", href: "/admin/dashboard/audit", icon: ScrollText, badge: MOCK_AI_CORRECTIONS.filter(c => c.status === 'pending').length, badgeColor: "amber" },
  { label: "System Health", href: "/admin/dashboard/system", icon: ServerCog },
];

export function AdminMobileNav() {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) => {
    if (href === "/admin/dashboard") return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Admin Identity Card */}
      <div className="p-4 border-b border-border-custom">
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
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            
            return (
              <li key={item.href}>
                <SheetClose asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all relative",
                      active
                        ? "bg-surface-elevated text-accent-red border-l-[3px] border-accent-red ml-[-2px]"
                        : "text-text-secondary hover:text-text-primary hover:bg-surface-elevated"
                    )}
                  >
                    <Icon className={cn("h-5 w-5 flex-shrink-0", active && "text-accent-red")} />
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
                  </Link>
                </SheetClose>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-border-custom p-2 space-y-1">
        <SheetClose asChild>
          <Link
            href="/admin/dashboard/settings"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
              isActive("/admin/dashboard/settings")
                ? "bg-surface-elevated text-accent-red"
                : "text-text-secondary hover:text-text-primary hover:bg-surface-elevated"
            )}
          >
            <Settings className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm font-medium">Admin Settings</span>
          </Link>
        </SheetClose>

        <SheetClose asChild>
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-text-secondary hover:text-text-primary hover:bg-surface-elevated w-full"
          >
            <Eye className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm font-medium">Preview as Student</span>
          </Link>
        </SheetClose>

        <button
          onClick={() => router.push("/admin/login")}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-text-secondary hover:text-accent-red hover:bg-accent-red/10 w-full"
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  );
}
