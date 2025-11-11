# Hướng Dẫn Migration Vai Trò Hệ Thống

## 🎯 Tổng Quan

Hệ thống đã được cập nhật từ 3 vai trò cơ bản sang 5 vai trò chi tiết hơn để phù hợp với cấu trúc CLB Sinh viên 5 Tốt TDMU.

## 🔄 Mapping Vai Trò

### Vai Trò Cũ → Vai Trò Mới
- `ADMIN` → `SUPER_ADMIN` (Quản Trị Hệ Thống)
- `OFFICER` → `CLUB_MEMBER` (Ủy Viên BCH)
- `STUDENT` → `CLUB_STUDENT` (Thành Viên CLB)

### Vai Trò Mới Hoàn Toàn
- `CLUB_LEADER` (Chủ Nhiệm CLB)
- `CLUB_DEPUTY` (Phó Chủ Nhiệm)

## 🚀 Cách Thực Hiện Migration

### 1. Chạy Script Migration
```bash
npm run migrate-roles
```

### 2. Kiểm Tra Kết Quả
Script sẽ hiển thị:
- Số lượng user được migrate
- Chi tiết từng user được cập nhật
- Số lượng user bị bỏ qua

### 3. Cập Nhật Thủ Công (Nếu Cần)
Sau khi chạy migration, bạn có thể cập nhật thủ công:
- Chủ nhiệm CLB: `CLUB_LEADER`
- Phó chủ nhiệm: `CLUB_DEPUTY`

## 📊 Cấu Trúc Quyền Hạn

### SUPER_ADMIN (Quản Trị Hệ Thống)
- Quản lý toàn bộ hệ thống
- Quản lý thành viên
- Quản lý hoạt động
- Xem báo cáo
- Quản lý tiêu chí

### CLUB_LEADER (Chủ Nhiệm CLB)
- Quản lý thành viên
- Quản lý hoạt động
- Xem báo cáo
- Quản lý tiêu chí

### CLUB_DEPUTY (Phó Chủ Nhiệm)
- Quản lý hoạt động
- Xem báo cáo

### CLUB_MEMBER (Ủy Viên BCH)
- Quản lý hoạt động
- Xem báo cáo

### CLUB_STUDENT (Thành Viên CLB)
- Đăng ký hoạt động
- Xem thông tin cá nhân

## 🔧 Cập Nhật Code

### 1. User Model
```typescript
export type UserRole = 'SUPER_ADMIN' | 'CLUB_LEADER' | 'CLUB_DEPUTY' | 'CLUB_MEMBER' | 'CLUB_STUDENT';
```

### 2. useAuth Hook
```typescript
const hasRole = (requiredRole: UserRole): boolean => {
  const roleHierarchy = {
    'CLUB_STUDENT': 1,
    'CLUB_MEMBER': 2,
    'CLUB_DEPUTY': 3,
    'CLUB_LEADER': 4,
    'SUPER_ADMIN': 5
  };
  // ...
};
```

### 3. ProtectedRoute
```typescript
<ProtectedRoute requiredRole="SUPER_ADMIN">
  {/* Content */}
</ProtectedRoute>
```

## 🎨 Hiển Thị Giao Diện

### Badge Màu Sắc
- **SUPER_ADMIN**: Purple (Quản Trị Hệ Thống)
- **CLUB_LEADER**: Red (Chủ Nhiệm CLB)
- **CLUB_DEPUTY**: Orange (Phó Chủ Nhiệm)
- **CLUB_MEMBER**: Blue (Ủy Viên BCH)
- **CLUB_STUDENT**: Gray (Thành Viên CLB)

### Stats Cards
- Tổng thành viên
- Quản Trị Hệ Thống
- Chủ Nhiệm CLB
- Phó Chủ Nhiệm
- Ủy Viên BCH
- Thành Viên CLB
- Đã bị xóa

## ⚠️ Lưu Ý Quan Trọng

1. **Backup Database**: Luôn backup database trước khi chạy migration
2. **Test Environment**: Test trên môi trường dev trước khi áp dụng production
3. **Rollback Plan**: Chuẩn bị kế hoạch rollback nếu có vấn đề
4. **User Notification**: Thông báo cho user về thay đổi vai trò

## 🔍 Kiểm Tra Sau Migration

1. Đăng nhập với các tài khoản khác nhau
2. Kiểm tra quyền truy cập các trang
3. Kiểm tra hiển thị vai trò trong giao diện
4. Test các chức năng quản lý

## 📞 Hỗ Trợ

Nếu gặp vấn đề trong quá trình migration, vui lòng:
1. Kiểm tra logs của script migration
2. Verify database connection
3. Kiểm tra quyền truy cập database
4. Contact development team
