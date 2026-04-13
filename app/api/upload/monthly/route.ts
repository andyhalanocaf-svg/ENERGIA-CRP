import { apiError, apiSuccess, apiForbidden } from "@/lib/api-helpers"
import { createClient } from "@/lib/supabase/server"
import { parseMonthlyExcel } from "@/lib/excel/monthly-parser"
import type { NextRequest } from "next/server"

// POST /api/upload/monthly
// Procesa una plantilla mensual con STATUS y MOTIVO DE VARIACIÓN
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return apiError("No autenticado", 401)

  // Verificar rol
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!["super_admin", "admin"].includes(profile?.role ?? "")) {
    return apiForbidden()
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return apiError("Error al leer el formulario", 400)
  }

  const file = formData.get("file") as File | null
  const yearStr = formData.get("year") as string | null
  const monthStr = formData.get("month") as string | null
  
  const year = yearStr ? Number(yearStr) : new Date().getFullYear()
  const month = monthStr ? Number(monthStr) : new Date().getMonth() + 1

  if (!file) return apiError("No se recibió ningún archivo", 400)

  // Validar extensión
  const ext = file.name.split(".").pop()?.toLowerCase()
  if (!ext || !["xlsx", "xls"].includes(ext)) {
    return apiError("Formato inválido. Solo .xlsx o .xls", 400)
  }

  // Parsear Excel
  let executions: ReturnType<typeof parseMonthlyExcel>
  try {
    const buffer = await file.arrayBuffer()
    executions = parseMonthlyExcel(buffer, year, month)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error de parseo"
    return apiError(`Error al parsear el Excel: ${msg}`, 422)
  }

  if (!executions || executions.length === 0) {
    return apiError("El archivo no contiene líneas válidas", 422)
  }

  // Obtener cost_center
  const { data: cc } = await supabase
    .from("cost_centers")
    .select("id")
    .eq("code", "CC231")
    .single()

  const costCenterId = cc?.id
  if (!costCenterId) {
    return apiError("No se encontró el centro de costos CC231", 500)
  }

  // Para cada línea, buscar el budget_line_id y crear/actualizar monthly_execution
  let updatedCount = 0
  let notFoundCount = 0

  for (const exec of executions) {
    // Buscar la línea presupuestal por partida
    const { data: budgetLine } = await supabase
      .from("budget_lines")
      .select("id")
      .eq("cost_center_id", costCenterId)
      .eq("year", year)
      .eq("partida", exec.id_linea)
      .single()

    if (!budgetLine) {
      notFoundCount++
      continue
    }

    // Upsert monthly_execution
    const { error: upsertErr } = await supabase
      .from("monthly_executions")
      .upsert({
        budget_line_id: budgetLine.id,
        cost_center_id: costCenterId,
        year,
        month,
        budgeted_amount: exec.monto,
        projected_amount: exec.status === "executed" ? exec.monto : 0,
        executed_amount: exec.status === "executed" ? exec.monto : null,
        status: exec.status,
        rescheduled_to_month: exec.mes_reprogramado,
        notes: exec.motivo_variacion,
      }, {
        onConflict: "budget_line_id,year,month"
      })

    if (upsertErr) {
      console.error("Error al actualizar ejecución:", upsertErr)
      continue
    }

    updatedCount++
  }

  return apiSuccess({
    totalLines: executions.length,
    updatedCount,
    notFoundCount,
    message: `Se actualizaron ${updatedCount} líneas. ${notFoundCount} no se encontraron en el presupuesto.`
  })
}
