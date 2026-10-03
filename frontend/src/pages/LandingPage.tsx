import { AudioLines, FileText, Upload, UserPlus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { buttonClasses } from '../components/ui/button-classes'
import { useAuthStore } from '../store/authStore'

const steps = [
  { icon: UserPlus, title: 'Crie sua conta', text: 'Nome, e-mail e senha. Leva menos de um minuto.' },
  { icon: Upload, title: 'Envie o áudio', text: 'mp3, m4a, wav, ogg e outros formatos, até 25 MB.' },
  { icon: FileText, title: 'Receba o texto', text: 'A transcrição em português fica salva no seu histórico.' },
]

export function LandingPage() {
  const loggedIn = useAuthStore((state) => !!state.accessToken)

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4">
        <span className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <AudioLines className="size-6 text-indigo-600" />
          Ditado
        </span>
        <nav className="flex items-center gap-2">
          {loggedIn ? (
            <Link to="/app" className={buttonClasses('primary')}>Ir para o app</Link>
          ) : (
            <>
              <Link to="/entrar" className={buttonClasses('ghost')}>Entrar</Link>
              <Link to="/cadastro" className={buttonClasses('primary')}>Criar conta</Link>
            </>
          )}
        </nav>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-4 pb-16 pt-20 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Do áudio ao texto, <span className="text-indigo-600">em segundos</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-slate-600">
            Envie uma gravação em português e receba a transcrição pronta para copiar. Tudo fica guardado no seu histórico.
          </p>
          <div className="mt-10">
            <Link to={loggedIn ? '/app' : '/cadastro'} className={buttonClasses('primary', 'lg')}>
              {loggedIn ? 'Ir para o app' : 'Começar agora'}
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 pb-24">
          <h2 className="text-center text-sm font-semibold uppercase tracking-wide text-slate-500">Como funciona</h2>
          <ol className="mt-8 grid gap-6 sm:grid-cols-3">
            {steps.map(({ icon: Icon, title, text }, index) => (
              <li key={title} className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-indigo-50">
                    <Icon className="size-5 text-indigo-600" />
                  </span>
                  <span className="text-xs font-semibold text-slate-400">PASSO {index + 1}</span>
                </div>
                <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
                <p className="mt-1 text-sm text-slate-600">{text}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        Ditado · Tópicos Especiais em Programação · UNEMAT Sinop
      </footer>
    </div>
  )
}
