# Use Cases Chi Tiết - Admin (Quản Trị Hệ Thống)

## 📋 Tổng Quan
Tài liệu này mô tả chi tiết các Use Cases của Admin dưới dạng bảng, bao gồm đầy đủ thông tin về luồng xử lý, quy tắc nghiệp vụ và yêu cầu phi chức năng.

---

## 1. 🔐 Xác Thực & Quản Lý Tài Khoản

### UC-ADMIN-001: Đăng Nhập (Login)

| Mục | Nội dung mô tả |
|-----|----------------|
| **Tên Use Case** | Đăng Nhập (Login) |
| **Mô tả** | Admin đăng nhập vào hệ thống bằng email và mật khẩu. Hệ thống xác thực thông tin, kiểm tra membership status, xác định effectiveRole và redirectUrl, tạo JWT token, và điều hướng đến dashboard phù hợp. |
| **Tác nhân (Actor)** | Admin (SUPER_ADMIN, CLUB_LEADER) |
| **Điều kiện tiên quyết** | - Admin có tài khoản hợp lệ trong hệ thống<br>- Admin có email và mật khẩu đúng<br>- Hệ thống đang hoạt động |
| **Điều kiện sau** | - Admin đã đăng nhập thành công<br>- JWT token đã được tạo và lưu<br>- Admin được điều hướng đến dashboard phù hợp<br>- Auth state đã được cập nhật |
| **Luồng cơ bản** | 1. Admin truy cập trang đăng nhập<br>2. Admin nhập email và mật khẩu<br>3. Admin nhấn nút "Đăng nhập"<br>4. Hệ thống validate input (email, password không rỗng)<br>5. Hệ thống tìm user theo email (exclude isDeleted)<br>6. Hệ thống so sánh mật khẩu với bcrypt.compare()<br>7. Hệ thống tạo JWT token (expiresIn: 7d)<br>8. Hệ thống tìm membership mới nhất theo userId<br>9. Hệ thống xác định effectiveRole và redirectUrl dựa trên user.role và membership.status<br>10. Hệ thống trả về response với user, token, redirectUrl, effectiveRole<br>11. Frontend lưu token vào localStorage<br>12. Frontend cập nhật auth state<br>13. Frontend điều hướng đến redirectUrl |
| **Luồng thay thế** | **3a. Email hoặc mật khẩu không đúng**<br>- Hệ thống trả về lỗi "Email hoặc mật khẩu không đúng"<br>- Admin có thể nhập lại thông tin<br><br>**3b. User không tồn tại**<br>- Hệ thống trả về lỗi "Email hoặc mật khẩu không đúng"<br>- Admin có thể nhập lại thông tin<br><br>**3c. Membership status là REMOVED**<br>- Hệ thống downgrade effectiveRole thành STUDENT (trừ CLUB_LEADER)<br>- RedirectUrl được đặt thành /student/dashboard<br><br>**3d. Token hết hạn hoặc không hợp lệ**<br>- Hệ thống yêu cầu đăng nhập lại |
| **Quy tắc nghiệp vụ** | - Email phải đúng định dạng và tồn tại trong hệ thống<br>- Mật khẩu phải khớp với passwordHash trong database<br>- JWT token có thời hạn 7 ngày<br>- EffectiveRole được xác định dựa trên user.role và membership.status<br>- Nếu membership.status === 'REMOVED':<br>  - CLUB_DEPUTY, CLUB_MEMBER, CLUB_STUDENT → effectiveRole = 'STUDENT'<br>  - CLUB_LEADER → giữ nguyên role (admin access)<br>- RedirectUrl được xác định:<br>  - SUPER_ADMIN, CLUB_LEADER → /admin/dashboard<br>  - CLUB_DEPUTY, CLUB_MEMBER → /officer/dashboard<br>  - CLUB_STUDENT, STUDENT → /student/dashboard |
| **Yêu cầu phi chức năng** | - Thời gian phản hồi: < 2 giây<br>- Bảo mật: Mật khẩu được hash bằng bcrypt (saltRounds: 12)<br>- JWT token được mã hóa và ký bằng JWT_SECRET<br>- Token được lưu trong localStorage (có thể xem xét httpOnly cookie)<br>- Hệ thống phải xử lý được đồng thời nhiều request đăng nhập |

---

### UC-ADMIN-002: Đăng Xuất (Logout)

| Mục | Nội dung mô tả |
|-----|----------------|
| **Tên Use Case** | Đăng Xuất (Logout) |
| **Mô tả** | Admin đăng xuất khỏi hệ thống. Hệ thống xóa token, xóa user info khỏi state, và điều hướng đến trang đăng nhập. |
| **Tác nhân (Actor)** | Admin |
| **Điều kiện tiên quyết** | - Admin đã đăng nhập<br>- Token còn hiệu lực |
| **Điều kiện sau** | - Token đã được xóa khỏi localStorage<br>- User info đã được xóa khỏi state<br>- Admin đã được điều hướng đến trang đăng nhập |
| **Luồng cơ bản** | 1. Admin nhấn nút "Đăng xuất"<br>2. Frontend xóa token khỏi localStorage<br>3. Frontend xóa user info khỏi auth state<br>4. Frontend điều hướng đến trang đăng nhập |
| **Luồng thay thế** | **2a. Token không tồn tại**<br>- Frontend vẫn thực hiện xóa state và điều hướng<br><br>**2b. Lỗi khi xóa token**<br>- Frontend vẫn thực hiện xóa state và điều hướng |
| **Quy tắc nghiệp vụ** | - Token phải được xóa khỏi localStorage<br>- User info phải được xóa khỏi auth state<br>- Admin phải được điều hướng đến trang đăng nhập<br>- Không cần gọi API để invalidate token (JWT là stateless) |
| **Yêu cầu phi chức năng** | - Thời gian phản hồi: < 500ms<br>- Không cần kết nối server<br>- Xóa sạch dữ liệu local |

---

## 2. 📅 Quản Lý Hoạt Động

### UC-ADMIN-005: Tạo Hoạt Động 1 Ngày (Create Single Day Activity)

| Mục | Nội dung mô tả |
|-----|----------------|
| **Tên Use Case** | Tạo Hoạt Động 1 Ngày (Create Single Day Activity) |
| **Mô tả** | Admin tạo hoạt động diễn ra trong 1 ngày với thông tin chi tiết về tên, mô tả, ngày, địa điểm, time slots, người tham gia, và ảnh đại diện. |
| **Tác nhân (Actor)** | Admin (CLUB_LEADER, SUPER_ADMIN) |
| **Điều kiện tiên quyết** | - Admin đã đăng nhập<br>- Admin có quyền tạo hoạt động (CLUB_LEADER, SUPER_ADMIN)<br>- Hệ thống đang hoạt động |
| **Điều kiện sau** | - Hoạt động đã được tạo thành công<br>- Hoạt động đã được lưu vào database<br>- Ảnh đã được upload lên Cloudinary (nếu có)<br>- Form đã được reset (nếu tạo mới) |
| **Luồng cơ bản** | 1. Admin truy cập trang tạo hoạt động (/admin/activities/create-single)<br>2. Admin điền thông tin hoạt động (tên, mô tả, ngày, người phụ trách)<br>3. Admin chọn địa điểm trên bản đồ (OpenStreetMap) hoặc nhập địa điểm<br>4. Admin thiết lập time slots (Buổi Sáng/Chiều/Tối) với thời gian và hoạt động<br>5. Admin upload ảnh đại diện (nếu có)<br>6. Admin thêm người tham gia (nếu có)<br>7. Admin nhấn nút "Lưu"<br>8. Frontend validate dữ liệu đầu vào<br>9. Nếu có ảnh: Frontend upload ảnh lên Cloudinary<br>10. Frontend gửi POST request đến /api/activities<br>11. Backend validate dữ liệu<br>12. Backend kiểm tra quyền (JWT token, role)<br>13. Backend kiểm tra responsiblePerson role<br>14. Backend tạo Activity object<br>15. Backend lưu Activity vào database<br>16. Backend trả về response<br>17. Frontend hiển thị thông báo thành công<br>18. Frontend reset form (nếu tạo mới) |
| **Luồng thay thế** | **7a. Dữ liệu không hợp lệ**<br>- Frontend hiển thị lỗi validation<br>- Admin có thể sửa lại thông tin<br><br>**7b. Không có time slot nào được kích hoạt**<br>- Frontend hiển thị lỗi "Phải có ít nhất một buổi được kích hoạt"<br>- Admin phải kích hoạt ít nhất một time slot<br><br>**7c. Không có địa điểm**<br>- Frontend hiển thị lỗi "Vui lòng chọn địa điểm trên bản đồ"<br>- Admin phải chọn địa điểm<br><br>**7d. Upload ảnh thất bại**<br>- Frontend hiển thị lỗi "Lỗi khi tải ảnh lên Cloudinary"<br>- Admin có thể thử lại hoặc bỏ qua ảnh<br><br>**10a. Không có quyền**<br>- Backend trả về lỗi 401 Unauthorized<br>- Frontend hiển thị thông báo lỗi<br><br>**10b. Validation thất bại ở backend**<br>- Backend trả về lỗi 400 với danh sách lỗi<br>- Frontend hiển thị lỗi validation<br><br>**10c. Lỗi server**<br>- Backend trả về lỗi 500<br>- Frontend hiển thị thông báo lỗi chung |
| **Quy tắc nghiệp vụ** | - Tên hoạt động: Bắt buộc, 5-200 ký tự<br>- Mô tả: Bắt buộc, 10-2000 ký tự<br>- Ngày: Bắt buộc, phải là Date hợp lệ<br>- Địa điểm: Bắt buộc (locationData hoặc form.location)<br>- Time slots: Phải có ít nhất một buổi được kích hoạt<br>- Người phụ trách: Bắt buộc, phải là User hợp lệ<br>- Ảnh: Tùy chọn, max 10MB, chỉ định dạng image/*<br>- Visibility: 'public' hoặc 'private'<br>- Status: 'draft', 'published', 'ongoing', 'completed', 'cancelled', 'postponed'<br>- Type: 'single_day'<br>- LocationData: {lat, lng, address, radius} (nếu single location)<br>- MultiTimeLocations: Array of {timeSlot, location, radius} (nếu multi-time location)<br>- TimeSlots: Array of {id, name, startTime, endTime, isActive, activities, detailedLocation}<br>- Participants: Array of {userId, name, email, role}<br>- CreatedBy: Admin user ID<br>- UpdatedBy: Admin user ID |
| **Yêu cầu phi chức năng** | - Thời gian phản hồi: < 3 giây (không có ảnh), < 10 giây (có ảnh)<br>- Upload ảnh: Hỗ trợ tối đa 10MB, format: JPG, PNG, WebP<br>- Bản đồ: Sử dụng OpenStreetMap, hỗ trợ chọn địa điểm bằng click<br>- Validation: Frontend và Backend đều validate<br>- Bảo mật: Chỉ CLUB_LEADER và SUPER_ADMIN mới có quyền tạo<br>- Database: Sử dụng MongoDB, transaction nếu cần |

---

### UC-ADMIN-007: Xem Danh Sách Hoạt Động (List Activities)

| Mục | Nội dung mô tả |
|-----|----------------|
| **Tên Use Case** | Xem Danh Sách Hoạt Động (List Activities) |
| **Mô tả** | Admin xem danh sách tất cả hoạt động trong hệ thống với khả năng phân trang, tìm kiếm, và lọc theo các tiêu chí. |
| **Tác nhân (Actor)** | Admin |
| **Điều kiện tiên quyết** | - Admin đã đăng nhập<br>- Hệ thống đang hoạt động |
| **Điều kiện sau** | - Admin đã xem danh sách hoạt động<br>- Danh sách đã được hiển thị với phân trang |
| **Luồng cơ bản** | 1. Admin truy cập trang danh sách hoạt động (/admin/activities)<br>2. Frontend gửi GET request đến /api/activities với query parameters (page, limit, status, type, search)<br>3. Backend kiểm tra xác thực (JWT token)<br>4. Backend parse query parameters<br>5. Backend build filter object<br>6. Backend tìm Activities với filter và pagination<br>7. Backend populate responsiblePerson và createdBy<br>8. Backend đếm total activities với filter<br>9. Backend tính toán pagination info (totalPages, hasNextPage, hasPrevPage)<br>10. Backend trả về response với activities và pagination<br>11. Frontend hiển thị danh sách hoạt động<br>12. Admin có thể phân trang, tìm kiếm, lọc |
| **Luồng thay thế** | **2a. Không có quyền**<br>- Backend trả về lỗi 401 Unauthorized<br>- Frontend hiển thị thông báo lỗi<br><br>**6a. Không tìm thấy hoạt động**<br>- Backend trả về danh sách rỗng<br>- Frontend hiển thị "Không có hoạt động nào"<br><br>**12a. Admin lọc theo tiêu chí**<br>- Frontend cập nhật URL với query parameters<br>- Frontend gửi lại GET request với filter mới<br>- Backend trả về kết quả lọc<br>- Frontend cập nhật UI |
| **Quy tắc nghiệp vụ** | - Pagination: Mặc định page=1, limit=10<br>- Filter theo status: 'draft', 'published', 'ongoing', 'completed', 'cancelled', 'postponed', 'all'<br>- Filter theo type: 'single_day', 'multiple_days', 'all'<br>- Search: Tìm kiếm theo name, description, location (case-insensitive)<br>- Sort: Mặc định sort theo createdAt (descending)<br>- Populate: responsiblePerson (name, email), createdBy (name, email)<br>- Response: {success, data: {activities, pagination}} |
| **Yêu cầu phi chức năng** | - Thời gian phản hồi: < 2 giây<br>- Pagination: Hỗ trợ tối đa 100 items per page<br>- Search: Hỗ trợ tìm kiếm real-time (có thể debounce)<br>- Cache: Có thể cache kết quả tìm kiếm (nếu cần)<br>- Performance: Sử dụng index trên database cho các trường tìm kiếm |

---

### UC-ADMIN-013: Duyệt Đăng Ký Tham Gia Hoạt Động (Approve Activity Registration)

| Mục | Nội dung mô tả |
|-----|----------------|
| **Tên Use Case** | Duyệt Đăng Ký Tham Gia Hoạt Động (Approve Activity Registration) |
| **Mô tả** | Admin duyệt hoặc từ chối đăng ký tham gia hoạt động của sinh viên. Hệ thống cập nhật trạng thái approvalStatus trong Activity.participants. |
| **Tác nhân (Actor)** | Admin/Officer (CLUB_LEADER, SUPER_ADMIN, CLUB_DEPUTY, CLUB_MEMBER) |
| **Điều kiện tiên quyết** | - Admin đã đăng nhập<br>- Admin có quyền duyệt (CLUB_DEPUTY, CLUB_MEMBER, CLUB_LEADER, SUPER_ADMIN)<br>- Có đăng ký tham gia chờ duyệt (approvalStatus = 'pending')<br>- Hoạt động tồn tại |
| **Điều kiện sau** | - Đăng ký đã được duyệt hoặc từ chối<br>- Trạng thái approvalStatus đã được cập nhật<br>- approvedBy, approvedAt đã được set (nếu duyệt)<br>- rejectedBy, rejectedAt, rejectionReason đã được set (nếu từ chối) |
| **Luồng cơ bản** | 1. Admin xem danh sách người tham gia hoạt động<br>2. Admin chọn người tham gia có approvalStatus = 'pending'<br>3. Admin nhấn nút "Duyệt" hoặc "Từ chối"<br>4. Nếu từ chối: Admin nhập lý do từ chối (nếu cần)<br>5. Frontend gửi PATCH request đến /api/activities/[id]/participants<br>6. Backend kiểm tra xác thực (JWT token)<br>7. Backend kiểm tra quyền (CLUB_DEPUTY, CLUB_MEMBER, CLUB_LEADER, SUPER_ADMIN)<br>8. Backend tìm Activity trong database<br>9. Backend tìm participant trong participants[]<br>10. Backend cập nhật approvalStatus, approvedBy, approvedAt (nếu duyệt)<br>11. Backend cập nhật approvalStatus, rejectedBy, rejectedAt, rejectionReason (nếu từ chối)<br>12. Backend lưu Activity vào database<br>13. Backend trả về response<br>14. Frontend cập nhật UI<br>15. Frontend hiển thị thông báo thành công |
| **Luồng thay thế** | **3a. Không có quyền**<br>- Backend trả về lỗi 403 Forbidden<br>- Frontend hiển thị thông báo "Bạn không có quyền duyệt"<br><br>**8a. Hoạt động không tồn tại**<br>- Backend trả về lỗi 404 Not Found<br>- Frontend hiển thị thông báo "Không tìm thấy hoạt động"<br><br>**9a. Người tham gia không tồn tại**<br>- Backend trả về lỗi 404 Not Found<br>- Frontend hiển thị thông báo "Không tìm thấy người tham gia"<br><br>**4a. Từ chối mà không nhập lý do**<br>- Frontend có thể cho phép từ chối không cần lý do (tùy business rule)<br>- Backend lưu rejectionReason = '' hoặc null |
| **Quy tắc nghiệp vụ** | - Chỉ CLUB_DEPUTY, CLUB_MEMBER, CLUB_LEADER, SUPER_ADMIN mới có quyền duyệt<br>- ApprovalStatus: 'pending' → 'approved' hoặc 'rejected'<br>- Khi duyệt:<br>  - approvalStatus = 'approved'<br>  - approvedBy = admin.userId<br>  - approvedAt = new Date()<br>  - rejectedBy, rejectedAt, rejectionReason = undefined<br>- Khi từ chối:<br>  - approvalStatus = 'rejected'<br>  - rejectedBy = admin.userId<br>  - rejectedAt = new Date()<br>  - rejectionReason = (nếu có)<br>  - approvedBy, approvedAt = undefined<br>- Participant phải tồn tại trong Activity.participants[]<br>- Activity phải tồn tại |
| **Yêu cầu phi chức năng** | - Thời gian phản hồi: < 2 giây<br>- Validation: Kiểm tra quyền, kiểm tra tồn tại<br>- Transaction: Có thể sử dụng transaction để đảm bảo tính nhất quán<br>- Notification: Có thể gửi thông báo cho sinh viên khi được duyệt/từ chối<br>- Audit: Ghi log hành động duyệt/từ chối |

---

## 3. 👥 Quản Lý Thành Viên

### UC-ADMIN-015: Thêm Thành Viên Mới (Add New Member)

| Mục | Nội dung mô tả |
|-----|----------------|
| **Tên Use Case** | Thêm Thành Viên Mới (Add New Member) |
| **Mô tả** | Admin thêm thành viên mới vào CLB bằng cách tạo User và Membership với status ACTIVE. Thành viên được thêm trực tiếp mà không cần qua quy trình đăng ký. |
| **Tác nhân (Actor)** | Admin (CLUB_LEADER, SUPER_ADMIN) |
| **Điều kiện tiên quyết** | - Admin đã đăng nhập<br>- Admin có quyền thêm thành viên (CLUB_LEADER, SUPER_ADMIN)<br>- Hệ thống đang hoạt động |
| **Điều kiện sau** | - Thành viên đã được thêm thành công<br>- User đã được tạo trong database<br>- Membership đã được tạo với status ACTIVE<br>- Thành viên có thể đăng nhập ngay |
| **Luồng cơ bản** | 1. Admin truy cập trang thêm thành viên (/admin/members/add)<br>2. Admin điền thông tin thành viên (studentId, name, email, password, role, phone, class, faculty)<br>3. Admin chọn role cho thành viên (CLUB_STUDENT, CLUB_MEMBER, CLUB_DEPUTY, CLUB_LEADER, SUPER_ADMIN)<br>4. Admin nhấn nút "Thêm thành viên"<br>5. Frontend validate form (studentId, name, email, password, role)<br>6. Frontend gửi POST request đến /api/members<br>7. Backend kiểm tra xác thực (JWT token)<br>8. Backend kiểm tra quyền (CLUB_LEADER, SUPER_ADMIN)<br>9. Backend validate dữ liệu đầu vào<br>10. Backend kiểm tra user đã tồn tại (studentId, email)<br>11. Backend hash password bằng bcrypt (saltRounds: 12)<br>12. Backend tạo User object<br>13. Backend lưu User vào database<br>14. Backend tạo Membership object với status ACTIVE<br>15. Backend set approvedBy = admin.userId<br>16. Backend lưu Membership vào database<br>17. Backend trả về response<br>18. Frontend hiển thị thông báo thành công<br>19. Frontend reset form |
| **Luồng thay thế** | **5a. Dữ liệu không hợp lệ**<br>- Frontend hiển thị lỗi validation<br>- Admin có thể sửa lại thông tin<br><br>**10a. User đã tồn tại**<br>- Backend trả về lỗi 409 Conflict<br>- Frontend hiển thị "User với studentId hoặc email này đã tồn tại"<br><br>**10b. Email không đúng định dạng**<br>- Backend trả về lỗi 400 Bad Request<br>- Frontend hiển thị "Email phải có định dạng: mã số sinh viên 13 chữ số@student.tdmu.edu.vn"<br><br>**10c. StudentId không đúng định dạng**<br>- Backend trả về lỗi 400 Bad Request<br>- Frontend hiển thị "Mã số sinh viên phải có 13 chữ số hoặc bắt đầu bằng 'admin'"<br><br>**7a. Không có quyền**<br>- Backend trả về lỗi 401 Unauthorized<br>- Frontend hiển thị thông báo lỗi |
| **Quy tắc nghiệp vụ** | - StudentId: Bắt buộc, 13 chữ số hoặc bắt đầu bằng 'admin'<br>- Name: Bắt buộc, ít nhất 2 ký tự<br>- Email: Bắt buộc, đúng định dạng: mã số sinh viên 13 chữ số@student.tdmu.edu.vn hoặc admin@tdmu.edu.vn<br>- Password: Bắt buộc, ít nhất 6 ký tự<br>- Role: Bắt buộc, một trong: CLUB_STUDENT, CLUB_MEMBER, CLUB_DEPUTY, CLUB_LEADER, SUPER_ADMIN<br>- Phone: Tùy chọn, 10-11 chữ số<br>- Class: Tùy chọn<br>- Faculty: Tùy chọn (nếu là thành viên CLB)<br>- User không được trùng studentId hoặc email<br>- Password được hash bằng bcrypt (saltRounds: 12)<br>- Membership status = 'ACTIVE' (tự động kích hoạt)<br>- Membership approvedBy = admin.userId<br>- isClubMember = true |
| **Yêu cầu phi chức năng** | - Thời gian phản hồi: < 3 giây<br>- Bảo mật: Password được hash bằng bcrypt<br>- Validation: Frontend và Backend đều validate<br>- Transaction: Có thể sử dụng transaction để đảm bảo User và Membership được tạo đồng thời<br>- Duplicate check: Kiểm tra studentId và email trước khi tạo<br>- Notification: Có thể gửi email thông báo cho thành viên mới |

---

### UC-ADMIN-019: Xét Duyệt Thành Viên CLB (Approve Membership)

| Mục | Nội dung mô tả |
|-----|----------------|
| **Tên Use Case** | Xét Duyệt Thành Viên CLB (Approve Membership) |
| **Mô tả** | Admin duyệt hoặc từ chối đơn đăng ký tham gia CLB của sinh viên. Hệ thống cập nhật Membership status, và nếu duyệt thì cập nhật User role thành CLUB_STUDENT và isClubMember = true. |
| **Tác nhân (Actor)** | Admin (CLUB_LEADER, SUPER_ADMIN, CLUB_DEPUTY, CLUB_MEMBER) |
| **Điều kiện tiên quyết** | - Admin đã đăng nhập<br>- Admin có quyền duyệt (CLUB_LEADER, SUPER_ADMIN, CLUB_DEPUTY, CLUB_MEMBER)<br>- Có đơn đăng ký chờ duyệt (membership.status = 'PENDING')<br>- Membership tồn tại |
| **Điều kiện sau** | - Đơn đăng ký đã được duyệt hoặc từ chối<br>- Membership status đã được cập nhật<br>- Nếu duyệt: User role = 'CLUB_STUDENT', isClubMember = true<br>- approvedBy, approvedAt đã được set (nếu duyệt)<br>- rejectedBy, rejectedAt, rejectionReason đã được set (nếu từ chối) |
| **Luồng cơ bản** | 1. Admin xem danh sách đơn đăng ký chờ duyệt (/admin/memberships)<br>2. Admin chọn đơn đăng ký có status = 'PENDING'<br>3. Admin nhấn nút "Duyệt" hoặc "Từ chối"<br>4. Nếu từ chối: Admin nhập lý do từ chối<br>5. Frontend gửi PATCH request đến /api/memberships<br>6. Backend kiểm tra xác thực (JWT token)<br>7. Backend kiểm tra quyền (CLUB_LEADER, SUPER_ADMIN, CLUB_DEPUTY, CLUB_MEMBER)<br>8. Backend validate dữ liệu (membershipId, action)<br>9. Backend tìm Membership trong database<br>10. Backend kiểm tra status hợp lệ (PENDING hoặc REJECTED cho approve, PENDING cho reject)<br>11. Nếu duyệt:<br>    - Backend gọi membership.approve(admin.userId)<br>    - Backend set status = 'ACTIVE'<br>    - Backend set approvedBy = admin.userId<br>    - Backend set approvedAt = new Date()<br>    - Backend cập nhật User: role = 'CLUB_STUDENT', isClubMember = true<br>12. Nếu từ chối:<br>    - Backend gọi membership.reject(rejectionReason)<br>    - Backend set status = 'REJECTED'<br>    - Backend set rejectedBy = admin.userId<br>    - Backend set rejectedAt = new Date()<br>    - Backend set rejectionReason = rejectionReason<br>13. Backend lưu Membership vào database<br>14. Backend lưu User vào database (nếu duyệt)<br>15. Backend trả về response<br>16. Frontend cập nhật UI<br>17. Frontend hiển thị thông báo thành công |
| **Luồng thay thế** | **3a. Không có quyền**<br>- Backend trả về lỗi 401 Unauthorized<br>- Frontend hiển thị thông báo "Bạn không có quyền duyệt"<br><br>**9a. Membership không tồn tại**<br>- Backend trả về lỗi 404 Not Found<br>- Frontend hiển thị thông báo "Không tìm thấy đơn đăng ký"<br><br>**10a. Status không hợp lệ**<br>- Backend trả về lỗi 400 Bad Request<br>- Frontend hiển thị "Chỉ có thể duyệt đơn đăng ký có status PENDING hoặc REJECTED"<br><br>**4a. Từ chối mà không nhập lý do**<br>- Backend trả về lỗi 400 Bad Request<br>- Frontend hiển thị "Lý do từ chối là bắt buộc" |
| **Quy tắc nghiệp vụ** | - Chỉ CLUB_LEADER, SUPER_ADMIN, CLUB_DEPUTY, CLUB_MEMBER mới có quyền duyệt<br>- Có thể duyệt membership có status PENDING hoặc REJECTED<br>- Chỉ có thể từ chối membership có status PENDING<br>- Khi duyệt:<br>  - status = 'ACTIVE'<br>  - approvedBy = admin.userId<br>  - approvedAt = new Date()<br>  - User.role = 'CLUB_STUDENT'<br>  - User.isClubMember = true<br>  - rejectedBy, rejectedAt, rejectionReason = null<br>- Khi từ chối:<br>  - status = 'REJECTED'<br>  - rejectedBy = admin.userId<br>  - rejectedAt = new Date()<br>  - rejectionReason = (bắt buộc, max 500 ký tự)<br>  - approvedBy, approvedAt = null<br>- Membership phải tồn tại |
| **Yêu cầu phi chức năng** | - Thời gian phản hồi: < 3 giây<br>- Validation: Kiểm tra quyền, kiểm tra tồn tại, kiểm tra status<br>- Transaction: Sử dụng transaction để đảm bảo Membership và User được cập nhật đồng thời<br>- Notification: Có thể gửi email thông báo cho sinh viên khi được duyệt/từ chối<br>- Audit: Ghi log hành động duyệt/từ chối |

---

## 4. ✅ Quản Lý Điểm Danh

### UC-ADMIN-023: Duyệt Điểm Danh (Approve Attendance)

| Mục | Nội dung mô tả |
|-----|----------------|
| **Tên Use Case** | Duyệt Điểm Danh (Approve Attendance) |
| **Mô tả** | Admin duyệt hoặc từ chối điểm danh của sinh viên. Hệ thống cập nhật trạng thái status trong Attendance.attendances[], và ghi nhận thông tin người duyệt (verifiedBy, verifiedAt, verificationNote/cancelReason). |
| **Tác nhân (Actor)** | Admin/Officer (CLUB_DEPUTY, CLUB_MEMBER, CLUB_LEADER, SUPER_ADMIN) |
| **Điều kiện tiên quyết** | - Admin đã đăng nhập<br>- Admin có quyền duyệt (CLUB_DEPUTY, CLUB_MEMBER, CLUB_LEADER, SUPER_ADMIN)<br>- Có điểm danh chờ duyệt (status = 'pending')<br>- Attendance record tồn tại |
| **Điều kiện sau** | - Điểm danh đã được duyệt hoặc từ chối<br>- Trạng thái status đã được cập nhật<br>- verifiedBy, verifiedAt đã được set<br>- verificationNote hoặc cancelReason đã được set |
| **Luồng cơ bản** | 1. Admin xem danh sách điểm danh của hoạt động<br>2. Admin xem điểm danh có status = 'pending'<br>3. Admin xem thông tin điểm danh (ảnh, vị trí, thời gian, lý do trễ nếu có)<br>4. Admin nhập ghi chú (nếu cần)<br>5. Admin nhấn nút "Duyệt" hoặc "Từ chối"<br>6. Frontend gửi PATCH request đến /api/attendance/[recordId]/verify<br>7. Backend kiểm tra xác thực (JWT token)<br>8. Backend kiểm tra quyền (CLUB_DEPUTY, CLUB_MEMBER, CLUB_LEADER, SUPER_ADMIN)<br>9. Backend validate dữ liệu (recordId, status, verificationNote/cancelReason)<br>10. Backend tìm Attendance document chứa recordId<br>11. Backend tìm record trong array attendances[]<br>12. Backend cập nhật record:<br>    - status = 'approved' hoặc 'rejected'<br>    - verifiedBy = admin.userId<br>    - verifiedAt = new Date()<br>    - verificationNote = (nếu duyệt)<br>    - cancelReason = (nếu từ chối)<br>13. Backend mark array as modified<br>14. Backend lưu Attendance vào database<br>15. Backend populate verifiedBy user info<br>16. Backend trả về response<br>17. Frontend cập nhật UI<br>18. Frontend hiển thị thông báo thành công<br>19. Frontend reload danh sách điểm danh |
| **Luồng thay thế** | **5a. Không có quyền**<br>- Backend trả về lỗi 403 Forbidden<br>- Frontend hiển thị "Bạn không có quyền xác nhận điểm danh"<br><br>**10a. Attendance không tồn tại**<br>- Backend trả về lỗi 404 Not Found<br>- Frontend hiển thị "Không tìm thấy bản ghi điểm danh"<br><br>**11a. Record không tồn tại**<br>- Backend trả về lỗi 404 Not Found<br>- Frontend hiển thị "Không tìm thấy bản ghi điểm danh"<br><br>**9a. Status không hợp lệ**<br>- Backend trả về lỗi 400 Bad Request<br>- Frontend hiển thị "Trạng thái phải là approved hoặc rejected" |
| **Quy tắc nghiệp vụ** | - Chỉ CLUB_DEPUTY, CLUB_MEMBER, CLUB_LEADER, SUPER_ADMIN mới có quyền duyệt<br>- Status: 'pending' → 'approved' hoặc 'rejected'<br>- Khi duyệt:<br>  - status = 'approved'<br>  - verifiedBy = admin.userId<br>  - verifiedAt = new Date()<br>  - verificationNote = (nếu có)<br>  - cancelReason = undefined<br>- Khi từ chối:<br>  - status = 'rejected'<br>  - verifiedBy = admin.userId<br>  - verifiedAt = new Date()<br>  - cancelReason = (nếu có, cũng lưu vào verificationNote)<br>  - verificationNote = cancelReason<br>- Record phải tồn tại trong Attendance.attendances[]<br>- Attendance document phải tồn tại |
| **Yêu cầu phi chức năng** | - Thời gian phản hồi: < 2 giây<br>- Validation: Kiểm tra quyền, kiểm tra tồn tại<br>- Transaction: Có thể sử dụng transaction để đảm bảo tính nhất quán<br>- Notification: Có thể gửi thông báo cho sinh viên khi điểm danh được duyệt/từ chối<br>- Audit: Ghi log hành động duyệt/từ chối<br>- Image display: Hiển thị ảnh điểm danh với chất lượng tốt |

---

### UC-ADMIN-003: Xem Thông Tin Cá Nhân (View Profile)

| Mục | Nội dung mô tả |
|-----|----------------|
| **Tên Use Case** | Xem Thông Tin Cá Nhân (View Profile) |
| **Mô tả** | Admin xem thông tin cá nhân của mình bao gồm tên, email, số điện thoại, lớp, khoa, avatar, và các thông tin khác. |
| **Tác nhân (Actor)** | Admin |
| **Điều kiện tiên quyết** | - Admin đã đăng nhập<br>- Hệ thống đang hoạt động |
| **Điều kiện sau** | - Admin đã xem thông tin cá nhân<br>- Thông tin đã được hiển thị |
| **Luồng cơ bản** | 1. Admin truy cập trang profile (/admin/profile)<br>2. Frontend lấy thông tin user từ auth state<br>3. Frontend hiển thị thông tin cá nhân<br>4. Admin xem thông tin |
| **Luồng thay thế** | **2a. Thông tin không đầy đủ**<br>- Frontend có thể gọi API để lấy thông tin đầy đủ<br>- Backend trả về thông tin user từ database |
| **Quy tắc nghiệp vụ** | - Thông tin hiển thị: name, email, studentId, phone, class, faculty, avatarUrl, role<br>- Thông tin được lấy từ auth state hoặc API<br>- Admin chỉ có thể xem thông tin của chính mình |
| **Yêu cầu phi chức năng** | - Thời gian phản hồi: < 1 giây<br>- Hiển thị thông tin từ cache (auth state) hoặc API<br>- Bảo mật: Chỉ hiển thị thông tin của chính admin |

---

### UC-ADMIN-004: Cập Nhật Thông Tin Cá Nhân (Update Profile)

| Mục | Nội dung mô tả |
|-----|----------------|
| **Tên Use Case** | Cập Nhật Thông Tin Cá Nhân (Update Profile) |
| **Mô tả** | Admin cập nhật thông tin cá nhân của mình như số điện thoại, lớp, khoa, avatar. |
| **Tác nhân (Actor)** | Admin |
| **Điều kiện tiên quyết** | - Admin đã đăng nhập<br>- Hệ thống đang hoạt động |
| **Điều kiện sau** | - Thông tin đã được cập nhật<br>- Thông tin mới đã được lưu vào database<br>- Auth state đã được cập nhật |
| **Luồng cơ bản** | 1. Admin truy cập trang profile<br>2. Admin chỉnh sửa thông tin (phone, class, faculty, avatar)<br>3. Admin nhấn nút "Lưu"<br>4. Frontend validate dữ liệu<br>5. Frontend gửi PUT request đến /api/users/[id]<br>6. Backend kiểm tra xác thực<br>7. Backend validate dữ liệu<br>8. Backend cập nhật User trong database<br>9. Backend trả về response<br>10. Frontend cập nhật auth state<br>11. Frontend hiển thị thông báo thành công |
| **Luồng thay thế** | **4a. Dữ liệu không hợp lệ**<br>- Frontend hiển thị lỗi validation<br>- Admin có thể sửa lại<br><br>**7a. Không có quyền**<br>- Backend trả về lỗi 401 Unauthorized<br>- Frontend hiển thị thông báo lỗi |
| **Quy tắc nghiệp vụ** | - Admin chỉ có thể cập nhật thông tin của chính mình<br>- Không thể thay đổi: studentId, email, role<br>- Có thể thay đổi: phone, class, faculty, avatarUrl<br>- Phone: 10-11 chữ số (nếu có)<br>- Avatar: Upload lên Cloudinary (nếu có) |
| **Yêu cầu phi chức năng** | - Thời gian phản hồi: < 3 giây (có avatar), < 2 giây (không có avatar)<br>- Upload avatar: Max 10MB, format: JPG, PNG, WebP<br>- Validation: Frontend và Backend đều validate<br>- Bảo mật: Chỉ admin mới có thể cập nhật thông tin của chính mình |

---

### UC-ADMIN-006: Tạo Hoạt Động Nhiều Ngày (Create Multiple Days Activity)

| Mục | Nội dung mô tả |
|-----|----------------|
| **Tên Use Case** | Tạo Hoạt Động Nhiều Ngày (Create Multiple Days Activity) |
| **Mô tả** | Admin tạo hoạt động diễn ra nhiều ngày với lịch trình chi tiết cho từng ngày, địa điểm khác nhau cho từng ngày (nếu cần). |
| **Tác nhân (Actor)** | Admin (CLUB_LEADER, SUPER_ADMIN) |
| **Điều kiện tiên quyết** | - Admin đã đăng nhập<br>- Admin có quyền tạo hoạt động<br>- Hệ thống đang hoạt động |
| **Điều kiện sau** | - Hoạt động đã được tạo thành công<br>- Hoạt động đã được lưu vào database<br>- Lịch trình (schedule) đã được thiết lập |
| **Luồng cơ bản** | 1. Admin truy cập trang tạo hoạt động nhiều ngày<br>2. Admin điền thông tin hoạt động (tên, mô tả, ngày bắt đầu, ngày kết thúc)<br>3. Admin thiết lập lịch trình (schedule) cho từng ngày<br>4. Admin chọn địa điểm cho từng ngày (nếu cần)<br>5. Admin upload ảnh đại diện (nếu có)<br>6. Admin thêm người tham gia (nếu có)<br>7. Admin nhấn nút "Lưu"<br>8. Frontend validate dữ liệu<br>9. Frontend gửi POST request đến /api/activities<br>10. Backend validate dữ liệu<br>11. Backend tạo Activity object với type = 'multiple_days'<br>12. Backend lưu Activity vào database<br>13. Backend trả về response<br>14. Frontend hiển thị thông báo thành công |
| **Luồng thay thế** | **7a. Dữ liệu không hợp lệ**<br>- Frontend hiển thị lỗi validation<br>- Admin có thể sửa lại<br><br>**7b. Ngày kết thúc trước ngày bắt đầu**<br>- Frontend hiển thị lỗi "Ngày kết thúc phải sau ngày bắt đầu"<br>- Admin phải sửa lại ngày<br><br>**7c. Không có lịch trình**<br>- Frontend hiển thị lỗi "Phải có ít nhất một ngày trong lịch trình"<br>- Admin phải thêm lịch trình |
| **Quy tắc nghiệp vụ** | - Type: 'multiple_days'<br>- StartDate: Bắt buộc, phải là Date hợp lệ<br>- EndDate: Bắt buộc, phải sau startDate<br>- Schedule: Bắt buộc, mảng các object {day, date, activities}<br>  - day: Số thứ tự ngày (1, 2, 3, ...)<br>  - date: Ngày cụ thể<br>  - activities: Mô tả hoạt động trong ngày (max 1000 ký tự)<br>- Location: Có thể là single location hoặc multi-time locations<br>- Các quy tắc khác giống như tạo hoạt động 1 ngày |
| **Yêu cầu phi chức năng** | - Thời gian phản hồi: < 3 giây (không có ảnh), < 10 giây (có ảnh)<br>- Validation: Frontend và Backend đều validate<br>- Lịch trình: Hỗ trợ tối đa 30 ngày<br>- Bảo mật: Chỉ CLUB_LEADER và SUPER_ADMIN mới có quyền tạo |

---

### UC-ADMIN-008: Xem Chi Tiết Hoạt Động (View Activity Details)

| Mục | Nội dung mô tả |
|-----|----------------|
| **Tên Use Case** | Xem Chi Tiết Hoạt Động (View Activity Details) |
| **Mô tả** | Admin xem chi tiết thông tin hoạt động bao gồm thông tin cơ bản, lịch trình, địa điểm, người tham gia, điểm danh, và các thông tin khác. |
| **Tác nhân (Actor)** | Admin |
| **Điều kiện tiên quyết** | - Admin đã đăng nhập<br>- Hoạt động tồn tại<br>- Hệ thống đang hoạt động |
| **Điều kiện sau** | - Admin đã xem chi tiết hoạt động<br>- Thông tin đã được hiển thị |
| **Luồng cơ bản** | 1. Admin chọn hoạt động từ danh sách<br>2. Frontend điều hướng đến trang chi tiết<br>3. Frontend gửi GET request đến /api/activities/[id]<br>4. Backend kiểm tra xác thực<br>5. Backend tìm Activity trong database<br>6. Backend populate responsiblePerson, createdBy, participants<br>7. Backend lấy thông tin điểm danh (nếu cần)<br>8. Backend trả về response<br>9. Frontend hiển thị chi tiết hoạt động |
| **Luồng thay thế** | **5a. Hoạt động không tồn tại**<br>- Backend trả về lỗi 404 Not Found<br>- Frontend hiển thị "Không tìm thấy hoạt động"<br><br>**4a. Không có quyền**<br>- Backend trả về lỗi 401 Unauthorized<br>- Frontend hiển thị thông báo lỗi |
| **Quy tắc nghiệp vụ** | - Hiển thị đầy đủ thông tin: name, description, date, location, timeSlots, participants, status, type<br>- Populate: responsiblePerson (name, email), createdBy (name, email)<br>- Hiển thị danh sách người tham gia với approvalStatus<br>- Hiển thị thống kê điểm danh (nếu có)<br>- Hiển thị ảnh đại diện (nếu có) |
| **Yêu cầu phi chức năng** | - Thời gian phản hồi: < 2 giây<br>- Hiển thị đầy đủ thông tin<br>- Bản đồ: Hiển thị địa điểm trên bản đồ (nếu có locationData)<br>- Performance: Sử dụng populate để tối ưu query |

---

### UC-ADMIN-009: Chỉnh Sửa Hoạt Động (Edit Activity)

| Mục | Nội dung mô tả |
|-----|----------------|
| **Tên Use Case** | Chỉnh Sửa Hoạt Động (Edit Activity) |
| **Mô tả** | Admin chỉnh sửa thông tin hoạt động đã tạo. Hệ thống cập nhật thông tin hoạt động trong database. |
| **Tác nhân (Actor)** | Admin (CLUB_LEADER, SUPER_ADMIN) |
| **Điều kiện tiên quyết** | - Admin đã đăng nhập<br>- Admin có quyền chỉnh sửa<br>- Hoạt động tồn tại<br>- Hoạt động có thể chỉnh sửa (chưa hoàn thành) |
| **Điều kiện sau** | - Hoạt động đã được cập nhật<br>- Thông tin mới đã được lưu vào database<br>- updatedBy đã được cập nhật |
| **Luồng cơ bản** | 1. Admin chọn hoạt động cần chỉnh sửa<br>2. Frontend điều hướng đến trang chỉnh sửa (/admin/activities/create-single/[id])<br>3. Frontend load dữ liệu hoạt động từ API<br>4. Frontend hiển thị form với dữ liệu hiện tại<br>5. Admin chỉnh sửa thông tin<br>6. Admin nhấn nút "Lưu"<br>7. Frontend validate dữ liệu<br>8. Frontend gửi PUT request đến /api/activities/[id]<br>9. Backend kiểm tra xác thực<br>10. Backend kiểm tra quyền<br>11. Backend validate dữ liệu<br>12. Backend cập nhật Activity trong database<br>13. Backend set updatedBy = admin.userId<br>14. Backend set updatedAt = new Date()<br>15. Backend trả về response<br>16. Frontend hiển thị thông báo thành công |
| **Luồng thay thế** | **7a. Dữ liệu không hợp lệ**<br>- Frontend hiển thị lỗi validation<br>- Admin có thể sửa lại<br><br>**10a. Không có quyền**<br>- Backend trả về lỗi 401 Unauthorized<br>- Frontend hiển thị thông báo lỗi<br><br>**11a. Hoạt động không tồn tại**<br>- Backend trả về lỗi 404 Not Found<br>- Frontend hiển thị "Không tìm thấy hoạt động" |
| **Quy tắc nghiệp vụ** | - Chỉ CLUB_LEADER và SUPER_ADMIN mới có quyền chỉnh sửa<br>- Có thể chỉnh sửa tất cả thông tin trừ createdBy<br>- updatedBy và updatedAt được cập nhật tự động<br>- Validation giống như tạo hoạt động mới<br>- Có thể thay đổi status, nhưng cần cẩn thận với các status đã hoàn thành |
| **Yêu cầu phi chức năng** | - Thời gian phản hồi: < 3 giây (không có ảnh), < 10 giây (có ảnh)<br>- Validation: Frontend và Backend đều validate<br>- Bảo mật: Chỉ CLUB_LEADER và SUPER_ADMIN mới có quyền chỉnh sửa<br>- Audit: Ghi log hành động chỉnh sửa |

---

### UC-ADMIN-010: Xóa Hoạt Động (Delete Activity)

| Mục | Nội dung mô tả |
|-----|----------------|
| **Tên Use Case** | Xóa Hoạt Động (Delete Activity) |
| **Mô tả** | Admin xóa hoạt động khỏi hệ thống. Hệ thống xóa hoạt động và các dữ liệu liên quan (nếu cần). |
| **Tác nhân (Actor)** | Admin (CLUB_LEADER, SUPER_ADMIN) |
| **Điều kiện tiên quyết** | - Admin đã đăng nhập<br>- Admin có quyền xóa<br>- Hoạt động tồn tại |
| **Điều kiện sau** | - Hoạt động đã được xóa<br>- Hoạt động đã được xóa khỏi database<br>- Các dữ liệu liên quan đã được xử lý (nếu cần) |
| **Luồng cơ bản** | 1. Admin chọn hoạt động cần xóa<br>2. Admin nhấn nút "Xóa"<br>3. Frontend hiển thị dialog xác nhận<br>4. Admin xác nhận xóa<br>5. Frontend gửi DELETE request đến /api/activities/[id]<br>6. Backend kiểm tra xác thực<br>7. Backend kiểm tra quyền<br>8. Backend tìm Activity trong database<br>9. Backend xóa Activity khỏi database<br>10. Backend xóa các dữ liệu liên quan (attendance, nếu cần)<br>11. Backend trả về response<br>12. Frontend hiển thị thông báo thành công<br>13. Frontend reload danh sách hoạt động |
| **Luồng thay thế** | **4a. Admin hủy xóa**<br>- Frontend đóng dialog<br>- Không có hành động nào được thực hiện<br><br>**7a. Không có quyền**<br>- Backend trả về lỗi 401 Unauthorized<br>- Frontend hiển thị thông báo lỗi<br><br>**8a. Hoạt động không tồn tại**<br>- Backend trả về lỗi 404 Not Found<br>- Frontend hiển thị "Không tìm thấy hoạt động" |
| **Quy tắc nghiệp vụ** | - Chỉ CLUB_LEADER và SUPER_ADMIN mới có quyền xóa<br>- Cần xác nhận trước khi xóa<br>- Xóa hoạt động có thể ảnh hưởng đến attendance records<br>- Có thể xóa hoạt động ở bất kỳ status nào<br>- Cân nhắc soft delete thay vì hard delete (nếu cần) |
| **Yêu cầu phi chức năng** | - Thời gian phản hồi: < 2 giây<br>- Xác nhận: Hiển thị dialog xác nhận trước khi xóa<br>- Bảo mật: Chỉ CLUB_LEADER và SUPER_ADMIN mới có quyền xóa<br>- Audit: Ghi log hành động xóa<br>- Cascade delete: Xóa các dữ liệu liên quan (nếu cần) |

---

### UC-ADMIN-014: Xem Danh Sách Thành Viên CLB (List Club Members)

| Mục | Nội dung mô tả |
|-----|----------------|
| **Tên Use Case** | Xem Danh Sách Thành Viên CLB (List Club Members) |
| **Mô tả** | Admin xem danh sách tất cả thành viên CLB với khả năng tìm kiếm, lọc, và phân trang. |
| **Tác nhân (Actor)** | Admin |
| **Điều kiện tiên quyết** | - Admin đã đăng nhập<br>- Hệ thống đang hoạt động |
| **Điều kiện sau** | - Admin đã xem danh sách thành viên<br>- Danh sách đã được hiển thị với phân trang |
| **Luồng cơ bản** | 1. Admin truy cập trang danh sách thành viên (/admin/members)<br>2. Frontend gửi GET request đến /api/members với query parameters<br>3. Backend kiểm tra xác thực<br>4. Backend kiểm tra quyền<br>5. Backend build filter (role, search, faculty, isClubMember)<br>6. Backend tìm Members với filter và pagination<br>7. Backend populate membership status<br>8. Backend đếm total members<br>9. Backend tính toán pagination info<br>10. Backend trả về response<br>11. Frontend hiển thị danh sách thành viên<br>12. Admin có thể tìm kiếm, lọc, phân trang |
| **Luồng thay thế** | **4a. Không có quyền**<br>- Backend trả về lỗi 401 Unauthorized<br>- Frontend hiển thị thông báo lỗi<br><br>**6a. Không tìm thấy thành viên**<br>- Backend trả về danh sách rỗng<br>- Frontend hiển thị "Không có thành viên nào" |
| **Quy tắc nghiệp vụ** | - Filter theo role: CLUB_STUDENT, CLUB_MEMBER, CLUB_DEPUTY, CLUB_LEADER, SUPER_ADMIN<br>- Filter theo isClubMember: true (chỉ thành viên CLB)<br>- Search: Tìm kiếm theo name, studentId, email (case-insensitive)<br>- Filter theo faculty (nếu cần)<br>- Pagination: Mặc định page=1, limit=10<br>- Sort: Mặc định sort theo name (ascending) |
| **Yêu cầu phi chức năng** | - Thời gian phản hồi: < 2 giây<br>- Pagination: Hỗ trợ tối đa 100 items per page<br>- Search: Hỗ trợ tìm kiếm real-time (có thể debounce)<br>- Performance: Sử dụng index trên database cho các trường tìm kiếm |

---

### UC-ADMIN-016: Xem Chi Tiết Thành Viên (View Member Details)

| Mục | Nội dung mô tả |
|-----|----------------|
| **Tên Use Case** | Xem Chi Tiết Thành Viên (View Member Details) |
| **Mô tả** | Admin xem chi tiết thông tin thành viên bao gồm thông tin cơ bản, membership status, lịch sử hoạt động, và các thông tin khác. |
| **Tác nhân (Actor)** | Admin |
| **Điều kiện tiên quyết** | - Admin đã đăng nhập<br>- Thành viên tồn tại<br>- Hệ thống đang hoạt động |
| **Điều kiện sau** | - Admin đã xem chi tiết thành viên<br>- Thông tin đã được hiển thị |
| **Luồng cơ bản** | 1. Admin chọn thành viên từ danh sách<br>2. Frontend hiển thị modal hoặc điều hướng đến trang chi tiết<br>3. Frontend gửi GET request đến /api/members/[id] hoặc /api/users/[id]<br>4. Backend kiểm tra xác thực<br>5. Backend tìm User và Membership trong database<br>6. Backend populate membership status, approval history<br>7. Backend lấy lịch sử hoạt động (nếu cần)<br>8. Backend trả về response<br>9. Frontend hiển thị chi tiết thành viên |
| **Luồng thay thế** | **5a. Thành viên không tồn tại**<br>- Backend trả về lỗi 404 Not Found<br>- Frontend hiển thị "Không tìm thấy thành viên"<br><br>**4a. Không có quyền**<br>- Backend trả về lỗi 401 Unauthorized<br>- Frontend hiển thị thông báo lỗi |
| **Quy tắc nghiệp vụ** | - Hiển thị đầy đủ thông tin: name, email, studentId, phone, class, faculty, role, avatarUrl<br>- Hiển thị membership status: ACTIVE, PENDING, REJECTED, INACTIVE, REMOVED<br>- Hiển thị lịch sử approval (nếu có)<br>- Hiển thị lịch sử hoạt động (nếu cần)<br>- Hiển thị thống kê điểm danh (nếu cần) |
| **Yêu cầu phi chức năng** | - Thời gian phản hồi: < 2 giây<br>- Hiển thị đầy đủ thông tin<br>- Performance: Sử dụng populate để tối ưu query<br>- Privacy: Chỉ hiển thị thông tin công khai, không hiển thị mật khẩu |

---

### UC-ADMIN-017: Chỉnh Sửa Thông Tin Thành Viên (Edit Member)

| Mục | Nội dung mô tả |
|-----|----------------|
| **Tên Use Case** | Chỉnh Sửa Thông Tin Thành Viên (Edit Member) |
| **Mô tả** | Admin chỉnh sửa thông tin thành viên như số điện thoại, lớp, khoa, role. |
| **Tác nhân (Actor)** | Admin (CLUB_LEADER, SUPER_ADMIN) |
| **Điều kiện tiên quyết** | - Admin đã đăng nhập<br>- Admin có quyền chỉnh sửa<br>- Thành viên tồn tại |
| **Điều kiện sau** | - Thông tin đã được cập nhật<br>- Thông tin mới đã được lưu vào database |
| **Luồng cơ bản** | 1. Admin chọn thành viên cần chỉnh sửa<br>2. Frontend hiển thị form chỉnh sửa<br>3. Admin chỉnh sửa thông tin (phone, class, faculty, role)<br>4. Admin nhấn nút "Lưu"<br>5. Frontend validate dữ liệu<br>6. Frontend gửi PUT request đến /api/members/[id] hoặc /api/users/[id]<br>7. Backend kiểm tra xác thực<br>8. Backend kiểm tra quyền<br>9. Backend validate dữ liệu<br>10. Backend cập nhật User trong database<br>11. Backend trả về response<br>12. Frontend hiển thị thông báo thành công<br>13. Frontend cập nhật UI |
| **Luồng thay thế** | **5a. Dữ liệu không hợp lệ**<br>- Frontend hiển thị lỗi validation<br>- Admin có thể sửa lại<br><br>**8a. Không có quyền**<br>- Backend trả về lỗi 401 Unauthorized<br>- Frontend hiển thị thông báo lỗi<br><br>**9a. Thành viên không tồn tại**<br>- Backend trả về lỗi 404 Not Found<br>- Frontend hiển thị "Không tìm thấy thành viên" |
| **Quy tắc nghiệp vụ** | - Chỉ CLUB_LEADER và SUPER_ADMIN mới có quyền chỉnh sửa<br>- Không thể thay đổi: studentId, email, password<br>- Có thể thay đổi: phone, class, faculty, role<br>- Phone: 10-11 chữ số (nếu có)<br>- Role: Phải là role hợp lệ (CLUB_STUDENT, CLUB_MEMBER, CLUB_DEPUTY, CLUB_LEADER, SUPER_ADMIN)<br>- Khi thay đổi role, có thể cần cập nhật membership status |
| **Yêu cầu phi chức năng** | - Thời gian phản hồi: < 2 giây<br>- Validation: Frontend và Backend đều validate<br>- Bảo mật: Chỉ CLUB_LEADER và SUPER_ADMIN mới có quyền chỉnh sửa<br>- Audit: Ghi log hành động chỉnh sửa |

---

### UC-ADMIN-020: Quản Lý Trạng Thái Thành Viên (Manage Member Status)

| Mục | Nội dung mô tả |
|-----|----------------|
| **Tên Use Case** | Quản Lý Trạng Thái Thành Viên (Manage Member Status) |
| **Mô tả** | Admin quản lý trạng thái thành viên (ACTIVE, INACTIVE, REMOVED) và cập nhật membership status. |
| **Tác nhân (Actor)** | Admin (CLUB_LEADER, SUPER_ADMIN, CLUB_DEPUTY, CLUB_MEMBER) |
| **Điều kiện tiên quyết** | - Admin đã đăng nhập<br>- Admin có quyền quản lý trạng thái<br>- Thành viên tồn tại<br>- Membership tồn tại |
| **Điều kiện sau** | - Trạng thái đã được cập nhật<br>- Membership status đã được cập nhật<br>- User role đã được cập nhật (nếu cần) |
| **Luồng cơ bản** | 1. Admin truy cập trang quản lý trạng thái (/admin/members/status)<br>2. Admin xem danh sách thành viên và trạng thái<br>3. Admin chọn thành viên cần thay đổi trạng thái<br>4. Admin chọn trạng thái mới (ACTIVE, INACTIVE, REMOVED)<br>5. Nếu REMOVED: Admin nhập lý do (nếu cần)<br>6. Admin nhấn nút "Cập nhật"<br>7. Frontend gửi PATCH request đến /api/memberships/[id]/status<br>8. Backend kiểm tra xác thực<br>9. Backend kiểm tra quyền<br>10. Backend validate dữ liệu (status, rejectionReason nếu REJECTED)<br>11. Backend tìm Membership trong database<br>12. Backend cập nhật membership status<br>13. Backend cập nhật các trường liên quan (approvedBy, rejectedBy, removedBy, etc.)<br>14. Backend cập nhật User role (nếu cần)<br>15. Backend lưu Membership và User vào database<br>16. Backend trả về response<br>17. Frontend cập nhật UI<br>18. Frontend hiển thị thông báo thành công |
| **Luồng thay thế** | **10a. Status không hợp lệ**<br>- Backend trả về lỗi 400 Bad Request<br>- Frontend hiển thị "Trạng thái không hợp lệ"<br><br>**11a. Membership không tồn tại**<br>- Backend trả về lỗi 404 Not Found<br>- Frontend hiển thị "Không tìm thấy membership"<br><br>**5a. REMOVED mà không nhập lý do**<br>- Frontend có thể cho phép REMOVED không cần lý do (tùy business rule) |
| **Quy tắc nghiệp vụ** | - Chỉ CLUB_LEADER, SUPER_ADMIN, CLUB_DEPUTY, CLUB_MEMBER mới có quyền quản lý trạng thái<br>- Status hợp lệ: ACTIVE, INACTIVE, REMOVED, PENDING, REJECTED<br>- Khi status = ACTIVE:<br>  - approvedBy = admin.userId<br>  - approvedAt = new Date() (nếu chưa có)<br>  - rejectedBy, rejectedAt, rejectionReason = null<br>- Khi status = REMOVED:<br>  - removedBy = admin.userId<br>  - removedAt = new Date()<br>  - User role có thể bị downgrade (trừ CLUB_LEADER)<br>- Khi status = INACTIVE:<br>  - cleared all approval/rejection data<br>- Khi status = REJECTED:<br>  - rejectedBy = admin.userId<br>  - rejectedAt = new Date()<br>  - rejectionReason = (bắt buộc, max 500 ký tự) |
| **Yêu cầu phi chức năng** | - Thời gian phản hồi: < 3 giây<br>- Validation: Kiểm tra quyền, kiểm tra tồn tại, kiểm tra status<br>- Transaction: Sử dụng transaction để đảm bảo Membership và User được cập nhật đồng thời<br>- Notification: Có thể gửi email thông báo cho thành viên khi trạng thái thay đổi<br>- Audit: Ghi log hành động thay đổi trạng thái |

---

### UC-ADMIN-022: Xem Danh Sách Điểm Danh (View Attendance List)

| Mục | Nội dung mô tả |
|-----|----------------|
| **Tên Use Case** | Xem Danh Sách Điểm Danh (View Attendance List) |
| **Mô tả** | Admin xem danh sách điểm danh của hoạt động bao gồm thông tin người tham gia, thời gian điểm danh, vị trí, ảnh, và trạng thái. |
| **Tác nhân (Actor)** | Admin/Officer (CLUB_DEPUTY, CLUB_MEMBER, CLUB_LEADER, SUPER_ADMIN) |
| **Điều kiện tiên quyết** | - Admin đã đăng nhập<br>- Admin có quyền xem điểm danh<br>- Hoạt động tồn tại<br>- Hệ thống đang hoạt động |
| **Điều kiện sau** | - Admin đã xem danh sách điểm danh<br>- Danh sách đã được hiển thị |
| **Luồng cơ bản** | 1. Admin chọn hoạt động<br>2. Frontend điều hướng đến trang điểm danh (/officer/attendance/[activityId])<br>3. Frontend gửi GET request đến /api/activities/[id]/attendance<br>4. Backend kiểm tra xác thực<br>5. Backend kiểm tra quyền<br>6. Backend tìm Activity trong database<br>7. Backend lấy danh sách approved participants<br>8. Backend lấy Attendance documents cho activity<br>9. Backend populate userId, verifiedBy<br>10. Backend tính toán thống kê (total, checkedIn, notCheckedIn, attendanceRate)<br>11. Backend trả về response<br>12. Frontend hiển thị danh sách điểm danh<br>13. Frontend hiển thị thống kê |
| **Luồng thay thế** | **6a. Hoạt động không tồn tại**<br>- Backend trả về lỗi 404 Not Found<br>- Frontend hiển thị "Không tìm thấy hoạt động"<br><br>**5a. Không có quyền**<br>- Backend trả về lỗi 403 Forbidden<br>- Frontend hiển thị "Bạn không có quyền xem điểm danh" |
| **Quy tắc nghiệp vụ** | - Chỉ hiển thị approved participants<br>- Hiển thị thông tin điểm danh: timeSlot, checkInType, checkInTime, location, photoUrl, status<br>- Status: 'approved', 'pending', 'rejected'<br>- Hiển thị verifiedBy (nếu đã duyệt)<br>- Hiển thị thống kê: total, checkedIn, notCheckedIn, attendanceRate<br>- Validate location: Kiểm tra khoảng cách từ vị trí điểm danh đến vị trí hoạt động<br>- Validate time: Kiểm tra thời gian điểm danh có đúng giờ không |
| **Yêu cầu phi chức năng** | - Thời gian phản hồi: < 2 giây<br>- Hiển thị đầy đủ thông tin<br>- Performance: Sử dụng populate để tối ưu query<br>- Image display: Hiển thị ảnh điểm danh với chất lượng tốt<br>- Map display: Hiển thị vị trí điểm danh trên bản đồ (nếu cần) |

---

### UC-ADMIN-033: Xem Dashboard (View Dashboard)

| Mục | Nội dung mô tả |
|-----|----------------|
| **Tên Use Case** | Xem Dashboard (View Dashboard) |
| **Mô tả** | Admin xem tổng quan hệ thống trên dashboard bao gồm thống kê, biểu đồ, hoạt động gần đây, và các thông tin quan trọng khác. |
| **Tác nhân (Actor)** | Admin |
| **Điều kiện tiên quyết** | - Admin đã đăng nhập<br>- Hệ thống đang hoạt động |
| **Điều kiện sau** | - Admin đã xem dashboard<br>- Thống kê đã được hiển thị |
| **Luồng cơ bản** | 1. Admin truy cập dashboard (/admin/dashboard)<br>2. Frontend gửi các API requests để lấy thống kê<br>3. Backend kiểm tra xác thực<br>4. Backend tính toán thống kê:<br>   - Tổng số hoạt động<br>   - Tổng số thành viên<br>   - Tổng số điểm danh<br>   - Hoạt động gần đây<br>   - Thống kê theo thời gian<br>5. Backend trả về response<br>6. Frontend hiển thị dashboard với thống kê<br>7. Frontend hiển thị biểu đồ (nếu cần)<br>8. Frontend hiển thị hoạt động gần đây |
| **Luồng thay thế** | **3a. Không có quyền**<br>- Backend trả về lỗi 401 Unauthorized<br>- Frontend hiển thị thông báo lỗi<br><br>**4a. Không có dữ liệu**<br>- Backend trả về thống kê = 0<br>- Frontend hiển thị "Chưa có dữ liệu" |
| **Quy tắc nghiệp vụ** | - Hiển thị thống kê tổng quan: số hoạt động, số thành viên, số điểm danh<br>- Hiển thị hoạt động gần đây (5-10 hoạt động mới nhất)<br>- Hiển thị thống kê theo thời gian (theo ngày, tuần, tháng)<br>- Hiển thị biểu đồ (nếu cần)<br>- Hiển thị thông báo (nếu có)<br>- Hiển thị quick actions |
| **Yêu cầu phi chức năng** | - Thời gian phản hồi: < 3 giây<br>- Cache: Có thể cache thống kê để tăng performance<br>- Real-time: Có thể cập nhật thống kê real-time (nếu cần)<br>- Responsive: Dashboard phải responsive trên các thiết bị khác nhau<br>- Performance: Tối ưu query để load nhanh |

---

## 📝 Ghi Chú

1. **Các Use Cases khác** sẽ được bổ sung dần theo thứ tự ưu tiên
2. **Sequence Diagrams** đã được vẽ cho 7 Use Cases quan trọng nhất
3. **Các Use Cases chưa có Sequence Diagram** sẽ được bổ sung sau
4. **Quy tắc nghiệp vụ** có thể được cập nhật theo yêu cầu thực tế
5. **Yêu cầu phi chức năng** có thể được điều chỉnh theo performance và security requirements

---

**Tài liệu này sẽ được cập nhật thường xuyên với các Use Cases mới! 🎉**

