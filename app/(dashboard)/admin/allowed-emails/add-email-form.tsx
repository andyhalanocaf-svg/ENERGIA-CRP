"use client"

import { useState } from "react"
import { UserPlus, Loader2 } from "lucide-react"
import { ROLE_LABELS } from "@/lib/constants"

export function AddEmailForm() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const role = formData.get("role") as string

    const res = await fetch("/api/admin/allowed-emails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error || "Error al agregar email")
    } else {
      setSuccess(`✓ ${email} agregado correctamente`)
      ;(e.target as HTMLFormElement).reset()
    }
  }

  const roles = [
    { value: "admin", label: "Administrador" },
    { value: "analyst", label: "Analista" },
    { value: "viewer", label: "Visualizador" },
  ]

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <UserPlus className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Agregar Email</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="add-email" className="block text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Correo electrónico
          </label>
          <input
            id="add-email"
            name="email"
            type="email"
            required
            placeholder="usuario@crpradios.com"
            className="w-full input-brutal text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="add-role" className="block text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Rol asignado
          </label>
          <select
            id="add-role"
            name="role"
            defaultValue="viewer"
            className="w-full input-brutal text-sm"
          >
            {roles.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
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
          id="btn-add-email"
          type="submit"
          disabled={loading}
          className="w-full h-9 rounded-md bg-primary text-primary-foreground text-sm font-semibold
                     hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          Agregar Email
        </button>
      </form>
    </div>
  )
}
