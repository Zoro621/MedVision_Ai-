"use client"

import type React from "react"
import { useState } from "react"
import { Upload, FileUp, AlertCircle } from "lucide-react"

interface UploadResult {
  filename: string
  success: boolean
  error?: string
  text_length?: number
}

interface DocumentUploadProps {
  onUploadComplete: () => void
}

export default function DocumentUpload({ onUploadComplete }: DocumentUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [results, setResults] = useState<UploadResult[]>([])
  const [error, setError] = useState("")

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleFiles = async (files: FileList) => {
    setUploading(true)
    setError("")
    setResults([])

    const formData = new FormData()
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i])
    }

    try {
      const response = await fetch("http://localhost:5000/api/upload", {
        method: "POST",
        body: formData,
      })
      const data = await response.json()
      setResults(data.files || [])

      if (data.files && data.files.some((r: UploadResult) => r.success)) {
        setTimeout(onUploadComplete, 2000)
      }
    } catch (err) {
      setError("Failed to upload files. Is the backend running on localhost:5000?")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-foreground mb-2">Upload Documents</h2>
        <p className="text-muted-foreground">Upload PDFs, DOCX files, images (JPG/PNG), or DICOM files to index</p>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragging(false)
          handleFiles(e.dataTransfer.files)
        }}
        className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors mb-8 ${
          isDragging ? "border-accent bg-secondary" : "border-border hover:border-accent"
        }`}
      >
        <Upload size={32} className="mx-auto mb-4 text-accent" />
        <h3 className="text-lg font-semibold text-foreground mb-2">Drag and drop your files here</h3>
        <p className="text-muted-foreground mb-4">or click to browse</p>

        <input
          type="file"
          multiple
          disabled={uploading}
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          className="hidden"
          id="file-input"
          accept=".pdf,.docx,.jpg,.jpeg,.png,.dcm"
        />
        <label htmlFor="file-input">
          <button
            type="button"
            onClick={() => document.getElementById("file-input")?.click()}
            disabled={uploading}
            className="inline-block px-6 py-2 bg-accent text-accent-foreground rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {uploading ? "Uploading..." : "Select Files"}
          </button>
        </label>

        <p className="text-xs text-muted-foreground mt-4">Supported: PDF, DOCX, JPG, PNG, DICOM (Max 50MB)</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-error/10 border border-error/30 rounded-lg flex gap-3">
          <AlertCircle size={20} className="text-error flex-shrink-0 mt-0.5" />
          <p className="text-error text-sm">{error}</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-foreground">Upload Results</h3>
          {results.map((result, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-lg border ${
                result.success ? "bg-success/10 border-success/30" : "bg-error/10 border-error/30"
              }`}
            >
              <div className="flex items-start gap-3">
                <FileUp size={20} className={result.success ? "text-success" : "text-error"} />
                <div className="flex-1">
                  <p className="font-medium text-foreground">{result.filename}</p>
                  {result.success ? (
                    <p className="text-sm text-muted-foreground">
                      Successfully extracted {result.text_length} characters
                    </p>
                  ) : (
                    <p className="text-sm text-error">{result.error}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
