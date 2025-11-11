# Google OAuth Setup Guide

## ✅ **Đã hoàn thành:**
- ✅ Cài đặt `@react-oauth/google` package
- ✅ Tạo Google OAuth Provider component
- ✅ Tạo API route `/api/auth/google` để xử lý Google OAuth
- ✅ Cập nhật User model để hỗ trợ Google OAuth (googleId, passwordHash optional)
- ✅ Thêm Google Sign-In button vào trang login
- ✅ Cập nhật useAuth hook để hỗ trợ Google login

## 🔧 **Bước tiếp theo - Cấu hình Google OAuth:**

### 1. **Tạo Google OAuth Client ID:**

#### **Bước 1: Truy cập Google Cloud Console**
1. Vào [Google Cloud Console](https://console.cloud.google.com/)
2. Tạo project mới hoặc chọn project có sẵn

#### **Bước 2: Enable Google+ API**
1. Vào "APIs & Services" > "Library"
2. Tìm "Google+ API" hoặc "Google Identity Services"
3. Click "Enable"

#### **Bước 3: Tạo OAuth 2.0 Client ID**
1. Vào "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Nếu chưa có OAuth consent screen, tạo một cái:
   - Chọn "External" (hoặc "Internal" nếu dùng Google Workspace)
   - Điền thông tin: App name, User support email, Developer contact
   - Thêm scopes: `email`, `profile`, `openid`
   - Thêm test users nếu cần (cho External apps)
4. Tạo OAuth client:
   - Application type: "Web application"
   - Name: "CLB Sinh viên 5 Tốt TDMU"
   - Authorized JavaScript origins:
     - `http://localhost:3000` (cho development)
     - `https://yourdomain.com` (cho production)
   - Authorized redirect URIs:
     - `http://localhost:3000` (cho development)
     - `https://yourdomain.com` (cho production)
5. Copy **Client ID**

### 2. **Thêm Client ID vào `.env.local`:**

Tạo hoặc cập nhật file `.env.local` trong thư mục gốc:

```bash
# Google OAuth Client ID
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id_here

# Other environment variables...
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
```

### 3. **Restart Next.js Dev Server:**

```bash
npm run dev
```

## 🚀 **Tính năng Google OAuth:**

### **Đăng nhập:**
- ✅ User có thể đăng nhập bằng tài khoản Google
- ✅ Nếu user chưa tồn tại, tự động tạo tài khoản mới
- ✅ Nếu user đã tồn tại (theo email hoặc googleId), đăng nhập trực tiếp
- ✅ Tự động lấy avatar từ Google

### **Đăng ký tự động:**
- ✅ Nếu email là `@student.tdmu.edu.vn`, sử dụng student ID từ email
- ✅ Nếu email khác, tạo student ID dạng `g{googleId}` (tự động unique)

## ⚠️ **Lưu ý quan trọng:**

### **Bảo mật:**
- ⚠️ **KHÔNG BAO GIỜ** commit file `.env.local` vào Git
- ⚠️ **KHÔNG** chia sẻ Google Client ID trên GitHub, Discord, etc.
- ⚠️ Restrict OAuth Client ID trong Google Cloud Console để chỉ chấp nhận từ domain của bạn

### **Production:**
- 🔒 Cập nhật Authorized JavaScript origins và Redirect URIs với domain production
- 🔒 Enable HTTPS cho production
- 🔒 Verify OAuth token với Google API trong production (hiện tại đang decode, nên verify)

### **User Model:**
- ✅ User có thể đăng nhập bằng Google (không cần password)
- ✅ User có thể đăng nhập bằng email/password (không có googleId)
- ✅ User có thể có cả hai (liên kết tài khoản)

## 📝 **Cấu trúc Code:**

### **Files đã thay đổi:**
1. `src/models/User.ts` - Thêm `googleId`, làm `passwordHash` optional
2. `src/components/providers/GoogleOAuthProvider.tsx` - Provider component mới
3. `src/app/layout.tsx` - Wrap app với GoogleOAuthProvider
4. `src/app/api/auth/google/route.ts` - API route xử lý Google OAuth
5. `src/app/auth/login/page.tsx` - Thêm Google Sign-In button
6. `src/hooks/useAuth.ts` - Thêm `loginGoogle` function

## 🐛 **Troubleshooting:**

### **Lỗi "Google OAuth Client ID is not configured":**
- Kiểm tra file `.env.local` có `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- Restart Next.js dev server

### **Lỗi "redirect_uri_mismatch":**
- Kiểm tra Authorized redirect URIs trong Google Cloud Console
- Đảm bảo URI khớp chính xác (bao gồm http/https, port, path)

### **Lỗi "Access blocked":**
- Kiểm tra OAuth consent screen đã được publish
- Nếu app ở chế độ "Testing", chỉ test users mới có thể đăng nhập

