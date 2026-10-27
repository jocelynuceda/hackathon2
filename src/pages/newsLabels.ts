import { ApiError } from '../api/client'
import { NEWS_STATUSES, type NewsDetail, type NewsPriority, type NewsStatus, type NewsType } from '../types/news'

export const TYPE_LABELS: Record<NewsType, string> = {
  BOUNTY_UPDATE: 'Recompensas',
  BATTLE: 'Batalla',
  MARINE_OPERATION: 'Operación Marine',
  WORLD_GOVERNMENT: 'Gobierno Mundial',
  DISCOVERY: 'Descubrimiento',
}

export const PRIORITY_LABELS: Record<NewsPriority, string> = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
}

export const PRIORITY_STYLES: Record<NewsPriority, string> = {
  LOW: 'bg-slate-400/10 text-slate-300',
  MEDIUM: 'bg-cyan-400/10 text-cyan-300',
  HIGH: 'bg-amber-400/10 text-amber-300',
  CRITICAL: 'bg-rose-400/15 text-rose-300',
}

export const STATUS_LABELS: Record<NewsStatus, string> = {
  RUMOR: 'Rumor',
  CONFIRMED: 'Confirmada',
  DEBUNKED: 'Desmentida',
}

export const STATUS_STYLES: Record<NewsStatus, string> = {
  RUMOR: 'border-amber-300/30 text-amber-200',
  CONFIRMED: 'border-emerald-300/30 text-emerald-300',
  DEBUNKED: 'border-rose-300/30 text-rose-300',
}

export const newsDate = new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' })

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Ocurrió un error inesperado.'
}

export function isLogPoseLocked(err: unknown): boolean {
  return err instanceof ApiError && err.code === 'LOG_POSE_REQUIRED'
}

// `current` llega como unknown en el 409: se valida antes de usarlo como noticia.
export function isNewsDetail(value: unknown): value is NewsDetail {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<NewsDetail>
  return (
    typeof candidate.id === 'string' &&
    NEWS_STATUSES.some((s) => s === candidate.status) &&
    Array.isArray(candidate.body)
  )
}
