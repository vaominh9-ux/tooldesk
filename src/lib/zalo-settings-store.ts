import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import type { Pool } from 'pg';
import { getDbPool, transaction } from './db';
import { zaloDefaultPreferences, zaloPreferencesSchema, type ZaloPreferences } from '@/domain/zalo-notifications';

export type ZaloSettings = ZaloPreferences & { chatId: string | null; recipientName: string | null; pairingPending: boolean };
export async function readZaloSettings(client: Pick<Pool, 'query'> = getDbPool()): Promise<ZaloSettings> {
  const result = await client.query<{ enabled: boolean; expiring: boolean; expired: boolean; care: boolean; send_hour: number; chat_id: string | null; recipient_name: string | null; pairing_pending: boolean }>("SELECT enabled,expiring,expired,care,send_hour,chat_id,recipient_name,(pairing_hash IS NOT NULL AND pairing_expires_at>NOW()) AS pairing_pending FROM zalo_bot_settings WHERE id='default'");
  const row = result.rows[0];
  if (!row) throw new Error('Chưa có cấu hình Zalo. Cần áp dụng migration Zalo.');
  return { ...zaloPreferencesSchema.parse({ ...row, sendHour: row.send_hour }), chatId: row.chat_id, recipientName: row.recipient_name, pairingPending: row.pairing_pending };
}
export async function saveZaloPreferences(input: ZaloPreferences) {
  const value = zaloPreferencesSchema.parse(input);
  await transaction(async client => {
    await client.query('SELECT pg_advisory_xact_lock(718328)');
    const previous = await readZaloSettings(client);
    if (value.enabled && !previous.chatId) throw new Error('Liên kết Zalo cá nhân trước khi bật thông báo.');
    await client.query("UPDATE zalo_bot_settings SET enabled=$1,expiring=$2,expired=$3,care=$4,send_hour=$5,updated_at=NOW() WHERE id='default'", [value.enabled, value.expiring, value.expired, value.care, value.sendHour]);
  });
}
export async function createZaloPairing() {
  const code = randomBytes(12).toString('hex'), hash = createHash('sha256').update(code).digest('hex');
  const expiresAt = new Date(Date.now() + 10 * 60000).toISOString();
  await getDbPool().query("UPDATE zalo_bot_settings SET pairing_hash=$1,pairing_expires_at=$2,updated_at=NOW() WHERE id='default'", [hash, expiresAt]);
  return { command: `/tooldesk ${code}`, expiresAt };
}
export async function consumeZaloPairing(message: { code: string; chatId: string; name: string }) {
  const hash = createHash('sha256').update(message.code).digest('hex');
  return transaction(async client => {
    await client.query('SELECT pg_advisory_xact_lock(718328)');
    const result = await client.query("UPDATE zalo_bot_settings SET chat_id=$2,recipient_name=$3,enabled=FALSE,pairing_hash=NULL,pairing_expires_at=NULL,updated_at=NOW() WHERE id='default' AND pairing_hash=$1 AND pairing_expires_at>NOW() RETURNING id", [hash, message.chatId, message.name]);
    return result.rows.length === 1;
  });
}
export const emptyZaloSettings: ZaloSettings = { ...zaloDefaultPreferences, chatId: null, recipientName: null, pairingPending: false };
