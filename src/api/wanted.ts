import type { Crew, WantedDetail, WantedPage, WantedQuery } from '../types/wanted'
import { apiRequest } from './client'

type RequestOptions = {
  token: string | null
  signal?: AbortSignal
}

export function getWanted(query: WantedQuery, { token, signal }: RequestOptions): Promise<WantedPage> {
  const params = new URLSearchParams({
    page: String(query.page),
    size: String(query.size),
    sort: query.sort,
  })
  if (query.status) params.set('status', query.status)
  if (query.crewId) params.set('crewId', query.crewId)
  if (query.fruit) params.set('fruit', query.fruit)
  if (query.q) params.set('q', query.q)
  return apiRequest<WantedPage>(`/wanted?${params.toString()}`, { token, signal })
}

export function getWantedById(id: string, { token, signal }: RequestOptions): Promise<WantedDetail> {
  return apiRequest<WantedDetail>(`/wanted/${encodeURIComponent(id)}`, { token, signal })
}

export function getCrews({ token, signal }: RequestOptions): Promise<Crew[]> {
  return apiRequest<Crew[]>('/crews', { token, signal })
}
