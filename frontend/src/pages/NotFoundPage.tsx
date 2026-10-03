import { Link } from 'react-router-dom'
import { buttonClasses } from '../components/ui/button-classes'

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <p className="text-sm font-semibold text-indigo-600">404</p>
      <h1 className="mt-2 text-2xl font-bold text-slate-900">Página não encontrada</h1>
      <p className="mt-2 text-sm text-slate-600">O endereço que você abriu não existe.</p>
      <Link to="/" className={buttonClasses('primary', 'md', 'mt-6')}>Voltar ao início</Link>
    </div>
  )
}
