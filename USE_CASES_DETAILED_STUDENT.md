# Đặc Tả Use Cases Chi Tiết - Student (Sinh Viên)

## Tổng Quan

Tài liệu này mô tả chi tiết các Use Cases của **Student** (Sinh viên) trong hệ thống quản lý hoạt động CLB "5 Tốt" TDMU. Student bao gồm các role: `CLUB_STUDENT` (thành viên CLB) và `STUDENT` (sinh viên không thuộc CLB).

---

## 1. Đăng Nhập (Login)

| **Trường** | **Nội dung** |
|------------|--------------|
| **Tên Use Case** | Đăng nhập (Login) |
| **Mô tả** | Student đăng nhập vào hệ thống bằng email và mật khẩu. Hệ thống xác thực thông tin, kiểm tra membership status, xác định effectiveRole và redirectUrl, tạo JWT token, và điều hướng đến dashboard phù hợp. |
| **Tác nhân (Actor)** | Student (CLUB_STUDENT, STUDENT) |
| **Điều kiện tiên quyết** | Student đã có tài khoản trong hệ thống |
| **Điều kiện sau** | Student đã đăng nhập thành công và được điều hướng đến `/student/dashboard` |
| **Luồng cơ bản** | 1. Student truy cập trang đăng nhập<br>2. Student nhập email và mật khẩu<br>3. Student nhấn nút "Đăng nhập"<br>4. Hệ thống validate input (email, password không rỗng)<br>5. Hệ thống tìm user theo email (exclude isDeleted)<br>6. Hệ thống so sánh mật khẩu với bcrypt.compare()<br>7. Hệ thống tạo JWT token (expiresIn: 7d)<br>8. Hệ thống tìm membership mới nhất theo userId<br>9. Hệ thống xác định effectiveRole và redirectUrl:<br>   - CLUB_STUDENT, STUDENT → redirectUrl = '/student/dashboard'<br>   - Nếu membership.status === 'REMOVED' → effectiveRole = 'STUDENT', redirectUrl = '/student/dashboard'<br>   - Nếu membership.status === 'ACTIVE' và role là CLUB_LEADER/CLUB_DEPUTY/CLUB_MEMBER → redirectUrl = '/officer/dashboard' hoặc '/admin/dashboard'<br>10. Hệ thống trả về response với user, token, redirectUrl, effectiveRole<br>11. Frontend lưu token vào localStorage<br>12. Frontend cập nhật auth state<br>13. Frontend điều hướng đến redirectUrl |
| **Luồng thay thế** | **3a. Email hoặc mật khẩu không đúng**<br>- Hệ thống trả về lỗi "Email hoặc mật khẩu không đúng"<br>- Student có thể nhập lại thông tin<br><br>**3b. User không tồn tại**<br>- Hệ thống trả về lỗi "Email hoặc mật khẩu không đúng"<br>- Student có thể nhập lại thông tin<br><br>**3c. Membership status là REMOVED**<br>- Hệ thống downgrade effectiveRole thành STUDENT<br>- RedirectUrl được đặt thành /student/dashboard<br>- Student bị chuyển hướng đến student dashboard<br><br>**3d. Token hết hạn hoặc không hợp lệ**<br>- Hệ thống yêu cầu đăng nhập lại |
| **Quy tắc nghiệp vụ** | - Email phải đúng định dạng và tồn tại trong hệ thống<br>- Mật khẩu phải khớp với passwordHash trong database<br>- JWT token có thời hạn 7 ngày<br>- EffectiveRole được xác định dựa trên user.role và membership.status<br>- Nếu membership.status === 'REMOVED':<br>  - Tất cả roles → effectiveRole = 'STUDENT'<br>- RedirectUrl được xác định:<br>  - CLUB_STUDENT, STUDENT → /student/dashboard<br>  - Nếu REMOVED → /student/dashboard<br>  - Nếu ACTIVE và role là officer → /officer/dashboard hoặc /admin/dashboard |
| **Yêu cầu phi chức năng** | - Thời gian phản hồi đăng nhập < 2 giây<br>- Mật khẩu được hash bằng bcrypt với salt rounds ≥ 10<br>- JWT token được lưu an toàn trong localStorage<br>- Hỗ trợ dark mode |

---

## 2. Xem Dashboard (View Dashboard)

| **Trường** | **Nội dung** |
|------------|--------------|
| **Tên Use Case** | Xem Dashboard (View Dashboard) |
| **Mô tả** | Student xem tổng quan các hoạt động có sẵn, thống kê cá nhân (số hoạt động đã tham gia, điểm tích lũy), và các hoạt động gần đây. |
| **Tác nhân (Actor)** | Student (CLUB_STUDENT, STUDENT) |
| **Điều kiện tiên quyết** | Student đã đăng nhập thành công |
| **Điều kiện sau** | Student đã xem dashboard với thông tin cập nhật |
| **Luồng cơ bản** | 1. Student truy cập `/student/dashboard`<br>2. Hệ thống kiểm tra quyền truy cập (CLUB_STUDENT, STUDENT)<br>3. Hệ thống gọi API để lấy:<br>   - Danh sách hoạt động có sẵn (GET `/api/activities?status=published&visibility=public`)<br>   - Thống kê cá nhân (số hoạt động đã tham gia, điểm tích lũy)<br>   - Lịch sử tham gia gần đây<br>4. API trả về dữ liệu:<br>   - Danh sách hoạt động (tên, mô tả, ngày, địa điểm, số người tham gia)<br>   - Thống kê (tổng số hoạt động đã tham gia, điểm tích lũy, số hoạt động đang chờ duyệt)<br>   - Lịch sử tham gia (hoạt động gần đây, trạng thái duyệt)<br>5. Frontend hiển thị:<br>   - Thẻ chào mừng với tên student<br>   - 4 thẻ thống kê (stats cards):<br>     - Hoạt động đã tham gia<br>     - Điểm tích lũy<br>     - Hoạt động đang chờ duyệt<br>     - Hoạt động sắp tới<br>   - Danh sách hoạt động có sẵn (có thể đăng ký)<br>   - Lịch sử tham gia gần đây<br>   - Các nút hành động nhanh (xem tất cả hoạt động, đăng ký CLB) |
| **Luồng thay thế** | **2a. Student không có quyền truy cập**<br>- Hệ thống trả về lỗi 403<br>- Student được chuyển hướng về trang đăng nhập<br><br>**3a. Không có hoạt động nào**<br>- Hệ thống hiển thị thông báo "Chưa có hoạt động nào"<br>- Thống kê hiển thị giá trị 0<br><br>**3b. Lỗi kết nối API**<br>- Hệ thống hiển thị thông báo lỗi<br>- Student có thể thử lại |
| **Quy tắc nghiệp vụ** | - Chỉ hiển thị hoạt động có `status = 'published'` và `visibility = 'public'`<br>- Thống kê được tính toán từ các hoạt động mà student đã đăng ký<br>   - Hoạt động đã tham gia: `approvalStatus = 'approved'`<br>   - Hoạt động chờ duyệt: `approvalStatus = 'pending'`<br>   - Điểm tích lũy: tổng điểm từ các hoạt động đã hoàn thành<br>- Lịch sử tham gia được sắp xếp theo ngày gần nhất |
| **Yêu cầu phi chức năng** | - Thời gian tải dashboard < 1.5 giây<br>- Hỗ trợ dark mode<br>- Responsive trên mobile và desktop<br>- Tự động refresh khi có thay đổi |

---

## 3. Xem Danh Sách Hoạt Động (View Activities List)

| **Trường** | **Nội dung** |
|------------|--------------|
| **Tên Use Case** | Xem Danh Sách Hoạt Động (View Activities List) |
| **Mô tả** | Student xem danh sách tất cả các hoạt động có sẵn, có thể lọc theo trạng thái, tìm kiếm, và xem chi tiết từng hoạt động. |
| **Tác nhân (Actor)** | Student (CLUB_STUDENT, STUDENT) |
| **Điều kiện tiên quyết** | Student đã đăng nhập thành công |
| **Điều kiện sau** | Student đã xem danh sách hoạt động |
| **Luồng cơ bản** | 1. Student truy cập trang danh sách hoạt động<br>2. Hệ thống gọi API `GET /api/activities?status=published&visibility=public`<br>3. API kiểm tra quyền và lọc hoạt động:<br>   - Chỉ hiển thị hoạt động có `status = 'published'`<br>   - Chỉ hiển thị hoạt động có `visibility = 'public'`<br>4. API phân trang kết quả (mặc định 10 hoạt động/trang)<br>5. API trả về danh sách hoạt động với thông tin:<br>   - Tên, mô tả, ngày, địa điểm<br>   - Số người tham gia / maxParticipants<br>   - Trạng thái hoạt động<br>   - Ảnh đại diện (nếu có)<br>6. Frontend hiển thị danh sách với:<br>   - Bộ lọc (theo trạng thái, theo ngày)<br>   - Thanh tìm kiếm (theo tên, mô tả)<br>   - Phân trang<br>   - Nút "Xem chi tiết" cho từng hoạt động<br>   - Nút "Đăng ký" (nếu chưa đăng ký) |
| **Luồng thay thế** | **3a. Không có hoạt động nào**<br>- Hệ thống hiển thị thông báo "Chưa có hoạt động nào"<br><br>**3b. Lỗi kết nối API**<br>- Hệ thống hiển thị thông báo lỗi<br>- Student có thể thử lại |
| **Quy tắc nghiệp vụ** | - Chỉ hiển thị hoạt động công khai (`visibility = 'public'`) và đã xuất bản (`status = 'published'`)<br>- Hoạt động được sắp xếp theo ngày gần nhất<br>- Phân trang mặc định: 10 hoạt động/trang<br>- Student có thể xem tất cả hoạt động công khai, không phân biệt CLUB_STUDENT hay STUDENT |
| **Yêu cầu phi chức năng** | - Thời gian tải danh sách < 1 giây<br>- Hỗ trợ tìm kiếm real-time<br>- Hỗ trợ dark mode<br>- Responsive design |

---

## 4. Xem Chi Tiết Hoạt Động (View Activity Details)

| **Trường** | **Nội dung** |
|------------|--------------|
| **Tên Use Case** | Xem Chi Tiết Hoạt Động (View Activity Details) |
| **Mô tả** | Student xem chi tiết thông tin của một hoạt động, bao gồm thông tin cơ bản, địa điểm, thời gian, và trạng thái đăng ký của mình. |
| **Tác nhân (Actor)** | Student (CLUB_STUDENT, STUDENT) |
| **Điều kiện tiên quyết** | Student đã đăng nhập, hoạt động tồn tại và có `visibility = 'public'` |
| **Điều kiện sau** | Student đã xem chi tiết hoạt động |
| **Luồng cơ bản** | 1. Student chọn một hoạt động từ danh sách<br>2. Student nhấn nút "Xem chi tiết" hoặc click vào hoạt động<br>3. Hệ thống gọi API `GET /api/activities/[activityId]`<br>4. API kiểm tra quyền và xác minh hoạt động công khai<br>5. API populate thông tin người tham gia (userId)<br>6. API kiểm tra xem student đã đăng ký chưa:<br>   - Tìm trong mảng `participants` theo userId<br>   - Lấy `approvalStatus` (pending, approved, rejected)<br>7. API trả về thông tin hoạt động đầy đủ<br>8. Frontend hiển thị:<br>   - Thông tin cơ bản (tên, mô tả, ngày, địa điểm)<br>   - Bản đồ vị trí (nếu có locationData)<br>   - TimeSlots (nếu có nhiều buổi)<br>   - Số người tham gia / maxParticipants<br>   - Điểm tích lũy (nếu có)<br>   - Trạng thái đăng ký của student:<br>     - Chưa đăng ký → Hiển thị nút "Đăng ký"<br>     - Đã đăng ký, chờ duyệt → Hiển thị badge "Chờ duyệt"<br>     - Đã được duyệt → Hiển thị badge "Đã được duyệt" và nút "Điểm danh"<br>     - Bị từ chối → Hiển thị badge "Bị từ chối" và lý do<br>   - Nút "Điểm danh" (nếu đã được duyệt và hoạt động đang diễn ra) |
| **Luồng thay thế** | **4a. Hoạt động không tồn tại**<br>- API trả về lỗi 404 "Không tìm thấy hoạt động"<br>- Frontend hiển thị thông báo lỗi<br>- Student được chuyển hướng về danh sách hoạt động<br><br>**4b. Hoạt động không công khai**<br>- API trả về lỗi 403 "Bạn không có quyền xem hoạt động này"<br>- Frontend hiển thị thông báo lỗi |
| **Quy tắc nghiệp vụ** | - Chỉ hiển thị hoạt động công khai (`visibility = 'public'`)<br>- Student có thể xem chi tiết tất cả hoạt động công khai<br>- Trạng thái đăng ký được hiển thị rõ ràng<br>- Nút "Điểm danh" chỉ hiển thị khi:<br>   - Student đã được duyệt (`approvalStatus = 'approved'`)<br>   - Hoạt động đang diễn ra (`status = 'ongoing'`) hoặc đã bắt đầu |
| **Yêu cầu phi chức năng** | - Thời gian tải chi tiết < 1 giây<br>- Hỗ trợ dark mode<br>- Responsive design<br>- Hiển thị bản đồ tương tác (nếu có) |

---

## 5. Đăng Ký Tham Gia Hoạt Động (Register for Activity)

| **Trường** | **Nội dung** |
|------------|--------------|
| **Tên Use Case** | Đăng Ký Tham Gia Hoạt Động (Register for Activity) |
| **Mô tả** | Student đăng ký tham gia một hoạt động. Sau khi đăng ký, đơn đăng ký sẽ ở trạng thái "Chờ duyệt" và cần được officer duyệt. |
| **Tác nhân (Actor)** | Student (CLUB_STUDENT, STUDENT) |
| **Điều kiện tiên quyết** | Student đã đăng nhập, hoạt động tồn tại, hoạt động có `status = 'published'` hoặc `'ongoing'`, hoạt động chưa đầy người tham gia, student chưa đăng ký |
| **Điều kiện sau** | Student đã đăng ký, `approvalStatus = 'pending'` trong mảng `participants` của hoạt động |
| **Luồng cơ bản** | 1. Student xem chi tiết hoạt động<br>2. Student nhấn nút "Đăng ký tham gia"<br>3. Frontend hiển thị modal xác nhận đăng ký (nếu cần)<br>4. Student xác nhận đăng ký<br>5. Frontend gửi POST request đến `/api/activities/[activityId]/register`<br>6. Request body: `{ userId, name, email, role: 'Người Tham Gia' }`<br>7. API kiểm tra quyền (Student phải đã đăng nhập)<br>8. API tìm hoạt động theo activityId<br>9. API kiểm tra điều kiện đăng ký:<br>   - Hoạt động có `status = 'published'` hoặc `'ongoing'` (không cho phép nếu `'completed'`, `'cancelled'`, `'postponed'`, `'draft'`)<br>   - Ngày hoạt động chưa qua (nếu `status = 'published'`)<br>   - Chưa đầy người tham gia (`participants.length < maxParticipants`)<br>   - Student chưa đăng ký (không có trong mảng `participants`)<br>10. API thêm student vào mảng `participants`:<br>    - `userId = student.userId`<br>    - `name = student.name`<br>    - `email = student.email`<br>    - `role = 'Người Tham Gia'`<br>    - `joinedAt = new Date()`<br>    - `approvalStatus = 'pending'`<br>11. API lưu hoạt động<br>12. API trả về success message<br>13. Frontend cập nhật UI:<br>    - Thay đổi nút "Đăng ký" thành badge "Chờ duyệt"<br>    - Hiển thị thông báo thành công: "Đăng ký tham gia hoạt động thành công. Vui lòng chờ duyệt."<br>14. Frontend refresh thông tin hoạt động |
| **Luồng thay thế** | **7a. Student chưa đăng nhập**<br>- API trả về lỗi 401 "Unauthorized"<br>- Frontend chuyển hướng đến trang đăng nhập<br><br>**8a. Hoạt động không tồn tại**<br>- API trả về lỗi 404 "Không tìm thấy hoạt động"<br>- Frontend hiển thị thông báo lỗi<br><br>**9a. Hoạt động không còn mở đăng ký**<br>- API trả về lỗi 400 "Hoạt động này không còn mở đăng ký"<br>- Frontend hiển thị thông báo lỗi<br>- Nút "Đăng ký" bị vô hiệu hóa<br><br>**9b. Hoạt động đã đầy người tham gia**<br>- API trả về lỗi 400 "Hoạt động đã đầy người tham gia"<br>- Frontend hiển thị thông báo lỗi<br><br>**9c. Student đã đăng ký rồi**<br>- API trả về lỗi 400 "Bạn đã đăng ký tham gia hoạt động này rồi"<br>- Frontend hiển thị thông báo lỗi<br>- Frontend hiển thị trạng thái đăng ký hiện tại |
| **Quy tắc nghiệp vụ** | - Chỉ cho phép đăng ký khi hoạt động có `status = 'published'` hoặc `'ongoing'`<br>- Không cho phép đăng ký nếu hoạt động đã kết thúc (`status = 'completed'`, `'cancelled'`, `'postponed'`, `'draft'`)<br>- Không cho phép đăng ký nếu ngày hoạt động đã qua (đối với `status = 'published'`)<br>- Không cho phép đăng ký nếu đã đầy người tham gia<br>- Không cho phép đăng ký trùng lặp<br>- Sau khi đăng ký, `approvalStatus = 'pending'` (cần officer duyệt) |
| **Yêu cầu phi chức năng** | - Thời gian xử lý đăng ký < 1 giây<br>- Hiển thị loading state khi đang xử lý<br>- Thông báo thành công/lỗi rõ ràng<br>- Tự động refresh thông tin hoạt động sau khi đăng ký |

---

## 6. Hủy Đăng Ký Hoạt Động (Unregister from Activity)

| **Trường** | **Nội dung** |
|------------|--------------|
| **Tên Use Case** | Hủy Đăng Ký Hoạt Động (Unregister from Activity) |
| **Mô tả** | Student hủy đăng ký tham gia một hoạt động mà mình đã đăng ký. Student chỉ có thể hủy khi đơn đăng ký đang ở trạng thái "Chờ duyệt" hoặc "Đã được duyệt" nhưng hoạt động chưa bắt đầu. |
| **Tác nhân (Actor)** | Student (CLUB_STUDENT, STUDENT) |
| **Điều kiện tiên quyết** | Student đã đăng nhập, đã đăng ký hoạt động, hoạt động chưa bắt đầu hoặc đang ở trạng thái "Chờ duyệt" |
| **Điều kiện sau** | Student đã bị xóa khỏi mảng `participants` của hoạt động |
| **Luồng cơ bản** | 1. Student xem chi tiết hoạt động mà mình đã đăng ký<br>2. Student nhấn nút "Hủy đăng ký"<br>3. Frontend hiển thị modal xác nhận hủy đăng ký<br>4. Student xác nhận hủy đăng ký<br>5. Frontend gửi DELETE request đến `/api/activities/[activityId]/register`<br>6. Request body: `{ userId }`<br>7. API kiểm tra quyền (Student phải đã đăng nhập)<br>8. API tìm hoạt động theo activityId<br>9. API tìm và xóa student khỏi mảng `participants`<br>10. API lưu hoạt động<br>11. API trả về success message<br>12. Frontend cập nhật UI:<br>    - Thay đổi badge "Chờ duyệt" hoặc "Đã được duyệt" thành nút "Đăng ký"<br>    - Hiển thị thông báo thành công: "Đã hủy đăng ký thành công"<br>13. Frontend refresh thông tin hoạt động |
| **Luồng thay thế** | **7a. Student chưa đăng nhập**<br>- API trả về lỗi 401 "Unauthorized"<br>- Frontend chuyển hướng đến trang đăng nhập<br><br>**9a. Student chưa đăng ký**<br>- API trả về lỗi 404 "Không tìm thấy đăng ký"<br>- Frontend hiển thị thông báo lỗi<br><br>**9b. Hoạt động đã bắt đầu**<br>- API có thể từ chối hủy đăng ký (tùy quy tắc nghiệp vụ)<br>- Frontend hiển thị thông báo "Không thể hủy đăng ký khi hoạt động đã bắt đầu" |
| **Quy tắc nghiệp vụ** | - Student chỉ có thể hủy đăng ký khi:<br>   - Đơn đăng ký đang ở trạng thái "Chờ duyệt" (`approvalStatus = 'pending'`)<br>   - Hoặc đã được duyệt nhưng hoạt động chưa bắt đầu<br>- Không thể hủy đăng ký khi hoạt động đã bắt đầu hoặc đã kết thúc<br>- Sau khi hủy, student sẽ bị xóa khỏi mảng `participants` |
| **Yêu cầu phi chức năng** | - Thời gian xử lý hủy đăng ký < 1 giây<br>- Modal xác nhận rõ ràng để tránh hủy nhầm<br>- Hiển thị loading state khi đang xử lý<br>- Thông báo thành công/lỗi rõ ràng |

---

## 7. Điểm Danh (Check-in Attendance)

| **Trường** | **Nội dung** |
|------------|--------------|
| **Tên Use Case** | Điểm Danh (Check-in Attendance) |
| **Mô tả** | Student điểm danh tham gia hoạt động bằng cách chụp ảnh và gửi vị trí GPS. Hệ thống sẽ tự động xác minh vị trí và thời gian, sau đó tạo bản ghi điểm danh với trạng thái "Chờ duyệt" hoặc "Hợp lệ" tùy thuộc vào điều kiện. |
| **Tác nhân (Actor)** | Student (CLUB_STUDENT, STUDENT) |
| **Điều kiện tiên quyết** | Student đã đăng nhập, đã đăng ký và được duyệt tham gia hoạt động (`approvalStatus = 'approved'`), hoạt động đang diễn ra hoặc đã bắt đầu |
| **Điều kiện sau** | Bản ghi điểm danh đã được tạo với trạng thái `pending` hoặc `approved` |
| **Luồng cơ bản** | **Bước 1: Student mở trang điểm danh**<br>1.1. Student truy cập `/student/attendance/[activityId]` từ chi tiết hoạt động<br>1.2. Hệ thống kiểm tra quyền truy cập (CLUB_STUDENT, STUDENT)<br>1.3. Hệ thống gọi API `GET /api/activities/[activityId]` để lấy thông tin hoạt động<br>1.4. Hệ thống gọi API `GET /api/activities/[activityId]/attendance/student` để lấy lịch sử điểm danh<br>1.5. API kiểm tra student đã được duyệt chưa (`approvalStatus = 'approved'`)<br>1.6. API trả về thông tin hoạt động và lịch sử điểm danh<br>1.7. Frontend hiển thị:<br>   - Thông tin hoạt động (tên, ngày, địa điểm)<br>   - Bản đồ vị trí hoạt động (nếu có locationData)<br>   - TimeSlots (nếu có nhiều buổi)<br>   - Lịch sử điểm danh (nếu có)<br>   - Nút "Điểm danh" hoặc "Check-in"<br><br>**Bước 2: Student chọn timeSlot và checkInType**<br>2.1. Nếu hoạt động có nhiều timeSlot, Student chọn buổi (morning/afternoon/evening)<br>2.2. Student chọn loại điểm danh:<br>   - "Bắt đầu" (start) - điểm danh khi đến<br>   - "Kết thúc" (end) - điểm danh khi về<br>2.3. Frontend lưu lựa chọn<br><br>**Bước 3: Student chụp ảnh và lấy vị trí GPS**<br>3.1. Student nhấn nút "Điểm danh"<br>3.2. Frontend yêu cầu quyền truy cập camera (nếu chưa có)<br>3.3. Frontend mở camera để chụp ảnh<br>3.4. Student chụp ảnh điểm danh<br>3.5. Frontend lưu ảnh dưới dạng base64 hoặc DataURL<br>3.6. Frontend yêu cầu quyền truy cập vị trí (nếu chưa có)<br>3.7. Frontend lấy vị trí GPS hiện tại bằng `navigator.geolocation.getCurrentPosition()`<br>3.8. Frontend lấy địa chỉ từ tọa độ GPS (reverse geocoding, nếu có)<br>3.9. Frontend hiển thị preview:<br>   - Ảnh đã chụp<br>   - Vị trí GPS (lat, lng, address)<br>   - Khoảng cách từ vị trí hoạt động (nếu có)<br>   - Thời gian điểm danh<br>3.10. Student xác nhận hoặc chụp lại<br><br>**Bước 4: Student gửi điểm danh**<br>4.1. Student nhấn nút "Xác nhận điểm danh"<br>4.2. Frontend upload ảnh lên Cloudinary (nếu cần) hoặc gửi trực tiếp<br>4.3. Frontend gửi PATCH request đến `/api/activities/[activityId]/attendance`<br>4.4. Request body:<br>   - `userId`: ID của student<br>   - `checkedIn: true`<br>   - `location: { lat, lng, address }`<br>   - `photoUrl`: URL ảnh đã upload<br>   - `timeSlot`: Tên buổi (nếu có)<br>   - `checkInType`: 'start' hoặc 'end'<br>   - `checkInTime`: Thời gian điểm danh (ISO string)<br>   - `lateReason`: Lý do muộn (nếu muộn)<br>4.5. Frontend hiển thị loading state<br><br>**Bước 5: Hệ thống xử lý và tạo bản ghi điểm danh**<br>5.1. API nhận request và kiểm tra quyền (CLUB_STUDENT, STUDENT)<br>5.2. API validate input (userId, checkedIn, location, photoUrl)<br>5.3. API tìm hoạt động theo activityId<br>5.4. API kiểm tra student đã được duyệt (`approvalStatus = 'approved'`)<br>5.5. API validate vị trí:<br>   - Tính khoảng cách từ vị trí điểm danh đến vị trí hoạt động<br>   - Kiểm tra khoảng cách có nằm trong bán kính cho phép không (nếu có locationData.radius)<br>5.6. API validate thời gian:<br>   - Kiểm tra thời gian điểm danh có nằm trong khoảng thời gian quy định không<br>   - Xác định trạng thái: đúng giờ, muộn (trong 15-30 phút), hoặc quá muộn<br>5.7. API xác định trạng thái điểm danh:<br>   - Nếu đúng giờ, đúng vị trí, có ảnh → `status = 'approved'` (tự động duyệt)<br>   - Nếu muộn nhưng trong thời gian chấp nhận được, đúng vị trí, có ảnh → `status = 'pending'` (cần officer duyệt)<br>   - Nếu không đúng vị trí hoặc không có ảnh → `status = 'rejected'` hoặc `'pending'`<br>5.8. API tìm hoặc tạo Attendance document:<br>   - Tìm Attendance document theo `activityId` và `userId`<br>   - Nếu không có, tạo mới<br>5.9. API tạo attendance record mới trong mảng `attendances`:<br>   - `timeSlot`: Tên buổi<br>   - `checkInType`: 'start' hoặc 'end'<br>   - `checkInTime`: Thời gian điểm danh<br>   - `location`: Vị trí GPS<br>   - `photoUrl`: URL ảnh<br>   - `status`: 'approved', 'pending', hoặc 'rejected'<br>   - `lateReason`: Lý do muộn (nếu có)<br>5.10. API lưu Attendance document<br>5.11. API trả về response:<br>    - `success: true`<br>    - `message`: Thông báo thành công<br>    - `data.attendance`: Thông tin bản ghi điểm danh<br>5.12. Frontend nhận response thành công<br>5.13. Frontend cập nhật UI:<br>    - Hiển thị thông báo thành công<br>    - Hiển thị trạng thái điểm danh (Hợp lệ/Chờ duyệt/Không hợp lệ)<br>    - Cập nhật lịch sử điểm danh<br>    - Ẩn nút "Điểm danh" nếu đã điểm danh đủ<br>5.14. Frontend refresh thông tin điểm danh |
| **Luồng thay thế** | **1.4a. Student chưa được duyệt**<br>- API trả về lỗi "Bạn chưa được duyệt tham gia hoạt động này"<br>- Frontend hiển thị thông báo lỗi<br>- Student không thể điểm danh<br><br>**3.2a. Không có quyền truy cập camera**<br>- Frontend hiển thị thông báo "Cần quyền truy cập camera để điểm danh"<br>- Student có thể cấp quyền hoặc hủy<br><br>**3.6a. Không có quyền truy cập vị trí**<br>- Frontend hiển thị thông báo "Cần quyền truy cập vị trí để điểm danh"<br>- Student có thể cấp quyền hoặc hủy<br><br>**3.7a. Không lấy được vị trí GPS**<br>- Frontend hiển thị thông báo "Không thể lấy vị trí GPS"<br>- Student có thể thử lại hoặc hủy<br><br>**5.4a. Student chưa được duyệt**<br>- API trả về lỗi "Bạn chưa được duyệt tham gia hoạt động này"<br>- Frontend hiển thị thông báo lỗi<br><br>**5.5a. Vị trí không hợp lệ (quá xa)**<br>- API xác định vị trí nằm ngoài bán kính cho phép<br> - Trạng thái điểm danh có thể là `'pending'` hoặc `'rejected'`<br>- Frontend hiển thị cảnh báo "Vị trí điểm danh không khớp với địa điểm hoạt động"<br><br>**5.6a. Thời gian không hợp lệ (quá muộn hoặc quá sớm)**<br>- API xác định thời gian điểm danh nằm ngoài khoảng thời gian quy định<br>- Trạng thái điểm danh có thể là `'pending'` hoặc `'rejected'`<br>- Frontend hiển thị cảnh báo "Thời gian điểm danh không hợp lệ"<br><br>**5.7a. Thiếu ảnh hoặc ảnh không hợp lệ**<br>- API từ chối điểm danh hoặc đặt trạng thái `'pending'`<br>- Frontend hiển thị thông báo "Cần ảnh điểm danh hợp lệ" |
| **Quy tắc nghiệp vụ** | - Chỉ student đã được duyệt (`approvalStatus = 'approved'`) mới có thể điểm danh<br>- Bắt buộc phải có ảnh điểm danh<br>- Bắt buộc phải có vị trí GPS<br>- Vị trí điểm danh phải nằm trong bán kính cho phép (nếu có locationData.radius)<br>- Thời gian điểm danh phải nằm trong khoảng thời gian quy định:<br>   - Đúng giờ: trong vòng 15 phút trước/sau thời gian bắt đầu<br>   - Muộn nhưng hợp lệ: trong vòng 15-30 phút sau thời gian bắt đầu<br>   - Quá muộn: sau 30 phút (có thể bị từ chối hoặc cần lý do)<br>- Trạng thái điểm danh:<br>   - `'approved'`: Đúng giờ, đúng vị trí, có ảnh → Tự động duyệt<br>   - `'pending'`: Muộn nhưng trong thời gian chấp nhận được, đúng vị trí, có ảnh → Cần officer duyệt<br>   - `'rejected'`: Không đúng vị trí, không có ảnh, hoặc quá muộn → Bị từ chối<br>- Mỗi timeSlot và checkInType chỉ có thể điểm danh một lần<br>- Student có thể điểm danh nhiều lần nếu có nhiều timeSlot (sáng, chiều, tối) |
| **Yêu cầu phi chức năng** | - Thời gian xử lý điểm danh < 2 giây<br>- Hỗ trợ chụp ảnh trực tiếp từ camera<br> - Hỗ trợ lấy vị trí GPS chính xác<br>- Hiển thị preview ảnh và vị trí trước khi gửi<br>- Hiển thị loading state khi đang xử lý<br>- Thông báo thành công/lỗi rõ ràng<br>- Hỗ trợ dark mode<br>- Responsive design cho mobile và desktop<br>- Hỗ trợ reverse geocoding để hiển thị địa chỉ từ tọa độ GPS |

---

## 8. Xem Lịch Sử Điểm Danh (View Attendance History)

| **Trường** | **Nội dung** |
|------------|--------------|
| **Tên Use Case** | Xem Lịch Sử Điểm Danh (View Attendance History) |
| **Mô tả** | Student xem lịch sử điểm danh của mình cho một hoạt động, bao gồm các bản ghi điểm danh, trạng thái duyệt, và thông tin chi tiết. |
| **Tác nhân (Actor)** | Student (CLUB_STUDENT, STUDENT) |
| **Điều kiện tiên quyết** | Student đã đăng nhập, đã đăng ký và được duyệt tham gia hoạt động |
| **Điều kiện sau** | Student đã xem lịch sử điểm danh |
| **Luồng cơ bản** | 1. Student truy cập `/student/attendance/[activityId]` hoặc xem từ chi tiết hoạt động<br>2. Hệ thống gọi API `GET /api/activities/[activityId]/attendance/student`<br>3. API kiểm tra quyền và xác minh student đã được duyệt<br>4. API tìm Attendance document theo `activityId` và `userId`<br>5. API trả về danh sách attendance records trong mảng `attendances`<br>6. Frontend hiển thị:<br>   - Thông tin hoạt động (tên, ngày, địa điểm)<br>   - Danh sách các bản ghi điểm danh với:<br>     - TimeSlot (buổi điểm danh)<br>     - CheckInType (start/end)<br>     - CheckInTime (thời gian điểm danh)<br>     - Location (vị trí GPS và địa chỉ)<br>     - PhotoUrl (ảnh điểm danh, có thể click để xem full size)<br>     - Status (pending/approved/rejected)<br>     - VerifiedBy (người duyệt, nếu đã duyệt)<br>     - VerifiedAt (thời gian duyệt, nếu đã duyệt)<br>     - VerificationNote (ghi chú xác minh, nếu có)<br>     - LateReason (lý do muộn, nếu có)<br>   - Thống kê:<br>     - Tổng số lần điểm danh<br>     - Số lần đã được duyệt<br>     - Số lần chờ duyệt<br>     - Số lần bị từ chối |
| **Luồng thay thế** | **3a. Student chưa được duyệt**<br>- API trả về lỗi "Bạn chưa được duyệt tham gia hoạt động này"<br>- Frontend hiển thị thông báo lỗi<br><br>**4a. Không có bản ghi điểm danh nào**<br>- API trả về danh sách rỗng<br>- Frontend hiển thị thông báo "Chưa có điểm danh nào"<br>- Hiển thị nút "Điểm danh" |
| **Quy tắc nghiệp vụ** | - Chỉ hiển thị lịch sử điểm danh của chính student<br>- Mỗi bản ghi điểm danh được hiển thị với đầy đủ thông tin<br>- Trạng thái được hiển thị rõ ràng với badge màu sắc:<br>   - Pending: vàng (chờ duyệt)<br>   - Approved: xanh (hợp lệ)<br>   - Rejected: đỏ (không hợp lệ) |
| **Yêu cầu phi chức năng** | - Thời gian tải lịch sử < 1 giây<br>- Hỗ trợ xem ảnh full size trong modal<br>- Hỗ trợ dark mode<br>- Responsive design |

---

## 9. Xem Thông Tin Cá Nhân (View Profile)

| **Trường** | **Nội dung** |
|------------|--------------|
| **Tên Use Case** | Xem Thông Tin Cá Nhân (View Profile) |
| **Mô tả** | Student xem thông tin cá nhân của mình, bao gồm thông tin cơ bản, role, và trạng thái membership. |
| **Tác nhân (Actor)** | Student (CLUB_STUDENT, STUDENT) |
| **Điều kiện tiên quyết** | Student đã đăng nhập thành công |
| **Điều kiện sau** | Student đã xem thông tin cá nhân |
| **Luồng cơ bản** | 1. Student truy cập `/student/profile`<br>2. Hệ thống lấy thông tin user từ auth state (localStorage)<br>3. Hệ thống gọi API `/api/auth/me` hoặc `/api/users/profile` (nếu cần)<br>4. API kiểm tra quyền và trả về thông tin user<br>5. Frontend hiển thị:<br>   - Thông tin cơ bản (tên, email, studentId, phone, class, faculty)<br>   - Role và badge màu sắc<br>   - Avatar<br>   - Trạng thái membership (nếu có)<br>   - Nút "Chỉnh sửa" để cập nhật thông tin |
| **Luồng thay thế** | **3a. API trả về lỗi**<br>- Frontend hiển thị thông báo lỗi<br>- Student có thể thử lại |
| **Quy tắc nghiệp vụ** | - Thông tin được lấy từ JWT token hoặc database<br>- Role được hiển thị với badge màu sắc:<br>  - CLUB_STUDENT: green<br>  - STUDENT: gray |
| **Yêu cầu phi chức năng** | - Thời gian tải profile < 0.5 giây<br>- Hỗ trợ dark mode<br>- Responsive design |

---

## 10. Cập Nhật Thông Tin Cá Nhân (Update Profile)

| **Trường** | **Nội dung** |
|------------|--------------|
| **Tên Use Case** | Cập Nhật Thông Tin Cá Nhân (Update Profile) |
| **Mô tả** | Student cập nhật thông tin cá nhân như tên, số điện thoại, lớp, khoa, và avatar. |
| **Tác nhân (Actor)** | Student (CLUB_STUDENT, STUDENT) |
| **Điều kiện tiên quyết** | Student đã đăng nhập thành công |
| **Điều kiện sau** | Thông tin cá nhân đã được cập nhật trong database |
| **Luồng cơ bản** | 1. Student truy cập `/student/profile`<br>2. Student nhấn nút "Chỉnh sửa"<br>3. Frontend hiển thị form chỉnh sửa với các trường:<br>   - Tên (name)<br>   - Số điện thoại (phone)<br>   - Lớp (class)<br>   - Khoa (faculty)<br>   - Avatar (upload ảnh)<br>4. Student chỉnh sửa thông tin<br>5. Student nhấn nút "Lưu"<br>6. Frontend validate form<br>7. Nếu có avatar mới, Frontend upload ảnh lên Cloudinary<br>8. Frontend gửi PATCH request đến `/api/users/profile`<br>9. Request body: `{ name, phone, class, faculty, avatarUrl }`<br>10. API kiểm tra quyền và xác minh userId<br>11. API cập nhật thông tin user trong database<br>12. API trả về user đã cập nhật<br>13. Frontend cập nhật auth state và localStorage<br>14. Frontend hiển thị thông báo thành công<br>15. Frontend refresh thông tin profile |
| **Luồng thay thế** | **6a. Form validation thất bại**<br>- Frontend hiển thị lỗi validation<br>- Student sửa lỗi và thử lại<br><br>**7a. Upload ảnh thất bại**<br>- Frontend hiển thị lỗi upload<br>- Student có thể thử lại hoặc bỏ qua<br><br>**10a. API trả về lỗi**<br>- Frontend hiển thị thông báo lỗi<br>- Student có thể thử lại |
| **Quy tắc nghiệp vụ** | - Email và studentId không thể thay đổi<br>- Avatar được upload lên Cloudinary<br>- Tên, phone, class, faculty có thể được cập nhật<br>- Validation: phone phải đúng định dạng (nếu có) |
| **Yêu cầu phi chức năng** | - Thời gian cập nhật < 2 giây<br>- Hỗ trợ upload ảnh với preview<br>- Hiển thị loading state khi đang xử lý<br>- Thông báo thành công/lỗi rõ ràng<br>- Tự động cập nhật auth state sau khi lưu |

---

## 11. Đăng Ký CLB (Register for Club Membership)

| **Trường** | **Nội dung** |
|------------|--------------|
| **Tên Use Case** | Đăng Ký CLB (Register for Club Membership) |
| **Mô tả** | Student đăng ký trở thành thành viên CLB "5 Tốt" bằng cách điền form đăng ký với các thông tin về động lực, kinh nghiệm, kỳ vọng, và cam kết. |
| **Tác nhân (Actor)** | Student (STUDENT, CLUB_STUDENT nếu đã bị xóa và muốn đăng ký lại) |
| **Điều kiện tiên quyết** | Student đã đăng nhập, chưa có membership ACTIVE hoặc PENDING, hoặc đã bị REMOVED và đủ thời gian chờ (30 ngày) |
| **Điều kiện sau** | Đơn đăng ký CLB đã được tạo với `status = 'PENDING'` |
| **Luồng cơ bản** | 1. Student truy cập `/student/register`<br>2. Hệ thống kiểm tra trạng thái membership hiện tại<br>3. Nếu đã có membership ACTIVE hoặc PENDING:<br>   - Frontend hiển thị thông báo "Bạn đã có đơn đăng ký trong hệ thống"<br>   - Không cho phép đăng ký lại<br>4. Nếu đã bị REMOVED:<br>   - Hệ thống kiểm tra thời gian chờ (waitTime, thường 30 ngày)<br>   - Nếu chưa đủ thời gian: Hiển thị thông báo và countdown<br>   - Nếu đủ thời gian: Cho phép đăng ký lại, hiển thị trường "Lý do đăng ký lại"<br>5. Student điền form đăng ký:<br>   - Động lực tham gia (motivation)<br>   - Kinh nghiệm (experience)<br>   - Kỳ vọng (expectations)<br>   - Cam kết (commitment)<br>   - Lý do đăng ký lại (reapplicationReason, nếu đã bị REMOVED)<br>6. Student nhấn nút "Gửi đơn đăng ký"<br>7. Frontend validate form (tất cả trường bắt buộc phải điền)<br>8. Frontend gửi POST request đến `/api/memberships`<br>9. Request body:<br>   - `userId`: ID của student<br>   - `motivation`, `experience`, `expectations`, `commitment`<br>   - `reapplicationReason` (nếu có)<br>10. API kiểm tra quyền và validate input<br>11. API kiểm tra student chưa có membership ACTIVE hoặc PENDING<br>12. API kiểm tra thời gian chờ (nếu đã bị REMOVED)<br>13. API tạo Membership document mới:<br>    - `userId = student.userId`<br>    - `status = 'PENDING'`<br>    - `motivation`, `experience`, `expectations`, `commitment`<br>    - `reapplicationReason` (nếu có)<br>    - `createdAt = new Date()`<br>14. API lưu Membership document<br>15. API trả về success message<br>16. Frontend hiển thị thông báo thành công: "Đăng ký thành công. Vui lòng chờ duyệt."<br>17. Frontend có thể chuyển hướng về dashboard |
| **Luồng thay thế** | **3a. Đã có membership ACTIVE hoặc PENDING**<br>- Frontend hiển thị thông báo "Bạn đã có đơn đăng ký trong hệ thống"<br>- Không cho phép đăng ký lại<br><br>**4a. Chưa đủ thời gian chờ (nếu đã bị REMOVED)**<br>- Frontend hiển thị thông báo và countdown thời gian còn lại<br> - Không cho phép đăng ký lại<br><br>**7a. Form validation thất bại**<br>- Frontend hiển thị lỗi validation<br>- Student sửa lỗi và thử lại<br><br>**11a. Đã có membership ACTIVE hoặc PENDING**<br>- API trả về lỗi "Bạn đã có đơn đăng ký trong hệ thống"<br>- Frontend hiển thị thông báo lỗi<br><br>**12a. Chưa đủ thời gian chờ**<br>- API trả về lỗi "Bạn cần đợi thêm X ngày nữa mới có thể đăng ký lại"<br>- Frontend hiển thị thông báo lỗi |
| **Quy tắc nghiệp vụ** | - Student chỉ có thể đăng ký khi chưa có membership ACTIVE hoặc PENDING<br>- Nếu đã bị REMOVED, phải đợi 30 ngày mới được đăng ký lại<br>- Tất cả các trường trong form đều bắt buộc<br>- Nếu đã bị REMOVED, trường "Lý do đăng ký lại" cũng bắt buộc<br>- Sau khi đăng ký, `status = 'PENDING'` (cần admin duyệt) |
| **Yêu cầu phi chức năng** | - Thời gian xử lý đăng ký < 1 giây<br>- Form có validation đầy đủ<br>- Hiển thị loading state khi đang xử lý<br>- Thông báo thành công/lỗi rõ ràng<br>- Hiển thị countdown thời gian chờ (nếu có) |

---

## 12. Xem Thông Tin Bị Xóa & Đăng Ký Lại (View Removal Info)

| **Trường** | **Nội dung** |
|------------|--------------|
| **Tên Use Case** | Xem Thông Tin Bị Xóa & Đăng Ký Lại (View Removal Info) |
| **Mô tả** | Student xem thông tin về việc bị xóa khỏi CLB (nếu có), lý do xóa, và có thể đăng ký lại nếu đủ điều kiện. |
| **Tác nhân (Actor)** | Student (CLUB_STUDENT, STUDENT) |
| **Điều kiện tiên quyết** | Student đã đăng nhập, có membership với status REMOVED hoặc đã được restore |
| **Điều kiện sau** | Student đã xem thông tin removal/restoration |
| **Luồng cơ bản** | 1. Student truy cập `/student/removal-info`<br>2. Hệ thống gọi API `/api/memberships/removal-status` hoặc `/api/memberships/my-status`<br>3. API tìm membership mới nhất của user<br>4. API kiểm tra membership.status<br>5. Nếu status = 'REMOVED':<br>   - API trả về thông tin removal:<br>     - `removedAt`: Thời gian bị xóa<br>     - `removedBy`: Người xóa (name, studentId)<br>     - `removalReason`: Lý do xóa<br>     - `waitTime`: Thời gian chờ (30 ngày)<br>     - `canReapply`: Có thể đăng ký lại không<br>     - `daysRemaining`: Số ngày còn lại<br>6. Nếu đã được restore:<br>   - API trả về thông tin restoration:<br>     - `restoredAt`: Thời gian được duyệt lại<br>     - `restoredBy`: Người duyệt lại (name, studentId)<br>     - `restorationReason`: Lý do duyệt lại<br>7. Frontend hiển thị:<br>   - Thông tin removal (nếu REMOVED):<br>     - Thời gian bị xóa<br>     - Người xóa<br>     - Lý do xóa<br>     - Thời gian chờ còn lại (countdown)<br>   - Thông tin restoration (nếu đã restore)<br>   - Nút "Đăng ký lại" (nếu đủ điều kiện, `canReapply = true`)<br>   - Nút "Xem chi tiết" để xem lịch sử removal |
| **Luồng thay thế** | **4a. Không có membership REMOVED**<br>- Frontend hiển thị thông báo "Bạn chưa bị xóa khỏi CLB"<br>- Không hiển thị nút đăng ký lại |
| **Quy tắc nghiệp vụ** | - Chỉ hiển thị khi membership.status = 'REMOVED' hoặc đã được restore<br>- Nếu REMOVED, phải đợi `waitTime` (thường 30 ngày) mới được đăng ký lại<br>- Thông tin removal bao gồm: removedAt, removedBy, removalReason<br>- Thông tin restoration bao gồm: restoredAt, restoredBy, restorationReason<br>- Countdown thời gian chờ được hiển thị real-time |
| **Yêu cầu phi chức năng** | - Thời gian tải thông tin < 1 giây<br>- Hỗ trợ dark mode<br>- Hiển thị countdown thời gian chờ (nếu có) |

---

## 13. Liên Hệ Admin (Contact Admin)

| **Trường** | **Nội dung** |
|------------|--------------|
| **Tên Use Case** | Liên Hệ Admin (Contact Admin) |
| **Mô tả** | Student gửi tin nhắn liên hệ đến admin để hỏi đáp, báo cáo vấn đề, hoặc yêu cầu hỗ trợ. |
| **Tác nhân (Actor)** | Student (CLUB_STUDENT, STUDENT) |
| **Điều kiện tiên quyết** | Student đã đăng nhập thành công |
| **Điều kiện sau** | Tin nhắn liên hệ đã được gửi và lưu trong database |
| **Luồng cơ bản** | 1. Student truy cập `/student/contact`<br>2. Frontend hiển thị form liên hệ:<br>   - Tiêu đề (subject)<br>   - Nội dung tin nhắn (message)<br>   - Mức độ ưu tiên (priority): low, medium, high<br>3. Student điền form liên hệ<br>4. Student nhấn nút "Gửi tin nhắn"<br>5. Frontend validate form (subject và message bắt buộc)<br>6. Frontend gửi POST request đến `/api/contact`<br>7. Request body:<br>   - `userId`: ID của student<br>   - `subject`: Tiêu đề<br>   - `message`: Nội dung tin nhắn<br>   - `priority`: Mức độ ưu tiên (mặc định: medium)<br>8. API kiểm tra quyền và validate input<br>9. API tạo ContactRequest document mới:<br>   - `userId = student.userId`<br>   - `subject`, `message`, `priority`<br>   - `status = 'pending'`<br>   - `createdAt = new Date()`<br>10. API lưu ContactRequest document<br>11. API trả về success message<br>12. Frontend hiển thị thông báo thành công: "Tin nhắn đã được gửi. Chúng tôi sẽ phản hồi sớm nhất có thể."<br>13. Frontend reset form |
| **Luồng thay thế** | **5a. Form validation thất bại**<br>- Frontend hiển thị lỗi validation<br>- Student sửa lỗi và thử lại<br><br>**8a. API trả về lỗi**<br>- Frontend hiển thị thông báo lỗi<br>- Student có thể thử lại |
| **Quy tắc nghiệp vụ** | - Subject và message là bắt buộc<br>- Priority mặc định là 'medium'<br>- Sau khi gửi, `status = 'pending'` (chờ admin xử lý)<br>- Student có thể xem lịch sử tin nhắn đã gửi (nếu có tính năng này) |
| **Yêu cầu phi chức năng** | - Thời gian xử lý gửi tin nhắn < 1 giây<br>- Form có validation đầy đủ<br>- Hiển thị loading state khi đang xử lý<br>- Thông báo thành công/lỗi rõ ràng |

---

## Tổng Kết

Tài liệu này mô tả **13 Use Cases** chính của Student trong hệ thống quản lý hoạt động CLB "5 Tốt" TDMU. Các Use Cases được phân loại theo chức năng:

- **Xác thực**: Đăng nhập (1)
- **Dashboard**: Xem dashboard, xem danh sách hoạt động (2-3)
- **Quản lý hoạt động**: Xem chi tiết, đăng ký, hủy đăng ký (4-6)
- **Quản lý điểm danh**: Điểm danh, xem lịch sử (7-8)
- **Quản lý cá nhân**: Xem và cập nhật profile (9-10)
- **Quản lý membership**: Đăng ký CLB, xem thông tin removal (11-12)
- **Hỗ trợ**: Liên hệ admin (13)

Tất cả các Use Cases đều tuân thủ quyền truy cập dựa trên role và membership status, đảm bảo tính bảo mật và toàn vẹn dữ liệu của hệ thống.

