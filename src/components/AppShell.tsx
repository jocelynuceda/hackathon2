import { NavLink, Outlet } from 'react-router-dom'
import { Brand } from './Brand'
import { useAuth } from '../auth/useAuth'

export function AppShell() {
  const { session, logout } = useAuth()

  return (
    <div className="min-h-screen bg-[#061520] text-slate-100">
      <header className="sticky top-0 z-40 border-b border-white/8 bg-[#061520]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-6 px-5 lg:px-8">
          <Brand />

          <nav aria-label="Navegación principal" className="hidden items-center gap-2 md:flex">
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  isActive
                    ? 'bg-cyan-300/10 text-cyan-200'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/wanted"
              className={({ isActive }) =>
                `rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  isActive
                    ? 'bg-cyan-300/10 text-cyan-200'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              Carteles
            </NavLink>
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="max-w-48 truncate text-sm font-semibold text-slate-100">
                {session?.team.name}
              </p>
              <p className="font-mono text-[11px] tracking-wider text-cyan-300/70">
                {session?.team.code}
              </p>
            </div>
            <button
              type="button"
              onClick={logout}
              className="rounded-xl border border-white/10 px-3.5 py-2 text-sm font-semibold text-slate-300 transition hover:border-rose-300/30 hover:bg-rose-300/10 hover:text-rose-200"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <Outlet />
    </div>
  )
}
