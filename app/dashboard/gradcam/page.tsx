"use client";

import { useState } from "react";
import { Eye, Upload, Zap, Brain, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageUploadZone } from "@/components/dashboard/gradcam/ImageUploadZone";
import { GradCAMViewer } from "@/components/dashboard/gradcam/GradCAMViewer";
import { OverlayControls } from "@/components/dashboard/gradcam/OverlayControls";
import { AnalysisPanel } from "@/components/dashboard/gradcam/AnalysisPanel";
import { EvidencePanel } from "@/components/dashboard/gradcam/EvidencePanel";
import { cn } from "@/lib/utils";
import { uploadDocument } from "@/lib/api/documents";
import { analyzeVision } from "@/lib/api/vision";
import { toast } from "sonner";
import type { Citation } from "@/types/dashboard";

export default function GradCAMPage() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [heatmapUrl, setHeatmapUrl] = useState<string | null>(null);
  const [overlayOpacity, setOverlayOpacity] = useState(0.6);
  const [colormap, setColormap] = useState<"jet" | "viridis" | "hot">("jet");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [citations, setCitations] = useState<Citation[] | null>(null);
  const [prediction, setPrediction] = useState<{
    diagnosis: string;
    confidence: number;
    findings: string[];
    recommendations: string[];
  } | null>(null);

  const handleImageUpload = async (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setUploadedImage(result);
      setPrediction(null);
    };
    reader.readAsDataURL(file);

    setIsAnalyzing(true);
    try {
      const uploaded = await uploadDocument(file);
      const analysis = await analyzeVision({
        documentId: uploaded.id,
        question:
          "Provide key findings and a short differential. Keep it educational and include caveats.",
        includeTextEvidence: true,
        topK: 4,
      });

      setHeatmapUrl(analysis.heatmapDataUrl);
      setCitations(analysis.citations ?? null);
      const findings =
        analysis.vqaAnswer
          ?.split("\n")
          .map((line) => line.replace(/^[-*•]\s*/, "").trim())
          .filter(Boolean)
          .slice(0, 6) ?? [];

      setPrediction({
        diagnosis: analysis.caption || "Image caption",
        confidence: 0.65,
        findings: findings.length > 0 ? findings : ["No structured findings returned."],
        recommendations: [
          "Correlate with clinical history and prior imaging.",
          "Check positioning/rotation/exposure and ensure correct view.",
          "If uncertain, ask a more specific question in the Assistant Chat mode.",
        ],
      });
    } catch (error) {
      toast.error("Vision analysis failed. Please try again.");
      setCitations(null);
      setPrediction({
        diagnosis: "Analysis unavailable",
        confidence: 0.1,
        findings: ["Backend vision service returned an error."],
        recommendations: ["Try again, or switch to RAG mode in the AI Assistant."],
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClear = () => {
    setUploadedImage(null);
    setHeatmapUrl(null);
    setPrediction(null);
    setCitations(null);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-accent-cyan/20 to-accent-purple/20 border border-accent-cyan/30">
            <Eye className="h-6 w-6 text-accent-cyan" />
          </div>
          <h1 className="text-3xl md:text-4xl font-[family-name:var(--font-syne)] font-bold text-text-primary">
            GradCAM Overlay
          </h1>
        </div>
        <p className="text-text-secondary ml-11">
          Visualize AI model decision-making regions on medical images to understand what areas influence predictions
        </p>
      </div>

      {!uploadedImage ? (
        <>
          {/* Upload Section */}
          <div className="bg-surface-elevated/40 backdrop-blur-sm border border-accent-cyan/20 rounded-xl p-8 shadow-lg">
            <ImageUploadZone
              onImageUpload={handleImageUpload}
              isLoading={isAnalyzing}
            />
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* GradCAM Info */}
            <div className="bg-surface-elevated/40 backdrop-blur-sm border border-border-custom rounded-lg p-5 hover:border-accent-cyan/40 transition-all hover:shadow-[0_0_20px_rgba(0,194,255,0.1)]">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-accent-cyan/10">
                  <Zap className="h-5 w-5 text-accent-cyan" />
                </div>
                <div>
                  <h3 className="text-text-primary font-semibold text-sm mb-1">
                    What is GradCAM?
                  </h3>
                  <p className="text-text-secondary text-xs leading-relaxed">
                    Gradient-weighted Class Activation Mapping visualizes which regions influence AI predictions
                  </p>
                </div>
              </div>
            </div>

            {/* Supported Formats */}
            <div className="bg-surface-elevated/40 backdrop-blur-sm border border-border-custom rounded-lg p-5 hover:border-accent-green/40 transition-all hover:shadow-[0_0_20px_rgba(78,255,160,0.1)]">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-accent-green/10">
                  <Upload className="h-5 w-5 text-accent-green" />
                </div>
                <div>
                  <h3 className="text-text-primary font-semibold text-sm mb-1">
                    Supported Formats
                  </h3>
                  <p className="text-text-secondary text-xs leading-relaxed">
                    PNG, JPG, JPEG (max 50MB). DICOM support coming soon
                  </p>
                </div>
              </div>
            </div>

            {/* Learning Purpose */}
            <div className="bg-surface-elevated/40 backdrop-blur-sm border border-border-custom rounded-lg p-5 hover:border-accent-purple/40 transition-all hover:shadow-[0_0_20px_rgba(192,132,252,0.1)]">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-accent-purple/10">
                  <Brain className="h-5 w-5 text-accent-purple" />
                </div>
                <div>
                  <h3 className="text-text-primary font-semibold text-sm mb-1">
                    Educational Tool
                  </h3>
                  <p className="text-text-secondary text-xs leading-relaxed">
                    Learn AI interpretability and verify model reasoning on medical images
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Usage Tips */}
          <div className="bg-surface-elevated/40 backdrop-blur-sm border border-accent-amber/20 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-accent-amber mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-text-primary font-semibold text-sm mb-2">
                  Tips for Best Results
                </h3>
                <ul className="text-text-secondary text-sm space-y-1">
                  <li>• Upload clear, well-positioned X-ray images</li>
                  <li>• Adjust opacity slider to see both overlay and underlying image</li>
                  <li>• Try different colormaps for better visibility</li>
                  <li>• Compare model focus areas with actual diagnosis</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Active Analysis View */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Viewer */}
            <div className="lg:col-span-2 space-y-6">
              {/* Image Viewer Card */}
              <div className="bg-surface-elevated/40 backdrop-blur-sm border border-accent-cyan/20 rounded-xl p-6 shadow-lg overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                    <Eye className="h-5 w-5 text-accent-cyan" />
                    Image Analysis
                  </h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClear}
                    className="border-border-custom hover:border-accent-cyan/40 hover:bg-accent-cyan/5"
                  >
                    Clear
                  </Button>
                </div>

                <div className="relative bg-surface rounded-lg overflow-hidden border border-border-custom">
                  <GradCAMViewer
                    imageUrl={uploadedImage}
                    heatmapUrl={heatmapUrl}
                    overlayOpacity={overlayOpacity}
                    colormap={colormap}
                    isLoading={isAnalyzing}
                  />
                </div>
              </div>

              {/* Colormap Guide */}
              <div className="bg-surface-elevated/40 backdrop-blur-sm border border-border-custom rounded-xl p-6">
                <h3 className="text-text-primary font-semibold text-sm mb-4 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-accent-amber" />
                  Colormap Reference
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <div className="h-6 bg-gradient-to-r from-blue-600 to-red-600 rounded-md" />
                    <div>
                      <p className="text-text-primary text-xs font-semibold">Jet</p>
                      <p className="text-text-secondary text-xs">Cool to warm</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-6 bg-gradient-to-r from-purple-600 via-green-600 to-yellow-600 rounded-md" />
                    <div>
                      <p className="text-text-primary text-xs font-semibold">Viridis</p>
                      <p className="text-text-secondary text-xs">Perceptually uniform</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-6 bg-gradient-to-r from-black via-red-600 to-white rounded-md" />
                    <div>
                      <p className="text-text-primary text-xs font-semibold">Hot</p>
                      <p className="text-text-secondary text-xs">Black to white</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="space-y-6">
              {/* Overlay Controls */}
              <div className="bg-surface-elevated/40 backdrop-blur-sm border border-border-custom rounded-xl p-6">
                <h3 className="text-text-primary font-semibold text-sm mb-4">
                  Overlay Settings
                </h3>
                <OverlayControls
                  opacity={overlayOpacity}
                  onOpacityChange={setOverlayOpacity}
                  colormap={colormap}
                  onColormapChange={setColormap}
                />
              </div>

              {/* Analysis Results */}
              {prediction && (
                <div className="bg-surface-elevated/40 backdrop-blur-sm border border-accent-green/20 rounded-xl p-6 shadow-lg">
                  <h3 className="text-text-primary font-semibold text-sm mb-4 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-accent-green" />
                    AI Analysis Results
                  </h3>
                  <AnalysisPanel
                    prediction={prediction}
                    isAnalyzing={isAnalyzing}
                  />
                </div>
              )}

              <EvidencePanel citations={citations} />

              {isAnalyzing && (
                <div className="bg-surface-elevated/40 backdrop-blur-sm border border-accent-purple/20 rounded-xl p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-accent-purple rounded-full animate-pulse" />
                    <p className="text-text-secondary text-sm">
                      Analyzing image...
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
