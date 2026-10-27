import type { NewsDetail, NewsFeedPage, NewsQuery, VerifiedStatus } from '../types/news'
import { apiRequest } from './client'

type RequestOptions = {
  token: string | null
  signal?: AbortSignal
}

export const FEED_LIMIT = 20

export function getNewsFeed(
  query: NewsQuery,
  cursor: string | null,
  { token, signal }: RequestOptions,
): Promise<NewsFeedPage> {
  const params = new URLSearchParams({ limit: String(FEED_LIMIT) })
  // El cursor queda ligado a los filtros con los que se obtuvo: siempre viajan juntos.
  if (cursor) params.set('cursor', cursor)
  if (query.type) params.set('type', query.type)
  if (query.priority) params.set('priority', query.priority)
  if (query.status) params.set('status', query.status)
  return apiRequest<NewsFeedPage>(`/news/feed?${params.toString()}`, { token, signal })
}

export function getNewsById(id: string, { token, signal }: RequestOptions): Promise<NewsDetail> {
  return apiRequest<NewsDetail>(`/news/${encodeURIComponent(id)}`, { token, signal })
}

export function verifyNews(
  id: string,
  status: VerifiedStatus,
  { token, signal }: RequestOptions,
): Promise<NewsDetail> {
  return apiRequest<NewsDetail>(`/news/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
    token,
    signal,
  })
}
