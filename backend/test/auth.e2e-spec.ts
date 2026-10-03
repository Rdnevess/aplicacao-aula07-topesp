import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { UsersService } from '../src/users/users.service.js';
import { createTestApp, registerUser, resetDatabase } from './utils.js';

describe('Autenticação (e2e)', () => {
  let app: INestApplication<App>;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(app);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/auth/register', () => {
    it('cria a conta e devolve o usuário sem hash, com token', async () => {
      const res = await http()
        .post('/api/auth/register')
        .send({ name: '  Ana  ', email: 'Ana@Teste.DEV', password: 'segredo123' })
        .expect(201);

      expect(res.body.accessToken).toEqual(expect.any(String));
      expect(res.body.user).toEqual({
        id: expect.any(String),
        name: 'Ana',
        email: 'ana@teste.dev',
        role: 'user',
        active: true,
        createdAt: expect.any(String),
      });
    });

    it('recusa role no corpo (400)', async () => {
      await http()
        .post('/api/auth/register')
        .send({ name: 'Ana', email: 'ana@teste.dev', password: 'segredo123', role: 'admin' })
        .expect(400);
    });

    it('recusa e-mail já cadastrado, mesmo com maiúsculas diferentes (409)', async () => {
      await registerUser(app, { email: 'bia@teste.dev' });
      const res = await http()
        .post('/api/auth/register')
        .send({ name: 'Bia', email: 'BIA@teste.dev', password: 'segredo123' })
        .expect(409);
      expect(res.body.message).toBe('E-mail já cadastrado');
    });

    it('recusa senha com 7 caracteres (400)', async () => {
      await http()
        .post('/api/auth/register')
        .send({ name: 'Ana', email: 'ana@teste.dev', password: '1234567' })
        .expect(400);
    });

    it('grava a senha como hash bcrypt', async () => {
      await registerUser(app, { email: 'hash@teste.dev', password: 'segredo123' });
      const [row] = await app
        .get(DataSource)
        .query(`SELECT "passwordHash" FROM users WHERE email = 'hash@teste.dev'`);
      expect(row.passwordHash).toMatch(/^\$2[aby]\$10\$/);
      expect(row.passwordHash).not.toContain('segredo123');
    });
  });

  describe('POST /api/auth/login', () => {
    it('entra com credenciais corretas (200)', async () => {
      const { user, password } = await registerUser(app);
      const res = await http()
        .post('/api/auth/login')
        .send({ email: user.email, password })
        .expect(200);
      expect(res.body.accessToken).toEqual(expect.any(String));
      expect(res.body.user.email).toBe(user.email);
      expect(res.body.user).not.toHaveProperty('passwordHash');
    });

    it('responde 401 com a mesma mensagem para senha errada e e-mail inexistente', async () => {
      const { user } = await registerUser(app);
      const wrongPassword = await http()
        .post('/api/auth/login')
        .send({ email: user.email, password: 'outrasenha' })
        .expect(401);
      const unknownEmail = await http()
        .post('/api/auth/login')
        .send({ email: 'ninguem@teste.dev', password: 'outrasenha' })
        .expect(401);
      expect(wrongPassword.body.message).toBe('E-mail ou senha inválidos');
      expect(unknownEmail.body.message).toBe('E-mail ou senha inválidos');
    });

    it('responde 403 para conta desativada', async () => {
      const { user, password } = await registerUser(app);
      await app.get(DataSource).query('UPDATE users SET active = false WHERE id = $1', [user.id]);
      const res = await http()
        .post('/api/auth/login')
        .send({ email: user.email, password })
        .expect(403);
      expect(res.body.message).toBe('Conta desativada');
    });
  });

  describe('GET /api/auth/me', () => {
    it('sem token responde 401', async () => {
      await http().get('/api/auth/me').expect(401);
    });

    it('com token responde o usuário', async () => {
      const { token, user } = await registerUser(app);
      const res = await http().get('/api/auth/me').set('Authorization', `Bearer ${token}`).expect(200);
      expect(res.body.id).toBe(user.id);
      expect(res.body).not.toHaveProperty('passwordHash');
    });

    it('token de usuário desativado responde 401', async () => {
      const { token, user } = await registerUser(app);
      await app.get(DataSource).query('UPDATE users SET active = false WHERE id = $1', [user.id]);
      await http().get('/api/auth/me').set('Authorization', `Bearer ${token}`).expect(401);
    });
  });

  describe('seed do administrador', () => {
    it('cria o admin uma única vez', async () => {
      await app.get(UsersService).ensureAdmin();
      await app.get(UsersService).ensureAdmin();
      const email = app.get(ConfigService).getOrThrow<string>('ADMIN_EMAIL').toLowerCase();
      const rows = await app
        .get(DataSource)
        .query('SELECT role FROM users WHERE email = $1', [email]);
      expect(rows).toEqual([{ role: 'admin' }]);
    });
  });
});
