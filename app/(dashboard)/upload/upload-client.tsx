"use client"

import { useState, useCallback, useRef } from "react"
import { formatFileSize } from "@/lib/formatters"
import { ALLOWED_FILE_TYPES, MAX_UPLOAD_SIZE_MB, MAX_UPLOAD_SIZE_BYTES } from "@/lib/constants"
import {
  Upload, FileSpreadsheet, CheckCircle2, XCircle,
  Loader2, AlertTriangle, CloudUpload, Clock,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Main Client Component ────────────────────────────────
export function UploadClient() {
  const [uploadType, setUploadType] = useState<"master" | "monthly">("master")

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Subir Archivo <span className="text-gradient-brand">Excel</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Carga el Archivo Maestro o una Plantilla Mensual de seguimiento
        </p>
      </div>

      {/* Selector de tipo de archivo */}
      <div className="flex gap-3 p-1 bg-muted/30 rounded-lg w-fit">
        <button
          onClick={() => setUploadType("master")}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md transition-all",
            uploadType === "master"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Archivo Maestro
        </button>
        <button
          onClick={() => setUploadType("monthly")}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md transition-all",
            uploadType === "monthly"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Plantilla Mensual
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <FileUploadZone uploadType={uploadType} />
        </div>
        <div className="lg:col-span-2">
          <UploadInstructions uploadType={uploadType} />
        </div>
      </div>

      <UploadHistory />
    </div>
  )
}

// ─── Upload Zone ──────────────────────────────────────────
function FileUploadZone({ uploadType }: { uploadType: "master" | "monthly" }) {
  const [dragOver, setDragOver] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<"idle" | "uploading" | "processing" | "done" | "error">("idle")
  const [progress, setProgress] = useState(0)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((f: File) => {
    setErrorMsg(null)
    setSuccessMsg(null)
    setStatus("idle")
    const ext = f.name.split(".").pop()?.toLowerCase()
    if (!ext || !["xlsx", "xls"].includes(ext)) {
      setErrorMsg("Formato no soportado. Solo .xlsx o .xls")
      return
    }
    if (f.size > MAX_UPLOAD_SIZE_BYTES) {
      setErrorMsg(`El archivo excede el límite de ${MAX_UPLOAD_SIZE_MB}MB`)
      return
    }
    setFile(f)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) handleFile(dropped)
  }, [handleFile])

  async function handleUpload() {
    if (!file) return
    setStatus("uploading")
    setProgress(10)
    setErrorMsg(null)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("year", String(new Date().getFullYear()))

      if (uploadType === "monthly") {
        formData.append("month", String(selectedMonth))
        
        setProgress(30)
        const uploadRes = await fetch("/api/upload/monthly", { method: "POST", body: formData })
        setProgress(90)
        
        if (!uploadRes.ok) {
          const err = await uploadRes.json()
          throw new Error(err.error || "Error al procesar la plantilla mensual")
        }

        const { data } = await uploadRes.json()
        setProgress(100)
        setStatus("done")
        setSuccessMsg(`✓ ${data.updatedCount} líneas actualizadas. ${data.notFoundCount > 0 ? `${data.notFoundCount} no encontradas.` : ""}`)
      } else {
        // Flujo original para archivo maestro
        setProgress(30)
        const uploadRes = await fetch("/api/upload/excel", { method: "POST", body: formData })
        if (!uploadRes.ok) {
          const err = await uploadRes.json()
          throw new Error(err.error || "Error al subir el archivo")
        }

        const { data: uploadData } = await uploadRes.json()
        setProgress(60)
        setStatus("processing")

        const processRes = await fetch("/api/upload/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uploadId: uploadData.id, year: new Date().getFullYear() }),
        })
        setProgress(90)

        if (!processRes.ok) {
          const err = await processRes.json()
          throw new Error(err.error || "Error al procesar el archivo")
        }

        const { data: processData } = await processRes.json()
        setProgress(100)
        setStatus("done")
        setSuccessMsg(`✓ ${processData.rowsProcessed} líneas procesadas correctamente`)
      }
    } catch (err) {
      setStatus("error")
      setErrorMsg(err instanceof Error ? err.message : "Error desconocido")
    }
  }

  const reset = () => {
    setFile(null); setStatus("idle"); setProgress(0)
    setErrorMsg(null); setSuccessMsg(null)
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        id="upload-dropzone"
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !file && inputRef.current?.click()}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-all duration-200 cursor-pointer",
          dragOver ? "border-primary bg-primary/10 scale-[1.01]"
            : file ? "border-primary/50 bg-primary/5"
            : "border-border bg-card hover:border-primary/50 hover:bg-primary/5"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        {file ? (
          <div className="space-y-2">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/15 border border-primary/30 mx-auto">
              <FileSpreadsheet className="h-7 w-7 text-primary" />
            </div>
            <p className="font-semibold text-foreground">{file.name}</p>
            <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-muted border border-border mx-auto">
              <CloudUpload className="h-7 w-7 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Arrastra tu archivo aquí</p>
              <p className="text-sm text-muted-foreground">o haz click para seleccionar</p>
            </div>
            <p className="text-xs text-muted-foreground">
              {ALLOWED_FILE_TYPES.join(", ")} · Máx. {MAX_UPLOAD_SIZE_MB}MB
            </p>
          </div>
        )}
      </div>

      {/* Progress */}
      {(status === "uploading" || status === "processing") && (
        <div className="space-y-2 animate-fade-in">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {status === "uploading" ? "Subiendo archivo..." : "Procesando datos..."}
            </span>
            <span className="font-mono text-primary">{progress}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error / Success alerts */}
      {errorMsg && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 animate-fade-in">
          <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          <p className="text-sm text-destructive">{errorMsg}</p>
        </div>
      )}
      {successMsg && (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
          <p className="text-sm text-emerald-400">{successMsg}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {uploadType === "monthly" && file && status === "idle" && (
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">Mes de la plantilla</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="w-full h-10 rounded-md border border-border bg-card px-3 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            >
              <option value="1">Enero</option>
              <option value="2">Febrero</option>
              <option value="3">Marzo</option>
              <option value="4">Abril</option>
              <option value="5">Mayo</option>
              <option value="6">Junio</option>
              <option value="7">Julio</option>
              <option value="8">Agosto</option>
              <option value="9">Septiembre</option>
              <option value="10">Octubre</option>
              <option value="11">Noviembre</option>
              <option value="12">Diciembre</option>
            </select>
          </div>
        )}
        {file && status === "idle" && (
          <button
            id="btn-upload-submit"
            onClick={handleUpload}
            className="flex-1 h-10 rounded-md bg-primary text-primary-foreground text-sm font-semibold
                       hover:opacity-90 hover:[box-shadow:3px_3px_0px_oklch(0.62_0.18_155_/_0.5)] transition-all flex items-center justify-center gap-2"
          >
            <Upload className="h-4 w-4" /> {uploadType === "monthly" ? "Actualizar Mes" : "Subir y Procesar"}
          </button>
        )}
        {(file || status === "done" || status === "error") && (
          <button
            id="btn-upload-reset"
            onClick={reset}
            className="h-10 px-4 rounded-md border border-border bg-card text-sm text-muted-foreground hover:bg-accent/10 transition-colors"
          >
            {status === "done" ? "Subir otro" : "Cancelar"}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Instrucciones ────────────────────────────────────────
function UploadInstructions({ uploadType }: { uploadType: "master" | "monthly" }) {
  const masterSteps = [
    { n: "1", text: "Exporta el Archivo Maestro de SAP en formato Excel (.xlsx)" },
    { n: "2", text: "Verifica que la hoja tenga el formato estándar CC231 con columnas de meses" },
    { n: "3", text: "Arrastra o selecciona el archivo en la zona de upload" },
    { n: "4", text: "El sistema procesará las líneas y actualizará el dashboard automáticamente" },
  ]

  const monthlySteps = [
    { n: "1", text: "Descarga la plantilla mensual del mes que deseas actualizar" },
    { n: "2", text: "Llena las columnas STATUS, MES REPROGRAMADO y MOTIVO DE VARIACIÓN" },
    { n: "3", text: "Selecciona el mes correspondiente y arrastra el archivo" },
    { n: "4", text: "El sistema actualizará el estado de cada línea presupuestal" },
  ]

  const steps = uploadType === "master" ? masterSteps : monthlySteps

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <h3 className="text-sm font-semibold text-foreground">
        {uploadType === "master" ? "Instrucciones - Archivo Maestro" : "Instrucciones - Plantilla Mensual"}
      </h3>
      <ol className="space-y-3">
        {steps.map(s => (
          <li key={s.n} className="flex items-start gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/20 text-[10px] font-bold text-primary">
              {s.n}
            </span>
            <p className="text-xs text-muted-foreground leading-relaxed">{s.text}</p>
          </li>
        ))}
      </ol>
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-400 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-400/90">
            {uploadType === "master" 
              ? "La carga sobreescribe los datos del año. Sube el archivo completo."
              : "Solo se actualizarán las líneas que coincidan con el presupuesto maestro."}
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Upload History ───────────────────────────────────────
function UploadHistory() {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden animate-fade-up stagger-3">
      <div className="border-b border-border px-5 py-3">
        <h3 className="text-sm font-semibold text-foreground">Historial de Cargas</h3>
      </div>
      <div className="flex items-center justify-center py-12 text-center">
        <div>
          <FileSpreadsheet className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Sin cargas anteriores</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            El historial de archivos subidos aparecerá aquí
          </p>
        </div>
      </div>
    </div>
  )
}
