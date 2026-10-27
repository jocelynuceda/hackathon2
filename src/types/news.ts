export const NEWS_TYPES = [
  'BOUNTY_UPDATE',
  'BATTLE',
  'MARINE_OPERATION',
  'WORLD_GOVERNMENT',
  'DISCOVERY',
] as const
export type NewsType = (typeof NEWS_TYPES)[number]

export const NEWS_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const
export type NewsPriority = (typeof NEWS_PRIORITIES)[number]

export const NEWS_STATUSES = ['RUMOR', 'CONFIRMED', 'DEBUNKED'] as const
export type NewsStatus = (typeof NEWS_STATUSES)[number]

// Solo un RUMOR se puede verificar, y solo hacia uno de estos dos estados.
export type VerifiedStatus = Exclude<NewsStatus, 'RUMOR'>

export interface NewsItem {
  id: string
  type: NewsType
  priority: NewsPriority
  status: NewsStatus
  title: string
  summary: string
  source: string
  island: string
  relatedWanted: { id: string; name: string } | null
  publishedAt: string
  updatedAt: string
  verifiedAt: string | null
}

export interface NewsDetail extends NewsItem {
  body: string[]
}

export interface NewsFeedPage {
  items: NewsItem[]
  nextCursor: string | null
  hasMore: boolean
}

export interface NewsQuery {
  type: NewsType | null
  priority: NewsPriority | null
  status: NewsStatus | null
}
