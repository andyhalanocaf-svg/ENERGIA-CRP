// ===========================
// PresupAI — Tipos Globales
// ===========================

// ─── Roles ──────────────────────────────────────────────
export type UserRole = 'super_admin' | 'admin' | 'analyst' | 'viewer'

// ─── Usuario / Perfil ───────────────────────────────────
export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: UserRole
  is_active: boolean
  created_at: string
  updated_at: string
}

// ─── Centro de Costo ────────────────────────────────────
export interface CostCenter {
  id: string
  code: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
}

// ─── Email Permitido ────────────────────────────────────
export interface AllowedEmail {
  id: string
  email: string
  assigned_role: Exclude<UserRole, 'super_admin'>
  invited_by: string | null
  accepted_at: string | null
  created_at: string
}

// ─── Upload de Excel ────────────────────────────────────
export type UploadStatus = 'pending' | 'processing' | 'completed' | 'failed'
export type FileType = 'master_annual' | 'monthly_tracking'

export interface FileUpload {
  id: string
  filename: string
  storage_path: string
  file_size: number | null
  uploaded_by: string | null
  cost_center_id: string | null
  year: number
  file_type: FileType
  status: UploadStatus
  error_message: string | null
  rows_processed: number
  processed_at: string | null
  created_at: string
}

// ─── Líneas de Presupuesto ──────────────────────────────
export interface BudgetLine {
  id: string
  upload_id: string | null
  cost_center_id: string
  year: number
  line_number: number | null
  partida: string
  description: string | null
  responsible: string | null
  category: 'A' | 'B'
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
  created_at: string
  updated_at: string
}

// ─── Ejecución Mensual ──────────────────────────────────
export type ExecutionStatus =
  | 'pending'
  | 'executed'
  | 'rescheduled'
  | 'advance'
  | 'savings'
  | 'cancelled'

export interface MonthlyExecution {
  id: string
  budget_line_id: string
  cost_center_id: string
  upload_id: string | null
  year: number
  month: number
  budgeted_amount: number
  executed_amount: number | null
  projected_amount: number | null
  savings_amount: number
  status: ExecutionStatus
  rescheduled_to_month: number | null
  rescheduled_from_month: number | null
  rescheduled_year: number | null
  validated: boolean
  validated_by: string | null
  validated_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

// ─── Knowledge Base (Chatbot) ───────────────────────────
export type KbCategory = 'faq' | 'process' | 'definition' | 'context' | 'policy'

export interface KbDocument {
  id: string
  title: string
  content: string
  category: KbCategory
  tags: string[]
  is_active: boolean
  version: number
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

// ─── Chat ───────────────────────────────────────────────
export type ChatRole = 'user' | 'assistant' | 'system'

export interface ChatSession {
  id: string
  user_id: string
  title: string
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: string
  session_id: string
  role: ChatRole
  content: string
  tokens_used: number | null
  metadata: Record<string, unknown>
  created_at: string
}

// ─── API Response Types ─────────────────────────────────
export interface ApiSuccess<T> {
  success: true
  data: T
  meta?: { total?: number; page?: number; pageSize?: number }
}

export interface ApiError {
  success: false
  error: string
  code?: string
  details?: unknown
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError

// ─── Dashboard Types ────────────────────────────────────
export interface MonthSummary {
  month: number
  monthName: string
  totalBudget: number
  totalExecuted: number
  totalProjected: number
  executionRate: number
  variance: number
}

export interface AnnualSummary {
  year: number
  totalBudget: number
  executionRate: number
  months: MonthSummary[]
  categoryA: number
  categoryB: number
}

export interface PartidaSummary {
  partida: string
  responsible: string
  category: 'A' | 'B'
  budgeted: number
  executed: number
  projected: number
  savings: number
  executionRate: number
  status: ExecutionStatus
}
