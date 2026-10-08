# Lịch chăm sóc và theo dõi nhắc gia hạn — 08/10/2026

## Các luồng đã có

- **Chăm sóc khách hàng → Lịch chăm sóc:** tìm khách, tạo/sửa lịch, lọc đang chờ/đến hạn/hoàn tất/đã hủy, ghi nhận hoàn tất và hủy có xác nhận. Hồ sơ khách có danh sách lịch riêng và nút hẹn nhanh.
- Thời điểm nhập luôn là **giờ Việt Nam, UTC+7**, kể cả khi thiết bị ở múi giờ khác. Dữ liệu lưu UTC. Server từ chối giờ đã qua, khách không tồn tại và sửa lịch đã hoàn tất/hủy.
- Lịch đến hạn xuất hiện trong ứng dụng và tự cập nhật mỗi 30 giây/khi quay lại cửa sổ. Đây là việc cần người vận hành liên hệ, không phải bằng chứng tin đã gửi. Hoàn tất là thao tác xác nhận của người vận hành.
- **Chiến dịch:** lưu nháp, đặt/đổi lịch chuẩn bị, hủy lịch; trạng thái và thời gian hiển thị đúng trên bảng và thẻ. Chỉ hẹn khi có người nhận đủ điều kiện ở thời điểm lưu. Nhóm khách được tính lại từ dữ liệu hiện tại; không đóng băng người nhận, không tự thay đổi đồng ý nhận email. Không sửa chiến dịch đã gửi.
- **Cài đặt → Theo dõi nhắc gia hạn:** lịch sử 10 lần chạy gần đây, hàng đợi 30 email gần đây, số lượng từng trạng thái, giờ gửi và cảnh báo tác vụ lâu chưa chạy/lỗi/cần đối chiếu. Bảng tự tải lại mỗi 30 giây khi đang mở. Lỗi tải và chưa có dữ liệu được phân biệt; dữ liệu cũ được ghi rõ khi làm mới thất bại.
- Một nguồn design token tại `src/styles/tokens.css`; khung phản hồi dùng chung cho lịch hẹn, nhắc gia hạn và SMTP. Nhật ký dùng tên thao tác tiếng Việt và phân loại đúng. Nút xem hoạt động hoạt động trên điện thoại, không hiện dấu thông báo giả.

## Phạm vi và điều kiện vận hành

**Chưa bật gửi chiến dịch hoặc tự nhắn chăm sóc qua Zalo/SMS/Email.** Lưu lịch không gửi tin khi đến giờ. Nhắc gia hạn SMTP đã có worker riêng, vẫn chỉ gửi khi cấu hình hiện có được bật và tác vụ máy chủ thật chạy. Bản mock không đọc SMTP/DB thật hoặc chạy worker.

Migration chuẩn bị: `supabase/migrations/20261008_care_scheduling.sql`, thêm lịch chăm sóc, thời điểm chiến dịch và nhật ký tác vụ. Migration đã được kiểm tra trên PostgreSQL chạy trong bộ nhớ; **chưa chạy trên DB thật**. Cần áp dụng migration trước khi đưa mã mới lên hệ thống dùng DB. Khi thiếu schema, hệ thống báo lỗi thay vì chuyển sang dữ liệu giả.

Nhật ký worker ghi bắt đầu, kết thúc, chờ giờ gửi, thất bại và số email có lỗi/cần đối chiếu. Tắt SMTP thì worker không ghi DB và không tiêu tốn lần thử. Có khóa cron/SMTP không xác nhận scheduler hoạt động; bằng chứng là bản ghi chạy thật. Giả định lịch máy chủ gọi mỗi 15 phút; sau 45 phút không có lần chạy mới sẽ cảnh báo. Tác vụ chạy quá 10 phút cần kiểm tra. SMTP chấp nhận không đồng nghĩa khách đã nhận trong hộp thư; lỗi không rõ kết quả gửi vẫn giữ trạng thái cần đối chiếu.

Luồng chuẩn bị không có worker gửi chiến dịch. Khi tích hợp sau này, bắt buộc kiểm tra lại lịch chưa hủy, thời điểm, email hợp lệ, email trùng và quyền nhận ưu đãi ngay trước khi gửi; cần nhật ký/idempotency riêng cho từng người nhận và luồng hủy đăng ký thật. Không tái sử dụng trạng thái hoàn tất của lịch thủ công để làm trạng thái giao thư.

## Kiểm tra

Các test lịch hẹn/chiến dịch kiểm tra chuyển múi giờ, ngày không hợp lệ, giờ đã qua, trạng thái kết thúc, quyền nhận email và dữ liệu cũ. Test repository dùng PGlite, kiểm tra lưu/đọc thời điểm UTC, khóa ngoại, ràng buộc trạng thái và RLS. Worker/monitor API dùng mock, kiểm tra gửi bị tắt, bản ghi chạy, lỗi SMTP mơ hồ, quyền đọc và không lộ thông tin SMTP.

Kiểm tra trình duyệt dùng context riêng, chặn mọi API thật: vòng đời lịch hẹn, lịch chiến dịch, cảnh báo đến hạn, lỗi làm mới, nút hoạt động trên điện thoại; kiểm tra responsive và dữ liệu tài chính giữ nguyên. Không có lần gửi tin hoặc ghi DB production nào trong quá trình kiểm tra.
