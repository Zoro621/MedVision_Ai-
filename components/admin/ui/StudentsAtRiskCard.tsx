"use client";

import Link from "next/link";
import { ArrowRight, AlertTriangle } from "lucide-react";
import type { AdminStudentRow } from "@/types/admin";

interface StudentsAtRiskCardProps {
  students: AdminStudentRow[];
}

export function StudentsAtRiskCard({ students }: StudentsAtRiskCardProps) {
  const atRiskStudents = students.filter((s) => s.risk === "at-risk");

  return (
    <div className="bg-surface-elevated/40 backdrop-blur-sm border border-accent-red/30 rounded-xl p-6 border-t-2 border-t-accent-red">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-accent-red font-mono text-xs font-semibold tracking-wider">
          // STUDENTS AT RISK
        </h3>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-accent-red" />
          <span className="text-accent-red font-bold">{atRiskStudents.length}</span>
        </div>
      </div>

      <div className="space-y-3">
        {atRiskStudents.map((student) => (
          <div
            key={student.id}
            className="p-3 bg-surface/50 rounded-lg border border-border-custom/50"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-text-primary text-sm font-medium">{student.name}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-text-secondary mb-2">
              <span>Avg score: <span className="text-accent-red">{student.avgScore}%</span></span>
              <span>·</span>
              <span>
                {student.streak === 0 ? "No streak" : `${student.streak} day streak`}
              </span>
            </div>
            <Link
              href={`/admin/dashboard/students/${student.id}`}
              className="text-xs text-accent-red hover:underline"
            >
              View Profile
            </Link>
          </div>
        ))}
      </div>

      <Link
        href="/admin/dashboard/students?filter=at-risk"
        className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-border-custom text-text-secondary hover:text-accent-red transition-colors text-sm"
      >
        View All At-Risk
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
