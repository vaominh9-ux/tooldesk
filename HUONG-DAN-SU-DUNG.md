# Hướng dẫn Sử dụng Tooldesk — Quản lý Bán Tool AI

Hệ thống quản lý nội bộ chuyên biệt cho kinh doanh tài khoản / gói công cụ AI: ChatGPT, Claude, Midjourney, Canva, Gemini, Cursor...

---

## 1. Khởi động Ứng dụng (Chỉ 1 Click)

Để bắt đầu làm việc, bạn chỉ cần thực hiện:

- **Cách 1 (Khuyên dùng trên Windows)**:
  - Nhấp đúp chuột vào tệp **`Chay-Tooldesk.bat`** (hoặc `start-tooldesk.bat`) ngay tại thư mục này.
  - Hệ thống sẽ tự động bật máy chủ và tự động mở trình duyệt web tại địa chỉ: **`http://localhost:3000`**.
  - Khi không dùng nữa, bạn chỉ cần đóng cửa sổ terminal màu đen lại.

- **Cách 2 (Bằng dòng lệnh Terminal)**:
  ```bash
  npm run start
  # Hoặc khi cần phát triển code:
  npm run dev
  ```
  Truy cập: `http://localhost:3000`

---

## 2. Các Phân hệ Chức năng Chính

### 2.1. Tổng quan Kinh doanh (Dashboard - `/`)
- **Chỉ số thời gian thực**:
  - **Doanh thu thực thu**: Tổng tiền khách đã thanh toán trừ đi các khoản hoàn tiền.
  - **Lãi gộp quản trị**: Thực thu - Giá vốn gốc mua tool + Vốn thực tế thu hồi từ nhà cung cấp.
  - **Đơn chưa thanh toán**: Số tiền và số đơn hàng đang chờ khách chuyển khoản.
  - **Gói sắp hết hạn**: Cảnh báo các gói chạm mốc cần nhắc gia hạn (mặc định trong 7 ngày).
- **Gói cần gia hạn trong tuần**: Danh sách trực quan kèm nút **Gia hạn** nhanh.
- **Nhật ký vận hành**: Ghi lại lịch sử tạo đơn, thanh toán, gia hạn, hoàn tiền theo thời gian thực.

---

### 2.2. Quản lý Đơn hàng (`/orders`)
- **Bộ lọc thông minh**:
  - `Tất cả đơn`, `Đã thanh toán`, `Chưa thu tiền`, `Có hoàn tiền`.
  - Tìm kiếm nhanh theo: Mã đơn (`DH-1100`), Tên khách hàng, Số điện thoại hoặc Tên tool.
- **Tác vụ hỗ trợ**:
  - **Nút "+ Tạo đơn mới"**: Chọn khách hàng có sẵn hoặc nhập thông tin khách mới; chọn tool AI và gói thời hạn (1 tháng, 3 tháng...); hệ thống tự động điền giá bán, giá vốn và tự tính ngày hết hạn (clamp đúng ngày cuối tháng).
  - **Nút "Thu tiền"**: Chuyển trạng thái đơn sang đã thanh toán chỉ với 1 click.
  - **Nút "Chi tiết"**: Mở bảng kê chi tiết giá bán, giá vốn, lãi gộp và thông tin khách hàng.
  - **Nút "Hoàn tiền"**: Mở form ghi nhận hoàn tiền. Hệ thống tự động giới hạn số tiền hoàn không vượt quá số tiền thực thu, cho phép ghi nhận giá vốn thu hồi từ nhà cung cấp và tùy chọn dừng/rollback kỳ gói dịch vụ nếu đủ điều kiện.

---

### 2.3. Gói dịch vụ AI & Gia hạn (`/subscriptions`)
- **Theo dõi kỳ hạn chuẩn xác**:
  - Tính toán theo múi giờ `Asia/Ho_Chi_Minh` (mốc hết hạn exclusive lúc 00:00:00).
  - Phân loại rõ ràng: `Đang chạy`, `Sắp hết hạn (≤7 ngày)`, `Quá hạn`, `Đã dừng`.
- **Nghiệp vụ gia hạn**:
  - Bấm nút **Gia hạn gói** trên bất kỳ dòng nào.
  - Nếu gói **còn hạn**: hệ thống tự động cộng nối tiếp thời hạn từ ngày hết hạn cũ.
  - Nếu gói **đã quá hạn**: hệ thống tự động tính ngày bắt đầu mới từ hôm nay.
  - Tự động tạo một bản ghi đơn hàng mới phục vụ đối soát, không sửa đổi dữ liệu lịch sử đơn cũ.

---

### 2.4. Quản lý Khách hàng (`/customers`)
- **Quản lý danh bạ khách**:
  - Nút **"+ Thêm khách hàng"**: Khai báo Tên, Số điện thoại / Zalo, Email, Nguồn khách (Zalo, Facebook, Website, Giới thiệu) và Ghi chú nội bộ.
  - **Xem chi tiết khách hàng**: Nhấp vào tên hoặc nút "Chi tiết" để xem toàn bộ danh sách gói tool AI khách đang dùng, tổng số đơn đã mua và tổng chi tiêu lũy kế.
  - **Nút "Bán thêm / Tạo đơn"**: Tạo nhanh đơn hàng mới cho khách mà không cần nhập lại thông tin.

---

### 2.5. Danh mục Tool AI & Bảng giá (`/products`)
- Danh mục công cụ: ChatGPT, Claude, Midjourney, Canva, Gemini, Perplexity, Cursor...
- Hiển thị số lượng khách hàng đang sử dụng trên từng tool.
- Bảng giá các gói (1 tháng, 3 tháng, 6 tháng, 1 năm) kèm giá bán, giá vốn nhập và mức lãi kỳ vọng.
- Nút **"+ Thêm tool AI"**: Khai báo công cụ mới kèm bảng giá các gói thời hạn.

---

### 2.6. Chiến dịch Chăm sóc & Nhắc hạn (`/campaigns`)
- **An toàn tuyệt đối (Safety Guardrail)**: Chế độ soạn thảo, lọc và xem trước nội dung, không tự động spam ra ngoài.
- **Phân nhóm khách hàng mục tiêu**:
  - Khách sắp hết hạn trong 7 ngày (nhắc gia hạn).
  - Khách có gói đang hoạt động (chăm sóc / bán chéo).
  - Khách đã quá hạn (kéo khách quay lại).
  - Khách hàng thân thiết VIP (chi tiêu ≥ 2.000.000 đ).
- **Bộ lọc loại trừ chống spam**: Tự động loại trừ khách chưa xác nhận hoặc trùng email.
- **Nút "Sao chép SĐT"**: Sao chép toàn bộ số điện thoại của nhóm đủ điều kiện chỉ với 1 click để bạn gửi tin nhắn trực tiếp qua Zalo / Telegram.

---

### 2.7. Báo cáo Dòng tiền & Lãi gộp (`/reports`)
- Xem báo cáo theo từng tháng.
- Bảng kê đối soát tài chính chi tiết:
  - (1) Doanh thu bán hàng đã nhận tiền
  - (2) Trừ: Các khoản hoàn tiền cho khách trong tháng
  - (=) Doanh thu thực thu quản trị (1 - 2)
  - (3) Trừ: Giá vốn gốc của các đơn đã thanh toán
  - (4) Cộng: Giá vốn thực tế thu hồi từ nhà cung cấp
  - (=) Lợi nhuận gộp quản trị thực tế
- Nhật ký các sự kiện hoàn tiền và thu hồi vốn phát sinh trong tháng.

---

### 2.8. Cài đặt & Sao lưu Dữ liệu (`/settings`)
- Cập nhật Tên thương hiệu shop, Tên người quản trị, Mốc cảnh báo sắp hết hạn (3 ngày, 7 ngày, 14 ngày).
- **Xuất sao lưu (.json)**: Tải toàn bộ dữ liệu đơn hàng, khách hàng, gói dịch vụ và cài đặt về máy tính bất cứ lúc nào.
- **Nhập dữ liệu (.json)**: Khôi phục lại bản sao lưu đã lưu từ máy tính chỉ với 1 click.
- **Khôi phục dữ liệu gốc v0.2**: Đặt lại về bộ dữ liệu mẫu mặc định ban đầu.

---

## 3. Quy chuẩn Hiển thị Desktop & Mobile

- **Desktop (Màn hình máy tính / Laptop)**:
  - Menu điều hướng Sidebar bên trái (224px) cố định, luôn sẵn sàng.
  - Bảng dữ liệu hiển thị đầy đủ các cột thông tin, số liệu tài chính canh phải chuẩn kế toán.
- **Mobile (Điện thoại thông minh)**:
  - Tự động chuyển bảng thành các **Thẻ (Cards)** trực quan, bo góc tinh tế.
  - Thanh điều hướng ở cạnh dưới màn hình (Bottom Navigation Bar) tối ưu thao tác ngón cái, touch target > 44px kèm huy hiệu đếm số đơn chưa thu và số gói sắp hết hạn.
