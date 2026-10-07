// Invoke from an OS scheduler. Never expose CRON_SECRET in command-line arguments.
import 'dotenv/config';
const origin = process.env.APP_URL;
const secret = process.env.CRON_SECRET;
if (!origin || !secret || secret.length < 32) throw new Error('Cần APP_URL và CRON_SECRET ít nhất 32 ký tự.');
const response = await fetch(new URL('/api/cron/reminders', origin), { method: 'POST', headers: { Authorization: 'Bearer ' + secret }, signal: AbortSignal.timeout(300000) });
const result = await response.json();
if (!response.ok) { console.error('Reminder worker failed:', result); process.exitCode = 1; }
else console.log(result);
