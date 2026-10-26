export const WANTED_STATUSES = ['AT_LARGE', 'CAPTURED', 'MISSING'] as const
export type WantedStatus = (typeof WANTED_STATUSES)[number]

// NONE solo existe como filtro: significa "sin fruta"
export const FRUIT_FILTERS = ['PARAMECIA', 'ZOAN', 'LOGIA', 'NONE'] as const
export type FruitFilter = (typeof FRUIT_FILTERS)[number]
export type FruitType = Exclude<FruitFilter, 'NONE'>

export const WANTED_SORTS = ['bounty,desc', 'name,asc', 'updatedAt,desc'] as const
export type WantedSort = (typeof WANTED_SORTS)[number]

export const PAGE_SIZES = [10, 20, 50] as const
export type PageSize = (typeof PAGE_SIZES)[number]

export type CrewRole =
  | 'CAPTAIN'
  | 'FIRST_MATE'
  | 'NAVIGATOR'
  | 'SNIPER'
  | 'COOK'
  | 'DOCTOR'
  | 'SHIPWRIGHT'
  | 'MUSICIAN'
  | 'ARCHAEOLOGIST'
  | 'HELMSMAN'
  | 'FIGHTER'

export interface CrewRef {
  id: string
  name: string
}

export interface Crew extends CrewRef {
  shipName: string
  jollyRogerColor: string
  memberCount: number
  totalBounty: number
}

export interface DevilFruit {
  name: string
  type: FruitType
}

export interface WantedSummary {
  id: string
  name: string
  epithet: string
  bounty: number
  status: WantedStatus
  crew: CrewRef
  role: CrewRole
  devilFruit: DevilFruit | null
  threatLevel: number
  lastSeenIsland: string
  updatedAt: string
}

export interface WantedDetail extends WantedSummary {
  age: number
  heightCm: number
  bio: string
  lastSeen: { island: string; seenAt: string }
  bountyHistory: { amount: number; issuedAt: string }[]
}

export interface WantedPage {
  content: WantedSummary[]
  totalElements: number
  totalPages: number
  page: number
  size: number
}

export interface WantedQuery {
  page: number
  size: PageSize
  status: WantedStatus | null
  crewId: string | null
  fruit: FruitFilter | null
  q: string
  sort: WantedSort
}
