import { apiSuccess, apiError, apiForbidden } from "@/lib/api-helpers"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireRole } from "@/lib/auth/role-check"
import { inviteUserSchema } from "@/lib/validations"
import type { NextRequest } from "next/server"

// GET /api/admin/allowed-emails
export async function GET(_request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiError("No autenticado", 401)

  const role = await requireRole(user.id, ["super_admin"])
  if (!role) return apiForbidden()

  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from("allowed_emails")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) return apiError(error.message, 500)
  return apiSuccess(data)
}

// POST /api/admin/allowed-emails
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiError("No autenticado", 401)

  const role = await requireRole(user.id, ["super_admin"])
  if (!role) return apiForbidden()

  let body: unknown
  try { body = await request.json() } catch { return apiError("JSON inválido", 400) }

  const parsed = inviteUserSchema.safeParse(body)
  if (!parsed.success) return apiError((parsed.error as any).issues?.[0]?.message || "Datos inválidos", 422)

  const { email, role: assignedRole } = parsed.data
  const adminClient = createAdminClient()

  const { data, error } = await adminClient
    .from("allowed_emails")
    .insert({ email, assigned_role: assignedRole, invited_by: user.id })
    .select()
    .single()

  if (error) {
    if (error.code === "23505") return apiError("Este email ya está registrado", 409)
    return apiError(error.message, 500)
  }

  return apiSuccess(data, 201)
}
