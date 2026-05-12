"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Brain,
  Eye,
  Upload,
  ChevronDown,
  ChevronUp,
  Layers,
  Zap,
  Network,
  Link2,
  Info,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDocuments } from "@/hooks/useDocuments";
import {
  analyzeVision,
  getLimeExplanation,
  getShapExplanation,
  getAttentionVisualization,
  type VisionAnalyzeResponse,
  type LimeResult,
  type ShapResult,
  type AttentionResult,
} from "@/lib/api/vision";

// ── Tab types ─────────────────────────────────────────────────────────────────

type ExplainTab = "gradcam" | "lime" | "shap" | "attention";

const VISION_STATE_STORAGE_KEY = "medvision_gradcam_state_v1";

type PersistedVisionState = {
  selectedDocumentId: string;
  activeTab: ExplainTab;
  question: string;
  analyzeResult: VisionAnalyzeResponse | null;
};

const TABS: { id: ExplainTab; label: string; icon: typeof Brain; color: string }[] = [
  { id: "gradcam", label: "GradCAM++",  icon: Brain,   color: "text-accent-red" },
  { id: "lime",    label: "LIME",       icon: Layers,  color: "text-accent-cyan" },
  { id: "shap",    label: "SHAP",       icon: Zap,     color: "text-accent-amber" },
  { id: "attention",label: "Attention", icon: Network, color: "text-accent-purple" },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function GradcamPage() {
  const { documents } = useDocuments();
  const imageDocuments = documents.filter(
    (d) => d.type === "image" || d.type === "dicom"
  );

  const [selectedDocumentId, setSelectedDocumentId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<ExplainTab>("gradcam");
  const [question, setQuestion] = useState(
    "What are the key radiological findings in this image?"
  );

  // Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeResult, setAnalyzeResult] = useState<VisionAnalyzeResponse | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  // Per-tab lazy-load state
  const [isLoadingLime, setIsLoadingLime] = useState(false);
  const [limeResult, setLimeResult] = useState<LimeResult | null>(null);
  const [limeError, setLimError] = useState<string | null>(null);
  const [hasRequestedLime, setHasRequestedLime] = useState(false);

  const [isLoadingShap, setIsLoadingShap] = useState(false);
  const [shapResult, setShapResult] = useState<ShapResult | null>(null);
  const [shapError, setShapError] = useState<string | null>(null);
  const [hasRequestedShap, setHasRequestedShap] = useState(false);

  const [isLoadingAttn, setIsLoadingAttn] = useState(false);
  const [attnResult, setAttnResult] = useState<AttentionResult | null>(null);
  const [attnError, setAttnError] = useState<string | null>(null);
  const [hasRequestedAttn, setHasRequestedAttn] = useState(false);

  const [expandedLink, setExpandedLink] = useState<string | null>(null);

  // Restore the last analyzed state after refresh.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(VISION_STATE_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as PersistedVisionState;
      if (parsed.selectedDocumentId) setSelectedDocumentId(parsed.selectedDocumentId);
      if (parsed.question) setQuestion(parsed.question);
      if (parsed.activeTab) setActiveTab(parsed.activeTab);
      if (parsed.analyzeResult) setAnalyzeResult(parsed.analyzeResult);
    } catch {
      // Ignore corrupted or oversized state payloads.
    }
  }, []);

  // Persist key view state so refresh doesn't clear GradCAM results.
  useEffect(() => {
    const payload: PersistedVisionState = {
      selectedDocumentId,
      activeTab,
      question,
      analyzeResult,
    };
    try {
      localStorage.setItem(VISION_STATE_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Storage can fail on quota limits; keep the page functional.
    }
  }, [selectedDocumentId, activeTab, question, analyzeResult]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleAnalyze = useCallback(async () => {
    if (!selectedDocumentId) return;
    setIsAnalyzing(true);
    setAnalyzeError(null);
    setLimeResult(null);
    setShapResult(null);
    setAttnResult(null);
    setHasRequestedLime(false);
    setHasRequestedShap(false);
    setHasRequestedAttn(false);
    setLimError(null);
    setShapError(null);
    setAttnError(null);
    try {
      const res = await analyzeVision({
        documentId: selectedDocumentId,
        question,
        includeTextEvidence: true,
        topK: 4,
        // Keep initial analyze fast (GradCAM + caption + VQA).
        // LIME is loaded lazily when the LIME tab is opened.
        includeLime: false,
        includeShap: false,
        includeAttention: false,
      });
      setAnalyzeResult(res);
      setLimeResult(res.lime ?? null);
      setHasRequestedLime(Boolean(res.lime));
      setActiveTab("gradcam");
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedDocumentId, question]);

  const loadLime = useCallback(async () => {
    if (!selectedDocumentId || isLoadingLime) return;
    setHasRequestedLime(true);
    setIsLoadingLime(true);
    setLimError(null);
    try {
      const res = await getLimeExplanation(selectedDocumentId, question);
      setLimeResult(res);
    } catch (err) {
      setLimError(err instanceof Error ? err.message : "LIME failed.");
    } finally {
      setIsLoadingLime(false);
    }
  }, [selectedDocumentId, question, isLoadingLime]);

  const loadShap = useCallback(async () => {
    if (!selectedDocumentId || isLoadingShap) return;
    setHasRequestedShap(true);
    setIsLoadingShap(true);
    setShapError(null);
    try {
      const res = await getShapExplanation(selectedDocumentId);
      setShapResult(res);
    } catch (err) {
      setShapError(err instanceof Error ? err.message : "SHAP failed.");
    } finally {
      setIsLoadingShap(false);
    }
  }, [selectedDocumentId, isLoadingShap]);

  const loadAttention = useCallback(async () => {
    if (!selectedDocumentId || isLoadingAttn) return;
    setHasRequestedAttn(true);
    setIsLoadingAttn(true);
    setAttnError(null);
    try {
      const res = await getAttentionVisualization(selectedDocumentId, question);
      setAttnResult(res);
    } catch (err) {
      setAttnError(err instanceof Error ? err.message : "Attention viz failed.");
    } finally {
      setIsLoadingAttn(false);
    }
  }, [selectedDocumentId, question, isLoadingAttn]);

  const handleTabClick = (tab: ExplainTab) => {
    setActiveTab(tab);
    if (!analyzeResult) return;
    if (tab === "lime" && !limeResult && !isLoadingLime) loadLime();
    if (tab === "shap" && !shapResult && !isLoadingShap) loadShap();
    if (tab === "attention" && !attnResult && !isLoadingAttn) loadAttention();
  };

  // ── Render helpers ───────────────────────────────────────────────────────────

  const selectedDocument = imageDocuments.find((d) => d.id === selectedDocumentId);
  const hasResult = !!analyzeResult;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="font-mono text-xs font-semibold tracking-wider text-accent-red mb-1">
          // EXPLAINABILITY
        </p>
        <h1 className="text-2xl md:text-3xl font-[family-name:var(--font-syne)] font-bold text-text-primary">
          AI Explainability Suite
        </h1>
        <p className="text-text-secondary text-sm mt-1">
          GradCAM++ · LIME · SHAP · Cross-Modal Attention — understand what the AI sees
        </p>
      </div>

      {/* Control Panel */}
      <div className="bg-surface-elevated/40 backdrop-blur-sm border border-border-custom rounded-xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Document selector */}
          <div className="flex-1">
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Select Image / DICOM Document
            </label>
            <select
              value={selectedDocumentId}
              onChange={(e) => setSelectedDocumentId(e.target.value)}
              className="w-full rounded-lg bg-surface border border-border-custom text-text-primary px-3 py-2 text-sm focus:outline-none focus:border-accent-red/60"
            >
              <option value="">— choose a document —</option>
              {imageDocuments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.type})
                </option>
              ))}
            </select>
          </div>

          {/* Question */}
          <div className="flex-1">
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Clinical Question (used for VQA + LIME + Attention)
            </label>
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="E.g. What findings suggest pneumonia?"
              className="bg-surface border-border-custom text-text-primary"
            />
          </div>

          {/* Analyze button */}
          <div className="flex items-end">
            <Button
              onClick={handleAnalyze}
              disabled={!selectedDocumentId || isAnalyzing}
              className="bg-gradient-to-r from-accent-red to-orange-500 text-white hover:opacity-90 px-6 whitespace-nowrap"
            >
              {isAnalyzing ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Brain className="h-4 w-4 mr-2" />
              )}
              {isAnalyzing ? "Analyzing…" : "Run Analysis"}
            </Button>
          </div>
        </div>

        {analyzeError && (
          <div className="flex items-center gap-2 rounded-lg bg-accent-red/10 border border-accent-red/30 px-4 py-2 text-sm text-accent-red">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {analyzeError}
          </div>
        )}
      </div>

      {/* Results */}
      {hasResult && (
        <div className="space-y-4">
          {/* Tab bar */}
          <div className="flex gap-2 flex-wrap">
            {TABS.map(({ id, label, icon: Icon, color }) => (
              <button
                key={id}
                onClick={() => handleTabClick(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === id
                    ? "bg-surface-elevated border border-accent-red/50 text-text-primary shadow-sm"
                    : "bg-surface-elevated/40 border border-border-custom text-text-secondary hover:text-text-primary hover:border-border-custom/80"
                }`}
              >
                <Icon className={`h-4 w-4 ${activeTab === id ? color : ""}`} />
                {label}
                {id === "lime" && isLoadingLime && (
                  <RefreshCw className="h-3 w-3 animate-spin ml-1 text-accent-cyan" />
                )}
                {id === "shap" && isLoadingShap && (
                  <RefreshCw className="h-3 w-3 animate-spin ml-1 text-accent-amber" />
                )}
                {id === "attention" && isLoadingAttn && (
                  <RefreshCw className="h-3 w-3 animate-spin ml-1 text-accent-purple" />
                )}
              </button>
            ))}
          </div>

          {/* ── GradCAM++ Tab ────────────────────────────────────────────────── */}
          {activeTab === "gradcam" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Overlay image */}
              <div className="bg-surface-elevated/40 border border-border-custom rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Brain className="h-5 w-5 text-accent-red" />
                  <h3 className="font-medium text-text-primary">GradCAM++ Overlay</h3>
                  <span className="ml-auto text-xs text-text-secondary bg-surface px-2 py-0.5 rounded-full border border-border-custom">
                    {analyzeResult.gradcamMethod}
                  </span>
                </div>
                <img
                  src={analyzeResult.overlayDataUrl || analyzeResult.heatmapDataUrl}
                  alt="GradCAM++ overlay"
                  className="w-full rounded-lg object-contain max-h-80"
                />
                <p className="text-xs text-text-secondary mt-2">
                  Jet-colourmap activation overlay — red = highest attention
                </p>
              </div>

              {/* Caption + VQA */}
              <div className="space-y-4">
                {/* Caption */}
                <div className="bg-surface-elevated/40 border border-border-custom rounded-xl p-5">
                  <h3 className="font-medium text-text-primary mb-2 flex items-center gap-2">
                    <Eye className="h-4 w-4 text-accent-cyan" /> AI Caption
                  </h3>
                  <p className="text-text-secondary text-sm leading-relaxed">
                    {analyzeResult.caption}
                  </p>
                </div>

                {/* VQA answer */}
                {analyzeResult.vqaAnswer && (
                  <div className="bg-surface-elevated/40 border border-border-custom rounded-xl p-5">
                    <h3 className="font-medium text-text-primary mb-2 flex items-center gap-2">
                      <Zap className="h-4 w-4 text-accent-amber" /> VQA Answer
                    </h3>
                    <p className="text-text-secondary text-sm leading-relaxed whitespace-pre-line">
                      {analyzeResult.vqaAnswer}
                    </p>
                  </div>
                )}

                {/* High-activation regions */}
                {analyzeResult.regionBboxes && analyzeResult.regionBboxes.length > 0 && (
                  <div className="bg-surface-elevated/40 border border-border-custom rounded-xl p-5">
                    <h3 className="font-medium text-text-primary mb-3 flex items-center gap-2">
                      <Info className="h-4 w-4 text-accent-red" /> High-Activation Regions
                    </h3>
                    <div className="space-y-2">
                      {analyzeResult.regionBboxes.slice(0, 5).map((r, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between text-sm py-1 border-b border-border-custom/40 last:border-0"
                        >
                          <span className="text-text-secondary">Region {i + 1}</span>
                          <span className="text-text-primary font-mono text-xs">
                            ({r.x}, {r.y}) {r.w}×{r.h}px
                          </span>
                          <span className="text-accent-red text-xs font-semibold">
                            {Math.round((r as any).intensity * 100)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Citations */}
              {analyzeResult.citations && analyzeResult.citations.length > 0 && (
                <div className="lg:col-span-2 bg-surface-elevated/40 border border-border-custom rounded-xl p-5">
                  <h3 className="font-medium text-text-primary mb-3 flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-accent-cyan" /> Textbook Evidence
                  </h3>
                  <div className="space-y-2">
                    {analyzeResult.citations.map((c, i) => (
                      <div key={i} className="text-sm bg-surface/50 rounded-lg p-3 border border-border-custom/60">
                        <p className="text-accent-cyan font-medium">[{i + 1}] {c.documentName} — p{c.page}</p>
                        <p className="text-text-secondary mt-1 text-xs leading-relaxed">{c.snippet}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── LIME Tab ─────────────────────────────────────────────────────── */}
          {activeTab === "lime" && (
            <div className="space-y-4">
              {isLoadingLime ? (
                <LoadingCard color="text-accent-cyan" label="Running LIME (perturbing superpixels…)" />
              ) : limeError ? (
                <ErrorCard message={limeError} onRetry={loadLime} />
              ) : !limeResult ? (
                <PlaceholderCard
                  icon={Layers}
                  color="text-accent-cyan"
                  label={
                    hasRequestedLime
                      ? "LIME finished without a usable explanation. Retry to run it again."
                      : "Open this tab to generate a LIME explanation for the current analysis."
                  }
                />
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-surface-elevated/40 border border-border-custom rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-text-primary flex items-center gap-2">
                        <Layers className="h-5 w-5 text-accent-cyan" /> LIME Superpixel Map
                      </h3>
                      <span className="text-xs text-text-secondary bg-surface px-2 py-0.5 rounded-full border border-border-custom">
                        {limeResult.numSamples} samples · {limeResult.method}
                      </span>
                    </div>
                    <img
                      src={limeResult.overlayDataUrl}
                      alt="LIME overlay"
                      className="w-full rounded-lg object-contain max-h-80"
                    />
                    <p className="text-xs text-text-secondary mt-2">
                      Green = positive influence · Red = negative influence
                    </p>
                  </div>

                  <div className="bg-surface-elevated/40 border border-border-custom rounded-xl p-5">
                    <h3 className="font-medium text-text-primary mb-3">Top Superpixels</h3>
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {limeResult.superpixels.slice(0, 15).map((sp) => (
                        <div
                          key={sp.id}
                          className="flex items-center justify-between text-sm py-1.5 border-b border-border-custom/40 last:border-0"
                        >
                          <span className="text-text-secondary">SP #{sp.id}</span>
                          <div className="w-24 h-2 bg-surface rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${sp.positive ? "bg-accent-green" : "bg-accent-red"}`}
                              style={{ width: `${Math.abs(sp.importance) * 100}%` }}
                            />
                          </div>
                          <span className={`text-xs font-semibold ${sp.positive ? "text-accent-green" : "text-accent-red"}`}>
                            {sp.positive ? "+" : ""}{sp.importance.toFixed(3)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── SHAP Tab ─────────────────────────────────────────────────────── */}
          {activeTab === "shap" && (
            <div className="space-y-4">
              {isLoadingShap ? (
                <LoadingCard color="text-accent-amber" label="Computing SHAP values…" />
              ) : shapError ? (
                <ErrorCard message={shapError} onRetry={loadShap} />
              ) : !shapResult ? (
                <PlaceholderCard
                  icon={Zap}
                  color="text-accent-amber"
                  label={
                    hasRequestedShap
                      ? "SHAP finished without a usable explanation. Retry to run it again."
                      : "Open this tab to generate a SHAP explanation for the current analysis."
                  }
                />
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-surface-elevated/40 border border-border-custom rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-text-primary flex items-center gap-2">
                        <Zap className="h-5 w-5 text-accent-amber" /> SHAP Attribution Map
                      </h3>
                      <span className="text-xs text-text-secondary bg-surface px-2 py-0.5 rounded-full border border-border-custom">
                        {shapResult.method}
                      </span>
                    </div>
                    <img
                      src={shapResult.overlayDataUrl}
                      alt="SHAP overlay"
                      className="w-full rounded-lg object-contain max-h-80"
                    />
                    <p className="text-xs text-text-secondary mt-2">
                      Red = positive SHAP (promotes prediction) · Blue = negative SHAP
                    </p>
                  </div>

                  <div className="bg-surface-elevated/40 border border-border-custom rounded-xl p-5 space-y-4">
                    <h3 className="font-medium text-text-primary">Explanation</h3>
                    <p className="text-text-secondary text-sm leading-relaxed">
                      {shapResult.explanation}
                    </p>

                    <h4 className="font-medium text-text-primary text-sm mt-4">Top Pixel Patches</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {shapResult.topPixels.slice(0, 10).map((p, i) => (
                        <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-border-custom/40 last:border-0">
                          <span className="text-text-secondary">
                            ({p.x}, {p.y}) {p.w}×{p.h}
                          </span>
                          <div className={`text-xs font-semibold ${p.value > 0 ? "text-accent-red" : "text-accent-cyan"}`}>
                            {p.value > 0 ? "+" : ""}{p.value.toFixed(3)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Attention Tab ─────────────────────────────────────────────────── */}
          {activeTab === "attention" && (
            <div className="space-y-4">
              {isLoadingAttn ? (
                <LoadingCard color="text-accent-purple" label="Building cross-modal attention maps…" />
              ) : attnError ? (
                <ErrorCard message={attnError} onRetry={loadAttention} />
              ) : !attnResult ? (
                <PlaceholderCard
                  icon={Network}
                  color="text-accent-purple"
                  label={
                    hasRequestedAttn
                      ? "Attention analysis finished without any linkable output. Retry to run it again."
                      : "Open this tab to generate the cross-modal attention view."
                  }
                />
              ) : (
                <div className="space-y-6">
                  {/* Token heatmaps */}
                  {attnResult.tokenHeatmaps.length > 0 && (
                    <div className="bg-surface-elevated/40 border border-border-custom rounded-xl p-5">
                      <h3 className="font-medium text-text-primary mb-4 flex items-center gap-2">
                        <Network className="h-5 w-5 text-accent-purple" /> Cross-Modal Attention ({attnResult.method})
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {attnResult.tokenHeatmaps.map((t) => (
                          <div key={t.token} className="space-y-2">
                            <img
                              src={t.heatmapDataUrl}
                              alt={`Attention: ${t.token}`}
                              className="w-full rounded-lg aspect-square object-cover"
                            />
                            <p className="text-xs text-center text-text-secondary truncate" title={t.token}>
                              {t.token}
                            </p>
                            <div className="text-center text-xs font-semibold text-accent-purple">
                              {(t.importance * 100).toFixed(0)}%
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Explanation links */}
                  {attnResult.explanationLinks.length > 0 && (
                    <div className="bg-surface-elevated/40 border border-border-custom rounded-xl p-5">
                      <h3 className="font-medium text-text-primary mb-4 flex items-center gap-2">
                        <Link2 className="h-5 w-5 text-accent-cyan" /> Region → Textbook Links
                      </h3>
                      <div className="space-y-3">
                        {attnResult.explanationLinks.map((link) => (
                          <div
                            key={link.chunkId}
                            className="bg-surface/50 rounded-lg border border-border-custom/60 overflow-hidden"
                          >
                            <button
                              className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface/80 transition-colors"
                              onClick={() =>
                                setExpandedLink(
                                  expandedLink === link.chunkId ? null : link.chunkId
                                )
                              }
                            >
                              <div className="flex items-center gap-3 text-left">
                                <div className="w-2 h-2 rounded-full bg-accent-red shrink-0" />
                                <div>
                                  <p className="text-sm font-medium text-text-primary">
                                    {link.regionLabel}
                                  </p>
                                  <p className="text-xs text-accent-cyan">{link.citation}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-text-secondary">
                                  {(link.similarity * 100).toFixed(0)}% match
                                </span>
                                {expandedLink === link.chunkId ? (
                                  <ChevronUp className="h-4 w-4 text-text-secondary" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-text-secondary" />
                                )}
                              </div>
                            </button>
                            {expandedLink === link.chunkId && (
                              <div className="px-4 pb-4 border-t border-border-custom/40">
                                <p className="text-sm text-text-secondary leading-relaxed mt-3">
                                  {link.chunkSnippet}
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!hasResult && !isAnalyzing && (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent-red/20 to-accent-amber/20 flex items-center justify-center">
            <Brain className="h-10 w-10 text-accent-red" />
          </div>
          <h2 className="text-xl font-semibold text-text-primary">
            Select an image document to start
          </h2>
          <p className="text-text-secondary max-w-md">
            Upload a chest X-ray, DICOM file, or any medical image — then click{" "}
            <strong>Run Analysis</strong> to get GradCAM++ heatmaps, LIME superpixels,
            SHAP attributions, and cross-modal attention in one click.
          </p>
          {imageDocuments.length === 0 && (
            <p className="text-xs text-accent-amber">
              No image documents found. Upload one in the Assistant tab first.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function LoadingCard({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-4 bg-surface-elevated/40 border border-border-custom rounded-xl">
      <RefreshCw className={`h-10 w-10 animate-spin ${color}`} />
      <p className="text-text-secondary text-sm">{label}</p>
    </div>
  );
}

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4 bg-surface-elevated/40 border border-accent-red/30 rounded-xl">
      <AlertCircle className="h-8 w-8 text-accent-red" />
      <p className="text-accent-red text-sm">{message}</p>
      <Button variant="outline" onClick={onRetry} className="border-border-custom">
        <RefreshCw className="h-4 w-4 mr-2" /> Retry
      </Button>
    </div>
  );
}

function PlaceholderCard({ icon: Icon, color, label }: { icon: typeof Brain; color: string; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-3 bg-surface-elevated/40 border border-border-custom rounded-xl">
      <Icon className={`h-10 w-10 ${color}`} />
      <p className="text-text-secondary text-sm">{label}</p>
    </div>
  );
}
