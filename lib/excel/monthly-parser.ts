import * as XLSX from "xlsx"

export interface ParsedMonthlyExecution {
  id_linea: string
  partida: string
  responsible: string | null
  description: string | null
  ciudad_planta: string | null
  monto: number
  status: string
  mes_reprogramado: number | null
  motivo_variacion: string | null
}

function normalizeKey(k: string) {
  return k.toLowerCase().trim().replace(/\s+/g, " ")
}

function parseAmount(val: any): number {
  if (typeof val === "number") return val
  if (!val || typeof val !== "string") return 0
  
  const cleaned = val.replace(/[S/\s]/g, "")
  const noCommas = cleaned.replace(/,/g, "")
  const n = parseFloat(noCommas)
  return isNaN(n) ? 0 : n
}

function extractMonth(val: any): number | null {
  if (!val) return null
  if (val instanceof Date) {
    return val.getMonth() + 1
  }
  if (typeof val === "string") {
    const lower = val.toLowerCase().trim()
    const monthNames = [
      "enero", "febrero", "marzo", "abril", "mayo", "junio",
      "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
    ]
    const idx = monthNames.findIndex(m => lower.includes(m))
    if (idx >= 0) return idx + 1
    
    const parts = val.split("-")
    const num = parseInt(parts[parts.length - 1], 10)
    if (!isNaN(num) && num >= 1 && num <= 12) return num
  }
  if (typeof val === "number") {
    return val >= 1 && val <= 12 ? Math.floor(val) : null
  }
  return null
}

function normalizeStatus(val: any): string {
  if (!val) return "pending"
  const str = String(val).toLowerCase().trim()
  
  if (str.includes("ok") || str.includes("ejecut")) return "executed"
  if (str.includes("reprog")) return "rescheduled"
  if (str.includes("adelant")) return "advance"
  if (str.includes("ahorr")) return "savings"
  if (str.includes("cancel")) return "cancelled"
  if (str.includes("pendiente")) return "pending"
  
  return "pending"
}

export function parseMonthlyExcel(buffer: ArrayBuffer, year: number, month: number): ParsedMonthlyExecution[] {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true })

  // Buscar la hoja del mes específico o usar la primera
  let sheetName = workbook.SheetNames.find(n => 
    n.toLowerCase().includes("seguimiento") || 
    n.toLowerCase().includes("marzo") ||
    n.toLowerCase().includes("mes")
  )
  if (!sheetName) sheetName = workbook.SheetNames[0]
  if (!sheetName) throw new Error("El archivo Excel no contiene hojas")

  const sheet = workbook.Sheets[sheetName]
  if (!sheet) throw new Error("No se pudo leer la hoja del Excel")

  const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, {
    raw: true,
    defval: "",
    blankrows: false,
  })

  if (rows.length === 0) throw new Error("La hoja está vacía o no tiene datos")

  // Crear mapa de claves
  const colKeys = Object.keys(rows[0])
  const keyMap = new Map<string, string>()
  for (const k of colKeys) {
    keyMap.set(normalizeKey(k), k)
  }

  // Detectar columnas
  const fIdLinea = keyMap.get("id linea") || keyMap.get("id_linea") || keyMap.get("linea") || colKeys[0]
  const fResponsable = keyMap.get("responsable") || keyMap.get("area")
  const fPartida = keyMap.get("partida presupuestal") || keyMap.get("partida")
  const fDetalle = keyMap.get("detalle") || keyMap.get("descripcion") || keyMap.get("descripción")
  const fCiudadPlanta = keyMap.get("ciudad/planta") || keyMap.get("ciudad") || keyMap.get("planta") || keyMap.get("contacto")
  const fMonto = keyMap.get("monto s/") || keyMap.get("monto") || keyMap.get("importe (s/)") || keyMap.get("importe")
  const fStatus = keyMap.get("status") || keyMap.get("estado")
  const fMesReprog = keyMap.get("mes reprogramado") || keyMap.get("reprogramado a")
  const fMotivo = keyMap.get("motivo de variación") || keyMap.get("motivo de variacion") || keyMap.get("motivo")

  const results: ParsedMonthlyExecution[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    
    const idLinea = String(row[fIdLinea ?? ""] ?? "").trim()
    const partidaPresupuestal = String(row[fPartida ?? ""] ?? "").trim()

    // Saltar filas vacías
    if (!idLinea && !partidaPresupuestal) continue

    const uniqueKey = idLinea || partidaPresupuestal

    results.push({
      id_linea: uniqueKey,
      partida: partidaPresupuestal,
      responsible: row[fResponsable ?? ""] ? String(row[fResponsable!]).trim() : null,
      description: row[fDetalle ?? ""] ? String(row[fDetalle!]).trim() : null,
      ciudad_planta: row[fCiudadPlanta ?? ""] ? String(row[fCiudadPlanta!]).trim() : null,
      monto: parseAmount(row[fMonto ?? ""]),
      status: normalizeStatus(row[fStatus ?? ""]),
      mes_reprogramado: extractMonth(row[fMesReprog ?? ""]),
      motivo_variacion: row[fMotivo ?? ""] ? String(row[fMotivo!]).trim() : null,
    })
  }

  if (results.length === 0) {
    throw new Error("No se encontraron líneas válidas en la plantilla mensual")
  }

  return results
}
