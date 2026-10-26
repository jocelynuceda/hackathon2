import type { InputHTMLAttributes } from 'react'

type FormFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
  hint?: string
}

export function FormField({ label, error, hint, id, ...inputProps }: FormFieldProps) {
  const inputId = id ?? inputProps.name
  const descriptionId = `${inputId}-description`

  return (
    <label htmlFor={inputId} className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-200">{label}</span>
      <input
        {...inputProps}
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={error || hint ? descriptionId : undefined}
        className={`input ${error ? 'border-rose-400/70 focus:border-rose-300 focus:ring-rose-300/15' : ''}`}
      />
      {(error || hint) && (
        <span
          id={descriptionId}
          className={`mt-2 block text-sm ${error ? 'text-rose-300' : 'text-slate-500'}`}
        >
          {error ?? hint}
        </span>
      )}
    </label>
  )
}
