# ✅ Deployment Checklist

## Trước Khi Deploy

### 1. Chuẩn Bị Code
- [ ] Test build local: `npm run build`
- [ ] Test chạy production: `npm start`
- [ ] Kiểm tra không có lỗi TypeScript: `npm run lint`
- [ ] Commit và push code lên GitHub

### 2. Chuẩn Bị Database
- [ ] Tạo MongoDB Atlas account (hoặc setup MongoDB trên VPS)
- [ ] Tạo database và user
- [ ] Whitelist IP: `0.0.0.0/0` (cho phép tất cả)
- [ ] Lấy connection string: `mongodb+srv://user:pass@cluster.mongodb.net/dbname`

### 3. Chuẩn Bị Cloudinary
- [ ] Đã có Cloudinary account
- [ ] Lấy API Key, API Secret, Cloud Name
- [ ] Tạo Cloudinary URL: `cloudinary://api_key:api_secret@cloud_name`

### 4. Chuẩn Bị JWT Secret
- [ ] Tạo random secret key mạnh (ít nhất 32 ký tự)
- [ ] Ví dụ: `openssl rand -base64 32`

---

## Trong Quá Trình Deploy

### Vercel (Khuyên dùng)
- [ ] Đăng ký/đăng nhập Vercel
- [ ] Import GitHub repository
- [ ] Thêm Environment Variables:
  - [ ] `MONGODB_URI`
  - [ ] `JWT_SECRET`
  - [ ] `CLOUDINARY_URL`
  - [ ] `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
  - [ ] `NEXT_PUBLIC_BASE_URL` (sẽ có sau khi deploy)
- [ ] Click Deploy
- [ ] Chờ build hoàn tất
- [ ] Copy URL và cập nhật `NEXT_PUBLIC_BASE_URL` nếu cần

### Railway
- [ ] Đăng ký/đăng nhập Railway
- [ ] Tạo New Project từ GitHub
- [ ] Thêm MongoDB service
- [ ] Thêm Environment Variables
- [ ] Deploy

### Render
- [ ] Đăng ký/đăng nhập Render
- [ ] Tạo Web Service từ GitHub
- [ ] Cấu hình Build/Start commands
- [ ] Thêm MongoDB service
- [ ] Thêm Environment Variables
- [ ] Deploy

---

## Sau Khi Deploy

### Kiểm Tra
- [ ] Website có thể truy cập được
- [ ] Test đăng nhập/đăng ký
- [ ] Test upload file (nếu có)
- [ ] Test các chức năng chính
- [ ] Kiểm tra console không có lỗi

### Cấu Hình Domain (Tùy chọn)
- [ ] Thêm custom domain trong hosting dashboard
- [ ] Cấu hình DNS records
- [ ] Chờ DNS propagate (có thể mất vài giờ)
- [ ] Test truy cập qua domain mới

### Bảo Mật
- [ ] Đảm bảo tất cả secrets không bị commit lên Git
- [ ] Kiểm tra `.env.local` không có trong repository
- [ ] JWT_SECRET đủ mạnh và unique

---

## Environment Variables Template

```env
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/db-sv5tot-tdmu

# JWT
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long

# Cloudinary
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name

# Base URL (cập nhật sau khi có URL từ hosting)
NEXT_PUBLIC_BASE_URL=https://your-app.vercel.app
```

---

## Lệnh Hữu Ích

```bash
# Test build
npm run build

# Test production
npm start

# Check linter
npm run lint

# Generate JWT secret
openssl rand -base64 32

# Check Git status
git status

# Push to GitHub
git add .
git commit -m "Ready for deployment"
git push origin main
```

---

## Liên Hệ Hỗ Trợ

Nếu gặp vấn đề:
1. Kiểm tra logs trong hosting dashboard
2. Kiểm tra Environment Variables đã đúng chưa
3. Test build local trước
4. Xem file `HUONG_DAN_DEPLOY.md` để biết chi tiết
