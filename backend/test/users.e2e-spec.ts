import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { createTestApp, loginAdmin, registerUser, resetDatabase } from './utils.js';

describe('Administração de usuários (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;
  const http = () => request(app.getHttpServer());
  const asAdmin = (req: request.Test) => req.set('Authorization', `Bearer ${adminToken}`);

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(app);
    adminToken = await loginAdmin(app);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/users', () => {
    it('usuário comum recebe 403', async () => {
      const { token } = await registerUser(app);
      await http().get('/api/users').set('Authorization', `Bearer ${token}`).expect(403);
    });

    it('sem token recebe 401', async () => {
      await http().get('/api/users').expect(401);
    });

    it('admin lista todos, sem passwordHash', async () => {
      await registerUser(app);
      const res = await asAdmin(http().get('/api/users')).expect(200);
      expect(res.body).toHaveLength(2);
      for (const user of res.body) {
        expect(Object.keys(user).sort()).toEqual(['active', 'createdAt', 'email', 'id', 'name', 'role']);
      }
    });
  });

  describe('PATCH /api/users/:id', () => {
    it('promove outro usuário a admin', async () => {
      const { user } = await registerUser(app);
      const res = await asAdmin(http().patch(`/api/users/${user.id}`).send({ role: 'admin' })).expect(200);
      expect(res.body.role).toBe('admin');
      expect(res.body).not.toHaveProperty('passwordHash');
    });

    it('recusa campo não permitido (400)', async () => {
      const { user } = await registerUser(app);
      await asAdmin(http().patch(`/api/users/${user.id}`).send({ email: 'x@y.z' })).expect(400);
    });

    it('recusa corpo vazio (400)', async () => {
      const { user } = await registerUser(app);
      await asAdmin(http().patch(`/api/users/${user.id}`).send({})).expect(400);
    });

    it('recusa alterar a si mesmo (400)', async () => {
      const me = await asAdmin(http().get('/api/auth/me')).expect(200);
      await asAdmin(http().patch(`/api/users/${me.body.id}`).send({ active: false })).expect(400);
    });

    it('usuário inexistente responde 404', async () => {
      await asAdmin(
        http().patch('/api/users/00000000-0000-4000-8000-000000000000').send({ active: false }),
      ).expect(404);
    });

    it('usuário comum não altera ninguém (403)', async () => {
      const ana = await registerUser(app);
      const bia = await registerUser(app);
      await http()
        .patch(`/api/users/${bia.user.id}`)
        .set('Authorization', `Bearer ${ana.token}`)
        .send({ role: 'admin' })
        .expect(403);
    });

    it('desativar derruba o token antigo (401) e bloqueia o login (403)', async () => {
      const { token, user, password } = await registerUser(app);
      await asAdmin(http().patch(`/api/users/${user.id}`).send({ active: false })).expect(200);
      await http().get('/api/auth/me').set('Authorization', `Bearer ${token}`).expect(401);
      await http().post('/api/auth/login').send({ email: user.email, password }).expect(403);
    });

    it('rebaixar tira o acesso de admin do token antigo (403)', async () => {
      const { token, user } = await registerUser(app);
      await asAdmin(http().patch(`/api/users/${user.id}`).send({ role: 'admin' })).expect(200);
      await http().get('/api/users').set('Authorization', `Bearer ${token}`).expect(200);
      await asAdmin(http().patch(`/api/users/${user.id}`).send({ role: 'user' })).expect(200);
      await http().get('/api/users').set('Authorization', `Bearer ${token}`).expect(403);
    });
  });
});
