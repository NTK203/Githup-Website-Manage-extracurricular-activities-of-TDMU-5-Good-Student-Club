# Thống Kê Use Cases - Admin (Quản Trị Hệ Thống)

## 📋 Tổng Quan
Tài liệu này thống kê đầy đủ các Use Cases cần vẽ cho Admin (SUPER_ADMIN, CLUB_LEADER) trong hệ thống quản lý hoạt động CLB Sinh viên 5 Tốt TDMU.

---

## 📊 Phân Loại Use Cases

### 1. 🔐 Xác Thực & Quản Lý Tài Khoản (Authentication & Account Management)

#### 1.1. Đăng Nhập (Login)
- **ID**: UC-ADMIN-001
- **Mô tả**: Admin đăng nhập vào hệ thống
- **Actor**: Admin (SUPER_ADMIN, CLUB_LEADER)
- **Pre-condition**: Admin có tài khoản hợp lệ
- **Main Flow**:
  1. Admin nhập email và mật khẩu
  2. Hệ thống xác thực thông tin
  3. Kiểm tra membership status
  4. Xác định effectiveRole và redirectUrl
  5. Tạo JWT token
  6. Điều hướng đến dashboard
- **Post-condition**: Admin đã đăng nhập thành công
- **Sequence Diagram**: ✅ Đã vẽ

#### 1.2. Đăng Xuất (Logout)
- **ID**: UC-ADMIN-002
- **Mô tả**: Admin đăng xuất khỏi hệ thống
- **Actor**: Admin
- **Pre-condition**: Admin đã đăng nhập
- **Main Flow**:
  1. Admin nhấn nút đăng xuất
  2. Xóa token khỏi localStorage
  3. Xóa user info khỏi state
  4. Điều hướng đến trang đăng nhập
- **Post-condition**: Admin đã đăng xuất
- **Sequence Diagram**: ❌ Chưa vẽ

#### 1.3. Xem Thông Tin Cá Nhân (View Profile)
- **ID**: UC-ADMIN-003
- **Mô tả**: Admin xem thông tin cá nhân
- **Actor**: Admin
- **Pre-condition**: Admin đã đăng nhập
- **Main Flow**:
  1. Admin truy cập trang profile
  2. Hệ thống hiển thị thông tin cá nhân
- **Post-condition**: Admin đã xem thông tin cá nhân
- **Sequence Diagram**: ❌ Chưa vẽ
- **Page**: `/admin/profile`

#### 1.4. Cập Nhật Thông Tin Cá Nhân (Update Profile)
- **ID**: UC-ADMIN-004
- **Mô tả**: Admin cập nhật thông tin cá nhân
- **Actor**: Admin
- **Pre-condition**: Admin đã đăng nhập
- **Main Flow**:
  1. Admin truy cập trang profile
  2. Admin chỉnh sửa thông tin
  3. Admin lưu thay đổi
  4. Hệ thống cập nhật thông tin
- **Post-condition**: Thông tin đã được cập nhật
- **Sequence Diagram**: ❌ Chưa vẽ
- **Page**: `/admin/profile`

---

### 2. 📅 Quản Lý Hoạt Động (Activity Management)

#### 2.1. Tạo Hoạt Động 1 Ngày (Create Single Day Activity)
- **ID**: UC-ADMIN-005
- **Mô tả**: Admin tạo hoạt động diễn ra trong 1 ngày
- **Actor**: Admin (CLUB_LEADER, SUPER_ADMIN)
- **Pre-condition**: Admin đã đăng nhập
- **Main Flow**:
  1. Admin truy cập trang tạo hoạt động
  2. Admin điền thông tin hoạt động
  3. Admin chọn địa điểm trên bản đồ
  4. Admin thêm time slots (Buổi Sáng/Chiều/Tối)
  5. Admin upload ảnh (nếu có)
  6. Admin thêm người tham gia
  7. Admin lưu hoạt động
- **Post-condition**: Hoạt động đã được tạo
- **Sequence Diagram**: ✅ Đã vẽ
- **Page**: `/admin/activities/create-single`

#### 2.2. Tạo Hoạt Động Nhiều Ngày (Create Multiple Days Activity)
- **ID**: UC-ADMIN-006
- **Mô tả**: Admin tạo hoạt động diễn ra nhiều ngày
- **Actor**: Admin
- **Pre-condition**: Admin đã đăng nhập
- **Main Flow**:
  1. Admin truy cập trang tạo hoạt động nhiều ngày
  2. Admin điền thông tin hoạt động
  3. Admin thiết lập lịch trình (schedule)
  4. Admin chọn địa điểm cho từng ngày
  5. Admin upload ảnh (nếu có)
  6. Admin lưu hoạt động
- **Post-condition**: Hoạt động đã được tạo
- **Sequence Diagram**: ❌ Chưa vẽ
- **Page**: `/admin/activities/create-multiple`

#### 2.3. Xem Danh Sách Hoạt Động (List Activities)
- **ID**: UC-ADMIN-007
- **Mô tả**: Admin xem danh sách tất cả hoạt động
- **Actor**: Admin
- **Pre-condition**: Admin đã đăng nhập
- **Main Flow**:
  1. Admin truy cập trang danh sách hoạt động
  2. Hệ thống hiển thị danh sách hoạt động
  3. Admin có thể phân trang, tìm kiếm, lọc
- **Post-condition**: Admin đã xem danh sách
- **Sequence Diagram**: ✅ Đã vẽ
- **Page**: `/admin/activities`

#### 2.4. Xem Chi Tiết Hoạt Động (View Activity Details)
- **ID**: UC-ADMIN-008
- **Mô tả**: Admin xem chi tiết một hoạt động
- **Actor**: Admin
- **Pre-condition**: Admin đã đăng nhập, hoạt động tồn tại
- **Main Flow**:
  1. Admin chọn hoạt động từ danh sách
  2. Hệ thống hiển thị chi tiết hoạt động
  3. Admin xem thông tin, người tham gia, điểm danh
- **Post-condition**: Admin đã xem chi tiết
- **Sequence Diagram**: ❌ Chưa vẽ
- **Page**: `/admin/activities/view/[id]`

#### 2.5. Chỉnh Sửa Hoạt Động (Edit Activity)
- **ID**: UC-ADMIN-009
- **Mô tả**: Admin chỉnh sửa thông tin hoạt động
- **Actor**: Admin
- **Pre-condition**: Admin đã đăng nhập, hoạt động tồn tại
- **Main Flow**:
  1. Admin chọn hoạt động cần chỉnh sửa
  2. Admin chỉnh sửa thông tin
  3. Admin lưu thay đổi
  4. Hệ thống cập nhật hoạt động
- **Post-condition**: Hoạt động đã được cập nhật
- **Sequence Diagram**: ❌ Chưa vẽ
- **Page**: `/admin/activities/create-single/[id]`

#### 2.6. Xóa Hoạt Động (Delete Activity)
- **ID**: UC-ADMIN-010
- **Mô tả**: Admin xóa hoạt động
- **Actor**: Admin
- **Pre-condition**: Admin đã đăng nhập, hoạt động tồn tại
- **Main Flow**:
  1. Admin chọn hoạt động cần xóa
  2. Admin xác nhận xóa
  3. Hệ thống xóa hoạt động
- **Post-condition**: Hoạt động đã được xóa
- **Sequence Diagram**: ❌ Chưa vẽ
- **API**: `DELETE /api/activities/[id]`

#### 2.7. Lọc Hoạt Động Theo Tiêu Chí (Filter Activities)
- **ID**: UC-ADMIN-011
- **Mô tả**: Admin lọc hoạt động theo các tiêu chí
- **Actor**: Admin
- **Pre-condition**: Admin đã đăng nhập
- **Main Flow**:
  1. Admin truy cập trang lọc hoạt động
  2. Admin chọn tiêu chí lọc (status, type, date, location)
  3. Hệ thống hiển thị kết quả lọc
- **Post-condition**: Admin đã lọc hoạt động
- **Sequence Diagram**: ❌ Chưa vẽ
- **Page**: `/admin/activities/filter`

#### 2.8. Xem Báo Cáo Hoạt Động (View Activity Reports)
- **ID**: UC-ADMIN-012
- **Mô tả**: Admin xem báo cáo thống kê hoạt động
- **Actor**: Admin
- **Pre-condition**: Admin đã đăng nhập
- **Main Flow**:
  1. Admin truy cập trang báo cáo
  2. Hệ thống hiển thị thống kê hoạt động
  3. Admin xem biểu đồ, số liệu thống kê
- **Post-condition**: Admin đã xem báo cáo
- **Sequence Diagram**: ❌ Chưa vẽ
- **Page**: `/admin/activities/reports`

#### 2.9. Duyệt Đăng Ký Tham Gia Hoạt Động (Approve Activity Registration)
- **ID**: UC-ADMIN-013
- **Mô tả**: Admin duyệt/từ chối đăng ký tham gia hoạt động
- **Actor**: Admin
- **Pre-condition**: Admin đã đăng nhập, có đăng ký chờ duyệt
- **Main Flow**:
  1. Admin xem danh sách đăng ký chờ duyệt
  2. Admin chọn đăng ký cần duyệt
  3. Admin duyệt hoặc từ chối
  4. Hệ thống cập nhật trạng thái
- **Post-condition**: Đăng ký đã được duyệt/từ chối
- **Sequence Diagram**: ✅ Đã vẽ
- **API**: `PATCH /api/activities/[id]/participants`

---

### 3. 👥 Quản Lý Thành Viên (Member Management)

#### 3.1. Xem Danh Sách Thành Viên CLB (List Club Members)
- **ID**: UC-ADMIN-014
- **Mô tả**: Admin xem danh sách tất cả thành viên CLB
- **Actor**: Admin
- **Pre-condition**: Admin đã đăng nhập
- **Main Flow**:
  1. Admin truy cập trang danh sách thành viên
  2. Hệ thống hiển thị danh sách thành viên
  3. Admin có thể tìm kiếm, lọc, phân trang
- **Post-condition**: Admin đã xem danh sách
- **Sequence Diagram**: ❌ Chưa vẽ
- **Page**: `/admin/members`

#### 3.2. Thêm Thành Viên Mới (Add New Member)
- **ID**: UC-ADMIN-015
- **Mô tả**: Admin thêm thành viên mới vào CLB
- **Actor**: Admin (CLUB_LEADER, SUPER_ADMIN)
- **Pre-condition**: Admin đã đăng nhập
- **Main Flow**:
  1. Admin truy cập trang thêm thành viên
  2. Admin điền thông tin thành viên
  3. Admin chọn role cho thành viên
  4. Admin lưu thông tin
  5. Hệ thống tạo User và Membership (ACTIVE)
- **Post-condition**: Thành viên đã được thêm
- **Sequence Diagram**: ✅ Đã vẽ
- **Page**: `/admin/members/add`

#### 3.3. Xem Chi Tiết Thành Viên (View Member Details)
- **ID**: UC-ADMIN-016
- **Mô tả**: Admin xem chi tiết thông tin thành viên
- **Actor**: Admin
- **Pre-condition**: Admin đã đăng nhập, thành viên tồn tại
- **Main Flow**:
  1. Admin chọn thành viên từ danh sách
  2. Hệ thống hiển thị chi tiết thành viên
  3. Admin xem thông tin, lịch sử hoạt động
- **Post-condition**: Admin đã xem chi tiết
- **Sequence Diagram**: ❌ Chưa vẽ
- **Page**: `/admin/members` (Modal)

#### 3.4. Chỉnh Sửa Thông Tin Thành Viên (Edit Member)
- **ID**: UC-ADMIN-017
- **Mô tả**: Admin chỉnh sửa thông tin thành viên
- **Actor**: Admin
- **Pre-condition**: Admin đã đăng nhập, thành viên tồn tại
- **Main Flow**:
  1. Admin chọn thành viên cần chỉnh sửa
  2. Admin chỉnh sửa thông tin
  3. Admin lưu thay đổi
  4. Hệ thống cập nhật thông tin
- **Post-condition**: Thông tin đã được cập nhật
- **Sequence Diagram**: ❌ Chưa vẽ
- **API**: `PUT /api/members/[id]`

#### 3.5. Xóa Thành Viên (Delete Member)
- **ID**: UC-ADMIN-018
- **Mô tả**: Admin xóa thành viên khỏi CLB
- **Actor**: Admin
- **Pre-condition**: Admin đã đăng nhập, thành viên tồn tại
- **Main Flow**:
  1. Admin chọn thành viên cần xóa
  2. Admin xác nhận xóa
  3. Hệ thống xóa thành viên
- **Post-condition**: Thành viên đã được xóa
- **Sequence Diagram**: ❌ Chưa vẽ
- **API**: `DELETE /api/members/[id]`

#### 3.6. Xét Duyệt Thành Viên CLB (Approve Membership)
- **ID**: UC-ADMIN-019
- **Mô tả**: Admin duyệt/từ chối đơn đăng ký tham gia CLB
- **Actor**: Admin (CLUB_LEADER, SUPER_ADMIN, CLUB_DEPUTY, CLUB_MEMBER)
- **Pre-condition**: Admin đã đăng nhập, có đơn đăng ký chờ duyệt
- **Main Flow**:
  1. Admin xem danh sách đơn đăng ký chờ duyệt
  2. Admin chọn đơn cần duyệt
  3. Admin duyệt hoặc từ chối (có thể nhập lý do)
  4. Hệ thống cập nhật membership status
  5. Hệ thống cập nhật User role (nếu duyệt)
- **Post-condition**: Đơn đăng ký đã được duyệt/từ chối
- **Sequence Diagram**: ✅ Đã vẽ
- **Page**: `/admin/memberships`

#### 3.7. Quản Lý Trạng Thái Thành Viên (Manage Member Status)
- **ID**: UC-ADMIN-020
- **Mô tả**: Admin quản lý trạng thái thành viên (ACTIVE, INACTIVE, REMOVED)
- **Actor**: Admin
- **Pre-condition**: Admin đã đăng nhập, thành viên tồn tại
- **Main Flow**:
  1. Admin truy cập trang quản lý trạng thái
  2. Admin xem danh sách thành viên và trạng thái
  3. Admin thay đổi trạng thái thành viên
  4. Hệ thống cập nhật membership status
- **Post-condition**: Trạng thái đã được cập nhật
- **Sequence Diagram**: ❌ Chưa vẽ
- **Page**: `/admin/members/status`
- **API**: `PATCH /api/memberships/[id]/status`

#### 3.8. Phân Quyền Thành Viên (Manage Member Permissions)
- **ID**: UC-ADMIN-021
- **Mô tả**: Admin phân quyền cho thành viên
- **Actor**: Admin
- **Pre-condition**: Admin đã đăng nhập, thành viên tồn tại
- **Main Flow**:
  1. Admin truy cập trang phân quyền
  2. Admin xem danh sách thành viên
  3. Admin thay đổi role/permissions cho thành viên
  4. Hệ thống cập nhật quyền
- **Post-condition**: Quyền đã được cập nhật
- **Sequence Diagram**: ❌ Chưa vẽ
- **Page**: `/admin/members/permissions`

---

### 4. ✅ Quản Lý Điểm Danh (Attendance Management)

#### 4.1. Xem Danh Sách Điểm Danh (View Attendance List)
- **ID**: UC-ADMIN-022
- **Mô tả**: Admin xem danh sách điểm danh của hoạt động
- **Actor**: Admin/Officer
- **Pre-condition**: Admin đã đăng nhập, hoạt động tồn tại
- **Main Flow**:
  1. Admin chọn hoạt động
  2. Hệ thống hiển thị danh sách điểm danh
  3. Admin xem thông tin điểm danh (thời gian, vị trí, ảnh, trạng thái)
- **Post-condition**: Admin đã xem danh sách
- **Sequence Diagram**: ❌ Chưa vẽ
- **Page**: `/officer/attendance/[activityId]`

#### 4.2. Duyệt Điểm Danh (Approve Attendance)
- **ID**: UC-ADMIN-023
- **Mô tả**: Admin duyệt/từ chối điểm danh
- **Actor**: Admin/Officer (CLUB_DEPUTY, CLUB_MEMBER, CLUB_LEADER, SUPER_ADMIN)
- **Pre-condition**: Admin đã đăng nhập, có điểm danh chờ duyệt
- **Main Flow**:
  1. Admin xem danh sách điểm danh chờ duyệt
  2. Admin xem thông tin điểm danh (ảnh, vị trí, thời gian)
  3. Admin nhập ghi chú (nếu cần)
  4. Admin duyệt hoặc từ chối
  5. Hệ thống cập nhật trạng thái điểm danh
- **Post-condition**: Điểm danh đã được duyệt/từ chối
- **Sequence Diagram**: ✅ Đã vẽ
- **API**: `PATCH /api/attendance/[id]/verify`

#### 4.3. Điểm Danh Thủ Công (Manual Check-in)
- **ID**: UC-ADMIN-024
- **Mô tả**: Admin điểm danh thủ công cho người tham gia
- **Actor**: Admin/Officer
- **Pre-condition**: Admin đã đăng nhập, hoạt động đang diễn ra
- **Main Flow**:
  1. Admin chọn hoạt động
  2. Admin chọn người tham gia cần điểm danh
  3. Admin nhập thông tin điểm danh (thời gian, buổi)
  4. Admin lưu điểm danh
  5. Hệ thống tạo bản ghi điểm danh
- **Post-condition**: Điểm danh đã được tạo
- **Sequence Diagram**: ❌ Chưa vẽ
- **API**: `POST /api/activities/[id]/attendance`

#### 4.4. Xem Báo Cáo Điểm Danh (View Attendance Report)
- **ID**: UC-ADMIN-025
- **Mô tả**: Admin xem báo cáo thống kê điểm danh
- **Actor**: Admin
- **Pre-condition**: Admin đã đăng nhập
- **Main Flow**:
  1. Admin truy cập trang báo cáo điểm danh
  2. Hệ thống hiển thị thống kê điểm danh
  3. Admin xem số liệu, biểu đồ
- **Post-condition**: Admin đã xem báo cáo
- **Sequence Diagram**: ❌ Chưa vẽ

---

### 5. 👤 Quản Lý Người Dùng (User Management)

#### 5.1. Xem Danh Sách Người Dùng (List Users)
- **ID**: UC-ADMIN-026
- **Mô tả**: Admin xem danh sách tất cả người dùng trong hệ thống
- **Actor**: Admin (SUPER_ADMIN, CLUB_LEADER)
- **Pre-condition**: Admin đã đăng nhập
- **Main Flow**:
  1. Admin truy cập trang quản lý người dùng
  2. Hệ thống hiển thị danh sách người dùng
  3. Admin có thể tìm kiếm, lọc, phân trang
- **Post-condition**: Admin đã xem danh sách
- **Sequence Diagram**: ❌ Chưa vẽ
- **Page**: `/admin/users`

#### 5.2. Xem Chi Tiết Người Dùng (View User Details)
- **ID**: UC-ADMIN-027
- **Mô tả**: Admin xem chi tiết thông tin người dùng
- **Actor**: Admin
- **Pre-condition**: Admin đã đăng nhập, người dùng tồn tại
- **Main Flow**:
  1. Admin chọn người dùng từ danh sách
  2. Hệ thống hiển thị chi tiết người dùng
  3. Admin xem thông tin, lịch sử hoạt động
- **Post-condition**: Admin đã xem chi tiết
- **Sequence Diagram**: ❌ Chưa vẽ
- **API**: `GET /api/users/[id]`

#### 5.3. Chỉnh Sửa Người Dùng (Edit User)
- **ID**: UC-ADMIN-028
- **Mô tả**: Admin chỉnh sửa thông tin người dùng
- **Actor**: Admin
- **Pre-condition**: Admin đã đăng nhập, người dùng tồn tại
- **Main Flow**:
  1. Admin chọn người dùng cần chỉnh sửa
  2. Admin chỉnh sửa thông tin
  3. Admin lưu thay đổi
  4. Hệ thống cập nhật thông tin
- **Post-condition**: Thông tin đã được cập nhật
- **Sequence Diagram**: ❌ Chưa vẽ
- **API**: `PUT /api/users/[id]`

#### 5.4. Xóa Người Dùng (Delete User)
- **ID**: UC-ADMIN-029
- **Mô tả**: Admin xóa người dùng khỏi hệ thống
- **Actor**: Admin
- **Pre-condition**: Admin đã đăng nhập, người dùng tồn tại
- **Main Flow**:
  1. Admin chọn người dùng cần xóa
  2. Admin xác nhận xóa
  3. Hệ thống xóa người dùng
- **Post-condition**: Người dùng đã được xóa
- **Sequence Diagram**: ❌ Chưa vẽ
- **API**: `DELETE /api/users/[id]`

---

### 6. 📧 Quản Lý Yêu Cầu Liên Hệ (Contact Request Management)

#### 6.1. Xem Danh Sách Yêu Cầu Liên Hệ (List Contact Requests)
- **ID**: UC-ADMIN-030
- **Mô tả**: Admin xem danh sách yêu cầu liên hệ từ người dùng
- **Actor**: Admin (SUPER_ADMIN, CLUB_LEADER)
- **Pre-condition**: Admin đã đăng nhập
- **Main Flow**:
  1. Admin truy cập trang quản lý yêu cầu liên hệ
  2. Hệ thống hiển thị danh sách yêu cầu
  3. Admin có thể lọc theo status, priority
- **Post-condition**: Admin đã xem danh sách
- **Sequence Diagram**: ❌ Chưa vẽ
- **Page**: `/admin/contact-requests`

#### 6.2. Xem Chi Tiết Yêu Cầu Liên Hệ (View Contact Request Details)
- **ID**: UC-ADMIN-031
- **Mô tả**: Admin xem chi tiết yêu cầu liên hệ
- **Actor**: Admin
- **Pre-condition**: Admin đã đăng nhập, yêu cầu tồn tại
- **Main Flow**:
  1. Admin chọn yêu cầu từ danh sách
  2. Hệ thống hiển thị chi tiết yêu cầu
  3. Admin xem thông tin, nội dung yêu cầu
- **Post-condition**: Admin đã xem chi tiết
- **Sequence Diagram**: ❌ Chưa vẽ
- **API**: `GET /api/contact/[id]`

#### 6.3. Cập Nhật Trạng Thái Yêu Cầu (Update Contact Request Status)
- **ID**: UC-ADMIN-032
- **Mô tả**: Admin cập nhật trạng thái yêu cầu liên hệ
- **Actor**: Admin
- **Pre-condition**: Admin đã đăng nhập, yêu cầu tồn tại
- **Main Flow**:
  1. Admin chọn yêu cầu cần cập nhật
  2. Admin cập nhật trạng thái (PENDING, IN_PROGRESS, RESOLVED, CLOSED)
  3. Admin thêm ghi chú (nếu cần)
  4. Admin lưu thay đổi
  5. Hệ thống cập nhật trạng thái
- **Post-condition**: Trạng thái đã được cập nhật
- **Sequence Diagram**: ❌ Chưa vẽ
- **API**: `PATCH /api/contact/[id]`

---

### 7. 📊 Dashboard & Báo Cáo (Dashboard & Reports)

#### 7.1. Xem Dashboard (View Dashboard)
- **ID**: UC-ADMIN-033
- **Mô tả**: Admin xem tổng quan hệ thống trên dashboard
- **Actor**: Admin
- **Pre-condition**: Admin đã đăng nhập
- **Main Flow**:
  1. Admin truy cập dashboard
  2. Hệ thống hiển thị thống kê tổng quan
  3. Admin xem số liệu, biểu đồ, hoạt động gần đây
- **Post-condition**: Admin đã xem dashboard
- **Sequence Diagram**: ❌ Chưa vẽ
- **Page**: `/admin/dashboard`

#### 7.2. Xem Thống Kê (View Statistics)
- **ID**: UC-ADMIN-034
- **Mô tả**: Admin xem thống kê chi tiết về hoạt động, thành viên, điểm danh
- **Actor**: Admin
- **Pre-condition**: Admin đã đăng nhập
- **Main Flow**:
  1. Admin truy cập trang thống kê
  2. Hệ thống hiển thị thống kê chi tiết
  3. Admin xem biểu đồ, số liệu
- **Post-condition**: Admin đã xem thống kê
- **Sequence Diagram**: ❌ Chưa vẽ
- **API**: `GET /api/users/stats`

---

### 8. ⚙️ Cài Đặt Hệ Thống (System Settings)

#### 8.1. Xem Cài Đặt (View Settings)
- **ID**: UC-ADMIN-035
- **Mô tả**: Admin xem cài đặt hệ thống
- **Actor**: Admin (SUPER_ADMIN)
- **Pre-condition**: Admin đã đăng nhập
- **Main Flow**:
  1. Admin truy cập trang cài đặt
  2. Hệ thống hiển thị các tùy chọn cài đặt
- **Post-condition**: Admin đã xem cài đặt
- **Sequence Diagram**: ❌ Chưa vẽ
- **Page**: `/admin/settings`

#### 8.2. Cập Nhật Cài Đặt (Update Settings)
- **ID**: UC-ADMIN-036
- **Mô tả**: Admin cập nhật cài đặt hệ thống
- **Actor**: Admin (SUPER_ADMIN)
- **Pre-condition**: Admin đã đăng nhập
- **Main Flow**:
  1. Admin truy cập trang cài đặt
  2. Admin chỉnh sửa cài đặt
  3. Admin lưu thay đổi
  4. Hệ thống cập nhật cài đặt
- **Post-condition**: Cài đặt đã được cập nhật
- **Sequence Diagram**: ❌ Chưa vẽ
- **Page**: `/admin/settings`

---

## 📈 Thống Kê Tổng Hợp

### Bảng Tổng Hợp Use Cases

| ID | Tên Use Case | Nhóm | Trạng Thái | Ưu Tiên | Sequence Diagram |
|---|---|---|---|---|---|
| UC-ADMIN-001 | Đăng Nhập | Xác Thực | ✅ Đã vẽ | 🔴 Cao | ✅ |
| UC-ADMIN-002 | Đăng Xuất | Xác Thực | ❌ Chưa vẽ | 🟢 Thấp | ❌ |
| UC-ADMIN-003 | Xem Thông Tin Cá Nhân | Xác Thực | ❌ Chưa vẽ | 🟢 Thấp | ❌ |
| UC-ADMIN-004 | Cập Nhật Thông Tin Cá Nhân | Xác Thực | ❌ Chưa vẽ | 🟢 Thấp | ❌ |
| UC-ADMIN-005 | Tạo Hoạt Động 1 Ngày | Hoạt Động | ✅ Đã vẽ | 🔴 Cao | ✅ |
| UC-ADMIN-006 | Tạo Hoạt Động Nhiều Ngày | Hoạt Động | ❌ Chưa vẽ | 🟡 Trung Bình | ❌ |
| UC-ADMIN-007 | Xem Danh Sách Hoạt Động | Hoạt Động | ✅ Đã vẽ | 🔴 Cao | ✅ |
| UC-ADMIN-008 | Xem Chi Tiết Hoạt Động | Hoạt Động | ❌ Chưa vẽ | 🟡 Trung Bình | ❌ |
| UC-ADMIN-009 | Chỉnh Sửa Hoạt Động | Hoạt Động | ❌ Chưa vẽ | 🟡 Trung Bình | ❌ |
| UC-ADMIN-010 | Xóa Hoạt Động | Hoạt Động | ❌ Chưa vẽ | 🟢 Thấp | ❌ |
| UC-ADMIN-011 | Lọc Hoạt Động Theo Tiêu Chí | Hoạt Động | ❌ Chưa vẽ | 🟢 Thấp | ❌ |
| UC-ADMIN-012 | Xem Báo Cáo Hoạt Động | Hoạt Động | ❌ Chưa vẽ | 🟢 Thấp | ❌ |
| UC-ADMIN-013 | Duyệt Đăng Ký Tham Gia Hoạt Động | Hoạt Động | ✅ Đã vẽ | 🔴 Cao | ✅ |
| UC-ADMIN-014 | Xem Danh Sách Thành Viên CLB | Thành Viên | ❌ Chưa vẽ | 🟡 Trung Bình | ❌ |
| UC-ADMIN-015 | Thêm Thành Viên Mới | Thành Viên | ✅ Đã vẽ | 🔴 Cao | ✅ |
| UC-ADMIN-016 | Xem Chi Tiết Thành Viên | Thành Viên | ❌ Chưa vẽ | 🟡 Trung Bình | ❌ |
| UC-ADMIN-017 | Chỉnh Sửa Thông Tin Thành Viên | Thành Viên | ❌ Chưa vẽ | 🟡 Trung Bình | ❌ |
| UC-ADMIN-018 | Xóa Thành Viên | Thành Viên | ❌ Chưa vẽ | 🟢 Thấp | ❌ |
| UC-ADMIN-019 | Xét Duyệt Thành Viên CLB | Thành Viên | ✅ Đã vẽ | 🔴 Cao | ✅ |
| UC-ADMIN-020 | Quản Lý Trạng Thái Thành Viên | Thành Viên | ❌ Chưa vẽ | 🟡 Trung Bình | ❌ |
| UC-ADMIN-021 | Phân Quyền Thành Viên | Thành Viên | ❌ Chưa vẽ | 🟢 Thấp | ❌ |
| UC-ADMIN-022 | Xem Danh Sách Điểm Danh | Điểm Danh | ❌ Chưa vẽ | 🟡 Trung Bình | ❌ |
| UC-ADMIN-023 | Duyệt Điểm Danh | Điểm Danh | ✅ Đã vẽ | 🔴 Cao | ✅ |
| UC-ADMIN-024 | Điểm Danh Thủ Công | Điểm Danh | ❌ Chưa vẽ | 🟢 Thấp | ❌ |
| UC-ADMIN-025 | Xem Báo Cáo Điểm Danh | Điểm Danh | ❌ Chưa vẽ | 🟢 Thấp | ❌ |
| UC-ADMIN-026 | Xem Danh Sách Người Dùng | Người Dùng | ❌ Chưa vẽ | 🟢 Thấp | ❌ |
| UC-ADMIN-027 | Xem Chi Tiết Người Dùng | Người Dùng | ❌ Chưa vẽ | 🟢 Thấp | ❌ |
| UC-ADMIN-028 | Chỉnh Sửa Người Dùng | Người Dùng | ❌ Chưa vẽ | 🟢 Thấp | ❌ |
| UC-ADMIN-029 | Xóa Người Dùng | Người Dùng | ❌ Chưa vẽ | 🟢 Thấp | ❌ |
| UC-ADMIN-030 | Xem Danh Sách Yêu Cầu Liên Hệ | Liên Hệ | ❌ Chưa vẽ | 🟢 Thấp | ❌ |
| UC-ADMIN-031 | Xem Chi Tiết Yêu Cầu Liên Hệ | Liên Hệ | ❌ Chưa vẽ | 🟢 Thấp | ❌ |
| UC-ADMIN-032 | Cập Nhật Trạng Thái Yêu Cầu | Liên Hệ | ❌ Chưa vẽ | 🟢 Thấp | ❌ |
| UC-ADMIN-033 | Xem Dashboard | Dashboard | ❌ Chưa vẽ | 🟡 Trung Bình | ❌ |
| UC-ADMIN-034 | Xem Thống Kê | Dashboard | ❌ Chưa vẽ | 🟢 Thấp | ❌ |
| UC-ADMIN-035 | Xem Cài Đặt | Cài Đặt | ❌ Chưa vẽ | 🟢 Thấp | ❌ |
| UC-ADMIN-036 | Cập Nhật Cài Đặt | Cài Đặt | ❌ Chưa vẽ | 🟢 Thấp | ❌ |

### Theo Trạng Thái Sequence Diagram
- ✅ **Đã vẽ**: 7 use cases (19.4%)
- ❌ **Chưa vẽ**: 29 use cases (80.6%)
- **Tổng cộng**: 36 use cases

### Theo Nhóm Chức Năng
1. **Xác Thực & Quản Lý Tài Khoản**: 4 use cases (1 đã vẽ, 3 chưa vẽ)
2. **Quản Lý Hoạt Động**: 9 use cases (3 đã vẽ, 6 chưa vẽ)
3. **Quản Lý Thành Viên**: 8 use cases (2 đã vẽ, 6 chưa vẽ)
4. **Quản Lý Điểm Danh**: 4 use cases (1 đã vẽ, 3 chưa vẽ)
5. **Quản Lý Người Dùng**: 4 use cases (0 đã vẽ, 4 chưa vẽ)
6. **Quản Lý Yêu Cầu Liên Hệ**: 3 use cases (0 đã vẽ, 3 chưa vẽ)
7. **Dashboard & Báo Cáo**: 2 use cases (0 đã vẽ, 2 chưa vẽ)
8. **Cài Đặt Hệ Thống**: 2 use cases (0 đã vẽ, 2 chưa vẽ)

### Theo Mức Độ Ưu Tiên

#### 🔴 Ưu Tiên Cao (High Priority)
1. UC-ADMIN-001: Đăng Nhập ✅
2. UC-ADMIN-005: Tạo Hoạt Động 1 Ngày ✅
3. UC-ADMIN-015: Thêm Thành Viên Mới ✅
4. UC-ADMIN-019: Xét Duyệt Thành Viên CLB ✅
5. UC-ADMIN-013: Duyệt Đăng Ký Tham Gia Hoạt Động ✅
6. UC-ADMIN-023: Duyệt Điểm Danh ✅
7. UC-ADMIN-007: Xem Danh Sách Hoạt Động ✅

#### 🟡 Ưu Tiên Trung Bình (Medium Priority)
1. UC-ADMIN-006: Tạo Hoạt Động Nhiều Ngày
2. UC-ADMIN-008: Xem Chi Tiết Hoạt Động
3. UC-ADMIN-009: Chỉnh Sửa Hoạt Động
4. UC-ADMIN-014: Xem Danh Sách Thành Viên CLB
5. UC-ADMIN-016: Xem Chi Tiết Thành Viên
6. UC-ADMIN-017: Chỉnh Sửa Thông Tin Thành Viên
7. UC-ADMIN-020: Quản Lý Trạng Thái Thành Viên
8. UC-ADMIN-022: Xem Danh Sách Điểm Danh
9. UC-ADMIN-033: Xem Dashboard

#### 🟢 Ưu Tiên Thấp (Low Priority)
1. UC-ADMIN-002: Đăng Xuất
2. UC-ADMIN-003: Xem Thông Tin Cá Nhân
3. UC-ADMIN-004: Cập Nhật Thông Tin Cá Nhân
4. UC-ADMIN-010: Xóa Hoạt Động
5. UC-ADMIN-011: Lọc Hoạt Động Theo Tiêu Chí
6. UC-ADMIN-012: Xem Báo Cáo Hoạt Động
7. UC-ADMIN-018: Xóa Thành Viên
8. UC-ADMIN-021: Phân Quyền Thành Viên
9. UC-ADMIN-024: Điểm Danh Thủ Công
10. UC-ADMIN-025: Xem Báo Cáo Điểm Danh
11. UC-ADMIN-026: Xem Danh Sách Người Dùng
12. UC-ADMIN-027: Xem Chi Tiết Người Dùng
13. UC-ADMIN-028: Chỉnh Sửa Người Dùng
14. UC-ADMIN-029: Xóa Người Dùng
15. UC-ADMIN-030: Xem Danh Sách Yêu Cầu Liên Hệ
16. UC-ADMIN-031: Xem Chi Tiết Yêu Cầu Liên Hệ
17. UC-ADMIN-032: Cập Nhật Trạng Thái Yêu Cầu
18. UC-ADMIN-034: Xem Thống Kê
19. UC-ADMIN-035: Xem Cài Đặt
20. UC-ADMIN-036: Cập Nhật Cài Đặt

---

## 📝 Ghi Chú

1. **Sequence Diagrams đã vẽ** được đánh dấu ✅ trong file `SEQUENCE_DIAGRAMS_ADMIN.md`
2. **Các use case chưa vẽ** cần được bổ sung theo thứ tự ưu tiên
3. **Mỗi use case** nên có:
   - Sequence Diagram chi tiết
   - Mô tả luồng xử lý
   - Các API endpoints liên quan
   - Các trang (pages) liên quan
4. **Các use case có thể được nhóm lại** thành các nhóm chức năng lớn hơn

---

**Tài liệu này cung cấp danh sách đầy đủ các Use Cases cần vẽ cho Admin! 🎉**

