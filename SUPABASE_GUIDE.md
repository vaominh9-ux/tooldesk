# Hướng Dẫn Cấu Hình & Kết Nối Database Supabase Cho Tooldesk

Toàn bộ thông tin kết nối và cấu trúc dữ liệu Supabase đã được **tự động kết nối, khởi tạo bảng và nạp dữ liệu hoàn chỉnh** vào dự án **Tooldesk (Quản lý kinh doanh tool AI)**.

---

## 1. Thông Tin Kết Nối (Credentials)

| Thông số | Giá trị |
| :--- | :--- |
| **Email quản trị** | `vaominh9@gmail.com` |
| **Supabase Project URL** | `https://jqkezzjkcyulkrmtrwgj.supabase.co` |
| **Project ID / Reference ID** | `jqkezzjkcyulkrmtrwgj` |
| **Publishable / Anon API Key** | `sb_publishable_mKZli7X_7ubSWIQrr2qk7w_ksf3anf6` |
| **Database Password** | `dvdsvsvdfvsdfvsvvfdvfedv` |
| **PostgreSQL Direct URI** | `postgresql://postgres:dvdsvsvdfvsdfvsvvfdvfedv@db.jqkezzjkcyulkrmtrwgj.supabase.co:5432/postgres` |
| **Host** | `db.jqkezzjkcyulkrmtrwgj.supabase.co` |
| **Port** | `5432` |
| **Database Name** | `postgres` |
| **User** | `postgres` |

---

## 2. Trạng Thái Dữ Liệu Hiện Tại Trên Supabase (Đã Khởi Tạo Trực Tiếp)

Đã kết nối trực tiếp qua PostgreSQL 17 và nạp đầy đủ cấu trúc & dữ liệu kinh doanh:

| Bảng dữ liệu | Số lượng bản ghi | Mô tả |
| :--- | :--- | :--- |
| `public.products` | **5** | ChatGPT, Claude, Gemini, Perplexity, Canva |
| `public.product_plans` | **10** | Các gói 1 tháng, 3 tháng, 1 năm tương ứng |
| `public.customers` | **36** | Danh sách 36 khách hàng với thông tin Zalo/Email |
| `public.subscriptions` | **48** | 48 gói đang chạy, sắp hết hạn hoặc đang hoạt động |
| `public.orders` | **98** | Lịch sử 98 đơn hàng doanh thu |
| `public.refunds` | **2** | Bản ghi hoàn tiền mẫu |
| `public.campaigns` | **2** | Chiến dịch chăm sóc khách hàng mẫu |
| `public.activity_logs` | **4** | Nhật ký đơn hàng, thanh toán gần nhất |
| `public.settings` | **1** | Cấu hình thương hiệu Tooldesk (Chủ: Minh) |

---

## 3. Các Tệp Quản Lý Trong Dự Án

1. **[.env](file:///c:/Users/ASUS/Desktop/quản%20lý%20khách%20hàng%20tool%20ai/.env)**:
   - Lưu trữ biến môi trường bảo mật (`DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_DB_PASSWORD`).
   
2. **[.env.example](file:///c:/Users/ASUS/Desktop/quản%20lý%20khách%20hàng%20tool%20ai/.env.example)**:
   - Bản mẫu an toàn (ẩn mật khẩu) để dùng khi push code lên Git.

3. **[.gitignore](file:///c:/Users/ASUS/Desktop/quản%20lý%20khách%20hàng%20tool%20ai/.gitignore)**:
   - Tự động bỏ qua file `.env` và `node_modules`.

4. **[supabase-config.js](file:///c:/Users/ASUS/Desktop/quản%20lý%20khách%20hàng%20tool%20ai/supabase-config.js)**:
   - Cung cấp `SUPABASE_CONFIG`, hàm `getSupabaseClient()` và hàm `fetchTooldeskDataFromSupabase()` để tải dữ liệu trực tiếp từ REST API đám mây.

5. **[supabase/schema.sql](file:///c:/Users/ASUS/Desktop/quản%20lý%20khách%20hàng%20tool%20ai/supabase/schema.sql)**:
   - Bộ mã DDL PostgreSQL định nghĩa bảng, quan hệ khóa ngoại (Foreign Keys), chỉ mục (Indexes) và chính sách Row Level Security (RLS).

6. **[tooldesk-v2-preview.html](file:///c:/Users/ASUS/Desktop/quản%20lý%20khách%20hàng%20tool%20ai/tooldesk-v2-preview.html)**:
   - Ứng dụng quản trị. Vào mục **Cài đặt** -> **Kết nối dịch vụ** sẽ thấy Supabase đã ở trạng thái **"Đã lưu cấu hình"**.
   - Có thêm nút **"Đồng bộ từ Supabase Cloud"** để tải dữ liệu đám mây về hiển thị.

---

## 4. Các Lệnh Thao Tác Nhanh (Terminal)

```bash
# Kiểm tra kết nối tới Supabase
npm run db:test

# Khởi tạo lại bảng và chính sách bảo mật (schema)
npm run db:init

# Nạp lại dữ liệu mẫu (seed)
npm run db:seed
```
