import type { ReactNode } from 'react'
import { AudioLines } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '../ui/Card'

interface AuthShellProps {
  title: string
  subtitle: ReactNode
  children: ReactNode
}

export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12">
      <Link to="/" className="mb-8 flex items-center gap-2 text-xl font-semibold text-slate-900">
        <AudioLines className="size-6 text-indigo-600" />
        Ditado
      </Link>
      <Card className="w-full max-w-sm">
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </Card>
    </div>
  )
}
