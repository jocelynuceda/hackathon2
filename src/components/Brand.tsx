import { Link } from 'react-router-dom'

type BrandProps = {
  compact?: boolean
}

export function Brand({ compact = false }: BrandProps) {
  return (
    <Link to="/" className="group inline-flex items-center gap-3" aria-label="Log Pose Console">
      <span className="relative grid size-11 place-items-center rounded-full border border-amber-300/30 bg-amber-300/10 shadow-[0_0_28px_rgba(251,191,36,0.12)]">
        <svg viewBox="0 0 48 48" className="size-7 text-amber-300" aria-hidden="true">
          <circle cx="24" cy="24" r="16" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="24" cy="24" r="4" fill="currentColor" />
          <path d="M24 4v8M24 36v8M4 24h8M36 24h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="m29 14-3 12-8 8 4-13 7-7Z" fill="currentColor" opacity=".8" />
        </svg>
        <span className="absolute inset-1 rounded-full border border-dashed border-cyan-200/20 transition-transform duration-700 group-hover:rotate-90" />
      </span>
      {!compact && (
        <span>
          <span className="block text-[10px] font-bold uppercase tracking-[0.28em] text-cyan-200/60">
            Guild Console
          </span>
          <span className="block font-display text-lg font-bold tracking-wide text-slate-50">
            Log Pose
          </span>
        </span>
      )}
    </Link>
  )
}
