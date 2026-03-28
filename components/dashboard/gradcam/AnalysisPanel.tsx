"use client";

import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Info, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnalysisPanelProps {
  prediction?: {
    diagnosis: string;
    confidence: number;
    findings: string[];
    recommendations: string[];
  };
  isAnalyzing?: boolean;
}

export function AnalysisPanel({ prediction, isAnalyzing }: AnalysisPanelProps) {
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "from-accent-green to-accent-cyan";
    if (confidence >= 0.6) return "from-accent-amber to-accent-cyan";
    return "from-accent-red to-accent-amber";
  };

  return (
    <div className="space-y-4">
      {!prediction && !isAnalyzing && (
        <div className="flex items-start gap-3 p-4 bg-surface-elevated/40 rounded-lg border border-accent-cyan/20 backdrop-blur-sm">
          <Info className="h-5 w-5 text-accent-cyan shrink-0 mt-0.5" />
          <p className="text-text-secondary text-sm">
            Upload an image to see AI analysis results
          </p>
        </div>
      )}

      {isAnalyzing && (
        <div className="flex items-center gap-3 p-4 bg-surface-elevated/40 rounded-lg border border-accent-purple/20 backdrop-blur-sm">
          <div className="w-2 h-2 bg-accent-purple rounded-full animate-pulse" />
          <p className="text-text-secondary text-sm">Analyzing image...</p>
        </div>
      )}

      {prediction && (
        <div className="space-y-5">
          {/* Diagnosis */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-text-secondary text-xs font-semibold uppercase tracking-wider">
                Primary Diagnosis
              </span>
              <Badge className={cn(
                "bg-gradient-to-r text-white border-0 text-xs",
                prediction.confidence >= 0.8 ? "from-accent-green to-accent-cyan" :
                prediction.confidence >= 0.6 ? "from-accent-amber to-accent-cyan" :
                "from-accent-red to-accent-amber"
              )}>
                {Math.round(prediction.confidence * 100)}% confident
              </Badge>
            </div>
            <p className="text-text-primary font-[family-name:var(--font-syne)] font-bold text-lg leading-tight">
              {prediction.diagnosis}
            </p>
          </div>

          {/* Findings */}
          <div>
            <h4 className="text-text-primary text-sm font-semibold mb-2 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-accent-green" />
              Key Findings
            </h4>
            <div className="space-y-2">
              {prediction.findings.map((finding, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-surface-elevated/40 rounded-lg border border-border-custom/50 hover:border-accent-green/30 transition-all">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent-green mt-1.5 flex-shrink-0" />
                  <p className="text-text-secondary text-sm">{finding}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <div>
            <h4 className="text-text-primary text-sm font-semibold mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-accent-amber" />
              Recommendations
            </h4>
            <div className="space-y-2">
              {prediction.recommendations.map((rec, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-surface-elevated/40 rounded-lg border border-border-custom/50 hover:border-accent-amber/30 transition-all">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent-amber mt-1.5 flex-shrink-0" />
                  <p className="text-text-secondary text-sm">{rec}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Confidence Meter */}
          <div className="pt-4 border-t border-border-custom/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-text-secondary text-xs font-semibold uppercase tracking-wider">
                Model Confidence
              </span>
              <span className="text-accent-cyan font-mono text-sm">
                {Math.round(prediction.confidence * 100)}%
              </span>
            </div>
            <div className="w-full bg-surface-elevated/60 rounded-full h-2 overflow-hidden border border-border-custom/50">
              <div
                className={cn(
                  "h-full bg-gradient-to-r transition-all duration-500",
                  getConfidenceColor(prediction.confidence)
                )}
                style={{ width: `${prediction.confidence * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
