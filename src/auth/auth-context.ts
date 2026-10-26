import { createContext } from 'react'
import type { AuthResponse, MeResponse } from '../api/types'

export type AuthStatus =
  | 'checking'
  | 'authenticated'
  | 'anonymous'
  | 'restore-error'

export type Credentials = {
  email: string
  password: string
}

export type RegisterData = Credentials & {
  teamName: string
}

export type AuthContextValue = {
  status: AuthStatus
  session: AuthResponse | null
  token: string | null
  login: (credentials: Credentials) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => void
  retryRestore: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function sessionFromMe(token: string, me: MeResponse): AuthResponse {
  return {
    token,
    tokenType: 'Bearer',
    expiresAt: me.expiresAt,
    user: me.user,
    team: me.team,
  }
}
