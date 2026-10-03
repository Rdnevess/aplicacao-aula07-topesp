import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { buttonClasses } from '../components/ui/button-classes'
import { Card } from '../components/ui/Card'
import { CopyButton } from '../components/ui/CopyButton'
import { formatDate, formatDuration } from '../lib/format'
import { getErrorMessage, transcriptionsApi } from '../services/api'

export function TranscriptionPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const remove = useMutation({
    mutationFn: () => transcriptionsApi.remove(id),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ['transcription', id] })
      void queryClient.invalidateQueries({ queryKey: ['transcriptions'] })
      navigate('/app', { replace: true })
    },
  })

  const { data, isPending, isError, error } = useQuery({
    queryKey: ['transcription', id],
    queryFn: () => transcriptionsApi.get(id),
    // Depois de excluir, a query sai do cache: sem isto ela buscaria de novo e receberia 404.
    enabled: !remove.isSuccess,
  })

  const back = (
    <Link to="/app" className={buttonClasses('ghost', 'md', '-ml-4')}>
      <ArrowLeft className="size-4" />
      Voltar
    </Link>
  )

  if (isPending) return <p className="text-sm text-slate-500">Carregando…</p>

  if (isError) {
    const status = isAxiosError(error) ? error.response?.status : undefined
    const notFound = status === 404 || status === 400
    return (
      <div className="space-y-4">
        {back}
        <Card className="text-center">
          <p className="font-medium text-slate-900">{notFound ? 'Transcrição não encontrada' : getErrorMessage(error)}</p>
        </Card>
      </div>
    )
  }

  function confirmRemove() {
    if (window.confirm('Excluir esta transcrição? Essa ação não pode ser desfeita.')) remove.mutate()
  }

  return (
    <div className="space-y-4">
      {back}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-slate-900">{data.originalFilename}</h1>
            <p className="mt-1 text-xs text-slate-500">
              {formatDate(data.createdAt)} · {formatDuration(data.durationSeconds)} · {data.model}
            </p>
          </div>
          <div className="flex gap-2">
            <CopyButton text={data.text} />
            <Button variant="danger" size="sm" onClick={confirmRemove} disabled={remove.isPending}>
              {remove.isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              Excluir
            </Button>
          </div>
        </div>
        {remove.isError && (
          <div className="mt-4">
            <Alert>{getErrorMessage(remove.error)}</Alert>
          </div>
        )}
        <p className="mt-6 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{data.text}</p>
      </Card>
    </div>
  )
}
