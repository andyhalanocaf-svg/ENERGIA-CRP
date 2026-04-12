import { apiError } from "@/lib/api-helpers"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { MONTH_KEYS, MONTHS_SHORT_ES } from "@/lib/constants"
import * as XLSX from "xlsx"
import type { NextRequest } from "next/server"

// GET /api/budget/export?year=2026
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiError("No autenticado", 401)

  const { searchParams } = new URL(request.url)
  const year = Number(searchParams.get("year") ?? new Date().getFullYear())

  const adminClient = createAdminClient()
  const { data: lines, error } = await adminClient
    .from("budget_lines")
    .select(`partida, description, responsible, category, ${(MONTH_KEYS as unknown as string[]).join(", ")}, total_annual`)
    .eq("year", year)
    .order("partida")

  if (error) return apiError(error.message, 500)

  // Construir datos para Excel
  const rows = (lines ?? []).map(line => {
    const row: Record<string, unknown> = {
      "Partida":      line.partida,
      "Descripción":  line.description ?? "",
      "Responsable":  line.responsible ?? "",
      "Categoría":    line.category,
    }
    ;(MONTH_KEYS as unknown as string[]).forEach((field, i) => {
      row[MONTHS_SHORT_ES[i]] = (line as Record<string, number>)[field] ?? 0
    })
    row["Total Anual"] = line.total_annual ?? 0
    return row
  })

  // Fila de totales
  const totalsRow: Record<string, unknown> = { "Partida": "TOTAL", "Descripción": "", "Responsable": "", "Categoría": "" }
  ;(MONTH_KEYS as unknown as string[]).forEach((field, i) => {
    totalsRow[MONTHS_SHORT_ES[i]] = (lines ?? []).reduce(
      (s, l) => s + ((l as Record<string, number>)[field] ?? 0), 0
    )
  })
  totalsRow["Total Anual"] = (lines ?? []).reduce((s, l) => s + (l.total_annual ?? 0), 0)
  rows.push(totalsRow)

  // Generar Excel con SheetJS
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, `Presupuesto ${year}`)

  // Ajustar ancho de columnas
  ws["!cols"] = [
    { wch: 40 }, { wch: 30 }, { wch: 20 }, { wch: 10 },
    ...Array(12).fill({ wch: 14 }),
    { wch: 16 },
  ]

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Presupuesto_CC231_${year}.xlsx"`,
      "Cache-Control": "no-cache",
    },
  })
}
