"use client"

import { useState } from "react"
import { Upload, Loader, ImageIcon, Sparkles, Eye } from "lucide-react"

interface VisionAnalysisProps {
  onAnalysisComplete?: () => void
}

export default function VisionAnalysis({ onAnalysisComplete }: VisionAnalysisProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>("")
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState<"upload" | "caption" | "gradcam">("upload")

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
      setResult(null)
      setError("")
      setActiveTab("upload")
    }
  }

  const analyzeImage = async (mode: "caption" | "gradcam" | "analyze") => {
    if (!selectedFile) {
      setError("Please select an image first")
      return
    }

    setAnalyzing(true)
    setError("")
    setResult(null)

    const formData = new FormData()
    formData.append("file", selectedFile)

    try {
      const response = await fetch(`http://localhost:5000/api/vision/${mode}`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Analysis failed")
      }

      const data = await response.json()
      setResult(data)

      if (mode === "caption") {
        setActiveTab("caption")
      } else {
        setActiveTab("gradcam")
      }

      if (onAnalysisComplete) {
        onAnalysisComplete()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-foreground mb-2">Visual Analysis (CLIP + GradCAM)</h2>
        <p className="text-muted-foreground">
          Upload medical images for AI-powered captioning and explainability visualization
        </p>
      </div>

      {/* Upload Section */}
      <div className="bg-card border border-border rounded-lg p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <ImageIcon className="text-accent" size={24} />
          <h3 className="text-xl font-semibold text-foreground">Image Upload</h3>
        </div>

        <input
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          id="vision-file-input"
        />
        <label htmlFor="vision-file-input">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              selectedFile ? "border-accent bg-accent/10" : "border-border hover:border-accent"
            }`}
          >
            {previewUrl ? (
              <div className="space-y-4">
                <img src={previewUrl} alt="Preview" className="max-h-64 mx-auto rounded-lg" />
                <p className="text-sm text-muted-foreground">{selectedFile?.name}</p>
                <button
                  type="button"
                  onClick={() => document.getElementById("vision-file-input")?.click()}
                  className="px-4 py-2 bg-secondary text-foreground rounded-lg hover:opacity-90"
                >
                  Change Image
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <Upload size={32} className="mx-auto text-accent" />
                <p className="text-lg font-medium text-foreground">Click to upload an image</p>
                <p className="text-sm text-muted-foreground">Support JPG, PNG, DICOM images</p>
              </div>
            )}
          </div>
        </label>
      </div>

      {/* Action Buttons */}
      {selectedFile && (
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => analyzeImage("caption")}
            disabled={analyzing}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-accent text-accent-foreground rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            <Sparkles size={20} />
            {analyzing ? "Analyzing..." : "Generate Caption (BLIP)"}
          </button>
          <button
            onClick={() => analyzeImage("analyze")}
            disabled={analyzing}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-accent text-accent-foreground rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            <Eye size={20} />
            {analyzing ? "Analyzing..." : "Full Analysis (Caption + GradCAM)"}
          </button>
        </div>
      )}

      {/* Loading State */}
      {analyzing && (
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <Loader size={32} className="text-accent animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Processing image with AI models...</p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-destructive/10 border border-destructive rounded-lg p-4 mb-6">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}

      {/* Results Tabs */}
      {result && !analyzing && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {/* Tab Headers */}
          <div className="flex border-b border-border">
            <button
              onClick={() => setActiveTab("caption")}
              className={`flex-1 px-6 py-3 font-medium transition-colors ${
                activeTab === "caption"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              Caption
            </button>
            <button
              onClick={() => setActiveTab("gradcam")}
              className={`flex-1 px-6 py-3 font-medium transition-colors ${
                activeTab === "gradcam"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-secondary"
              }`}
              disabled={!result.gradcam}
            >
              GradCAM Visualization
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === "caption" && result.caption && (
              <div className="space-y-4">
                <div className="bg-secondary rounded-lg p-6">
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2">Generated Caption:</h4>
                  <p className="text-lg text-foreground">{result.caption}</p>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>Model: BLIP (Salesforce/blip-image-captioning-base)</p>
                  <p>File: {result.filename}</p>
                </div>
              </div>
            )}

            {activeTab === "gradcam" && result.gradcam && (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  {result.gradcam.original_image && (
                    <div>
                      <h4 className="text-sm font-semibold text-muted-foreground mb-2">Original Image</h4>
                      <img
                        src={result.gradcam.original_image}
                        alt="Original"
                        className="w-full rounded-lg border border-border"
                      />
                    </div>
                  )}
                  {result.gradcam.heatmap && (
                    <div>
                      <h4 className="text-sm font-semibold text-muted-foreground mb-2">GradCAM Heatmap</h4>
                      <img
                        src={result.gradcam.heatmap}
                        alt="Heatmap"
                        className="w-full rounded-lg border border-border"
                      />
                    </div>
                  )}
                  {result.gradcam.overlay && (
                    <div>
                      <h4 className="text-sm font-semibold text-muted-foreground mb-2">Overlay</h4>
                      <img
                        src={result.gradcam.overlay}
                        alt="Overlay"
                        className="w-full rounded-lg border border-border"
                      />
                    </div>
                  )}
                </div>
                <div className="bg-secondary rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold">Predicted Class:</span> {result.gradcam.predicted_class}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Model: ResNet50 with GradCAM (Captum)
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
