# Quy tắc kết nối Database & Vercel Serverless (Tooldesk)

Tài liệu này ghi lại kiến trúc, bài học thực tế và **các quy tắc bất di bất dịch** khi kết nối Next.js trên Vercel tới Supabase PostgreSQL để không bao giờ tái diễn sự cố mất kết nối database.

---

## 1. Sự cố đã xảy ra & Nguyên nhân gốc rễ

### Sự cố 1: `SELF_SIGNED_CERT_IN_CHAIN`
- **Hiện tượng**: API `/api/data` trả về lỗi 503 khi deploy lên Vercel production.
- **Nguyên nhân**: Trên máy local, file chứng chỉ `supabase/certs/prod-ca-2021.crt` nằm trên ổ đĩa vật lý nên Node.js đọc được. Nhưng khi Vercel đóng gói Serverless Function (AWS Lambda), các file nằm ngoài thư mục nguồn không được đưa vào container runtime. Khi `DATABASE_SSL_REJECT_UNAUTHORIZED=true`, Node.js không tìm thấy file CA và từ chối chứng chỉ của Supabase vì `Supabase Root 2021 CA` không nằm trong root store mặc định của hệ điều hành container.

### Sự cố 2: `EMAXCONNSESSION (max clients reached in session mode)`
- **Hiện tượng**: Database thỉnh thoảng mất kết nối đột ngột khi có nhiều người truy cập hoặc khi reload nhiều lần.
- **Nguyên nhân**: Chuỗi kết nối Supabase Pooler dùng cổng `5432` (`aws-0-ap-south-1.pooler.supabase.com:5432`). Cổng `5432` trên Supabase Pooler chạy ở **Session Mode** với giới hạn cứng tối đa chỉ **15 kết nối cùng lúc** (`pool_size: 15`). Khi Vercel khởi tạo nhiều serverless container, số kết nối lập tức vượt quá 15 và toàn bộ ứng dụng bị khóa nghẽn. Cổng đúng cho serverless là **`6543`** (**Transaction Mode / PgBouncer**).

### Sự cố 3: Pool Size quá lớn trên Serverless
- **Hiện tượng**: Cạn kiệt connection pool trên database.
- **Nguyên nhân**: Mặc định `max: 10` connection và `idleTimeoutMillis: 30000` được cấu hình cho server truyền thống. Khi chạy serverless, mỗi instance chỉ phục vụ 1 request một thời điểm. Nếu 10 instance bật lên với `max: 10`, ứng dụng sẽ yêu cầu tới 100 kết nối, gây quá tải connection limit của PostgreSQL.

### Sự cố 4: Nuốt chi tiết lỗi & Transaction thừa cho truy vấn đọc
- **Hiện tượng**: Khi xảy ra lỗi kết nối, API chỉ trả về chuỗi tĩnh: `"Không tải được dữ liệu. Kiểm tra schema và cấu hình server."` khiến người vận hành hoàn toàn không biết nguyên nhân là do SSL, do hết connection, hay do sai schema.
- **Nguyên nhân**: Lệnh đọc dữ liệu `loadData()` (vốn chỉ là một câu lệnh `SELECT json_build_object(...)`) bị bọc thừa thãi vào `transaction(BEGIN -> SET TRANSACTION ISOLATION LEVEL -> COMMIT)`, gây xung đột với một số cơ chế của PgBouncer.

---

## 2. Các quy tắc bất di bất dịch (Inviolable Rules)

Bất kỳ AI Agent hoặc lập trình viên nào bảo trì hệ thống phải tuân thủ nghiêm ngặt 5 quy tắc sau:

### Quy tắc 1: Luôn dùng Port 6543 (Transaction Mode) cho Pooler
- Khi kết nối qua Supabase Pooler (`*.pooler.supabase.com`), **bắt buộc dùng cổng 6543**.
- Trong `src/lib/db.ts`, luôn duy trì logic tự động chuẩn hoá: nếu chuỗi kết nối chứa `.pooler.supabase.com:5432` thì phải tự động thay thế thành `.pooler.supabase.com:6543`.

### Quy tắc 2: Nhúng trực tiếp Supabase Root CA làm Fallback trong Code
- File `src/lib/db.ts` phải chứa hằng số `DEFAULT_SUPABASE_CA_CERT` (chứng chỉ `Supabase Root 2021 CA`).
- Hàm `resolveCaCert()` ưu tiên biến môi trường `DATABASE_CA_CERT` -> file trên đĩa `prod-ca-2021.crt` -> **luôn fallback về `DEFAULT_SUPABASE_CA_CERT`** thay vì trả về `undefined`.
- Điều này bảo đảm kết nối SSL luôn được xác thực an toàn với `rejectUnauthorized: true` mà không bao giờ bị lỗi `SELF_SIGNED_CERT_IN_CHAIN` trên Vercel / Lambda.

### Quy tắc 3: Tối ưu Connection Pool cho Serverless
- Phát hiện môi trường serverless: `const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);`
- Khi `isServerless` là `true`:
  - `max`: **2** (thay vì 10).
  - `idleTimeoutMillis`: **5000** (thay vì 30000) để nhanh chóng giải phóng kết nối về PgBouncer.

### Quy tắc 4: Không bọc Transaction cho các truy vấn chỉ đọc (Read Queries)
- Đối với các thao tác đọc dữ liệu như `loadData()` trong `data-handler.ts`, gọi trực tiếp qua `getDbPool()`.
- Trong PostgreSQL, một câu lệnh `SELECT` đơn lẻ đã là atomic và chạy ở mức Read Committed mặc định.
- Tuyệt đối không gọi `transaction()` hoặc `SET TRANSACTION ISOLATION LEVEL` cho các request GET / đọc dữ liệu.

### Quy tắc 5: Không nuốt chi tiết lỗi Database
- Khi bắt ngoại lệ trong các route handler (`data-handler.ts`, command handler), luôn trích xuất `error instanceof Error ? error.message : String(error)` và trả về trong phản hồi lỗi kèm mã trạng thái phù hợp.
- Tuyệt đối không giấu lỗi bằng chuỗi thông báo chung chung khiến không thể debug từ xa.

---

## 3. Cấu hình biến môi trường chuẩn trên Vercel

```env
# Chuỗi kết nối qua Transaction Pooler (Cổng 6543)
DATABASE_URL=postgresql://postgres.jqkezzjkcyulkrmtrwgj:dvdsvsvdfvsdfvsvvfdvfedv@aws-0-ap-south-1.pooler.supabase.com:6543/postgres

# Bật kiểm tra SSL an toàn
DATABASE_SSL_REJECT_UNAUTHORIZED=true

# Chế độ dữ liệu
APP_DATA_SOURCE=supabase

# Supabase Auth
SUPABASE_URL=https://jqkezzjkcyulkrmtrwgj.supabase.co
SUPABASE_ANON_KEY=sb_publishable_mKZli7X_7ubSWIQrr2qk7w_ksf3anf6

# Domain ứng dụng
APP_URL=https://tooldesk-plum.vercel.app
```

---

## 4. Script kiểm tra kết nối nhanh (Diagnostic Checklist)

Trước khi xác nhận hoàn thành sửa lỗi database, chạy script kiểm tra:
1. `node scratch/test_pooler_6543.js`: Xác nhận cổng 6543 truy vấn thành công.
2. `node scratch/test_vercel_live.js`: Đăng nhập tài khoản thật và gọi `/api/data` trên domain Vercel production, xác nhận HTTP status 200 và nạp đủ toàn bộ dữ liệu.
