import { apiSuccess, apiError, apiForbidden, apiNotFound } from "@/lib/api-helpers"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireRole } from "@/lib/auth/role-check"
import { updateKbDocumentSchema } from "@/lib/validations"
import { generateEmbedding } from "@/lib/ai/embeddings"
import type { NextRequest } from "next/server"

// PATCH /api/chat/kb/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiError("No autenticado", 401)

  const role = await requireRole(user.id, ["super_admin", "admin"])
  if (!role) return apiForbidden()

  const { id } = await params
  let body: unknown
  try { body = await request.json() } catch { return apiError("JSON inválido", 400) }

  const parsed = updateKbDocumentSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.errors[0].message, 422)

  const adminClient = createAdminClient()
  const { data: existing } = await adminClient
    .from("kb_documents").select("id, title, content").eq("id", id).single()
  if (!existing) return apiNotFound("Documento")

  const updateData: Record<string, unknown> = {
    ...parsed.data,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  }

  // Re-vectorizar si hay cambio de contenido o título
  if (parsed.data.content || parsed.data.title) {
    try {
      updateData.embedding = await generateEmbedding(
        `${parsed.data.title ?? existing.title}\n\n${parsed.data.content ?? existing.content}`
      )
    } catch (e) {
      console.warn("[KB] Re-vectorizado falló:", e)
    }
  }

  const { data, error } = await adminClient
    .from("kb_documents")
    .update(updateData)
    .eq("id", id)
    .select("id, title, is_active, version, updated_at")
    .single()

  if (error) return apiError(error.message, 500)
  return apiSuccess(data)
}

// DELETE /api/chat/kb/[id]
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

  const { error } = await adminClient.from("kb_documents").delete().eq("id", id)
  if (error) return apiError(error.message, 500)

  return apiSuccess({ deleted: id })
}
