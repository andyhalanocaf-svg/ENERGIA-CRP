import { apiSuccess, apiError, apiForbidden } from "@/lib/api-helpers"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireRole } from "@/lib/auth/role-check"
import { kbDocumentSchema } from "@/lib/validations"
import { generateEmbedding } from "@/lib/ai/embeddings"
import type { NextRequest } from "next/server"

// GET /api/chat/kb
export async function GET(_request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiError("No autenticado", 401)

  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from("kb_documents")
    .select("id, title, category, tags, is_active, version, created_at, updated_at")
    .order("updated_at", { ascending: false })

  if (error) return apiError(error.message, 500)
  return apiSuccess(data)
}

// POST /api/chat/kb
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiError("No autenticado", 401)

  const role = await requireRole(user.id, ["super_admin", "admin"])
  if (!role) return apiForbidden()

  let body: unknown
  try { body = await request.json() } catch { return apiError("JSON inválido", 400) }

  const parsed = kbDocumentSchema.safeParse(body)
  if (!parsed.success) return apiError((parsed.error as any).issues?.[0]?.message || "Datos inválidos", 422)

  const { title, content, category, tags } = parsed.data
  const adminClient = createAdminClient()

  // Generar embedding (best-effort)
  let embedding: number[] | null = null
  try {
    embedding = await generateEmbedding(`${title}\n\n${content}`)
  } catch (e) {
    console.warn("[KB] Embedding falló, guardando sin vector:", e)
  }

  const { data, error } = await adminClient
    .from("kb_documents")
    .insert({
      title, content, category,
      tags: tags ?? [],
      is_active: true,
      version: 1,
      created_by: user.id,
      updated_by: user.id,
      ...(embedding && { embedding }),
    })
    .select("id, title, category, is_active, created_at")
    .single()

  if (error) return apiError(error.message, 500)
  return apiSuccess(data, 201)
}
