export type User = {
  id: string
  name: string
  email: string
}

export type Team = {
  code: string
  name: string
}

export type AuthResponse = {
  token: string
  tokenType: 'Bearer'
  expiresAt: string
  user: User
  team: Team
}

export type MeResponse = Omit<AuthResponse, 'token' | 'tokenType'>

export type ApiErrorDetail = {
  field: string
  message: string
}

export type ApiErrorBody = {
  status: number
  code: string
  message: string
  traceId: string
  details?: ApiErrorDetail[]
  retryAfterSeconds?: number
}

export type WantedStatus = 'AT_LARGE' | 'CAPTURED' | 'MISSING'
export type FruitType = 'PARAMECIA' | 'ZOAN' | 'LOGIA'

export type WantedSummary = {
  id: string
  name: string
  epithet: string
  bounty: number
  status: WantedStatus
  crew: { id: string; name: string }
  role: string
  devilFruit: { name: string; type: FruitType } | null
  threatLevel: number
  lastSeenIsland: string
  updatedAt: string
}

export type Crew = {
  id: string
  name: string
  shipName: string
  jollyRogerColor: string
  memberCount: number
  totalBounty: number
}

export type DashboardSummary = {
  team: Team
  wanted: {
    total: number
    totalBounty: number
    averageBounty: number
    byStatus: Record<WantedStatus, number>
    byFruit: Record<FruitType | 'NONE', number>
  }
  crews: {
    total: number
    mostWanted: Crew | null
  }
  topBounties: WantedSummary[]
  generatedAt: string
}

export type LogPose = {
  status: 'LOCKED' | 'UNLOCKED'
  grandLineUnlocked: boolean
  unlockedAt: string | null
  message: string
}
