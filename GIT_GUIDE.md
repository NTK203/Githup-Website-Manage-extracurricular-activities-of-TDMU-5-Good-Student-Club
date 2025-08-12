# 🚀 HƯỚNG DẪN PUSH CODE LÊN GITHUB

## 📋 **CÁC BƯỚC THỰC HIỆN**

### **1. KIỂM TRA TRẠNG THÁI HIỆN TẠI**
```bash
# Xem files nào đã thay đổi
git status

# Xem lịch sử commit
git log --oneline
```

### **2. THÊM FILES VÀO STAGING AREA**
```bash
# Thêm tất cả files đã thay đổi
git add .

# Hoặc thêm từng file cụ thể
git add src/app/page.tsx
git add src/components/TestResults.tsx
```

### **3. COMMIT CHANGES (Lưu thay đổi)**
```bash
# Commit với message mô tả thay đổi
git commit -m "✨ Thêm tính năng authentication system"

# Các ví dụ message khác:
git commit -m "🐛 Sửa lỗi login không hoạt động"
git commit -m "📱 Thêm responsive design cho mobile"
git commit -m "🔧 Cập nhật database schema"
git commit -m "🎨 Cải thiện UI/UX"
```

### **4. PUSH LÊN GITHUB**
```bash
# Push lên branch main
git push origin main

# Hoặc push và set upstream (lần đầu)
git push -u origin main
```

## 📝 **QUY TẮC VIẾT COMMIT MESSAGE**

### **Emoji và Ý nghĩa:**
- ✨ `feat:` Tính năng mới
- 🐛 `fix:` Sửa lỗi
- 📝 `docs:` Cập nhật tài liệu
- 🎨 `style:` Cải thiện giao diện
- 🔧 `refactor:` Tái cấu trúc code
- ⚡ `perf:` Cải thiện hiệu suất
- 🧪 `test:` Thêm test
- 🚀 `deploy:` Deploy

### **Ví dụ commit messages tốt:**
```bash
git commit -m "✨ feat: Thêm hệ thống đăng nhập/đăng ký"
git commit -m "🐛 fix: Sửa lỗi không load được ảnh từ Cloudinary"
git commit -m "📝 docs: Cập nhật README với hướng dẫn setup"
git commit -m "🎨 style: Cải thiện giao diện trang chủ"
git commit -m "🔧 refactor: Tái cấu trúc API routes"
```

## 🔄 **WORKFLOW HOÀN CHỈNH**

### **Khi có thay đổi code:**
```bash
# 1. Kiểm tra thay đổi
git status

# 2. Thêm files
git add .

# 3. Commit với message rõ ràng
git commit -m "✨ feat: Thêm tính năng upload file"

# 4. Push lên GitHub
git push origin main
```

### **Khi làm việc nhóm:**
```bash
# 1. Pull code mới nhất
git pull origin main

# 2. Làm thay đổi của bạn
# ... code code code ...

# 3. Thêm và commit
git add .
git commit -m "✨ feat: Thêm tính năng mới"

# 4. Push
git push origin main
```

## 🛠️ **CÁC LỆNH HỮU ÍCH KHÁC**

### **Xem thông tin:**
```bash
# Xem branch hiện tại
git branch

# Xem remote repositories
git remote -v

# Xem lịch sử commit
git log --oneline -10
```

### **Quản lý branch:**
```bash
# Tạo branch mới
git checkout -b feature/new-feature

# Chuyển branch
git checkout main

# Xóa branch
git branch -d feature/old-feature
```

### **Hoàn tác thay đổi:**
```bash
# Hoàn tác file chưa add
git checkout -- filename

# Hoàn tác file đã add
git reset HEAD filename

# Hoàn tác commit cuối
git reset --soft HEAD~1
```

## ⚠️ **LƯU Ý QUAN TRỌNG**

### **1. Bảo mật:**
- ✅ **LUÔN** kiểm tra `.env.local` không được commit
- ✅ **KHÔNG** commit passwords, API keys
- ✅ Sử dụng `.env.example` làm mẫu

### **2. Commit thường xuyên:**
- ✅ Commit mỗi khi hoàn thành tính năng nhỏ
- ✅ Viết message rõ ràng, mô tả thay đổi
- ✅ Không commit code chưa hoàn thiện

### **3. Pull trước khi push:**
- ✅ Luôn `git pull` trước khi push
- ✅ Giải quyết conflict nếu có

## 🚨 **XỬ LÝ LỖI THƯỜNG GẶP**

### **Lỗi permission (403):**
```bash
# Tạo Personal Access Token trên GitHub
# Settings → Developer settings → Personal access tokens
git remote set-url origin https://YOUR_TOKEN@github.com/username/repo.git
```

### **Lỗi conflict:**
```bash
# Pull code mới nhất
git pull origin main

# Giải quyết conflict trong code editor
# Sau đó add và commit
git add .
git commit -m "🔧 resolve: Giải quyết conflict"
```

### **Lỗi branch không tồn tại:**
```bash
# Tạo và chuyển sang branch main
git branch -M main
git push -u origin main
```

## 📞 **LIÊN HỆ HỖ TRỢ**

Nếu gặp vấn đề, hãy:
1. Kiểm tra lại các bước trên
2. Xem error message chi tiết
3. Tìm kiếm trên Google với error message
4. Hỏi team hoặc mentor

---

**🎯 Mục tiêu: Commit thường xuyên, message rõ ràng, code an toàn!**
