"use client"

import { useState, useRef, useEffect } from "react"
import {
  MessageCircle, X, Send, Bot, User,
  Sparkles, Loader2, ChevronDown,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Tipos ────────────────────────────────────────────────
interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

// ─── Componente Principal ─────────────────────────────────
export function ChatPanel() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "¡Hola! Soy **PresupAI**, tu asistente de control presupuestal de CC231. Puedo ayudarte a entender el estado del presupuesto, interpretar KPIs y responder preguntas sobre el sistema. ¿En qué puedo ayudarte?",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Focus input when opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  async function sendMessage() {
    const text = input.trim()
    if (!text || streaming) return

    setInput("")
    setError(null)

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date(),
    }

    const assistantMsg: Message = {
      id: `a-${Date.now()}`,
      role: "assistant",
      content: "",
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMsg, assistantMsg])
    setStreaming(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || "Error del servidor")
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error("No stream")

      const decoder = new TextDecoder()
      let accumulated = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })

        // Actualizar el mensaje del asistente en tiempo real
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantMsg.id
              ? { ...m, content: accumulated }
              : m
          )
        )
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al enviar mensaje"
      setError(msg)
      setMessages(prev => prev.filter(m => m.id !== assistantMsg.id))
    } finally {
      setStreaming(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      {/* Botón flotante */}
      <button
        id="btn-chat-toggle"
        onClick={() => setOpen(v => !v)}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-brutal-lg transition-all duration-200",
          open
            ? "bg-card border border-border text-muted-foreground"
            : "bg-primary text-primary-foreground glow-brand hover:scale-105"
        )}
        aria-label={open ? "Cerrar chat" : "Abrir PresupAI Chat"}
      >
        {open ? (
          <X className="h-6 w-6" />
        ) : (
          <>
            <MessageCircle className="h-6 w-6" />
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            </span>
          </>
        )}
      </button>

      {/* Panel de chat */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 flex w-96 flex-col rounded-xl border border-border bg-card shadow-brutal-lg animate-scale-in overflow-hidden"
          style={{ height: "520px" }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-border bg-sidebar px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 border border-primary/30">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                PresupAI Chat
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              </p>
              <p className="text-[10px] text-muted-foreground">
                Mercury-2 · {streaming ? "Escribiendo..." : "En línea"}
              </p>
            </div>
            <div className={cn(
              "h-2 w-2 rounded-full",
              streaming ? "bg-amber-400 animate-pulse" : "bg-emerald-400"
            )} />
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map(msg => (
              <ChatMessage key={msg.id} message={msg} />
            ))}

            {/* Typing indicator */}
            {streaming && messages.at(-1)?.content === "" && (
              <div className="flex items-center gap-2 pl-1">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 border border-primary/25">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="flex gap-1 rounded-lg bg-muted px-3 py-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border p-3">
            <div className="flex items-end gap-2 rounded-lg border border-border bg-background px-3 py-2 focus-within:border-primary/50 transition-colors">
              <textarea
                ref={inputRef}
                id="chat-input"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pregunta sobre el presupuesto..."
                rows={1}
                disabled={streaming}
                className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none disabled:opacity-50 max-h-24"
                style={{ minHeight: "20px" }}
              />
              <button
                id="btn-chat-send"
                onClick={sendMessage}
                disabled={!input.trim() || streaming}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                {streaming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="mt-1.5 text-[10px] text-muted-foreground/60 text-center">
              Enter para enviar · Shift+Enter para nueva línea
            </p>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Burbuja de mensaje ───────────────────────────────────
function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === "user"

  // Markdown básico → HTML
  const renderContent = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/`(.*?)`/g, '<code class="bg-muted rounded px-1 text-xs font-mono">$1</code>')
      .replace(/\n/g, "<br/>")
  }

  return (
    <div className={cn("flex gap-2", isUser && "flex-row-reverse")}>
      {/* Avatar */}
      <div className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
        isUser
          ? "bg-muted border border-border"
          : "bg-primary/15 border border-primary/25"
      )}>
        {isUser ? (
          <User className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <Bot className="h-3.5 w-3.5 text-primary" />
        )}
      </div>

      {/* Bubble */}
      <div className={cn(
        "max-w-[78%] rounded-xl px-3 py-2 text-sm leading-relaxed",
        isUser
          ? "bg-primary text-primary-foreground rounded-tr-sm"
          : "bg-muted text-foreground rounded-tl-sm"
      )}>
        {message.content ? (
          <div
            dangerouslySetInnerHTML={{ __html: renderContent(message.content) }}
          />
        ) : (
          <span className="opacity-0">·</span>
        )}
      </div>
    </div>
  )
}
