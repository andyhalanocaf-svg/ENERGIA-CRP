import { apiError, apiSuccess } from "@/lib/api-helpers"
import { createClient } from "@/lib/supabase/server"
import type { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiError("No autenticado", 401)

  let body: { executions: any[] }
  try {
    body = await request.json()
  } catch {
    return apiError("JSON inválido", 400)
  }

  const { executions } = body
  if (!executions || !Array.isArray(executions)) {
    return apiError("Se requiere un array de 'executions'", 400)
  }

  // Set the validated_by and validated_at
  const currentTimestamp = new Date().toISOString()
  
  const records = executions.map(ex => ({
    ...ex,
    validated_by: user.id,
    validated_at: currentTimestamp,
    validated: true,
  }))

  // Bulk upsert into monthly_executions
  const BATCH_SIZE = 50
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE)
    const { error: upsertErr } = await supabase
      .from("monthly_executions")
      .upsert(batch, { onConflict: "budget_line_id,year,month" })

    if (upsertErr) {
      console.error("[Bulk Execution Error]", upsertErr)
      return apiError(`Error al guardar validaciones: ${upsertErr.message}`, 500)
    }
  }

  return apiSuccess({ savedCount: records.length })
}
