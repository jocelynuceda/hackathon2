import { Link } from 'react-router-dom'
import { Brand } from '../components/Brand'
import { useAuth } from '../auth/useAuth'

export function NotFoundPage() {
  const { status } = useAuth()
  const destination = status === 'authenticated' ? '/dashboard' : '/login'

  return (
    <main className="ocean-grid grid min-h-screen place-items-center px-5 py-10 text-center">
      <div>
        <div className="mb-10 flex justify-center"><Brand /></div>
        <p className="font-display text-8xl font-black text-cyan-300/15 sm:text-9xl">404</p>
        <h1 className="-mt-5 font-display text-3xl font-bold text-white sm:text-4xl">Esta isla no figura en el mapa</h1>
        <p className="mx-auto mt-4 max-w-md leading-7 text-slate-400">
          La ruta que buscabas no existe o fue borrada de las cartas de navegación.
        </p>
        <Link to={destination} className="button-primary mt-8 inline-flex">
          Volver a rumbo seguro
        </Link>
      </div>
    </main>
  )
}
