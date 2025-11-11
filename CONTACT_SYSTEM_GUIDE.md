# Hệ thống Quản lý Yêu cầu Liên hệ

## Tổng quan

Hệ thống quản lý yêu cầu liên hệ cho phép SUPER_ADMIN xem và xử lý các yêu cầu liên hệ từ người dùng có tài khoản không hoạt động (INACTIVE status).

## Tính năng chính

### 1. Gửi yêu cầu liên hệ (User có tài khoản INACTIVE)
- User có tài khoản INACTIVE có thể truy cập trang `/student/contact`
- Gửi yêu cầu liên hệ với thông tin:
  - Tiêu đề
  - Nội dung tin nhắn
  - Thông tin người gửi (tự động điền)

### 2. Quản lý yêu cầu liên hệ (SUPER_ADMIN)
- Truy cập trang `/admin/contact-requests`
- Xem danh sách tất cả yêu cầu liên hệ
- Lọc theo trạng thái và mức độ ưu tiên
- Cập nhật trạng thái và thêm ghi chú admin

## Cấu trúc dữ liệu

### ContactRequest Model
```typescript
interface ContactRequest {
  _id: string;
  userId: string;
  userName: string;
  userEmail: string;
  subject: string;
  message: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  adminNotes?: string;
  resolvedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

## API Endpoints

### 1. Tạo yêu cầu liên hệ
```
POST /api/contact
Authorization: Bearer <token>
Content-Type: application/json

{
  "subject": "Tiêu đề yêu cầu",
  "message": "Nội dung tin nhắn"
}
```

### 2. Lấy danh sách yêu cầu liên hệ (Admin)
```
GET /api/contact?status=PENDING&priority=HIGH&page=1&limit=10
Authorization: Bearer <admin_token>
```

### 3. Cập nhật yêu cầu liên hệ (Admin)
```
PATCH /api/contact/[id]
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "status": "IN_PROGRESS",
  "priority": "HIGH",
  "adminNotes": "Ghi chú của admin"
}
```

## Trạng thái yêu cầu

- **PENDING**: Chờ xử lý
- **IN_PROGRESS**: Đang xử lý
- **RESOLVED**: Đã giải quyết
- **CLOSED**: Đã đóng

## Mức độ ưu tiên

- **LOW**: Thấp (phản hồi trong 24h)
- **MEDIUM**: Trung bình (phản hồi trong 12h)
- **HIGH**: Cao (phản hồi trong 4h)
- **URGENT**: Khẩn cấp (phản hồi ngay lập tức)

## Hướng dẫn sử dụng

### Cho SUPER_ADMIN

1. **Truy cập trang quản lý**:
   - Đăng nhập với tài khoản SUPER_ADMIN
   - Vào menu "Yêu cầu liên hệ" trong AdminNav
   - Hoặc truy cập trực tiếp `/admin/contact-requests`

2. **Xem danh sách yêu cầu**:
   - Xem thống kê tổng quan ở đầu trang
   - Sử dụng bộ lọc để tìm kiếm theo trạng thái/mức độ
   - Phân trang để xem nhiều yêu cầu

3. **Xử lý yêu cầu**:
   - Click "Xem chi tiết" để xem đầy đủ thông tin
   - Cập nhật trạng thái: PENDING → IN_PROGRESS → RESOLVED/CLOSED
   - Thêm ghi chú admin để ghi lại quá trình xử lý
   - Điều chỉnh mức độ ưu tiên nếu cần

4. **Theo dõi tiến độ**:
   - Xem thống kê theo trạng thái
   - Kiểm tra yêu cầu đã được xử lý bởi ai và khi nào

### Cho User có tài khoản INACTIVE

1. **Truy cập trang liên hệ**:
   - Đăng nhập với tài khoản INACTIVE
   - Vào menu "Liên hệ admin" trong StudentNav
   - Hoặc truy cập trực tiếp `/student/contact`

2. **Gửi yêu cầu**:
   - Điền tiêu đề và nội dung tin nhắn
   - Chọn mức độ ưu tiên phù hợp
   - Click "Gửi tin nhắn"

3. **Theo dõi phản hồi**:
   - Yêu cầu sẽ được admin xem xét và xử lý
   - Admin có thể liên hệ trực tiếp qua email/điện thoại

## Seed dữ liệu mẫu

Để tạo dữ liệu mẫu cho testing:

```bash
node scripts/seedContactRequests.js
```

Script này sẽ tạo 6 yêu cầu liên hệ mẫu với các trạng thái khác nhau.

## Bảo mật

- Chỉ SUPER_ADMIN và ADMIN mới có thể xem và quản lý yêu cầu liên hệ
- User chỉ có thể gửi yêu cầu khi đã đăng nhập
- Tất cả API calls đều yêu cầu authentication token
- Validation đầy đủ cho input data

## Tích hợp với hệ thống hiện tại

- Tự động hiển thị warning banner cho tài khoản INACTIVE
- Menu "Liên hệ admin" chỉ hiển thị cho tài khoản INACTIVE
- Redirect logic đã được cập nhật để cho phép truy cập trang contact
- Tích hợp với hệ thống authentication và authorization hiện có

## Troubleshooting

### Lỗi thường gặp

1. **Không thể gửi yêu cầu**:
   - Kiểm tra token authentication
   - Đảm bảo tài khoản có quyền truy cập

2. **Không thấy yêu cầu mới**:
   - Refresh trang admin
   - Kiểm tra bộ lọc trạng thái

3. **Lỗi API**:
   - Kiểm tra console log
   - Đảm bảo MongoDB connection

### Debug

- Sử dụng browser developer tools để xem network requests
- Kiểm tra server logs để debug API errors
- Sử dụng MongoDB Compass để xem dữ liệu trực tiếp
