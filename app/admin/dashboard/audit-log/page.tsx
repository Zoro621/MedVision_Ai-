"use client";

import { useState, useMemo } from "react";
import { 
  Shield, 
  Search, 
  Filter, 
  Download, 
  Calendar,
  User,
  FileText,
  Settings,
  LogIn,
  LogOut,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// Mock audit log data
const MOCK_AUDIT_LOGS = [
  {
    id: "log_001",
    timestamp: "2024-02-15T14:32:00Z",
    actor: { id: "admin_001", name: "Dr. Sarah Chen", role: "admin" },
    action: "user.login",
    category: "authentication",
    severity: "info",
    target: null,
    ipAddress: "192.168.1.100",
    userAgent: "Chrome/121.0 (Windows NT 10.0)",
    details: { method: "password", mfa: true },
    success: true,
  },
  {
    id: "log_002",
    timestamp: "2024-02-15T14:28:00Z",
    actor: { id: "admin_001", name: "Dr. Sarah Chen", role: "admin" },
    action: "content.create",
    category: "content",
    severity: "info",
    target: { type: "quiz", id: "quiz_045", name: "Chest X-ray Advanced" },
    ipAddress: "192.168.1.100",
    userAgent: "Chrome/121.0 (Windows NT 10.0)",
    details: { questions: 15, difficulty: "hard" },
    success: true,
  },
  {
    id: "log_003",
    timestamp: "2024-02-15T14:15:00Z",
    actor: { id: "usr_023", name: "James Wilson", role: "student" },
    action: "user.login_failed",
    category: "authentication",
    severity: "warning",
    target: null,
    ipAddress: "10.0.0.55",
    userAgent: "Safari/17.0 (iPhone)",
    details: { reason: "invalid_password", attempts: 3 },
    success: false,
  },
  {
    id: "log_004",
    timestamp: "2024-02-15T13:45:00Z",
    actor: { id: "admin_002", name: "Admin System", role: "system" },
    action: "system.backup",
    category: "system",
    severity: "info",
    target: { type: "database", id: "db_main", name: "Main Database" },
    ipAddress: "127.0.0.1",
    userAgent: "System/Automated",
    details: { size: "2.4GB", duration: "45s" },
    success: true,
  },
  {
    id: "log_005",
    timestamp: "2024-02-15T13:30:00Z",
    actor: { id: "admin_001", name: "Dr. Sarah Chen", role: "admin" },
    action: "user.suspend",
    category: "user_management",
    severity: "warning",
    target: { type: "user", id: "usr_089", name: "Test Account" },
    ipAddress: "192.168.1.100",
    userAgent: "Chrome/121.0 (Windows NT 10.0)",
    details: { reason: "Policy violation", duration: "7 days" },
    success: true,
  },
  {
    id: "log_006",
    timestamp: "2024-02-15T12:00:00Z",
    actor: { id: "admin_001", name: "Dr. Sarah Chen", role: "admin" },
    action: "settings.update",
    category: "settings",
    severity: "info",
    target: { type: "setting", id: "email_notifications", name: "Email Notifications" },
    ipAddress: "192.168.1.100",
    userAgent: "Chrome/121.0 (Windows NT 10.0)",
    details: { old: "enabled", new: "disabled" },
    success: true,
  },
  {
    id: "log_007",
    timestamp: "2024-02-15T11:30:00Z",
    actor: { id: "system", name: "Security Monitor", role: "system" },
    action: "security.alert",
    category: "security",
    severity: "critical",
    target: { type: "ip", id: "45.33.32.156", name: "Suspicious IP" },
    ipAddress: "45.33.32.156",
    userAgent: "Unknown",
    details: { type: "brute_force", attempts: 50, blocked: true },
    success: true,
  },
  {
    id: "log_008",
    timestamp: "2024-02-15T10:15:00Z",
    actor: { id: "usr_045", name: "Emily Davis", role: "student" },
    action: "content.access",
    category: "content",
    severity: "info",
    target: { type: "quiz", id: "quiz_012", name: "Neuro Basics" },
    ipAddress: "172.16.0.88",
    userAgent: "Firefox/122.0 (macOS)",
    details: { score: 85, duration: "12m" },
    success: true,
  },
];

const ACTION_ICONS: Record<string, typeof User> = {
  "user.login": LogIn,
  "user.logout": LogOut,
  "user.login_failed": XCircle,
  "user.suspend": AlertTriangle,
  "content.create": FileText,
  "content.update": FileText,
  "content.delete": FileText,
  "content.access": Eye,
  "settings.update": Settings,
  "system.backup": Shield,
  "security.alert": AlertTriangle,
};

const SEVERITY_CONFIG = {
  info: { color: "text-accent-cyan", bg: "bg-accent-cyan/10", border: "border-accent-cyan/30" },
  warning: { color: "text-accent-amber", bg: "bg-accent-amber/10", border: "border-accent-amber/30" },
  critical: { color: "text-accent-red", bg: "bg-accent-red/10", border: "border-accent-red/30" },
};

const CATEGORY_OPTIONS = [
  { value: "all", label: "All Categories" },
  { value: "authentication", label: "Authentication" },
  { value: "content", label: "Content" },
  { value: "user_management", label: "User Management" },
  { value: "settings", label: "Settings" },
  { value: "system", label: "System" },
  { value: "security", label: "Security" },
];

const SEVERITY_OPTIONS = [
  { value: "all", label: "All Severities" },
  { value: "info", label: "Info" },
  { value: "warning", label: "Warning" },
  { value: "critical", label: "Critical" },
];

export default function AuditLogPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [dateRange, setDateRange] = useState("7d");
  const [selectedLog, setSelectedLog] = useState<typeof MOCK_AUDIT_LOGS[0] | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredLogs = useMemo(() => {
    return MOCK_AUDIT_LOGS.filter((log) => {
      const matchesSearch =
        searchQuery === "" ||
        log.actor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.target?.name?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = categoryFilter === "all" || log.category === categoryFilter;
      const matchesSeverity = severityFilter === "all" || log.severity === severityFilter;

      return matchesSearch && matchesCategory && matchesSeverity;
    });
  }, [searchQuery, categoryFilter, severityFilter]);

  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      time: date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    };
  };

  const formatAction = (action: string) => {
    return action.split(".").map(part => 
      part.charAt(0).toUpperCase() + part.slice(1).replace(/_/g, " ")
    ).join(" - ");
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-accent-red/20 to-accent-amber/20 border border-accent-red/30">
              <Shield className="h-6 w-6 text-accent-red" />
            </div>
            <h1 className="text-3xl font-[family-name:var(--font-syne)] font-bold text-text-primary">
              Audit Log
            </h1>
          </div>
          <p className="text-text-secondary">
            Track all system activities and security events
          </p>
        </div>

        <Button
          variant="outline"
          className="border-border-custom hover:border-accent-red/40"
        >
          <Download className="h-4 w-4 mr-2" />
          Export Logs
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-surface-elevated/40 backdrop-blur-sm border border-border-custom rounded-xl p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
            <Input
              placeholder="Search by actor, action, or target..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-surface border-border-custom"
            />
          </div>

          {/* Category Filter */}
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full lg:w-48 bg-surface border-border-custom">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Severity Filter */}
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-full lg:w-40 bg-surface border-border-custom">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              {SEVERITY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date Range */}
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-full lg:w-36 bg-surface border-border-custom">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface-elevated/40 backdrop-blur-sm border border-border-custom rounded-lg p-4">
          <p className="text-text-secondary text-xs uppercase tracking-wider mb-1">Total Events</p>
          <p className="text-2xl font-bold text-text-primary">{filteredLogs.length}</p>
        </div>
        <div className="bg-surface-elevated/40 backdrop-blur-sm border border-accent-cyan/20 rounded-lg p-4">
          <p className="text-text-secondary text-xs uppercase tracking-wider mb-1">Info</p>
          <p className="text-2xl font-bold text-accent-cyan">
            {filteredLogs.filter(l => l.severity === "info").length}
          </p>
        </div>
        <div className="bg-surface-elevated/40 backdrop-blur-sm border border-accent-amber/20 rounded-lg p-4">
          <p className="text-text-secondary text-xs uppercase tracking-wider mb-1">Warnings</p>
          <p className="text-2xl font-bold text-accent-amber">
            {filteredLogs.filter(l => l.severity === "warning").length}
          </p>
        </div>
        <div className="bg-surface-elevated/40 backdrop-blur-sm border border-accent-red/20 rounded-lg p-4">
          <p className="text-text-secondary text-xs uppercase tracking-wider mb-1">Critical</p>
          <p className="text-2xl font-bold text-accent-red">
            {filteredLogs.filter(l => l.severity === "critical").length}
          </p>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-surface-elevated/40 backdrop-blur-sm border border-border-custom rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-custom bg-surface/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Actor
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Action
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Target
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Severity
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Status
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-custom">
              {paginatedLogs.map((log) => {
                const { date, time } = formatTimestamp(log.timestamp);
                const ActionIcon = ACTION_ICONS[log.action] || FileText;
                const severityConfig = SEVERITY_CONFIG[log.severity as keyof typeof SEVERITY_CONFIG];

                return (
                  <tr 
                    key={log.id} 
                    className="hover:bg-surface/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedLog(log)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-text-secondary" />
                        <div>
                          <p className="text-text-primary text-sm font-medium">{time}</p>
                          <p className="text-text-secondary text-xs">{date}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold",
                          log.actor.role === "admin" 
                            ? "bg-accent-red/10 text-accent-red"
                            : log.actor.role === "system"
                              ? "bg-accent-purple/10 text-accent-purple"
                              : "bg-accent-cyan/10 text-accent-cyan"
                        )}>
                          {log.actor.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-text-primary text-sm font-medium">{log.actor.name}</p>
                          <p className="text-text-secondary text-xs capitalize">{log.actor.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ActionIcon className="h-4 w-4 text-text-secondary" />
                        <span className="text-text-primary text-sm">{formatAction(log.action)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {log.target ? (
                        <span className="text-text-secondary text-sm">{log.target.name}</span>
                      ) : (
                        <span className="text-text-secondary/50 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={cn(
                        "capitalize text-xs",
                        severityConfig.bg,
                        severityConfig.color,
                        severityConfig.border,
                        "border"
                      )}>
                        {log.severity}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {log.success ? (
                        <div className="flex items-center gap-1 text-accent-green">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-xs">Success</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-accent-red">
                          <XCircle className="h-4 w-4" />
                          <span className="text-xs">Failed</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedLog(log)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="h-4 w-4 mr-2" />
                            Export Entry
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border-custom">
          <p className="text-text-secondary text-sm">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredLogs.length)} of {filteredLogs.length} entries
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="border-border-custom"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-text-secondary text-sm px-2">
              Page {currentPage} of {totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="border-border-custom"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Log Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="bg-surface-elevated border-border-custom max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-text-primary flex items-center gap-2">
              <Shield className="h-5 w-5 text-accent-red" />
              Audit Log Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedLog && (
            <div className="space-y-6 mt-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-text-secondary text-xs uppercase tracking-wider mb-1">Timestamp</p>
                  <p className="text-text-primary">{new Date(selectedLog.timestamp).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-text-secondary text-xs uppercase tracking-wider mb-1">Event ID</p>
                  <p className="text-text-primary font-mono text-sm">{selectedLog.id}</p>
                </div>
              </div>

              {/* Actor */}
              <div className="bg-surface/50 rounded-lg p-4 border border-border-custom">
                <p className="text-text-secondary text-xs uppercase tracking-wider mb-2">Actor</p>
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold",
                    selectedLog.actor.role === "admin" 
                      ? "bg-accent-red/10 text-accent-red"
                      : selectedLog.actor.role === "system"
                        ? "bg-accent-purple/10 text-accent-purple"
                        : "bg-accent-cyan/10 text-accent-cyan"
                  )}>
                    {selectedLog.actor.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-text-primary font-medium">{selectedLog.actor.name}</p>
                    <p className="text-text-secondary text-sm capitalize">{selectedLog.actor.role} ({selectedLog.actor.id})</p>
                  </div>
                </div>
              </div>

              {/* Action & Target */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-text-secondary text-xs uppercase tracking-wider mb-1">Action</p>
                  <p className="text-text-primary">{formatAction(selectedLog.action)}</p>
                </div>
                <div>
                  <p className="text-text-secondary text-xs uppercase tracking-wider mb-1">Category</p>
                  <p className="text-text-primary capitalize">{selectedLog.category.replace(/_/g, " ")}</p>
                </div>
              </div>

              {selectedLog.target && (
                <div className="bg-surface/50 rounded-lg p-4 border border-border-custom">
                  <p className="text-text-secondary text-xs uppercase tracking-wider mb-2">Target</p>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-text-secondary text-xs">Type</p>
                      <p className="text-text-primary capitalize">{selectedLog.target.type}</p>
                    </div>
                    <div>
                      <p className="text-text-secondary text-xs">ID</p>
                      <p className="text-text-primary font-mono text-sm">{selectedLog.target.id}</p>
                    </div>
                    <div>
                      <p className="text-text-secondary text-xs">Name</p>
                      <p className="text-text-primary">{selectedLog.target.name}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Technical Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-text-secondary text-xs uppercase tracking-wider mb-1">IP Address</p>
                  <p className="text-text-primary font-mono text-sm">{selectedLog.ipAddress}</p>
                </div>
                <div>
                  <p className="text-text-secondary text-xs uppercase tracking-wider mb-1">User Agent</p>
                  <p className="text-text-primary text-sm truncate">{selectedLog.userAgent}</p>
                </div>
              </div>

              {/* Additional Details */}
              <div>
                <p className="text-text-secondary text-xs uppercase tracking-wider mb-2">Additional Details</p>
                <pre className="bg-surface rounded-lg p-4 border border-border-custom text-text-secondary text-xs overflow-x-auto">
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between pt-4 border-t border-border-custom">
                <div className="flex items-center gap-2">
                  <Badge className={cn(
                    "capitalize",
                    SEVERITY_CONFIG[selectedLog.severity as keyof typeof SEVERITY_CONFIG].bg,
                    SEVERITY_CONFIG[selectedLog.severity as keyof typeof SEVERITY_CONFIG].color,
                    SEVERITY_CONFIG[selectedLog.severity as keyof typeof SEVERITY_CONFIG].border,
                    "border"
                  )}>
                    {selectedLog.severity}
                  </Badge>
                  {selectedLog.success ? (
                    <Badge className="bg-accent-green/10 text-accent-green border border-accent-green/30">
                      Success
                    </Badge>
                  ) : (
                    <Badge className="bg-accent-red/10 text-accent-red border border-accent-red/30">
                      Failed
                    </Badge>
                  )}
                </div>
                <Button variant="outline" className="border-border-custom">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
