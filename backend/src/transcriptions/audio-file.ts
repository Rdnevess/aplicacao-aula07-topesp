/** O que o controller recebe do multer (memoryStorage) e repassa ao serviço. */
export interface AudioFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

export const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

// Formatos aceitos pela Groq: mp3, m4a, wav, ogg, webm, flac, mp4, mpeg. Celulares às vezes rotulam como video/*.
export const ACCEPTED_AUDIO_MIME_TYPES: readonly string[] = [
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/x-m4a',
  'audio/m4a',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/ogg',
  'audio/webm',
  'audio/flac',
  'audio/x-flac',
  'video/mp4',
  'video/webm',
  'video/mpeg',
];
