import { validateEnv } from './env.validation.js';

const valid = {
  PORT: '3000',
  DB_HOST: 'localhost',
  DB_PORT: '5432',
  DB_USER: 'ditado',
  DB_PASSWORD: 'ditado',
  DB_NAME: 'ditado',
  JWT_SECRET: 'a'.repeat(64),
  JWT_EXPIRES_IN: '1d',
  GROQ_API_KEY: 'gsk_teste',
  GROQ_MODEL: 'whisper-large-v3-turbo',
  ADMIN_NAME: 'Administrador',
  ADMIN_EMAIL: 'admin@ditado.dev',
  ADMIN_PASSWORD: 'segredo123',
};

describe('validateEnv', () => {
  it('aceita a configuração completa e converte as portas para número', () => {
    const env = validateEnv(valid);
    expect(env.PORT).toBe(3000);
    expect(env.DB_PORT).toBe(5432);
  });

  it('recusa JWT_SECRET vazio e cita a variável', () => {
    expect(() => validateEnv({ ...valid, JWT_SECRET: '' })).toThrow(/JWT_SECRET/);
  });

  it('recusa GROQ_API_KEY ausente e cita a variável', () => {
    const { GROQ_API_KEY: _omitida, ...semChave } = valid;
    expect(() => validateEnv(semChave)).toThrow(/GROQ_API_KEY/);
  });

  it('recusa ADMIN_PASSWORD com menos de 8 caracteres', () => {
    expect(() => validateEnv({ ...valid, ADMIN_PASSWORD: '1234567' })).toThrow(/ADMIN_PASSWORD/);
  });

  it('recusa ADMIN_EMAIL inválido', () => {
    expect(() => validateEnv({ ...valid, ADMIN_EMAIL: 'admin' })).toThrow(/ADMIN_EMAIL/);
  });
});
