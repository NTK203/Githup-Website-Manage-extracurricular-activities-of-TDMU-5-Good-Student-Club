# 🚨 Sửa Lỗi Database Connection - Hướng Dẫn Nhanh

## ❌ Lỗi hiện tại:
```
Failed to fetch available activities: Database connection failed
```

## ✅ Giải pháp nhanh (3 bước):

### Bước 1: Kiểm tra Environment Variables trên Vercel

1. Vào: https://vercel.com/dashboard → Chọn project → **Settings** → **Environment Variables**
2. Kiểm tra có biến `MONGODB_URI` chưa
3. Nếu chưa có hoặc sai, thêm/sửa:

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/db-sv5tot-tdmu?retryWrites=true&w=majority
```

**⚠️ Lưu ý:**
- Thay `username`, `password`, `cluster.mongodb.net` bằng giá trị thực tế từ MongoDB Atlas
- Chọn đúng Environment: **Production** (hoặc cả 3: Production, Preview, Development)

### Bước 2: Kiểm tra MongoDB Atlas Network Access

1. Vào: https://cloud.mongodb.com
2. Chọn cluster → **Network Access** (hoặc **Security** → **Network Access**)
3. Kiểm tra có IP `0.0.0.0/0` chưa
4. Nếu chưa có:
   - Click **ADD IP ADDRESS**
   - Chọn **ALLOW ACCESS FROM ANYWHERE** (sẽ tự động thêm `0.0.0.0/0`)
   - Click **Confirm**
   - Đợi 1-2 phút để cập nhật

### Bước 3: Redeploy trên Vercel

**BẮT BUỘC** sau khi sửa env vars:

1. Vào Vercel → **Deployments** tab
2. Click **...** (3 chấm) trên deployment mới nhất
3. Chọn **Redeploy**
4. Đợi 2-3 phút để deploy xong

## 🔍 Kiểm tra kết quả:

Sau khi redeploy, mở endpoint này để test:

```
https://githup-website-manage-extracurricul-six.vercel.app/api/health/db
```

**Kết quả thành công:**
```json
{
  "success": true,
  "message": "Database connection successful",
  "details": {
    "envVarConfigured": true,
    "connectionState": "connected",
    "isConnected": true,
    "dbName": "db-sv5tot-tdmu"
  }
}
```

**Nếu vẫn lỗi**, kiểm tra lại:
- Connection string có đúng format không?
- Username/password có đúng không?
- IP whitelist đã được cập nhật chưa? (đợi 1-2 phút)
- Đã redeploy chưa?

## 📋 Checklist:

- [ ] Đã thêm `MONGODB_URI` vào Vercel Environment Variables
- [ ] Connection string đúng format và có database name ở cuối
- [ ] Đã whitelist IP `0.0.0.0/0` trên MongoDB Atlas
- [ ] Đã redeploy trên Vercel
- [ ] Đã test endpoint `/api/health/db` và nhận `success: true`

## 💡 Lấy Connection String từ MongoDB Atlas:

1. Vào MongoDB Atlas → Database
2. Click **Connect** trên cluster
3. Chọn **Connect your application**
4. Copy connection string
5. Thay `<password>` bằng password thực tế
6. Thêm database name: Thay `/?retryWrites...` bằng `/db-sv5tot-tdmu?retryWrites...`

**Ví dụ:**
```
mongodb+srv://myuser:mypassword@cluster0.abc123.mongodb.net/db-sv5tot-tdmu?retryWrites=true&w=majority
```
