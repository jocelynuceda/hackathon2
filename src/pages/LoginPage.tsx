import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import type { Location } from 'react-router-dom'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/useAuth'
import { AuthLayout } from '../components/AuthLayout'
import { FormField } from '../components/FormField'

type LoginErrors = {
  email?: string
  password?: string
  form?: string
}

function destinationFrom(state: unknown) {
  const from = (state as { from?: Location } | null)?.from
  if (!from) return '/dashboard'
  return `${from.pathname}${from.search}${from.hash}`
}

export function LoginPage() {
  const { login, status } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<LoginErrors>({})
  const [submitting, setSubmitting] = useState(false)

  if (status === 'authenticated') {
    return <Navigate to={destinationFrom(location.state)} replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors: LoginErrors = {}

    if (!email.trim()) nextErrors.email = 'Ingresa el email de la tripulación.'
    if (!password) nextErrors.password = 'Ingresa la contraseña.'

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setSubmitting(true)
    setErrors({})

    try {
      await login({ email: email.trim(), password })
      navigate(destinationFrom(location.state), { replace: true })
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'No se pudo iniciar sesión.'
      setErrors({ form: message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      eyebrow="Bienvenidos a bordo"
      title="Iniciar sesión"
      description="Usa el email y la contraseña compartidos por tu tripulación."
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <FormField
          label="Email de la tripulación"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="tripulacion@grandline.test"
          value={email}
          error={errors.email}
          onChange={(event) => {
            setEmail(event.target.value)
            setErrors((current) => ({ ...current, email: undefined, form: undefined }))
          }}
        />
        <FormField
          label="Contraseña"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          error={errors.password}
          onChange={(event) => {
            setPassword(event.target.value)
            setErrors((current) => ({ ...current, password: undefined, form: undefined }))
          }}
        />

        {errors.form && (
          <div className="rounded-xl border border-rose-400/25 bg-rose-400/8 px-4 py-3 text-sm leading-6 text-rose-200" role="alert">
            {errors.form}
          </div>
        )}

        <button type="submit" disabled={submitting} className="button-primary w-full">
          {submitting ? 'Verificando…' : 'Entrar a la consola'}
        </button>
      </form>

      <p className="mt-7 text-center text-sm text-slate-400">
        ¿Aún no tienen una cuenta?{' '}
        <Link to="/register" state={location.state} className="font-semibold text-cyan-300 hover:text-cyan-200">
          Registrar tripulación
        </Link>
      </p>
    </AuthLayout>
  )
}
