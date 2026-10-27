import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getSagas } from '../api/sagas'
import { useAuth } from '../auth/useAuth'
import { ErrorState } from '../components/ErrorState'
import type { SagaSummary } from '../types/saga'
import { isLogPoseLocked } from './newsLabels'
import { navigateWithTransition, sagaTitleTransitionName } from './sagaMotion'

type ViewState =
  | { status: 'loading' }
  | { status: 'locked'; message: string }
  | { status: 'error'; message: string }
  | { status: 'success'; sagas: SagaSummary[] }

const miles = new Intl.NumberFormat('es-PE')

export function SagasPage() {
  const { token } = useAuth()
  const [view, setView] = useState<ViewState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    getSagas({ token, signal: controller.signal })
      .then((sagas) => {
        if (!controller.signal.aborted) setView({ status: 'success', sagas })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        // Sin Log Pose la API responde 423: se informa, nunca se intenta evitar el bloqueo.
        if (isLogPoseLocked(error) && error instanceof Error) {
          setView({ status: 'locked', message: error.message })
          return
        }
        setView({ status: 'error', message: error instanceof Error ? error.message : 'Error desconocido' })
      })

    return () => controller.abort()
  }, [token, attempt])

  return (
    <main className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
      <header className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-amber-300">Grand Line · Poneglyph</p>
        <h1 className="mt-3 font-display text-4xl font-bold text-white">La Gran Saga</h1>
        <p className="mt-3 max-w-2xl leading-7 text-slate-400">
          Elige una saga y recorre su historia etapa por etapa sobre el mapa del Grand Line.
        </p>
      </header>

      {view.status === 'loading' && (
        <ul className="grid gap-5 md:grid-cols-2" aria-label="Cargando sagas">
          {[0, 1, 2, 3].map((item) => (
            <li key={item} className="panel h-64 animate-pulse motion-reduce:animate-none" />
          ))}
        </ul>
      )}

      {view.status === 'locked' && (
        <section className="panel mx-auto max-w-lg p-8 text-center" role="alert">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-amber-300">Log Pose requerido</p>
          <h2 className="mt-3 font-display text-2xl font-bold text-white">El Grand Line sigue cerrado</h2>
          <p className="mt-3 leading-7 text-slate-400">{view.message}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              className="button-primary"
              onClick={() => {
                setView({ status: 'loading' })
                setAttempt((n) => n + 1)
              }}
            >
              Reintentar
            </button>
            <Link to="/dashboard" className="rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-white/5">
              Ver estado del Log Pose
            </Link>
          </div>
        </section>
      )}

      {view.status === 'error' && (
        <ErrorState
          title="No pudimos leer los Poneglyphs"
          message={view.message}
          onRetry={() => {
            setView({ status: 'loading' })
            setAttempt((n) => n + 1)
          }}
        />
      )}

      {view.status === 'success' && view.sagas.length === 0 && (
        <section className="panel mx-auto max-w-lg p-8 text-center">
          <h2 className="font-display text-2xl font-bold text-white">Aún no hay sagas</h2>
          <p className="mt-3 text-slate-400">Cuando la Guild descifre un Poneglyph, aparecerá aquí.</p>
        </section>
      )}

      {view.status === 'success' && view.sagas.length > 0 && (
        <ol className="grid gap-5 md:grid-cols-2">
          {view.sagas.map((saga) => (
            <SagaCard key={saga.id} saga={saga} />
          ))}
        </ol>
      )}
    </main>
  )
}

function SagaCard({ saga }: { saga: SagaSummary }) {
  const navigate = useNavigate()
  const to = `/sagas/${saga.id}`
  const { palette } = saga

  return (
    <li>
      <Link
        to={to}
        onClick={(event) => {
          // Respetamos ctrl/cmd+clic para abrir en otra pestaña.
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
          event.preventDefault()
          navigateWithTransition(() => navigate(to))
        }}
        className="block h-full rounded-3xl border p-6 transition hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        style={{ background: palette.background, borderColor: palette.surface, color: palette.text }}
      >
        <p className="text-xs font-bold uppercase tracking-[0.24em]" style={{ color: palette.primary }}>
          Saga {saga.order}
        </p>
        <h2
          className="mt-3 font-display text-2xl font-bold"
          style={{ viewTransitionName: sagaTitleTransitionName(saga.id) }}
        >
          {saga.title}
        </h2>
        <p className="mt-1 text-sm opacity-80">{saga.subtitle}</p>
        <p className="mt-4 leading-7 opacity-90">{saga.synopsis}</p>
        <dl className="mt-6 grid grid-cols-3 gap-3 text-sm">
          <div className="rounded-xl p-3" style={{ background: palette.surface }}>
            <dt className="opacity-70">Etapas</dt>
            <dd className="font-mono text-lg font-bold">{saga.stageCount}</dd>
          </div>
          <div className="rounded-xl p-3" style={{ background: palette.surface }}>
            <dt className="opacity-70">Millas</dt>
            <dd className="font-mono text-lg font-bold">{miles.format(saga.totalDistanceNm)}</dd>
          </div>
          <div className="rounded-xl p-3" style={{ background: palette.surface }}>
            <dt className="opacity-70">Ruta</dt>
            <dd className="truncate font-semibold" title={`${saga.firstIsland} → ${saga.lastIsland}`}>
              {saga.firstIsland} → {saga.lastIsland}
            </dd>
          </div>
        </dl>
        <p className="mt-6 text-sm font-bold" style={{ color: palette.accent }}>
          Leer la historia →
        </p>
      </Link>
    </li>
  )
}
