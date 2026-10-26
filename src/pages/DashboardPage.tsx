import { useEffect, useState } from 'react'
import { ApiError, apiRequest } from '../api/client'
import type { DashboardSummary, LogPose, WantedStatus } from '../api/types'
import { useAuth } from '../auth/useAuth'
import { ErrorState } from '../components/ErrorState'

type DashboardData = {
  summary: DashboardSummary
  logPose: LogPose
}

type ViewState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: DashboardData }

const statusLabels: Record<WantedStatus, string> = {
  AT_LARGE: 'Prófugos',
  CAPTURED: 'Capturados',
  MISSING: 'Desaparecidos',
}

const numberFormatter = new Intl.NumberFormat('es-PE')
const compactFormatter = new Intl.NumberFormat('es-PE', {
  notation: 'compact',
  maximumFractionDigits: 1,
})
const dateFormatter = new Intl.DateTimeFormat('es-PE', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-label="Cargando dashboard">
      <div className="h-32 rounded-3xl bg-white/5" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-32 rounded-2xl bg-white/5" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        <div className="h-96 rounded-3xl bg-white/5" />
        <div className="h-96 rounded-3xl bg-white/5" />
      </div>
    </div>
  )
}

export function DashboardPage() {
  const { token, session } = useAuth()
  const [attempt, setAttempt] = useState(0)
  const [view, setView] = useState<ViewState>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()

    void Promise.all([
      apiRequest<DashboardSummary>('/dashboard/summary', {
        token,
        signal: controller.signal,
      }),
      apiRequest<LogPose>('/log-pose', {
        token,
        signal: controller.signal,
      }),
    ])
      .then(([summary, logPose]) => {
        setView({ status: 'success', data: { summary, logPose } })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        const message =
          error instanceof ApiError || error instanceof Error
            ? error.message
            : 'No pudimos cargar el dashboard.'
        setView({ status: 'error', message })
      })

    return () => controller.abort()
  }, [attempt, token])

  return (
    <main className="ocean-grid min-h-[calc(100vh-5rem)]">
      <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8 lg:py-14">
        <div className="mb-9 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-300">Panel de navegación</p>
            <h1 className="mt-3 font-display text-4xl font-bold text-white md:text-5xl">
              Buen rumbo, {session?.user.name}
            </h1>
            <p className="mt-3 text-slate-400">El estado actual de su expedición, directo desde la Guild.</p>
          </div>
          {view.status === 'success' && (
            <p className="text-xs text-slate-500">
              Actualizado {dateFormatter.format(new Date(view.data.summary.generatedAt))}
            </p>
          )}
        </div>

        {view.status === 'loading' && <DashboardSkeleton />}

        {view.status === 'error' && (
          <ErrorState
            title="La señal se perdió"
            message={view.message}
            onRetry={() => {
              setView({ status: 'loading' })
              setAttempt((current) => current + 1)
            }}
          />
        )}

        {view.status === 'success' && <DashboardContent data={view.data} />}
      </div>
    </main>
  )
}

function DashboardContent({ data }: { data: DashboardData }) {
  const { summary, logPose } = data

  return (
    <div className="space-y-6">
      <section className="panel relative overflow-hidden p-6 md:p-8">
        <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.12),transparent_65%)]" />
        <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div className="flex items-center gap-5">
            <div className={`grid size-16 shrink-0 place-items-center rounded-full border ${logPose.grandLineUnlocked ? 'border-emerald-300/40 bg-emerald-300/10 text-emerald-300' : 'border-amber-300/40 bg-amber-300/10 text-amber-300'}`}>
              <span className="text-2xl">✦</span>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">Estado del Log Pose</p>
              <h2 className="mt-2 font-display text-2xl font-bold text-white">
                {logPose.grandLineUnlocked ? 'Grand Line desbloqueado' : 'Esperando inspección'}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{logPose.message}</p>
            </div>
          </div>
          <span className={`w-fit rounded-full px-4 py-2 text-xs font-extrabold tracking-[0.2em] ${logPose.grandLineUnlocked ? 'bg-emerald-300/12 text-emerald-300' : 'bg-amber-300/12 text-amber-300'}`}>
            {logPose.status}
          </span>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores">
        <MetricCard label="Carteles activos" value={numberFormatter.format(summary.wanted.total)} accent="cyan" />
        <MetricCard label="Recompensa total" value={`${compactFormatter.format(summary.wanted.totalBounty)} ฿`} accent="amber" />
        <MetricCard label="Tripulaciones" value={numberFormatter.format(summary.crews.total)} accent="emerald" />
        <MetricCard label="Recompensa promedio" value={`${compactFormatter.format(summary.wanted.averageBounty)} ฿`} accent="rose" />
      </section>

      {summary.wanted.total === 0 ? (
        <section className="panel px-6 py-16 text-center">
          <div className="mx-auto mb-5 grid size-16 place-items-center rounded-2xl bg-cyan-300/8 text-3xl text-cyan-300">⌁</div>
          <h2 className="font-display text-2xl font-bold text-white">El tablón está vacío</h2>
          <p className="mx-auto mt-3 max-w-md leading-7 text-slate-400">
            Todavía no hay carteles de Se Busca en este workspace. Cuando la Guild publique datos aparecerán aquí.
          </p>
        </section>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <section className="panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/8 px-6 py-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">Objetivos prioritarios</p>
                <h2 className="mt-1 font-display text-xl font-bold text-white">Mayores recompensas</h2>
              </div>
            </div>
            <div className="divide-y divide-white/7">
              {summary.topBounties.map((wanted, index) => (
                <article key={wanted.id} className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 px-5 py-4 transition hover:bg-white/[0.025] sm:grid-cols-[2.5rem_1fr_auto_auto] sm:px-6">
                  <span className="font-mono text-sm text-slate-600">{String(index + 1).padStart(2, '0')}</span>
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-slate-100">{wanted.name}</h3>
                    <p className="truncate text-sm text-slate-500">“{wanted.epithet}” · {wanted.crew.name}</p>
                  </div>
                  <div className="hidden gap-1 sm:flex" aria-label={`Amenaza ${wanted.threatLevel} de 5`}>
                    {[1, 2, 3, 4, 5].map((level) => (
                      <span key={level} className={`size-1.5 rounded-full ${level <= wanted.threatLevel ? 'bg-rose-300' : 'bg-white/10'}`} />
                    ))}
                  </div>
                  <p className="whitespace-nowrap font-mono text-sm font-bold text-amber-300">
                    {compactFormatter.format(wanted.bounty)} ฿
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className="panel p-6">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">Distribución</p>
            <h2 className="mt-1 font-display text-xl font-bold text-white">Estado de carteles</h2>
            <div className="mt-7 space-y-6">
              {(Object.entries(summary.wanted.byStatus) as [WantedStatus, number][]).map(([status, count]) => {
                const percentage = summary.wanted.total ? (count / summary.wanted.total) * 100 : 0
                return (
                  <div key={status}>
                    <div className="mb-2 flex justify-between text-sm">
                      <span className="text-slate-400">{statusLabels[status]}</span>
                      <span className="font-mono font-bold text-slate-200">{count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/6">
                      <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-cyan-200" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>

            {summary.crews.mostWanted && (
              <div className="mt-8 rounded-2xl border border-amber-300/15 bg-amber-300/[0.05] p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300/70">Tripulación más buscada</p>
                <p className="mt-2 font-semibold text-white">{summary.crews.mostWanted.name}</p>
                <p className="mt-1 text-sm text-slate-500">Navío: {summary.crews.mostWanted.shipName}</p>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

function MetricCard({ label, value, accent }: { label: string; value: string; accent: 'cyan' | 'amber' | 'emerald' | 'rose' }) {
  const accentClasses = {
    cyan: 'bg-cyan-300',
    amber: 'bg-amber-300',
    emerald: 'bg-emerald-300',
    rose: 'bg-rose-300',
  }

  return (
    <article className="panel relative overflow-hidden p-5">
      <span className={`absolute inset-x-0 top-0 h-0.5 ${accentClasses[accent]}`} />
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-3 font-display text-3xl font-bold text-white">{value}</p>
    </article>
  )
}
