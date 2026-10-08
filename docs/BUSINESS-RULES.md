# Tooldesk — Quy tắc nghiệp vụ (Business Rules)

## 1. Tiền tệ và tính toán tài chính
- Toàn bộ giá trị tiền tệ được lưu dưới dạng số nguyên VND (Integer), không dùng số thực (floating point).
- Không ép giá trị âm thành 0 khi tính toán lãi/lỗ.

### Công thức dòng tiền và lợi nhuận đơn hàng
```text
Thực thu (net) = collected (đã thu) - refunded (đã hoàn)
Vốn còn lại (remainingCost) = max(0, bookedCost - costRecovered)
Hoàn tối đa còn lại (remainingRefund) = max(0, collected - refunded)
Lợi nhuận gộp (gross) = net - bookedCost + costRecovered
```

Trạng thái thanh toán của đơn hàng (`payment / financial status`):
- `unpaid`: Chưa thanh toán
- `paid`: Đã nhận tiền, chưa có hoàn tiền (`refunded == 0`)
- `partially_refunded`: Đã hoàn một phần (`refunded > 0` và `refunded < collected`)
- `refunded`: Đã hoàn toàn bộ (`refunded >= collected`)

### Báo cáo dòng tiền quản trị (Management Cash View)
- Doanh thu nhận ghi nhận theo `paidAt` (hoặc `date` nếu chưa có `paidAt`).
- Các khoản hoàn tiền và thu hồi giá vốn ghi nhận theo ngày phát sinh giao dịch (`refund.date`).
- `order.date` là ngày bán thực tế; `paidAt` là ngày nhận tiền thực tế. `created_at`
  chỉ là thời điểm nhập hồ sơ vào database, không quyết định tháng doanh thu.
- Nhập lại đơn cũ phải chọn ngày bán và ngày nhận tiền. Không suy đoán ngày nhận
  tiền từ ngày bắt đầu dịch vụ; ngày bán có thể khác ngày bắt đầu sử dụng gói.
- Ngày bán/nhận tiền không được ở tương lai; ngày nhận tiền không trước ngày bán
  hoặc sau bất kỳ phiếu hoàn/thu hồi vốn đã ghi nhận của đơn.
- Có thể đối chiếu lại ngày của đơn lịch sử mà không đổi số tiền/kỳ dịch vụ hoặc
  sửa phiếu hoàn. Lưu nhật ký ngày cũ → mới. Đơn đã hủy không đổi ngày ghi nhận.
- Báo cáo mặc định xem tất cả thời gian; chế độ tháng giữ nguyên quy tắc dòng tiền
  theo ngày phát sinh. Tổng các tháng phải khớp tổng toàn bộ thời gian.

## 2. Thời hạn dịch vụ (Subscriptions)
- Múi giờ chuẩn: `Asia/Ho_Chi_Minh` (UTC+7).
- `expiresAt` là mốc độc quyền (EXCLUSIVE): Gói hết hạn vào `2026-10-06` có nghĩa là hết hạn lúc `00:00:00` ngày `2026-10-06`.
- Tính theo tháng lịch: Cộng tháng giữ nguyên ngày hoặc clamp về ngày cuối cùng của tháng (Ví dụ: 31/01 + 1 tháng = 28/02 hoặc 29/02).

### Trạng thái gói dịch vụ
- `cancelled`: Gói đã dừng theo dõi
- `scheduled`: Gói chưa bắt đầu (`startsAt > today`)
- `expired`: Đã hết hạn (`daysLeft <= 0`)
- `expiring`: Sắp hết hạn (`daysLeft <= window`, mặc định 7 ngày)
- `active`: Đang hoạt động bình thường

## 3. Hoàn tiền & Dịch vụ liên kết (Refund Service Actions)
- Mặc định giữ nguyên gói dịch vụ (`keep`).
- Chỉ cho phép dừng gói hoặc khôi phục kỳ trước (`end`) khi:
  1. Khoản hoàn là hoàn toàn bộ số tiền còn lại (`amount == remainingRefund`).
  2. Đơn hàng là đơn mới nhất của gói đó (`sub.lastOrderId === order.id`).
  3. Nếu là đơn gia hạn (`renewal`): Phải có snapshot kỳ trước (`previousSubscription`) để rollback an toàn.
