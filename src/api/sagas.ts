import type { SagaStory, SagaSummary } from '../types/saga'
import { apiRequest } from './client'

type RequestOptions = {
  token: string | null
  signal?: AbortSignal
}

export function getSagas({ token, signal }: RequestOptions): Promise<SagaSummary[]> {
  return apiRequest<SagaSummary[]>('/sagas', { token, signal })
}

export function getSagaStory(id: string, { token, signal }: RequestOptions): Promise<SagaStory> {
  return apiRequest<SagaStory>(`/sagas/${encodeURIComponent(id)}/story`, { token, signal })
}
