"use client"

import type React from "react"
import { FileUp, Settings, MessageSquare, BookOpen, Database, Eye, GraduationCap } from "lucide-react"

type View = "upload" | "build-index" | "chat" | "browse" | "vision" | "flashcards"

interface SidebarProps {
  currentView: View
  setCurrentView: (view: View) => void
  indexReady: boolean
}

export default function Sidebar({ currentView, setCurrentView, indexReady }: SidebarProps) {
  return (
    <div className="w-64 bg-card border-r border-border p-6 flex flex-col">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-accent mb-2">MedVsion 1.1</h1>
        <p className="text-sm text-muted-foreground">Intelligent Document Processing</p>
      </div>

      <nav className="space-y-3 flex-1">
        <NavItem
          icon={<FileUp size={20} />}
          label="Upload Documents"
          active={currentView === "upload"}
          onClick={() => setCurrentView("upload")}
        />
        <NavItem
          icon={<Database size={20} />}
          label="Build Index"
          active={currentView === "build-index"}
          onClick={() => setCurrentView("build-index")}
        />
        <NavItem
          icon={<Eye size={20} />}
          label="Vision Analysis"
          active={currentView === "vision"}
          onClick={() => setCurrentView("vision")}
        />
        <NavItem
          icon={<GraduationCap size={20} />}
          label="Flashcards"
          active={currentView === "flashcards"}
          onClick={() => setCurrentView("flashcards")}
          disabled={!indexReady}
        />
        <NavItem
          icon={<MessageSquare size={20} />}
          label="Chat with Docs"
          active={currentView === "chat"}
          onClick={() => setCurrentView("chat")}
          disabled={!indexReady}
        />
        <NavItem
          icon={<BookOpen size={20} />}
          label="Browse Documents"
          active={currentView === "browse"}
          onClick={() => setCurrentView("browse")}
          disabled={!indexReady}
        />
      </nav>

      <div className="pt-6 border-t border-border">
        <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
          <Settings size={20} className="text-accent" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">API Configuration</p>
            <p className="text-xs text-muted-foreground">Set API Key</p>
          </div>
        </div>
      </div>
    </div>
  )
}

interface NavItemProps {
  icon: React.ReactNode
  label: string
  active: boolean
  onClick: () => void
  disabled?: boolean
}

function NavItem({ icon, label, active, onClick, disabled }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
        active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-secondary"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </button>
  )
}
