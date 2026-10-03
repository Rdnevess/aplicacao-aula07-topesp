import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Upload } from 'lucide-react'
import { ACCEPT_ATTRIBUTE, validateAudioFile } from '../../lib/audio'
import { getErrorMessage, transcriptionsApi } from '../../services/api'
import { Alert } from '../ui/Alert'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { CopyButton } from '../ui/CopyButton'

export function UploadCard() {
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  const transcribe = useMutation({
    mutationFn: transcriptionsApi.create,
    onSuccess: () => {
      setFile(null)
      void queryClient.invalidateQueries({ queryKey: ['transcriptions'] })
    },
  })

  function selectFile(selected: File | undefined) {
    if (!selected) return
    transcribe.reset()
    const error = validateAudioFile(selected)
    setFileError(error)
    setFile(error ? null : selected)
  }

  function openPicker() {
    if (!transcribe.isPending) inputRef.current?.click()
  }

  return (
    <Card>
      <h1 className="text-lg font-semibold text-slate-900">Nova transcrição</h1>
      <p className="mt-1 text-sm text-slate-500">Envie um áudio em português de até 25 MB.</p>

      <div
        role="button"
        tabIndex={0}
        onClick={openPicker}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            openPicker()
          }
        }}
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          selectFile(event.dataTransfer.files[0])
        }}
        className={`mt-4 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors ${
          dragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:border-indigo-400'
        }`}
      >
        <Upload className="size-8 text-slate-400" />
        <p className="mt-2 text-sm font-medium text-slate-700">
          {file ? file.name : 'Arraste o arquivo aqui ou clique para escolher'}
        </p>
        <p className="mt-1 text-xs text-slate-500">mp3, m4a, wav, ogg, webm, flac, mp4 ou mpeg</p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTRIBUTE}
          className="hidden"
          onChange={(event) => {
            selectFile(event.target.files?.[0])
            event.target.value = ''
          }}
        />
      </div>

      {fileError && (
        <div className="mt-4">
          <Alert>{fileError}</Alert>
        </div>
      )}
      {transcribe.isError && (
        <div className="mt-4">
          <Alert>{getErrorMessage(transcribe.error)}</Alert>
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <Button onClick={() => file && transcribe.mutate(file)} disabled={!file || transcribe.isPending}>
          {transcribe.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Transcrevendo…
            </>
          ) : (
            'Transcrever'
          )}
        </Button>
      </div>

      {transcribe.data && (
        <div className="mt-6 border-t border-slate-200 pt-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="truncate text-sm font-semibold text-slate-900">{transcribe.data.originalFilename}</h2>
            <CopyButton text={transcribe.data.text} />
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{transcribe.data.text}</p>
        </div>
      )}
    </Card>
  )
}
