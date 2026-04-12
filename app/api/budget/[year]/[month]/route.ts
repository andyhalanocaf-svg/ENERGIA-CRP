import { apiSuccess, apiError } from "@/lib/api-helpers"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { MONTH_KEYS } from "@/lib/constants"
import type { NextRequest } from "next/server"

// GET /api/budget/[year]/[month]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ year: string; month: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiError("No autenticado", 401)

  const { year: yearStr, month: monthStr } = await params
  const year = Number(yearStr)
  const month = Number(monthStr)

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return apiError("Año o mes inválido", 400)
  }

  const monthField = (MONTH_KEYS as unknown as string[])[month - 1]
  const adminClient = createAdminClient()

  const { data: lines, error: linesErr } = await adminClient
    .from("budget_lines")
    .select(`id, partida, description, responsible, category, ${monthField}`)
    .eq("year", year)
    .order("partida")

  if (linesErr) return apiError(linesErr.message, 500)

  const { data: executions } = await adminClient
    .from("monthly_executions")
    .select("*")
    .eq("year", year)
    .eq("month", month)

  const execMap = new Map((executions ?? []).map(e => [e.budget_line_id, e]))

  const partidas = ((lines as any[]) ?? []).map(line => {
    const budgeted = (line[monthField] as number) ?? 0
    const exec = execMap.get(line.id)
    return {
      partida: line.partida,
      description: line.description,
      responsible: line.responsible ?? "Sin asignar",
      category: line.category,
      budgeted,
      executed: exec?.executed_amount ?? 0,
      projected: exec?.projected_amount ?? 0,
      savings: exec?.savings_amount ?? 0,
      status: exec?.status ?? "pending",
    }
  })

  const totalBudget   = partidas.reduce((s, p) => s + p.budgeted, 0)
  const totalExecuted = partidas.reduce((s, p) => s + p.executed, 0)
  const totalProjected = partidas.reduce((s, p) => s + p.projected, 0)
  const totalSavings  = partidas.reduce((s, p) => s + p.savings, 0)
  const rate = totalBudget > 0
    ? Math.min(999, ((totalExecuted || totalProjected) / totalBudget) * 100)
    : 0

  return apiSuccess({ year, month, partidas, totalBudget, totalExecuted, totalProjected, totalSavings, executionRate: rate })
}
