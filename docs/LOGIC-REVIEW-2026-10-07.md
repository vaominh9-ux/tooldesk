# Rà soát logic Tooldesk — 07/10/2026

Phạm vi: đọc tài liệu bắt buộc, source HTML v0.2 trong reference, domain, context, dialog, các trang, API và schema SQL trong repo. Không truy cập database, chạy migration, ghi giao dịch thật hoặc sửa source ứng dụng. Không tìm thấy REFUNDS.md hay bộ test riêng trong reference; bộ test hiện có là tests/domain.test.ts.

## Kết quả kiểm chứng

- `npm test -- --run`: 8/8 test pass khi chạy ngoài sandbox. Lần trước esbuild bị sandbox chặn; không có căn cứ kết luận Vitest config hỏng.
- `npx tsc --noEmit`: lần kiểm tra cuối pass. Trong lúc kiểm tra, nội dung order-detail-dialog.tsx thay đổi: createdAt đã được thêm fallback; lỗi typecheck quan sát ở lần đầu không còn trên source hiện tại. Người rà soát không sửa file đó.
- `npm run build`: compile và kiểm tra type thành công, sau đó fail ở Collecting page data: `PageNotFoundError: Cannot find module for page: /_document`. Chưa xác định nguyên nhân; chưa kết luận đây là lỗi logic nguồn.
- `node scratch/review-logic.cjs`: chạy domain/context thật qua transpile TypeScript trong bộ nhớ, thay React hooks và localStorage bằng stub để kiểm tra chuyển trạng thái. Đây là kiểm chứng hàm, không phải E2E browser. Dữ liệu hoàn toàn là fixtures riêng của script.
- Kiểm tra bổ sung đúng: dòng tiền theo tháng nhận/hoàn, lợi nhuận âm, cộng tháng cuối tháng năm nhuận.

## Findings

### 1. [P1] Mapper API làm hỏng mọi trường PostgreSQL DATE

Vị trí: src/app/api/data/route.ts:83, :84, :99, :107 và các mapper customer/refund.

Driver pg cài trong repo parse DATE thành Date. Code dùng `String(value).slice(0, 10)`, khiến DATE 2026-10-06 thành `Tue Oct 06`. Kiểm chứng parser OID 1082 của chính driver cho kết quả này; parseDay từ chối chuỗi đó. Điều này làm crash các màn gọi daysLeft/subStatus, đồng thời làm sai lọc tháng và thứ tự ngày. Không có custom DATE parser trong adapter hiện tại.

Hướng sửa: giữ DATE dưới dạng YYYY-MM-DD tại adapter (query cast text hoặc parser phù hợp) và validate DTO. Không dùng toISOString tùy tiện cho DATE đã parse ở múi giờ local vì có thể lệch một ngày.

### 2. [P1] Thay đổi được báo thành công nhưng bị mất khi tải lại/đồng bộ

Vị trí: src/features/context/tooldesk-context.tsx:104, :113, :142, :535.

Mọi mutation chỉ gọi persist => setData + localStorage. API chỉ có GET. Khi load hoặc sync trả về dữ liệu DB thành công, context thay toàn bộ state bằng json.data, ghi đè cache chứa các đơn/refund/thanh toán mới. Tình huống: tạo đơn -> thành công -> reload/sync -> đơn biến mất nếu DB load thành công. Nếu DB lỗi, app lại dùng cache/mock mà không có trạng thái lỗi rõ ràng. Người dùng không biết dữ liệu đã lưu ở đâu.

Điều này cũng lưu dữ liệu DB thật vào localStorage, trái AGENTS.md. Theo phạm vi UI hiện tại, cần chế độ mock có nhãn và hợp đồng repository rõ ràng. Không tự triển khai DB production chỉ để khắc phục finding này.

### 3. [P1] Gia hạn trước hạn làm mất trạng thái đang sử dụng

Vị trí: src/features/context/tooldesk-context.tsx:313-321.

Gói 15/09–15/10, vận hành 06/10, gia hạn 1 tháng: order mới bắt đầu 15/10 là đúng. Nhưng updatedSub cũng đổi startsAt thành 15/10, khiến subStatus ngày 06/10 trả `scheduled`, activeCount giảm và khách bị loại khỏi nhóm đang dùng. Subscription tổng cần giữ startsAt cũ khi còn hạn; chỉ đổi khi hết hạn/đã dừng. Bản HTML v0.2 đã xử lý đúng điểm này.

Renewal cũng giữ remindedAt của kỳ trước; gói có thể tiếp tục bị coi là đã nhắc trong kỳ mới. Baseline reset remindedAt về null.

### 4. [P1] Thiếu lastOrderId lại cho phép dừng gói từ đơn cũ

Vị trí: src/domain/refunds.ts:58; src/app/api/data/route.ts:78; supabase/schema.sql:59.

Điều kiện hiện tại `(sub.lastOrderId && sub.lastOrderId !== order.id)` bỏ qua kiểm tra khi lastOrderId thiếu. Hàm refundServiceOption trả allowed=true với một đơn new bất kỳ liên kết gói chưa dừng. Nếu hoàn hết đơn mua đầu tiên trong khi gói có các kỳ gia hạn mới hơn, processRefund có thể cancelled toàn bộ gói. Baseline dùng so sánh bắt buộc `sub.lastOrderId !== order.id`.

Không chỉ mapper thiếu field: schema repo cũng không có last_order_id hoặc previous_subscription. Renewal từ DB không có snapshot nên không rollback được. Cần giữ hợp đồng đầy đủ và từ chối thay đổi gói khi không chứng minh được đơn mới nhất.

Đính chính lần review trước: thiếu lastOrderId không luôn làm end bị từ chối; với đơn new hiện tại nó cho phép thao tác nguy hiểm.

### 5. [P1] Refund không còn idempotent như baseline

Vị trí: src/domain/refunds.ts:94; src/features/context/tooldesk-context.tsx:368; src/components/dialogs/refund-dialog.tsx:38.

Nếu operationId đã có và input giống hệt, validator vẫn tiếp tục; processRefund luôn append record mới. Kiểm chứng đơn 1.000.000 đồng, có phiếu 100.000, retry cùng operationId: 2 phiếu, tổng hoàn 200.000. Với retry hoàn toàn bộ, lần lặp lại có thể trả lỗi vượt số dư thay vì trả giao dịch đã thành công.

Dialog cũng không tạo operationId ổn định theo phiếu; processRefund tạo mới ở mỗi lần gọi. Baseline có mã cố định trong form và return duplicate record trước validation số dư. Cần trả record cũ cho retry giống hệt, reject nội dung khác và bảo đảm operationId duy nhất khi tích hợp backend.

### 6. [P1] Clock demo được dùng trực tiếp cho dữ liệu vận hành

Vị trí: src/domain/dates.ts:8 và các caller DEFAULT_APP_TODAY.

Ngày cố định 2026-10-06 được dùng tạo đơn, thanh toán, gia hạn, kiểm tra refund, nhắc hạn, dashboard và phân nhóm. Ngày vận hành 07/10 vẫn ghi 06/10; refund ngày 07/10 bị chặn là tương lai. Báo cáo cũng chỉ có lựa chọn 08–10/2026.

Fixed clock hợp lệ trong demo/test nhưng phải tách khỏi runtime và demo phải được nhận diện. Domain nên nhận ngày vận hành qua input; adapter clock lấy ngày theo Asia/Ho_Chi_Minh. Các hàm ngày đang dùng UTC để tính date-only không tự thân sai múi giờ.

### 7. [P2] ID theo độ dài có thể trùng ngay sau import hợp lệ

Vị trí: src/features/context/tooldesk-context.tsx:208, :308, :184, :422.

Order ID là DH-(1100 + orders.length), customer ID là kh-(customers.length + 1). Import có 1 đơn DH-1101 rồi tạo đơn mới cho ra 2 đơn DH-1101. find(order.id) và refund ledger không còn xác định đúng đơn; customer ID trùng cũng ghép sai lịch sử. Baseline nextOrderId lấy max suffix và kiểm tra tồn tại. Cần cơ chế ID không dựa vào count; backend uniqueness khi đến giai đoạn tích hợp.

### 8. [P2] Fixtures chỉ sai đơn mới nhất của 15 subscription

Vị trí: src/mocks/fixtures.ts:242-266.

Vòng k tăng tạo các đơn lùi ngày, nhưng sub.lastOrderId bị gán lại mỗi lượt nên có thể trỏ đơn cũ nhất. Kiểm chứng fixtures hiện tại có 15 subscription mà order của lastOrderId có date nhỏ hơn đơn mới nhất của subscription. Điều kiện dừng/rollback bị sai ngay ở demo: chặn đơn mới và cho phép đơn cũ tùy kind/snapshot. Cần xây fixtures nhất quán với chuỗi lịch sử.

### 9. [P2] Tạo/gia hạn không validate đủ money và tham chiếu

Vị trí: src/features/context/tooldesk-context.tsx:201-207, :304-307.

createOrder chỉ kiểm customerId không rỗng, không kiểm khách tồn tại; createOrder/renewSubscription không kiểm price/cost là safe integer không âm. Kiểm chứng hàm chấp nhận customerId không tồn tại, price=-1.25 và cost=NaN. Money helpers làm tròn thay vì ngăn dữ liệu sai. renewSubscription cũng tin startsAt từ caller thay vì tự tính lại.

Đính chính lần review trước: giá bán/giá vốn được nhập thủ công là hành vi có sẵn trong baseline và UI hiện tại. Không có quy định bắt buộc mọi đơn khớp bảng giá; không nên bỏ chức năng này. Lỗi xác nhận được là thiếu validation và bảo vệ bất biến.

### 10. [P2] Ghi nhận thu tiền có thể sửa ngày của đơn đã thu

Vị trí: src/features/context/tooldesk-context.tsx:266-270.

Hàm không guard đơn paid/cancelled. Gọi recordPayment cho đơn đã thu 01/10 đổi paidAt thành 06/10, có thể chuyển doanh thu từ ngày/tháng cũ sang ngày/tháng mới khi clock được sửa. UI thường chỉ hiển thị nút khi unpaid nên mức độ tiếp cận hiện tại thấp hơn; use case vẫn cần no-op/reject các transition không hợp lệ. Tài liệu hiện tại không bắt buộc payment ledger riêng cho việc thu đủ một lần, nên không coi thiếu ledger riêng là một lỗi độc lập.

### 11. [P2] Nhập khách tự đánh dấu đã đồng ý nhận email

Vị trí: src/features/context/tooldesk-context.tsx:190, :428.

Form không hỏi consent nhưng addCustomer/createOrder ghi opted_in; audienceFor coi email mới là đủ điều kiện. Baseline khách tạo thủ công có consent unknown. Kiểm chứng addCustomer không truyền consent vẫn cho opted_in. Cần để unknown đến khi ghi nhận đồng ý rõ ràng. Finding chỉ nói logic phân nhóm/xem trước; không có gửi tin thật trong code đã kiểm tra.

### 12. [P2] Nút tạo/xem chiến dịch không có handler render

Vị trí: src/app/campaigns/page.tsx:40, :73, :144; src/components/dialogs/global-dialogs.tsx.

Các nút gọi openDialog('campaign'), nhưng GlobalDialogs không có nhánh campaign, không có editor hoặc use case lưu campaign. Kết quả bấm nút không mở form. Chức năng nháp/xem trước được yêu cầu ở giai đoạn UI nhưng chưa thực hiện.

### 13. [P2] Xóa ngày bắt đầu có thể làm crash form tạo đơn

Vị trí: src/components/dialogs/create-order-dialog.tsx:53.

expiresAt được tính addDuration(startsAt,...) ngay khi render, ngoài try/catch submit. Input date cho phép giá trị rỗng trong lúc người dùng xóa/chọn lại; addDuration -> parseDay('') throws. Cần preview chịu được trạng thái input chưa hoàn chỉnh và validate lúc submit.

### 14. [P1 khi dùng dữ liệu thật] API đọc toàn bộ dữ liệu không kiểm tra đăng nhập

Vị trí: src/app/api/data/route.ts:6; src/lib/db.ts; supabase/schema.sql:162.

GET không kiểm tra auth/authorization, repo không có middleware bảo vệ; adapter dùng PostgreSQL connection trực tiếp, nên không thể dựa vào Supabase Auth để tự giới hạn response. Schema còn tạo FOR ALL USING(true) WITH CHECK(true), không hạn chế theo người dùng. Source adapter chứa fallback connection string có password hard-code. Nếu cấu hình DB có dữ liệu thật và app được truy cập từ bên ngoài, request GET có thể trả toàn bộ khách và giao dịch.

Đây là đánh giá source/schema, không xác nhận policy nào đang được áp dụng trên DB hay password nào còn hiệu lực. Không kiểm tra endpoint/DB cloud trong review này.

## Giới hạn và thứ tự xử lý

Ưu tiên contract ngày và dữ liệu, chế độ mock rõ ràng, gia hạn trước hạn, refund latest-order/idempotency, rồi ID/fixtures/validation. Chỉ sau khi UI và use case được kiểm thử mới triển khai tích hợp backend có transaction và quyền truy cập theo phạm vi dự án.

8 test hiện tại chỉ bao phủ một phần money/date/renewalDates và trường hợp refund vượt số dư; không test context, mapper DATE, retry, rollback hay đồng bộ. Test pass chưa chứng minh các luồng trên đúng.
