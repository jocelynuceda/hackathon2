type ErrorStateProps = {
  title: string
  message: string
  onRetry?: () => void
}

export function ErrorState({ title, message, onRetry }: ErrorStateProps) {
  return (
    <section className="panel mx-auto w-full max-w-lg p-8 text-center" role="alert">
      <div className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-rose-400/10 text-2xl text-rose-300">
        !
      </div>
      <h2 className="font-display text-2xl font-bold text-white">{title}</h2>
      <p className="mx-auto mt-3 max-w-sm leading-7 text-slate-400">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="button-primary mt-6">
          Reintentar
        </button>
      )}
    </section>
  )
}
