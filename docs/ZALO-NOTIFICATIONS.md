# Thông báo Zalo cá nhân — bàn giao triển khai

Tính năng dùng Zalo Bot HTTP API, không dùng tài khoản Zalo cá nhân để tự đăng nhập.
Chỉ gửi đến cuộc trò chuyện riêng được quản trị viên liên kết. Không gửi quảng cáo
hoặc tin chăm sóc trực tiếp đến khách hàng.

## Biến môi trường trên server/Vercel

- `APP_DATA_SOURCE=supabase`.
- `APP_URL=https://tooldesk-plum.vercel.app`.
- `ZALO_BOT_TOKEN`: token thật, nhập bằng secret environment variable.
- `ZALO_WEBHOOK_SECRET`: khóa ngẫu nhiên từ 32 tới 256 ký tự.
- `CRON_SECRET`: khóa ngẫu nhiên ít nhất 32 ký tự, có thể dùng khóa cron hiện có.
- Các biến DB/Auth hiện có phải hoạt động; Supabase Pooler dùng cổng 6543.

Không prefix token bằng `NEXT_PUBLIC_`, không thêm token vào Git, URL hướng dẫn,
log hoặc ảnh chụp màn hình. Token chỉ được đọc ở module `server-only`.
Không cần đưa token bot vào database.

## Migration và triển khai

1. Áp dụng `supabase/migrations/20261008_zalo_notifications.sql` sau các migration
   nền tảng và chăm sóc hiện có, bằng tài khoản triển khai được cấp quyền.
   Migration thêm ba bảng, không sửa khách/đơn/gói/giao dịch.
2. Cấu hình các biến môi trường trên Production và triển khai bản code mới.
3. Đăng nhập quản trị viên, vào **Cài đặt → Thông báo Zalo**.
4. Bấm **Đăng ký webhook**. Chỉ coi endpoint hoạt động khi giao diện xác nhận
   Zalo đã xác minh thành công. Nếu bot đã nối webhook khác, hệ thống sẽ từ chối
   ghi đè để người vận hành đối chiếu.
5. Bấm **Liên kết Zalo cá nhân**, gửi đúng dòng `/tooldesk ...` hiển thị vào
   cuộc trò chuyện riêng với bot. Mã dùng một lần, hết hạn sau 10 phút; không
   tự chọn người gửi đầu tiên hoặc nhận liên kết từ nhóm/bot khác.
6. Chờ tên người nhận hiện lên; bấm **Gửi tin kiểm tra**, kiểm tra tin trong Zalo.
7. Chọn ba loại thông báo, giờ nhắc hạn (mặc định 09:00 giờ Việt Nam), bật thông
   báo và lưu. Liên kết/relink luôn để thông báo tắt cho đến khi người dùng bật lại.

## Lịch chạy định kỳ

Endpoint: `GET` hoặc `POST /api/cron/zalo-notifications`.
Header: `Authorization: Bearer <CRON_SECRET>`. Không đặt secret vào query string.
Tác vụ Zalo độc lập với tác vụ SMTP; lỗi SMTP không chặn thông báo Zalo.

Để nhắc lịch hẹn với độ trễ bình thường tối đa khoảng 5 phút, cần scheduler gọi
endpoint mỗi 5 phút. Vercel Pro có thể thêm vào `vercel.json` của project:

```json
{
  "crons": [
    { "path": "/api/cron/zalo-notifications", "schedule": "*/5 * * * *" }
  ]
}
```

Giữ các cấu hình `regions` và cron khác của project. Lịch cron Vercel dùng UTC;
việc tính giờ nhắc trong ứng dụng luôn dùng Asia/Ho_Chi_Minh.

Vercel Hobby chỉ hỗ trợ cron mỗi ngày và thời điểm chạy có thể lệch trong một
giờ. Scheduler ngoài gọi endpoint bảo vệ mỗi 5 phút là phương án cho Hobby nếu
cần nhắc hẹn gần đúng giờ. Không dùng vòng lặp/setInterval trong serverless,
không tự thêm dịch vụ trả phí. Agent triển khai xác nhận scheduler/plan và cấu
hình lịch chạy; bản code này không tự đăng ký cron Vercel.

Mỗi lượt xử lý tối đa 10 tin và dành khoảng 45 giây cho vòng xử lý; yêu cầu
`maxDuration=60`. Nếu còn hàng đợi, lượt cron tiếp theo tiếp tục. Lịch mỗi ngày
không phù hợp cho lịch hẹn sát giờ hoặc danh sách cần nhắc lớn.

## Quy tắc gửi và đối chiếu

- Gói sắp hết hạn và quá hạn: một tin mỗi gói/kỳ dịch vụ/trạng thái/ngày, bắt đầu
  từ giờ đã chọn. Cửa sổ sắp hạn dùng `settings.reminderDays`.
- Gói chưa bắt đầu hoặc đã dừng không được nhắc. Hạn dịch vụ là mốc exclusive
  lúc 00:00 theo giờ Việt Nam.
- Lịch chăm sóc: một tin mỗi lịch/thời điểm hẹn, khi đến hạn và còn đang chờ.
  Hoàn tất/hủy lịch không gửi; đổi thời điểm hẹn tạo mốc nhắc mới.
- Kiểm tra lại dữ liệu và người nhận ngay trước khi gửi; dùng cùng khóa giao
  dịch với gia hạn/refund để tránh gửi dữ liệu đã hết hiệu lực.
- Unique key và claim `FOR UPDATE SKIP LOCKED` chống xử lý lặp khi cron gọi lại.
- Thành công là Zalo trả `ok=true` và mã tin nhắn; không đồng nghĩa người nhận
  đã đọc tin. Không tự đánh dấu khách đã được liên hệ hoặc đã chăm sóc.
- Provider từ chối: `failed`; lỗi mạng/timeout hoặc ghi nhận sau gửi thất bại:
  `unknown`. Không tự gửi lại các trạng thái này vì có thể gây tin trùng.
  Đối chiếu Zalo và bảng `zalo_notification_jobs` trước khi thao tác lại.
- Tác vụ bị ngắt quá 10 phút được ghi nhận cần kiểm tra ở lượt chạy tiếp theo.
  Giao diện hiển thị lần chạy gần nhất, số tin chờ/lỗi/chưa xác định; cấu hình
  secret hoặc lưu tùy chọn không được coi là bằng chứng scheduler hoạt động.

## Nghiệm thu trên Production

Sau khi triển khai: kiểm tra GET cấu hình với admin, webhook xác minh, liên kết
đúng tài khoản cá nhân, một tin kiểm tra, cron thực sự chạy và lần gọi lặp không
gửi trùng. Kiểm tra tắt thông báo, hoàn tất/hủy lịch, gia hạn gói trước lần gửi
tiếp theo. Không dùng dữ liệu demo hoặc gọi endpoint thật trong bộ test tự động.

Tài liệu chính thức:
- https://docs.zaloplatforms.com/docs/BOT/apis/sendMessage
- https://docs.zaloplatforms.com/docs/BOT/apis/setWebhook
- https://docs.zaloplatforms.com/docs/BOT/webhook
- https://vercel.com/docs/cron-jobs/usage-and-pricing
