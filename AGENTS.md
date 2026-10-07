# AGENTS.md — Tooldesk

## Đọc trước khi sửa

Đọc lần lượt:
1. docs/ARCHITECTURE.md
2. docs/BUSINESS-RULES.md
3. docs/UI-ACCEPTANCE.md
4. docs/IMPLEMENTATION-PLAN.md
5. Source v0.2 do chủ dự án cung cấp, nhất là REFUNDS.md và tests.

Bộ tài liệu này là chỉ dẫn triển khai, không phải một project Next.js đã hoạt động.
Source v0.2 hiện là HTML/CSS/JavaScript. Đừng tuyên bố nó đang dùng React/Supabase.
Kiểm tra repo thật trước khi scaffolding; không ghi đè app đang tồn tại.

## Mục tiêu

Web app nội bộ tiếng Việt quản lý bán tool AI: khách, đơn, sản phẩm, gói dịch vụ,
gia hạn, hoàn tiền, thu hồi giá vốn và báo cáo. Chuẩn bị chiến dịch ưu đãi hàng loạt.
Ưu tiên dễ dùng, thao tác ít, dữ liệu rõ ràng, mobile và desktop hoàn chỉnh.

Chỉ một hệ thống. KHÔNG thêm workspace, tenant, organization, switcher,
nhiều cửa hàng hoặc kiến trúc SaaS multi-tenant.

Giữ giao diện Tooldesk v0.2 làm baseline. Không đổi sang admin template mới.
Không dùng Replit hoặc tạo deployment bên ngoài khi chưa được yêu cầu.

## Phạm vi mặc định

Làm UI trước bằng dữ liệu giả và kiến trúc đúng.
Chưa được mặc định có quyền nối DB production, migrate dữ liệu thật, gửi tin,
hoàn tiền qua provider hoặc publish hệ thống.
Đến hết giai đoạn UI, bàn giao kết quả, không tự mở rộng sang các tích hợp đó.

## Kiến trúc bắt buộc

Một repo Next.js App Router + TypeScript strict, Supabase làm backend khi đến bước
tích hợp. Tách app/, features/, components/, domain/, lib/, supabase/ và tests/.
Không thêm Express/NestJS, microservices, monorepo, Redis, ORM hoặc global state
framework nếu chưa có nhu cầu cụ thể được chứng minh.

app/ chỉ routing/layout/composition. Feature chứa UI/use cases. domain/ là hàm
thuần, không React/DOM/network. Repository/SDK không import vào Client Component.
Mark server modules bằng server-only; Server Action có use server.
Không tạo barrel export trộn client và server.

## Quy ước code

- Tên file kebab-case, component PascalCase, function camelCase, DB snake_case.
- Alias @/ trỏ src. Tránh import sâu private implementation giữa feature.
- Tiếng Việt cho giao diện/thông báo; tên code dùng thuật ngữ nhất quán.
- Không dùng any để bỏ qua kiểm kiểu; unknown phải được parse/validate.
- Validate tất cả input bên server; UI validation chỉ để hỗ trợ thao tác.
- Hạn chế 'use client' vào các component thật sự tương tác.
- SVG inline cho icon; giữ icon Cài đặt hoạt động ở desktop/mobile.
- Một design token source; không thêm các mã màu/spacing tùy ý cho từng màn.
- Không giấu lỗi bằng catch rỗng hoặc silently fallback sang mock.

## Dữ liệu và state

APP_DATA_SOURCE=mock chỉ cho local/test hoặc demo tách biệt có nhãn.
Không lưu đơn/khách/giao dịch thật vào localStorage.
Mock và Supabase repository có cùng hợp đồng; fixtures và clock cố định phục vụ
test, không hard-code ngày demo vào production.

## Các lệnh có ảnh hưởng tiền/kỳ dịch vụ

create_order, record_payment, renew_subscription, record_refund, record_cost_recovery
phải tính toán chính xác:
- Tiền VND nguyên, không floating-point.
- Thực thu = đã nhận - đã hoàn.
- Lãi gộp quản trị = thực thu - giá vốn gốc + giá vốn thực tế thu hồi.
- Vốn thu hồi mặc định 0; không coi hoàn tiền khách là được nhà cung cấp hoàn vốn.
- Không ép giá trị âm thành 0.

## Gia hạn và refund-service action

Giữ tháng lịch khác số ngày cố định; clamp ngày cuối tháng.
expires_on là mốc exclusive theo Asia/Ho_Chi_Minh.
Gia hạn còn hạn cộng từ hạn hiện tại; hết hạn/đã dừng tính từ ngày vận hành.
Tạo đơn mới, không sửa đơn lịch sử.
Hoàn tiền mặc định giữ gói. Chỉ hoàn hết đơn mới nhất và có lựa chọn rõ mới dừng/rollback kỳ.
