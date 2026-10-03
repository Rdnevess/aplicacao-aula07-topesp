const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso))
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null) return '—'
  const total = Math.round(seconds)
  const minutes = Math.floor(total / 60)
  return `${minutes}:${String(total % 60).padStart(2, '0')}`
}
