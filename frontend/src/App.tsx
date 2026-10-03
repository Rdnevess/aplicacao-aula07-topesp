import { useEffect, useState } from 'react'

export default function App() {
  const [status, setStatus] = useState('verificando…')

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data: { db: string }) => setStatus(`API ok · banco ${data.db}`))
      .catch(() => setStatus('API fora do ar'))
  }, [])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2 bg-slate-50">
      <h1 className="text-3xl font-semibold text-indigo-600">Ditado</h1>
      <p className="text-sm text-slate-600">{status}</p>
    </main>
  )
}
