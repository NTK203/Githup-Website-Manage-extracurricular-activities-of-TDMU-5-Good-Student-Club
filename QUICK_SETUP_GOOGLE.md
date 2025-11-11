# Hướng dẫn nhanh: Cấu hình Google Sign-In

## Bước 1: Lấy Google OAuth Client ID

1. Truy cập: https://console.cloud.google.com/
2. Tạo project mới hoặc chọn project có sẵn
3. Vào **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth client ID**
5. Nếu chưa có OAuth consent screen, tạo một cái:
   - Application type: **Web application**
   - Name: **CLB Sinh viên 5 Tốt TDMU**
   - Authorized JavaScript origins: `http://localhost:3000`
   - Authorized redirect URIs: `http://localhost:3000`
6. Copy **Client ID** (dạng: `123456789-abcdefghijklmnop.apps.googleusercontent.com`)

## Bước 2: Thêm vào .env.local

Mở file `.env.local` trong thư mục gốc và thêm dòng:

```bash
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id_here
```

**Ví dụ:**
```bash
NEXT_PUBLIC_GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
```

## Bước 3: Restart Server

```bash
# Dừng server (Ctrl+C)
# Sau đó chạy lại:
npm run dev
```

## Kiểm tra

Sau khi restart, nút "Đăng nhập bằng Google" sẽ hoạt động bình thường!

---

**Lưu ý:** 
- File `.env.local` đã có sẵn trong project
- Chỉ cần thêm dòng `NEXT_PUBLIC_GOOGLE_CLIENT_ID=...` vào cuối file
- KHÔNG commit file `.env.local` vào Git

