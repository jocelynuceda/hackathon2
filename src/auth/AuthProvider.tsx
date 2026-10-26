import { useCallback, useEffect, useMemo, useState } from 'react'
import type { PropsWithChildren } from 'react'
import { ApiError, apiRequest } from '../api/client'
import type { AuthResponse, MeResponse } from '../api/types'
import {
  AuthContext,
  sessionFromMe,
  type AuthStatus,
  type Credentials,
  type RegisterData,
} from './auth-context'

const TOKEN_KEY = 'logpose.token'

export function AuthProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AuthStatus>(() =>
    localStorage.getItem(TOKEN_KEY) ? 'checking' : 'anonymous',
  )
  const [session, setSession] = useState<AuthResponse | null>(null)
  const [restoreAttempt, setRestoreAttempt] = useState(0)

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setSession(null)
    setStatus('anonymous')
  }, [])

  useEffect(() => {
    const handleExpiredSession = () => clearSession()
    window.addEventListener('logpose:session-expired', handleExpiredSession)
    return () =>
      window.removeEventListener('logpose:session-expired', handleExpiredSession)
  }, [clearSession])

  useEffect(() => {
    const controller = new AbortController()
    const token = localStorage.getItem(TOKEN_KEY)

    if (!token) {
      return () => controller.abort()
    }

    void apiRequest<MeResponse>('/auth/me', {
      token,
      signal: controller.signal,
    })
      .then((me) => {
        setSession(sessionFromMe(token, me))
        setStatus('authenticated')
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return

        if (error instanceof ApiError && error.status === 401) {
          clearSession()
          return
        }

        setStatus('restore-error')
      })

    return () => controller.abort()
  }, [clearSession, restoreAttempt])

  const saveSession = useCallback((nextSession: AuthResponse) => {
    localStorage.setItem(TOKEN_KEY, nextSession.token)
    setSession(nextSession)
    setStatus('authenticated')
  }, [])

  const login = useCallback(
    async (credentials: Credentials) => {
      const nextSession = await apiRequest<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      })
      saveSession(nextSession)
    },
    [saveSession],
  )

  const register = useCallback(
    async (data: RegisterData) => {
      const nextSession = await apiRequest<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      })
      saveSession(nextSession)
    },
    [saveSession],
  )

  const retryRestore = useCallback(() => {
    setStatus('checking')
    setRestoreAttempt((attempt) => attempt + 1)
  }, [])

  const value = useMemo(
    () => ({
      status,
      session,
      token: session?.token ?? localStorage.getItem(TOKEN_KEY),
      login,
      register,
      logout: clearSession,
      retryRestore,
    }),
    [clearSession, login, register, retryRestore, session, status],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
