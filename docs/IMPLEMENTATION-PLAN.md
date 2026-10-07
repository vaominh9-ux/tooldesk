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
