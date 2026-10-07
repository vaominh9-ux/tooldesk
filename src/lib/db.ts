import 'server-only';
import dns from 'node:dns';
import { Pool, type PoolClient } from 'pg';

try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}

let pool: Pool | null = null;

export function getDbPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error('Chưa cấu hình DATABASE_URL.');

    pool = new Pool({
      connectionString,
      ssl: process.env.DATABASE_SSL === 'disable' ? false : { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true', ...(process.env.DATABASE_CA_CERT ? { ca: process.env.DATABASE_CA_CERT.replaceAll('\\n', '\n') } : {}) },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    });
  }
  return pool;
}

export async function transaction<T>(run: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getDbPool().connect();
  try {
    await client.query('BEGIN');
    const result = await run(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}
