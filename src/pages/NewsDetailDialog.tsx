import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import { getNewsById, verifyNews } from '../api/news'
import { useAuth } from '../auth/useAuth'
import type { NewsDetail, VerifiedStatus } from '../types/news'
import type { NewsOutletContext } from './NewsFeedPage'
import {
  PRIORITY_LABELS,
  PRIORITY_STYLES,
  STATUS_LABELS,
  STATUS_STYLES,
  TYPE_LABELS,
  errorMessage,
  isLogPoseLocked,
  isNewsDetail,
  newsDate,
} from './newsLabels'

type DetailState =
  | { status: 'loading' }
  | { status: 'error'; message: string; locked: boolean }
  | { status: 'success'; news: NewsDetail }

type VerifyState =
  | { phase: 'idle' }
  | { phase: 'pending'; target: VerifiedStatus }
  | { phase: 'success'; message: string }
  | { phase: 'error'; target: VerifiedStatus; message: string }

const VERIFY_LABELS: Record<VerifiedStatus, { idle: string; pending: string }> = {
  CONFIRMED: { idle: 'Confirmar', pending: 'Confirmando…' },
  DEBUNKED: { idle: 'Desmentir', pending: 'Desmintiendo…' },
}

// La `key` hace que cada noticia monte un detalle nuevo: su estado (carga, verificación)
// nunca se arrastra de una noticia a otra.
export function NewsDetailDialog() {
  const { id = '' } = useParams()
  return <NewsDetailModal key={id} id={id} />
}

function NewsDetailModal({ id }: { id: string }) {
  const { onNewsUpdated } = useOutletContext<NewsOutletContext>()
  const { token } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const dialogRef = useRef<HTMLDialogElement>(null)

  const [state, setState] = useState<DetailState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [verify, setVerify] = useState<VerifyState>({ phase: 'idle' })
  // Bloqueo inmediato: evita un segundo PATCH por doble clic antes de que React vuelva a renderizar.
  const verifying = useRef(false)

  // Se abre como modal nativo (foco atrapado, Escape) y la página de atrás no se desplaza.
  // Al cerrar, el foco vuelve a la tarjeta que lo abrió.
  // El elemento que tenía el foco se guarda en el primer render, antes de abrir el modal.
  const [opener] = useState(() => (document.activeElement instanceof HTMLElement ? document.activeElement : null))
  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.documentElement.style.overflow = ''
      opener?.focus({ preventScroll: true })
    }
  }, [opener])

  useEffect(() => {
    const controller = new AbortController()

    getNewsById(id, { token, signal: controller.signal })
      .then((news) => setState({ status: 'success', news }))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        setState({ status: 'error', message: errorMessage(err), locked: isLogPoseLocked(err) })
      })

    return () => controller.abort()
  }, [id, token, attempt])

  function close() {
    // Si se llegó desde el feed, volver atrás no deja una entrada extra en el historial.
    if ((location.state as { fromFeed?: boolean } | null)?.fromFeed) {
      navigate(-1)
    } else {
      navigate({ pathname: '/news', search: location.search }, { replace: true })
    }
  }

  async function handleVerify(target: VerifiedStatus) {
    if (state.status !== 'success' || verifying.current) return
    verifying.current = true
    setVerify({ phase: 'pending', target })

    try {
      const updated = await verifyNews(state.news.id, target, { token })
      setState({ status: 'success', news: updated })
      onNewsUpdated(updated)
      setVerify({ phase: 'success', message: `Listo: la noticia quedó como ${STATUS_LABELS[updated.status].toLowerCase()}.` })
    } catch (err) {
      // Otra persona ya la verificó: el servidor manda el estado actual y se muestra ese.
      if (err instanceof ApiError && err.code === 'NEWS_ALREADY_VERIFIED' && isNewsDetail(err.current)) {
        setState({ status: 'success', news: err.current })
        onNewsUpdated(err.current)
        setVerify({ phase: 'success', message: `Esta noticia ya estaba verificada como ${STATUS_LABELS[err.current.status].toLowerCase()}.` })
        return
      }
      // Cualquier otro error: la noticia conserva su estado anterior y se puede reintentar.
      setVerify({ phase: 'error', target, message: errorMessage(err) })
    } finally {
      verifying.current = false
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="news-title"
      onCancel={(e) => {
        e.preventDefault()
        close()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close()
      }}
      className="m-auto max-h-[90vh] w-[min(42rem,calc(100vw-2rem))] overflow-y-auto rounded-3xl border border-white/10 bg-[#0a1e2c] p-0 text-slate-100 shadow-2xl backdrop:bg-[#020a10]/75 backdrop:backdrop-blur-sm"
    >
      <div className="p-6 sm:p-8">
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={close}
            className="rounded-xl border border-white/10 px-3 py-1.5 text-sm font-semibold text-slate-300 hover:bg-white/5"
          >
            Cerrar
          </button>
        </div>

        {state.status === 'loading' && (
          <div className="animate-pulse space-y-4 motion-reduce:animate-none" aria-label="Cargando noticia">
            <div className="h-4 w-1/3 rounded bg-white/10" />
            <div className="h-7 w-5/6 rounded bg-white/10" />
            <div className="h-4 w-full rounded bg-white/5" />
            <div className="h-4 w-full rounded bg-white/5" />
            <div className="h-4 w-2/3 rounded bg-white/5" />
          </div>
        )}

        {state.status === 'error' && (
          <div role="alert" className="py-6 text-center">
            <h2 id="news-title" className="font-display text-2xl font-bold text-white">
              {state.locked ? 'Falta el Log Pose' : 'No se pudo abrir la noticia'}
            </h2>
            <p className="mx-auto mt-3 max-w-md leading-7 text-rose-200">{state.message}</p>
            <button type="button" onClick={() => {
                setState({ status: 'loading' })
                setAttempt((n) => n + 1)
              }} className="button-primary mt-6">
              Reintentar
            </button>
          </div>
        )}

        {state.status === 'success' && (
          <NewsBody news={state.news} verify={verify} onVerify={handleVerify} />
        )}
      </div>
    </dialog>
  )
}

function NewsBody({ news, verify, onVerify }: {
  news: NewsDetail; verify: VerifyState; onVerify: (target: VerifiedStatus) => void
}) {
  const pending = verify.phase === 'pending'

  return (
    <article>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={`rounded-full px-2 py-0.5 font-semibold ${PRIORITY_STYLES[news.priority]}`}>
          Prioridad {PRIORITY_LABELS[news.priority].toLowerCase()}
        </span>
        <span className="text-slate-400">{TYPE_LABELS[news.type]}</span>
        <span className={`ml-auto rounded-full border px-2 py-0.5 font-semibold ${STATUS_STYLES[news.status]}`}>
          {STATUS_LABELS[news.status]}
        </span>
      </div>

      <h2 id="news-title" className="mt-4 font-display text-2xl font-bold leading-tight text-white sm:text-3xl">
        {news.title}
      </h2>
      <p className="mt-3 leading-7 text-slate-300">{news.summary}</p>
      <p className="mt-3 text-xs text-slate-500">
        {news.source} · {news.island} · {newsDate.format(new Date(news.publishedAt))}
        {news.verifiedAt && ` · Verificada ${newsDate.format(new Date(news.verifiedAt))}`}
      </p>

      <div className="mt-6 space-y-4 border-t border-white/8 pt-6 leading-7 text-slate-300">
        {news.body.map((paragraph, i) => <p key={i}>{paragraph}</p>)}
      </div>

      {news.relatedWanted && (
        <p className="mt-6 rounded-2xl border border-amber-300/15 bg-amber-300/[0.05] px-4 py-3 text-sm text-slate-300">
          Cartel relacionado: <span className="font-semibold text-white">{news.relatedWanted.name}</span>
        </p>
      )}

      {verify.phase === 'success' && (
        <p role="status" className="mt-6 rounded-2xl border border-emerald-300/25 bg-emerald-300/8 px-4 py-3 text-sm text-emerald-200">
          {verify.message}
        </p>
      )}

      {news.status === 'RUMOR' && (
        <section aria-label="Verificar rumor" className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-sm font-semibold text-white">¿Este rumor es cierto?</p>
          <p className="mt-1 text-sm text-slate-400">La verificación es definitiva para toda la tripulación.</p>

          <div className="mt-4 flex flex-wrap gap-3">
            {(['CONFIRMED', 'DEBUNKED'] as const).map((target) => (
              <button
                key={target}
                type="button"
                disabled={pending}
                onClick={() => onVerify(target)}
                className={`rounded-xl border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  target === 'CONFIRMED'
                    ? 'border-emerald-300/30 text-emerald-200 hover:bg-emerald-300/10'
                    : 'border-rose-300/30 text-rose-200 hover:bg-rose-300/10'
                }`}
              >
                {pending && verify.target === target ? VERIFY_LABELS[target].pending : VERIFY_LABELS[target].idle}
              </button>
            ))}
          </div>

          {verify.phase === 'error' && (
            <div role="alert" className="mt-4 flex flex-col gap-3 rounded-xl border border-rose-400/25 bg-rose-400/8 px-4 py-3 text-sm text-rose-200 sm:flex-row sm:items-center sm:justify-between">
              <span>No se pudo verificar: {verify.message} La noticia sigue como rumor.</span>
              <button
                type="button"
                onClick={() => onVerify(verify.target)}
                className="shrink-0 rounded-lg border border-rose-300/30 px-3 py-1.5 font-semibold hover:bg-rose-300/10"
              >
                Reintentar
              </button>
            </div>
          )}
        </section>
      )}
    </article>
  )
}
