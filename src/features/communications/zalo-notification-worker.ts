import 'server-only';
import { randomUUID } from 'node:crypto';
import { getDbPool, transaction } from '@/lib/db';
import { loadData } from '@/lib/data-repository';
import { todayInHoChiMinh } from '@/lib/clock';
import { readZaloSettings } from '@/lib/zalo-settings-store';
import { sendZaloMessage, ZaloApiError, zaloTokenConfigured } from '@/lib/zalo-bot';
import { zaloNotificationCandidates } from '@/domain/zalo-notifications';

export async function runZaloNotificationWorker() {
  const counts = { sent: 0, failed: 0, cancelled: 0, unknown: 0 };
  if (process.env.APP_DATA_SOURCE !== 'supabase') return { enabled: false, reason: 'demo', ...counts };
  if (!zaloTokenConfigured()) return { enabled: false, reason: 'missing_token', ...counts };
  const config = await readZaloSettings();
  if (!config.enabled || !config.chatId) return { enabled: false, reason: 'disabled_or_unlinked', ...counts };
  const appUrl = process.env.APP_URL;
  if (!appUrl || new URL(appUrl).protocol !== 'https:') throw new Error('Cần APP_URL dùng HTTPS cho thông báo Zalo.');
  const runId = randomUUID(), deadline = Date.now() + 45000;
  await getDbPool().query("INSERT INTO zalo_notification_runs(id,status) VALUES ($1,'running')", [runId]);
  try {
    await transaction(async client => {
      await client.query('SELECT pg_advisory_xact_lock(718328)');
      const latest = await readZaloSettings(client);
      if (!latest.enabled || !latest.chatId) return;
      const candidates = zaloNotificationCandidates(await loadData(client), todayInHoChiMinh(), new Date().toISOString(), appUrl, latest);
      if (candidates.length) await client.query("INSERT INTO zalo_notification_jobs(id,event_key,chat_id) SELECT gen_random_uuid(),event_key,$2 FROM unnest($1::text[]) AS event_key ON CONFLICT(event_key,chat_id) DO NOTHING", [candidates.map(item => item.eventKey), latest.chatId]);
      await client.query("UPDATE zalo_notification_jobs SET status='unknown',last_error='Lần gửi bị gián đoạn; cần đối chiếu Zalo trước khi gửi lại.' WHERE status='sending' AND attempted_at<NOW()-INTERVAL '10 minutes'");
      await client.query("UPDATE zalo_notification_runs SET status='attention',finished_at=NOW() WHERE status='running' AND started_at<NOW()-INTERVAL '10 minutes'");
    });
    for (let index = 0; index < 10 && Date.now() < deadline; index++) {
      const job = await transaction(async client => {
        const result = await client.query<{ id: string; event_key: string; chat_id: string }>("SELECT id,event_key,chat_id FROM zalo_notification_jobs WHERE status='pending' ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1");
        const job = result.rows[0];
        if (job) await client.query("UPDATE zalo_notification_jobs SET status='sending',attempted_at=NOW() WHERE id=$1", [job.id]);
        return job;
      });
      if (!job) break;
      try {
        const outcome = await transaction(async client => {
          // Same business lock as renewals/refunds, then the Zalo configuration lock.
          await client.query('SELECT pg_advisory_xact_lock(718326)');
          await client.query('SELECT pg_advisory_xact_lock(718328)');
          const claimed = await client.query<{ status: string }>('SELECT status FROM zalo_notification_jobs WHERE id=$1 FOR UPDATE', [job.id]);
          if (claimed.rows[0]?.status !== 'sending') return 'cancelled';
          const latest = await readZaloSettings(client);
          const item = latest.chatId === job.chat_id && zaloNotificationCandidates(await loadData(client), todayInHoChiMinh(), new Date().toISOString(), appUrl, latest).find(item => item.eventKey === job.event_key);
          if (!item) {
            await client.query("UPDATE zalo_notification_jobs SET status='cancelled',last_error='Lịch/gói, người nhận hoặc tùy chọn thông báo đã thay đổi.' WHERE id=$1", [job.id]);
            return 'cancelled';
          }
          const messageId = await sendZaloMessage(job.chat_id, item.text);
          await client.query("UPDATE zalo_notification_jobs SET status='sent',sent_at=NOW(),provider_message_id=$2,last_error=NULL WHERE id=$1", [job.id, messageId]);
          return 'sent';
        });
        counts[outcome]++;
      } catch (error) {
        const state = error instanceof ZaloApiError && error.definiteRejection ? 'failed' : 'unknown';
        counts[state]++;
        // Unknown sends never auto-retry: a provider may have accepted the message.
        const reason = error instanceof ZaloApiError ? error.message : 'Chưa xác định kết quả gửi; kiểm tra nhật ký ứng dụng và Zalo.';
        await getDbPool().query("UPDATE zalo_notification_jobs SET status=$2,last_error=$3 WHERE id=$1 AND status='sending'", [job.id, state, reason]);
      }
    }
    await getDbPool().query('UPDATE zalo_notification_runs SET finished_at=NOW(),status=$2,sent_count=$3,failed_count=$4,cancelled_count=$5,unknown_count=$6 WHERE id=$1', [runId, counts.failed || counts.unknown ? 'attention' : 'completed', counts.sent, counts.failed, counts.cancelled, counts.unknown]);
    return { enabled: true, ...counts };
  } catch (error) {
    await getDbPool().query("UPDATE zalo_notification_runs SET finished_at=NOW(),status='failed' WHERE id=$1", [runId]);
    throw error;
  }
}
