-- ========================================================
-- HƯỚNG DẪN CÀI ĐẶT CRONJOB TỰ ĐỘNG TRONG SUPABASE (PG_CRON)
-- ========================================================
-- Chạy đoạn script này trong mục "SQL Editor" trên Supabase Dashboard.
-- Lưu ý: Thay thế 'DIEN_CRON_SECRET_VAO_DAY' bằng mã bí mật CRON_SECRET của bạn.

-- 1. Kích hoạt extension pg_cron và pg_net trên Supabase
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Hủy lịch cũ nếu đã tồn tại để tránh trùng lặp
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'tooldesk-send-reminders-job') THEN
    PERFORM cron.unschedule('tooldesk-send-reminders-job');
  END IF;
END $$;

-- 3. Đặt lịch chạy tự động:
-- Mặc định chạy mỗi 15 phút ('*/15 * * * *') để kiểm tra và gửi email nhắc hạn đúng giờ
SELECT cron.schedule(
  'tooldesk-send-reminders-job',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://tooldesk-plum.vercel.app/api/cron/reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer DIEN_CRON_SECRET_VAO_DAY'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- 4. Kiểm tra các job đang chạy:
-- SELECT jobid, jobname, schedule, active FROM cron.job;

-- 5. Xem lịch sử các lần chạy gần nhất:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
