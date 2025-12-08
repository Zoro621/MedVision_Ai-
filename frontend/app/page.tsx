"use client"

import { useState, useEffect } from "react"
import Sidebar from "@/components/sidebar"
import DocumentUpload from "@/components/document-upload"
import IndexBuilder from "@/components/index-builder"
import RAGChat from "@/components/rag-chat"
import DocumentBrowser from "@/components/document-browser"

type View = "upload" | "build-index" | "chat" | "browse"

export default function Home() {
  const [currentView, setCurrentView] = useState<View>("upload")
  const [indexReady, setIndexReady] = useState(false)

  useEffect(() => {
    // Check if index exists on mount
    const checkIndexStatus = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/index/status")
        const data = await response.json()
        setIndexReady(data.num_vectors > 0)
      } catch (error) {
        console.log("Backend not available yet")
      }
    }

    checkIndexStatus()
  }, [])

  const handleUploadComplete = () => {
    setCurrentView("build-index")
  }

  const handleIndexComplete = () => {
    setIndexReady(true)
    setCurrentView("chat")
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} indexReady={indexReady} />

      <main className="flex-1 overflow-auto">
        {currentView === "upload" && <DocumentUpload onUploadComplete={handleUploadComplete} />}
        {currentView === "build-index" && <IndexBuilder onIndexComplete={handleIndexComplete} />}
        {currentView === "chat" && indexReady && <RAGChat />}
        {currentView === "browse" && <DocumentBrowser />}
      </main>
    </div>
  )
}
