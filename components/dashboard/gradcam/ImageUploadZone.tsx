"use client";

import { useState, useRef } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ImageUploadZoneProps {
  onImageUpload: (file: File) => void;
  isLoading?: boolean;
}

export function ImageUploadZone({ onImageUpload, isLoading = false }: ImageUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith("image/")) {
        onImageUpload(file);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      onImageUpload(files[0]);
    }
  };

  return (
    <div
      className={cn(
        "border-2 border-dashed rounded-lg p-8 text-center transition-all",
        isDragging
          ? "border-accent-cyan bg-accent-cyan/5"
          : "border-border-custom hover:border-accent-cyan/50"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex flex-col items-center gap-3">
        {isLoading ? (
          <>
            <Loader2 className="h-8 w-8 text-accent-cyan animate-spin" />
            <p className="text-text-secondary">Processing X-ray image...</p>
          </>
        ) : (
          <>
            <Upload className="h-8 w-8 text-accent-cyan" />
            <div>
              <p className="text-text-primary font-medium">Upload X-ray Image</p>
              <p className="text-text-secondary text-sm">
                Drag and drop or{" "}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-accent-cyan hover:underline"
                >
                  browse
                </button>
              </p>
            </div>
            <p className="text-xs text-text-secondary">
              Supported formats: PNG, JPG, DICOM (max 50MB)
            </p>
          </>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
