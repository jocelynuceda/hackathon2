import type { PropsWithChildren } from 'react'
import { Brand } from './Brand'

type AuthLayoutProps = PropsWithChildren<{
  eyebrow: string
  title: string
  description: string
}>

export function AuthLayout({ children, eyebrow, title, description }: AuthLayoutProps) {
  return (
    <main className="ocean-grid relative min-h-screen overflow-hidden px-5 py-8 lg:grid lg:grid-cols-[1.1fr_0.9fr] lg:p-0">
      <div className="pointer-events-none absolute -left-32 top-1/3 size-96 rounded-full bg-cyan-400/8 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-amber-300/8 blur-3xl" />

      <section className="relative hidden min-h-screen flex-col justify-between border-r border-white/8 p-12 lg:flex xl:p-16">
        <Brand />
        <div className="max-w-xl">
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.32em] text-amber-300">East Blue · CP1</p>
          <h2 className="font-display text-5xl font-bold leading-[1.08] text-white xl:text-6xl">
            Toda gran travesía comienza con un rumbo.
          </h2>
          <p className="mt-7 max-w-lg text-lg leading-8 text-slate-400">
            Registra a tu tripulación, consulta las recompensas y mantén el Log Pose listo para cruzar Reverse Mountain.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-slate-500">
          <span className="h-px w-12 bg-cyan-300/30" />
          Guild de Cazarrecompensas
        </div>
      </section>

      <section className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center lg:min-h-screen">
        <div className="w-full max-w-md">
          <div className="mb-10 lg:hidden">
            <Brand />
          </div>
          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-300">{eyebrow}</p>
            <h1 className="mt-3 font-display text-4xl font-bold text-white">{title}</h1>
            <p className="mt-3 leading-7 text-slate-400">{description}</p>
          </div>
          {children}
        </div>
      </section>
    </main>
  )
}
