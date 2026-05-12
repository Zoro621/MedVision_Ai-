"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Shield,
  Search,
  Download,
  Clock,
  LogIn,
  LogOut,
  FileText,
  Settings,
  AlertTriangle,
  CheckCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  User,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { getAuditLog, type AuditLogEntry } from "@/lib/api/adminOperations";

const ACTION_ICONS: Record<string, typeof User> = {
  "auth.login": LogIn,
  "auth.logout": LogOut,
  "auth.login_failed": XCircle,
  "user.suspend": AlertTriangle,
  "document.upload": FileText,
  "document.delete": FileText,
  "quiz.generate": FileText,
  "settings.update": Settings,
  "admin.action": Shield,
};

export default function AuditLogPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const itemsPerPage = 15;

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await getAuditLog({ page: currentPage, pageSize: itemsPerPage });
        setAuditLogs(res.items ?? []);
        setTotalLogs(res.total ?? 0);
      } catch {
        setAuditLogs([]);
        setTotalLogs(0);
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [currentPage]);

  const filteredLogs = useMemo(() => {
    if (!searchQuery) return auditLogs;
    const q = searchQuery.toLowerCase();
    return auditLogs.filter(
      (l) =>
        l.userEmail?.toLowerCase().includes(q) ||
        l.action?.toLowerCase().includes(q) ||
        l.resource?.toLowerCase().includes(q)
    );
  }, [auditLogs, searchQuery]);

  const totalPages = Math.ceil(totalLogs / itemsPerPage);

  const formatTimestamp = (ts: string) => {
    const d = new Date(ts);
    return {
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      time: d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
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
          <p className="text-text-secondary">Track all system activities and security events</p>
        </div>
        <Button variant="outline" className="border-border-custom hover:border-accent-red/40">
          <Download className="h-4 w-4 mr-2" />
          Export Logs
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface-elevated/40 backdrop-blur-sm border border-border-custom rounded-lg p-4">
          <p className="text-text-secondary text-xs uppercase tracking-wider mb-1">Total Events</p>
          <p className="text-2xl font-bold text-text-primary">{totalLogs}</p>
        </div>
        <div className="bg-surface-elevated/40 backdrop-blur-sm border border-accent-cyan/20 rounded-lg p-4">
          <p className="text-text-secondary text-xs uppercase tracking-wider mb-1">This Page</p>
          <p className="text-2xl font-bold text-accent-cyan">{filteredLogs.length}</p>
        </div>
        <div className="bg-surface-elevated/40 backdrop-blur-sm border border-accent-amber/20 rounded-lg p-4">
          <p className="text-text-secondary text-xs uppercase tracking-wider mb-1">Page</p>
          <p className="text-2xl font-bold text-accent-amber">{currentPage}</p>
        </div>
        <div className="bg-surface-elevated/40 backdrop-blur-sm border border-accent-green/20 rounded-lg p-4">
          <p className="text-text-secondary text-xs uppercase tracking-wider mb-1">Total Pages</p>
          <p className="text-2xl font-bold text-accent-green">{totalPages || 1}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-surface-elevated/40 backdrop-blur-sm border border-border-custom rounded-xl p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
          <Input
            placeholder="Search by email, action, or resource…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-surface border-border-custom"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-elevated/40 backdrop-blur-sm border border-border-custom rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-custom bg-surface/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Timestamp</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">User</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Action</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Resource</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-custom">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-text-secondary">
                    Loading audit log…
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-text-secondary">
                    No audit log entries found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const { date, time } = formatTimestamp(log.createdAt);
                  const ActionIcon = ACTION_ICONS[log.action] || FileText;
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
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold bg-accent-cyan/10 text-accent-cyan">
                            {(log.userEmail || "??").slice(0, 2).toUpperCase()}
                          </div>
                          <p className="text-text-primary text-sm font-medium">{log.userEmail}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <ActionIcon className="h-4 w-4 text-text-secondary" />
                          <span className="text-text-primary text-sm">{log.action}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-text-secondary text-sm">{log.resource || "—"}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => { e.stopPropagation(); setSelectedLog(log); }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border-custom">
          <p className="text-text-secondary text-sm">
            {totalLogs > 0
              ? `Showing ${(currentPage - 1) * itemsPerPage + 1}–${Math.min(currentPage * itemsPerPage, totalLogs)} of ${totalLogs} entries`
              : "No entries"}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="border-border-custom"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="bg-surface-elevated border-border-custom max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-text-primary flex items-center gap-2">
              <Shield className="h-5 w-5 text-accent-red" />
              Audit Log Details
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-text-secondary text-xs uppercase tracking-wider mb-1">Timestamp</p>
                  <p className="text-text-primary">{new Date(selectedLog.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-text-secondary text-xs uppercase tracking-wider mb-1">Event ID</p>
                  <p className="text-text-primary font-mono text-sm">{selectedLog.id}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-text-secondary text-xs uppercase tracking-wider mb-1">User</p>
                  <p className="text-text-primary">{selectedLog.userEmail}</p>
                </div>
                <div>
                  <p className="text-text-secondary text-xs uppercase tracking-wider mb-1">Action</p>
                  <p className="text-text-primary">{selectedLog.action}</p>
                </div>
              </div>
              {selectedLog.resource && (
                <div>
                  <p className="text-text-secondary text-xs uppercase tracking-wider mb-1">Resource</p>
                  <p className="text-text-primary">{selectedLog.resource}</p>
                </div>
              )}
              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div>
                  <p className="text-text-secondary text-xs uppercase tracking-wider mb-2">Metadata</p>
                  <pre className="bg-surface rounded-lg p-4 border border-border-custom text-text-secondary text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
              <div className="flex items-center gap-2 pt-4 border-t border-border-custom">
                <Badge className="bg-accent-green/10 text-accent-green border border-accent-green/30">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Recorded
                </Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
