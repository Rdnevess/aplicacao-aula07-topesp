import { BadGatewayException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { vi, type MockInstance } from 'vitest';
import { GroqClient } from './groq.client.js';

const KEY = 'gsk_segredo_de_teste';
const config = {
  getOrThrow: (key: string) =>
    ({ GROQ_API_KEY: KEY, GROQ_MODEL: 'whisper-large-v3-turbo' })[key],
} as unknown as ConfigService;

const file = {
  buffer: Buffer.from('bytes de áudio'),
  originalname: 'teste.m4a',
  mimetype: 'audio/mp4',
  size: 14,
};

describe('GroqClient', () => {
  let fetchSpy: MockInstance<typeof fetch>;
  let logSpy: MockInstance;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
    logSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('envia o áudio com modelo, idioma e formato, e devolve texto e duração', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ text: '  olá mundo  ', duration: 3.2 }), { status: 200 }),
    );

    const result = await new GroqClient(config).transcribe(file);

    expect(result).toEqual({ text: 'olá mundo', durationSeconds: 3.2, model: 'whisper-large-v3-turbo' });
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.groq.com/openai/v1/audio/transcriptions');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${KEY}`);
    const body = init.body as FormData;
    expect(body.get('model')).toBe('whisper-large-v3-turbo');
    expect(body.get('language')).toBe('pt');
    expect(body.get('response_format')).toBe('verbose_json');
    expect((body.get('file') as File).name).toBe('teste.m4a');
  });

  it('devolve duração nula quando a Groq não informa', async () => {
    fetchSpy.mockResolvedValue(new Response(JSON.stringify({ text: 'oi' }), { status: 200 }));
    const result = await new GroqClient(config).transcribe(file);
    expect(result.durationSeconds).toBeNull();
  });

  it('status não-2xx vira 502 e o log não contém a chave', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ error: { message: 'Invalid API Key' } }), { status: 401 }),
    );

    await expect(new GroqClient(config).transcribe(file)).rejects.toBeInstanceOf(BadGatewayException);
    expect(logSpy).toHaveBeenCalled();
    expect(JSON.stringify(logSpy.mock.calls)).not.toContain(KEY);
  });

  it('erro de rede vira 502', async () => {
    fetchSpy.mockRejectedValue(new TypeError('fetch failed'));
    await expect(new GroqClient(config).transcribe(file)).rejects.toThrow('Falha no serviço de transcrição');
  });

  it('resposta sem texto vira 502', async () => {
    fetchSpy.mockResolvedValue(new Response(JSON.stringify({ foo: 'bar' }), { status: 200 }));
    await expect(new GroqClient(config).transcribe(file)).rejects.toBeInstanceOf(BadGatewayException);
  });
});
