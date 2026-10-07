@echo off
chcp 65001 >nul
title Tooldesk — Hệ thống Quản lý Bán Tool AI
color 0B

echo =====================================================================
echo                TOOLDESK — QUẢN LÝ KINH DOANH TOOL AI
echo =====================================================================
echo.
echo  [+] Đang khởi động hệ thống quản lý Tooldesk...
echo  [+] Môi trường: Next.js App Router + TypeScript
echo.

cd /d "%~dp0"

:: Kiểm tra node_modules
if not exist "node_modules" (
    echo [!] Chưa tìm thấy thư viện, đang tự động cài đặt dependency...
    call npm install
)

:: Khởi chạy trình duyệt tự động sau 2 giây
start "" http://localhost:3000

echo [✓] Đang mở trình duyệt tại: http://localhost:3000
echo [✓] Để tắt phần mềm, chỉ cần đóng cửa sổ đen này lại.
echo.
echo =====================================================================
echo                    NHẬT KÝ MÁY CHỦ WEB (PORT 3000)
echo =====================================================================
echo.

call npm run start
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [!] Bản build production chưa sẵn sàng, chuyển sang chế độ Dev...
    call npm run dev
)

pause
