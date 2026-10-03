import type { ComponentProps } from 'react'

export function Card({ className = '', ...props }: ComponentProps<'div'>) {
  return <div className={`rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 ${className}`} {...props} />
}
