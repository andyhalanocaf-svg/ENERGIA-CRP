import { z } from 'zod'

// ─── Auth ────────────────────────────────────────────────
export const loginSchema = z.object({
  email: z.string().email('Email inválido').toLowerCase().trim(),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
})

// ─── Usuarios / Admin ────────────────────────────────────
export const inviteUserSchema = z.object({
  email: z.string().email('Email inválido').toLowerCase().trim(),
  role: z.enum(['admin', 'analyst', 'viewer'], {
    message: 'Rol inválido',
  }),
})

export const updateUserRoleSchema = z.object({
  role: z.enum(['super_admin', 'admin', 'analyst', 'viewer']),
})

export const updateUserStatusSchema = z.object({
  is_active: z.boolean(),
})

// ─── Upload Excel ────────────────────────────────────────
export const uploadExcelSchema = z.object({
  costCenterId: z.string().uuid('ID de centro de costo inválido'),
  year: z.number().int().min(2020).max(2030),
})

export const processUploadSchema = z.object({
  uploadId: z.string().uuid(),
  costCenterId: z.string().uuid(),
  year: z.number().int().min(2020).max(2030),
})

// ─── Knowledge Base ──────────────────────────────────────
export const kbDocumentSchema = z.object({
  title: z.string().min(3, 'El título debe tener al menos 3 caracteres').max(255),
  content: z.string().min(10, 'El contenido debe tener al menos 10 caracteres'),
  category: z.enum(['faq', 'process', 'definition', 'context', 'policy']),
  tags: z.array(z.string()).optional().default([]),
})

export const updateKbDocumentSchema = kbDocumentSchema.partial().extend({
  is_active: z.boolean().optional(),
})

// ─── Chat ────────────────────────────────────────────────
export const chatMessageSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string().min(1),
    })
  ).min(1),
  sessionId: z.string().uuid().optional(),
})

// ─── Budget Filters ──────────────────────────────────────
export const budgetFilterSchema = z.object({
  year: z.coerce.number().int().min(2020).max(2030),
  month: z.coerce.number().int().min(1).max(12).optional(),
  costCenterId: z.string().uuid().optional(),
  category: z.enum(['A', 'B']).optional(),
  responsible: z.string().optional(),
})

export type LoginInput = z.infer<typeof loginSchema>
export type InviteUserInput = z.infer<typeof inviteUserSchema>
export type UploadExcelInput = z.infer<typeof uploadExcelSchema>
export type KbDocumentInput = z.infer<typeof kbDocumentSchema>
export type ChatMessageInput = z.infer<typeof chatMessageSchema>
export type BudgetFilterInput = z.infer<typeof budgetFilterSchema>
