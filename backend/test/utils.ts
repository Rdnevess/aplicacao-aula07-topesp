import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { vi } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { GroqClient } from '../src/transcriptions/groq.client.js';
import { UsersService } from '../src/users/users.service.js';

/** Substitui a Groq em todos os e2e: nenhum teste chama a API real. */
export const groqMock = { transcribe: vi.fn<GroqClient['transcribe']>() };

export async function createTestApp(): Promise<INestApplication<App>> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(GroqClient)
    .useValue(groqMock)
    .compile();
  const app = moduleRef.createNestApplication<INestApplication<App>>();
  configureApp(app);
  await app.init();
  return app;
}

/** Esvazia as tabelas e recria o admin do seed. */
export async function resetDatabase(app: INestApplication<App>): Promise<void> {
  await app.get(DataSource).query('TRUNCATE TABLE "transcriptions", "users" CASCADE');
  await app.get(UsersService).ensureAdmin();
}

let userCounter = 0;

export async function registerUser(
  app: INestApplication<App>,
  overrides: Partial<{ name: string; email: string; password: string }> = {},
) {
  userCounter += 1;
  const body = {
    name: 'Ana',
    email: `ana${userCounter}@teste.dev`,
    password: 'segredo123',
    ...overrides,
  };
  const res = await request(app.getHttpServer()).post('/api/auth/register').send(body).expect(201);
  return {
    token: res.body.accessToken as string,
    user: res.body.user as { id: string; email: string; role: string },
    password: body.password,
  };
}

export async function loginAdmin(app: INestApplication<App>): Promise<string> {
  const config = app.get(ConfigService);
  const res = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({
      email: config.getOrThrow<string>('ADMIN_EMAIL'),
      password: config.getOrThrow<string>('ADMIN_PASSWORD'),
    })
    .expect(200);
  return res.body.accessToken as string;
}
