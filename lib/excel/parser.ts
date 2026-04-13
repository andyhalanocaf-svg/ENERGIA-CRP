import * as XLSX from "xlsx"

export interface ParsedBudgetLine {
  line_number: number | null
  partida: string
  description: string | null
  responsible: string | null
  ciudad_planta: string | null
  category: "A" | "B"
  budget_jan: number
  budget_feb: number
  budget_mar: number
  budget_apr: number
  budget_may: number
  budget_jun: number
  budget_jul: number
  budget_aug: number
  budget_sep: number
  budget_oct: number
  budget_nov: number
  budget_dec: number
  total_annual: number
}

function normalizeKey(k: string) {
  return k.toLowerCase().trim()
}

function parseAmount(val: any): number {
  if (typeof val === "number") return val
  if (!val || typeof val !== "string") return 0
  
  const cleaned = val.replace(/[S/\s]/g, "")
  // Eliminamos las comas de miles y dejamos el punto decimal
  const noCommas = cleaned.replace(/,/g, "")
  const n = parseFloat(noCommas)
  return isNaN(n) ? 0 : n
}

function extractMonth(val: any): number {
  if (!val) return 0
  if (val instanceof Date) {
    return val.getMonth() + 1 // 1-12
  }
  if (typeof val === "string") {
    // try "2026-03" or "03"
    const parts = val.split("-")
    const num = parseInt(parts[parts.length - 1], 10)
    if (!isNaN(num) && num >= 1 && num <= 12) return num
  }
  if (typeof val === "number") {
    // Si viene solo el número de mes
    return val >= 1 && val <= 12 ? Math.floor(val) : 0
  }
  return 0
}

export function parseExcelBuffer(buffer: ArrayBuffer, year: number): ParsedBudgetLine[] {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true })

  // Buscar específicamente la hoja "Base Maestra" si existe, o usar la primera normal
  let sheetName = workbook.SheetNames.find(n => n.toLowerCase().includes("maestra"))
  if (!sheetName) sheetName = workbook.SheetNames[0]
  if (!sheetName) throw new Error("El archivo Excel no contiene hojas")

  const sheet = workbook.Sheets[sheetName]
  if (!sheet) throw new Error("No se pudo leer la hoja del Excel")

  // Retornamos raw objects
  const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, {
    raw: true, // Importante para conservar números y fechas
    defval: "",
    blankrows: false,
  })

  if (rows.length === 0) throw new Error("La hoja está vacía o no tiene datos")

  // Crear mapa de claves originales convertidas a lowercase
  const colKeys = Object.keys(rows[0])
  const keyMap = new Map<string, string>() // normalized -> original
  for (const k of colKeys) {
    keyMap.set(normalizeKey(k), k)
  }

  // Detectar cómo se llaman las columnas
  const fIdLinea = keyMap.get("id_linea") || keyMap.get("linea") || keyMap.get("id linea") || colKeys[0]
  const fResponsable = keyMap.get("responsable") || keyMap.get("area")
  const fPartida = keyMap.get("partida presupuestal") || keyMap.get("partida")
  const fArticulo = keyMap.get("articulo") || keyMap.get("artículo")
  const fDetalle = keyMap.get("detalle") || keyMap.get("descripcion") || keyMap.get("descripción")
  const fCiudadPlanta = keyMap.get("ciudad/planta") || keyMap.get("ciudad") || keyMap.get("planta") || keyMap.get("contacto")
  const fMes = keyMap.get("mes") || keyMap.get("periodo") || keyMap.get("mes reprogramado")
  const fImporte = keyMap.get("importe (s/)") || keyMap.get("importe") || keyMap.get("monto")
  const fCat = keyMap.get("categoria_control") || keyMap.get("categoria") || keyMap.get("categoría")

  // Mapa para acumular resultados (Pivot)
  const linesMap = new Map<string, ParsedBudgetLine>()

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    
    const idLinea = String(row[fIdLinea] ?? "").trim()
    const partidaPresupuestal = String(row[fPartida ?? ""] ?? "").trim()
    const mesVal = row[fMes ?? ""]
    const importe = parseAmount(row[fImporte ?? ""])

    // Si ni siquiera podemos identificar la fila, saltamos
    if (!idLinea && !partidaPresupuestal) continue

    const uniqueKey = idLinea || partidaPresupuestal

    if (!linesMap.has(uniqueKey)) {
      // Construir la descripción usando artículo y detalle si existe
      const descPart1 = row[fArticulo ?? ""] ? String(row[fArticulo!]).trim() : ""
      const descPart2 = row[fDetalle ?? ""] ? String(row[fDetalle!]).trim() : ""
      const description = `${partidaPresupuestal}${descPart1 ? ` - ${descPart1}` : ""}${descPart2 ? ` - ${descPart2}` : ""}`.trim()

      const rawCat = String(row[fCat ?? ""] ?? "").toUpperCase()
      const category: "A" | "B" = rawCat.includes("B") ? "B" : "A"

      linesMap.set(uniqueKey, {
        line_number: null,
        partida: uniqueKey.substring(0, 500), // Usamos ID_LINEA en la BD de forma estricta para evitar conflictos de únicas
        description: description.substring(0, 1000),
        responsible: row[fResponsable ?? ""] ? String(row[fResponsable!]).trim().substring(0, 200) : null,
        ciudad_planta: row[fCiudadPlanta ?? ""] ? String(row[fCiudadPlanta!]).trim().substring(0, 200) : null,
        category,
        budget_jan: 0, budget_feb: 0, budget_mar: 0,
        budget_apr: 0, budget_may: 0, budget_jun: 0,
        budget_jul: 0, budget_aug: 0, budget_sep: 0,
        budget_oct: 0, budget_nov: 0, budget_dec: 0,
        total_annual: 0
      })
    }

    const current = linesMap.get(uniqueKey)!
    const mo = extractMonth(mesVal)

    switch (mo) {
      case 1: current.budget_jan += importe; break;
      case 2: current.budget_feb += importe; break;
      case 3: current.budget_mar += importe; break;
      case 4: current.budget_apr += importe; break;
      case 5: current.budget_may += importe; break;
      case 6: current.budget_jun += importe; break;
      case 7: current.budget_jul += importe; break;
      case 8: current.budget_aug += importe; break;
      case 9: current.budget_sep += importe; break;
      case 10: current.budget_oct += importe; break;
      case 11: current.budget_nov += importe; break;
      case 12: current.budget_dec += importe; break;
    }
  }

  // Finalizar calculando los totales de cada fila acumulada
  const result = Array.from(linesMap.values())

  for (const group of result) {
    group.total_annual = (
      group.budget_jan + group.budget_feb + group.budget_mar +
      group.budget_apr + group.budget_may + group.budget_jun +
      group.budget_jul + group.budget_aug + group.budget_sep +
      group.budget_oct + group.budget_nov + group.budget_dec
    )
  }

  const finalLines = result.filter(r => r.total_annual !== 0 || r.partida)

  if (finalLines.length === 0) {
    throw new Error("No se encontraron líneas presupuestales válidas en el archivo (ningún mes tuvo datos)")
  }

  return finalLines
}
