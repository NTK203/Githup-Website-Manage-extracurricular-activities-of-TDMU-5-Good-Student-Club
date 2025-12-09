# 🚨 HƯỚNG DẪN SỬA LỖI DATABASE CONNECTION - URGENT

## ❌ Lỗi hiện tại:
```
Failed to fetch available activities: Database connection failed
Failed to load resource: the server responded with a status of 500
```

## ✅ GIẢI PHÁP (Làm theo thứ tự):

### 🔴 BƯỚC 1: Kiểm tra Environment Variables trên Vercel (QUAN TRỌNG NHẤT)

**Đây là nguyên nhân chính của lỗi!**

1. **Vào Vercel Dashboard:**
   - Mở: https://vercel.com/dashboard
   - Đăng nhập nếu chưa đăng nhập
   - Chọn project: `Githup-Website-Manage-extracurricular-activities-of-TDMU-5-Good-Student-Club`

2. **Vào Settings → Environment Variables:**
   - Click vào project
   - Click tab **Settings** (ở trên cùng)
   - Click **Environment Variables** (menu bên trái)

3. **Kiểm tra biến `MONGODB_URI`:**
   - Tìm biến có tên `MONGODB_URI`
   - Nếu **KHÔNG CÓ** → Thêm mới (xem Bước 2)
   - Nếu **CÓ** → Kiểm tra format (xem Bước 3)

### 🔴 BƯỚC 2: Thêm MONGODB_URI (Nếu chưa có)

1. **Click nút "Add New"** trong Environment Variables

2. **Điền thông tin:**
   - **Key:** `MONGODB_URI`
   - **Value:** `mongodb+srv://username:password@cluster.mongodb.net/db-sv5tot-tdmu?retryWrites=true&w=majority`
   - **Environment:** Chọn **Production** (hoặc chọn cả 3: Production, Preview, Development)

3. **Lấy Connection String từ MongoDB Atlas:**
   - Vào: https://cloud.mongodb.com
   - Chọn cluster của bạn
   - Click **Connect** → **Connect your application**
   - Copy connection string
   - Thay `<password>` bằng password thực tế
   - Thay `/?retryWrites...` bằng `/db-sv5tot-tdmu?retryWrites...`

4. **Click "Save"**

### 🔴 BƯỚC 3: Kiểm tra MongoDB Atlas Network Access

1. **Vào MongoDB Atlas:**
   - https://cloud.mongodb.com
   - Đăng nhập

2. **Vào Network Access:**
   - Click **Security** → **Network Access** (hoặc **Network Access** trực tiếp)

3. **Kiểm tra IP Whitelist:**
   - Phải có IP: `0.0.0.0/0` (Allow access from anywhere)
   - Nếu chưa có:
     - Click **ADD IP ADDRESS**
     - Click **ALLOW ACCESS FROM ANYWHERE**
     - Click **Confirm**
     - **Đợi 1-2 phút** để cập nhật

4. **Kiểm tra Database Access:**
   - Vào **Security** → **Database Access**
   - Đảm bảo user có quyền **Read and write to any database**
   - Username/password phải khớp với connection string

### 🔴 BƯỚC 4: REDEPLOY trên Vercel (BẮT BUỘC!)

**Sau khi sửa env vars, PHẢI redeploy:**

1. Vào Vercel → **Deployments** tab
2. Click **...** (3 chấm) trên deployment mới nhất
3. Chọn **Redeploy**
4. Chọn **Use existing Build Cache** = OFF (để đảm bảo env vars mới được load)
5. Click **Redeploy**
6. **Đợi 2-3 phút** để deploy xong

### 🔍 BƯỚC 5: Kiểm tra kết quả

**Sau khi redeploy xong, test endpoint:**

Mở trong browser:
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
    "isConnected": true
  }
}
```

**Nếu vẫn lỗi**, xem phần Troubleshooting bên dưới.

## 🔧 TROUBLESHOOTING

### Lỗi: "MONGODB_URI environment variable is not set"

**Nguyên nhân:** Chưa cấu hình env var hoặc chưa redeploy

**Giải pháp:**
1. Kiểm tra lại Bước 1-2
2. **Redeploy lại** (Bước 4)
3. Đảm bảo đã chọn đúng Environment (Production)

### Lỗi: "Authentication failed"

**Nguyên nhân:** Username/password sai

**Giải pháp:**
1. Kiểm tra lại username/password trong MongoDB Atlas
2. Cập nhật lại `MONGODB_URI` trên Vercel
3. **Redeploy lại**

### Lỗi: "IP not whitelisted" hoặc "getaddrinfo ENOTFOUND"

**Nguyên nhân:** Chưa whitelist IP hoặc sai cluster URL

**Giải pháp:**
1. Kiểm tra lại Bước 3 (Network Access)
2. Đảm bảo đã thêm `0.0.0.0/0`
3. Đợi 1-2 phút sau khi thêm IP
4. Kiểm tra lại connection string

### Lỗi: "Connection timeout"

**Nguyên nhân:** Cluster không hoạt động

**Giải pháp:**
1. Vào MongoDB Atlas → Database
2. Kiểm tra cluster đang **Running** (không paused)
3. Nếu paused, click **Resume** và đợi cluster khởi động

## 📋 CHECKLIST CUỐI CÙNG

Trước khi báo lại, đảm bảo đã làm đủ:

- [ ] Đã thêm `MONGODB_URI` vào Vercel Environment Variables
- [ ] Connection string đúng format: `mongodb+srv://.../db-sv5tot-tdmu?...`
- [ ] Username/password đúng
- [ ] Đã whitelist IP `0.0.0.0/0` trên MongoDB Atlas
- [ ] Đã đợi 1-2 phút sau khi sửa Network Access
- [ ] Đã **REDEPLOY** trên Vercel
- [ ] Đã đợi 2-3 phút sau khi redeploy
- [ ] Đã test endpoint `/api/health/db` và nhận `success: true`

## 💡 LẤY CONNECTION STRING CHI TIẾT:

1. Vào MongoDB Atlas → Database
2. Click **Connect** trên cluster
3. Chọn **Connect your application**
4. Copy connection string, ví dụ:
   ```
   mongodb+srv://myuser:<password>@cluster0.abc123.mongodb.net/?retryWrites=true&w=majority
   ```
5. Thay `<password>` bằng password thực tế
6. Thêm database name vào trước `?`:
   ```
   mongodb+srv://myuser:mypassword@cluster0.abc123.mongodb.net/db-sv5tot-tdmu?retryWrites=true&w=majority
   ```
7. Copy toàn bộ string này vào Vercel Environment Variables

## 📞 SAU KHI LÀM XONG:

1. Test endpoint: `/api/health/db`
2. Kiểm tra trang dashboard có load được không
3. Nếu vẫn lỗi, gửi screenshot:
   - Response từ `/api/health/db`
   - Environment Variables trên Vercel (ẩn password)
   - Network Access trên MongoDB Atlas
