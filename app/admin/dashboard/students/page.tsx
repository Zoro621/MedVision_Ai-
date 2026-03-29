"use client";

import { Suspense, useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { 
  Search, 
  UserPlus, 
  Download, 
  Users,
  ChevronUp,
  ChevronDown,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { StudentTableRow } from "@/components/admin/ui/StudentTableRow";
import { BulkActionBar } from "@/components/admin/ui/BulkActionBar";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { MOCK_STUDENTS, delay } from "@/lib/mockData/admin";
import type { AdminStudentRow, StudentRisk, StudentStatus } from "@/types/admin";
import type { RadiologyTopic } from "@/types/dashboard";

type SortField = "name" | "level" | "avgScore" | "streak" | "xp" | "status";
type SortDirection = "asc" | "desc";

const ITEMS_PER_PAGE = 10;

function StudentsPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 bg-surface-elevated rounded animate-pulse" />
      <div className="h-12 bg-surface-elevated rounded animate-pulse" />
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-surface-elevated/40 rounded animate-pulse" />
        ))}
      </div>
    </div>
  );
}

function StudentsPageContent() {
  const searchParams = useSearchParams();
  const initialFilter = searchParams.get("filter");

  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [topicFilter, setTopicFilter] = useState<RadiologyTopic | "all">("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StudentStatus | "all">("all");
  const [riskFilter, setRiskFilter] = useState<StudentRisk | "all">(
    initialFilter === "at-risk" ? "at-risk" : "all"
  );
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const loadData = async () => {
      await delay(800);
      setIsLoading(false);
    };
    loadData();
  }, []);

  // Filter and sort students
  const filteredStudents = useMemo(() => {
    let result = [...MOCK_STUDENTS];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.email.toLowerCase().includes(query)
      );
    }

    // Topic filter
    if (topicFilter !== "all") {
      result = result.filter((s) => s.radiologyFocus?.includes(topicFilter));
    }

    // Level filter
    if (levelFilter !== "all") {
      result = result.filter((s) => s.level === parseInt(levelFilter));
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((s) => s.status === statusFilter);
    }

    // Risk filter
    if (riskFilter !== "all") {
      result = result.filter((s) => s.risk === riskFilter);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "level":
          comparison = a.level - b.level;
          break;
        case "avgScore":
          comparison = a.avgScore - b.avgScore;
          break;
        case "streak":
          comparison = a.streak - b.streak;
          break;
        case "xp":
          comparison = a.xp - b.xp;
          break;
        case "status":
          comparison = a.status.localeCompare(b.status);
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [searchQuery, topicFilter, levelFilter, statusFilter, riskFilter, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE);
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const activeFilterCount = [
    topicFilter !== "all",
    levelFilter !== "all",
    statusFilter !== "all",
    riskFilter !== "all",
  ].filter(Boolean).length;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(paginatedStudents.map((s) => s.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedIds(newSet);
  };

  const clearFilters = () => {
    setTopicFilter("all");
    setLevelFilter("all");
    setStatusFilter("all");
    setRiskFilter("all");
    setSearchQuery("");
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };

  if (isLoading) {
    return <StudentsPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-accent-red font-mono text-xs font-semibold tracking-wider mb-1">
            // STUDENTS
          </p>
          <h1 className="text-2xl md:text-3xl font-[family-name:var(--font-syne)] font-bold text-text-primary">
            Manage Students
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Manage student accounts and monitor performance.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="border-border-custom hover:border-accent-red/50"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button className="bg-gradient-to-r from-accent-red to-orange-500 text-white hover:opacity-90">
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Student
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-surface-elevated border-border-custom"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={topicFilter} onValueChange={(v) => setTopicFilter(v as RadiologyTopic | "all")}>
            <SelectTrigger className="w-[130px] bg-surface-elevated border-border-custom">
              <SelectValue placeholder="Topic" />
            </SelectTrigger>
            <SelectContent className="bg-surface border-border-custom">
              <SelectItem value="all">All Topics</SelectItem>
              <SelectItem value="Chest">Chest</SelectItem>
              <SelectItem value="Neuro">Neuro</SelectItem>
              <SelectItem value="MSK">MSK</SelectItem>
              <SelectItem value="Abdominal">Abdominal</SelectItem>
              <SelectItem value="Cardiac">Cardiac</SelectItem>
              <SelectItem value="Paediatric">Paediatric</SelectItem>
            </SelectContent>
          </Select>

          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="w-[100px] bg-surface-elevated border-border-custom">
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent className="bg-surface border-border-custom">
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="1">L1</SelectItem>
              <SelectItem value="2">L2</SelectItem>
              <SelectItem value="3">L3</SelectItem>
              <SelectItem value="4">L4</SelectItem>
              <SelectItem value="5">L5</SelectItem>
              <SelectItem value="6">L6</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StudentStatus | "all")}>
            <SelectTrigger className="w-[120px] bg-surface-elevated border-border-custom">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-surface border-border-custom">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>

          <Select value={riskFilter} onValueChange={(v) => setRiskFilter(v as StudentRisk | "all")}>
            <SelectTrigger className="w-[120px] bg-surface-elevated border-border-custom">
              <SelectValue placeholder="Risk" />
            </SelectTrigger>
            <SelectContent className="bg-surface border-border-custom">
              <SelectItem value="all">All Risk</SelectItem>
              <SelectItem value="at-risk">At Risk</SelectItem>
              <SelectItem value="on-track">On Track</SelectItem>
              <SelectItem value="thriving">Thriving</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Active Filters Badge */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-text-secondary text-sm">
            {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""} active
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-accent-red hover:text-accent-red/80"
          >
            <X className="h-4 w-4 mr-1" />
            Clear All
          </Button>
        </div>
      )}

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.size}
        onMessage={() => console.log("Message all")}
        onExport={() => console.log("Export")}
        onDelete={() => {
          setSelectedIds(new Set());
        }}
      />

      {/* Table */}
      {filteredStudents.length > 0 ? (
        <div className="bg-surface-elevated/40 backdrop-blur-sm border border-border-custom rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-custom bg-surface/50">
                  <th className="p-4 w-12">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === paginatedStudents.length && paginatedStudents.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-border-custom"
                    />
                  </th>
                  <th className="p-4 text-left">
                    <button
                      onClick={() => handleSort("name")}
                      className="flex items-center gap-1 text-text-secondary text-xs font-semibold uppercase tracking-wider hover:text-text-primary"
                    >
                      Student <SortIcon field="name" />
                    </button>
                  </th>
                  <th className="p-4 text-left">
                    <button
                      onClick={() => handleSort("level")}
                      className="flex items-center gap-1 text-text-secondary text-xs font-semibold uppercase tracking-wider hover:text-text-primary"
                    >
                      Level <SortIcon field="level" />
                    </button>
                  </th>
                  <th className="p-4 text-left">
                    <button
                      onClick={() => handleSort("avgScore")}
                      className="flex items-center gap-1 text-text-secondary text-xs font-semibold uppercase tracking-wider hover:text-text-primary"
                    >
                      Avg Score <SortIcon field="avgScore" />
                    </button>
                  </th>
                  <th className="p-4 text-left">
                    <button
                      onClick={() => handleSort("streak")}
                      className="flex items-center gap-1 text-text-secondary text-xs font-semibold uppercase tracking-wider hover:text-text-primary"
                    >
                      Streak <SortIcon field="streak" />
                    </button>
                  </th>
                  <th className="p-4 text-left">
                    <button
                      onClick={() => handleSort("xp")}
                      className="flex items-center gap-1 text-text-secondary text-xs font-semibold uppercase tracking-wider hover:text-text-primary"
                    >
                      XP <SortIcon field="xp" />
                    </button>
                  </th>
                  <th className="p-4 text-left">
                    <button
                      onClick={() => handleSort("status")}
                      className="flex items-center gap-1 text-text-secondary text-xs font-semibold uppercase tracking-wider hover:text-text-primary"
                    >
                      Status <SortIcon field="status" />
                    </button>
                  </th>
                  <th className="p-4 text-left">
                    <span className="text-text-secondary text-xs font-semibold uppercase tracking-wider">
                      Actions
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedStudents.map((student) => (
                  <StudentTableRow
                    key={student.id}
                    student={student}
                    selected={selectedIds.has(student.id)}
                    onSelect={(checked) => handleSelectOne(student.id, checked)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-border-custom flex items-center justify-between">
            <span className="text-text-secondary text-sm">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredStudents.length)} of{" "}
              {filteredStudents.length} students
            </span>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  const page = i + 1;
                  return (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => setCurrentPage(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      ) : (
        <AdminEmptyState
          icon={Users}
          title="No students found"
          description="No results match your current filters."
          actionLabel="Clear Filters"
          onAction={clearFilters}
        />
      )}
    </div>
  );
}

export default function StudentsPage() {
  return (
    <Suspense fallback={<StudentsPageSkeleton />}>
      <StudentsPageContent />
    </Suspense>
  );
}
