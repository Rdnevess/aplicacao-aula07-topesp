import pg from 'pg';

export default async function globalSetup(): Promise<void> {
  process.loadEnvFile('.env');
  const client = new pg.Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  await client.connect();
  try {
    const result = await client.query("SELECT 1 FROM pg_database WHERE datname = 'ditado_test'");
    if (result.rowCount === 0) {
      await client.query('CREATE DATABASE ditado_test');
    }
  } finally {
    await client.end();
  }
}
