import { apiSuccess, apiError } from "@/lib/api-helpers"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { MONTH_KEYS } from "@/lib/constants"
import type { NextRequest } from "next/server"

// GET /api/budget/[year]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ year: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiError("No autenticado", 401)

  const { year: yearStr } = await params
  const year = Number(yearStr)
  if (isNaN(year)) return apiError("Año inválido", 400)

  const adminClient = createAdminClient()
  const { data: lines, error } = await adminClient
    .from("budget_lines")
    .select(`partida, category, total_annual, ${MONTH_KEYS.join(", ")}`)
    .eq("year", year)

  if (error) return apiError(error.message, 500)
  if (!lines || lines.length === 0) {
    return apiSuccess({ year, lines: [], totals: null })
  }

  const linesArray = lines as any[]
  
  const monthFields = MONTH_KEYS as unknown as string[]
  const months = monthFields.map((field, idx) => ({
    month: idx + 1,
    budget: linesArray.reduce((s, l) => s + (l[field] ?? 0), 0),
  }))

  const totalAnnual = linesArray.reduce((s, l) => s + (l.total_annual ?? 0), 0)
  const categoryA = linesArray.filter(l => l.category === "A").reduce((s, l) => s + (l.total_annual ?? 0), 0)
  const categoryB = linesArray.filter(l => l.category === "B").reduce((s, l) => s + (l.total_annual ?? 0), 0)

  return apiSuccess({
    year,
    linesCount: lines.length,
    totalAnnual,
    categoryA,
    categoryB,
    months,
  })
}
