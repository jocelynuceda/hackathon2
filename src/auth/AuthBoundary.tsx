import { Outlet } from 'react-router-dom'
import { ErrorState } from '../components/ErrorState'
import { LoadingScreen } from '../components/LoadingScreen'
import { useAuth } from './useAuth'

export function AuthBoundary() {
  const { status, retryRestore } = useAuth()

  if (status === 'checking') {
    return <LoadingScreen label="Comprobando las credenciales de la tripulación" />
  }

  if (status === 'restore-error') {
    return (
      <main className="grid min-h-screen place-items-center px-5">
        <ErrorState
          title="No pudimos verificar tu sesión"
          message="La Guild no respondió. Tu sesión se conserva para que puedas intentarlo de nuevo."
          onRetry={retryRestore}
        />
      </main>
    )
  }

  return <Outlet />
}
