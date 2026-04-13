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
  description: string
  ciudad_planta: string
  budgeted: number
  status: string
  notes: string
  rescheduled_to_month: number | null
  validated_at: string | null
  validated_by: string | null
  status_adelanto: string | null
  mes_origen: number | null
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
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground w-24">ID Línea</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Responsable</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Partida Presupuestal</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground min-w-[150px]">Detalle</th>
              <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground w-28">Monto S/</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Ciudad/Planta</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground w-36">STATUS</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground w-32">Mes Reprogramado</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground min-w-[150px]">Motivo de Variación</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Fecha Validación</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Validado Por</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Status Adelanto</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Mes Origen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row, i) => (
              <tr key={row.budget_line_id} className="hover:bg-muted/10 transition-colors">
                {/* ID Línea */}
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground truncate max-w-[100px]" title={row.budget_line_id}>
                  {row.budget_line_id.slice(0, 8)}...
                </td>

                {/* Responsable */}
                <td className="px-4 py-3 text-xs text-foreground truncate max-w-[150px]">
                  {row.responsible}
                </td>

                {/* Partida Presupuestal */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "inline-flex h-4 w-4 items-center justify-center rounded text-[9px] font-bold shrink-0",
                      row.category === "A" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                    )}>
                      {row.category}
                    </span>
                    <span className="text-xs font-semibold text-foreground truncate max-w-[200px]" title={row.partida}>
                      {row.partida}
                    </span>
                  </div>
                </td>

                {/* Detalle */}
                <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-[200px]" title={row.description}>
                  {row.description}
                </td>

                {/* Monto S/ */}
                <td className="px-4 py-3 text-right font-mono text-xs font-semibold text-foreground finance-number">
                  {formatCurrency(row.budgeted, true)}
                </td>

                {/* Ciudad/Planta */}
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {row.ciudad_planta || "-"}
                </td>

                {/* Interactive Status */}
                <td className="px-4 py-3">
                  <select
                    className={cn(
                      "w-full bg-transparent text-xs font-semibold text-foreground rounded-md border border-border px-2 py-1.5 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors",
                      row.status === "executed" && "text-emerald-400 border-emerald-500/30 bg-emerald-500/5",
                      row.status === "rescheduled" && "text-amber-400 border-amber-500/30 bg-amber-500/5",
                      row.status === "advance" && "text-blue-400 border-blue-500/30 bg-blue-500/5",
                      row.status === "pending" && "text-muted-foreground"
                    )}
                    value={row.status}
                    onChange={(e) => updateRow(i, { status: e.target.value })}
                  >
                    <option className="text-foreground bg-card" value="pending">PENDIENTE</option>
                    <option className="text-foreground bg-card" value="executed">OK (EJECUTADO)</option>
                    <option className="text-foreground bg-card" value="rescheduled">REPROGRAMADO</option>
                    <option className="text-foreground bg-card" value="advance">ADELANTO</option>
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

                {/* Fecha Validación */}
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {row.validated_at || "-"}
                </td>

                {/* Validado Por */}
                <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-[120px]">
                  {row.validated_by || "-"}
                </td>

                {/* Status Adelanto */}
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {row.status_adelanto || "-"}
                </td>

                {/* Mes Origen */}
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {row.mes_origen ? MONTHS_ES[row.mes_origen - 1] : "-"}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={13} className="py-8 text-center text-sm text-muted-foreground">
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
