// ===========================
// PresupAI — Constantes Globales
// ===========================

export const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
] as const

export const MONTHS_SHORT_ES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
] as const

export const MONTH_KEYS = [
  'budget_jan', 'budget_feb', 'budget_mar', 'budget_apr',
  'budget_may', 'budget_jun', 'budget_jul', 'budget_aug',
  'budget_sep', 'budget_oct', 'budget_nov', 'budget_dec',
] as const

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  ANALYST: 'analyst',
  VIEWER: 'viewer',
} as const

export const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Administrador',
  analyst: 'Analista',
  viewer: 'Visualizador',
}

export const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  admin: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  analyst: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  viewer: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
}

export const EXECUTION_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  executed: 'Ejecutado',
  rescheduled: 'Reprogramado',
  advance: 'Adelantado',
  savings: 'Ahorro',
  cancelled: 'Cancelado',
}

export const EXECUTION_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-zinc-500/20 text-zinc-400',
  executed: 'bg-emerald-500/20 text-emerald-400',
  rescheduled: 'bg-amber-500/20 text-amber-400',
  advance: 'bg-blue-500/20 text-blue-400',
  savings: 'bg-purple-500/20 text-purple-400',
  cancelled: 'bg-red-500/20 text-red-400',
}

export const KB_CATEGORY_LABELS: Record<string, string> = {
  faq: 'Preguntas Frecuentes',
  process: 'Proceso',
  definition: 'Definición',
  context: 'Contexto',
  policy: 'Política',
}

export const AVAILABLE_YEARS = [2024, 2025, 2026, 2027]

export const MAX_UPLOAD_SIZE_MB = 10
export const MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024
export const ALLOWED_FILE_TYPES = ['.xlsx', '.xls']

export const APP_NAME = 'PresupAI'
export const APP_VERSION = '1.0.0'
export const COST_CENTER_CODE = 'CC231'
