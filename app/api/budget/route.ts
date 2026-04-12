import { apiSuccess, apiError, apiForbidden } from "@/lib/api-helpers"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import type { NextRequest } from "next/server"

// GET /api/budget?year=2026
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiError("No autenticado", 401)

  const { searchParams } = new URL(request.url)
  const year = searchParams.get("year") ? Number(searchParams.get("year")) : null

  const adminClient = createAdminClient()

  let query = adminClient
    .from("budget_lines")
    .select("year, total_annual, category")

  if (year) query = query.eq("year", year) as typeof query

  const { data, error } = await query

  if (error) return apiError(error.message, 500)

  // Agrupar por año
  const grouped: Record<number, { totalAnnual: number; categoryA: number; categoryB: number; lines: number }> = {}

  for (const line of data ?? []) {
    if (!grouped[line.year]) grouped[line.year] = { totalAnnual: 0, categoryA: 0, categoryB: 0, lines: 0 }
    grouped[line.year].totalAnnual += line.total_annual ?? 0
    grouped[line.year].lines++
    if (line.category === "A") grouped[line.year].categoryA += line.total_annual ?? 0
    else grouped[line.year].categoryB += line.total_annual ?? 0
  }

  return apiSuccess(grouped)
}
