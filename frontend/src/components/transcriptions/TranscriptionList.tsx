import { useQuery } from '@tanstack/react-query'
import { FileAudio } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatDate, formatDuration } from '../../lib/format'
import { getErrorMessage, transcriptionsApi } from '../../services/api'
import { Alert } from '../ui/Alert'
import { Card } from '../ui/Card'

export function TranscriptionList() {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ['transcriptions'],
    queryFn: transcriptionsApi.list,
  })

  if (isPending) return <p className="text-sm text-slate-500">Carregando…</p>
  if (isError) return <Alert>{getErrorMessage(error)}</Alert>
  if (data.length === 0) {
    return <Card className="text-center text-sm text-slate-500">Nenhuma transcrição ainda. Envie o primeiro áudio acima.</Card>
  }

  return (
    <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
      {data.map((transcription) => (
        <li key={transcription.id}>
          <Link to={`/app/transcricoes/${transcription.id}`} className="block px-5 py-4 hover:bg-slate-50">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="flex min-w-0 items-center gap-2 font-medium text-slate-900">
                <FileAudio className="size-4 shrink-0 text-indigo-600" />
                <span className="truncate">{transcription.originalFilename}</span>
              </span>
              <span className="shrink-0 text-xs text-slate-500">
                {formatDate(transcription.createdAt)} · {formatDuration(transcription.durationSeconds)}
              </span>
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-slate-600">{transcription.text}</p>
          </Link>
        </li>
      ))}
    </ul>
  )
}
