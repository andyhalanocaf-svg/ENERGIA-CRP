import { apiError, apiSuccess, apiForbidden } from "@/lib/api-helpers"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { MAX_UPLOAD_SIZE_BYTES, ALLOWED_FILE_TYPES } from "@/lib/constants"
import type { NextRequest } from "next/server"

// POST /api/upload/excel
// Recibe el archivo, valida, sube a Supabase Storage y crea registro
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return apiError("No autenticado", 401)

  // Verificar rol con cliente normal (autenticado)
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
  const year = yearStr ? Number(yearStr) : new Date().getFullYear()

  if (!file) return apiError("No se recibió ningún archivo", 400)

  // Validar extensión
  const ext = file.name.split(".").pop()?.toLowerCase()
  if (!ext || !["xlsx", "xls"].includes(ext)) {
    return apiError(`Formato inválido. Solo ${ALLOWED_FILE_TYPES.join(", ")}`, 400)
  }

  // Validar tamaño
  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    return apiError(`El archivo excede el límite permitido`, 400)
  }

  // Nombre único en Storage
  const timestamp = Date.now()
  const safeName = file.name.replace(/[^a-z0-9.\-_]/gi, "_")
  const storagePath = `excel-uploads/${user.id}/${year}/${timestamp}_${safeName}`

  // Subir a Supabase Storage
  const arrayBuffer = await file.arrayBuffer()
  const { error: storageError } = await supabase.storage
    .from("excel-uploads")
    .upload(storagePath, new Uint8Array(arrayBuffer), {
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      upsert: false,
    })

  if (storageError) {
    return apiError(`Error al almacenar el archivo: ${storageError.message}`, 500)
  }

  // Crear registro en file_uploads
  const { data: upload, error: dbError } = await supabase
    .from("file_uploads")
    .insert({
      filename: file.name,
      storage_path: storagePath,
      file_size: file.size,
      uploaded_by: user.id,
      year,
      file_type: "master_annual",
      status: "pending",
    })
    .select()
    .single()

  if (dbError) {
    return apiError(`Error al registrar la carga: ${dbError.message}`, 500)
  }

  return apiSuccess(upload, 201)
}
