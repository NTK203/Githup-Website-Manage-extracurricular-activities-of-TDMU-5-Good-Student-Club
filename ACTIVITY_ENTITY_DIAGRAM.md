# Sơ Đồ Chi Tiết Entity: ACTIVITY

## 📊 Tổng Quan

**ACTIVITY** là entity trung tâm của hệ thống, lưu trữ thông tin về các hoạt động ngoại khóa của CLB Sinh viên 5 Tốt TDMU.

---

## 🏗️ Cấu Trúc Entity

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ACTIVITY                                       │
│                      (Hoạt Động Ngoại Khóa)                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│ PRIMARY KEY:                                                                │
│   • _id (ObjectId) - AUTO GENERATED                                         │
│                                                                             │
│ FOREIGN KEYS:                                                               │
│   • createdBy (ObjectId) ────> USER._id                                     │
│   • updatedBy (ObjectId) ────> USER._id                                     │
│   • responsiblePerson (ObjectId) ────> USER._id                             │
│   • participants[].userId (ObjectId) ────> USER._id                         │
│   • participants[].approvedBy (ObjectId) ────> USER._id                     │
│   • participants[].rejectedBy (ObjectId) ────> USER._id                     │
│   • participants[].checkedInBy (ObjectId) ────> USER._id                    │
│                                                                             │
│ ATTRIBUTES:                                                                 │
│   • name (String) *                    [5-200 ký tự]                        │
│   • description (String) *             [10-2000 ký tự]                      │
│   • date (Date) *                      [>= ngày hiện tại]                   │
│   • location (String) *                [Max 200 ký tự]                      │
│   • locationData (Object)              [Optional]                           │
│   • multiTimeLocations (Array)         [Optional]                           │
│   • maxParticipants (Number)           [1-1000, Optional]                   │
│   • visibility (Enum) *                [public, private]                    │
│   • responsiblePerson (ObjectId) *     [FK → USER]                          │
│   • status (Enum) *                    [draft, published, ongoing,          │
│                                          completed, cancelled, postponed]    │
│   • type (Enum) *                      [single_day, multiple_days]          │
│   • imageUrl (String)                  [URL format, Optional]               │
│   • overview (String)                  [Max 1000 ký tự, Optional]           │
│   • timeSlots (Array) *                [Required if type='single_day']      │
│   • startDate (Date) *                 [Required if type='multiple_days']   │
│   • endDate (Date) *                   [Required if type='multiple_days']   │
│   • schedule (Array) *                 [Required if type='multiple_days']   │
│   • participants (Array) *             [Default: []]                        │
│   • createdBy (ObjectId) *             [FK → USER]                          │
│   • updatedBy (ObjectId) *             [FK → USER]                          │
│   • createdAt (Date) *                 [AUTO]                               │
│   • updatedAt (Date) *                 [AUTO]                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📋 Chi Tiết Các Thuộc Tính

### 1. **Thông Tin Cơ Bản**

| Thuộc tính | Kiểu | Bắt buộc | Mô tả | Ràng buộc |
|-----------|------|----------|-------|-----------|
| `_id` | ObjectId | ✅ | Khóa chính | AUTO GENERATED |
| `name` | String | ✅ | Tên hoạt động | 5-200 ký tự |
| `description` | String | ✅ | Mô tả chi tiết | 10-2000 ký tự |
| `overview` | String | ❌ | Tổng quan ngắn gọn | Max 1000 ký tự |
| `imageUrl` | String | ❌ | URL ảnh đại diện | Format: http:// hoặc https:// |

### 2. **Thời Gian và Địa Điểm**

| Thuộc tính | Kiểu | Bắt buộc | Mô tả | Ràng buộc |
|-----------|------|----------|-------|-----------|
| `type` | Enum | ✅ | Loại hoạt động | `single_day` hoặc `multiple_days` |
| `date` | Date | ✅* | Ngày diễn ra | *Bắt buộc nếu type='single_day', >= ngày hiện tại |
| `startDate` | Date | ✅* | Ngày bắt đầu | *Bắt buộc nếu type='multiple_days' |
| `endDate` | Date | ✅* | Ngày kết thúc | *Bắt buộc nếu type='multiple_days', > startDate |
| `location` | String | ✅ | Địa điểm (text) | Max 200 ký tự |
| `locationData` | Object | ❌ | Tọa độ GPS chính | {lat, lng, address, radius} |
| `multiTimeLocations` | Array | ❌ | Địa điểm theo buổi | Array của MultiTimeLocation |

### 3. **Quản Lý và Trạng Thái**

| Thuộc tính | Kiểu | Bắt buộc | Mô tả | Ràng buộc |
|-----------|------|----------|-------|-----------|
| `responsiblePerson` | ObjectId | ✅ | Người phụ trách | FK → USER._id, Role: SUPER_ADMIN, CLUB_LEADER, CLUB_DEPUTY, CLUB_MEMBER |
| `status` | Enum | ✅ | Trạng thái hoạt động | draft, published, ongoing, completed, cancelled, postponed |
| `visibility` | Enum | ✅ | Quyền xem | `public` hoặc `private`, Default: `public` |
| `createdBy` | ObjectId | ✅ | Người tạo | FK → USER._id |
| `updatedBy` | ObjectId | ✅ | Người cập nhật | FK → USER._id |

### 4. **Người Tham Gia**

| Thuộc tính | Kiểu | Bắt buộc | Mô tả | Ràng buộc |
|-----------|------|----------|-------|-----------|
| `maxParticipants` | Number | ❌ | Số lượng tối đa | 1-1000 |
| `participants` | Array | ✅ | Danh sách người tham gia | Array của Participant objects, Default: [] |

### 5. **Lịch Trình (Theo Loại Hoạt Động)**

#### **Single Day Activity** (Hoạt động 1 ngày):
| Thuộc tính | Kiểu | Bắt buộc | Mô tả |
|-----------|------|----------|-------|
| `timeSlots` | Array | ✅* | Các buổi trong ngày | *Bắt buộc nếu type='single_day' |

#### **Multiple Days Activity** (Hoạt động nhiều ngày):
| Thuộc tính | Kiểu | Bắt buộc | Mô tả |
|-----------|------|----------|-------|
| `schedule` | Array | ✅* | Lịch trình chi tiết | *Bắt buộc nếu type='multiple_days' |

---

## 🔗 Nested Objects Chi Tiết

### 1. **locationData** (Object) - Tọa độ GPS chính

```javascript
{
  lat: Number,        // Vĩ độ: -90 to 90
  lng: Number,        // Kinh độ: -180 to 180
  address: String,    // Địa chỉ (Max 500 ký tự)
  radius: Number      // Bán kính (m): 10-10000, Default: 100
}
```

**Sơ đồ:**
```
┌─────────────────────┐
│   locationData      │
├─────────────────────┤
│ • lat (Number)      │
│ • lng (Number)      │
│ • address (String)  │
│ • radius (Number)   │
└─────────────────────┘
```

---

### 2. **multiTimeLocations[]** (Array) - Địa điểm theo buổi

```javascript
[
  {
    id: String,                    // ID duy nhất
    timeSlot: Enum,                // 'morning', 'afternoon', 'evening'
    location: {
      lat: Number,                 // Vĩ độ: -90 to 90
      lng: Number,                 // Kinh độ: -180 to 180
      address: String              // Địa chỉ (Max 500 ký tự)
    },
    radius: Number                 // Bán kính (m): 10-10000, Default: 100
  }
]
```

**Sơ đồ:**
```
┌─────────────────────────────────────┐
│   multiTimeLocations[]              │
│   (Array of MultiTimeLocation)      │
├─────────────────────────────────────┤
│ • id (String)                       │
│ • timeSlot (Enum)                   │
│   - 'morning'                       │
│   - 'afternoon'                     │
│   - 'evening'                       │
│ • location (Object)                 │
│   ├─ lat (Number)                   │
│   ├─ lng (Number)                   │
│   └─ address (String)               │
│ • radius (Number)                   │
└─────────────────────────────────────┘
```

---

### 3. **timeSlots[]** (Array) - Các buổi trong ngày (Single Day)

```javascript
[
  {
    id: String,                      // ID duy nhất
    name: Enum,                      // 'Buổi Sáng', 'Buổi Chiều', 'Buổi Tối'
    startTime: String,               // Format: HH:MM (24h)
    endTime: String,                 // Format: HH:MM (24h)
    isActive: Boolean,               // Default: true
    activities: String,              // Mô tả hoạt động (Max 1000 ký tự)
    detailedLocation: String         // Địa điểm chi tiết (Max 500 ký tự, Optional)
  }
]
```

**Sơ đồ:**
```
┌─────────────────────────────────────┐
│   timeSlots[]                       │
│   (Array of TimeSlot)               │
│   *Required if type='single_day'    │
├─────────────────────────────────────┤
│ • id (String)                       │
│ • name (Enum)                       │
│   - 'Buổi Sáng'                     │
│   - 'Buổi Chiều'                    │
│   - 'Buổi Tối'                      │
│ • startTime (String)                │
│   Format: HH:MM                     │
│ • endTime (String)                  │
│   Format: HH:MM                     │
│ • isActive (Boolean)                │
│   Default: true                     │
│ • activities (String)               │
│   Max: 1000 ký tự                   │
│ • detailedLocation (String)         │
│   Max: 500 ký tự, Optional          │
└─────────────────────────────────────┘
```

---

### 4. **schedule[]** (Array) - Lịch trình (Multiple Days)

```javascript
[
  {
    day: Number,                     // Số ngày (>= 1)
    date: Date,                      // Ngày cụ thể
    activities: String               // Mô tả hoạt động (Max 1000 ký tự)
  }
]
```

**Sơ đồ:**
```
┌─────────────────────────────────────┐
│   schedule[]                        │
│   (Array of Schedule)               │
│   *Required if type='multiple_days' │
├─────────────────────────────────────┤
│ • day (Number)                      │
│   >= 1                              │
│ • date (Date)                       │
│ • activities (String)               │
│   Max: 1000 ký tự                   │
└─────────────────────────────────────┘
```

---

### 5. **participants[]** (Array) - Danh sách người tham gia

```javascript
[
  {
    userId: ObjectId,                // FK → USER._id
    name: String,                    // Tên người tham gia (Max 100 ký tự)
    email: String,                   // Email (Format: email)
    role: Enum,                      // Vai trò
    joinedAt: Date,                  // Ngày tham gia (Default: now)
    approvalStatus: Enum,            // Trạng thái duyệt
    approvedBy: ObjectId,            // FK → USER._id (Optional)
    approvedAt: Date,                // Ngày duyệt (Optional)
    rejectedBy: ObjectId,            // FK → USER._id (Optional)
    rejectedAt: Date,                // Ngày từ chối (Optional)
    rejectionReason: String,         // Lý do từ chối (Max 500 ký tự, Optional)
    checkedIn: Boolean,              // Đã điểm danh (Default: false)
    checkedInAt: Date,               // Thời gian điểm danh (Optional)
    checkedInBy: ObjectId,           // FK → USER._id (Optional)
    checkInLocation: Object,         // Vị trí điểm danh (Optional)
    checkInPhoto: String             // Ảnh điểm danh (Optional)
  }
]
```

**Sơ đồ chi tiết:**
```
┌─────────────────────────────────────────────────────────────┐
│   participants[]                                             │
│   (Array of Participant)                                     │
│   Default: []                                                │
├─────────────────────────────────────────────────────────────┤
│ FOREIGN KEYS:                                                │
│   • userId ────> USER._id                                    │
│   • approvedBy ────> USER._id (Optional)                     │
│   • rejectedBy ────> USER._id (Optional)                     │
│   • checkedInBy ────> USER._id (Optional)                    │
│                                                              │
│ ATTRIBUTES:                                                  │
│   • name (String) *                  [Max 100 ký tự]         │
│   • email (String) *                 [Format: email]         │
│   • role (Enum) *                    [Default: 'Người Tham Gia']│
│     - 'Trưởng Nhóm'                                         │
│     - 'Phó Trưởng Nhóm'                                     │
│     - 'Thành Viên Ban Tổ Chức'                              │
│     - 'Người Tham Gia'                                      │
│     - 'Người Giám Sát'                                      │
│   • joinedAt (Date) *                [Default: now]          │
│   • approvalStatus (Enum) *          [Default: 'pending']    │
│     - 'pending'                                             │
│     - 'approved'                                            │
│     - 'rejected'                                            │
│   • approvedBy (ObjectId)            [Optional]              │
│   • approvedAt (Date)                [Optional]              │
│   • rejectedBy (ObjectId)            [Optional]              │
│   • rejectedAt (Date)                [Optional]              │
│   • rejectionReason (String)         [Max 500, Optional]     │
│   • checkedIn (Boolean)              [Default: false]        │
│   • checkedInAt (Date)               [Optional]              │
│   • checkedInBy (ObjectId)           [Optional]              │
│   • checkInLocation (Object)         [Optional]              │
│     ├─ lat (Number)                                         │
│     ├─ lng (Number)                                         │
│     └─ address (String)                                     │
│   • checkInPhoto (String)            [Optional]              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Mối Quan Hệ

### 1. **ACTIVITY ← USER** (Many-to-One)

```
USER (1) ────────< ACTIVITY (N)
   │                    │
   │                    ├── createdBy
   │                    ├── updatedBy
   │                    ├── responsiblePerson
   │                    └── participants[].userId
```

**Chi tiết:**
- Một User có thể tạo nhiều Activities (`createdBy`)
- Một User có thể cập nhật nhiều Activities (`updatedBy`)
- Một User có thể phụ trách nhiều Activities (`responsiblePerson`)
- Một User có thể tham gia nhiều Activities (`participants[].userId`)
- Một User có thể duyệt/từ chối nhiều Participants (`participants[].approvedBy`, `participants[].rejectedBy`)

### 2. **ACTIVITY ← ATTENDANCE** (One-to-Many)

```
ACTIVITY (1) ────────< ATTENDANCE (N)
   │
   └── activityId
```

**Chi tiết:**
- Một Activity có thể có nhiều Attendance records
- Mỗi Attendance record thuộc về 1 Activity duy nhất
- UNIQUE constraint: `(activityId, userId)` - Mỗi user chỉ có 1 attendance cho mỗi activity

---

## 🔒 Ràng Buộc và Quy Tắc

### 1. **Ràng Buộc về Loại Hoạt Động**

#### **Single Day Activity** (`type = 'single_day'`):
- ✅ Phải có `date`
- ✅ Phải có `timeSlots[]` (ít nhất 1 buổi)
- ❌ Không cần `startDate`, `endDate`, `schedule[]`

#### **Multiple Days Activity** (`type = 'multiple_days'`):
- ✅ Phải có `startDate`
- ✅ Phải có `endDate`
- ✅ Phải có `schedule[]` (ít nhất 1 ngày)
- ✅ `endDate` phải > `startDate`
- ❌ Không cần `date`, `timeSlots[]`

### 2. **Ràng Buộc về Thời Gian**

- `date` (single_day): Phải >= ngày hiện tại
- `startDate` (multiple_days): Phải >= ngày hiện tại
- `endDate` (multiple_days): Phải > `startDate`

### 3. **Ràng Buộc về Người Phụ Trách**

- `responsiblePerson` phải có role trong:
  - `SUPER_ADMIN`
  - `CLUB_LEADER`
  - `CLUB_DEPUTY`
  - `CLUB_MEMBER`

### 4. **Ràng Buộc về Số Lượng Người Tham Gia**

- `maxParticipants`: 1-1000 (nếu có)
- Số lượng `participants[]` không được vượt quá `maxParticipants` (nếu có)

### 5. **Ràng Buộc về Tọa Độ GPS**

- `locationData.lat`: -90 to 90
- `locationData.lng`: -180 to 180
- `locationData.radius`: 10-10000 (mét)
- `multiTimeLocations[].location.lat`: -90 to 90
- `multiTimeLocations[].location.lng`: -180 to 180
- `multiTimeLocations[].radius`: 10-10000 (mét)

### 6. **Ràng Buộc về Định Dạng Thời Gian**

- `timeSlots[].startTime`: Format HH:MM (24h)
- `timeSlots[].endTime`: Format HH:MM (24h)
- `timeSlots[].startTime` < `timeSlots[].endTime`

---

## 📊 Indexes

```javascript
// Indexes cho hiệu suất truy vấn
activitySchema.index({ status: 1, visibility: 1 });
activitySchema.index({ date: 1 });
activitySchema.index({ type: 1 });
activitySchema.index({ createdBy: 1 });
activitySchema.index({ responsiblePerson: 1 });
activitySchema.index({ 'participants.userId': 1 });
```

---

## 🔍 Virtual Fields

### 1. **currentParticipantsCount**
```javascript
// Số lượng người tham gia hiện tại
virtual('currentParticipantsCount').get(function() {
  return this.participants.length;
});
```

### 2. **isFull**
```javascript
// Kiểm tra hoạt động đã đầy chưa
virtual('isFull').get(function() {
  if (!this.maxParticipants) return false;
  return this.participants.length >= this.maxParticipants;
});
```

---

## 🛠️ Methods

### 1. **canUserJoin(userId)**
```javascript
// Kiểm tra user có thể tham gia không
activitySchema.methods.canUserJoin = function(userId) {
  if (this.isFull) return false;
  return !this.participants.some(p => p.userId.equals(userId));
};
```

### 2. **findByVisibilityAndRole(visibility, userRole)**
```javascript
// Tìm activities theo visibility và role
activitySchema.statics.findByVisibilityAndRole = function(visibility, userRole) {
  if (visibility === 'public') {
    return this.find({ visibility: 'public' });
  } else {
    // Private activities - only visible to club members
    const allowedRoles = ['SUPER_ADMIN', 'CLUB_LEADER', 'CLUB_DEPUTY', 'CLUB_MEMBER', 'CLUB_STUDENT'];
    if (allowedRoles.includes(userRole)) {
      return this.find({ visibility: 'private' });
    }
    return this.find({ _id: null }); // Return empty result
  }
};
```

---

## 📈 Luồng Dữ Liệu

### 1. **Tạo Hoạt Động**
```
USER (createdBy)
    ↓
ACTIVITY (status: 'draft')
    ↓
Cập nhật thông tin
    ↓
ACTIVITY (status: 'published')
```

### 2. **Đăng Ký Tham Gia**
```
USER (participant)
    ↓
ACTIVITY.participants[] (approvalStatus: 'pending')
    ↓
USER (admin) duyệt
    ↓
ACTIVITY.participants[] (approvalStatus: 'approved')
```

### 3. **Điểm Danh**
```
USER (participant)
    ↓
ATTENDANCE (checkIn)
    ↓
ACTIVITY.participants[].checkedIn = true
```

---

## 🎨 Sơ Đồ ERD Chi Tiết

```
┌─────────────────────────────────────────────────────────────────────┐
│                           ACTIVITY                                   │
├─────────────────────────────────────────────────────────────────────┤
│ PK: _id                                                             │
│                                                                     │
│ ┌───────────────────────────────────────────────────────────────┐  │
│ │                    Thông Tin Cơ Bản                           │  │
│ │  • name (String) *                                            │  │
│ │  • description (String) *                                     │  │
│ │  • overview (String)                                          │  │
│ │  • imageUrl (String)                                          │  │
│ └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│ ┌───────────────────────────────────────────────────────────────┐  │
│ │                 Thời Gian và Địa Điểm                         │  │
│ │  • type (Enum) * ──┐                                          │  │
│ │  • date (Date) *   │ Single Day                               │  │
│ │  • startDate (Date)│ Multiple Days                            │  │
│ │  • endDate (Date)  │                                          │  │
│ │  • location (String) *                                        │  │
│ │  • locationData (Object)                                      │  │
│ │  • multiTimeLocations (Array)                                 │  │
│ └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│ ┌───────────────────────────────────────────────────────────────┐  │
│ │                  Quản Lý và Trạng Thái                        │  │
│ │  FK • responsiblePerson ────> USER                            │  │
│ │  FK • createdBy ────> USER                                    │  │
│ │  FK • updatedBy ────> USER                                    │  │
│ │  • status (Enum) *                                            │  │
│ │  • visibility (Enum) *                                        │  │
│ └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│ ┌───────────────────────────────────────────────────────────────┐  │
│ │              Lịch Trình (Theo Loại)                           │  │
│ │  IF type='single_day':                                        │  │
│ │    • timeSlots[] *                                            │  │
│ │  IF type='multiple_days':                                     │  │
│ │    • schedule[] *                                             │  │
│ └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│ ┌───────────────────────────────────────────────────────────────┐  │
│ │                  Người Tham Gia                                │  │
│ │  • maxParticipants (Number)                                   │  │
│ │  • participants[] *                                           │  │
│ │    ├─ userId ────> USER                                       │  │
│ │    ├─ name, email, role                                       │  │
│ │    ├─ approvalStatus                                          │  │
│ │    ├─ approvedBy ────> USER                                   │  │
│ │    ├─ rejectedBy ────> USER                                   │  │
│ │    ├─ checkedIn, checkedInAt                                  │  │
│ │    └─ checkInLocation, checkInPhoto                           │  │
│ └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  • createdAt (Date) *                                              │
│  • updatedAt (Date) *                                              │
└─────────────────────────────────────────────────────────────────────┘
         │
         │ 1
         │
         │ N
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         ATTENDANCE                                   │
│  FK • activityId ────> ACTIVITY._id                                 │
│  FK • userId ────> USER._id                                         │
│  UK (activityId, userId)                                            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📝 Ví Dụ Dữ Liệu

### **Single Day Activity**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "Hội thảo Kỹ năng Mềm",
  "description": "Hội thảo về kỹ năng giao tiếp và làm việc nhóm",
  "type": "single_day",
  "date": "2025-03-15T00:00:00.000Z",
  "location": "Hội trường A, TDMU",
  "locationData": {
    "lat": 10.9804,
    "lng": 106.6534,
    "address": "Hội trường A, Đại học Thủ Dầu Một",
    "radius": 100
  },
  "timeSlots": [
    {
      "id": "ts1",
      "name": "Buổi Sáng",
      "startTime": "08:00",
      "endTime": "11:30",
      "isActive": true,
      "activities": "Phần 1: Kỹ năng giao tiếp",
      "detailedLocation": "Hội trường A, Tầng 1"
    },
    {
      "id": "ts2",
      "name": "Buổi Chiều",
      "startTime": "14:00",
      "endTime": "17:00",
      "isActive": true,
      "activities": "Phần 2: Kỹ năng làm việc nhóm",
      "detailedLocation": "Hội trường A, Tầng 1"
    }
  ],
  "maxParticipants": 100,
  "visibility": "public",
  "status": "published",
  "responsiblePerson": "507f191e810c19729de860ea",
  "createdBy": "507f191e810c19729de860ea",
  "updatedBy": "507f191e810c19729de860ea",
  "participants": [
    {
      "userId": "507f1f77bcf86cd799439012",
      "name": "Nguyễn Văn A",
      "email": "1234567890123@student.tdmu.edu.vn",
      "role": "Người Tham Gia",
      "joinedAt": "2025-03-01T10:00:00.000Z",
      "approvalStatus": "approved",
      "approvedBy": "507f191e810c19729de860ea",
      "approvedAt": "2025-03-02T09:00:00.000Z",
      "checkedIn": false
    }
  ],
  "createdAt": "2025-02-20T10:00:00.000Z",
  "updatedAt": "2025-02-20T10:00:00.000Z"
}
```

### **Multiple Days Activity**
```json
{
  "_id": "507f1f77bcf86cd799439013",
  "name": "Trại Hè Sinh Viên 2025",
  "description": "Trại hè 3 ngày cho sinh viên",
  "type": "multiple_days",
  "startDate": "2025-07-01T00:00:00.000Z",
  "endDate": "2025-07-03T00:00:00.000Z",
  "location": "Khu du lịch Đầm Sen",
  "locationData": {
    "lat": 10.7769,
    "lng": 106.7009,
    "address": "Khu du lịch Đầm Sen, Quận 11, TP.HCM",
    "radius": 500
  },
  "schedule": [
    {
      "day": 1,
      "date": "2025-07-01T00:00:00.000Z",
      "activities": "Khởi động, Team building"
    },
    {
      "day": 2,
      "date": "2025-07-02T00:00:00.000Z",
      "activities": "Thi đấu thể thao, Gala dinner"
    },
    {
      "day": 3,
      "date": "2025-07-03T00:00:00.000Z",
      "activities": "Tổng kết, Trao giải"
    }
  ],
  "maxParticipants": 50,
  "visibility": "private",
  "status": "published",
  "responsiblePerson": "507f191e810c19729de860ea",
  "createdBy": "507f191e810c19729de860ea",
  "updatedBy": "507f191e810c19729de860ea",
  "participants": [],
  "createdAt": "2025-06-01T10:00:00.000Z",
  "updatedAt": "2025-06-01T10:00:00.000Z"
}
```

---

## ✅ Checklist Validation

Khi tạo/cập nhật Activity, cần kiểm tra:

- [ ] `name` có 5-200 ký tự
- [ ] `description` có 10-2000 ký tự
- [ ] `type` là 'single_day' hoặc 'multiple_days'
- [ ] Nếu `type='single_day'`:
  - [ ] Có `date` và `date` >= ngày hiện tại
  - [ ] Có `timeSlots[]` và ít nhất 1 buổi
- [ ] Nếu `type='multiple_days'`:
  - [ ] Có `startDate` và `startDate` >= ngày hiện tại
  - [ ] Có `endDate` và `endDate` > `startDate`
  - [ ] Có `schedule[]` và ít nhất 1 ngày
- [ ] `location` có tối đa 200 ký tự
- [ ] `responsiblePerson` có role phù hợp
- [ ] `maxParticipants` trong khoảng 1-1000 (nếu có)
- [ ] Số lượng `participants[]` <= `maxParticipants` (nếu có)
- [ ] `locationData.lat` trong khoảng [-90, 90] (nếu có)
- [ ] `locationData.lng` trong khoảng [-180, 180] (nếu có)
- [ ] `timeSlots[].startTime` < `timeSlots[].endTime` (nếu có)

---

**Tài liệu này cung cấp đầy đủ thông tin về entity ACTIVITY trong hệ thống! 🎉**

