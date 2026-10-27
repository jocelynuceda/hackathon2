import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, Outlet, useLocation, useSearchParams } from 'react-router-dom'
import { getNewsFeed } from '../api/news'
import { useAuth } from '../auth/useAuth'
import {
  NEWS_PRIORITIES,
  NEWS_STATUSES,
  NEWS_TYPES,
  type NewsItem,
  type NewsPriority,
  type NewsQuery,
  type NewsStatus,
  type NewsType,
} from '../types/news'
import {
  PRIORITY_LABELS,
  PRIORITY_STYLES,
  STATUS_LABELS,
  STATUS_STYLES,
  TYPE_LABELS,
  errorMessage,
  isLogPoseLocked,
  newsDate,
} from './newsLabels'
import { parseNewsQuery, serializeNewsQuery } from './newsQuery'

// Lo que el detalle (ruta hija) recibe del feed.
export type NewsOutletContext = {
  onNewsUpdated: (news: NewsItem) => void
}

type FeedState = {
  // Filtros a los que pertenecen estas noticias (el string de la URL).
  key: string
  items: NewsItem[]
  nextCursor: string | null
  hasMore: boolean
  phase: 'loading' | 'idle' | 'error'
  error: string | null
  locked: boolean
}

function emptyFeed(key: string): FeedState {
  return { key, items: [], nextCursor: null, hasMore: true, phase: 'loading', error: null, locked: false }
}

export function NewsFeedPage() {
  const { token } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()

  const query = useMemo(() => parseNewsQuery(searchParams), [searchParams])
  const queryKey = serializeNewsQuery(query).toString()

  const [feed, setFeed] = useState<FeedState>(() => emptyFeed(queryKey))
  // La única carga en vuelo. Mientras exista, no se dispara otra.
  const inFlight = useRef<AbortController | null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Si la URL trae filtros inválidos o desordenados, se reemplaza por la versión canónica.
  useEffect(() => {
    if (searchParams.toString() !== queryKey) {
      setSearchParams(new URLSearchParams(queryKey), { replace: true })
    }
  }, [searchParams, queryKey, setSearchParams])

  const fetchPage = useCallback(
    (key: string, cursor: string | null) => {
      const controller = new AbortController()
      inFlight.current = controller

      getNewsFeed(parseNewsQuery(new URLSearchParams(key)), cursor, { token, signal: controller.signal })
        .then((page) => {
          if (controller.signal.aborted) return
          setFeed((prev) => {
            // La primera página (sin cursor) siempre parte de cero. Una respuesta de filtros
            // viejos nunca llega aquí: su request se abortó al cambiar los filtros.
            const base = cursor !== null && prev.key === key ? prev : emptyFeed(key)
            // Ninguna noticia aparece dos veces, aunque el servidor la repita.
            const seen = new Set(base.items.map((n) => n.id))
            const fresh = page.items.filter((n) => {
              if (seen.has(n.id)) return false
              seen.add(n.id)
              return true
            })
            return {
              key,
              items: [...base.items, ...fresh],
              nextCursor: page.nextCursor,
              hasMore: page.hasMore && page.nextCursor !== null,
              phase: 'idle',
              error: null,
              locked: false,
            }
          })
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return
          // Las noticias ya cargadas se conservan; solo se marca el error.
          setFeed((prev) => ({
            ...(cursor !== null && prev.key === key ? prev : emptyFeed(key)),
            phase: 'error',
            error: errorMessage(err),
            locked: isLogPoseLocked(err),
          }))
        })
        .finally(() => {
          if (inFlight.current === controller) inFlight.current = null
        })
    },
    [token],
  )

  // Al cambiar los filtros se cancela lo que estaba en vuelo y se pide la primera página, sin cursor.
  useEffect(() => {
    inFlight.current?.abort()
    fetchPage(queryKey, null)

    return () => {
      inFlight.current?.abort()
      inFlight.current = null
    }
  }, [queryKey, fetchPage])

  // Mientras llega la primera página de unos filtros nuevos, el estado guardado es de los
  // anteriores: no se muestra, se trata como una carga desde cero.
  const current = useMemo(() => (feed.key === queryKey ? feed : emptyFeed(queryKey)), [feed, queryKey])

  const loadMore = useCallback(() => {
    if (inFlight.current) return
    if (current.phase !== 'idle' || !current.hasMore || !current.nextCursor) return
    setFeed({ ...current, phase: 'loading', error: null })
    fetchPage(current.key, current.nextCursor)
  }, [current, fetchPage])

  function retry() {
    if (inFlight.current) return
    setFeed({ ...current, phase: 'loading', error: null })
    // Sin noticias se reintenta la primera carga; con noticias, la siguiente desde el último cursor bueno.
    fetchPage(current.key, current.items.length > 0 ? current.nextCursor : null)
  }

  // Carga automática: cuando el centinela al final de la lista se acerca a la pantalla.
  // El observer se recrea después de cada carga; si el centinela sigue visible (lista corta),
  // vuelve a disparar y se pide la siguiente.
  const canAutoLoad = current.phase === 'idle' && current.hasMore
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !canAutoLoad) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore()
      },
      { rootMargin: '600px 0px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [canAutoLoad, loadMore])

  // El detalle avisa cuando verifica una noticia, así el feed la muestra actualizada al volver.
  const onNewsUpdated = useCallback((news: NewsItem) => {
    setFeed((prev) => ({
      ...prev,
      items: prev.items.map((n) =>
        n.id === news.id
          ? { ...n, status: news.status, verifiedAt: news.verifiedAt, updatedAt: news.updatedAt }
          : n,
      ),
    }))
  }, [])

  function updateQuery(patch: Partial<NewsQuery>) {
    setSearchParams(serializeNewsQuery({ ...query, ...patch }))
  }

  const hasFilters = Boolean(query.type || query.priority || query.status)
  const isInitialLoading = current.phase === 'loading' && current.items.length === 0
  const isInitialError = current.phase === 'error' && current.items.length === 0
  const isEmpty = current.phase === 'idle' && current.items.length === 0
  const reachedEnd = current.items.length > 0 && !current.hasMore

  return (
    <main className="mx-auto max-w-4xl px-5 py-8 lg:px-8">
      <header className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-300">News Coo</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-white">Noticias del Mundo</h1>
        <p className="mt-1 text-sm text-slate-400">Lo que traen las gaviotas mensajeras, de lo más reciente a lo más antiguo.</p>
      </header>

      <FiltersBar query={query} hasFilters={hasFilters} updateQuery={updateQuery} />

      <section aria-live="polite" aria-busy={current.phase === 'loading'}>
        {isInitialLoading && <FeedSkeleton />}

        {isInitialError && (
          <FeedMessage
            tone="error"
            title={current.locked ? 'Falta el Log Pose' : 'No llegaron las noticias'}
            message={current.error ?? ''}
            action={<button type="button" onClick={retry} className="button-primary mt-6">Reintentar</button>}
          />
        )}

        {isEmpty && (
          <FeedMessage
            tone="neutral"
            title="Sin noticias"
            message={hasFilters ? 'No hay noticias con estos filtros. Prueba con otra combinación.' : 'Todavía no hay noticias en este workspace.'}
          />
        )}

        {current.items.length > 0 && (
          <ul className="space-y-3">
            {current.items.map((news) => (
              <NewsCard key={news.id} news={news} search={location.search} />
            ))}
          </ul>
        )}

        {current.items.length > 0 && current.phase === 'loading' && (
          <p className="py-6 text-center text-sm text-slate-400">Cargando más noticias…</p>
        )}

        {current.items.length > 0 && current.phase === 'error' && (
          <div role="alert" className="mt-4 flex flex-col items-center gap-3 rounded-2xl border border-rose-400/25 bg-rose-400/8 px-4 py-4 text-center text-sm text-rose-200 sm:flex-row sm:justify-between sm:text-left">
            <span>No se pudieron cargar más noticias: {current.error}</span>
            <button type="button" onClick={retry} className="shrink-0 rounded-xl border border-rose-300/30 px-3 py-1.5 font-semibold hover:bg-rose-300/10">
              Reintentar
            </button>
          </div>
        )}

        {reachedEnd && (
          <p className="py-8 text-center text-sm text-slate-500">
            Llegaste al final · {current.items.length} {current.items.length === 1 ? 'noticia' : 'noticias'}
          </p>
        )}

        <div ref={sentinelRef} aria-hidden="true" className="h-px" />
      </section>

      {/* El detalle se abre encima del feed: el feed sigue montado y conserva su posición y sus datos. */}
      <Outlet context={{ onNewsUpdated } satisfies NewsOutletContext} />
    </main>
  )
}

function FiltersBar({ query, hasFilters, updateQuery }: {
  query: NewsQuery; hasFilters: boolean; updateQuery: (patch: Partial<NewsQuery>) => void
}) {
  return (
    <section aria-label="Filtros" className="panel mb-5 grid gap-3 p-4 sm:grid-cols-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-300">Tipo</span>
        <select
          value={query.type ?? ''}
          onChange={(e) => updateQuery({ type: (e.target.value || null) as NewsType | null })}
          className="input *:bg-[#0a1e2c]"
        >
          <option value="">Todos</option>
          {NEWS_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-300">Prioridad</span>
        <select
          value={query.priority ?? ''}
          onChange={(e) => updateQuery({ priority: (e.target.value || null) as NewsPriority | null })}
          className="input *:bg-[#0a1e2c]"
        >
          <option value="">Todas</option>
          {NEWS_PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-300">Estado</span>
        <select
          value={query.status ?? ''}
          onChange={(e) => updateQuery({ status: (e.target.value || null) as NewsStatus | null })}
          className="input *:bg-[#0a1e2c]"
        >
          <option value="">Todos</option>
          {NEWS_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
      </label>

      <div className="flex justify-end sm:col-span-3">
        <button
          type="button"
          disabled={!hasFilters}
          onClick={() => updateQuery({ type: null, priority: null, status: null })}
          className="text-sm text-cyan-300 underline disabled:invisible"
        >
          Limpiar filtros
        </button>
      </div>
    </section>
  )
}

function NewsCard({ news, search }: { news: NewsItem; search: string }) {
  return (
    <li>
      <Link
        to={{ pathname: `/news/${encodeURIComponent(news.id)}`, search }}
        state={{ fromFeed: true }}
        className="panel block p-5 transition hover:border-cyan-300/30 hover:bg-white/[0.04] focus-visible:outline-2 focus-visible:outline-cyan-300"
      >
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className={`rounded-full px-2 py-0.5 font-semibold ${PRIORITY_STYLES[news.priority]}`}>
            {PRIORITY_LABELS[news.priority]}
          </span>
          <span className="text-slate-400">{TYPE_LABELS[news.type]}</span>
          <span className={`ml-auto rounded-full border px-2 py-0.5 font-semibold ${STATUS_STYLES[news.status]}`}>
            {STATUS_LABELS[news.status]}
          </span>
        </div>
        <h2 className="mt-3 font-semibold leading-snug text-white">{news.title}</h2>
        <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-400">{news.summary}</p>
        <p className="mt-3 text-xs text-slate-500">
          {news.source} · {news.island} · {newsDate.format(new Date(news.publishedAt))}
        </p>
      </Link>
    </li>
  )
}

function FeedSkeleton() {
  return (
    <ul className="space-y-3" aria-label="Cargando noticias">
      {Array.from({ length: 5 }, (_, i) => (
        <li key={i} className="panel animate-pulse space-y-3 p-5 motion-reduce:animate-none">
          <div className="h-4 w-1/4 rounded bg-white/10" />
          <div className="h-5 w-3/4 rounded bg-white/10" />
          <div className="h-3 w-full rounded bg-white/5" />
          <div className="h-3 w-1/3 rounded bg-white/5" />
        </li>
      ))}
    </ul>
  )
}

function FeedMessage({ tone, title, message, action }: {
  tone: 'error' | 'neutral'; title: string; message: string; action?: ReactNode
}) {
  return (
    <div role={tone === 'error' ? 'alert' : undefined} className="panel px-6 py-14 text-center">
      <h2 className="font-display text-2xl font-bold text-white">{title}</h2>
      <p className={`mx-auto mt-3 max-w-md leading-7 ${tone === 'error' ? 'text-rose-200' : 'text-slate-400'}`}>{message}</p>
      {action}
    </div>
  )
}
