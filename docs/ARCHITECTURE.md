# Tooldesk — Kiến trúc triển khai đề xuất

Ngày bàn giao: 06/10/2026. Trạng thái: **đặc tả kiến trúc, chuyển đổi sang Next.js App Router**.

## 1. Phạm vi và quyết định

Một hệ thống nội bộ quản lý kinh doanh tool AI: khách hàng, sản phẩm/gói bán,
đơn hàng, thu tiền, gói dịch vụ, gia hạn, ghi nhận hoàn tiền, thu hồi giá vốn,
báo cáo và chuẩn bị chăm sóc khách hàng.

Chỉ một cửa hàng/hệ thống. Không thêm workspace, tenant, organization, bộ chuyển
không gian hay kiến trúc SaaS bán lại cho nhiều doanh nghiệp. Một hệ thống vẫn có thể
có nhiều nhân viên với quyền khác nhau; đây không phải multi-tenancy.

Kiến trúc đích là **modular monolith**: một repository, một ứng dụng web Next.js,
một Supabase project cho mỗi môi trường. Local/staging/production là môi trường
kỹ thuật, không phải nhiều không gian trên giao diện.

Stack đề xuất:
- Next.js App Router + React + TypeScript strict.
- Tailwind CSS; giữ design token và hình ảnh Tooldesk v0.2. shadcn/ui chỉ làm
  primitive, không thay giao diện bằng một admin template mới.
- SVG inline/Lucide cho icon. Không dùng icon font.
- Zod cho input schema; React Hook Form chỉ khi biểu mẫu cần, không thêm thư viện
  quản lý form nếu form nhỏ không cần nó.
- Supabase Postgres + Auth. Storage chỉ thêm khi thực sự có tệp đính kèm.
- Vitest + Testing Library cho unit/component; Playwright cho E2E/responsive;
  Supabase local và SQL tests cho quyền/RPC.
- npm và một package-lock.json. Chọn phiên bản stable tương thích tại lúc khởi tạo,
  ghi phiên bản Node trong .nvmrc và khóa dependency. Không dùng “latest” không khóa.

Đây là lựa chọn cho dự án này, không phải một chuẩn duy nhất bắt buộc cho mọi web app.
Không dựng thêm Express, NestJS, microservices, monorepo, Redis hoặc ORM riêng ở MVP.

## 2. Cấu trúc thư mục

```text
tooldesk/
├── AGENTS.md
├── README.md
├── docs/
│   ├── ARCHITECTURE.md
│   ├── BUSINESS-RULES.md
│   ├── UI-ACCEPTANCE.md
│   ├── IMPLEMENTATION-PLAN.md
│   ├── SOURCE-MANIFEST.json
│   └── SOURCES.md
├── reference/
│   └── tooldesk-v0.2/                 # Bản gốc đối chiếu; không import vào app mới
├── public/
│   └── brand/                        # Logo, favicon; không chứa dữ liệu khách
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   ├── not-found.tsx
│   │   └── (dashboard)/
│   │       ├── layout.tsx
│   │       ├── loading.tsx
│   │       ├── page.tsx              # / (Tổng quan)
│   │       ├── orders/page.tsx
│   │       ├── customers/
│   │       │   ├── page.tsx
│   │       │   └── [customerId]/page.tsx
│   │       ├── subscriptions/page.tsx
│   │       ├── products/page.tsx
│   │       ├── campaigns/page.tsx    # GĐ1: bản nháp/xem trước
│   │       ├── reports/page.tsx
│   │       └── settings/page.tsx
│   ├── features/
│   │   ├── dashboard/
│   │   ├── customers/
│   │   ├── orders/                  # Bao gồm hoàn tiền, thu hồi giá vốn
│   │   ├── subscriptions/           # Bao gồm gia hạn
│   │   ├── products/
│   │   ├── communications/          # Campaign, phân nhóm, mẫu tin, nhắc hạn
│   │   ├── reports/
│   │   └── settings/
│   ├── components/
│   │   ├── ui/                      # Primitive: button, input, dialog...
│   │   ├── layout/
│   │   │   ├── app-shell.tsx
│   │   │   ├── desktop-sidebar.tsx
│   │   │   ├── mobile-navigation.tsx
│   │   │   └── topbar.tsx
│   │   └── shared/
│   │       ├── responsive-panel.tsx
│   │       ├── data-table.tsx
│   │       ├── filter-bar.tsx
│   │       ├── status-badge.tsx
│   │       ├── empty-state.tsx
│   │       └── app-icon.tsx
│   ├── domain/
│   │   ├── money.ts
│   │   ├── dates.ts
│   │   ├── orders.ts
│   │   ├── subscriptions.ts
│   │   └── refunds.ts
│   ├── lib/
│   │   └── cn.ts
│   ├── mocks/
│   │   ├── fixtures.ts
│   │   └── clock.ts
│   └── types/
```

## 3. Ranh giới các lớp

| Lớp | Trách nhiệm | Không được làm |
|---|---|---|
| app/ | Route, layout, metadata, ghép màn hình, đọc query params | Nhồi công thức tiền, query SQL rải rác |
| features/ | UI và use case theo nghiệp vụ | Import sâu implementation của feature khác |
| components/ui | Primitive có thể tái sử dụng | Biết khách hàng, đơn hàng hay Supabase |
| components/shared | Pattern chung như panel responsive, bảng | Giữ số dư đơn hoặc tự tính lợi nhuận |
| domain/ | Hàm thuần, bất biến nghiệp vụ, tiền/ngày | React, DOM, localStorage, env, network |
| lib/ | Adapter hạ tầng, utility | Thành “thùng chứa” toàn bộ nghiệp vụ |

## 4. Chuyển mã v0.2 sang cấu trúc mới

- Giữ nguyên toàn bộ token màu sắc, typography và phong cách visual của v0.2.
- Desktop dùng bảng (`data-table`), mobile dùng thẻ (`record-card`).
- Dùng chung dữ liệu và hành vi giữa desktop/mobile.
- Không nhúng HTML cũ bằng `dangerouslySetInnerHTML`.
