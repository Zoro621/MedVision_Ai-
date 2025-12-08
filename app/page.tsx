"use client"

import { useState, useEffect } from "react"
import Sidebar from "@/frontend/components/sidebar"
import DocumentUpload from "@/frontend/components/document-upload"
import IndexBuilder from "@/frontend/components/index-builder"
import ChatOnly from "@/frontend/components/chat-only"
import DocumentBrowser from "@/frontend/components/document-browser"
import VisionAnalysis from "@/frontend/components/vision-analysis"
import { FlashcardGenerator } from "@/frontend/components/flashcard-generator"

type View = "upload" | "build-index" | "chat" | "browse" | "vision" | "flashcards"

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
        {currentView === "vision" && <VisionAnalysis />}
        {currentView === "flashcards" && indexReady && <FlashcardGenerator />}
        {currentView === "chat" && indexReady && <ChatOnly />}
        {currentView === "browse" && <DocumentBrowser />}
      </main>
    </div>
  )
}