# Hướng Dẫn Vẽ Sơ Đồ ERD - Hệ Thống Quản Lý Hoạt Động CLB Sinh viên 5 Tốt TDMU

## 📋 Mục Lục
1. [Tổng Quan](#tổng-quan)
2. [Danh Sách Entities](#danh-sách-entities)
3. [Chi Tiết Các Entities](#chi-tiết-các-entities)
4. [Mối Quan Hệ Giữa Các Entities](#mối-quan-hệ-giữa-các-entities)
5. [Các Ràng Buộc và Quy Tắc](#các-ràng-buộc-và-quy-tắc)
6. [Hướng Dẫn Vẽ ERD](#hướng-dẫn-vẽ-erd)

---

## 🎯 Tổng Quan

Hệ thống có **5 entities chính**:
1. **User** - Người dùng (Sinh viên, Admin, CLB Leader, etc.)
2. **Activity** - Hoạt động ngoại khóa
3. **Attendance** - Điểm danh tham gia hoạt động
4. **Membership** - Thành viên CLB
5. **ContactRequest** - Yêu cầu liên hệ với admin

---

## 📊 Danh Sách Entities

### 1. **User** (Người dùng)
- **Mục đích**: Lưu trữ thông tin người dùng trong hệ thống
- **Khóa chính**: `_id` (ObjectId)

### 2. **Activity** (Hoạt động)
- **Mục đích**: Lưu trữ thông tin các hoạt động ngoại khóa
- **Khóa chính**: `_id` (ObjectId)

### 3. **Attendance** (Điểm danh)
- **Mục đích**: Lưu trữ thông tin điểm danh của sinh viên trong các hoạt động
- **Khóa chính**: `_id` (ObjectId)
- **Khóa phức hợp**: `(activityId, userId)` - Mỗi sinh viên chỉ có 1 document điểm danh cho mỗi hoạt động

### 4. **Membership** (Thành viên CLB)
- **Mục đích**: Quản lý thành viên CLB và trạng thái thành viên
- **Khóa chính**: `_id` (ObjectId)

### 5. **ContactRequest** (Yêu cầu liên hệ)
- **Mục đích**: Lưu trữ các yêu cầu liên hệ từ người dùng đến admin
- **Khóa chính**: `_id` (ObjectId)

---

## 📝 Chi Tiết Các Entities

### 1. **USER** (Người dùng)

#### Thuộc tính (Attributes):

| Tên thuộc tính | Kiểu dữ liệu | Bắt buộc | Mô tả | Ràng buộc |
|---------------|-------------|----------|-------|-----------|
| `_id` | ObjectId | ✅ | Khóa chính | AUTO |
| `studentId` | String | ✅ | Mã số sinh viên | UNIQUE, 13 chữ số hoặc bắt đầu bằng "admin"/"superadmin" |
| `name` | String | ✅ | Họ và tên | 2-100 ký tự |
| `email` | String | ✅ | Email | UNIQUE, Format: `{studentId}@student.tdmu.edu.vn` hoặc admin email |
| `passwordHash` | String | ✅ | Mật khẩu đã hash | Min 6 ký tự |
| `role` | Enum | ✅ | Vai trò | SUPER_ADMIN, ADMIN, CLUB_LEADER, CLUB_DEPUTY, CLUB_MEMBER, CLUB_STUDENT, STUDENT |
| `phone` | String | ❌ | Số điện thoại | 10-11 chữ số (optional) |
| `class` | String | ❌ | Lớp | Max 20 ký tự (optional) |
| `faculty` | String | ❌ | Khoa/Viện | Enum các khoa TDMU (optional) |
| `position` | String | ❌ | Chức vụ | Max 50 ký tự (optional) |
| `department` | String | ❌ | Phòng ban | Max 100 ký tự (optional) |
| `isClubMember` | Boolean | ❌ | Là thành viên CLB | Default: false |
| `avatarUrl` | String | ❌ | URL ảnh đại diện | Format URL (optional) |
| `createdAt` | Date | ✅ | Ngày tạo | AUTO |
| `updatedAt` | Date | ✅ | Ngày cập nhật | AUTO |

#### Indexes:
- `studentId` (UNIQUE)
- `email` (UNIQUE)
- `role`
- `faculty`
- `class`
- `isClubMember`

---

### 2. **ACTIVITY** (Hoạt động)

#### Thuộc tính (Attributes):

| Tên thuộc tính | Kiểu dữ liệu | Bắt buộc | Mô tả | Ràng buộc |
|---------------|-------------|----------|-------|-----------|
| `_id` | ObjectId | ✅ | Khóa chính | AUTO |
| `name` | String | ✅ | Tên hoạt động | 5-200 ký tự |
| `description` | String | ✅ | Mô tả hoạt động | 10-2000 ký tự |
| `date` | Date | ✅* | Ngày diễn ra | *Bắt buộc nếu type = 'single_day', >= ngày hiện tại |
| `location` | String | ✅ | Địa điểm | Max 200 ký tự |
| `locationData` | Object | ❌ | Tọa độ GPS | {lat, lng, address, radius} (optional) |
| `multiTimeLocations` | Array | ❌ | Địa điểm theo buổi | Array của {id, timeSlot, location, radius} (optional) |
| `maxParticipants` | Number | ❌ | Số lượng tối đa | 1-1000 (optional) |
| `visibility` | Enum | ✅ | Quyền xem | 'public' hoặc 'private', Default: 'public' |
| `responsiblePerson` | ObjectId | ✅ | Người phụ trách | FK → User._id |
| `status` | Enum | ✅ | Trạng thái | draft, published, ongoing, completed, cancelled, postponed |
| `type` | Enum | ✅ | Loại hoạt động | 'single_day' hoặc 'multiple_days' |
| `imageUrl` | String | ❌ | URL ảnh | Format URL (optional) |
| `overview` | String | ❌ | Tổng quan | Max 1000 ký tự (optional) |
| `timeSlots` | Array | ✅* | Các buổi trong ngày | *Bắt buộc nếu type = 'single_day' |
| `startDate` | Date | ✅* | Ngày bắt đầu | *Bắt buộc nếu type = 'multiple_days' |
| `endDate` | Date | ✅* | Ngày kết thúc | *Bắt buộc nếu type = 'multiple_days', > startDate |
| `schedule` | Array | ✅* | Lịch trình | *Bắt buộc nếu type = 'multiple_days' |
| `participants` | Array | ✅ | Danh sách người tham gia | Array của Participant objects |
| `createdBy` | ObjectId | ✅ | Người tạo | FK → User._id |
| `updatedBy` | ObjectId | ✅ | Người cập nhật | FK → User._id |
| `createdAt` | Date | ✅ | Ngày tạo | AUTO |
| `updatedAt` | Date | ✅ | Ngày cập nhật | AUTO |

#### Cấu trúc Nested Objects:

**timeSlots[]** (cho single_day activities):
```javascript
{
  id: String,
  name: Enum['Buổi Sáng', 'Buổi Chiều', 'Buổi Tối'],
  startTime: String (HH:MM),
  endTime: String (HH:MM),
  isActive: Boolean,
  activities: String,
  detailedLocation: String (optional)
}
```

**participants[]**:
```javascript
{
  userId: ObjectId (FK → User._id),
  name: String,
  email: String,
  role: Enum['Trưởng Nhóm', 'Phó Trưởng Nhóm', 'Thành Viên Ban Tổ Chức', 'Người Tham Gia', 'Người Giám Sát'],
  joinedAt: Date,
  approvalStatus: Enum['pending', 'approved', 'rejected'],
  approvedBy: ObjectId (FK → User._id, optional),
  approvedAt: Date (optional),
  rejectedBy: ObjectId (FK → User._id, optional),
  rejectedAt: Date (optional),
  rejectionReason: String (optional),
  checkedIn: Boolean,
  checkedInAt: Date (optional),
  checkedInBy: ObjectId (FK → User._id, optional),
  checkInLocation: {lat, lng, address} (optional),
  checkInPhoto: String (optional)
}
```

**schedule[]** (cho multiple_days activities):
```javascript
{
  day: Number,
  date: Date,
  activities: String
}
```

#### Indexes:
- `(status, visibility)`
- `date`
- `type`
- `createdBy`
- `responsiblePerson`
- `participants.userId`

---

### 3. **ATTENDANCE** (Điểm danh)

#### Thuộc tính (Attributes):

| Tên thuộc tính | Kiểu dữ liệu | Bắt buộc | Mô tả | Ràng buộc |
|---------------|-------------|----------|-------|-----------|
| `_id` | ObjectId | ✅ | Khóa chính | AUTO |
| `activityId` | ObjectId | ✅ | ID hoạt động | FK → Activity._id, UNIQUE với userId |
| `userId` | ObjectId | ✅ | ID người dùng | FK → User._id, UNIQUE với activityId |
| `studentName` | String | ✅ | Tên sinh viên | Max 100 ký tự |
| `studentEmail` | String | ✅ | Email sinh viên | Format email |
| `studentId` | String | ❌ | Mã sinh viên | Max 50 ký tự (optional) |
| `attendances` | Array | ✅ | Danh sách điểm danh | Array của AttendanceRecord |
| `createdAt` | Date | ✅ | Ngày tạo | AUTO |
| `updatedAt` | Date | ✅ | Ngày cập nhật | AUTO |

#### Cấu trúc Nested Objects:

**attendances[]** (AttendanceRecord):
```javascript
{
  _id: ObjectId (AUTO),
  timeSlot: Enum['Buổi Sáng', 'Buổi Chiều', 'Buổi Tối'],
  checkInType: Enum['start', 'end'],
  checkInTime: Date,
  location: {
    lat: Number (-90 to 90),
    lng: Number (-180 to 180),
    address: String (optional)
  },
  photoUrl: String (optional, format URL),
  status: Enum['pending', 'approved', 'rejected'],
  verifiedBy: ObjectId (FK → User._id, optional),
  verifiedAt: Date (optional),
  verificationNote: String (optional, max 500),
  cancelReason: String (optional, max 500),
  lateReason: String (optional, max 500),
  createdAt: Date (AUTO),
  updatedAt: Date (AUTO)
}
```

#### Indexes:
- `(activityId, userId)` - UNIQUE (Compound index)
- `activityId`
- `userId`

---

### 4. **MEMBERSHIP** (Thành viên CLB)

#### Thuộc tính (Attributes):

| Tên thuộc tính | Kiểu dữ liệu | Bắt buộc | Mô tả | Ràng buộc |
|---------------|-------------|----------|-------|-----------|
| `_id` | ObjectId | ✅ | Khóa chính | AUTO |
| `userId` | ObjectId | ✅ | ID người dùng | FK → User._id, UNIQUE với status='ACTIVE' |
| `status` | Enum | ✅ | Trạng thái | PENDING, ACTIVE, REJECTED, INACTIVE, REMOVED, Default: 'PENDING' |
| `joinedAt` | Date | ✅ | Ngày đăng ký | AUTO, Default: now |
| `approvedBy` | ObjectId | ❌ | Người duyệt | FK → User._id (optional) |
| `approvedAt` | Date | ❌ | Ngày duyệt | (optional) |
| `rejectedBy` | ObjectId | ❌ | Người từ chối | FK → User._id (optional) |
| `rejectedAt` | Date | ❌ | Ngày từ chối | (optional) |
| `rejectionReason` | String | ❌ | Lý do từ chối | Max 500 ký tự (optional) |
| `removedBy` | Object | ❌ | Người xóa | {_id, name, studentId} (optional) |
| `removedAt` | Date | ❌ | Ngày xóa | (optional) |
| `removalReason` | String | ❌ | Lý do xóa | Max 500 ký tự (optional) |
| `removalReasonTrue` | String | ❌ | Lý do xóa hiện tại | Max 500 ký tự (optional) |
| `motivation` | String | ❌ | Động lực tham gia | Max 1000 ký tự (optional) |
| `experience` | String | ❌ | Kinh nghiệm | Max 1000 ký tự (optional) |
| `expectations` | String | ❌ | Mong muốn | Max 1000 ký tự (optional) |
| `commitment` | String | ❌ | Cam kết | Max 1000 ký tự (optional) |
| `previousStatus` | Enum | ❌ | Trạng thái trước đó | (optional) |
| `reapplicationAt` | Date | ❌ | Ngày đăng ký lại | (optional) |
| `reapplicationReason` | String | ❌ | Lý do đăng ký lại | Max 500 ký tự (optional) |
| `isReapplication` | Boolean | ❌ | Là đăng ký lại | Default: false |
| `restoredBy` | ObjectId | ❌ | Người duyệt lại | FK → User._id (optional) |
| `restoredAt` | Date | ❌ | Ngày duyệt lại | (optional) |
| `restorationReason` | String | ❌ | Lý do duyệt lại | Max 500 ký tự (optional) |
| `removalHistory` | Array | ❌ | Lịch sử xóa | Array của removal history objects |
| `createdAt` | Date | ✅ | Ngày tạo | AUTO |
| `updatedAt` | Date | ✅ | Ngày cập nhật | AUTO |

#### Cấu trúc Nested Objects:

**removalHistory[]**:
```javascript
{
  removedAt: Date,
  removedBy: {
    _id: ObjectId,
    name: String,
    studentId: String
  },
  removalReason: String,
  restoredAt: Date (optional),
  restoredBy: ObjectId (FK → User._id, optional),
  restorationReason: String (optional)
}
```

#### Indexes:
- `(userId, status)` - UNIQUE khi status='ACTIVE'
- `status`
- `approvedBy`
- `rejectedBy`
- `removedBy`
- `joinedAt`
- `approvedAt`
- `removedAt`

---

### 5. **CONTACTREQUEST** (Yêu cầu liên hệ)

#### Thuộc tính (Attributes):

| Tên thuộc tính | Kiểu dữ liệu | Bắt buộc | Mô tả | Ràng buộc |
|---------------|-------------|----------|-------|-----------|
| `_id` | ObjectId | ✅ | Khóa chính | AUTO |
| `userId` | ObjectId | ✅ | ID người dùng | FK → User._id |
| `userName` | String | ✅ | Tên người dùng | |
| `userEmail` | String | ✅ | Email người dùng | |
| `subject` | String | ✅ | Tiêu đề | Max 200 ký tự |
| `message` | String | ✅ | Nội dung tin nhắn | Max 2000 ký tự |
| `status` | Enum | ✅ | Trạng thái | PENDING, IN_PROGRESS, RESOLVED, CLOSED, Default: 'PENDING' |
| `priority` | Enum | ✅ | Mức độ ưu tiên | LOW, MEDIUM, HIGH, URGENT, Default: 'MEDIUM' |
| `adminNotes` | String | ❌ | Ghi chú admin | Max 1000 ký tự (optional) |
| `resolvedBy` | ObjectId | ❌ | Người xử lý | FK → User._id (optional) |
| `resolvedAt` | Date | ❌ | Ngày xử lý | (optional) |
| `createdAt` | Date | ✅ | Ngày tạo | AUTO |
| `updatedAt` | Date | ✅ | Ngày cập nhật | AUTO |

#### Indexes:
- `(status, createdAt)` - Descending
- `userId`
- `priority`

---

## 🔗 Mối Quan Hệ Giữa Các Entities

### 1. **User ↔ Activity**

#### Quan hệ: **One-to-Many (1:N)**
- Một User có thể tạo nhiều Activities (`createdBy`)
- Một User có thể là người phụ trách nhiều Activities (`responsiblePerson`)
- Một User có thể cập nhật nhiều Activities (`updatedBy`)
- Một User có thể tham gia nhiều Activities (qua `participants.userId`)

**Foreign Keys:**
- `Activity.createdBy` → `User._id`
- `Activity.updatedBy` → `User._id`
- `Activity.responsiblePerson` → `User._id`
- `Activity.participants[].userId` → `User._id`
- `Activity.participants[].approvedBy` → `User._id`
- `Activity.participants[].rejectedBy` → `User._id`
- `Activity.participants[].checkedInBy` → `User._id`

### 2. **User ↔ Attendance**

#### Quan hệ: **One-to-Many (1:N)**
- Một User có thể có nhiều Attendance records (tham gia nhiều hoạt động)
- Một User có thể xác minh nhiều Attendance records (`verifiedBy`)

**Foreign Keys:**
- `Attendance.userId` → `User._id`
- `Attendance.attendances[].verifiedBy` → `User._id`

### 3. **Activity ↔ Attendance**

#### Quan hệ: **One-to-Many (1:N)**
- Một Activity có thể có nhiều Attendance records (nhiều sinh viên điểm danh)

**Foreign Keys:**
- `Attendance.activityId` → `Activity._id`

**Ràng buộc:**
- UNIQUE constraint: `(activityId, userId)` - Mỗi sinh viên chỉ có 1 document điểm danh cho mỗi hoạt động

### 4. **User ↔ Membership**

#### Quan hệ: **One-to-Many (1:N)** (về mặt lịch sử)
- Một User có thể có nhiều Membership records (lịch sử tham gia CLB)
- Nhưng chỉ có 1 Membership ACTIVE tại một thời điểm

**Foreign Keys:**
- `Membership.userId` → `User._id`
- `Membership.approvedBy` → `User._id`
- `Membership.rejectedBy` → `User._id`
- `Membership.restoredBy` → `User._id`
- `Membership.removalHistory[].restoredBy` → `User._id`

**Ràng buộc:**
- UNIQUE constraint: `(userId, status)` khi `status='ACTIVE'` - Mỗi user chỉ có 1 membership ACTIVE

### 5. **User ↔ ContactRequest**

#### Quan hệ: **One-to-Many (1:N)**
- Một User có thể gửi nhiều ContactRequest
- Một User (admin) có thể xử lý nhiều ContactRequest

**Foreign Keys:**
- `ContactRequest.userId` → `User._id`
- `ContactRequest.resolvedBy` → `User._id`

---

## 🔒 Các Ràng Buộc và Quy Tắc

### 1. **User**
- `studentId` phải UNIQUE
- `email` phải UNIQUE
- `studentId` phải có 13 chữ số (hoặc bắt đầu bằng "admin"/"superadmin")
- `email` phải theo format: `{studentId}@student.tdmu.edu.vn` (hoặc admin email)

### 2. **Activity**
- `responsiblePerson` phải có role trong: SUPER_ADMIN, CLUB_LEADER, CLUB_DEPUTY, CLUB_MEMBER
- Nếu `type = 'single_day'`: phải có `date` và `timeSlots[]`
- Nếu `type = 'multiple_days'`: phải có `startDate`, `endDate`, và `schedule[]`
- `date` (single_day) hoặc `startDate` (multiple_days) phải >= ngày hiện tại
- `endDate` phải > `startDate`

### 3. **Attendance**
- UNIQUE constraint: `(activityId, userId)` - Mỗi sinh viên chỉ có 1 document điểm danh cho mỗi hoạt động
- `location.lat` phải trong khoảng [-90, 90]
- `location.lng` phải trong khoảng [-180, 180]

### 4. **Membership**
- UNIQUE constraint: `(userId, status)` khi `status='ACTIVE'` - Mỗi user chỉ có 1 membership ACTIVE
- Khi `status='ACTIVE'`, tự động set `user.role = 'CLUB_STUDENT'` và `user.isClubMember = true`

### 5. **ContactRequest**
- Không có ràng buộc đặc biệt

---

## 📐 Hướng Dẫn Vẽ ERD

### **Bước 1: Vẽ các Entities**

Vẽ 5 hình chữ nhật, mỗi hình đại diện cho 1 entity:
- **User**
- **Activity**
- **Attendance**
- **Membership**
- **ContactRequest**

### **Bước 2: Thêm Attributes**

Trong mỗi entity:
1. Liệt kê tất cả các attributes
2. Gạch chân **Primary Key** (PK)
3. Ghi chú **Foreign Key** (FK) với mũi tên chỉ đến entity liên quan
4. Đánh dấu **NOT NULL** (bắt buộc) bằng ký hiệu *
5. Đánh dấu **UNIQUE** bằng ký hiệu U

### **Bước 3: Vẽ Mối Quan Hệ**

#### **Ký hiệu quan hệ:**
- **1** = One (Một)
- **N** = Many (Nhiều)
- **M** = Many (Nhiều) - cho many-to-many

#### **Các mối quan hệ:**

1. **User ──< Activity**
   - User (1) ── tạo ──< Activity (N) [createdBy]
   - User (1) ── phụ trách ──< Activity (N) [responsiblePerson]
   - User (1) ── cập nhật ──< Activity (N) [updatedBy]
   - User (1) ── tham gia ──< Activity (N) [participants.userId]

2. **User ──< Attendance**
   - User (1) ── có ──< Attendance (N) [userId]
   - User (1) ── xác minh ──< Attendance (N) [verifiedBy]

3. **Activity ──< Attendance**
   - Activity (1) ── có ──< Attendance (N) [activityId]
   - **Constraint**: UNIQUE (activityId, userId)

4. **User ──< Membership**
   - User (1) ── có ──< Membership (N) [userId]
   - User (1) ── duyệt ──< Membership (N) [approvedBy]
   - User (1) ── từ chối ──< Membership (N) [rejectedBy]
   - **Constraint**: UNIQUE (userId, status) khi status='ACTIVE'

5. **User ──< ContactRequest**
   - User (1) ── gửi ──< ContactRequest (N) [userId]
   - User (1) ── xử lý ──< ContactRequest (N) [resolvedBy]

### **Bước 4: Thêm Cardinality**

Trên mỗi đường quan hệ, ghi rõ:
- **1** (One): Một
- **N** (Many): Nhiều

Ví dụ:
```
User (1) ────────< Activity (N)
     │
     └── createdBy
```

### **Bước 5: Thêm Constraints**

Ghi chú các ràng buộc:
- **UNIQUE constraints**
- **CHECK constraints** (ví dụ: date >= today)
- **NOT NULL constraints**

### **Bước 6: Tạo ERD Diagram**

#### **Công cụ đề xuất:**
1. **draw.io** (diagrams.net) - Miễn phí, dễ sử dụng
2. **Lucidchart** - Trả phí, chuyên nghiệp
3. **dbdiagram.io** - Miễn phí, chuyên cho database
4. **MySQL Workbench** - Miễn phí, hỗ trợ reverse engineering
5. **ERDPlus** - Miễn phí, đơn giản

#### **Template ERD (Text format):**

```
┌─────────────────────┐
│       USER          │
├─────────────────────┤
│ PK _id              │
│ UK studentId        │
│ UK email            │
│    name             │
│    passwordHash     │
│    role             │
│    phone            │
│    class            │
│    faculty          │
│    ...              │
└─────────────────────┘
         │
         │ 1
         │
         │ N
         ▼
┌─────────────────────┐
│     ACTIVITY        │
├─────────────────────┤
│ PK _id              │
│ FK createdBy ───────┼──> USER
│ FK updatedBy ───────┼──> USER
│ FK responsiblePerson┼──> USER
│    name             │
│    description      │
│    date             │
│    location         │
│    status           │
│    type             │
│    participants[]   │
│    ...              │
└─────────────────────┘
         │
         │ 1
         │
         │ N
         ▼
┌─────────────────────┐
│    ATTENDANCE       │
├─────────────────────┤
│ PK _id              │
│ FK activityId ──────┼──> ACTIVITY
│ FK userId ──────────┼──> USER
│ UK (activityId,     │
│     userId)         │
│    studentName      │
│    studentEmail     │
│    attendances[]    │
│    ...              │
└─────────────────────┘

┌─────────────────────┐
│     MEMBERSHIP      │
├─────────────────────┤
│ PK _id              │
│ FK userId ──────────┼──> USER
│ FK approvedBy ──────┼──> USER
│ FK rejectedBy ──────┼──> USER
│ UK (userId, status) │
│    status           │
│    joinedAt         │
│    ...              │
└─────────────────────┘

┌─────────────────────┐
│  CONTACTREQUEST     │
├─────────────────────┤
│ PK _id              │
│ FK userId ──────────┼──> USER
│ FK resolvedBy ──────┼──> USER
│    subject          │
│    message          │
│    status           │
│    priority         │
│    ...              │
└─────────────────────┘
```

### **Bước 7: Export và Lưu**

1. Export ERD thành file:
   - **PNG/JPG** - Để chèn vào tài liệu
   - **PDF** - Để in ấn
   - **SVG** - Để chỉnh sửa sau

2. Lưu file source (nếu dùng draw.io, lưu file .drawio)

---

## 🎨 Gợi Ý Thiết Kế ERD

### **Màu sắc:**
- **User**: Xanh dương
- **Activity**: Xanh lá
- **Attendance**: Vàng
- **Membership**: Cam
- **ContactRequest**: Tím

### **Kích thước:**
- Entities lớn: User, Activity
- Entities nhỏ: Attendance, Membership, ContactRequest

### **Vị trí:**
- Đặt **User** ở trung tâm (vì nhiều quan hệ nhất)
- Đặt các entities khác xung quanh User
- Sắp xếp theo luồng logic: User → Membership → Activity → Attendance

---

## 📚 Tài Liệu Tham Khảo

### **Ký hiệu ERD chuẩn:**
- **Chen Notation**: Hình thoi cho relationship
- **Crow's Foot Notation**: Ký hiệu chân quạ (1, N, M)
- **UML Notation**: Hình chữ nhật với compartments

### **Best Practices:**
1. Đặt tên entities bằng danh từ số ít (User, không phải Users)
2. Đặt tên attributes rõ ràng, có ý nghĩa
3. Sử dụng consistent naming convention (camelCase hoặc snake_case)
4. Ghi chú rõ ràng các constraints và business rules
5. Sử dụng màu sắc và hình dạng để phân biệt entities

---

## ✅ Checklist Hoàn Thành ERD

- [ ] Vẽ đầy đủ 5 entities
- [ ] Liệt kê tất cả attributes cho mỗi entity
- [ ] Đánh dấu Primary Keys (PK)
- [ ] Đánh dấu Foreign Keys (FK)
- [ ] Vẽ tất cả các mối quan hệ
- [ ] Ghi rõ cardinality (1, N)
- [ ] Ghi chú các constraints (UNIQUE, NOT NULL)
- [ ] Kiểm tra tính nhất quán của tên và kiểu dữ liệu
- [ ] Export thành file ảnh (PNG/PDF)
- [ ] Lưu file source (nếu có)

---

## 🔍 Lưu Ý Quan Trọng

1. **Nested Objects**: Activity có các nested objects (timeSlots[], participants[], schedule[]) - Trong ERD, có thể biểu diễn bằng:
   - Embedded documents (trong MongoDB)
   - Hoặc tạo bảng riêng (trong SQL)

2. **Array Fields**: Một số fields là arrays (participants[], attendances[], removalHistory[]) - Trong MongoDB, đây là embedded arrays, nhưng trong ERD có thể cần normalize thành bảng riêng.

3. **MongoDB vs SQL**: Hệ thống này dùng MongoDB (NoSQL), nhưng ERD vẫn có thể vẽ theo mô hình quan hệ truyền thống để dễ hiểu.

4. **Virtual Fields**: Một số fields là virtual (không lưu trong DB, chỉ tính toán) - Không cần vẽ trong ERD.

---

**Chúc bạn vẽ ERD thành công! 🎉**

