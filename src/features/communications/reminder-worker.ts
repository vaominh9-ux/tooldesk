import 'server-only';
import { randomUUID } from 'node:crypto';
import { getDbPool, transaction } from '@/lib/db';
import { loadData } from '@/lib/data-repository';
import { todayInHoChiMinh } from '@/lib/clock';
import { sendEmail } from '@/lib/email';
import { readSmtpConfig } from '@/lib/smtp-config-store';
import { reminderCandidates } from '@/domain/reminders';

export async function runReminderWorker() {
  if (process.env.APP_DATA_SOURCE !== 'supabase') return { enabled: false, sent: 0, failed: 0, cancelled: 0, unknown: 0 };
  const deadline = Date.now() + 40000;
  // Disabled mode never marks a reminder or consumes its delivery attempt.
  const { config } = await readSmtpConfig();
  if (!config?.enabled) return { enabled: false, sent: 0, failed: 0, cancelled: 0, unknown: 0 };
  const runId = randomUUID();
  await getDbPool().query("INSERT INTO reminder_runs (id,status) VALUES ($1,'running')", [runId]);
  try {
    const result = await processReminders(config.sendHour, deadline);
    const status = result.waitingForSendHour ? 'waiting' : result.failed || result.unknown ? 'attention' : 'completed';
    await getDbPool().query('UPDATE reminder_runs SET finished_at=NOW(),status=$2,sent_count=$3,failed_count=$4,cancelled_count=$5,unknown_count=$6 WHERE id=$1', [runId, status, result.sent, result.failed, result.cancelled, result.unknown]);
    return result;
  } catch (error) {
    await getDbPool().query("UPDATE reminder_runs SET finished_at=NOW(),status='failed',error=$2 WHERE id=$1", [runId, (error instanceof Error ? error.message : 'Tác vụ nhắc thất bại.').slice(0, 500)]);
    throw error;
  }
}

async function processReminders(sendHour: number, deadline: number) {
  const today = todayInHoChiMinh();
  if (!Number.isInteger(sendHour) || sendHour < 0 || sendHour > 23) throw new Error('REMINDER_SEND_HOUR phải từ 0 đến 23.');
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', hourCycle: 'h23' }).format(new Date()));
  if (hour < sendHour) return { enabled: true, waitingForSendHour: true, sent: 0, failed: 0, cancelled: 0, unknown: 0 };
  await transaction(async client => {
    await client.query('SELECT pg_advisory_xact_lock(718326)');
    const candidates = reminderCandidates(await loadData(client), today);
    if (candidates.length) await client.query("INSERT INTO email_outbox (id,subscription_id,cycle_key,status) SELECT gen_random_uuid(),subscription_id,cycle_key,'pending' FROM unnest($1::text[],$2::text[]) AS candidates(subscription_id,cycle_key) ON CONFLICT (cycle_key) DO NOTHING", [candidates.map(item => item.subscriptionId), candidates.map(item => item.cycleKey)]);
    // A terminated process may have handed a message to SMTP. Never resend blindly.
    await client.query("UPDATE email_outbox SET status='unknown',last_error='Tác vụ gửi bị gián đoạn; cần đối chiếu SMTP trước khi thử lại.' WHERE status='sending' AND attempted_at < NOW()-INTERVAL '10 minutes'");
    await client.query("UPDATE reminder_runs SET status='attention',finished_at=NOW(),error='Tác vụ bị gián đoạn; đối chiếu hàng đợi trước khi gửi lại.' WHERE status='running' AND started_at<NOW()-INTERVAL '10 minutes'");
  });
  let sent = 0, failed = 0, cancelled = 0, unknown = 0;
  for (let index = 0; index < 20 && Date.now() < deadline; index++) {
    const job = await transaction(async client => {
      const result = await client.query<{ id: string; cycle_key: string }>("SELECT id,cycle_key FROM email_outbox WHERE status IN ('pending','retry') AND next_attempt_at<=NOW() AND attempts<3 ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1");
      const job = result.rows[0];
      if (job) await client.query("UPDATE email_outbox SET status='sending',attempts=attempts+1,attempted_at=NOW() WHERE id=$1", [job.id]);
      return job;
    });
    if (!job) break;
    try {
      const outcome = await transaction(async client => {
        // Serializes the final eligibility check + SMTP handoff with renewal/refund.
        await client.query('SELECT pg_advisory_xact_lock(718326)');
        const claimed = await client.query<{ status: string }>('SELECT status FROM email_outbox WHERE id=$1 FOR UPDATE', [job.id]);
        if (claimed.rows[0]?.status !== 'sending') return 'cancelled';
        const latest = (await readSmtpConfig(client)).config;
        const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', hourCycle: 'h23' }).format(new Date()));
        const defer = async () => {
          await client.query("UPDATE email_outbox SET status='pending',attempts=GREATEST(0,attempts-1),attempted_at=NULL,last_error='Tạm dừng; tác vụ sẽ tiếp tục theo cấu hình ở lượt chạy sau.' WHERE id=$1", [job.id]);
          return 'deferred' as const;
        };
        if (!latest?.enabled || hour < latest.sendHour || Date.now() + 15000 > deadline) return defer();
        const item = reminderCandidates(await loadData(client), todayInHoChiMinh()).find(item => item.cycleKey === job.cycle_key);
        if (!item) { await client.query("UPDATE email_outbox SET status='cancelled',last_error='Gói hoặc đồng ý nhận email đã thay đổi.' WHERE id=$1", [job.id]); return 'cancelled'; }
        const result = await sendEmail({ to: item.email, subject: item.subject, text: item.text }, latest);
        if (result.skipped) return defer();
        await client.query("UPDATE email_outbox SET status='sent',sent_at=NOW(),provider_message_id=$2,recipient=$3,last_error=NULL WHERE id=$1", [job.id, result.messageId, item.email]);
        return 'sent';
      });
      if (outcome === 'deferred') break;
      outcome === 'sent' ? sent++ : cancelled++;
    } catch (error) {
      // SMTP 4xx/5xx explicitly rejects delivery; network timeouts are ambiguous.
      const responseCode = error && typeof error === 'object' && 'responseCode' in error ? Number(error.responseCode) : 0;
      const definiteRejection = responseCode >= 400 && responseCode <= 599;
      const state = definiteRejection ? (responseCode < 500 ? 'retry' : 'failed') : 'unknown';
      definiteRejection ? failed++ : unknown++;
      const message = error instanceof Error ? error.message : 'Lỗi gửi email.';
      await getDbPool().query("UPDATE email_outbox SET status=CASE WHEN attempts>=3 AND $2='retry' THEN 'failed' ELSE $2 END,last_error=$3,next_attempt_at=NOW()+INTERVAL '15 minutes' WHERE id=$1 AND status='sending'", [job.id, state, message.slice(0, 500)]);
    }
  }
  return { enabled: true, waitingForSendHour: false, sent, failed, cancelled, unknown };
}
