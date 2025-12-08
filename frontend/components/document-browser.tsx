"use client"

import { useState, useEffect } from "react"
import { FileText, Loader, AlertCircle } from "lucide-react"

interface Document {
  filename: string
  file_path: string
  chunks: number
}

export default function DocumentBrowser() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/documents")
        if (!response.ok) throw new Error("Failed to fetch documents")
        const data = await response.json()
        setDocuments(data.documents || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
        setLoading(false)
      }
    }

    fetchDocuments()
  }, [])

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-foreground mb-2">Indexed Documents</h2>
        <p className="text-muted-foreground">Browse all documents in your knowledge base</p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader size={24} className="text-accent animate-spin" />
        </div>
      )}

      {error && (
        <div className="p-4 bg-error/10 border border-error/30 rounded-lg flex gap-3">
          <AlertCircle size={20} className="text-error flex-shrink-0" />
          <p className="text-error text-sm">{error}</p>
        </div>
      )}

      {!loading && documents.length === 0 && (
        <div className="text-center py-12">
          <FileText size={32} className="mx-auto text-muted-foreground mb-4 opacity-50" />
          <p className="text-muted-foreground">No documents indexed yet</p>
        </div>
      )}

      <div className="space-y-3">
        {documents.map((doc, idx) => (
          <div key={idx} className="p-4 bg-card border border-border rounded-lg hover:border-accent transition-colors">
            <div className="flex items-start gap-3">
              <FileText size={20} className="text-accent mt-1" />
              <div className="flex-1">
                <h3 className="font-medium text-foreground">{doc.filename}</h3>
                <p className="text-sm text-muted-foreground mt-1">{doc.chunks} chunks</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
