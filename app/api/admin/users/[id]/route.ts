import { apiSuccess, apiError, apiForbidden, apiNotFound } from "@/lib/api-helpers"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireRole } from "@/lib/auth/role-check"
import { updateUserRoleSchema, updateUserStatusSchema } from "@/lib/validations"
import type { NextRequest } from "next/server"

// PATCH /api/admin/users/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiError("No autenticado", 401)

  const role = await requireRole(user.id, ["super_admin"])
  if (!role) return apiForbidden()

  const { id } = await params
  let body: unknown
  try { body = await request.json() } catch { return apiError("JSON inválido", 400) }

  const adminClient = createAdminClient()
  const { data: existing } = await adminClient
    .from("profiles").select("id").eq("id", id).single()
  if (!existing) return apiNotFound("Usuario")

  const b = body as Record<string, unknown>
  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if ("role" in b) {
    const parsed = updateUserRoleSchema.safeParse(b)
    if (!parsed.success) return apiError(parsed.error.errors[0].message, 422)
    updateData.role = parsed.data.role
  }
  if ("is_active" in b) {
    const parsed = updateUserStatusSchema.safeParse(b)
    if (!parsed.success) return apiError(parsed.error.errors[0].message, 422)
    updateData.is_active = parsed.data.is_active
  }

  const { data, error } = await adminClient
    .from("profiles")
    .update(updateData)
    .eq("id", id)
    .select("id, email, role, is_active")
    .single()

  if (error) return apiError(error.message, 500)
  return apiSuccess(data)
}

// DELETE /api/admin/users/[id] — soft delete (deactivate)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiError("No autenticado", 401)

  const role = await requireRole(user.id, ["super_admin"])
  if (!role) return apiForbidden()

  const { id } = await params
  const adminClient = createAdminClient()

  const { error } = await adminClient
    .from("profiles")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id)

  if (error) return apiError(error.message, 500)
  return apiSuccess({ deactivated: id })
}
