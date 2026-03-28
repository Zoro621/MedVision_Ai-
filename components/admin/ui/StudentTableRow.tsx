"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  MoreHorizontal, 
  Eye, 
  Mail, 
  FileBarChart, 
  RefreshCw, 
  Pause, 
  Trash2,
  Flame
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RiskBadge } from "./RiskBadge";
import { StatusDot } from "./StatusDot";
import type { AdminStudentRow } from "@/types/admin";

interface StudentTableRowProps {
  student: AdminStudentRow;
  selected: boolean;
  onSelect: (checked: boolean) => void;
}

export function StudentTableRow({ student, selected, onSelect }: StudentTableRowProps) {
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const getScoreColor = (score: number) => {
    if (score >= 75) return "text-accent-green";
    if (score >= 50) return "text-accent-amber";
    return "text-accent-red";
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 75) return "bg-accent-green";
    if (score >= 50) return "bg-accent-amber";
    return "bg-accent-red";
  };

  const getStatusType = (status: AdminStudentRow["status"]) => {
    switch (status) {
      case "active": return "success";
      case "inactive": return "warning";
      case "new": return "info";
      case "suspended": return "danger";
      default: return "neutral";
    }
  };

  return (
    <>
      <tr className="border-b border-border-custom hover:bg-accent-red/[0.04] transition-colors">
        {/* Checkbox */}
        <td className="p-4 w-12">
          <Checkbox
            checked={selected}
            onCheckedChange={onSelect}
            className="border-border-custom data-[state=checked]:bg-accent-red data-[state=checked]:border-accent-red"
          />
        </td>

        {/* Student Info */}
        <td className="p-4">
          <Link href={`/admin/dashboard/students/${student.id}`} className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-cyan to-accent-purple flex items-center justify-center text-white font-bold text-sm">
              {student.avatarInitials || student.name.split(" ").map(n => n[0]).join("")}
            </div>
            <div>
              <p className="text-text-primary font-medium group-hover:text-accent-red transition-colors">
                {student.name}
              </p>
              <p className="text-text-secondary text-xs">{student.email}</p>
            </div>
          </Link>
        </td>

        {/* Level */}
        <td className="p-4">
          <span className="text-text-primary text-sm">
            L{student.level} {student.levelTitle}
          </span>
        </td>

        {/* Avg Score */}
        <td className="p-4">
          <div className="flex items-center gap-2">
            <span className={cn("font-mono text-sm", getScoreColor(student.avgScore))}>
              {student.avgScore}%
            </span>
            <div className="w-16 h-1.5 bg-surface rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full", getScoreBarColor(student.avgScore))}
                style={{ width: `${student.avgScore}%` }}
              />
            </div>
          </div>
        </td>

        {/* Streak */}
        <td className="p-4">
          <div className="flex items-center gap-1">
            {student.streak > 0 ? (
              <>
                <Flame className="h-4 w-4 text-accent-amber" />
                <span className="text-text-primary text-sm">{student.streak}d</span>
              </>
            ) : (
              <span className="text-text-secondary text-sm">0d</span>
            )}
          </div>
        </td>

        {/* XP */}
        <td className="p-4">
          <span className="text-text-primary font-mono text-sm">
            {student.xp.toLocaleString()}
          </span>
        </td>

        {/* Status */}
        <td className="p-4">
          <StatusDot
            status={getStatusType(student.status)}
            label={student.status === "new" ? "New" : student.status.charAt(0).toUpperCase() + student.status.slice(1)}
          />
        </td>

        {/* Actions */}
        <td className="p-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 hover:bg-surface-elevated rounded-lg transition-colors">
                <MoreHorizontal className="h-4 w-4 text-text-secondary" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-surface border-border-custom">
              <DropdownMenuItem asChild>
                <Link href={`/admin/dashboard/students/${student.id}`}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Mail className="h-4 w-4 mr-2" />
                Send Message
              </DropdownMenuItem>
              <DropdownMenuItem>
                <FileBarChart className="h-4 w-4 mr-2" />
                Full Report
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border-custom" />
              <DropdownMenuItem>
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset Password
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setShowSuspendDialog(true)}
                className="text-accent-amber focus:text-accent-amber"
              >
                <Pause className="h-4 w-4 mr-2" />
                Suspend Account
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setShowDeleteDialog(true)}
                className="text-accent-red focus:text-accent-red"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Account
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </td>
      </tr>

      {/* Suspend Dialog */}
      <AlertDialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
        <AlertDialogContent className="bg-surface border-border-custom">
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to suspend {student.name}&apos;s account? They will not be able to access the platform until reactivated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border-custom">Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-accent-amber text-background hover:bg-accent-amber/90">
              Suspend
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-surface border-border-custom">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete {student.name}&apos;s account and remove all their data from the platform.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border-custom">Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-accent-red text-white hover:bg-accent-red/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
