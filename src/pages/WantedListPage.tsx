import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { getCrews, getWanted } from '../api/wanted'
import { useAuth } from '../auth/useAuth'
import {
  FRUIT_FILTERS,
  PAGE_SIZES,
  WANTED_SORTS,
  WANTED_STATUSES,
  type Crew,
  type FruitFilter,
  type PageSize,
  type WantedPage,
  type WantedQuery,
  type WantedSort,
  type WantedStatus,
  type WantedSummary,
} from '../types/wanted'
import { parseWantedQuery, serializeWantedQuery } from './wantedQuery'

const STATUS_LABELS: Record<WantedStatus, string> = {
  AT_LARGE: 'Prófugo',
  CAPTURED: 'Capturado',
  MISSING: 'Desaparecido',
}

const FRUIT_LABELS: Record<FruitFilter, string> = {
  PARAMECIA: 'Paramecia',
  ZOAN: 'Zoan',
  LOGIA: 'Logia',
  NONE: 'Sin fruta',
}

const SORT_LABELS: Record<WantedSort, string> = {
  'bounty,desc': 'Mayor recompensa',
  'name,asc': 'Nombre (A-Z)',
  'updatedAt,desc': 'Actualizados recientemente',
}

const STATUS_STYLES: Record<WantedStatus, string> = {
  AT_LARGE: 'bg-rose-400/10 text-rose-300',
  CAPTURED: 'bg-emerald-400/10 text-emerald-300',
  MISSING: 'bg-slate-400/10 text-slate-300',
}

const SEARCH_DELAY_MS = 400

// Al entrar a un cartel se guarda desde qué URL del listado y a qué altura del scroll
// estaba el usuario, para dejarlo exactamente igual al volver.
const SCROLL_KEY = 'wanted-list-scroll'

type SavedScroll = { list: string; y: number }

function saveListScroll(list: string) {
  try {
    sessionStorage.setItem(SCROLL_KEY, JSON.stringify({ list, y: window.scrollY }))
  } catch {
    // Sin sessionStorage (modo privado) simplemente no se restaura el scroll.
  }
}

function takeListScroll(): SavedScroll | null {
  try {
    const raw = sessionStorage.getItem(SCROLL_KEY)
    sessionStorage.removeItem(SCROLL_KEY)
    return raw ? (JSON.parse(raw) as SavedScroll) : null
  } catch {
    return null
  }
}

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError'
}

const berries = new Intl.NumberFormat('es-PE')

type ListState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: WantedPage; key: string }

export function WantedListPage() {
  const { token } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()

  // Todo el estado del listado sale de la URL.
  const query = useMemo(() => parseWantedQuery(searchParams), [searchParams])
  const queryKey = serializeWantedQuery(query).toString()

  const [state, setState] = useState<ListState>({ status: 'loading' })
  const [retryCount, setRetryCount] = useState(0)

  // Si la URL trae valores inválidos o desordenados, se reemplaza por la
  // versión canónica sin crear una entrada nueva en el historial.
  useEffect(() => {
    if (searchParams.toString() !== queryKey) {
      setSearchParams(new URLSearchParams(queryKey), { replace: true })
    }
  }, [searchParams, queryKey, setSearchParams])

  function updateQuery(patch: Partial<WantedQuery>, options: { replace?: boolean } = {}) {
    // Cualquier cambio que no sea de página vuelve a la página 0, para no
    // quedar en una página que con los nuevos filtros ya no existe.
    const next: WantedQuery = { ...query, page: 0, ...patch }
    setSearchParams(serializeWantedQuery(next), options)
  }

  // --- Búsqueda con debounce ---
  // El input es estado local; la URL (y la request) solo se actualiza cuando el
  // usuario deja de escribir SEARCH_DELAY_MS, así no hay una request por tecla.
  const [searchInput, setSearchInput] = useState(query.q)
  const searchTimer = useRef<number | undefined>(undefined)
  const urlQRef = useRef(query.q)
  urlQRef.current = query.q

  function handleSearchChange(value: string) {
    setSearchInput(value)
    window.clearTimeout(searchTimer.current)
    searchTimer.current = window.setTimeout(() => {
      const term = value.trim().slice(0, 100)
      if (term !== urlQRef.current) {
        setSearchParams((prev) => serializeWantedQuery({ ...parseWantedQuery(prev), q: term, page: 0 }))
      }
    }, SEARCH_DELAY_MS)
  }

  useEffect(() => () => window.clearTimeout(searchTimer.current), [])

  // Si q cambia desde afuera (atrás/adelante, link compartido) el input se sincroniza.
  useEffect(() => {
    setSearchInput(query.q)
  }, [query.q])

  // --- Carga del listado ---
  useEffect(() => {
    // Cada request tiene su propio AbortController: si los parámetros cambian
    // antes de que responda, se cancela y su respuesta nunca se muestra.
    const controller = new AbortController()
    setState({ status: 'loading' })

    getWanted(query, { token, signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setState({ status: 'success', data, key: queryKey })
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted || isAbortError(err)) return
        setState({ status: 'error', message: err instanceof Error ? err.message : 'Error desconocido' })
      })

    return () => controller.abort()
    // queryKey representa todo `query`, así el efecto corre solo si algo cambió de verdad.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey, retryCount, token])

  // Si la página pedida ya no existe (p. ej. alguien cambió `page` a mano), se corrige.
  useEffect(() => {
    if (state.status !== 'success' || state.key !== queryKey) return
    const { totalPages } = state.data
    const lastPage = Math.max(totalPages - 1, 0)
    if (query.page > lastPage) {
      setSearchParams(serializeWantedQuery({ ...query, page: lastPage }), { replace: true })
    }
  }, [state, query, queryKey, setSearchParams])

  // --- Tripulaciones para el filtro ---
  const [crews, setCrews] = useState<Crew[]>([])
  useEffect(() => {
    const controller = new AbortController()
    getCrews({ token, signal: controller.signal })
      .then(setCrews)
      .catch(() => {
        // Sin tripulaciones el filtro queda vacío, el listado sigue funcionando.
      })
    return () => controller.abort()
  }, [token])

  // Nunca se muestran datos de otra combinación de filtros (Regla del Log Pose).
  const data = state.status === 'success' && state.key === queryKey ? state.data : null
  const isLoading = state.status !== 'error' && !data
  const totalPages = data?.totalPages ?? 0
  const hasFilters = Boolean(query.q || query.status || query.crewId || query.fruit)
  const currentList = `${location.pathname}${location.search}`

  // Cuando el listado ya se dibujó con datos, si venimos del detalle se vuelve
  // a la misma altura del scroll que tenía el usuario.
  useEffect(() => {
    if (!data) return
    const saved = takeListScroll()
    if (saved && saved.list === currentList) window.scrollTo(0, saved.y)
  }, [data, currentList])

  return (
    <main className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-bold text-white">Carteles de "Se Busca"</h1>
        <p className="mt-1 h-5 text-sm text-slate-400">
          {data ? `${berries.format(data.totalElements)} carteles encontrados` : ' '}
        </p>
      </header>

      <FiltersBar query={query} searchInput={searchInput} crews={crews} hasFilters={hasFilters}
        onSearchChange={handleSearchChange} updateQuery={updateQuery} onClear={() => {
          window.clearTimeout(searchTimer.current)
          setSearchInput('')
          updateQuery({ q: '', status: null, crewId: null, fruit: null })
        }} />

      {/* Altura mínima fija: loading, error y vacío ocupan el mismo espacio y el layout no salta. */}
      <section aria-live="polite" aria-busy={isLoading} className="panel min-h-[36rem] overflow-hidden">
        {isLoading && <Skeleton rows={query.size} />}

        {state.status === 'error' && <ListErrorState message={state.message} onRetry={() => setRetryCount(n => n + 1)} />}

        {data && data.content.length === 0 && <EmptyState hasFilters={hasFilters} />}

        {data && data.content.length > 0 && (
          <ul className="divide-y divide-white/5">
            {data.content.map((w) => (
              <WantedCard key={w.id} wanted={w} fromList={currentList} />
            ))}
          </ul>
        )}
      </section>

      <Pagination page={query.page} totalPages={totalPages} enabled={Boolean(data)} onPageChange={(page) => updateQuery({ page })} />
    </main>
  )
}

export function Skeleton({ rows }: { rows: number }) {
  return (
    <ul className="divide-y divide-white/5" aria-label="Cargando carteles">
      {/* Tantas filas como el tamaño de página: al cargar, la lista ocupa lo mismo
          que la página que va a llegar y la paginación no salta. */}
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="flex h-16 animate-pulse items-center gap-4 px-4 motion-reduce:animate-none">
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/3 rounded bg-white/10" />
            <div className="h-3 w-1/2 rounded bg-white/5" />
          </div>
          <div className="h-6 w-28 rounded-full bg-white/5" />
          <div className="h-4 w-40 rounded bg-white/10" />
        </li>
      ))}
    </ul>
  )
}

export function FiltersBar({ query, searchInput, crews, hasFilters, onSearchChange, updateQuery, onClear }: {
  query: WantedQuery; searchInput: string; crews: Crew[]; hasFilters: boolean;
  onSearchChange: (value: string) => void; updateQuery: (patch: Partial<WantedQuery>) => void; onClear: () => void;
}) {
  return (
    <section aria-label="Filtros" className="mb-4 grid gap-3 panel p-4 sm:grid-cols-2 lg:grid-cols-6">
        <label className="flex flex-col gap-1 text-sm lg:col-span-2">
          <span className="font-medium text-slate-300">Buscar</span>
          <input
            type="search"
            value={searchInput}
            maxLength={100}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Nombre o epíteto"
            className="input"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-300">Estado</span>
          <select
            value={query.status ?? ''}
            onChange={(e) => updateQuery({ status: (e.target.value || null) as WantedStatus | null })}
            className="input *:bg-[#0a1e2c]"
          >
            <option value="">Todos</option>
            {WANTED_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-300">Tripulación</span>
          <select
            value={query.crewId ?? ''}
            onChange={(e) => updateQuery({ crewId: e.target.value || null })}
            className="input *:bg-[#0a1e2c]"
          >
            <option value="">Todas</option>
            {query.crewId && !crews.some((c) => c.id === query.crewId) && (
              <option value={query.crewId}>{query.crewId}</option>
            )}
            {crews.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-300">Fruta del diablo</span>
          <select
            value={query.fruit ?? ''}
            onChange={(e) => updateQuery({ fruit: (e.target.value || null) as FruitFilter | null })}
            className="input *:bg-[#0a1e2c]"
          >
            <option value="">Todas</option>
            {FRUIT_FILTERS.map((f) => (
              <option key={f} value={f}>
                {FRUIT_LABELS[f]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-300">Ordenar por</span>
          <select
            value={query.sort}
            onChange={(e) => updateQuery({ sort: e.target.value as WantedSort })}
            className="input *:bg-[#0a1e2c]"
          >
            {WANTED_SORTS.map((s) => (
              <option key={s} value={s}>
                {SORT_LABELS[s]}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-end justify-between gap-3 sm:col-span-2 lg:col-span-6">
          <label className="flex items-center gap-2 text-sm">
            <span className="font-medium text-slate-300">Por página</span>
            <select
              value={query.size}
              onChange={(e) => updateQuery({ size: Number(e.target.value) as PageSize })}
              className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-slate-100 *:bg-[#0a1e2c]"
            >
              {PAGE_SIZES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={!hasFilters}
            onClick={onClear}
            className="text-sm text-cyan-300 underline disabled:invisible"
          >
            Limpiar filtros
          </button>
        </div>
      </section>
  )
}

export function Pagination({ page, totalPages, enabled, onPageChange }: { page: number; totalPages: number; enabled: boolean; onPageChange: (page: number) => void }) {
  return (
    <nav aria-label="Paginación" className="mt-4 flex items-center justify-between gap-2 text-sm">
        <button
          type="button"
          disabled={!enabled || page === 0}
          onClick={() => onPageChange(page - 1)}
          className="rounded-xl border border-white/10 px-3 py-2 text-slate-200 transition hover:bg-white/5 disabled:opacity-40"
        >
          ← Anterior
        </button>
        <span className="text-slate-400">
          Página {totalPages === 0 ? 0 : page + 1} de {totalPages}
        </span>
        <button
          type="button"
          disabled={!enabled || page >= totalPages - 1}
          onClick={() => onPageChange(page + 1)}
          className="rounded-xl border border-white/10 px-3 py-2 text-slate-200 transition hover:bg-white/5 disabled:opacity-40"
        >
          Siguiente →
        </button>
      </nav>
  )
}

export function WantedCard({ wanted, fromList }: { wanted: WantedSummary; fromList: string }) {
  return (
    <li>
                <Link
                  to={`/wanted/${wanted.id}`}
                  state={{ fromList: fromList }}
                  onClick={() => saveListScroll(fromList)}
                  className="flex h-16 items-center gap-4 px-4 hover:bg-white/5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-white">{wanted.name}</p>
                    <p className="truncate text-sm text-slate-400">
                      "{wanted.epithet}" · {wanted.crew.name}
                    </p>
                  </div>
                  <span className="hidden w-28 truncate text-sm text-slate-400 md:block">
                    {wanted.devilFruit ? FRUIT_LABELS[wanted.devilFruit.type] : 'Sin fruta'}
                  </span>
                  <span className={`w-28 rounded-full px-2 py-1 text-center text-xs font-medium ${STATUS_STYLES[wanted.status]}`}>
                    {STATUS_LABELS[wanted.status]}
                  </span>
                  <span className="w-40 text-right font-mono text-sm font-semibold text-amber-300">
                    ฿ {berries.format(wanted.bounty)}
                  </span>
                </Link>
              </li>
  )
}

export function ListErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="flex min-h-[36rem] flex-col items-center justify-center gap-3 p-6 text-center" role="alert"><p className="font-medium text-rose-300">No se pudieron cargar los carteles.</p><p className="text-sm text-slate-400">{message}</p><button type="button" onClick={onRetry} className="button-primary">Reintentar</button></div>
}
export function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return <div className="flex min-h-[36rem] flex-col items-center justify-center gap-2 p-6 text-center"><p className="font-medium text-slate-200">No hay carteles con estos filtros.</p>{hasFilters && <p className="text-sm text-slate-400">Prueba con otra búsqueda o limpia los filtros.</p>}</div>
}
