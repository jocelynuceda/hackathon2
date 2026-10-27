import type { ApiErrorBody } from './types'

const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '')

type ApiRequestOptions = RequestInit & {
  token?: string | null
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details: ApiErrorBody['details']
  readonly traceId?: string
  readonly current: unknown

  constructor(body: ApiErrorBody) {
    super(body.message)
    this.name = 'ApiError'
    this.status = body.status
    this.code = body.code
    this.details = body.details
    this.traceId = body.traceId
    this.current = body.current
  }
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<ApiErrorBody>
  return (
    typeof candidate.status === 'number' &&
    typeof candidate.code === 'string' &&
    typeof candidate.message === 'string'
  )
}

export async function apiRequest<T>(
  path: string,
  { token, headers, ...options }: ApiRequestOptions = {},
): Promise<T> {
  if (!baseUrl) {
    throw new Error('Falta configurar VITE_API_BASE_URL.')
  }

  let response: Response

  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new Error('No se pudo conectar con la Guild. Revisa tu conexión.')
  }

  if (!response.ok) {
    let body: ApiErrorBody = {
      status: response.status,
      code: 'UNKNOWN_ERROR',
      message: 'La Guild no pudo completar la solicitud.',
      traceId: response.headers.get('X-Trace-Id') ?? '',
    }

    try {
      const parsed: unknown = await response.json()
      if (isApiErrorBody(parsed)) body = parsed
    } catch {
      // Conserva el error genérico cuando el servidor no devuelve JSON.
    }

    if (
      token &&
      response.status === 401 &&
      (body.code === 'UNAUTHORIZED' || body.code === 'TOKEN_EXPIRED')
    ) {
      window.dispatchEvent(new Event('logpose:session-expired'))
    }

    throw new ApiError(body)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}
