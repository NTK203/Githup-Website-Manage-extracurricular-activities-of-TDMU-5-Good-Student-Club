# 📤 Hướng Dẫn Import Dữ Liệu Lên MongoDB Atlas

## 📋 Tổng Quan

Có 3 cách chính để đưa dữ liệu lên MongoDB Atlas:
1. **MongoDB Compass** (GUI - Dễ nhất, khuyến nghị)
2. **mongodump/mongorestore** (Command line)
3. **Import từ file JSON/CSV** (Cho dữ liệu nhỏ)

---

## 🎯 PHƯƠNG PHÁP 1: MongoDB Compass (Khuyên Dùng)

### Bước 1: Tải MongoDB Compass

1. **Tải Compass:**
   - Vào: https://www.mongodb.com/try/download/compass
   - Chọn hệ điều hành của bạn (Windows/Mac/Linux)
   - Download và cài đặt

### Bước 2: Kết nối với Database nguồn (Local hoặc Database cũ)

1. **Mở MongoDB Compass**
2. **Kết nối:**
   - Nếu database local: `mongodb://localhost:27017`
   - Nếu database khác: Nhập connection string
3. Click "Connect"

### Bước 3: Export dữ liệu từ database nguồn

1. **Chọn database** bạn muốn export (ví dụ: `db-sv5tot-tdmu`)
2. **Với mỗi collection:**
   - Click vào collection (ví dụ: `users`, `activities`, `memberships`)
   - Click nút **"Export Collection"** (icon download)
   - Chọn format: **JSON** hoặc **CSV**
   - Chọn nơi lưu file
   - Click "Export"
3. **Lặp lại** cho tất cả collections cần export

### Bước 4: Kết nối với MongoDB Atlas

1. **Trong MongoDB Atlas:**
   - Vào Database → Clusters
   - Click "Connect" trên cluster
   - Chọn "Compass"
   - Copy connection string

2. **Trong MongoDB Compass:**
   - Click "New Connection"
   - Dán connection string
   - Thay `<password>` bằng password của bạn
   - Click "Connect"

### Bước 5: Import dữ liệu vào Atlas

1. **Chọn database** trên Atlas (hoặc tạo mới)
2. **Với mỗi collection:**
   - Click vào collection (hoặc tạo mới nếu chưa có)
   - Click nút **"Add Data"** → **"Import File"**
   - Chọn file JSON/CSV đã export ở Bước 3
   - Chọn import options:
     - **Input File Type:** JSON hoặc CSV
     - **Import Mode:** Insert Documents (hoặc Replace nếu muốn ghi đè)
   - Click "Import"

---

## 💻 PHƯƠNG PHÁP 2: mongodump/mongorestore (Command Line)

### Bước 1: Cài đặt MongoDB Database Tools

1. **Tải MongoDB Database Tools:**
   - Windows: https://www.mongodb.com/try/download/database-tools
   - Mac: `brew install mongodb-database-tools`
   - Linux: Tải từ MongoDB website

### Bước 2: Export từ database nguồn

Mở terminal/command prompt và chạy:

```bash
mongodump --uri="mongodb://localhost:27017" --db=db-sv5tot-tdmu --out=./backup
```

Hoặc nếu database ở xa:
```bash
mongodump --uri="mongodb+srv://username:password@old-cluster.mongodb.net/db-sv5tot-tdmu" --out=./backup
```

### Bước 3: Import vào MongoDB Atlas

```bash
mongorestore --uri="mongodb+srv://clbsv5t:Kimthinh2003@cluster0.bimz8kh.mongodb.net/db-sv5tot-tdmu?appName=Cluster0" ./backup/db-sv5tot-tdmu
```

**Lưu ý:** Thay connection string bằng connection string của bạn.

---

## 📄 PHƯƠNG PHÁP 3: Import từ file JSON/CSV (Dữ liệu nhỏ)

### Bước 1: Chuẩn bị file dữ liệu

1. **Export dữ liệu** thành file JSON hoặc CSV
2. **Format JSON** phải đúng:
   ```json
   [
     {"_id": "123", "name": "User 1", "email": "user1@example.com"},
     {"_id": "456", "name": "User 2", "email": "user2@example.com"}
   ]
   ```

### Bước 2: Import qua MongoDB Compass

1. **Kết nối với Atlas** (như Phương pháp 1, Bước 4)
2. **Chọn collection** (hoặc tạo mới)
3. **Click "Add Data" → "Import File"**
4. **Chọn file JSON/CSV**
5. **Click "Import"**

### Bước 3: Hoặc dùng mongoimport (Command line)

```bash
mongoimport --uri="mongodb+srv://clbsv5t:Kimthinh2003@cluster0.bimz8kh.mongodb.net/db-sv5tot-tdmu?appName=Cluster0" --collection=users --file=users.json --jsonArray
```

---

## 🚀 PHƯƠNG PHÁP 4: Sử dụng MongoDB Atlas Data Import (Nếu có dữ liệu sẵn)

### Nếu bạn có file backup hoặc dữ liệu từ nguồn khác:

1. **Vào MongoDB Atlas:**
   - Database → Clusters → Click vào cluster
   - Tìm "Collections" hoặc "Browse Collections"

2. **Tạo collection mới:**
   - Click "Browse Collections"
   - Click "Create Database"
   - Đặt tên database: `db-sv5tot-tdmu`
   - Đặt tên collection (ví dụ: `users`)

3. **Import dữ liệu:**
   - Click vào collection
   - Click "Insert Document"
   - Paste JSON data hoặc import file

---

## 📋 CHECKLIST TRƯỚC KHI IMPORT

- [ ] Đã kết nối với MongoDB Atlas thành công
- [ ] Đã tạo database trên Atlas (hoặc sẽ tự tạo khi import)
- [ ] Đã export tất cả collections từ database nguồn
- [ ] Đã kiểm tra format dữ liệu (JSON đúng cú pháp)
- [ ] Đã backup database nguồn (phòng trường hợp cần)

---

## ⚠️ LƯU Ý QUAN TRỌNG

1. **Kiểm tra dữ liệu trước khi import:**
   - Đảm bảo không có dữ liệu trùng lặp
   - Kiểm tra format JSON đúng

2. **Indexes:**
   - Sau khi import, có thể cần tạo lại indexes
   - Vào MongoDB Atlas → Collections → Indexes

3. **Validation:**
   - Kiểm tra số lượng documents sau khi import
   - So sánh với database nguồn

4. **Performance:**
   - Import từng collection một nếu dữ liệu lớn
   - Đợi import xong trước khi import collection tiếp theo

---

## 🔧 TROUBLESHOOTING

### Lỗi: "Authentication failed"

**Nguyên nhân:** Sai username/password trong connection string

**Giải pháp:**
- Kiểm tra lại username/password
- Đảm bảo user có quyền read/write

### Lỗi: "Connection timeout"

**Nguyên nhân:** Network Access chưa được cấu hình

**Giải pháp:**
- Vào MongoDB Atlas → Network Access
- Thêm IP `0.0.0.0/0`
- Đợi 1-2 phút

### Lỗi: "Invalid JSON"

**Nguyên nhân:** File JSON không đúng format

**Giải pháp:**
- Kiểm tra lại file JSON
- Sử dụng JSON validator online
- Đảm bảo có `[]` cho array hoặc `{}` cho object

---

## 💡 MẸO

1. **Test với dữ liệu nhỏ trước:**
   - Import 1-2 documents để test
   - Nếu thành công, import toàn bộ

2. **Sử dụng MongoDB Compass:**
   - Dễ sử dụng nhất
   - Có thể xem dữ liệu trực tiếp
   - Hỗ trợ import/export tốt

3. **Backup trước khi import:**
   - Luôn backup database nguồn
   - Phòng trường hợp cần rollback

---

## 📞 SAU KHI IMPORT XONG

1. **Kiểm tra dữ liệu:**
   - Vào MongoDB Atlas → Collections
   - Xem số lượng documents
   - Kiểm tra một vài documents

2. **Test ứng dụng:**
   - Kiểm tra website có load được dữ liệu không
   - Test các chức năng chính

3. **Cập nhật connection string:**
   - Đảm bảo ứng dụng đang dùng connection string của Atlas
   - Redeploy trên Vercel nếu cần
