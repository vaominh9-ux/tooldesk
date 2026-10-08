# Tooldesk — Tiêu chí nghiệm thu giao diện (UI Acceptance)

## 1. Nguyên tắc cốt lõi
- **Chỉ một hệ thống quản lý**, không thêm workspace switcher, tenant hay đa tổ chức.
- **Dùng chung dữ liệu và hành vi giữa Desktop và Mobile**: Mọi hành động (tạo đơn, lọc, tìm kiếm, gia hạn, hoàn tiền, xuất dữ liệu) đều có thể thực hiện trên cả hai thiết bị.
- **Desktop dùng bảng (`data-table`), Mobile dùng thẻ (`record-card`)**:
  - Desktop: Bảng rõ ràng, căn phải cho cột số tiền/ngày, phân trang chuẩn.
  - Mobile: Thẻ thông tin trực quan, dễ bấm (target tối thiểu 44px), input 16px tránh auto-zoom iOS, menu đáy cố định (`mobile-navigation`).
- **Responsive Drawer / Modal**:
  - Desktop: Drawer trượt từ cạnh phải hoặc Modal giữa màn hình.
  - Mobile: Bottom-sheet hoặc full-width drawer với nút đóng rõ ràng.
- **Thiết kế & Nhận diện**:
  - Giữ 100% nhận diện Tooldesk v0.2: Font chữ Inter/hệ thống, bảng màu Indigo (`--accent: #5963e8`), badge trạng thái bo tròn nhẹ, icon SVG inline nét mỏng 1.7px.

## 2. Tiêu chí cho từng màn hình
1. **Tổng quan (Dashboard)**:
   - 4 thẻ KPI chính: Doanh thu thực thu, Đơn hàng, Lãi gộp, Chưa thanh toán.
   - Thao tác nhanh (Tạo đơn, Khách mới, Gia hạn).
   - Danh sách công việc cần xử lý (Sắp hết hạn, Chờ thu tiền) và Lịch sử hoạt động.
   - Mobile: tiêu đề công việc nằm trên bộ lọc ba cột bằng nhau; nhãn ngắn và badge số lượng cùng hàng, nút tối thiểu 44px. Desktop giữ bố cục hiện có.
   - Mặc định chọn nhóm có việc theo thứ tự sắp hạn, hết hạn, chờ thu; giữ lựa chọn thủ công khi dữ liệu cập nhật.
2. **Đơn hàng (Orders)**:
   - Mobile: nút bộ lọc cạnh ô tìm kiếm mở/đóng lựa chọn sản phẩm và loại đơn; có số điều kiện đang lọc, xóa lọc và hỗ trợ Escape. Desktop giữ bộ lọc mở sẵn.
   - Lọc theo trạng thái (Tất cả, Đã thu, Chưa thu, Hoàn tiền).
   - Modal tạo đơn hàng: Chọn khách / tạo khách mới, chọn tool, gói, ngày bắt đầu, tính tự động hạn kết thúc và lợi nhuận gộp dự kiến.
   - Modal hoàn tiền: Tính số tiền tối đa còn được hoàn, lý do, phương thức, tùy chọn xử lý gói (giữ nguyên hoặc dừng).
3. **Khách hàng (Customers)**:
   - Hồ sơ: lịch chăm sóc nối tiếp gói dịch vụ và lịch sử đơn trong cột nội dung, không chờ chiều cao cột liên hệ. Phần chưa có lịch hiển thị gọn, không tạo khung trắng lớn.
   - Danh sách khách hàng, tìm kiếm theo tên, email, SĐT.
   - Chi tiết khách hàng: Tổng chi tiêu, các gói đang dùng, lịch sử đơn hàng.
4. **Gói dịch vụ (Subscriptions)**:
   - Lọc: Đang chạy, Sắp hết hạn, Quá hạn, Đã dừng.
   - Nút Gia hạn trực tiếp: Mở form gia hạn tạo đơn mới, giữ nguyên chuỗi lịch sử.
5. **Sản phẩm (Products)**:
   - Biểu tượng dùng chữ cái đầu của tên, nền màu nhẹ và chữ đậm; cùng một component trên danh sách, đơn, hồ sơ, gói dịch vụ và cửa sổ chi tiết. Khi sửa tên, xem trước biểu tượng tự cập nhật.
   - Danh mục 5 tool AI (ChatGPT, Claude, Gemini, Perplexity, Canva).
   - Chi tiết các gói 1 tháng, 3 tháng, 1 năm với giá bán và giá vốn.
   - Mobile: thu gọn gói mặc định, mở/đóng từng sản phẩm và tự mở các gói khi tìm theo tên gói. Desktop giữ danh sách gói mở sẵn.
   - Sửa sản phẩm: sửa tên, giá bán và giá vốn của các gói trong cùng cửa sổ, lưu một lần; hủy không lưu một phần. Gói đã dùng không được xóa hoặc đổi thời hạn; tiền/ngày của đơn cũ giữ nguyên.
6. **Chiến dịch (Campaigns)**:
   - Soạn thảo và xem trước danh sách người nhận (bản nháp/xem trước, KHÔNG gửi tin thật).
   - Lịch chăm sóc từng khách: tạo/sửa, lọc đến hạn, xác nhận hoàn tất/hủy; giờ Việt Nam, phản hồi lỗi rõ ràng và bảng desktop/thẻ mobile.
   - Lịch chuẩn bị chiến dịch hiển thị đúng trạng thái, ngày giờ; nói rõ gửi tự động chưa bật.
7. **Báo cáo (Reports)**:
   - Chọn tháng báo cáo, tính dòng tiền thực thu, giá vốn, hoàn tiền, lãi gộp.
8. **Cài đặt (Settings)**:
   - Cài đặt tên shop, người quản lý, số ngày nhắc hạn, trạng thái kết nối.
   - Theo dõi lịch sử chạy thật, tác vụ nhắc lỗi/lâu chưa chạy và hàng đợi. Không coi có cấu hình là bằng chứng lịch hoạt động.
   - Đang tải/lỗi/chưa có dữ liệu phân biệt rõ, phản hồi SMTP và toast dùng token chung.
