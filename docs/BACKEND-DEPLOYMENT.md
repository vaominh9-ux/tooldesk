# Backend, nhắc hạn và SMTP — triển khai

Mã nguồn đã có Supabase Auth, phân quyền admin/staff/viewer, API command giao dịch, validation chung cho mock/backend, repository PostgreSQL, worker nhắc hạn và SMTP. Chưa chạy migration trên cloud, chưa tạo lịch ngoài hệ thống, chưa gửi email thật.

## Cấu hình môi trường

Dùng .env.example làm mẫu. Không gửi mật khẩu SMTP vào chat hoặc lưu trong mã nguồn.

- APP_DATA_SOURCE=mock: demo độc lập. supabase: bắt buộc đăng nhập và quyền app_users.
- APP_URL: đúng origin trình duyệt.
- SUPABASE_URL, SUPABASE_ANON_KEY: Supabase Auth.
- DATABASE_URL: connection phía server. TLS kiểm tra chứng chỉ; không có mật khẩu fallback.
- CRON_SECRET: ít nhất 32 ký tự ngẫu nhiên, chỉ scheduler biết.
- EMAIL_SEND_ENABLED=false mặc định. Worker không claim/đánh dấu gì khi chưa bật.
- SMTP: HOST, PORT, USER, PASSWORD, FROM, SECURE; cổng 587 dùng STARTTLS, 465 dùng TLS.
- REMINDER_SEND_HOUR=9: không gửi trước 09:00 Asia/Ho_Chi_Minh.

## Database

Sao lưu và kiểm tra staging trước. Với database mới: áp dụng supabase/schema.sql, sau đó supabase/migrations/20261007_backend_foundation.sql. Với DB cũ: chỉ áp dụng migration một lần. Migration có transaction; nếu phát hiện mã refund trùng thì unique index sẽ thất bại và rollback. Không sửa/xóa dữ liệu cũ âm thầm. CHECK NOT VALID vẫn kiểm tra các lần ghi mới; audit rồi VALIDATE dữ liệu legacy riêng.

Migration gỡ policy Allow full access for anon và thu hồi quyền anon/authenticated trên các bảng Tooldesk. Cần kiểm tra ứng dụng khác đang dùng các bảng này trước khi áp dụng. Mã server dùng connection được bảo vệ và kiểm tra quyền ở từng API. Chưa có kiểm thử SQL trên PostgreSQL thật trong phiên này.

Thêm user được phép vào app_users với UUID tài khoản Supabase Auth và role. API kiểm tra token Auth rồi app_users. Viewer không ghi được; staff không thay bảng giá/cài đặt. Không có tenant/workspace.

Command chạy trong transaction, serialized bằng advisory lock; lưu request hash và UUID operation để retry cùng nội dung không ghi tiền/đơn hai lần. Gói gia hạn có snapshot kỳ trước; refund không sửa giá đơn lịch sử. Ngày vận hành dùng UTC+7; mock dùng fixed clock.

Bảng email_outbox lưu pending/sending/sent/retry/failed/cancelled/unknown. Khóa subscription+hạn+đơn mới nhất đảm bảo một nhắc cho mỗi kỳ. Campaign vẫn lưu draft, chưa gửi hàng loạt.

## Lịch tự động

Scheduler bên ngoài gọi POST /api/cron/reminders mỗi 15 phút với Authorization: Bearer CRON_SECRET. Không dùng setInterval trong trình duyệt. Chưa tự tạo cron hoặc deployment.

Lệnh npm run reminders:run đọc APP_URL/CRON_SECRET từ môi trường rồi gọi worker. Gắn lệnh này vào scheduler của máy chủ luôn chạy. Không gắn lịch vào laptop nếu muốn chạy khi máy tắt. Cờ reminderSchedulerConfigured ở health chỉ xác nhận secret có đủ độ dài; không chứng minh lịch ngoài hệ thống đã được cài. Nhật ký email có trong Cài đặt và API /api/reminders/status.

Worker chọn gói còn hạn trong cửa sổ reminderDays, đã bắt đầu, chưa dừng, email hợp lệ và opted_in. Trước khi gửi kiểm tra lại gói/consent. Gói gia hạn đổi cycle key, tác vụ cũ bị cancelled.

SMTP 4xx thử lại sau 15 phút, tối đa 3 lần; 5xx failed. Timeout hoặc worker chết sau khi SMTP có thể đã nhận là unknown và không retry tự động để tránh gửi trùng. sent nghĩa là SMTP đã chấp nhận, không bảo đảm inbox delivery.

## Nghiệm thu trước bật thật

1. Chạy typecheck/test/build, staging migration và kiểm tra dữ liệu legacy.
2. Đăng nhập admin/staff/viewer, thử request không đăng nhập/khác origin.
3. Tạo đơn, thu tiền, gia hạn, refund, rollback; reload đối chiếu DB.
4. Dùng mailbox thử; bật SMTP staging, gọi worker hai lần kiểm tra chống trùng.
5. Kiểm tra scheduler heartbeat/log và job unknown/failed, sau đó mới bật production.

Phiên này chưa xác nhận migration, SMTP hoặc scheduler cloud đã chạy. SUPABASE_GUIDE cũ không đại diện cho trạng thái backend hiện tại.

Kiểm chứng mã nguồn: 24/24 unit test pass (11 domain, 8 commands/eligibility, 5 worker mock), typecheck pass, Next build pass. Lint đang bị bỏ qua theo cấu hình workspace, không báo lint pass. Auth/database/SMTP chưa được nghiệm thu end-to-end. Session hiện chỉ dùng access token, hết hạn thì đăng nhập lại; chưa có refresh session. Chiến dịch gửi hàng loạt chưa bật, chỉ email nhắc hạn tự động khi cấu hình đầy đủ.
