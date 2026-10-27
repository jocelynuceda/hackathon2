import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import { getWantedById } from '../api/wanted'
import { useAuth } from '../auth/useAuth'
import type { CrewRole, WantedDetail, WantedStatus } from '../types/wanted'

const statusLabels: Record<WantedStatus, string> = { AT_LARGE: 'Prófugo', CAPTURED: 'Capturado', MISSING: 'Desaparecido' }
const roles: Record<CrewRole, string> = { CAPTAIN: 'Capitán', FIRST_MATE: 'Segundo al mando', NAVIGATOR: 'Navegante', SNIPER: 'Francotirador', COOK: 'Cocinero', DOCTOR: 'Médico', SHIPWRIGHT: 'Carpintero', MUSICIAN: 'Músico', ARCHAEOLOGIST: 'Arqueólogo', HELMSMAN: 'Timonel', FIGHTER: 'Combatiente' }
const formatDate = (date: string) => new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' }).format(new Date(date))
type State = { status: 'loading' } | { status: 'error'; message: string } | { status: 'not-found' } | { status: 'success'; data: WantedDetail }

export function WantedDetailPage() {
  const { id = '' } = useParams()
  const { token } = useAuth()
  const location = useLocation()
  const fromList = (location.state as { fromList?: unknown } | null)?.fromList
  const returnTo = typeof fromList === 'string' && /^\/wanted(?:\?|$)/.test(fromList) ? fromList : '/wanted'
  const [state, setState] = useState<State>({ status: 'loading' })
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setState({ status: 'loading' })
    getWantedById(id, { token, signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setState({ status: 'success', data }) })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        if (error instanceof ApiError && error.status === 404) setState({ status: 'not-found' })
        else setState({ status: 'error', message: error instanceof Error ? error.message : 'Error desconocido' })
      })
    return () => controller.abort()
  }, [id, token, retry])
  return <main className="mx-auto max-w-3xl px-5 py-8 lg:px-8">
    <Link to={returnTo} className="mb-6 inline-block text-sm text-cyan-300 underline">← Volver al listado</Link>
    {state.status === 'loading' && <div className="panel min-h-64 animate-pulse p-6 motion-reduce:animate-none" role="status">Cargando cartel...</div>}
    {state.status === 'not-found' && <div className="panel flex min-h-64 items-center justify-center p-6">Este cartel no existe.</div>}
    {state.status === 'error' && <div className="panel flex min-h-64 flex-col items-center justify-center gap-3 p-6" role="alert"><p>No se pudo cargar el cartel.</p><p>{state.message}</p><button type="button" className="button-primary" onClick={() => setRetry(n => n + 1)}>Reintentar</button></div>}
    {state.status === 'success' && <article className="panel space-y-6 p-6">
      <header><h1 className="font-display text-3xl font-bold text-white">{state.data.name}</h1><p className="text-lg text-slate-400">«{state.data.epithet}»</p><p>{statusLabels[state.data.status]}</p></header>
      <p className="font-mono text-2xl font-bold text-amber-300">฿ {state.data.bounty.toLocaleString('es-PE')}</p>
      <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
        <Info label="Tripulación" value={state.data.crew.name} /><Info label="Puesto" value={roles[state.data.role]} />
        <Info label="Fruta del diablo" value={state.data.devilFruit ? `${state.data.devilFruit.name} (${state.data.devilFruit.type})` : 'Sin fruta'} />
        <Info label="Nivel de amenaza" value={`${state.data.threatLevel} / 5`} /><Info label="Edad" value={`${state.data.age} años`} /><Info label="Altura" value={`${state.data.heightCm} cm`} />
        <Info label="Visto por última vez" value={`${state.data.lastSeen.island} · ${formatDate(state.data.lastSeen.seenAt)}`} />
      </dl>
      <section><h2 className="font-semibold text-white">Historia</h2><p className="text-slate-300">{state.data.bio}</p></section>
      <section><h2 className="font-semibold text-white">Historial de recompensas</h2>{state.data.bountyHistory.length === 0 ? <p>Sin historial.</p> : <ol className="divide-y divide-white/5">{state.data.bountyHistory.map((h, index) => <li key={`${h.issuedAt}-${index}`} className="flex justify-between gap-4 py-2"><span>{formatDate(h.issuedAt)}</span><span>฿ {h.amount.toLocaleString('es-PE')}</span></li>)}</ol>}</section>
    </article>}
  </main>
}
function Info({ label, value }: { label: string; value: string }) { return <div><dt className="text-slate-400">{label}</dt><dd className="font-medium text-white">{value}</dd></div> }
