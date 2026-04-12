"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { formatCurrency } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import { Check, Loader2, Save } from "lucide-react"
import { MONTHS_ES } from "@/lib/constants"

export type TableItem = {
  budget_line_id: string
  cost_center_id: string
  category: "A" | "B"
  partida: string
  responsible: string
  budgeted: number
  status: string
  notes: string
  rescheduled_to_month: number | null
}

export function ExecutionTable({ items, year, month }: { items: TableItem[], year: number, month: number }) {
  const router = useRouter()
  const [rows, setRows] = useState<TableItem[]>(items)
  const [isSaving, setIsSaving] = useState(false)

  const updateRow = (idx: number, updates: Partial<TableItem>) => {
    setRows(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], ...updates }
      return next
    })
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const executions = rows.map(r => ({
        budget_line_id: r.budget_line_id,
        cost_center_id: r.cost_center_id,
        year,
        month,
        budgeted_amount: r.budgeted,
        projected_amount: r.budgeted, // As is for now
        status: r.status,
        notes: r.notes,
        rescheduled_to_month: r.rescheduled_to_month,
      }))

      const res = await fetch("/api/executions/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ executions })
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || "Error al guardar")
      }

      router.refresh() // Refresca server components (KPIs, etc)
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error desconocido")
    } finally {
      setIsSaving(false)
    }
  }

  const categoryTotal = rows.reduce((s, r) => s + r.budgeted, 0)

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Table Header / Toolbar */}
      <div className="flex items-center justify-between border-b border-border bg-card p-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Borrador de Validación
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Modifica los estados para este periodo
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar y Generar Metrics
        </button>
      </div>

      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted/80 backdrop-blur z-10">
            <tr className="border-b border-border">
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Línea Presupuestal</th>
              <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground w-32">Presup.</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground w-40">Status</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground w-36">Mes Reprogramado</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground min-w-[200px]">Motivo de Variación</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row, i) => (
              <tr key={row.budget_line_id} className="hover:bg-muted/10 transition-colors">
                {/* Info Partida */}
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                     <div className="flex items-center gap-2">
                      <span className={cn(
                        "inline-flex h-4 w-4 items-center justify-center rounded text-[9px] font-bold shrink-0",
                        row.category === "A" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                      )}>
                        {row.category}
                      </span>
                      <span className="text-xs font-semibold text-foreground truncate max-w-[220px]">
                        {row.partida}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground ml-6 truncate max-w-[220px]">
                      {row.responsible}
                    </span>
                  </div>
                </td>

                <td className="px-4 py-3 text-right font-mono text-xs font-semibold text-foreground finance-number">
                  {formatCurrency(row.budgeted, true)}
                </td>

                {/* Interactive Status */}
                <td className="px-4 py-3">
                  <select
                    className={cn(
                      "w-full bg-transparent text-xs font-semibold text-foreground rounded-md border border-border px-2 py-1.5 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors",
                      row.status === "executed" && "text-emerald-400 border-emerald-500/30 bg-emerald-500/5",
                      row.status === "rescheduled" && "text-amber-400 border-amber-500/30 bg-amber-500/5",
                      row.status === "pending" && "text-muted-foreground"
                    )}
                    value={row.status}
                    onChange={(e) => updateRow(i, { status: e.target.value })}
                  >
                    <option className="text-foreground bg-card" value="pending">PENDIENTE</option>
                    <option className="text-foreground bg-card" value="executed">OK (EJECUTADO)</option>
                    <option className="text-foreground bg-card" value="rescheduled">REPROGRAMADO</option>
                    <option className="text-foreground bg-card" value="savings">AHORRO</option>
                  </select>
                </td>

                {/* Reprogramado a Mes */}
                <td className="px-4 py-3">
                  <select
                    disabled={row.status !== "rescheduled"}
                    className="w-full bg-transparent text-xs text-foreground rounded-md border border-border px-2 py-1.5 focus:border-primary focus:ring-1 focus:ring-primary outline-none disabled:opacity-30"
                    value={row.rescheduled_to_month || ""}
                    onChange={(e) => updateRow(i, { rescheduled_to_month: e.target.value ? Number(e.target.value) : null })}
                  >
                    <option value="">- N/A -</option>
                    {MONTHS_ES.map((m, idx) => (
                      <option key={idx} value={idx + 1} className="bg-card">{m}</option>
                    ))}
                  </select>
                </td>

                {/* Motivos */}
                <td className="px-4 py-3">
                  <input
                    type="text"
                    placeholder="Ninguna variación"
                    className="w-full bg-transparent text-xs text-foreground rounded-md border border-transparent hover:border-border focus:border-primary px-2 py-1.5 focus:ring-1 focus:ring-primary outline-none transition-colors"
                    value={row.notes || ""}
                    onChange={(e) => updateRow(i, { notes: e.target.value })}
                  />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                  No hay líneas presupuestales para este mes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
