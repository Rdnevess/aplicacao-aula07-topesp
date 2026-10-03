import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AudioFile } from './audio-file.js';

const GROQ_TRANSCRIPTIONS_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const TIMEOUT_MS = 60_000;
const FAILURE_MESSAGE = 'Falha no serviço de transcrição';

export interface GroqTranscription {
  text: string;
  durationSeconds: number | null;
  model: string;
}

@Injectable()
export class GroqClient {
  private readonly logger = new Logger(GroqClient.name);

  constructor(private readonly config: ConfigService) {}

  async transcribe(file: AudioFile): Promise<GroqTranscription> {
    const model = this.config.getOrThrow<string>('GROQ_MODEL');
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }), file.originalname);
    form.append('model', model);
    form.append('language', 'pt');
    form.append('response_format', 'verbose_json');

    let response: Response;
    try {
      response = await fetch(GROQ_TRANSCRIPTIONS_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.config.getOrThrow<string>('GROQ_API_KEY')}` },
        body: form,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      this.logger.error(`Erro de rede ao chamar a Groq: ${(error as Error).message}`);
      throw new BadGatewayException(FAILURE_MESSAGE);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      this.logger.error(`Groq respondeu ${response.status}: ${body.slice(0, 500)}`);
      throw new BadGatewayException(FAILURE_MESSAGE);
    }

    const data = (await response.json()) as { text?: unknown; duration?: unknown };
    if (typeof data.text !== 'string') {
      this.logger.error('Resposta da Groq sem o campo text');
      throw new BadGatewayException(FAILURE_MESSAGE);
    }
    return {
      text: data.text.trim(),
      durationSeconds: typeof data.duration === 'number' ? data.duration : null,
      model,
    };
  }
}
