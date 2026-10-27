import { NEWS_PRIORITIES, NEWS_STATUSES, NEWS_TYPES, type NewsQuery } from '../types/news'

function pick<T extends string>(allowed: readonly T[], raw: string | null): T | null {
  return allowed.find((v) => v === raw) ?? null
}

// La URL es la fuente de verdad de los filtros. Un valor inválido se descarta.
export function parseNewsQuery(sp: URLSearchParams): NewsQuery {
  return {
    type: pick(NEWS_TYPES, sp.get('type')),
    priority: pick(NEWS_PRIORITIES, sp.get('priority')),
    status: pick(NEWS_STATUSES, sp.get('status')),
  }
}

// Orden fijo: la misma combinación de filtros produce siempre el mismo string,
// que también sirve como "llave" para saber a qué filtros pertenece cada respuesta.
export function serializeNewsQuery(query: NewsQuery): URLSearchParams {
  const sp = new URLSearchParams()
  if (query.type) sp.set('type', query.type)
  if (query.priority) sp.set('priority', query.priority)
  if (query.status) sp.set('status', query.status)
  return sp
}
