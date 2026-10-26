import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import type { Location } from 'react-router-dom'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/useAuth'
import { AuthLayout } from '../components/AuthLayout'
import { FormField } from '../components/FormField'

type RegisterErrors = {
  teamName?: string
  email?: string
  password?: string
  form?: string
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function destinationFrom(state: unknown) {
  const from = (state as { from?: Location } | null)?.from
  if (!from) return '/dashboard'
  return `${from.pathname}${from.search}${from.hash}`
}

export function RegisterPage() {
  const { register, status } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [teamName, setTeamName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<RegisterErrors>({})
  const [submitting, setSubmitting] = useState(false)

  if (status === 'authenticated') {
    return <Navigate to={destinationFrom(location.state)} replace />
  }

  function validate() {
    const nextErrors: RegisterErrors = {}
    const cleanName = teamName.trim()
    const cleanEmail = email.trim()

    if (cleanName.length < 3 || cleanName.length > 40) {
      nextErrors.teamName = 'Usa un nombre de 3 a 40 caracteres.'
    }
    if (!emailPattern.test(cleanEmail) || cleanEmail.length > 120) {
      nextErrors.email = 'Ingresa un email válido.'
    }
    if (password.length < 8 || password.length > 72) {
      nextErrors.password = 'La contraseña debe tener entre 8 y 72 caracteres.'
    }

    return nextErrors
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const validationErrors = validate()

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setSubmitting(true)
    setErrors({})

    try {
      await register({
        teamName: teamName.trim(),
        email: email.trim(),
        password,
      })
      navigate(destinationFrom(location.state), { replace: true })
    } catch (error) {
      if (!(error instanceof ApiError)) {
        setErrors({ form: error instanceof Error ? error.message : 'No se pudo completar el registro.' })
        return
      }

      const fieldErrors: RegisterErrors = {}
      for (const detail of error.details ?? []) {
        if (detail.field === 'teamName' || detail.field === 'email' || detail.field === 'password') {
          fieldErrors[detail.field] = detail.message
        }
      }

      if (error.code === 'EMAIL_ALREADY_REGISTERED') fieldErrors.email = error.message
      if (error.code === 'TEAM_NAME_TAKEN') fieldErrors.teamName = error.message
      if (Object.keys(fieldErrors).length === 0) fieldErrors.form = error.message
      setErrors(fieldErrors)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      eyebrow="Nueva expedición"
      title="Registrar tripulación"
      description="Crea la cuenta compartida del equipo. La Guild asignará su código automáticamente."
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <FormField
          label="Nombre de la tripulación"
          name="teamName"
          type="text"
          autoComplete="organization"
          placeholder="Sabuesos de la Marea"
          maxLength={40}
          value={teamName}
          error={errors.teamName}
          hint="Entre 3 y 40 caracteres. Debe ser único."
          onChange={(event) => {
            setTeamName(event.target.value)
            setErrors((current) => ({ ...current, teamName: undefined, form: undefined }))
          }}
        />
        <FormField
          label="Email compartido"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="tripulacion@grandline.test"
          maxLength={120}
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
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
          maxLength={72}
          value={password}
          error={errors.password}
          hint="Todos los integrantes usarán esta contraseña."
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
          {submitting ? 'Registrando…' : 'Crear cuenta y zarpar'}
        </button>
      </form>

      <p className="mt-7 text-center text-sm text-slate-400">
        ¿Ya registraron el equipo?{' '}
        <Link to="/login" state={location.state} className="font-semibold text-cyan-300 hover:text-cyan-200">
          Iniciar sesión
        </Link>
      </p>
    </AuthLayout>
  )
}
