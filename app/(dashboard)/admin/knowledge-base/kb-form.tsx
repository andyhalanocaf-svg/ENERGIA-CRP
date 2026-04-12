"use client"

import { useState } from "react"
import { BookOpen, Loader2, Plus } from "lucide-react"
import { KB_CATEGORY_LABELS } from "@/lib/constants"

const CATEGORIES = Object.entries(KB_CATEGORY_LABELS)

export function KbDocumentForm() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    const formData = new FormData(e.currentTarget)
    const body = {
      title: formData.get("title") as string,
      content: formData.get("content") as string,
      category: formData.get("category") as string,
      tags: (formData.get("tags") as string)
        .split(",")
        .map(t => t.trim())
        .filter(Boolean),
    }

    const res = await fetch("/api/chat/kb", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error || "Error al guardar el documento")
    } else {
      setSuccess("✓ Documento agregado y vectorizado correctamente")
      ;(e.target as HTMLFormElement).reset()
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Nuevo Documento</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Título */}
        <div className="space-y-1.5">
          <label htmlFor="kb-title" className="block text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Título
          </label>
          <input
            id="kb-title"
            name="title"
            type="text"
            required
            placeholder="Ej: ¿Qué es la Categoría A?"
            className="w-full input-brutal text-sm"
          />
        </div>

        {/* Categoría */}
        <div className="space-y-1.5">
          <label htmlFor="kb-category" className="block text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Categoría
          </label>
          <select
            id="kb-category"
            name="category"
            defaultValue="faq"
            className="w-full input-brutal text-sm"
          >
            {CATEGORIES.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {/* Tags */}
        <div className="space-y-1.5">
          <label htmlFor="kb-tags" className="block text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Etiquetas (separadas por coma)
          </label>
          <input
            id="kb-tags"
            name="tags"
            type="text"
            placeholder="presupuesto, categoría, SAP"
            className="w-full input-brutal text-sm"
          />
        </div>

        {/* Contenido */}
        <div className="space-y-1.5">
          <label htmlFor="kb-content" className="block text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Contenido
          </label>
          <textarea
            id="kb-content"
            name="content"
            required
            rows={6}
            placeholder="Escribe el contenido del documento. Este texto alimentará las respuestas del chatbot..."
            className="w-full input-brutal text-sm resize-none"
          />
        </div>

        {error && (
          <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded px-3 py-2">
            {error}
          </p>
        )}
        {success && (
          <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-3 py-2">
            {success}
          </p>
        )}

        <button
          id="btn-add-kb-doc"
          type="submit"
          disabled={loading}
          className="w-full h-9 rounded-md bg-primary text-primary-foreground text-sm font-semibold
                     hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Agregar a la Knowledge Base
        </button>
      </form>
    </div>
  )
}
