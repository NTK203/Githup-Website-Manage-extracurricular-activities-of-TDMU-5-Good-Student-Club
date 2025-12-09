# 🔗 Hướng Dẫn Kết Nối MongoDB với Vercel - Từng Bước Chi Tiết

## 📋 Tổng Quan

Vercel không lưu trữ database, nên bạn cần sử dụng **MongoDB Atlas** (cloud database miễn phí). Hướng dẫn này sẽ chỉ bạn cách:
1. Tạo MongoDB Atlas (nếu chưa có)
2. Lấy Connection String
3. Cấu hình trên Vercel

---

## 🆕 PHẦN 1: TẠO MONGODB ATLAS (Nếu chưa có)

### Bước 1.1: Đăng ký MongoDB Atlas

1. **Vào trang đăng ký:**
   - Truy cập: https://www.mongodb.com/cloud/atlas/register
   - Hoặc: https://cloud.mongodb.com
   - Click **Try Free** hoặc **Sign Up**

2. **Đăng ký tài khoản:**
   - Điền email, password
   - Hoặc đăng nhập bằng Google/GitHub
   - Chọn **Free Tier** (M0 - Free forever)

### Bước 1.2: Tạo Cluster

1. **Chọn loại cluster:**
   - Chọn **M0 FREE** (miễn phí)
   - Chọn **Cloud Provider:** AWS (hoặc Google Cloud, Azure)
   - Chọn **Region:** Gần Việt Nam nhất (Singapore, hoặc gần nhất)
   - Click **Create Cluster**

2. **Đợi cluster tạo xong** (2-3 phút)

### Bước 1.3: Tạo Database User

1. **Vào Database Access:**
   - Click **Security** → **Database Access** (hoặc **Database Access** trực tiếp)
   - Click **Add New Database User**

2. **Cấu hình user:**
   - **Authentication Method:** Password
   - **Username:** Nhập username (ví dụ: `admin`, `myuser`)
   - **Password:** 
     - Click **Autogenerate Secure Password** (khuyến khích)
     - HOẶC tự tạo password mạnh
     - ⚠️ **LƯU LẠI PASSWORD** - bạn sẽ cần nó sau!
   - **Database User Privileges:** Chọn **Atlas Admin** hoặc **Read and write to any database**
   - Click **Add User**

### Bước 1.4: Cấu hình Network Access (QUAN TRỌNG!)

1. **Vào Network Access:**
   - Click **Security** → **Network Access** (hoặc **Network Access** trực tiếp)
   - Click **Add IP Address**

2. **Thêm IP:**
   - Click **ALLOW ACCESS FROM ANYWHERE** 
   - Điều này sẽ thêm IP: `0.0.0.0/0` (cho phép kết nối từ bất kỳ đâu)
   - ⚠️ Với Vercel, bạn PHẢI chọn option này vì IP của Vercel thay đổi liên tục
   - Click **Confirm**
   - Đợi 1-2 phút để cập nhật

### Bước 1.5: Lấy Connection String

1. **Vào Database:**
   - Click **Database** (menu bên trái)
   - Click nút **Connect** trên cluster của bạn

2. **Chọn "Connect your application":**
   - Click **Connect your application**
   - Chọn **Driver:** Node.js
   - Chọn **Version:** 5.5 or later (hoặc mới nhất)

3. **Copy Connection String:**
   - Bạn sẽ thấy string dạng:
     ```
     mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
     ```
   - **Thay `<username>`** bằng username bạn đã tạo (Bước 1.3)
   - **Thay `<password>`** bằng password bạn đã tạo (Bước 1.3)
   - **Thêm database name** vào trước dấu `?`:
     ```
     mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/db-sv5tot-tdmu?retryWrites=true&w=majority
     ```
   - ⚠️ **Lưu ý:** Thay `db-sv5tot-tdmu` bằng tên database bạn muốn (hoặc giữ nguyên nếu đã dùng)

4. **Copy toàn bộ string này** - bạn sẽ dùng ở bước sau

---

## ⚙️ PHẦN 2: CẤU HÌNH TRÊN VERCEL

### Bước 2.1: Vào Vercel Dashboard

1. **Mở Vercel:**
   - Truy cập: https://vercel.com/dashboard
   - Đăng nhập (nếu chưa)

2. **Chọn Project:**
   - Tìm và click vào project của bạn
   - Hoặc tạo project mới nếu chưa có

### Bước 2.2: Thêm Environment Variable

1. **Vào Settings:**
   - Click tab **Settings** (ở trên cùng)
   - Click **Environment Variables** (menu bên trái)

2. **Thêm biến MONGODB_URI:**
   - Click nút **Add New**
   - **Key:** `MONGODB_URI`
   - **Value:** Dán connection string bạn đã copy ở Bước 1.5
     ```
     mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/db-sv5tot-tdmu?retryWrites=true&w=majority
     ```
   - **Environment:** 
     - Chọn **Production** (cho production site)
     - HOẶC chọn cả 3: **Production**, **Preview**, **Development** (khuyến khích)
   - Click **Save**

3. **Kiểm tra lại:**
   - Đảm bảo biến `MONGODB_URI` đã xuất hiện trong danh sách
   - Value không có khoảng trắng thừa

### Bước 2.3: Thêm các Environment Variables khác (nếu cần)

Ngoài `MONGODB_URI`, bạn cũng cần các biến sau:

1. **JWT_SECRET:**
   - **Key:** `JWT_SECRET`
   - **Value:** Một chuỗi bất kỳ, dài và phức tạp (ví dụ: `your-super-secret-jwt-key-123456789`)
   - **Environment:** Production, Preview, Development

2. **CLOUDINARY_URL** (nếu dùng Cloudinary):
   - **Key:** `CLOUDINARY_URL`
   - **Value:** `cloudinary://api_key:api_secret@cloud_name`
   - **Environment:** Production, Preview, Development

3. **NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME** (nếu dùng Cloudinary):
   - **Key:** `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
   - **Value:** Tên cloud của bạn
   - **Environment:** Production, Preview, Development

4. **NEXT_PUBLIC_BASE_URL:**
   - **Key:** `NEXT_PUBLIC_BASE_URL`
   - **Value:** `https://your-app.vercel.app` (URL Vercel của bạn)
   - **Environment:** Production, Preview, Development

### Bước 2.4: REDEPLOY Project (BẮT BUỘC!)

⚠️ **QUAN TRỌNG:** Sau khi thêm/sửa Environment Variables, bạn PHẢI redeploy!

1. **Vào Deployments:**
   - Click tab **Deployments** (ở trên cùng)

2. **Redeploy:**
   - Tìm deployment mới nhất
   - Click **...** (3 chấm) bên cạnh deployment
   - Chọn **Redeploy**
   - **Use existing Build Cache:** Chọn **OFF** (để đảm bảo env vars mới được load)
   - Click **Redeploy**

3. **Đợi deploy xong:**
   - Đợi 2-3 phút
   - Khi thấy status **Ready** (màu xanh) là xong

---

## ✅ PHẦN 3: KIỂM TRA KẾT NỐI

### Bước 3.1: Test Connection

1. **Mở endpoint test:**
   - Truy cập: `https://your-app.vercel.app/api/health/db`
   - Thay `your-app` bằng domain Vercel của bạn

2. **Kết quả mong đợi (Thành công):**
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

3. **Nếu lỗi:**
   - Xem phần Troubleshooting bên dưới

### Bước 3.2: Kiểm tra Website

1. **Mở website:**
   - Truy cập URL Vercel của bạn
   - Thử đăng nhập, xem dữ liệu

2. **Kiểm tra Console:**
   - Mở Developer Tools (F12)
   - Xem tab Console
   - Không còn lỗi "Database connection failed"

---

## 🔧 TROUBLESHOOTING

### ❌ Lỗi: "MONGODB_URI environment variable is not set"

**Nguyên nhân:** Chưa thêm env var hoặc chưa redeploy

**Giải pháp:**
1. Kiểm tra lại Bước 2.2
2. Đảm bảo đã **Redeploy** (Bước 2.4)
3. Kiểm tra đã chọn đúng Environment

### ❌ Lỗi: "Authentication failed"

**Nguyên nhân:** Username/password sai trong connection string

**Giải pháp:**
1. Kiểm tra lại username/password trong MongoDB Atlas
2. Đảm bảo đã thay `<username>` và `<password>` trong connection string
3. Nếu password có ký tự đặc biệt (`@`, `:`, `/`), cần URL encode:
   - `@` → `%40`
   - `:` → `%3A`
   - `/` → `%2F`
   - Hoặc dùng password không có ký tự đặc biệt

### ❌ Lỗi: "IP not whitelisted"

**Nguyên nhân:** Chưa whitelist IP trên MongoDB Atlas

**Giải pháp:**
1. Vào MongoDB Atlas → Network Access
2. Thêm IP `0.0.0.0/0` (Allow access from anywhere)
3. Đợi 1-2 phút
4. Redeploy lại trên Vercel

### ❌ Lỗi: "getaddrinfo ENOTFOUND"

**Nguyên nhân:** Connection string sai (sai cluster URL)

**Giải pháp:**
1. Lấy lại connection string từ MongoDB Atlas (Bước 1.5)
2. Đảm bảo đúng format
3. Cập nhật lại trên Vercel
4. Redeploy

### ❌ Lỗi: "Connection timeout"

**Nguyên nhân:** Cluster bị paused hoặc không hoạt động

**Giải pháp:**
1. Vào MongoDB Atlas → Database
2. Kiểm tra cluster status
3. Nếu thấy **Paused**, click **Resume**
4. Đợi cluster khởi động lại (2-3 phút)

---

## 📋 CHECKLIST

Trước khi kết thúc, đảm bảo:

- [ ] Đã tạo MongoDB Atlas cluster
- [ ] Đã tạo database user với password
- [ ] Đã whitelist IP `0.0.0.0/0`
- [ ] Đã lấy connection string và thay username/password
- [ ] Đã thêm database name vào connection string
- [ ] Đã thêm `MONGODB_URI` vào Vercel Environment Variables
- [ ] Đã chọn đúng Environment (Production)
- [ ] Đã **Redeploy** trên Vercel
- [ ] Đã test endpoint `/api/health/db` và nhận `success: true`
- [ ] Website hoạt động bình thường

---

## 💡 MẸO VÀ LƯU Ý

1. **Bảo mật:**
   - Không bao giờ commit connection string vào Git
   - Luôn dùng Environment Variables trên Vercel
   - Đặt password mạnh cho database user

2. **Performance:**
   - MongoDB Atlas Free tier có giới hạn, phù hợp cho dự án nhỏ
   - Nếu dự án lớn, cân nhắc nâng cấp

3. **Backup:**
   - MongoDB Atlas tự động backup (tùy plan)
   - Nên export dữ liệu định kỳ

4. **Monitoring:**
   - Vào MongoDB Atlas → Metrics để xem usage
   - Vào Vercel → Functions để xem logs

---

## 📞 HỖ TRỢ THÊM

Nếu vẫn gặp vấn đề:
1. Kiểm tra logs trên Vercel: Deployments → Click vào deployment → Functions
2. Kiểm tra logs trên MongoDB Atlas: Database → Metrics
3. Xem file `HUONG_DAN_SUA_LOI_DB.md` để troubleshoot chi tiết
