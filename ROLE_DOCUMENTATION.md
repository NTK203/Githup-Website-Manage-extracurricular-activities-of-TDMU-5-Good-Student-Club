# Phân Biệt Roles trong Hệ Thống

## Tổng Quan về Roles

Hệ thống quản lý câu lạc bộ sử dụng 7 loại roles để phân quyền:

### 1. **SUPER_ADMIN** - Siêu Quản Trị Viên
- **Mô tả**: Quản trị viên cấp cao nhất của hệ thống
- **Quyền hạn**: 
  - Quản lý toàn bộ hệ thống
  - Quản lý tất cả các tài khoản
  - Tạo và quản lý ADMIN
  - Tất cả quyền của ADMIN

### 2. **ADMIN** - Quản Trị Viên Hệ Thống
- **Mô tả**: Quản trị viên hệ thống
- **Quyền hạn**:
  - Quản lý câu lạc bộ
  - Quản lý hoạt động
  - Quản lý tài khoản người dùng
  - Phê duyệt/bác bỏ yêu cầu tham gia câu lạc bộ
  - Tạo và quản lý cán bộ phụ trách (OFFICER)

**Phân loại ADMIN:**
- `isAdmin(user)` → Kiểm tra `SUPER_ADMIN` hoặc `ADMIN`
- Dashboard: `/admin/dashboard`

### 3. **OFFICER** - Cán Bộ Phụ Trách Câu Lạc Bộ
Có 3 cấp độ cán bộ:

#### a. **CLUB_LEADER** - Trưởng Câu Lạc Bộ
- **Mô tả**: Lãnh đạo câu lạc bộ
- **Quyền hạn**:
  - Quản lý toàn bộ hoạt động của câu lạc bộ
  - Phê duyệt/bác bỏ yêu cầu tham gia
  - Quản lý cán bộ phụ trách (CLUB_DEPUTY, CLUB_MEMBER)
  - Tạo và quản lý hoạt động

#### b. **CLUB_DEPUTY** - Phó Câu Lạc Bộ
- **Mô tả**: Phó trưởng câu lạc bộ
- **Quyền hạn**:
  - Quản lý hoạt động của câu lạc bộ
  - Phê duyệt/bác bỏ yêu cầu tham gia
  - Quản lý thành viên
  - Tạo và quản lý hoạt động

#### c. **CLUB_MEMBER** - Thành Viên Ban Điều Hành
- **Mô tả**: Thành viên ban điều hành câu lạc bộ
- **Quyền hạn**:
  - Quản lý một số hoạt động
  - Theo dõi và quản lý thành viên
  - Tạo hoạt động (có thể cần phê duyệt)

**Phân loại OFFICER:**
- `isOfficer(user)` → Kiểm tra `CLUB_LEADER`, `CLUB_DEPUTY`, hoặc `CLUB_MEMBER`
- Dashboard: `/officer/dashboard`

### 4. **STUDENT** - Thành Viên và Người Tham Gia
Có 2 loại:

#### a. **CLUB_STUDENT** - Thành Viên Câu Lạc Bộ
- **Mô tả**: Thành viên chính thức của câu lạc bộ
- **Quyền hạn**:
  - Đăng ký tham gia hoạt động
  - Xem thông tin câu lạc bộ
  - Tạo yêu cầu tham gia hoạt động
  - Tham gia các hoạt động của câu lạc bộ

#### b. **STUDENT** - Người Tham Gia
- **Mô tả**: Sinh viên đăng ký tham gia các hoạt động
- **Quyền hạn**:
  - Xem các hoạt động công khai
  - Đăng ký tham gia hoạt động
  - Yêu cầu tham gia câu lạc bộ

**Phân loại STUDENT:**
- `isStudent(user)` → Kiểm tra `CLUB_STUDENT` hoặc `STUDENT`
- Dashboard: `/student/dashboard`

## Phân Loại Tổng Quan

### ADMIN (Quản Trị)
```typescript
Roles: SUPER_ADMIN, ADMIN, CLUB_LEADER
Function: isAdmin(user) → true nếu SUPER_ADMIN, ADMIN, hoặc CLUB_LEADER
Access: /admin/*
```

### OFFICER (Cán Bộ Phụ Trách)
```typescript
Roles: CLUB_DEPUTY, CLUB_MEMBER
Note: CLUB_LEADER thuộc ADMIN nên không thuộc OFFICER nữa
Function: isOfficer(user) → true nếu CLUB_DEPUTY hoặc CLUB_MEMBER
Access: /officer/*
```

### STUDENT (Thành Viên/Sinh Viên)
```typescript
Roles: CLUB_STUDENT, STUDENT
Function: isStudent(user) → true nếu CLUB_STUDENT hoặc STUDENT
Access: /student/*
```

## Cấu Trúc Role Hierarchy

```
SUPER_ADMIN (Level 7)
    ↓
ADMIN (Level 6)
    ↓
CLUB_LEADER (Level 5)
    ↓
CLUB_DEPUTY (Level 4)
    ↓
CLUB_MEMBER (Level 3)
    ↓
CLUB_STUDENT (Level 2)
    ↓
STUDENT (Level 1)
```

## Helper Functions trong `src/lib/auth.ts`

### 1. `isAdmin(user: JWTPayload | null): boolean`
- Kiểm tra nếu user là `SUPER_ADMIN`, `ADMIN`, hoặc `CLUB_LEADER`
- **Note**: `CLUB_LEADER` được coi là ADMIN vì có quyền quản lý câu lạc bộ

### 2. `isOfficer(user: JWTPayload | null): boolean`
- Kiểm tra nếu user là `CLUB_DEPUTY` hoặc `CLUB_MEMBER`
- **Note**: `CLUB_LEADER` không thuộc OFFICER vì được coi là ADMIN

### 3. `isStudent(user: JWTPayload | null): boolean`
- Kiểm tra nếu user là `CLUB_STUDENT` hoặc `STUDENT`

### 4. `hasRole(user: JWTPayload | null, requiredRole: UserRole): boolean`
- Kiểm tra nếu user có role đủ quyền (theo hierarchy)
- Ví dụ: `hasRole(user, 'CLUB_LEADER')` → true nếu user là CLUB_LEADER trở lên

## Cách Sử Dụng

### Trong API Routes
```typescript
import { getUserFromRequest, isAdmin, isOfficer, isStudent } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request);
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Kiểm tra ADMIN (bao gồm SUPER_ADMIN, ADMIN, CLUB_LEADER)
  if (isAdmin(user)) {
    // Logic cho admin
  }
  
  // Kiểm tra OFFICER
  if (isOfficer(user)) {
    // Logic cho officer
  }
  
  // Kiểm tra STUDENT
  if (isStudent(user)) {
    // Logic cho student
  }
}
```

### Trong Client Components
```typescript
'use client';

import { useAuth } from '@/hooks/useAuth';

export default function MyComponent() {
  const { user } = useAuth();
  
  if (!user) return null;
  
  // Kiểm tra role
  const isUserAdmin = user.role === 'SUPER_ADMIN' || user.role === 'ADMIN';
  const isUserOfficer = ['CLUB_LEADER', 'CLUB_DEPUTY', 'CLUB_MEMBER'].includes(user.role);
  const isUserStudent = user.role === 'CLUB_STUDENT' || user.role === 'STUDENT';
  
  return (
    <div>
      {isUserAdmin && <AdminContent />}
      {isUserOfficer && <OfficerContent />}
      {isUserStudent && <StudentContent />}
    </div>
  );
}
```

## Lưu Ý Quan Trọng

1. **SUPER_ADMIN vs ADMIN**: 
   - Hiện tại `isAdmin()` chỉ kiểm tra `SUPER_ADMIN`
   - Cần kiểm tra thêm `ADMIN` nếu cần

2. **Role Hierarchy**:
   - Role cao hơn có thể thực hiện các quyền của role thấp hơn
   - Sử dụng `hasRole()` để kiểm tra quyền theo hierarchy

3. **Dashboard Routing**:
   - `/admin/*` → SUPER_ADMIN, ADMIN, CLUB_LEADER
   - `/officer/*` → CLUB_DEPUTY, CLUB_MEMBER
   - `/student/*` → CLUB_STUDENT, STUDENT

4. **Security**:
   - Luôn kiểm tra role ở cả server-side (API) và client-side (UI)
   - Không tin tưởng hoàn toàn vào client-side checks

