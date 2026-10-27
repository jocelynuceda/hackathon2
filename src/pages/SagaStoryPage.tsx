import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import { getSagaStory } from '../api/sagas'
import { useAuth } from '../auth/useAuth'
import { ErrorState } from '../components/ErrorState'
import type { SagaStage, SagaStory, StageMetric } from '../types/saga'
import { isLogPoseLocked } from './newsLabels'
import {
  navigateWithTransition,
  sagaTitleTransitionName,
  usePrefersReducedMotion,
} from './sagaMotion'
import './sagaStory.css'

type ViewState =
  | { status: 'loading' }
  | { status: 'locked'; message: string }
  | { status: 'not-found' }
  | { status: 'error'; message: string }
  | { status: 'success'; story: SagaStory }

const numberFormat = new Intl.NumberFormat('es-PE')
const compactFormat = new Intl.NumberFormat('es-PE', { notation: 'compact', maximumFractionDigits: 1 })

// Mientras el navegador hace un scroll suave hacia una etapa elegida con teclado,
// se ignoran las etapas intermedias que el observer detecta en el camino.
const PROGRAMMATIC_SCROLL_MS = 900

export function SagaStoryPage() {
  const { id = '' } = useParams()
  // La key reinicia todo el estado si se pasa de una saga a otra.
  return <SagaStoryContent key={id} id={id} />
}

function SagaStoryContent({ id }: { id: string }) {
  const { token } = useAuth()
  const [view, setView] = useState<ViewState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    getSagaStory(id, { token, signal: controller.signal })
      .then((story) => {
        if (!controller.signal.aborted) setView({ status: 'success', story })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        if (isLogPoseLocked(error) && error instanceof Error) {
          setView({ status: 'locked', message: error.message })
          return
        }
        if (error instanceof ApiError && error.status === 404) {
          setView({ status: 'not-found' })
          return
        }
        setView({ status: 'error', message: error instanceof Error ? error.message : 'Error desconocido' })
      })

    return () => controller.abort()
  }, [id, token, attempt])

  if (view.status === 'success') return <StoryView story={view.story} />

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 lg:px-8">
      <BackToSagas className="text-cyan-300" />

      {view.status === 'loading' && (
        <div className="panel mt-6 grid min-h-80 place-items-center p-8 text-slate-400" role="status">
          <p className="animate-pulse motion-reduce:animate-none">Descifrando el Poneglyph…</p>
        </div>
      )}

      {view.status === 'locked' && (
        <section className="panel mt-6 p-8 text-center" role="alert">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-amber-300">Log Pose requerido</p>
          <h1 className="mt-3 font-display text-2xl font-bold text-white">El Grand Line sigue cerrado</h1>
          <p className="mt-3 leading-7 text-slate-400">{view.message}</p>
          <button
            type="button"
            className="button-primary mt-6"
            onClick={() => {
              setView({ status: 'loading' })
              setAttempt((n) => n + 1)
            }}
          >
            Reintentar
          </button>
        </section>
      )}

      {view.status === 'not-found' && (
        <section className="panel mt-6 p-8 text-center" role="alert">
          <h1 className="font-display text-2xl font-bold text-white">Esta saga no existe</h1>
          <p className="mt-3 text-slate-400">Puede que el enlace esté mal o que la saga no sea de tu workspace.</p>
        </section>
      )}

      {view.status === 'error' && (
        <div className="mt-6">
          <ErrorState
            title="No pudimos leer la historia"
            message={view.message}
            onRetry={() => {
              setView({ status: 'loading' })
              setAttempt((n) => n + 1)
            }}
          />
        </div>
      )}
    </main>
  )
}

function BackToSagas({ className = '' }: { className?: string }) {
  const navigate = useNavigate()
  return (
    <Link
      to="/sagas"
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
        event.preventDefault()
        navigateWithTransition(() => navigate('/sagas'))
      }}
      className={`inline-block text-sm font-semibold underline ${className}`}
    >
      ← Todas las sagas
    </Link>
  )
}

function StoryView({ story }: { story: SagaStory }) {
  const { saga, stages } = story
  const [searchParams, setSearchParams] = useSearchParams()
  const reducedMotion = usePrefersReducedMotion()

  const requestedSlug = searchParams.get('etapa')
  const requestedIndex = stages.findIndex((stage) => stage.slug === requestedSlug)
  const [active, setActive] = useState(Math.max(requestedIndex, 0))

  const sectionRefs = useRef<(HTMLElement | null)[]>([])
  const activeRef = useRef(active)
  activeRef.current = active
  const ignoreObserverUntil = useRef(0)
  const scrollBarRef = useRef<HTMLDivElement>(null)

  const goToStage = useCallback(
    (index: number) => {
      const target = sectionRefs.current[index]
      if (!target) return
      const smooth = !reducedMotion
      if (smooth) ignoreObserverUntil.current = Date.now() + PROGRAMMATIC_SCROLL_MS
      target.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' })
      // El foco va a la etapa: teclado y lectores de pantalla siguen en el contenido.
      target.focus({ preventScroll: true })
      setActive(index)
    },
    [reducedMotion],
  )

  // Al abrir la URL con ?etapa=..., se baja directo a esa etapa (una sola vez).
  useEffect(() => {
    const index = requestedIndex
    if (index >= 0) sectionRefs.current[index]?.scrollIntoView({ block: 'start' })
    else window.scrollTo(0, 0)
    // Solo al montar: después la URL se sincroniza con el scroll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Detecta la etapa activa: la que cruza la línea media de la zona de lectura.
  // En móvil el panel ocupa la parte de arriba, así que la línea va más abajo.
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)').matches
    const observer = new IntersectionObserver(
      (entries) => {
        if (Date.now() < ignoreObserverUntil.current) return
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const index = Number((entry.target as HTMLElement).dataset.index)
          if (Number.isInteger(index)) setActive(index)
        }
      },
      { rootMargin: desktop ? '-50% 0px -50% 0px' : '-68% 0px -32% 0px' },
    )
    for (const section of sectionRefs.current) if (section) observer.observe(section)
    return () => observer.disconnect()
  }, [stages.length])

  // La URL siempre indica la etapa activa. Se usa replace para no llenar el
  // historial con una entrada por cada etapa que pasa el scroll.
  const activeSlug = stages[active]?.slug
  useEffect(() => {
    if (!activeSlug) return
    setSearchParams(
      (prev) => {
        if (prev.get('etapa') === activeSlug) return prev
        const next = new URLSearchParams(prev)
        next.set('etapa', activeSlug)
        return next
      },
      { replace: true },
    )
  }, [activeSlug, setSearchParams])

  // Si la etapa de la URL cambia desde afuera (por ejemplo, editándola a mano),
  // se navega a esa etapa.
  useEffect(() => {
    if (requestedIndex >= 0 && requestedIndex !== activeRef.current) goToStage(requestedIndex)
  }, [requestedIndex, goToStage])

  // Teclado: ← y → cambian de etapa, sin interferir con formularios.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey) return
      const target = event.target as HTMLElement | null
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return
      if (event.key === 'ArrowRight' && activeRef.current < stages.length - 1) {
        event.preventDefault()
        goToStage(activeRef.current + 1)
      } else if (event.key === 'ArrowLeft' && activeRef.current > 0) {
        event.preventDefault()
        goToStage(activeRef.current - 1)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [goToStage, stages.length])

  // Barra de lectura: con soporte de scroll-driven animations la mueve el CSS.
  // Sin soporte (o con movimiento reducido) se calcula aquí con el scroll.
  useEffect(() => {
    const cssDriven = CSS.supports('animation-timeline: scroll()') && !reducedMotion
    const bar = scrollBarRef.current
    if (cssDriven || !bar) return

    let frame = 0
    const update = () => {
      frame = 0
      const max = document.documentElement.scrollHeight - window.innerHeight
      const fraction = max > 0 ? Math.min(Math.max(window.scrollY / max, 0), 1) : 0
      bar.style.setProperty('--story-scroll', String(fraction))
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [reducedMotion])

  const stage = stages[active]
  const palette = stage?.palette ?? saga.palette
  const themeVars = {
    '--story-bg': palette.background,
    '--story-surface': palette.surface,
    '--story-primary': palette.primary,
    '--story-accent': palette.accent,
    '--story-text': palette.text,
  } as CSSProperties

  return (
    <div className="story-root min-h-screen" style={themeVars}>
      <div className="sticky top-20 z-30 h-1 w-full bg-black/10" aria-hidden="true">
        <div ref={scrollBarRef} className="story-scroll-bar h-full w-full" style={{ background: 'var(--story-primary)' }} />
      </div>

      <div className="mx-auto max-w-7xl px-5 pb-10 pt-8 lg:px-8">
        <header className="max-w-3xl">
          <BackToSagas className="story-accent" />
          <p className="story-primary mt-6 text-xs font-bold uppercase tracking-[0.28em]">
            Saga {saga.order} · {saga.stageCount} etapas · {numberFormat.format(saga.totalDistanceNm)} mn
          </p>
          <h1
            className="mt-3 font-display text-4xl font-bold sm:text-5xl"
            style={{ viewTransitionName: sagaTitleTransitionName(saga.id) }}
          >
            {saga.title}
          </h1>
          <p className="mt-2 text-lg opacity-80">{saga.subtitle}</p>
          <p className="mt-6 leading-8 opacity-90">{saga.intro}</p>
          <p className="mt-6 text-sm opacity-70">
            Haz scroll para avanzar. Con el teclado: <kbd className="font-mono">←</kbd> y{' '}
            <kbd className="font-mono">→</kbd> cambian de etapa.
          </p>
        </header>

        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
          {/* Panel persistente: en móvil queda fijo arriba, en desktop a la derecha. */}
          <aside className="sticky top-24 z-20 self-start lg:order-2" aria-label="Mapa y métricas de la etapa activa">
            <StoryPanel
              story={story}
              active={active}
              onPrev={() => goToStage(active - 1)}
              onNext={() => goToStage(active + 1)}
              onSelect={goToStage}
            />
          </aside>

          <ol className="lg:order-1">
            {stages.map((item, index) => (
              <StageSection
                key={item.id}
                stage={item}
                index={index}
                total={stages.length}
                isActive={index === active}
                sectionRef={(element) => {
                  sectionRefs.current[index] = element
                }}
              />
            ))}
          </ol>
        </div>

        {/* Espacio final: permite que la última etapa llegue a la mitad de la pantalla. */}
        <div className="h-[40vh]" aria-hidden="true" />
      </div>
    </div>
  )
}

function StageSection({
  stage,
  index,
  total,
  isActive,
  sectionRef,
}: {
  stage: SagaStage
  index: number
  total: number
  isActive: boolean
  sectionRef: (element: HTMLElement | null) => void
}) {
  const headingId = `etapa-${stage.slug}`
  return (
    <li>
      <section
        ref={sectionRef}
        data-index={index}
        data-active={isActive}
        tabIndex={-1}
        aria-labelledby={headingId}
        className="story-stage flex min-h-[85vh] scroll-mt-[23rem] sm:scroll-mt-[27rem] items-center py-10 outline-none lg:scroll-mt-28"
      >
        <article className="story-stage-card story-surface w-full rounded-3xl p-6 sm:p-8">
          <div className="story-stage-body">
            <p className="story-primary text-xs font-bold uppercase tracking-[0.24em]">
              Etapa {stage.order} de {total} · {stage.island.name}
            </p>
            <h2 id={headingId} className="mt-3 font-display text-3xl font-bold">
              {stage.title}
            </h2>
            <div className="mt-5 space-y-4 leading-8">
              {stage.narrative.map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          </div>
        </article>
      </section>
    </li>
  )
}

function StoryPanel({
  story,
  active,
  onPrev,
  onNext,
  onSelect,
}: {
  story: SagaStory
  active: number
  onPrev: () => void
  onNext: () => void
  onSelect: (index: number) => void
}) {
  const { stages } = story
  const stage = stages[active]
  if (!stage) return null
  const progress = ((active + 1) / stages.length) * 100

  return (
    <div className="story-surface rounded-3xl p-3 shadow-2xl shadow-black/20 sm:p-5">
      <StoryMap story={story} active={active} />

      <div className="mt-3">
        <div className="flex items-center justify-between gap-2 text-sm">
          <button
            type="button"
            onClick={onPrev}
            disabled={active === 0}
            aria-label="Etapa anterior"
            className="shrink-0 rounded-lg border border-current/25 px-2.5 py-1 font-semibold disabled:opacity-35"
          >
            ←
          </button>
          <p className="min-w-0 flex-1 truncate text-center font-semibold" aria-live="polite">
            Etapa {active + 1} de {stages.length}: <span className="story-primary">{stage.island.name}</span>
          </p>
          <button
            type="button"
            onClick={onNext}
            disabled={active === stages.length - 1}
            aria-label="Siguiente etapa"
            className="shrink-0 rounded-lg border border-current/25 px-2.5 py-1 font-semibold disabled:opacity-35"
          >
            →
          </button>
        </div>
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-black/15"
          role="progressbar"
          aria-label="Progreso del recorrido"
          aria-valuemin={0}
          aria-valuemax={stages.length}
          aria-valuenow={active + 1}
        >
          <div className="story-progress-fill h-full rounded-full" style={{ width: `${progress}%`, background: 'var(--story-primary)' }} />
        </div>
      </div>

      {/* Las métricas se dibujan desde la etapa activa: siempre corresponden a ella. */}
      <dl className="mt-3 grid grid-cols-4 gap-1.5 lg:grid-cols-2 lg:gap-2 xl:grid-cols-4">
        {stage.metrics.map((metric) => (
          <div key={`${stage.id}-${metric.key}`} className="min-w-0 rounded-lg bg-black/10 p-1.5 lg:rounded-xl lg:p-2.5">
            <dt className="truncate text-[10px] opacity-75 lg:text-[11px]" title={metric.label}>
              {metric.label}
            </dt>
            <dd className="story-primary mt-0.5 font-mono text-[11px] font-bold leading-tight lg:text-sm" title={formatMetricFull(metric)}>
              <span className="block truncate">{formatMetricValue(metric)}</span>
              <span className="block truncate text-[10px] font-normal opacity-80 lg:text-xs">{formatMetricUnit(metric)}</span>
            </dd>
          </div>
        ))}
      </dl>

      <nav aria-label="Etapas de la saga" className="mt-4 hidden lg:block">
        <ol className="space-y-1">
          {stages.map((item, index) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect(index)}
                aria-current={index === active ? 'step' : undefined}
                className={`w-full truncate rounded-lg px-3 py-1.5 text-left text-sm ${
                  index === active ? 'bg-black/15 font-bold' : 'opacity-75 hover:opacity-100'
                }`}
              >
                {item.order}. {item.title}
              </button>
            </li>
          ))}
        </ol>
      </nav>
    </div>
  )
}

function StoryMap({ story, active }: { story: SagaStory; active: number }) {
  const { map, stages } = story
  const points = stages.map((stage) => [stage.island.x, stage.island.y] as const)
  const pointList = points.map(([x, y]) => `${x},${y}`).join(' ')

  // Largo acumulado de la ruta hasta cada isla, para dibujar justo lo recorrido.
  const cumulative = points.reduce<number[]>((acc, [x, y], i) => {
    if (i === 0) return [0]
    const [px, py] = points[i - 1]
    return [...acc, acc[i - 1] + Math.hypot(x - px, y - py)]
  }, [])
  const total = cumulative[cumulative.length - 1] ?? 0
  const traveled = total > 0 ? (cumulative[active] ?? 0) / total : 1

  const ship = points[active] ?? [0, 0]
  const fontSize = Math.max(map.width / 48, 12)
  const radius = Math.max(map.width / 110, 6)

  return (
    <svg
      viewBox={`0 0 ${map.width} ${map.height}`}
      className="h-28 w-full rounded-2xl sm:h-40 lg:h-auto"
      role="img"
      aria-label={`Mapa del Grand Line: el barco está en ${stages[active]?.island.name ?? 'el mar'}, etapa ${active + 1} de ${stages.length}.`}
      style={{ background: 'var(--story-bg)' }}
    >
      {/* Ruta completa, tenue. */}
      <polyline
        points={pointList}
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.25}
        strokeWidth={radius / 2}
        strokeDasharray={`${radius} ${radius * 1.6}`}
        strokeLinecap="round"
      />
      {/* Ruta recorrida hasta la etapa activa. */}
      {points.length > 1 && (
        <polyline
          className="story-route"
          points={pointList}
          pathLength={1}
          fill="none"
          stroke="var(--story-primary)"
          strokeWidth={radius / 1.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ strokeDashoffset: 1 - traveled }}
        />
      )}

      {stages.map((stage, index) => {
        const visited = index <= active
        const labelBelow = stage.island.y < fontSize * 2.5
        return (
          <g key={stage.id}>
            <circle
              cx={stage.island.x}
              cy={stage.island.y}
              r={index === active ? radius * 1.5 : radius}
              fill={visited ? 'var(--story-primary)' : 'var(--story-surface)'}
              stroke="currentColor"
              strokeOpacity={0.6}
              strokeWidth={radius / 3}
            />
            <text
              x={stage.island.x}
              y={stage.island.y + (labelBelow ? radius * 2 + fontSize : -radius * 2)}
              textAnchor={labelAnchor(stage.island.x, map.width)}
              fontSize={fontSize}
              fill="currentColor"
              fillOpacity={index === active ? 1 : 0.65}
              fontWeight={index === active ? 700 : 400}
            >
              {stage.island.name}
            </text>
          </g>
        )
      })}

      {/* Barco: se mueve a la isla de la etapa activa. */}
      <g className="story-ship" style={{ transform: `translate(${ship[0]}px, ${ship[1]}px)` }} aria-hidden="true">
        <g transform={`translate(0 ${-radius * 3.2}) scale(${radius / 8})`}>
          <path d="M-12 4 L12 4 L8 10 L-8 10 Z" fill="var(--story-accent)" stroke="currentColor" strokeWidth={1.2} />
          <path d="M0 -14 L0 4" stroke="currentColor" strokeWidth={1.6} />
          <path d="M1 -13 L11 0 L1 0 Z" fill="currentColor" fillOpacity={0.85} />
        </g>
      </g>
    </svg>
  )
}

// Las islas pegadas a un borde alinean su nombre hacia adentro para que no se corte.
function labelAnchor(x: number, width: number): 'start' | 'middle' | 'end' {
  if (x < width * 0.15) return 'start'
  if (x > width * 0.85) return 'end'
  return 'middle'
}

// Las cifras grandes (recompensas) se abrevian para que quepan; el valor exacto
// queda en el title.
function formatMetricValue(metric: StageMetric): string {
  return Math.abs(metric.value) >= 1_000_000
    ? compactFormat.format(metric.value)
    : numberFormat.format(metric.value)
}

function formatMetricUnit(metric: StageMetric): string {
  return metric.unit.startsWith('/') ? `de ${metric.unit.slice(1)}` : metric.unit
}

function formatMetricFull(metric: StageMetric): string {
  return `${metric.label}: ${numberFormat.format(metric.value)} ${metric.unit}`
}
