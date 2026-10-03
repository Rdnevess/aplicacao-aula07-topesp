import type { ComponentProps } from 'react'

type InputProps = ComponentProps<'input'> & { label: string; error?: string }

export function Input({ label, error, id, className = '', ...props }: InputProps) {
  const inputId = id ?? props.name
  const border = error
    ? 'border-red-400 focus:ring-red-200'
    : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-200'
  return (
    <div className="space-y-1">
      <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={!!error}
        className={`block w-full rounded-lg border bg-white px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 ${border} ${className}`}
        {...props}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
