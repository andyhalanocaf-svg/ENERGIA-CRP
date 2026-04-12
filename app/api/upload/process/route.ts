import { apiError, apiSuccess } from "@/lib/api-helpers"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { parseExcelBuffer } from "@/lib/excel/parser"
import type { NextRequest } from "next/server"

// POST /api/upload/process
// Descarga de Storage, parsea con SheetJS, hace upsert en budget_lines
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiError("No autenticado", 401)

  let body: { uploadId: string; year: number }
  try {
    body = await request.json()
  } catch {
    return apiError("JSON inválido", 400)
  }

  const { uploadId, year } = body
  if (!uploadId || !year) return apiError("uploadId y year son requeridos", 400)

  // Obtener registro del upload
  const { data: upload, error: uploadErr } = await supabase
    .from("file_uploads")
    .select("*")
    .eq("id", uploadId)
    .single()

  if (uploadErr || !upload) return apiError("Upload no encontrado", 404)

  // Marcar como procesando
  await supabase
    .from("file_uploads")
    .update({ status: "processing" })
    .eq("id", uploadId)

  // Descargar de Storage
  const { data: fileData, error: downloadErr } = await supabase.storage
    .from("excel-uploads")
    .download(upload.storage_path)

  if (downloadErr || !fileData) {
    await supabase
      .from("file_uploads")
      .update({ status: "failed", error_message: "No se pudo descargar el archivo" })
      .eq("id", uploadId)
    return apiError("Error al descargar el archivo del storage", 500)
  }

  // Parsear Excel
  let lines: ReturnType<typeof parseExcelBuffer>
  try {
    const buffer = await fileData.arrayBuffer()
    lines = parseExcelBuffer(buffer, year)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error de parseo"
    await supabase
      .from("file_uploads")
      .update({ status: "failed", error_message: msg })
      .eq("id", uploadId)
    return apiError(`Error al parsear el Excel: ${msg}`, 422)
  }

  if (!lines || lines.length === 0) {
    await supabase
      .from("file_uploads")
      .update({ status: "failed", error_message: "No se encontraron líneas válidas" })
      .eq("id", uploadId)
    return apiError("El archivo no contiene líneas presupuestales válidas", 422)
  }

  // Upsert de líneas (en lotes de 100)
  const BATCH_SIZE = 100
  let totalInserted = 0

  // Obtener/crear cost_center
  let costCenterId = upload.cost_center_id
  if (!costCenterId) {
    const { data: cc } = await supabase
      .from("cost_centers")
      .select("id")
      .eq("code", "CC231")
      .single()
    costCenterId = cc?.id
  }

  const records = lines.map(line => ({
    ...line,
    upload_id: uploadId,
    cost_center_id: costCenterId,
    year,
  }))

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE)
    const { error: upsertErr } = await supabase
      .from("budget_lines")
      .upsert(batch, { onConflict: "cost_center_id,year,partida" })

    if (upsertErr) {
      await supabase
        .from("file_uploads")
        .update({ status: "failed", error_message: upsertErr.message })
        .eq("id", uploadId)
      return apiError(`Error al guardar líneas: ${upsertErr.message}`, 500)
    }
    totalInserted += batch.length
  }

  // Marcar como completado
  await supabase
    .from("file_uploads")
    .update({
      status: "completed",
      rows_processed: totalInserted,
      processed_at: new Date().toISOString(),
    })
    .eq("id", uploadId)

  return apiSuccess({ rowsProcessed: totalInserted, uploadId })
}
