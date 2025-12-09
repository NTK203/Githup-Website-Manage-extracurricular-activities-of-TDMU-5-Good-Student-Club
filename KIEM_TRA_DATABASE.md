# 🔍 Hướng Dẫn Kiểm Tra Kết Nối Database

## Bước 1: Kiểm Tra Endpoint Test

Sau khi deploy lên Vercel, truy cập endpoint này để kiểm tra kết nối:

```
https://your-app.vercel.app/api/health/db
```

Endpoint này sẽ trả về:
- ✅ `success: true` nếu kết nối thành công
- ❌ `success: false` kèm thông tin lỗi nếu thất bại

## Bước 2: Kiểm Tra Environment Variables trên Vercel

### Cách kiểm tra:

1. Vào [Vercel Dashboard](https://vercel.com/dashboard)
2. Chọn project của bạn
3. Vào **Settings** → **Environment Variables**
4. Kiểm tra các biến sau:

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/db-sv5tot-tdmu
JWT_SECRET=your-secret-key
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
NEXT_PUBLIC_BASE_URL=https://your-app.vercel.app
```

### ⚠️ Lưu ý quan trọng:

- **Environment**: Chọn đúng environment (Production, Preview, Development)
- **MONGODB_URI**: Phải là connection string đầy đủ từ MongoDB Atlas
- **Không có khoảng trắng** trước/sau dấu `=`
- Sau khi thêm/sửa env vars, cần **redeploy** project

## Bước 3: Kiểm Tra MongoDB Atlas

### 3.1. Network Access (Quan trọng!)

1. Vào [MongoDB Atlas Dashboard](https://cloud.mongodb.com)
2. Chọn cluster của bạn
3. Vào **Network Access** (hoặc **Security** → **Network Access**)
4. Kiểm tra IP whitelist:

   **Phải có một trong các cấu hình sau:**
   - IP: `0.0.0.0/0` (cho phép tất cả IP) - **Khuyên dùng cho Vercel**
   - Hoặc thêm IP của Vercel (không khuyến khích vì IP thay đổi)

5. Nếu chưa có, click **ADD IP ADDRESS** → Chọn **ALLOW ACCESS FROM ANYWHERE** (0.0.0.0/0)

### 3.2. Database Access

1. Vào **Database Access** (hoặc **Security** → **Database Access**)
2. Kiểm tra user có quyền truy cập:
   - User phải có role **Atlas Admin** hoặc **Read and write to any database**
   - Username và password phải khớp với connection string

### 3.3. Connection String

1. Vào **Database** → Click **Connect** trên cluster
2. Chọn **Connect your application**
3. Copy connection string, format:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
4. Thêm database name vào cuối:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/db-sv5tot-tdmu?retryWrites=true&w=majority
   ```

## Bước 4: Kiểm Tra Logs trên Vercel

### Xem logs real-time:

1. Vào Vercel Dashboard → Project của bạn
2. Vào tab **Deployments**
3. Click vào deployment mới nhất
4. Vào tab **Functions** → Chọn API route bất kỳ
5. Xem logs để tìm lỗi:

   **Lỗi thường gặp:**
   - `MongoServerError: Authentication failed` → Sai username/password
   - `MongoServerError: IP not whitelisted` → Chưa whitelist IP
   - `MongooseServerSelectionError: getaddrinfo ENOTFOUND` → Sai cluster URL
   - `Missing MONGODB_URI` → Chưa cấu hình env var

## Bước 5: Test Kết Nối

### Test từ browser:

Mở terminal hoặc browser, gọi API test:

```bash
# Thay your-app bằng domain Vercel của bạn
curl https://your-app.vercel.app/api/health/db
```

Hoặc mở trực tiếp trong browser:
```
https://your-app.vercel.app/api/health/db
```

### Kết quả mong đợi (Thành công):

```json
{
  "success": true,
  "message": "Database connection successful",
  "details": {
    "envVarConfigured": true,
    "connectionState": "connected",
    "isConnected": true,
    "dbName": "db-sv5tot-tdmu",
    "host": "cluster0.xxxxx.mongodb.net",
    "port": 27017,
    "ping": "ok"
  }
}
```

### Kết quả lỗi (Thất bại):

```json
{
  "success": false,
  "error": "Database connection failed",
  "details": {
    "envVarConfigured": true,
    "connectionState": "error",
    "errorMessage": "...",
    "maskedError": "mongodb+srv://***:***@..."
  }
}
```

## Bước 6: Redeploy sau khi sửa Env Vars

**QUAN TRỌNG**: Sau khi thêm/sửa environment variables trên Vercel, bạn PHẢI redeploy:

1. Vào **Deployments** tab
2. Click **...** (3 chấm) trên deployment mới nhất
3. Chọn **Redeploy**
4. Hoặc push một commit mới lên GitHub (Vercel sẽ tự động deploy)

## Troubleshooting

### Lỗi: "MONGODB_URI environment variable is not set"

**Nguyên nhân**: Chưa cấu hình env var trên Vercel

**Giải pháp**:
1. Vào Vercel → Settings → Environment Variables
2. Thêm `MONGODB_URI` với giá trị đúng
3. Redeploy project

### Lỗi: "Authentication failed"

**Nguyên nhân**: Username/password sai

**Giải pháp**:
1. Kiểm tra lại username/password trong MongoDB Atlas
2. Cập nhật lại MONGODB_URI trên Vercel
3. Đảm bảo không có ký tự đặc biệt cần URL encode (như `@`, `:`, `/`)

### Lỗi: "IP not whitelisted" hoặc "getaddrinfo ENOTFOUND"

**Nguyên nhân**: Chưa whitelist IP hoặc sai cluster URL

**Giải pháp**:
1. Vào MongoDB Atlas → Network Access
2. Thêm `0.0.0.0/0` vào whitelist
3. Đợi 1-2 phút để cập nhật
4. Kiểm tra lại connection string

### Lỗi: "Connection timeout"

**Nguyên nhân**: Cluster không hoạt động hoặc network issue

**Giải pháp**:
1. Kiểm tra cluster status trên MongoDB Atlas
2. Đảm bảo cluster đang running (không paused)
3. Thử connection string từ MongoDB Atlas UI (nút "Connect")

## Liên Hệ Hỗ Trợ

Nếu vẫn gặp vấn đề sau khi thực hiện tất cả các bước trên, vui lòng:
1. Chụp screenshot logs từ Vercel
2. Chụp screenshot response từ `/api/health/db`
3. Gửi thông tin để được hỗ trợ tiếp
