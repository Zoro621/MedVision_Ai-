"use client";

import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface OverlayControlsProps {
  opacity: number;
  onOpacityChange: (value: number) => void;
  colormap: "jet" | "viridis" | "hot";
  onColormapChange: (colormap: "jet" | "viridis" | "hot") => void;
}

export function OverlayControls({
  opacity,
  onOpacityChange,
  colormap,
  onColormapChange,
}: OverlayControlsProps) {
  const COLORMAP_INFO = {
    jet: "Cool to warm gradient for intuitive visualization",
    viridis: "Perceptually uniform, colorblind friendly",
    hot: "Black to white through red for clarity",
  };

  return (
    <div className="space-y-5">
      {/* Opacity Control */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-text-primary text-sm font-semibold">
            Overlay Opacity
          </label>
          <span className="text-accent-cyan font-mono text-sm bg-surface/50 px-2 py-1 rounded">
            {Math.round(opacity * 100)}%
          </span>
        </div>
        <Slider
          value={[opacity]}
          onValueChange={(v) => onOpacityChange(v[0])}
          min={0}
          max={1}
          step={0.01}
          className="w-full"
        />
        <p className="text-text-secondary text-xs mt-2">
          Adjust transparency to see both overlay and image details
        </p>
      </div>

      {/* Colormap Selection */}
      <div>
        <label className="block text-text-primary text-sm font-semibold mb-3">
          Color Map
        </label>
        <div className="grid grid-cols-3 gap-2">
          {["jet", "viridis", "hot"].map((cm) => (
            <button
              key={cm}
              onClick={() => onColormapChange(cm as "jet" | "viridis" | "hot")}
              className={cn(
                "py-2 px-3 rounded-lg font-medium text-xs uppercase tracking-wide transition-all border",
                colormap === cm
                  ? "bg-accent-cyan text-background border-accent-cyan shadow-lg shadow-accent-cyan/20"
                  : "bg-surface-elevated/40 text-text-primary border-border-custom hover:border-accent-cyan/40 hover:bg-surface-elevated/60"
              )}
            >
              {cm}
            </button>
          ))}
        </div>
        <p className="text-text-secondary text-xs mt-2">
          {COLORMAP_INFO[colormap]}
        </p>
      </div>

      {/* Usage Guide */}
      <div className="pt-4 border-t border-border-custom/50">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-4 w-4 text-accent-amber" />
          <h4 className="text-text-primary text-sm font-semibold">Quick Guide</h4>
        </div>
        <ul className="text-text-secondary text-xs space-y-1.5">
          <li className="flex items-start gap-2">
            <span className="text-accent-cyan mt-0.5">•</span>
            <span>Red/bright areas = model focus regions</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent-cyan mt-0.5">•</span>
            <span>Increase opacity to emphasize overlay</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent-cyan mt-0.5">•</span>
            <span>Compare with actual diagnosis</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
