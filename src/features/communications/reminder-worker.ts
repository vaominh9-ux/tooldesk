import 'server-only';
import { randomUUID } from 'node:crypto';
import { getDbPool, transaction } from '@/lib/db';
import { loadData } from '@/lib/data-repository';
import { todayInHoChiMinh } from '@/lib/clock';
import { emailConfigured, sendEmail } from '@/lib/email';
import { reminderCandidates } from '@/domain/reminders';

export async function runReminderWorker() {
  // Disabled mode never marks a reminder or consumes its delivery attempt.
  if (!emailConfigured()) return { enabled: false, sent: 0, failed: 0, cancelled: 0, unknown: 0 };
  const today = todayInHoChiMinh();
  const sendHour = Number(process.env.REMINDER_SEND_HOUR || 9);
  if (!Number.isInteger(sendHour) || sendHour < 0 || sendHour > 23) throw new Error('REMINDER_SEND_HOUR phải từ 0 đến 23.');
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', hourCycle: 'h23' }).format(new Date()));
  if (hour < sendHour) return { enabled: true, waitingForSendHour: true };
  await transaction(async client => {
    await client.query('SELECT pg_advisory_xact_lock(718326)');
    for (const item of reminderCandidates(await loadData(client), today)) {
      await client.query("INSERT INTO email_outbox (id,subscription_id,cycle_key,status) VALUES ($1,$2,$3,'pending') ON CONFLICT (cycle_key) DO NOTHING", [randomUUID(), item.subscriptionId, item.cycleKey]);
    }
    // A terminated process may have handed a message to SMTP. Never resend blindly.
    await client.query("UPDATE email_outbox SET status='unknown',last_error='Tác vụ gửi bị gián đoạn; cần đối chiếu SMTP trước khi thử lại.' WHERE status='sending' AND attempted_at < NOW()-INTERVAL '10 minutes'");
  });
  let sent = 0, failed = 0, cancelled = 0, unknown = 0;
  for (let index = 0; index < 20; index++) {
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
        const item = reminderCandidates(await loadData(client), todayInHoChiMinh()).find(item => item.cycleKey === job.cycle_key);
        if (!item) { await client.query("UPDATE email_outbox SET status='cancelled',last_error='Gói hoặc đồng ý nhận email đã thay đổi.' WHERE id=$1", [job.id]); return 'cancelled'; }
        const result = await sendEmail({ to: item.email, subject: item.subject, text: item.text });
        if (result.skipped) throw new Error('SMTP chưa được bật/cấu hình.');
        await client.query("UPDATE email_outbox SET status='sent',sent_at=NOW(),provider_message_id=$2,recipient=$3,last_error=NULL WHERE id=$1", [job.id, result.messageId, item.email]);
        return 'sent';
      });
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
  return { enabled: true, sent, failed, cancelled, unknown };
}
