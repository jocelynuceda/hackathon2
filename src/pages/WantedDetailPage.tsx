import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import { getWantedById } from '../api/wanted'
import { useAuth } from '../auth/useAuth'
import type { CrewRole, WantedDetail, WantedStatus } from '../types/wanted'

const statusLabels: Record<WantedStatus, string> = {
  AT_LARGE: 'Prófugo',
  CAPTURED: 'Capturado',
  MISSING: 'Desaparecido',
}

const roles: Record<CrewRole, string> = {
  CAPTAIN: 'Capitán',
  FIRST_MATE: 'Segundo al mando',
  NAVIGATOR: 'Navegante',
  SNIPER: 'Francotirador',
  COOK: 'Cocinero',
  DOCTOR: 'Médico',
  SHIPWRIGHT: 'Carpintero',
  MUSICIAN: 'Músico',
  ARCHAEOLOGIST: 'Arqueólogo',
  HELMSMAN: 'Timonel',
  FIGHTER: 'Combatiente',
}

const dateFormatter = new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' })
const berriesFormatter = new Intl.NumberFormat('es-PE')

type DetailState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'not-found' }
  | { status: 'success'; data: WantedDetail }

export function WantedDetailPage() {
  const { id = '' } = useParams()

  // La key reinicia todo el estado si React Router cambia a otro cartel sin
  // desmontar la ruta de detalle.
  return <WantedDetailContent key={id} id={id} />
}

function WantedDetailContent({ id }: { id: string }) {
  const { token } = useAuth()
  const location = useLocation()
  const fromList = (location.state as { fromList?: unknown } | null)?.fromList
  const returnTo =
    typeof fromList === 'string' && /^\/wanted(?:\?|$)/.test(fromList)
      ? fromList
      : '/wanted'
  const [state, setState] = useState<DetailState>({ status: 'loading' })
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    getWantedById(id, { token, signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setState({ status: 'success', data })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return

        if (error instanceof ApiError && error.status === 404) {
          setState({ status: 'not-found' })
          return
        }

        setState({
          status: 'error',
          message: error instanceof Error ? error.message : 'Error desconocido',
        })
      })

    return () => controller.abort()
  }, [id, retryCount, token])

  return (
    <main className="mx-auto max-w-3xl px-5 py-8 lg:px-8">
      <Link to={returnTo} className="mb-6 inline-block text-sm text-cyan-300 underline">
        ← Volver al listado
      </Link>

      {state.status === 'loading' && (
        <div
          className="panel min-h-64 animate-pulse p-6 motion-reduce:animate-none"
          role="status"
        >
          Cargando cartel…
        </div>
      )}

      {state.status === 'not-found' && (
        <div className="panel flex min-h-64 items-center justify-center p-6" role="alert">
          Este cartel no existe.
        </div>
      )}

      {state.status === 'error' && (
        <div
          className="panel flex min-h-64 flex-col items-center justify-center gap-3 p-6 text-center"
          role="alert"
        >
          <p>No se pudo cargar el cartel.</p>
          <p className="text-sm text-slate-400">{state.message}</p>
          <button
            type="button"
            className="button-primary"
            onClick={() => {
              setState({ status: 'loading' })
              setRetryCount((count) => count + 1)
            }}
          >
            Reintentar
          </button>
        </div>
      )}

      {state.status === 'success' && <WantedDetailCard wanted={state.data} />}
    </main>
  )
}

function WantedDetailCard({ wanted }: { wanted: WantedDetail }) {
  return (
    <article className="panel space-y-6 p-6">
      <header>
        <span className="inline-flex rounded-full bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-200">
          {statusLabels[wanted.status]}
        </span>
        <h1 className="mt-4 font-display text-3xl font-bold text-white">{wanted.name}</h1>
        <p className="text-lg text-slate-400">«{wanted.epithet}»</p>
      </header>

      <p className="font-mono text-2xl font-bold text-amber-300">
        ฿ {berriesFormatter.format(wanted.bounty)}
      </p>

      <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
        <Info label="Tripulación" value={wanted.crew.name} />
        <Info label="Puesto" value={roles[wanted.role]} />
        <Info
          label="Fruta del diablo"
          value={
            wanted.devilFruit
              ? `${wanted.devilFruit.name} (${wanted.devilFruit.type})`
              : 'Sin fruta'
          }
        />
        <Info label="Nivel de amenaza" value={`${wanted.threatLevel} / 5`} />
        <Info label="Edad" value={`${wanted.age} años`} />
        <Info label="Altura" value={`${wanted.heightCm} cm`} />
        <Info
          label="Visto por última vez"
          value={`${wanted.lastSeen.island} · ${dateFormatter.format(new Date(wanted.lastSeen.seenAt))}`}
        />
      </dl>

      <section>
        <h2 className="font-semibold text-white">Historia</h2>
        <p className="mt-2 leading-7 text-slate-300">{wanted.bio}</p>
      </section>

      <section>
        <h2 className="font-semibold text-white">Historial de recompensas</h2>
        {wanted.bountyHistory.length === 0 ? (
          <p className="mt-2 text-slate-400">Sin historial.</p>
        ) : (
          <ol className="mt-2 divide-y divide-white/5">
            {wanted.bountyHistory.map((history, index) => (
              <li
                key={`${history.issuedAt}-${index}`}
                className="flex justify-between gap-4 py-2"
              >
                <span>{dateFormatter.format(new Date(history.issuedAt))}</span>
                <span>฿ {berriesFormatter.format(history.amount)}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </article>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-slate-400">{label}</dt>
      <dd className="font-medium text-white">{value}</dd>
    </div>
  )
}
