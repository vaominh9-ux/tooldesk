# Tooldesk — Kế hoạch triển khai (Implementation Plan)

## Mục tiêu
Chuyển đổi giao diện nguyên bản Tooldesk v0.2 sang cấu trúc **Next.js App Router** hiện đại kết hợp **TypeScript strict**, **Tailwind CSS** và ** kiến trúc module chuẩn**, sử dụng dữ liệu mẫu (`APP_DATA_SOURCE=mock`) đồng bộ 100% nghiệp vụ và nhận diện.

---

## Các giai đoạn thực hiện

### Giai đoạn 1: Chuẩn bị & Thiết lập nền tảng
- [x] Kiểm kê toàn bộ source v0.2 hiện có (`tooldesk-v2-preview.html`).
- [x] Lưu trữ bản gốc an toàn vào `reference/tooldesk-v0.2/`.
- [x] Xây dựng bộ tài liệu kỹ thuật trong `docs/` (`ARCHITECTURE.md`, `BUSINESS-RULES.md`, `UI-ACCEPTANCE.md`, `AGENTS.md`).
- [ ] Thiết lập Next.js App Router, TypeScript, Tailwind CSS, Vitest.

### Giai đoạn 2: Tách biệt Domain Logic & Mocks
- [ ] Xây dựng `src/domain/money.ts` (định dạng VND, tính tài chính đơn, hoàn tiền, lãi gộp).
- [ ] Xây dựng `src/domain/dates.ts` (cộng ngày, cộng tháng lịch, tính ngày còn lại exclusive).
- [ ] Xây dựng `src/domain/orders.ts`, `subscriptions.ts`, `refunds.ts`.
- [ ] Xây dựng `src/mocks/fixtures.ts` (5 sản phẩm, 10 gói, 36 khách hàng, 48 subscriptions, 98 đơn hàng, hoàn tiền, chiến dịch).

### Giai đoạn 3: Xây dựng Thành phần Dùng chung & Layout
- [ ] `src/components/shared/app-icon.tsx` (toàn bộ icon SVG inline nguyên bản).
- [ ] `src/components/layout/desktop-sidebar.tsx`, `mobile-navigation.tsx`, `topbar.tsx`, `app-shell.tsx`.
- [ ] `src/components/ui/` (Button, Input, Select, Badge, Dialog, Modal).
- [ ] `src/components/shared/` (DataTable, RecordCard, FilterBar, EmptyState).

### Giai đoạn 4: Hoàn thiện Các Màn hình Chức năng (Features)
- [ ] Trang Tổng quan (`/` - Dashboard): KPI, việc cần làm, lịch sử hoạt động.
- [ ] Trang Đơn hàng (`/orders`): Bảng Desktop, Thẻ Mobile, Modal Tạo đơn, Modal Hoàn tiền & Thu hồi vốn.
- [ ] Trang Khách hàng (`/customers` & `/customers/[id]`): Danh sách & Chi tiết khách hàng.
- [ ] Trang Gói dịch vụ (`/subscriptions`): Danh sách gói, trạng thái hạn, Modal gia hạn.
- [ ] Trang Sản phẩm (`/products`): Danh mục tool AI, các gói thời hạn.
- [ ] Trang Chiến dịch (`/campaigns`): Soạn thảo & xem trước người nhận (nháp, an toàn).
- [ ] Trang Báo cáo (`/reports`): Báo cáo dòng tiền, lọc theo tháng.
- [ ] Trang Cài đặt (`/settings`): Thiết lập cửa hàng, người quản lý, kết nối.

### Giai đoạn 5: Kiểm thử, Tối ưu & Nghiệm thu
- [ ] Chạy Lint & TypeScript typecheck (`tsc --noEmit`).
- [ ] Viết & chạy Unit test cho domain tài chính và thời hạn (`vitest`).
- [ ] Chạy Build hoàn chỉnh (`next build`).
- [ ] Chạy E2E / kiểm tra hiển thị responsive qua browser subagent & chụp ảnh desktop/mobile.
- [ ] Lập báo cáo bàn giao chi tiết.

## Bàn giao nâng cấp 08/10/2026

- [x] Lịch chăm sóc từng khách: tạo/sửa, lọc đến hạn, hoàn tất/hủy, nhắc trong ứng dụng và truy cập từ hồ sơ khách.
- [x] Lưu/đổi/hủy lịch chuẩn bị chiến dịch; gửi tự động vẫn tắt.
- [x] Theo dõi lịch sử chạy worker và hàng đợi, phân biệt đang tải/lỗi/chưa có dữ liệu.
- [x] Một nguồn design token, phản hồi/toast dùng chung, nhật ký tiếng Việt và nút hoạt động trên mobile.
- [x] Typecheck, 114 test, build và 45 lượt kiểm tra trang responsive; luồng lịch hẹn/chiến dịch kiểm tra ở 320/393/768/1440 px.
- [ ] Áp dụng migration và xác nhận scheduler trên hệ thống thật khi được yêu cầu. Chưa kết nối gửi chiến dịch/chăm sóc tự động.

Chi tiết luồng và giới hạn vận hành: [CARE-SCHEDULING.md](CARE-SCHEDULING.md).

## Bàn giao sửa kỳ báo cáo 08/10/2026

- [x] Xem tất cả thời gian hoặc từng tháng; tổng hợp tháng, sản phẩm và phiếu hoàn dùng cùng phạm vi.
- [x] Nhập ngày bán và ngày nhận tiền thực tế khi tạo đơn cũ hoặc xác nhận thu tiền; ngày bắt đầu dịch vụ được quản lý riêng.
- [x] Sửa ngày ghi nhận của đơn đã nhập, giữ nguyên tiền, kỳ dịch vụ và phiếu hoàn; nhật ký lưu ngày trước/sau.
- [x] Chặn ngày tương lai, ngày nhận tiền trước ngày bán hoặc sau phiếu hoàn đã tồn tại.
- [x] 177 kiểm thử đạt; kiểm tra báo cáo, sửa ngày, thu tiền và nhập đơn cũ trên màn hình 320/393/768/1440/1920 px.
- [ ] Người quản lý đối chiếu và sửa ngày thực tế của các đơn cũ đang ghi nhận vào tháng nhập. Không tự suy ra ngày thu tiền từ ngày dịch vụ.
- [ ] Agent phụ trách triển khai đưa mã nguồn lên Vercel. Đợt sửa này không tự thay đổi dữ liệu production.
