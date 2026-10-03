import { BadGatewayException, INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { createTestApp, groqMock, registerUser, resetDatabase } from './utils.js';

const AUDIO = Buffer.from('bytes de áudio de teste');

describe('Transcrições (e2e)', () => {
  let app: INestApplication<App>;
  const http = () => request(app.getHttpServer());

  const upload = (token: string, filename = 'teste.m4a', contentType = 'audio/mp4', content = AUDIO) =>
    http()
      .post('/api/transcriptions')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', content, { filename, contentType });

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(app);
    groqMock.transcribe.mockReset();
    groqMock.transcribe.mockResolvedValue({
      text: 'olá, isto é um teste',
      durationSeconds: 3.5,
      model: 'whisper-large-v3-turbo',
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/transcriptions', () => {
    it('transcreve e grava (201)', async () => {
      const { token } = await registerUser(app);
      const res = await upload(token).expect(201);

      expect(res.body).toEqual({
        id: expect.any(String),
        originalFilename: 'teste.m4a',
        mimeType: 'audio/mp4',
        sizeBytes: AUDIO.length,
        durationSeconds: 3.5,
        language: 'pt',
        model: 'whisper-large-v3-turbo',
        text: 'olá, isto é um teste',
        createdAt: expect.any(String),
      });
      expect(groqMock.transcribe).toHaveBeenCalledTimes(1);
    });

    it('sem token responde 401', async () => {
      await http()
        .post('/api/transcriptions')
        .attach('file', AUDIO, { filename: 'teste.m4a', contentType: 'audio/mp4' })
        .expect(401);
    });

    it('arquivo que não é áudio responde 400', async () => {
      const { token } = await registerUser(app);
      await upload(token, 'nota.txt', 'text/plain').expect(400);
      expect(groqMock.transcribe).not.toHaveBeenCalled();
    });

    it('sem o campo file responde 400', async () => {
      const { token } = await registerUser(app);
      await http()
        .post('/api/transcriptions')
        .set('Authorization', `Bearer ${token}`)
        .field('language', 'pt')
        .expect(400);
    });

    it('arquivo acima de 25 MB responde 413', async () => {
      const { token } = await registerUser(app);
      const big = Buffer.alloc(25 * 1024 * 1024 + 1);
      await upload(token, 'grande.mp3', 'audio/mpeg', big).expect(413);
      expect(groqMock.transcribe).not.toHaveBeenCalled();
    });

    it('falha da Groq responde 502 e nada é gravado', async () => {
      const { token } = await registerUser(app);
      groqMock.transcribe.mockRejectedValueOnce(new BadGatewayException('Falha no serviço de transcrição'));
      const res = await upload(token).expect(502);
      expect(res.body.message).toBe('Falha no serviço de transcrição');

      const list = await http().get('/api/transcriptions').set('Authorization', `Bearer ${token}`).expect(200);
      expect(list.body).toEqual([]);
    });
  });

  describe('GET /api/transcriptions', () => {
    it('lista só as do próprio usuário, mais recentes primeiro', async () => {
      const ana = await registerUser(app);
      const bia = await registerUser(app);
      const first = await upload(ana.token, 'primeiro.m4a').expect(201);
      const second = await upload(ana.token, 'segundo.m4a').expect(201);
      await upload(bia.token, 'da-bia.m4a').expect(201);

      const res = await http().get('/api/transcriptions').set('Authorization', `Bearer ${ana.token}`).expect(200);
      expect(res.body.map((t: { id: string }) => t.id)).toEqual([second.body.id, first.body.id]);
    });
  });

  describe('controle de acesso por dono', () => {
    it('B não lê nem exclui a transcrição de A (404), e A continua com ela', async () => {
      const ana = await registerUser(app);
      const bia = await registerUser(app);
      const { body } = await upload(ana.token).expect(201);

      await http().get(`/api/transcriptions/${body.id}`).set('Authorization', `Bearer ${bia.token}`).expect(404);
      await http().delete(`/api/transcriptions/${body.id}`).set('Authorization', `Bearer ${bia.token}`).expect(404);
      await http().get(`/api/transcriptions/${body.id}`).set('Authorization', `Bearer ${ana.token}`).expect(200);
    });
  });

  describe('GET e DELETE /api/transcriptions/:id', () => {
    it('id que não é uuid responde 400', async () => {
      const { token } = await registerUser(app);
      await http().get('/api/transcriptions/abc').set('Authorization', `Bearer ${token}`).expect(400);
    });

    it('uuid inexistente responde 404', async () => {
      const { token } = await registerUser(app);
      await http()
        .get('/api/transcriptions/00000000-0000-4000-8000-000000000000')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('exclui a própria (204) e depois não encontra (404)', async () => {
      const { token } = await registerUser(app);
      const { body } = await upload(token).expect(201);
      await http().delete(`/api/transcriptions/${body.id}`).set('Authorization', `Bearer ${token}`).expect(204);
      await http().get(`/api/transcriptions/${body.id}`).set('Authorization', `Bearer ${token}`).expect(404);
    });
  });
});
