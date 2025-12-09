# Hướng Dẫn Deploy Website Lên Hosting

## Tổng Quan
Website này là Next.js 15 với MongoDB, Cloudinary, và JWT Authentication. Dưới đây là các phương án deploy phù hợp.

---

## 🚀 Phương Án 1: Vercel (Khuyên Dùng - Dễ Nhất)

Vercel là nền tảng được tạo bởi team Next.js, rất phù hợp cho Next.js apps.

### Bước 1: Chuẩn bị
1. Đăng ký tài khoản tại [vercel.com](https://vercel.com) (có thể dùng GitHub account)
2. Cài đặt Vercel CLI (tùy chọn):
   ```bash
   npm i -g vercel
   ```

### Bước 2: Deploy qua GitHub (Khuyên dùng)
1. **Push code lên GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/username/repo-name.git
   git push -u origin main
   ```

2. **Kết nối với Vercel:**
   - Vào [vercel.com/new](https://vercel.com/new)
   - Chọn "Import Git Repository"
   - Chọn repository của bạn
   - Vercel sẽ tự động detect Next.js

3. **Cấu hình Environment Variables:**
   Trong Vercel Dashboard → Project Settings → Environment Variables, thêm:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/db-sv5tot-tdmu
   JWT_SECRET=your-super-secret-jwt-key-here
   CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
   NEXT_PUBLIC_BASE_URL=https://your-app.vercel.app
   ```

4. **Deploy:**
   - Click "Deploy"
   - Vercel sẽ tự động build và deploy
   - Website sẽ có URL dạng: `https://your-app.vercel.app`

### Bước 3: Cấu hình MongoDB Atlas (Cloud Database)
1. Đăng ký tại [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Tạo cluster miễn phí
3. Tạo database user
4. Whitelist IP: `0.0.0.0/0` (cho phép tất cả IP)
5. Lấy connection string và thêm vào Vercel env variables

### Bước 4: Cấu hình Domain (Tùy chọn)
- Vercel cho phép thêm custom domain miễn phí
- Vào Project Settings → Domains
- Thêm domain của bạn

---

## 🌐 Phương Án 2: Railway

Railway hỗ trợ cả Next.js và MongoDB trên cùng một platform.

### Bước 1: Đăng ký
- Vào [railway.app](https://railway.app)
- Đăng nhập bằng GitHub

### Bước 2: Tạo Project
1. Click "New Project"
2. Chọn "Deploy from GitHub repo"
3. Chọn repository của bạn

### Bước 3: Thêm MongoDB
1. Trong project, click "New"
2. Chọn "Database" → "MongoDB"
3. Railway sẽ tự động tạo MongoDB instance

### Bước 4: Cấu hình Environment Variables
Trong project settings, thêm:
```
MONGODB_URI=${{MongoDB.MONGO_URL}}  (Railway tự động inject)
JWT_SECRET=your-secret-key
CLOUDINARY_URL=cloudinary://...
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
NEXT_PUBLIC_BASE_URL=https://your-app.railway.app
```

---

## ☁️ Phương Án 3: Render

### Bước 1: Đăng ký tại [render.com](https://render.com)

### Bước 2: Tạo Web Service
1. Chọn "New" → "Web Service"
2. Kết nối GitHub repository
3. Cấu hình:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Environment:** Node

### Bước 3: Thêm MongoDB
1. Tạo "MongoDB" service riêng
2. Lấy connection string và thêm vào Web Service env variables

---

## 🔧 Phương Án 4: VPS (VPS Việt Nam như Hostinger, Viettel IDC, etc.)

Nếu bạn muốn tự quản lý server:

### Yêu cầu:
- VPS với Ubuntu 20.04+
- Node.js 18+
- PM2 (process manager)
- Nginx (reverse proxy)

### Các bước:

1. **Cài đặt Node.js:**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

2. **Cài đặt PM2:**
   ```bash
   sudo npm install -g pm2
   ```

3. **Clone và build project:**
   ```bash
   git clone https://github.com/username/repo-name.git
   cd repo-name
   npm install
   npm run build
   ```

4. **Tạo file .env:**
   ```bash
   nano .env.local
   ```
   Thêm các biến môi trường cần thiết

5. **Chạy với PM2:**
   ```bash
   pm2 start npm --name "sv5tot-tdmu" -- start
   pm2 save
   pm2 startup
   ```

6. **Cài đặt Nginx:**
   ```bash
   sudo apt install nginx
   ```

7. **Cấu hình Nginx:**
   ```bash
   sudo nano /etc/nginx/sites-available/default
   ```
   
   Thêm config:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

8. **Khởi động Nginx:**
   ```bash
   sudo nginx -t
   sudo systemctl restart nginx
   ```

9. **Cài đặt MongoDB trên VPS:**
   ```bash
   sudo apt install mongodb
   sudo systemctl start mongodb
   sudo systemctl enable mongodb
   ```

---

## 📋 Checklist Trước Khi Deploy

### 1. Kiểm tra Environment Variables
Đảm bảo tất cả các biến sau đã được cấu hình:
- ✅ `MONGODB_URI` - Connection string đến MongoDB
- ✅ `JWT_SECRET` - Secret key cho JWT (nên dùng random string dài)
- ✅ `CLOUDINARY_URL` - Cloudinary credentials
- ✅ `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name
- ✅ `NEXT_PUBLIC_BASE_URL` - URL của website sau khi deploy

### 2. Kiểm tra Code
- ✅ Không có hardcoded secrets trong code
- ✅ Tất cả API routes đã được test
- ✅ Database models đã được migrate

### 3. Build Test
Chạy build local để đảm bảo không có lỗi:
```bash
npm run build
npm start
```

### 4. Security
- ✅ JWT_SECRET phải là random string mạnh
- ✅ MongoDB connection string không được commit lên Git
- ✅ Cloudinary credentials được bảo mật

---

## 🎯 Khuyến Nghị

**Cho người mới bắt đầu:** Dùng **Vercel** vì:
- ✅ Miễn phí cho personal projects
- ✅ Tự động build và deploy
- ✅ Hỗ trợ Next.js tốt nhất
- ✅ SSL tự động
- ✅ Dễ cấu hình

**Nếu cần MongoDB trên cùng platform:** Dùng **Railway**

**Nếu cần kiểm soát hoàn toàn:** Dùng **VPS**

---

## 🔗 Tài Liệu Tham Khảo

- [Next.js Deployment Docs](https://nextjs.org/docs/app/building-your-application/deploying)
- [Vercel Documentation](https://vercel.com/docs)
- [Railway Documentation](https://docs.railway.app)
- [MongoDB Atlas Setup](https://www.mongodb.com/docs/atlas/getting-started/)

---

## ❓ Troubleshooting

### Lỗi Build Failed
- Kiểm tra log trong dashboard
- Đảm bảo tất cả dependencies đã được install
- Kiểm tra TypeScript errors: `npm run lint`

### Lỗi Database Connection
- Kiểm tra MongoDB URI đúng format
- Đảm bảo IP whitelist đã được cấu hình (cho MongoDB Atlas)
- Kiểm tra network connectivity

### Lỗi Environment Variables
- Đảm bảo tất cả biến đã được thêm vào hosting platform
- Kiểm tra tên biến chính xác (case-sensitive)
- Restart deployment sau khi thêm env variables

### Lỗi "A Git Repository cannot be connected to more than 10 Projects"
**Nguyên nhân:** Vercel giới hạn một Git repository chỉ có thể kết nối với tối đa 10 projects.

**Giải pháp:**
1. **Xóa projects cũ (Khuyên dùng):**
   - Vào Vercel Dashboard → Settings → Delete Project
   - Xóa các projects không dùng đến
   - Kết nối lại repository

2. **Tạo repository mới:**
   ```bash
   git remote remove origin
   git remote add origin https://github.com/username/new-repo-name.git
   git push -u origin main
   ```
   Sau đó kết nối repository mới với Vercel

3. **Deploy bằng Vercel CLI (không cần kết nối Git):**
   ```bash
   npm i -g vercel
   cd your-project
   vercel
   ```
   Làm theo hướng dẫn trong terminal

4. **Fork repository:**
   - Fork repository trên GitHub
   - Kết nối fork với Vercel

---

Chúc bạn deploy thành công! 🎉
