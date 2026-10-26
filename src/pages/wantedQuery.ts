import {
  FRUIT_FILTERS,
  PAGE_SIZES,
  WANTED_SORTS,
  WANTED_STATUSES,
  type WantedQuery,
} from '../types/wanted'

export const DEFAULT_QUERY: WantedQuery = {
  page: 0,
  size: 20,
  status: null,
  crewId: null,
  fruit: null,
  q: '',
  sort: 'bounty,desc',
}

function pick<T extends string | number>(allowed: readonly T[], raw: string | null): T | null {
  return allowed.find((v) => String(v) === raw) ?? null
}

// La URL es la fuente de verdad. Cualquier valor inválido cae en su default,
// así una URL rota nunca rompe la vista.
export function parseWantedQuery(sp: URLSearchParams): WantedQuery {
  const rawPage = sp.get('page')
  const page = rawPage !== null && /^\d+$/.test(rawPage) ? Number(rawPage) : 0
  const crewId = (sp.get('crewId') ?? '').trim()

  return {
    page: Number.isSafeInteger(page) ? page : 0,
    size: pick(PAGE_SIZES, sp.get('size')) ?? DEFAULT_QUERY.size,
    status: pick(WANTED_STATUSES, sp.get('status')),
    crewId: crewId && crewId.length <= 200 ? crewId : null,
    fruit: pick(FRUIT_FILTERS, sp.get('fruit')),
    q: (sp.get('q') ?? '').trim().slice(0, 100),
    sort: pick(WANTED_SORTS, sp.get('sort')) ?? DEFAULT_QUERY.sort,
  }
}

// Solo se escriben en la URL los valores distintos al default, en orden fijo,
// para que la misma vista tenga siempre la misma URL.
export function serializeWantedQuery(query: WantedQuery): URLSearchParams {
  const sp = new URLSearchParams()
  if (query.q) sp.set('q', query.q)
  if (query.status) sp.set('status', query.status)
  if (query.crewId) sp.set('crewId', query.crewId)
  if (query.fruit) sp.set('fruit', query.fruit)
  if (query.sort !== DEFAULT_QUERY.sort) sp.set('sort', query.sort)
  if (query.size !== DEFAULT_QUERY.size) sp.set('size', String(query.size))
  if (query.page !== 0) sp.set('page', String(query.page))
  return sp
}
