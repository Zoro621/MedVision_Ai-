"use client";

/**
 * Admin Review (Human-in-the-Loop) page.
 *
 * Three views in one shell:
 *   1. Queue — recent assistant + vision traces.
 *   2. Trace inspector — full detail for a selected trace.
 *   3. Corrections — pending / applied / rejected corrections list with
 *      review actions.
 *
 * Wires to /api/admin/corrections/* (see lib/api/adminCorrections.ts).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ClipboardCheck,
  ChevronLeft,
  ChevronRight,
  Eye,
  Search,
  Filter,
  Download,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Image as ImageIcon,
  Pencil,
  Loader2,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  type AdminCorrection,
  type CorrectionStatus,
  type CorrectionTargetKind,
  type TraceDetail,
  type TraceQueueItem,
  exportCorrectionsJsonlUrl,
  getCorrectionQueue,
  getTraceDetail,
  listCorrections,
  reviewCorrection,
  submitCorrection,
} from "@/lib/api/adminCorrections";

const STATUS_STYLES: Record<CorrectionStatus, string> = {
  pending: "bg-accent-amber/10 text-accent-amber border border-accent-amber/30",
  applied: "bg-accent-green/10 text-accent-green border border-accent-green/30",
  rejected: "bg-accent-red/10 text-accent-red border border-accent-red/30",
};

function formatDateTime(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

// ── Highlight: simple "claim chip" extractor ─────────────────────────────
//
// Splits the answer into sentences and treats anything containing a numeric
// value, an "is/are" clause, or a citation marker [n] as a "claim". This
// is a pragmatic heuristic — the goal is just to give the admin visual
// guideposts when scanning long answers.
function splitClaims(answer: string): { text: string; isClaim: boolean }[] {
  if (!answer) return [];
  const parts = answer.split(/(?<=[.!?])\s+/);
  return parts.map((p) => {
    const isClaim =
      /\d/.test(p) || /\[\d+\]/.test(p) || /\b(is|are|was|were|shows?|indicates?)\b/i.test(p);
    return { text: p, isClaim };
  });
}

// ── Page ─────────────────────────────────────────────────────────────────

export default function AdminReviewPage() {
  const [tab, setTab] = useState<"queue" | "corrections">("queue");

  return (
    <div className="space-y-6">
      <PageHeader />

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="bg-surface-elevated/40 border border-border-custom">
          <TabsTrigger value="queue">Trace Queue</TabsTrigger>
          <TabsTrigger value="corrections">Corrections</TabsTrigger>
        </TabsList>
        <TabsContent value="queue" className="mt-6">
          <QueueView />
        </TabsContent>
        <TabsContent value="corrections" className="mt-6">
          <CorrectionsView />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PageHeader() {
  const handleExport = () => {
    window.open(exportCorrectionsJsonlUrl("applied"), "_blank");
  };
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-accent-cyan/20 to-accent-green/20 border border-accent-cyan/30">
            <ClipboardCheck className="h-6 w-6 text-accent-cyan" />
          </div>
          <h1 className="text-3xl font-[family-name:var(--font-syne)] font-bold text-text-primary">
            Review &amp; Corrections
          </h1>
        </div>
        <p className="text-text-secondary">
          Human-in-the-loop oversight of AI assistant and vision outputs. Submit
          authoritative corrections, then have a second admin apply them.
        </p>
      </div>
      <Button
        variant="outline"
        className="border-border-custom hover:border-accent-cyan/40"
        onClick={handleExport}
      >
        <Download className="h-4 w-4 mr-2" />
        Export Applied (JSONL)
      </Button>
    </div>
  );
}

// ── Queue view ───────────────────────────────────────────────────────────

function QueueView() {
  const [items, setItems] = useState<TraceQueueItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [loading, setLoading] = useState(true);
  const [targetKind, setTargetKind] = useState<"all" | CorrectionTargetKind>("all");
  const [onlyUncorrected, setOnlyUncorrected] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<TraceQueueItem | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCorrectionQueue({
        targetKind: targetKind === "all" ? undefined : targetKind,
        onlyUncorrected,
        page,
        pageSize,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (err) {
      toast.error((err as Error).message ?? "Failed to load queue");
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [targetKind, onlyUncorrected, page]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const filtered = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter(
      (i) =>
        i.question_preview?.toLowerCase().includes(q) ||
        i.answer_preview?.toLowerCase().includes(q) ||
        i.user_email?.toLowerCase().includes(q)
    );
  }, [items, search]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-3 md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
          <Input
            placeholder="Search question, answer, or user email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-surface border-border-custom"
          />
        </div>
        <Select
          value={targetKind}
          onValueChange={(v) => {
            setPage(1);
            setTargetKind(v as typeof targetKind);
          }}
        >
          <SelectTrigger className="w-[180px] border-border-custom">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Traces</SelectItem>
            <SelectItem value="assistant">Assistant (RAG)</SelectItem>
            <SelectItem value="vision">Vision (Image)</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant={onlyUncorrected ? "default" : "outline"}
          className={cn(
            "border-border-custom",
            onlyUncorrected && "bg-accent-cyan text-black hover:bg-accent-cyan/90"
          )}
          onClick={() => {
            setPage(1);
            setOnlyUncorrected((v) => !v);
          }}
        >
          {onlyUncorrected ? "Showing uncorrected" : "Only uncorrected"}
        </Button>
      </div>

      <div className="bg-surface-elevated/40 backdrop-blur-sm border border-border-custom rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-custom bg-surface/50">
                <Th>Type</Th>
                <Th>User</Th>
                <Th>Question</Th>
                <Th>Answer</Th>
                <Th>Time</Th>
                <Th className="text-right">Action</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-custom">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-text-secondary">
                    <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
                    Loading traces…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-text-secondary">
                    No traces match the current filters.
                  </td>
                </tr>
              ) : (
                filtered.map((it) => (
                  <tr
                    key={`${it.target_kind}:${it.trace_id}`}
                    className="hover:bg-surface/50 transition-colors cursor-pointer"
                    onClick={() => setSelected(it)}
                  >
                    <td className="px-4 py-3">
                      <Badge
                        className={cn(
                          "border",
                          it.target_kind === "assistant"
                            ? "bg-accent-cyan/10 text-accent-cyan border-accent-cyan/30"
                            : "bg-accent-amber/10 text-accent-amber border-accent-amber/30"
                        )}
                      >
                        {it.target_kind === "assistant" ? (
                          <MessageSquare className="h-3 w-3 mr-1" />
                        ) : (
                          <ImageIcon className="h-3 w-3 mr-1" />
                        )}
                        {it.target_kind}
                      </Badge>
                      {it.has_existing_correction && (
                        <Badge className="ml-2 bg-accent-green/10 text-accent-green border border-accent-green/30">
                          corrected
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-primary max-w-[14rem] truncate">
                      {it.user_name || it.user_email || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-primary max-w-[20rem] truncate">
                      {it.question_preview || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary max-w-[24rem] truncate">
                      {it.answer_preview || "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-text-secondary whitespace-nowrap">
                      {formatDateTime(it.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelected(it);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Inspect
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-border-custom">
          <p className="text-text-secondary text-sm">
            {total > 0
              ? `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`
              : "No entries"}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="border-border-custom"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-text-secondary text-sm px-2">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="border-border-custom"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <TraceInspectorDialog
        item={selected}
        onClose={() => setSelected(null)}
        onCorrected={() => {
          setSelected(null);
          void reload();
        }}
      />
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        "text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider",
        className
      )}
    >
      {children}
    </th>
  );
}

// ── Trace inspector dialog (with correction form) ────────────────────────

function TraceInspectorDialog({
  item,
  onClose,
  onCorrected,
}: {
  item: TraceQueueItem | null;
  onClose: () => void;
  onCorrected: () => void;
}) {
  const [detail, setDetail] = useState<TraceDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [correctedText, setCorrectedText] = useState("");
  const [rationale, setRationale] = useState("");
  const [conceptTagsRaw, setConceptTagsRaw] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!item) {
      setDetail(null);
      setEditing(false);
      return;
    }
    setLoading(true);
    setEditing(false);
    getTraceDetail(item.target_kind, item.trace_id)
      .then((d) => {
        setDetail(d);
        setCorrectedText(d.existing_correction?.corrected_text ?? d.answer ?? "");
        setRationale(d.existing_correction?.rationale ?? "");
        setConceptTagsRaw((d.existing_correction?.concept_tags ?? []).join(", "));
      })
      .catch((err) => toast.error((err as Error).message ?? "Failed to load trace"))
      .finally(() => setLoading(false));
  }, [item]);

  const handleSubmit = async () => {
    if (!item || !correctedText.trim()) {
      toast.error("Corrected text cannot be empty.");
      return;
    }
    setSubmitting(true);
    try {
      await submitCorrection({
        target_kind: item.target_kind,
        assistant_trace_id:
          item.target_kind === "assistant" ? item.trace_id : undefined,
        vision_trace_id:
          item.target_kind === "vision" ? item.trace_id : undefined,
        corrected_text: correctedText.trim(),
        rationale: rationale.trim() || undefined,
        concept_tags: conceptTagsRaw
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      });
      toast.success("Correction submitted. Awaiting second-admin review.");
      onCorrected();
    } catch (err) {
      toast.error((err as Error).message ?? "Failed to submit correction");
    } finally {
      setSubmitting(false);
    }
  };

  const claims = useMemo(
    () => (detail ? splitClaims(detail.answer) : []),
    [detail]
  );

  return (
    <Dialog open={!!item} onOpenChange={(o) => (!o ? onClose() : null)}>
      <DialogContent className="bg-surface-elevated border-border-custom max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-text-primary flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-accent-cyan" />
            Trace Inspector
          </DialogTitle>
          <DialogDescription className="text-text-secondary">
            {item?.target_kind === "assistant"
              ? "Assistant RAG trace — review the answer, agent steps, and citations before submitting a correction."
              : "Vision trace — review the AI caption / VQA answer alongside the image and heatmap."}
          </DialogDescription>
        </DialogHeader>

        {loading || !detail ? (
          <div className="py-12 text-center text-text-secondary">
            <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
            Loading trace…
          </div>
        ) : (
          <div className="space-y-6 mt-2">
            <div className="grid md:grid-cols-3 gap-3 text-sm">
              <Meta label="User" value={detail.user_name || "—"} />
              <Meta label="Created" value={formatDateTime(detail.created_at)} />
              <Meta
                label="Confidence"
                value={
                  detail.confidence != null
                    ? `${(detail.confidence * 100).toFixed(0)}%`
                    : "—"
                }
              />
            </div>

            {detail.question && (
              <Section title="Question">
                <p className="text-text-primary whitespace-pre-wrap">
                  {detail.question}
                </p>
              </Section>
            )}

            {detail.target_kind === "vision" && (detail.image_url || detail.heatmap_url) && (
              <Section title="Image &amp; Heatmap">
                <div className="grid md:grid-cols-2 gap-3">
                  {detail.image_url && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={detail.image_url}
                      alt="trace image"
                      className="rounded-lg border border-border-custom max-h-80 object-contain bg-black/40"
                    />
                  )}
                  {detail.heatmap_url && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={detail.heatmap_url}
                      alt="heatmap"
                      className="rounded-lg border border-border-custom max-h-80 object-contain bg-black/40"
                    />
                  )}
                </div>
              </Section>
            )}

            <Section title="AI Answer (claim-highlighted)">
              <div className="bg-surface rounded-lg p-4 border border-border-custom text-text-primary leading-relaxed">
                {claims.length === 0 ? (
                  <span className="text-text-secondary">{detail.answer}</span>
                ) : (
                  claims.map((c, idx) => (
                    <span
                      key={idx}
                      className={cn(
                        "mr-1",
                        c.isClaim &&
                          "underline decoration-accent-amber/60 decoration-2 underline-offset-2"
                      )}
                    >
                      {c.text}{" "}
                    </span>
                  ))
                )}
              </div>
            </Section>

            {detail.citations.length > 0 && (
              <Section title="Citations">
                <ul className="space-y-2">
                  {detail.citations.map((c, idx) => (
                    <li
                      key={idx}
                      className="bg-surface rounded-lg p-3 border border-border-custom"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-text-primary text-sm font-medium">
                          [{idx + 1}] {c.document_title || c.document_id || "Unknown"}{" "}
                          {c.page != null && (
                            <span className="text-text-secondary">· p.{c.page}</span>
                          )}
                        </span>
                        {c.score != null && (
                          <span className="text-xs text-text-secondary">
                            score {c.score.toFixed(3)}
                          </span>
                        )}
                      </div>
                      {c.snippet && (
                        <p className="text-text-secondary text-sm mt-1">{c.snippet}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {detail.agent_steps.length > 0 && (
              <Section title="Agent Trace">
                <div className="space-y-2">
                  {detail.agent_steps.map((s) => (
                    <details
                      key={s.step_index}
                      className="bg-surface rounded-lg border border-border-custom"
                    >
                      <summary className="px-3 py-2 cursor-pointer text-sm text-text-primary flex items-center gap-2">
                        <Badge className="bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/30">
                          {s.step_index}
                        </Badge>
                        <span className="font-medium">{s.step_type}</span>
                        {s.elapsed_ms != null && (
                          <span className="text-text-secondary text-xs ml-auto">
                            {s.elapsed_ms} ms
                          </span>
                        )}
                      </summary>
                      <div className="px-3 pb-3 grid md:grid-cols-2 gap-2">
                        <pre className="bg-surface-elevated rounded p-2 text-xs text-text-secondary overflow-x-auto max-h-60">
                          {JSON.stringify(s.input_json, null, 2)}
                        </pre>
                        <pre className="bg-surface-elevated rounded p-2 text-xs text-text-secondary overflow-x-auto max-h-60">
                          {JSON.stringify(s.output_json, null, 2)}
                        </pre>
                      </div>
                    </details>
                  ))}
                </div>
              </Section>
            )}

            {detail.existing_correction && (
              <Section title="Existing Correction">
                <CorrectionCard correction={detail.existing_correction} compact />
              </Section>
            )}

            <Section
              title={editing ? "Submit Correction" : "Correction"}
              actions={
                !editing ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-accent-cyan/40"
                    onClick={() => setEditing(true)}
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    {detail.existing_correction
                      ? "Submit revised correction"
                      : "Submit correction"}
                  </Button>
                ) : null
              }
            >
              {editing ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-text-secondary text-xs uppercase tracking-wider">
                      Corrected answer
                    </label>
                    <Textarea
                      value={correctedText}
                      onChange={(e) => setCorrectedText(e.target.value)}
                      rows={6}
                      className="bg-surface border-border-custom mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-text-secondary text-xs uppercase tracking-wider">
                      Rationale (admin-only)
                    </label>
                    <Textarea
                      value={rationale}
                      onChange={(e) => setRationale(e.target.value)}
                      rows={3}
                      placeholder="Why is the original answer wrong / incomplete?"
                      className="bg-surface border-border-custom mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-text-secondary text-xs uppercase tracking-wider">
                      Concept tags (comma-separated)
                    </label>
                    <Input
                      value={conceptTagsRaw}
                      onChange={(e) => setConceptTagsRaw(e.target.value)}
                      placeholder="pneumothorax, cardiac_silhouette"
                      className="bg-surface border-border-custom mt-1"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setEditing(false)}
                      disabled={submitting}
                      className="border-border-custom"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="bg-accent-cyan text-black hover:bg-accent-cyan/90"
                    >
                      {submitting ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                      )}
                      Submit for review
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-text-secondary text-sm">
                  Click <strong className="text-text-primary">Submit correction</strong>{" "}
                  to capture an authoritative answer for this trace. A second
                  admin must apply it before it is surfaced back to the user.
                </p>
              )}
            </Section>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-border-custom">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface rounded-lg p-3 border border-border-custom">
      <p className="text-text-secondary text-xs uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className="text-text-primary text-sm">{value}</p>
    </div>
  );
}

function Section({
  title,
  children,
  actions,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-text-primary text-sm font-semibold uppercase tracking-wider">
          {title}
        </h3>
        {actions}
      </div>
      {children}
    </section>
  );
}

// ── Corrections list view (review queue) ─────────────────────────────────

function CorrectionsView() {
  const [statusFilter, setStatusFilter] = useState<"all" | CorrectionStatus>("pending");
  const [kindFilter, setKindFilter] = useState<"all" | CorrectionTargetKind>("all");
  const [items, setItems] = useState<AdminCorrection[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<AdminCorrection | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listCorrections({
        status: statusFilter === "all" ? undefined : statusFilter,
        targetKind: kindFilter === "all" ? undefined : kindFilter,
        page,
        pageSize,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (err) {
      toast.error((err as Error).message ?? "Failed to load corrections");
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, kindFilter, page]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setPage(1);
            setStatusFilter(v as typeof statusFilter);
          }}
        >
          <SelectTrigger className="w-[180px] border-border-custom">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="applied">Applied</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={kindFilter}
          onValueChange={(v) => {
            setPage(1);
            setKindFilter(v as typeof kindFilter);
          }}
        >
          <SelectTrigger className="w-[200px] border-border-custom">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Targets</SelectItem>
            <SelectItem value="assistant">Assistant (RAG)</SelectItem>
            <SelectItem value="vision">Vision (Image)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-surface-elevated/40 backdrop-blur-sm border border-border-custom rounded-xl overflow-hidden">
        {loading ? (
          <div className="px-4 py-12 text-center text-text-secondary">
            <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
            Loading corrections…
          </div>
        ) : items.length === 0 ? (
          <div className="px-4 py-12 text-center text-text-secondary">
            No corrections match the filters.
          </div>
        ) : (
          <ul className="divide-y divide-border-custom">
            {items.map((c) => (
              <li
                key={c.id}
                className="px-4 py-3 hover:bg-surface/50 cursor-pointer"
                onClick={() => setActive(c)}
              >
                <CorrectionCard correction={c} />
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center justify-between px-4 py-3 border-t border-border-custom">
          <p className="text-text-secondary text-sm">
            {total > 0
              ? `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`
              : "No entries"}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="border-border-custom"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-text-secondary text-sm px-2">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="border-border-custom"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <ReviewDialog
        correction={active}
        onClose={() => setActive(null)}
        onReviewed={() => {
          setActive(null);
          void reload();
        }}
      />
    </div>
  );
}

function CorrectionCard({
  correction,
  compact = false,
}: {
  correction: AdminCorrection;
  compact?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge className={STATUS_STYLES[correction.status]}>
          {correction.status === "pending" && (
            <AlertTriangle className="h-3 w-3 mr-1" />
          )}
          {correction.status === "applied" && (
            <CheckCircle2 className="h-3 w-3 mr-1" />
          )}
          {correction.status === "rejected" && (
            <XCircle className="h-3 w-3 mr-1" />
          )}
          {correction.status}
        </Badge>
        <Badge
          className={cn(
            "border",
            correction.target_kind === "assistant"
              ? "bg-accent-cyan/10 text-accent-cyan border-accent-cyan/30"
              : "bg-accent-amber/10 text-accent-amber border-accent-amber/30"
          )}
        >
          {correction.target_kind}
        </Badge>
        <span className="text-text-secondary text-xs">
          by {correction.admin_name || "—"} · {formatDateTime(correction.created_at)}
        </span>
        {correction.reviewed_by_name && (
          <span className="text-text-secondary text-xs">
            · reviewed by {correction.reviewed_by_name}
          </span>
        )}
      </div>
      {!compact && correction.original_text && (
        <p className="text-text-secondary text-sm line-through opacity-70 line-clamp-2">
          {correction.original_text}
        </p>
      )}
      <p className="text-text-primary text-sm line-clamp-3">
        {correction.corrected_text}
      </p>
      {correction.concept_tags && correction.concept_tags.length > 0 && (
        <div className="flex items-center flex-wrap gap-1">
          {correction.concept_tags.map((t) => (
            <Badge
              key={t}
              className="bg-surface text-text-secondary border border-border-custom"
            >
              <Tag className="h-3 w-3 mr-1" />
              {t}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewDialog({
  correction,
  onClose,
  onReviewed,
}: {
  correction: AdminCorrection | null;
  onClose: () => void;
  onReviewed: () => void;
}) {
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setNotes(correction?.review_notes ?? "");
  }, [correction]);

  const decide = async (decision: "apply" | "reject") => {
    if (!correction) return;
    setSubmitting(true);
    try {
      await reviewCorrection(correction.id, {
        decision,
        review_notes: notes.trim() || undefined,
      });
      toast.success(
        decision === "apply" ? "Correction applied." : "Correction rejected."
      );
      onReviewed();
    } catch (err) {
      toast.error((err as Error).message ?? "Failed to review correction");
    } finally {
      setSubmitting(false);
    }
  };

  const isPending = correction?.status === "pending";

  return (
    <Dialog open={!!correction} onOpenChange={(o) => (!o ? onClose() : null)}>
      <DialogContent className="bg-surface-elevated border-border-custom max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-text-primary flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-accent-cyan" />
            Correction Detail
          </DialogTitle>
          <DialogDescription className="text-text-secondary">
            {isPending
              ? "Review the proposed correction. Apply only if a different admin authored it."
              : "This correction has been finalized."}
          </DialogDescription>
        </DialogHeader>

        {correction && (
          <div className="space-y-4 mt-2">
            <CorrectionCard correction={correction} />

            {correction.original_text && (
              <Section title="Original AI Output">
                <p className="bg-surface rounded-lg p-3 border border-border-custom text-text-secondary text-sm whitespace-pre-wrap">
                  {correction.original_text}
                </p>
              </Section>
            )}
            <Section title="Corrected Output">
              <p className="bg-surface rounded-lg p-3 border border-accent-green/30 text-text-primary text-sm whitespace-pre-wrap">
                {correction.corrected_text}
              </p>
            </Section>
            {correction.rationale && (
              <Section title="Rationale">
                <p className="bg-surface rounded-lg p-3 border border-border-custom text-text-secondary text-sm whitespace-pre-wrap">
                  {correction.rationale}
                </p>
              </Section>
            )}

            <Section title={isPending ? "Review Notes" : "Final Notes"}>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={!isPending}
                rows={3}
                placeholder="Optional notes for the audit log."
                className="bg-surface border-border-custom"
              />
            </Section>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="border-border-custom">
            Close
          </Button>
          {isPending && (
            <>
              <Button
                variant="outline"
                onClick={() => decide("reject")}
                disabled={submitting}
                className="border-accent-red/40 text-accent-red hover:bg-accent-red/10"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button
                onClick={() => decide("apply")}
                disabled={submitting}
                className="bg-accent-green text-black hover:bg-accent-green/90"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Apply
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
