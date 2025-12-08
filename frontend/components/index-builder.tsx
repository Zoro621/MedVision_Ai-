"use client"

import { useState, useEffect } from "react"
import { AlertCircle, CheckCircle, Loader } from "lucide-react"

interface IndexBuilderProps {
  onIndexComplete: () => void
}

export default function IndexBuilder({ onIndexComplete }: IndexBuilderProps) {
  const [status, setStatus] = useState<"idle" | "building" | "complete" | "error">("idle")
  const [stats, setStats] = useState<any>(null)
  const [error, setError] = useState("")
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const buildIndex = async () => {
      setStatus("building")
      setProgress(0)

      try {
        // Simulate progress
        const progressInterval = setInterval(() => {
          setProgress((p) => Math.min(p + 15, 90))
        }, 500)

        const response = await fetch("http://localhost:5000/api/index/build", {
          method: "POST",
        })

        clearInterval(progressInterval)

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || "Failed to build index")
        }

        const data = await response.json()
        setStats(data.stats)
        setProgress(100)
        setStatus("complete")

        setTimeout(onIndexComplete, 2000)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error")
        setStatus("error")
      }
    }

    buildIndex()
  }, [onIndexComplete])

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-foreground mb-2">Building Index</h2>
        <p className="text-muted-foreground">Processing documents and generating embeddings for RAG</p>
      </div>

      <div className="bg-card border border-border rounded-lg p-8">
        {status === "building" && (
          <>
            <div className="flex items-center justify-center mb-6">
              <Loader size={32} className="text-accent animate-spin" />
            </div>
            <p className="text-center text-muted-foreground mb-6">Processing documents and building FAISS index...</p>
            <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
              <div className="bg-accent h-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-center text-sm text-muted-foreground mt-3">{progress}%</p>
          </>
        )}

        {status === "complete" && stats && (
          <>
            <div className="flex items-center justify-center mb-6">
              <CheckCircle size={32} className="text-success" />
            </div>
            <h3 className="text-lg font-semibold text-success mb-6 text-center">Index Built Successfully</h3>
            <div className="space-y-3 mb-6">
              <StatItem label="Total Chunks" value={stats.total_chunks} />
              <StatItem label="Documents" value={stats.total_documents} />
            </div>
            <p className="text-center text-muted-foreground text-sm">Redirecting to chat interface...</p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="flex items-center justify-center mb-6">
              <AlertCircle size={32} className="text-error" />
            </div>
            <h3 className="text-lg font-semibold text-error mb-4 text-center">Error Building Index</h3>
            <p className="text-error text-center text-sm bg-error/10 p-4 rounded-lg">{error}</p>
          </>
        )}
      </div>
    </div>
  )
}

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between items-center p-3 bg-secondary rounded-lg">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-accent">{value}</span>
    </div>
  )
}
