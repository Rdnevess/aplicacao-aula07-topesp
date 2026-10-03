export const MAX_AUDIO_BYTES = 25 * 1024 * 1024

const ACCEPTED_EXTENSIONS = ['mp3', 'm4a', 'wav', 'ogg', 'webm', 'flac', 'mp4', 'mpeg']

export const ACCEPT_ATTRIBUTE = ACCEPTED_EXTENSIONS.map((ext) => `.${ext}`).join(',')

/** Validação antecipada para poupar o envio; o backend valida de novo. */
export function validateAudioFile(file: File): string | null {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!ACCEPTED_EXTENSIONS.includes(extension)) {
    return 'Formato não aceito. Use mp3, m4a, wav, ogg, webm, flac, mp4 ou mpeg.'
  }
  if (file.size > MAX_AUDIO_BYTES) return 'O arquivo passa de 25 MB.'
  return null
}
