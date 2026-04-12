// ===========================
// PresupAI — Utilidades de Formato
// ===========================

import { MONTHS_ES, MONTHS_SHORT_ES } from './constants'

/**
 * Formatea un número como moneda en Soles Peruanos
 * Ej: 1234567.89 → "S/ 1,234,567.89"
 */
export function formatCurrency(amount: number, compact = false): string {
  if (compact && Math.abs(amount) >= 1_000_000) {
    return `S/ ${(amount / 1_000_000).toFixed(1)}M`
  }
  if (compact && Math.abs(amount) >= 1_000) {
    return `S/ ${(amount / 1_000).toFixed(0)}K`
  }
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    currencyDisplay: 'symbol',
  })
    .format(amount)
    .replace('PEN', 'S/')
    .trim()
}

/**
 * Formatea un número como porcentaje
 * Ej: 0.8567 → "85.7%"
 */
export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`
}

/**
 * Formatea un porcentaje donde el input ya es 0-100
 * Ej: 85.67 → "85.7%"
 */
export function formatPercentInt(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

/**
 * Variación de presupuesto con signo
 * Ej: +12,500.00 | -8,200.00
 */
export function formatVariance(amount: number): string {
  const prefix = amount > 0 ? '+' : ''
  return `${prefix}${formatCurrency(amount)}`
}

/**
 * Nombre del mes en español (1-indexed)
 * Ej: 4 → "Abril"
 */
export function getMonthName(month: number, short = false): string {
  const idx = Math.max(0, Math.min(11, month - 1))
  return short ? MONTHS_SHORT_ES[idx] : MONTHS_ES[idx]
}

/**
 * Formatea fecha ISO a formato local
 * Ej: "2026-04-12T..." → "12 abr 2026"
 */
export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateStr))
}

/**
 * Formatea fecha con hora
 */
export function formatDateTime(dateStr: string): string {
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr))
}

/**
 * Tamaño de archivo legible
 * Ej: 1234567 → "1.2 MB"
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Calcula tasa de ejecución como porcentaje 0-100
 */
export function calcExecutionRate(executed: number, budgeted: number): number {
  if (budgeted === 0) return 0
  return Math.min(999, (executed / budgeted) * 100)
}

/**
 * Color de semáforo según tasa de ejecución (0-100)
 */
export function getExecutionColor(rate: number): 'success' | 'warning' | 'danger' | 'default' {
  if (rate >= 90 && rate <= 110) return 'success'
  if (rate >= 75 || rate <= 120) return 'warning'
  return 'danger'
}
