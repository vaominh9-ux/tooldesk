# Kiểm tra logic Tooldesk — 08/10/2026

Đã kiểm tra mã nguồn, chạy kiểm thử và đọc database đang được cấu hình bởi
`DATABASE_URL` trong workspace. Không thể kết luận hệ thống đúng 100%: còn việc
triển khai migration và scheduler Zalo, cùng nghiệm thu gửi tin thực tế.

**Bổ sung từ phản hồi chủ dự án:** một số đơn là đơn cũ nhập lại nhưng hệ thống
gán ngày bán/ngày thu bằng ngày nhập hiện tại. Kết quả đối chiếu SQL bên dưới
chỉ chứng minh phép tính khớp dữ liệu đã lưu, không chứng minh ngày đó đúng thực tế.
Đã bổ sung nhập/sửa ngày bán và nhận tiền cùng báo cáo tất cả thời gian/theo tháng.
Các bản ghi thật chưa được tự đổi ngày; chủ dự án cần đối chiếu ngày thực tế.

## Bằng chứng từ database

Snapshot lúc **13:48:55 ngày 08/10/2026, giờ Việt Nam**. Tất cả truy vấn nằm trong
giao dịch `REPEATABLE READ READ ONLY`, kết thúc bằng `ROLLBACK`. Không ghi dữ liệu,
không gửi email/Zalo, không đăng ký cron. Không lưu token hay thông tin khách vào báo cáo.

| Kiểm tra | Kết quả |
| --- | --- |
| Khách / đơn / gói | 42 / 53 / 53 |
| Hồ sơ trùng email sau trim + lowercase | 0 nhóm |
| Tiền âm/vượt giới hạn, kỳ hạn sai, liên kết đơn/gói/sản phẩm sai trong các truy vấn đã kiểm tra | 0 bản ghi |
| Ngày thu tiền thiếu, trước ngày đơn hoặc đơn chưa thu có ngày thu | 0 bản ghi |
| Giao dịch hoàn tiền/thu hồi vốn hiện có | 0; nghiệp vụ được kiểm tra bằng dữ liệu thử riêng |
| Thực thu tháng 10/2026 | 91.240.000đ |
| Giá vốn tháng 10/2026 | 43.290.000đ |
| Lãi gộp tháng 10/2026 | 47.950.000đ |
| Đối chiếu phép tính domain với PostgreSQL numeric độc lập | Khớp toàn bộ 6 trường tiền của tháng hiện có |
| RLS | Bật trên tất cả bảng đã kiểm tra; không có policy cho phép anon/authenticated đọc dữ liệu |
| Email scheduler | pg_cron đang gọi mỗi 15 phút; có lịch sử worker hoàn tất, các lượt gần nhất gửi 0 tin |
| Zalo | Đã liên kết, bật cả ba loại nhắc, giờ nhắc hạn 09:00; chưa có job hoặc lịch sử worker |

Các quyền SELECT trực tiếp vẫn được cấp trên một số bảng, nhưng RLS hiện không
có policy cho phép đọc hàng. Migration hardening thu hồi thêm các quyền này.
Không coi quyền SELECT có sẵn là bằng chứng dữ liệu đang bị công khai.

## Lỗi và khoảng trống đã tìm thấy

1. **Zalo chưa có bằng chứng chạy tự động.** `cron.job` chỉ có tác vụ email;
   `vercel.json` không có cron Zalo. Hàng đợi và lịch sử Zalo trống. Có thể có
   scheduler ngoài chưa được kiểm tra, nhưng chưa có bằng chứng nó thực thi worker.
2. **Database thiếu các CHECK nền tảng và index chống trùng.** Các CHECK tiền,
   trạng thái, kỳ hạn, consent và settings trong migration foundation chưa hiện
   diện ở database được đọc. Chưa có index email chuẩn hóa và operation_id hoàn tiền.
   Dữ liệu hiện tại không vi phạm các kiểm tra đã chạy; API vẫn có validation và khóa giao dịch.
3. **Xóa dây chuyền có thể mất lịch sử.** FK khách → đơn/gói và đơn → hoàn tiền
   vẫn dùng CASCADE. Migration chuẩn bị đổi sang RESTRICT.
4. **Mặc định TIMESTAMPTZ có thể lệch 7 giờ.** Chín cột còn dùng
   `TIMEZONE('Asia/Ho_Chi_Minh',NOW())`: giá trị timestamp không múi giờ bị phiên DB
   diễn giải lại. Đổi DEFAULT sang NOW(), không tự sửa timestamp của bản ghi cũ.
   Các ngày nghiệp vụ dạng DATE được đối chiếu riêng; chưa thấy sai tổng tiền tháng.
5. **SMTP có thể kẹt pool và vượt thời gian serverless.** Khi đang giữ client
   giao dịch, việc đọc lại cấu hình qua một client khác có thể làm pool nhỏ bị kẹt.
   Worker cũ chưa có ngân sách thời gian tổng hoặc chặn gửi thật ngay trong chế độ demo.
6. **Cấu hình SMTP lỗi bị che.** Lỗi DB/giải mã trước đây bị nuốt và chuyển sang
   biến môi trường, có thể bỏ qua cấu hình tắt gửi đã lưu.
7. **Validation chưa thống nhất ở biên ghi chung.** Agent API có thể truyền một
   command có kiểu TypeScript hợp lệ nhưng vượt giới hạn Zod của nghiệp vụ.
8. **Mã ngắn có khả năng va chạm.** Upsert bản ghi mới có thể ghi đè bản ghi cũ;
   log lịch sử ngoài 100 dòng được tải không nằm trong tập ID kiểm tra.
9. **Ngày tạo chiến dịch không nhất quán.** Cắt ngày UTC sai ở ranh giới nửa đêm
   Việt Nam; sửa chiến dịch còn đổi ngày tạo ở state rồi khác sau khi tải lại DB.
10. **Làm mới phiên bỏ sót refresh token mới.** Đã sửa lưu cả hai token.
    Supabase trả cặp token mới khi refresh; xem [tài liệu session chính thức](https://supabase.com/docs/guides/auth/sessions).

## Bản sửa trong workspace

- `runCommand` parse lại command trước khi mở transaction; domain thử lại ID
  trùng tối đa 10 lần. Repository dùng INSERT cho bản ghi mới, để collision bị
  từ chối và rollback thay vì ghi đè; bản ghi đã có trong snapshot vẫn cập nhật được.
- SMTP đọc bằng client giao dịch hiện có và chuyển cấu hình đã kiểm tra vào
  transport; lưu cấu hình dùng cùng khóa với kiểm tra gửi cuối cùng.
- Worker chặn chế độ demo, enqueue theo lô, đối chiếu lại consent/kỳ dịch vụ,
  giới hạn thời gian và kiểm tra đủ thời gian trước handoff. Timeout SMTP 15 giây
  đóng transport; kết quả chưa rõ được để đối chiếu, không tự gửi lại.
- Tắt SMTP, đổi giờ gửi hoặc transport bỏ qua trước handoff giữ job pending,
  trả lại số lần thử; lịch sử tác vụ bị gián đoạn chuyển sang cần đối chiếu.
- Giữ ngày tạo chiến dịch khi sửa; chuyển ngày hiển thị theo Asia/Ho_Chi_Minh.
- Webhook Zalo giữ hỗ trợ raw/wrapped, yêu cầu metadata PRIVATE và người gửi
  không phải bot. Dùng `chat.id` để trả lời, không giả định bằng `from.id`.
  Tham chiếu [webhook Zalo chính thức](https://docs.zaloplatforms.com/docs/BOT/webhook).
- Thêm migration `20261008_integrity_hardening.sql` và
  `20261008_timestamp_defaults.sql`. **Chưa áp dụng lên database thật.**

## Kiểm chứng

- **167/167 kiểm thử, 20 file, đều qua.** Có kiểm thử PostgreSQL riêng bằng PGlite,
  migration hardening chạy lại hai lần, khôi phục CHECK bị thiếu, bảo vệ xóa lịch sử,
  unique email, collision không ghi đè, thời gian UTC/Việt Nam, consent và timeout.
- `npm run typecheck`: qua.
- Next.js production build: qua, dùng `APP_DATA_SOURCE=mock` và thư mục build riêng
  trong scratch, không thay build của server dev. Build cấu hình hiện tại bỏ qua lint;
  không báo cáo rằng lint đã chạy.
- `git diff --check`: qua.
- Có thể chạy lại kiểm tra database chỉ đọc bằng `npm run db:audit`; báo cáo tổng
  hợp nằm trong `scratch/system-audit/database.json`, không chứa hồ sơ khách/token.

## Bàn giao agent triển khai

1. Triển khai các bản sửa code và xác nhận biến DB/Auth/SMTP/Zalo trên Vercel trỏ
   đúng hệ thống. Snapshot workspace không chứng minh mọi biến môi trường Vercel giống nhau.
2. Chạy lại audit, sao lưu theo quy trình vận hành, áp dụng hai migration mới trên.
   Nếu index báo trùng email hoặc operation_id, dừng để đối chiếu; không tự gộp/xóa.
   CHECK mới dùng NOT VALID để không sửa dữ liệu cũ; VALIDATE sau khi đối chiếu toàn bộ điều kiện.
3. Đăng ký lịch gọi `/api/cron/zalo-notifications` mỗi 5 phút với
   `Authorization: Bearer <CRON_SECRET>`. Có thể dùng pg_cron/pg_net đang có,
   cất secret trong Supabase Vault; giữ nguyên lịch email 15 phút.
4. Nghiệm thu một nhắc sắp hạn, một quá hạn và một lịch chăm sóc đến giờ ở môi
   trường phù hợp, xác nhận đúng tài khoản riêng và không gửi lặp khi gọi lại cron.
   Kiểm tra `zalo_notification_runs`/jobs và phản hồi HTTP; trạng thái cron
   “succeeded” riêng lẻ chưa chứng minh provider đã nhận tin.
5. Đối chiếu timestamp lịch sử theo nguồn tạo trước khi quyết định sửa; không
   trừ 7 giờ hàng loạt vì một số bản ghi đã được ghi với thời điểm UTC đúng.

## Phạm vi chưa thể khẳng định

Kiểm thử không thay thế nghiệm thu thực tế provider, mạng lỗi, serverless bị ngắt
hoặc tải lớn. Chưa gửi thử tin thật, chưa kiểm tra bằng trình duyệt toàn bộ màn
hình ở lượt audit này, chưa gọi cron thật để tạo thông báo. Chưa có hoàn tiền thật
trong snapshot để đối chiếu lịch sử vận hành. Số tiền từng bản ghi được giới hạn
theo số nguyên an toàn JavaScript; tổng vượt Number.MAX_SAFE_INTEGER chưa được
hỗ trợ như số liệu chính xác và cần thiết kế thêm nếu quy mô chạm giới hạn đó.

Lịch chăm sóc hiện nhắc người quản lý qua Zalo khi worker chạy; không tự nhắn khách.
Chiến dịch `scheduled` hiện lưu nội dung/lịch chuẩn bị, chưa có worker gửi chiến
dịch hàng loạt. Quyền thành viên có cache tối đa 60 giây, nên thay đổi quyền có
thể mất tới một phút để có hiệu lực trong một server instance.
