import { Transcription } from './entities/transcription.entity.js';

export interface TranscriptionResponse {
  id: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  durationSeconds: number | null;
  language: string;
  model: string;
  text: string;
  createdAt: Date;
}

/** Sem dados do usuário dono. */
export function toTranscriptionResponse(t: Transcription): TranscriptionResponse {
  return {
    id: t.id,
    originalFilename: t.originalFilename,
    mimeType: t.mimeType,
    sizeBytes: t.sizeBytes,
    durationSeconds: t.durationSeconds,
    language: t.language,
    model: t.model,
    text: t.text,
    createdAt: t.createdAt,
  };
}
