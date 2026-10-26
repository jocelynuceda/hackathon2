type LoadingScreenProps = {
  label?: string
}

export function LoadingScreen({ label = 'Trazando el rumbo' }: LoadingScreenProps) {
  return (
    <main className="ocean-grid grid min-h-screen place-items-center px-5">
      <div className="text-center" role="status" aria-live="polite">
        <div className="relative mx-auto mb-6 size-20">
          <div className="absolute inset-0 animate-spin rounded-full border border-cyan-200/15 border-t-amber-300" />
          <div className="absolute inset-3 animate-[spin_2.5s_linear_infinite_reverse] rounded-full border border-dashed border-cyan-300/40" />
          <div className="absolute inset-0 grid place-items-center text-amber-300">✦</div>
        </div>
        <p className="font-display text-xl font-semibold text-slate-100">{label}</p>
        <p className="mt-2 text-sm text-slate-400">Consultando a la Guild…</p>
      </div>
    </main>
  )
}
