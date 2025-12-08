"use client"

import { useState, useRef, useEffect } from "react"
import { Send, AlertCircle, Loader } from "lucide-react"

interface Message {
  id: string
  type: "user" | "assistant"
  content: string
  sources?: any[]
  sourceType?: string
}

export default function ChatOnly() {
  const [messages, setMessages] = useState<Message[]>([])
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = async () => {
    if (!query.trim()) {
      setError("Please enter a query")
      return
    }

    setError("")
    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: query,
    }

    setMessages((prev) => [...prev, userMessage])
    const currentQuery = query.trim()
    setQuery("")
    setLoading(true)

    try {
      const response = await fetch("http://localhost:5000/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: currentQuery }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Query failed")
      }

      const data = await response.json()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: data.answer,
        sources: data.sources,
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-6 border-b border-border bg-card">
        <h2 className="text-2xl font-bold text-foreground mb-2">Chat with Your Documents</h2>
        <p className="text-muted-foreground text-sm">Ask questions about your uploaded documents</p>
      </div>


      {/* Messages */}
      <div className="flex-1 overflow-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-center">
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Start a Conversation</h3>
              <p className="text-muted-foreground">Ask a question about your documents</p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-2xl p-4 rounded-lg ${
                msg.type === "user"
                  ? "bg-accent text-accent-foreground"
                  : "bg-card border border-border text-foreground"
              }`}
            >
              <p className="text-sm leading-relaxed">{msg.content}</p>
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-current border-opacity-10">
                  <p className="text-xs font-medium mb-2 opacity-80">Sources:</p>
                  <div className="space-y-1">
                    {msg.sources.map((src, idx) => (
                      <p key={idx} className="text-xs opacity-75">
                        {src.source_file}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-card border border-border p-4 rounded-lg flex items-center gap-2">
              <Loader size={16} className="text-accent animate-spin" />
              <p className="text-sm text-muted-foreground">Thinking...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-center">
            <div className="bg-destructive/10 border border-destructive/30 p-4 rounded-lg flex gap-2 max-w-md">
              <AlertCircle size={16} className="text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border bg-card">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Ask a question..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && !loading && handleSend()}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground disabled:opacity-50 focus:outline-none focus:border-accent"
          />
          <button
            onClick={handleSend}
            disabled={loading || !query.trim()}
            className="px-6 py-3 bg-accent text-accent-foreground rounded-lg font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </div>
  )
}

