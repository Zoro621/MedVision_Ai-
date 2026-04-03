"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";

interface GradCAMViewerProps {
  imageUrl: string;
  heatmapUrl?: string | null;
  overlayOpacity: number;
  colormap: "jet" | "viridis" | "hot";
  isLoading?: boolean;
}

export function GradCAMViewer({
  imageUrl,
  heatmapUrl = null,
  overlayOpacity,
  colormap,
  isLoading = false,
}: GradCAMViewerProps) {
  const [canvasRef, setCanvasRef] = useState<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef || !imageUrl) return;

    const canvas = canvasRef;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let cancelled = false;

    const base = new window.Image();
    base.crossOrigin = "anonymous";
    base.src = imageUrl;

    const heat = heatmapUrl ? new window.Image() : null;
    if (heat && heatmapUrl) {
      heat.crossOrigin = "anonymous";
      heat.src = heatmapUrl;
    }

    const draw = async () => {
      await new Promise<void>((resolve) => {
        base.onload = () => resolve();
        base.onerror = () => resolve();
      });
      if (cancelled) return;

      canvas.width = base.width || 1;
      canvas.height = base.height || 1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(base, 0, 0);

      const baseImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const baseData = baseImageData.data;

      let heatData: Uint8ClampedArray | null = null;
      if (heat) {
        await new Promise<void>((resolve) => {
          heat.onload = () => resolve();
          heat.onerror = () => resolve();
        });
        if (!cancelled) {
          const off = document.createElement("canvas");
          off.width = canvas.width;
          off.height = canvas.height;
          const offCtx = off.getContext("2d");
          if (offCtx) {
            offCtx.drawImage(heat, 0, 0, canvas.width, canvas.height);
            heatData = offCtx.getImageData(0, 0, canvas.width, canvas.height).data;
          }
        }
      }

      for (let i = 0; i < baseData.length; i += 4) {
        let intensity = 0;
        if (heatData) {
          intensity = (heatData[i] ?? 0) / 255;
        } else {
          // Fallback: center-weighted overlay (keeps UI functional without backend heatmap)
          const pixelIndex = i / 4;
          const x = pixelIndex % canvas.width;
          const y = Math.floor(pixelIndex / canvas.width);
          const centerX = canvas.width / 2;
          const centerY = canvas.height / 2;
          const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
          const maxDistance = Math.sqrt(centerX ** 2 + centerY ** 2);
          intensity = Math.max(0, 1 - distance / (maxDistance || 1));
        }

        const [r, g, b] = getColormapColor(intensity, colormap);
        baseData[i] = Math.round(baseData[i] * (1 - overlayOpacity) + r * overlayOpacity);
        baseData[i + 1] = Math.round(baseData[i + 1] * (1 - overlayOpacity) + g * overlayOpacity);
        baseData[i + 2] = Math.round(baseData[i + 2] * (1 - overlayOpacity) + b * overlayOpacity);
      }

      ctx.putImageData(baseImageData, 0, 0);
    };

    draw();
    return () => {
      cancelled = true;
    };
  }, [canvasRef, imageUrl, heatmapUrl, overlayOpacity, colormap]);

  if (isLoading) {
    return (
      <div className="w-full h-96 bg-surface rounded-lg flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 text-accent-cyan animate-spin" />
          <p className="text-text-secondary">Generating GradCAM overlay...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-surface rounded-lg overflow-hidden border border-border-custom">
      <div className="flex justify-center p-4 bg-background">
        <canvas
          ref={setCanvasRef}
          className="max-w-full max-h-96 rounded-lg border border-border-custom"
        />
      </div>
    </div>
  );
}

function getColormapColor(
  value: number,
  colormap: "jet" | "viridis" | "hot"
): [number, number, number] {
  // value: 0 to 1 (clamped)
  const v = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
  if (colormap === "jet") {
    // Blue -> Cyan -> Green -> Yellow -> Red
    if (v < 0.25) {
      return [0, Math.round(v * 4 * 255), 255];
    } else if (v < 0.5) {
      return [0, 255, Math.round((1 - (v - 0.25) * 4) * 255)];
    } else if (v < 0.75) {
      return [Math.round((v - 0.5) * 4 * 255), 255, 0];
    } else {
      return [255, Math.round((1 - (v - 0.75) * 4) * 255), 0];
    }
  } else if (colormap === "viridis") {
    // Purple -> Blue -> Green -> Yellow
    const c = [
      [68, 1, 84],
      [59, 82, 139],
      [33, 145, 140],
      [253, 231, 37],
    ];

    // Scale into [0, c.length - 1], then lerp between adjacent control points.
    // Important: handle v === 1.0 without indexing past the end.
    if (v >= 1) {
      const last = c[c.length - 1];
      return [last[0], last[1], last[2]];
    }
    const scaled = v * (c.length - 1);
    const segment = Math.floor(scaled);
    const t = scaled - segment;
    const [r1, g1, b1] = c[segment] ?? c[0]!;
    const [r2, g2, b2] = c[segment + 1] ?? c[c.length - 1]!;

    return [
      Math.round(r1 + (r2 - r1) * t),
      Math.round(g1 + (g2 - g1) * t),
      Math.round(b1 + (b2 - b1) * t),
    ];
  } else {
    // hot: Black -> Red -> Yellow -> White
    if (v < 0.33) {
      return [Math.round((v / 0.33) * 255), 0, 0];
    } else if (v < 0.67) {
      return [
        255,
        Math.round(((v - 0.33) / 0.34) * 255),
        0,
      ];
    } else {
      return [
        255,
        255,
        Math.round(((v - 0.67) / 0.33) * 255),
      ];
    }
  }
}
