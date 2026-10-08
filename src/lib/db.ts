import 'server-only';
import dns from 'node:dns';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { Pool, type PoolClient } from 'pg';

try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}

const DEFAULT_SUPABASE_CA_CERT = `-----BEGIN CERTIFICATE-----
MIIDxDCCAqygAwIBAgIUbLxMod62P2ktCiAkxnKJwtE9VPYwDQYJKoZIhvcNAQEL
BQAwazELMAkGA1UEBhMCVVMxEDAOBgNVBAgMB0RlbHdhcmUxEzARBgNVBAcMCk5l
dyBDYXN0bGUxFTATBgNVBAoMDFN1cGFiYXNlIEluYzEeMBwGA1UEAwwVU3VwYWJh
c2UgUm9vdCAyMDIxIENBMB4XDTIxMDQyODEwNTY1M1oXDTMxMDQyNjEwNTY1M1ow
azELMAkGA1UEBhMCVVMxEDAOBgNVBAgMB0RlbHdhcmUxEzARBgNVBAcMCk5ldyBD
YXN0bGUxFTATBgNVBAoMDFN1cGFiYXNlIEluYzEeMBwGA1UEAwwVU3VwYWJhc2Ug
Um9vdCAyMDIxIENBMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAqQXW
QyHOB+qR2GJobCq/CBmQ40G0oDmCC3mzVnn8sv4XNeWtE5XcEL0uVih7Jo4Dkx1Q
DmGHBH1zDfgs2qXiLb6xpw/CKQPypZW1JssOTMIfQppNQ87K75Ya0p25Y3ePS2t2
GtvHxNjUV6kjOZjEn2yWEcBdpOVCUYBVFBNMB4YBHkNRDa/+S4uywAoaTWnCJLUi
cvTlHmMw6xSQQn1UfRQHk50DMCEJ7Cy1RxrZJrkXXRP3LqQL2ijJ6F4yMfh+Gyb4
O4XajoVj/+R4GwywKYrrS8PrSNtwxr5StlQO8zIQUSMiq26wM8mgELFlS/32Uclt
NaQ1xBRizkzpZct9DwIDAQABo2AwXjALBgNVHQ8EBAMCAQYwHQYDVR0OBBYEFKjX
uXY32CztkhImng4yJNUtaUYsMB8GA1UdIwQYMBaAFKjXuXY32CztkhImng4yJNUt
aUYsMA8GA1UdEwEB/wQFMAMBAf8wDQYJKoZIhvcNAQELBQADggEBAB8spzNn+4VU
tVxbdMaX+39Z50sc7uATmus16jmmHjhIHz+l/9GlJ5KqAMOx26mPZgfzG7oneL2b
VW+WgYUkTT3XEPFWnTp2RJwQao8/tYPXWEJDc0WVQHrpmnWOFKU/d3MqBgBm5y+6
jB81TU/RG2rVerPDWP+1MMcNNy0491CTL5XQZ7JfDJJ9CCmXSdtTl4uUQnSuv/Qx
Cea13BX2ZgJc7Au30vihLhub52De4P/4gonKsNHYdbWjg7OWKwNv/zitGDVDB9Y2
CMTyZKG3XEu5Ghl1LEnI3QmEKsqaCLv12BnVjbkSeZsMnevJPs1Ye6TjjJwdik5P
o/bKiIz+Fq8=
-----END CERTIFICATE-----`;

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
  return DEFAULT_SUPABASE_CA_CERT;
}

let pool: Pool | null = null;

export function getDbPool(): Pool {
  if (!pool) {
    let connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error('Chưa cấu hình DATABASE_URL.');

    // Auto-normalize pooler port: port 5432 is session mode (max 15 clients),
    // port 6543 is transaction mode (high concurrency for serverless).
    if (connectionString.includes('.pooler.supabase.com:5432')) {
      connectionString = connectionString.replace('.pooler.supabase.com:5432', '.pooler.supabase.com:6543');
    }

    const caCert = resolveCaCert();
    const shouldRejectUnauthorized = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED
      ? process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true'
      : Boolean(caCert);

    const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

    pool = new Pool({
      connectionString,
      ssl: process.env.DATABASE_SSL === 'disable' ? false : {
        rejectUnauthorized: shouldRejectUnauthorized,
        ...(caCert ? { ca: caCert } : {})
      },
      max: isServerless ? 2 : 10,
      idleTimeoutMillis: isServerless ? 5000 : 30000,
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
