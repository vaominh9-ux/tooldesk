import 'server-only';
import dns from 'node:dns';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { Pool, type PoolClient } from 'pg';

try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}

function resolveCaCert(): string | undefined {
  if (process.env.DATABASE_CA_CERT) {
    return process.env.DATABASE_CA_CERT.replaceAll('\\n', '\n');
  }
  const defaultCertPath = path.join(process.cwd(), 'supabase', 'certs', 'prod-ca-2021.crt');
  if (existsSync(defaultCertPath)) {
    try {
      return readFileSync(defaultCertPath, 'utf8');
    } catch {}
  }
  return undefined;
}

let pool: Pool | null = null;

export function getDbPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error('Chưa cấu hình DATABASE_URL.');

    const caCert = resolveCaCert();
    const shouldRejectUnauthorized = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED
      ? process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true'
      : Boolean(caCert);

    pool = new Pool({
      connectionString,
      ssl: process.env.DATABASE_SSL === 'disable' ? false : {
        rejectUnauthorized: shouldRejectUnauthorized,
        ...(caCert ? { ca: caCert } : {})
      },
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
