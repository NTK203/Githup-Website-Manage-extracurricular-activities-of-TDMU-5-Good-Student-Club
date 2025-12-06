# Sơ đồ ERD - Hệ thống Quản lý CLB Sinh viên 5 Tốt TDMU

## Tổng quan
Hệ thống quản lý hoạt động và thành viên của CLB Sinh viên 5 Tốt TDMU sử dụng MongoDB (NoSQL) với Mongoose ODM.

---

## Các Entity (Collection)

### 1. **User** (users)
**Mô tả:** Quản lý thông tin người dùng trong hệ thống

**Thuộc tính:**
- `_id` (ObjectId, PK)
- `studentId` (String, Unique, Required) - Mã số sinh viên (13 chữ số) hoặc admin ID
- `name` (String, Required) - Họ và tên
- `email` (String, Unique, Required) - Email
- `passwordHash` (String, Optional) - Mật khẩu đã hash
- `googleId` (String, Unique, Sparse, Optional) - ID từ Google OAuth
- `role` (Enum, Required) - Vai trò: `SUPER_ADMIN`, `ADMIN`, `CLUB_LEADER`, `CLUB_DEPUTY`, `CLUB_MEMBER`, `CLUB_STUDENT`, `STUDENT`
- `phone` (String, Optional) - Số điện thoại
- `class` (String, Optional) - Lớp
- `faculty` (String, Optional) - Khoa/Viện
- `position` (String, Optional) - Chức vụ
- `department` (String, Optional) - Phòng ban
- `isClubMember` (Boolean, Default: false) - Là thành viên CLB
- `avatarUrl` (String, Optional) - URL ảnh đại diện
- `resetPasswordToken` (String, Optional) - Token đặt lại mật khẩu
- `resetPasswordExpires` (Date, Optional) - Thời hạn token
- `createdAt` (Date, Auto)
- `updatedAt` (Date, Auto)

**Indexes:**
- `studentId`, `email`, `googleId`, `role`, `faculty`, `class`, `isClubMember`

---

### 2. **Activity** (activities)
**Mô tả:** Quản lý các hoạt động của CLB

**Thuộc tính:**
- `_id` (ObjectId, PK)
- `name` (String, Required) - Tên hoạt động
- `description` (String, Required) - Mô tả
- `date` (Date, Optional) - Ngày diễn ra (cho single_day)
- `location` (String, Required) - Địa điểm
- `locationData` (Object, Optional) - Tọa độ GPS:
  - `lat` (Number)
  - `lng` (Number)
  - `address` (String)
  - `radius` (Number, Default: 100m)
- `multiTimeLocations` (Array, Optional) - Địa điểm theo buổi (morning/afternoon/evening)
- `maxParticipants` (Number, Optional) - Số lượng tối đa
- `visibility` (Enum, Required) - `public` | `private`
- `responsiblePerson` (ObjectId, FK → User, Required) - Người phụ trách
- `status` (Enum, Required) - `draft`, `published`, `ongoing`, `completed`, `cancelled`, `postponed`
- `type` (Enum, Required) - `single_day` | `multiple_days`
- `imageUrl` (String, Optional) - URL ảnh
- `overview` (String, Optional) - Tổng quan
- `timeSlots` (Array, Required cho single_day) - Các buổi trong ngày:
  - `id` (String)
  - `name` (Enum: 'Buổi Sáng', 'Buổi Chiều', 'Buổi Tối')
  - `startTime` (String, HH:MM)
  - `endTime` (String, HH:MM)
  - `isActive` (Boolean)
  - `activities` (String)
  - `detailedLocation` (String, Optional)
- `startDate` (Date, Required cho multiple_days)
- `endDate` (Date, Required cho multiple_days)
- `schedule` (Array, Required cho multiple_days) - Lịch trình:
  - `day` (Number)
  - `date` (Date)
  - `activities` (String)
- `participants` (Array, Default: []) - Danh sách người tham gia (Embedded):
  - `userId` (ObjectId, FK → User, Required)
  - `name` (String, Required)
  - `email` (String, Required)
  - `role` (Enum, Required) - 'Trưởng Nhóm', 'Phó Trưởng Nhóm', 'Thành Viên Ban Tổ Chức', 'Người Tham Gia', 'Người Giám Sát'
  - `joinedAt` (Date, Default: now)
  - `approvalStatus` (Enum, Default: 'pending') - `pending`, `approved`, `rejected`
  - `approvedBy` (ObjectId, FK → User, Optional)
  - `approvedAt` (Date, Optional)
  - `rejectedBy` (ObjectId, FK → User, Optional)
  - `rejectedAt` (Date, Optional)
  - `rejectionReason` (String, Optional)
  - `checkedIn` (Boolean, Default: false)
  - `checkedInAt` (Date, Optional)
  - `checkedInBy` (ObjectId, FK → User, Optional)
  - `checkInLocation` (Object, Optional) - {lat, lng, address}
  - `checkInPhoto` (String, Optional)
- `createdBy` (ObjectId, FK → User, Required)
- `updatedBy` (ObjectId, FK → User, Required)
- `createdAt` (Date, Auto)
- `updatedAt` (Date, Auto)

**Indexes:**
- `status`, `visibility`, `date`, `type`, `createdBy`, `responsiblePerson`, `participants.userId`

---

### 3. **Attendance** (attendances)
**Mô tả:** Quản lý điểm danh chi tiết cho từng hoạt động

**Thuộc tính:**
- `_id` (ObjectId, PK)
- `activityId` (ObjectId, FK → Activity, Required) - ID hoạt động
- `userId` (ObjectId, FK → User, Required) - ID sinh viên
- `studentName` (String, Required) - Tên sinh viên
- `studentEmail` (String, Required) - Email sinh viên
- `studentId` (String, Optional) - Mã sinh viên
- `attendances` (Array, Default: []) - Danh sách điểm danh (Embedded):
  - `_id` (ObjectId)
  - `timeSlot` (String, Required) - 'Buổi Sáng', 'Buổi Chiều', 'Buổi Tối', hoặc 'Ngày X - Buổi Y'
  - `checkInType` (Enum, Required) - `start` (đầu buổi) | `end` (cuối buổi)
  - `checkInTime` (Date, Required) - Thời gian điểm danh
  - `location` (Object, Required):
    - `lat` (Number)
    - `lng` (Number)
    - `address` (String, Optional)
  - `photoUrl` (String, Optional) - URL ảnh điểm danh
  - `status` (Enum, Required, Default: 'pending') - `pending`, `approved`, `rejected`
  - `verifiedBy` (ObjectId, FK → User, Optional) - Người duyệt
  - `verifiedAt` (Date, Optional) - Thời gian duyệt
  - `verificationNote` (String, Optional) - Ghi chú duyệt
  - `cancelReason` (String, Optional) - Lý do hủy
  - `lateReason` (String, Optional) - Lý do trễ
  - `createdAt` (Date, Auto)
  - `updatedAt` (Date, Auto)
- `createdAt` (Date, Auto)
- `updatedAt` (Date, Auto)

**Indexes:**
- Unique: `(activityId, userId)` - Mỗi sinh viên chỉ có 1 document cho mỗi activity
- `activityId`, `userId`

---

### 4. **Membership** (memberships)
**Mô tả:** Quản lý đăng ký và trạng thái thành viên CLB

**Thuộc tính:**
- `_id` (ObjectId, PK)
- `userId` (ObjectId, FK → User, Required, Unique cho ACTIVE) - ID người dùng
- `status` (Enum, Required, Default: 'PENDING') - `PENDING`, `ACTIVE`, `REJECTED`, `INACTIVE`, `REMOVED`
- `joinedAt` (Date, Required, Default: now) - Ngày đăng ký
- `approvedBy` (ObjectId, FK → User, Optional) - Người duyệt
- `approvedAt` (Date, Optional) - Thời gian duyệt
- `rejectedBy` (ObjectId, FK → User, Optional) - Người từ chối
- `rejectedAt` (Date, Optional) - Thời gian từ chối
- `rejectionReason` (String, Optional) - Lý do từ chối
- `removedBy` (Object, Optional) - Người xóa:
  - `_id` (ObjectId)
  - `name` (String)
  - `studentId` (String)
- `removedAt` (Date, Optional) - Thời gian xóa
- `removalReason` (String, Optional) - Lý do xóa
- `removalReasonTrue` (String, Optional) - Lý do xóa hiện tại
- `motivation` (String, Optional) - Động lực đăng ký
- `experience` (String, Optional) - Kinh nghiệm
- `expectations` (String, Optional) - Mong muốn
- `commitment` (String, Optional) - Cam kết
- `previousStatus` (Enum, Optional) - Trạng thái trước đó
- `reapplicationAt` (Date, Optional) - Thời gian đăng ký lại
- `reapplicationReason` (String, Optional) - Lý do đăng ký lại
- `isReapplication` (Boolean, Default: false) - Là đăng ký lại
- `restoredBy` (ObjectId, FK → User, Optional) - Người duyệt lại
- `restoredAt` (Date, Optional) - Thời gian duyệt lại
- `restorationReason` (String, Optional) - Lý do duyệt lại
- `removalHistory` (Array, Optional) - Lịch sử xóa/duyệt lại:
  - `removedAt` (Date)
  - `removedBy` (Object)
  - `removalReason` (String)
  - `restoredAt` (Date, Optional)
  - `restoredBy` (ObjectId, Optional)
  - `restorationReason` (String, Optional)
- `createdAt` (Date, Auto)
- `updatedAt` (Date, Auto)

**Indexes:**
- Unique: `(userId, status)` với partial filter `status: 'ACTIVE'` - Mỗi user chỉ có 1 membership ACTIVE
- `userId`, `status`, `approvedBy`, `rejectedBy`, `removedBy`, `joinedAt`, `approvedAt`, `removedAt`

---

### 5. **Notification** (notifications)
**Mô tả:** Quản lý thông báo cho người dùng

**Thuộc tính:**
- `_id` (ObjectId, PK)
- `userId` (ObjectId, FK → User, Required) - Người nhận
- `title` (String, Required) - Tiêu đề
- `message` (String, Required) - Nội dung
- `type` (Enum, Required, Default: 'info') - `info`, `success`, `warning`, `error`
- `isRead` (Boolean, Required, Default: false) - Đã đọc
- `relatedType` (String, Optional) - Loại liên quan (activity, membership, etc.)
- `relatedId` (ObjectId, Optional) - ID đối tượng liên quan
- `createdBy` (ObjectId, FK → User, Optional) - Người gửi
- `readAt` (Date, Optional) - Thời điểm đọc
- `createdAt` (Date, Auto)
- `updatedAt` (Date, Auto)

**Indexes:**
- `userId`, `isRead`, `type`, `createdAt`
- Compound: `(userId, isRead)`, `(userId, isRead, createdAt)`, `(userId, createdAt)`

---

### 6. **Session** (sessions)
**Mô tả:** Quản lý phiên đăng nhập và hoạt động của người dùng

**Thuộc tính:**
- `_id` (ObjectId, PK)
- `userId` (ObjectId, FK → User, Required) - ID người dùng
- `role` (Enum, Required) - Vai trò hiện tại
- `lastActive` (Date, Required, Default: now) - Lần hoạt động cuối
- `createdAt` (Date, Auto)
- `updatedAt` (Date, Auto)

**Indexes:**
- `userId`, `role`, `lastActive`
- Compound: `(userId, lastActive)`, `(role, lastActive)`

---

### 7. **ContactRequest** (contactrequests)
**Mô tả:** Quản lý yêu cầu liên hệ từ người dùng

**Thuộc tính:**
- `_id` (ObjectId, PK)
- `userId` (ObjectId, FK → User, Required) - Người gửi
- `userName` (String, Required) - Tên người gửi
- `userEmail` (String, Required) - Email người gửi
- `subject` (String, Required) - Chủ đề
- `message` (String, Required) - Nội dung
- `status` (Enum, Default: 'PENDING') - `PENDING`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`
- `priority` (Enum, Default: 'MEDIUM') - `LOW`, `MEDIUM`, `HIGH`, `URGENT`
- `adminNotes` (String, Optional) - Ghi chú của admin
- `resolvedBy` (ObjectId, FK → User, Optional) - Người xử lý
- `resolvedAt` (Date, Optional) - Thời gian xử lý
- `createdAt` (Date, Auto)
- `updatedAt` (Date, Auto)

**Indexes:**
- `status`, `userId`, `priority`, `createdAt`

---

## Mối quan hệ (Relationships)

### 1. **User ↔ Activity**
- **User → Activity (1:N)**
  - `Activity.createdBy` → `User._id` (Người tạo)
  - `Activity.updatedBy` → `User._id` (Người cập nhật)
  - `Activity.responsiblePerson` → `User._id` (Người phụ trách)
  - `Activity.participants[].userId` → `User._id` (Người tham gia)
  - `Activity.participants[].approvedBy` → `User._id` (Người duyệt tham gia)
  - `Activity.participants[].rejectedBy` → `User._id` (Người từ chối)
  - `Activity.participants[].checkedInBy` → `User._id` (Người điểm danh)

### 2. **User ↔ Attendance**
- **User → Attendance (1:N)**
  - `Attendance.userId` → `User._id` (Sinh viên điểm danh)
- **Activity → Attendance (1:N)**
  - `Attendance.activityId` → `Activity._id` (Hoạt động)
- **User → Attendance.attendances[] (1:N)**
  - `Attendance.attendances[].verifiedBy` → `User._id` (Người duyệt điểm danh)

### 3. **User ↔ Membership**
- **User → Membership (1:1 cho ACTIVE, 1:N cho tất cả)**
  - `Membership.userId` → `User._id` (Người đăng ký)
  - `Membership.approvedBy` → `User._id` (Người duyệt)
  - `Membership.rejectedBy` → `User._id` (Người từ chối)
  - `Membership.restoredBy` → `User._id` (Người duyệt lại)

### 4. **User ↔ Notification**
- **User → Notification (1:N)**
  - `Notification.userId` → `User._id` (Người nhận)
  - `Notification.createdBy` → `User._id` (Người gửi)

### 5. **User ↔ Session**
- **User → Session (1:1 hoặc 1:N)**
  - `Session.userId` → `User._id` (Người dùng)

### 6. **User ↔ ContactRequest**
- **User → ContactRequest (1:N)**
  - `ContactRequest.userId` → `User._id` (Người gửi)
  - `ContactRequest.resolvedBy` → `User._id` (Người xử lý)

---

## Ràng buộc (Constraints)

### Unique Constraints
1. **User:**
   - `studentId` (Unique)
   - `email` (Unique)
   - `googleId` (Unique, Sparse)

2. **Attendance:**
   - `(activityId, userId)` (Unique) - Mỗi sinh viên chỉ có 1 document điểm danh cho mỗi hoạt động

3. **Membership:**
   - `(userId, status)` với `status: 'ACTIVE'` (Unique) - Mỗi user chỉ có 1 membership ACTIVE

### Validation Rules
1. **User:**
   - `studentId`: 13 chữ số (hoặc admin/superadmin/google ID)
   - `email`: Định dạng email hợp lệ, hoặc `@student.tdmu.edu.vn` cho sinh viên
   - Phải có `passwordHash` HOẶC `googleId`

2. **Activity:**
   - `date` phải >= hôm nay (cho single_day)
   - `endDate` > `startDate` (cho multiple_days)
   - `responsiblePerson` phải có role phù hợp (SUPER_ADMIN, CLUB_LEADER, CLUB_DEPUTY, CLUB_MEMBER)

3. **Attendance:**
   - `timeSlot` phải đúng định dạng: 'Buổi Sáng/Chiều/Tối' hoặc 'Ngày X - Buổi Y'

---

## Ghi chú thiết kế

1. **Embedded Documents:**
   - `Activity.participants[]` - Embedded trong Activity để truy vấn nhanh
   - `Attendance.attendances[]` - Embedded để lưu nhiều lần điểm danh (đầu/cuối buổi, nhiều ngày)

2. **Referenced Documents:**
   - Các quan hệ chính sử dụng ObjectId reference để tránh dữ liệu trùng lặp

3. **Indexes:**
   - Tất cả foreign keys đều có index để tối ưu truy vấn
   - Compound indexes cho các truy vấn phổ biến

4. **Soft Delete:**
   - Hiện tại không sử dụng soft delete (hard delete)

5. **Timestamps:**
   - Tất cả collections đều có `createdAt` và `updatedAt` tự động

