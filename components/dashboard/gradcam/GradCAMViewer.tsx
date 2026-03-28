"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";

interface GradCAMViewerProps {
  imageUrl: string;
  overlayOpacity: number;
  colormap: "jet" | "viridis" | "hot";
  isLoading?: boolean;
}

export function GradCAMViewer({
  imageUrl,
  overlayOpacity,
  colormap,
  isLoading = false,
}: GradCAMViewerProps) {
  const [canvasRef, setCanvasRef] = useState<HTMLCanvasElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    if (!canvasRef || !imageUrl || !imageLoaded) return;

    const canvas = canvasRef;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Create mock GradCAM overlay
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Generate heatmap-like overlay
      for (let i = 0; i < data.length; i += 4) {
        const pixelIndex = i / 4;
        const x = pixelIndex % canvas.width;
        const y = Math.floor(pixelIndex / canvas.width);

        // Create gaussian distribution centered in image
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const distance = Math.sqrt(
          Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
        );
        const maxDistance = Math.sqrt(
          Math.pow(centerX, 2) + Math.pow(centerY, 2)
        );
        const intensity = Math.max(0, 1 - distance / maxDistance);

        // Apply colormap
        const [r, g, b] = getColormapColor(intensity, colormap);

        data[i] = Math.round(data[i] * (1 - overlayOpacity) + r * overlayOpacity);
        data[i + 1] = Math.round(
          data[i + 1] * (1 - overlayOpacity) + g * overlayOpacity
        );
        data[i + 2] = Math.round(
          data[i + 2] * (1 - overlayOpacity) + b * overlayOpacity
        );
      }

      ctx.putImageData(imageData, 0, 0);
    };
  }, [canvasRef, imageUrl, overlayOpacity, colormap, imageLoaded]);

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
  // value: 0 to 1
  if (colormap === "jet") {
    // Blue -> Cyan -> Green -> Yellow -> Red
    if (value < 0.25) {
      return [0, Math.round(value * 4 * 255), 255];
    } else if (value < 0.5) {
      return [0, 255, Math.round((1 - (value - 0.25) * 4) * 255)];
    } else if (value < 0.75) {
      return [Math.round((value - 0.5) * 4 * 255), 255, 0];
    } else {
      return [255, Math.round((1 - (value - 0.75) * 4) * 255), 0];
    }
  } else if (colormap === "viridis") {
    // Purple -> Blue -> Green -> Yellow
    const c = [
      [68, 1, 84],
      [59, 82, 139],
      [33, 145, 140],
      [253, 231, 37],
    ];

    let segment = Math.floor(value * 3);
    let segmentValue = (value * 3) - segment;

    const [r1, g1, b1] = c[segment];
    const [r2, g2, b2] = c[segment + 1];

    return [
      Math.round(r1 + (r2 - r1) * segmentValue),
      Math.round(g1 + (g2 - g1) * segmentValue),
      Math.round(b1 + (b2 - b1) * segmentValue),
    ];
  } else {
    // hot: Black -> Red -> Yellow -> White
    if (value < 0.33) {
      return [Math.round((value / 0.33) * 255), 0, 0];
    } else if (value < 0.67) {
      return [
        255,
        Math.round(((value - 0.33) / 0.34) * 255),
        0,
      ];
    } else {
      return [
        255,
        255,
        Math.round(((value - 0.67) / 0.33) * 255),
      ];
    }
  }
}
