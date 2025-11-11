# Đặc Tả Use Cases Chi Tiết - Officer (Cán Bộ CLB)

## Tổng Quan

Tài liệu này mô tả chi tiết các Use Cases của **Officer** (Cán bộ CLB) trong hệ thống quản lý hoạt động CLB "5 Tốt" TDMU. Officer bao gồm các role: `CLUB_DEPUTY`, `CLUB_MEMBER`, `OFFICER`.

---

## 1. Đăng Nhập (Login)

| **Trường** | **Nội dung** |
|------------|--------------|
| **Tên Use Case** | Đăng nhập (Login) |
| **Mô tả** | Officer đăng nhập vào hệ thống bằng email và mật khẩu. Hệ thống xác thực thông tin, kiểm tra membership status, xác định effectiveRole và redirectUrl, tạo JWT token, và điều hướng đến dashboard phù hợp. |
| **Tác nhân (Actor)** | Officer (CLUB_DEPUTY, CLUB_MEMBER, OFFICER) |
| **Điều kiện tiên quyết** | Officer đã có tài khoản trong hệ thống |
| **Điều kiện sau** | Officer đã đăng nhập thành công và được điều hướng đến `/officer/dashboard` |
| **Luồng cơ bản** | 1. Officer truy cập trang đăng nhập<br>2. Officer nhập email và mật khẩu<br>3. Officer nhấn nút "Đăng nhập"<br>4. Hệ thống validate input (email, password không rỗng)<br>5. Hệ thống tìm user theo email (exclude isDeleted)<br>6. Hệ thống so sánh mật khẩu với bcrypt.compare()<br>7. Hệ thống tạo JWT token (expiresIn: 7d)<br>8. Hệ thống tìm membership mới nhất theo userId<br>9. Hệ thống xác định effectiveRole và redirectUrl:<br>   - CLUB_DEPUTY, CLUB_MEMBER, OFFICER → redirectUrl = '/officer/dashboard'<br>   - Nếu membership.status === 'REMOVED' → effectiveRole = 'STUDENT', redirectUrl = '/student/dashboard'<br>10. Hệ thống trả về response với user, token, redirectUrl, effectiveRole<br>11. Frontend lưu token vào localStorage<br>12. Frontend cập nhật auth state<br>13. Frontend điều hướng đến redirectUrl |
| **Luồng thay thế** | **3a. Email hoặc mật khẩu không đúng**<br>- Hệ thống trả về lỗi "Email hoặc mật khẩu không đúng"<br>- Officer có thể nhập lại thông tin<br><br>**3b. User không tồn tại**<br>- Hệ thống trả về lỗi "Email hoặc mật khẩu không đúng"<br>- Officer có thể nhập lại thông tin<br><br>**3c. Membership status là REMOVED**<br>- Hệ thống downgrade effectiveRole thành STUDENT<br>- RedirectUrl được đặt thành /student/dashboard<br>- Officer bị chuyển hướng đến student dashboard<br><br>**3d. Token hết hạn hoặc không hợp lệ**<br>- Hệ thống yêu cầu đăng nhập lại |
| **Quy tắc nghiệp vụ** | - Email phải đúng định dạng và tồn tại trong hệ thống<br>- Mật khẩu phải khớp với passwordHash trong database<br>- JWT token có thời hạn 7 ngày<br>- EffectiveRole được xác định dựa trên user.role và membership.status<br>- Nếu membership.status === 'REMOVED':<br>  - CLUB_DEPUTY, CLUB_MEMBER, CLUB_STUDENT → effectiveRole = 'STUDENT'<br>  - CLUB_LEADER → giữ nguyên role (admin access)<br>- RedirectUrl được xác định:<br>  - CLUB_DEPUTY, CLUB_MEMBER, OFFICER → /officer/dashboard<br>  - Nếu REMOVED → /student/dashboard |
| **Yêu cầu phi chức năng** | - Thời gian phản hồi đăng nhập < 2 giây<br>- Mật khẩu được hash bằng bcrypt với salt rounds ≥ 10<br>- JWT token được lưu an toàn trong localStorage<br>- Hỗ trợ dark mode |

---

## 2. Xem Dashboard (View Dashboard)

| **Trường** | **Nội dung** |
|------------|--------------|
| **Tên Use Case** | Xem Dashboard (View Dashboard) |
| **Mô tả** | Officer xem tổng quan các hoạt động mà mình phụ trách, thống kê số lượng hoạt động, người tham gia, và các chỉ số quan trọng khác. |
| **Tác nhân (Actor)** | Officer (CLUB_DEPUTY, CLUB_MEMBER, OFFICER) |
| **Điều kiện tiên quyết** | Officer đã đăng nhập thành công |
| **Điều kiện sau** | Officer đã xem dashboard với thông tin cập nhật |
| **Luồng cơ bản** | 1. Officer truy cập `/officer/dashboard`<br>2. Hệ thống kiểm tra quyền truy cập (CLUB_DEPUTY, OFFICER, CLUB_MEMBER)<br>3. Hệ thống gọi API `/api/activities/officer-dashboard?page=1&limit=6`<br>4. API lọc hoạt động theo `responsiblePerson = userId`<br>5. API tính toán thống kê:<br>   - Tổng số hoạt động phụ trách<br>   - Tổng số người tham gia<br>   - Số hoạt động đang diễn ra<br>   - Số hoạt động đã hoàn thành<br>6. API trả về danh sách hoạt động và thống kê<br>7. Frontend hiển thị:<br>   - 4 thẻ thống kê (stats cards)<br>   - Danh sách 6 hoạt động gần nhất<br>   - Các nút hành động nhanh |
| **Luồng thay thế** | **2a. Officer không có quyền truy cập**<br>- Hệ thống trả về lỗi 403 "Insufficient permissions"<br>- Officer được chuyển hướng về trang không có quyền<br><br>**3a. Không có hoạt động nào**<br>- Hệ thống hiển thị thông báo "Chưa có hoạt động nào"<br>- Thống kê hiển thị giá trị 0<br><br>**3b. Lỗi kết nối API**<br>- Hệ thống hiển thị thông báo lỗi<br>- Officer có thể thử lại |
| **Quy tắc nghiệp vụ** | - Chỉ hiển thị hoạt động mà officer là `responsiblePerson`<br>- Thống kê được tính toán real-time từ database<br>- Hoạt động được sắp xếp theo ngày tạo mới nhất<br>- Phân trang: mặc định 6 hoạt động/trang |
| **Yêu cầu phi chức năng** | - Thời gian tải dashboard < 1.5 giây<br>- Hỗ trợ dark mode<br>- Responsive trên mobile và desktop<br>- Tự động refresh khi có thay đổi |

---

## 3. Xem Danh Sách Hoạt Động Phụ Trách (View Responsible Activities)

| **Trường** | **Nội dung** |
|------------|--------------|
| **Tên Use Case** | Xem Danh Sách Hoạt Động Phụ Trách (View Responsible Activities) |
| **Mô tả** | Officer xem danh sách tất cả các hoạt động mà mình phụ trách, có thể lọc theo trạng thái (all, upcoming, ongoing, completed, cancelled), tìm kiếm, và phân trang. |
| **Tác nhân (Actor)** | Officer (CLUB_DEPUTY, CLUB_MEMBER, OFFICER) |
| **Điều kiện tiên quyết** | Officer đã đăng nhập thành công |
| **Điều kiện sau** | Officer đã xem danh sách hoạt động phụ trách |
| **Luồng cơ bản** | 1. Officer truy cập trang quản lý hoạt động<br>2. Hệ thống gọi API `/api/activities/officer-dashboard?page=1&limit=10&status=all`<br>3. API kiểm tra quyền (CLUB_DEPUTY, OFFICER, CLUB_MEMBER)<br>4. API lọc hoạt động theo `responsiblePerson = userId`<br>5. API áp dụng filter status (nếu không phải 'all')<br>6. API phân trang kết quả<br>7. API trả về danh sách hoạt động với thông tin:<br>   - Tên, mô tả, ngày, địa điểm<br>   - Số người tham gia / maxParticipants<br>   - Trạng thái hoạt động<br>8. Frontend hiển thị danh sách với:<br>   - Bộ lọc trạng thái<br>   - Thanh tìm kiếm<br>   - Phân trang<br>   - Nút xem chi tiết từng hoạt động |
| **Luồng thay thế** | **2a. Officer không có quyền**<br>- Hệ thống trả về lỗi 403<br>- Officer không thể xem danh sách<br><br>**4a. Không có hoạt động nào**<br>- Hệ thống hiển thị thông báo "Chưa có hoạt động nào"<br><br>**5a. Filter không hợp lệ**<br>- Hệ thống bỏ qua filter và hiển thị tất cả |
| **Quy tắc nghiệp vụ** | - Chỉ hiển thị hoạt động mà officer là `responsiblePerson`<br>- Filter status: all, upcoming, ongoing, completed, cancelled<br>- Phân trang mặc định: 10 hoạt động/trang<br>- Sắp xếp theo ngày tạo mới nhất |
| **Yêu cầu phi chức năng** | - Thời gian tải danh sách < 1 giây<br>- Hỗ trợ tìm kiếm real-time<br>- Hỗ trợ dark mode<br>- Responsive design |

---

## 4. Xem Chi Tiết Hoạt Động (View Activity Details)

| **Trường** | **Nội dung** |
|------------|--------------|
| **Tên Use Case** | Xem Chi Tiết Hoạt Động (View Activity Details) |
| **Mô tả** | Officer xem chi tiết thông tin của một hoạt động mà mình phụ trách, bao gồm thông tin cơ bản, danh sách người tham gia, và các thống kê liên quan. |
| **Tác nhân (Actor)** | Officer (CLUB_DEPUTY, CLUB_MEMBER, OFFICER) |
| **Điều kiện tiên quyết** | Officer đã đăng nhập, hoạt động tồn tại và officer là `responsiblePerson` |
| **Điều kiện sau** | Officer đã xem chi tiết hoạt động |
| **Luồng cơ bản** | 1. Officer chọn một hoạt động từ danh sách<br>2. Officer nhấn nút "Xem chi tiết" hoặc click vào hoạt động<br>3. Hệ thống gọi API `/api/activities/[activityId]`<br>4. API kiểm tra quyền và xác minh `responsiblePerson`<br>5. API populate thông tin người tham gia (userId)<br>6. API trả về thông tin hoạt động đầy đủ<br>7. Frontend hiển thị:<br>   - Thông tin cơ bản (tên, mô tả, ngày, địa điểm)<br>   - Danh sách người tham gia<br>   - Thống kê (số người đã đăng ký, đã duyệt, chờ duyệt)<br>   - Các nút hành động (quản lý người tham gia, điểm danh) |
| **Luồng thay thế** | **4a. Officer không phải responsiblePerson**<br>- Hệ thống trả về lỗi 403 "Không có quyền xem hoạt động này"<br>- Officer không thể xem chi tiết<br><br>**4b. Hoạt động không tồn tại**<br>- Hệ thống trả về lỗi 404 "Không tìm thấy hoạt động"<br>- Officer được thông báo lỗi |
| **Quy tắc nghiệp vụ** | - Chỉ officer là `responsiblePerson` mới có quyền xem chi tiết<br>- Thông tin người tham gia được populate đầy đủ (name, email, avatar)<br>- Hiển thị trạng thái duyệt của từng người tham gia |
| **Yêu cầu phi chức năng** | - Thời gian tải chi tiết < 1 giây<br>- Hỗ trợ dark mode<br>- Responsive design |

---

## 5. Duyệt Người Tham Gia (Approve Participant)

| **Trường** | **Nội dung** |
|------------|--------------|
| **Tên Use Case** | Duyệt Người Tham Gia (Approve Participant) |
| **Mô tả** | Officer duyệt đơn đăng ký tham gia hoạt động của một sinh viên. Sau khi duyệt, sinh viên chính thức trở thành người tham gia hoạt động. |
| **Tác nhân (Actor)** | Officer (CLUB_DEPUTY, CLUB_MEMBER, OFFICER) |
| **Điều kiện tiên quyết** | Officer đã đăng nhập, hoạt động tồn tại, officer là `responsiblePerson`, có đơn đăng ký chờ duyệt |
| **Điều kiện sau** | Người tham gia đã được duyệt, `approvalStatus = 'approved'` |
| **Luồng cơ bản** | 1. Officer xem danh sách người tham gia của hoạt động<br>2. Officer tìm người tham gia có `approvalStatus = 'pending'`<br>3. Officer nhấn nút "Duyệt"<br>4. Frontend gửi PATCH request đến `/api/activities/[activityId]/participants`<br>5. Request body: `{ userId, action: 'approve' }`<br>6. API kiểm tra quyền (CLUB_DEPUTY, OFFICER, CLUB_MEMBER)<br>7. API tìm hoạt động theo activityId<br>8. API tìm participant trong mảng `participants` theo userId<br>9. API cập nhật participant:<br>   - `approvalStatus = 'approved'`<br>   - `approvedBy = officer.userId`<br>   - `approvedAt = new Date()`<br>   - Xóa dữ liệu rejection (nếu có)<br>10. API lưu hoạt động<br>11. API trả về success message<br>12. Frontend cập nhật UI, hiển thị thông báo thành công<br>13. Frontend refresh danh sách người tham gia |
| **Luồng thay thế** | **6a. Officer không có quyền**<br>- API trả về lỗi 403 "Bạn không có quyền duyệt người tham gia"<br>- Officer không thể duyệt<br><br>**8a. Không tìm thấy participant**<br>- API trả về lỗi 404 "Không tìm thấy người tham gia"<br>- Officer được thông báo lỗi<br><br>**8b. Participant đã được duyệt**<br>- API vẫn cập nhật thành công<br>- Frontend hiển thị thông báo "Đã được duyệt" |
| **Quy tắc nghiệp vụ** | - Chỉ CLUB_DEPUTY, CLUB_MEMBER, OFFICER mới có quyền duyệt<br>- Officer phải là `responsiblePerson` của hoạt động<br>- Khi duyệt, hệ thống ghi lại `approvedBy` và `approvedAt`<br>- Xóa dữ liệu rejection khi duyệt (rejectedBy, rejectedAt, rejectionReason) |
| **Yêu cầu phi chức năng** | - Thời gian xử lý duyệt < 1 giây<br>- Hiển thị loading state khi đang xử lý<br>- Thông báo thành công/lỗi rõ ràng<br>- Tự động refresh danh sách sau khi duyệt |

---

## 6. Từ Chối Người Tham Gia (Reject Participant)

| **Trường** | **Nội dung** |
|------------|--------------|
| **Tên Use Case** | Từ Chối Người Tham Gia (Reject Participant) |
| **Mô tả** | Officer từ chối đơn đăng ký tham gia hoạt động của một sinh viên. Officer có thể nhập lý do từ chối. |
| **Tác nhân (Actor)** | Officer (CLUB_DEPUTY, CLUB_MEMBER, OFFICER) |
| **Điều kiện tiên quyết** | Officer đã đăng nhập, hoạt động tồn tại, officer là `responsiblePerson`, có đơn đăng ký chờ duyệt |
| **Điều kiện sau** | Người tham gia đã bị từ chối, `approvalStatus = 'rejected'` |
| **Luồng cơ bản** | 1. Officer xem danh sách người tham gia của hoạt động<br>2. Officer tìm người tham gia có `approvalStatus = 'pending'`<br>3. Officer nhấn nút "Từ chối"<br>4. Frontend hiển thị modal nhập lý do từ chối<br>5. Officer nhập lý do từ chối (tùy chọn)<br>6. Officer nhấn nút "Xác nhận từ chối"<br>7. Frontend gửi PATCH request đến `/api/activities/[activityId]/participants`<br>8. Request body: `{ userId, action: 'reject', rejectionReason: '...' }`<br>9. API kiểm tra quyền (CLUB_DEPUTY, OFFICER, CLUB_MEMBER)<br>10. API tìm hoạt động theo activityId<br>11. API tìm participant trong mảng `participants` theo userId<br>12. API cập nhật participant:<br>    - `approvalStatus = 'rejected'`<br>    - `rejectedBy = officer.userId`<br>    - `rejectedAt = new Date()`<br>    - `rejectionReason = rejectionReason || ''`<br>    - Xóa dữ liệu approval (nếu có)<br>13. API lưu hoạt động<br>14. API trả về success message<br>15. Frontend cập nhật UI, hiển thị thông báo thành công<br>16. Frontend refresh danh sách người tham gia |
| **Luồng thay thế** | **9a. Officer không có quyền**<br>- API trả về lỗi 403 "Bạn không có quyền từ chối người tham gia"<br>- Officer không thể từ chối<br><br>**11a. Không tìm thấy participant**<br>- API trả về lỗi 404 "Không tìm thấy người tham gia"<br>- Officer được thông báo lỗi<br><br>**5a. Officer hủy modal**<br>- Frontend đóng modal, không gửi request<br>- Không có thay đổi nào |
| **Quy tắc nghiệp vụ** | - Chỉ CLUB_DEPUTY, CLUB_MEMBER, OFFICER mới có quyền từ chối<br>- Officer phải là `responsiblePerson` của hoạt động<br>- Lý do từ chối là tùy chọn (có thể để rỗng)<br>- Khi từ chối, hệ thống ghi lại `rejectedBy`, `rejectedAt`, và `rejectionReason`<br>- Xóa dữ liệu approval khi từ chối (approvedBy, approvedAt) |
| **Yêu cầu phi chức năng** | - Thời gian xử lý từ chối < 1 giây<br>- Modal nhập lý do có validation<br>- Hiển thị loading state khi đang xử lý<br>- Thông báo thành công/lỗi rõ ràng |

---

## 7. Xóa Người Tham Gia (Remove Participant)

| **Trường** | **Nội dung** |
|------------|--------------|
| **Tên Use Case** | Xóa Người Tham Gia (Remove Participant) |
| **Mô tả** | Officer xóa một người tham gia khỏi hoạt động. Người tham gia sẽ không còn trong danh sách và không thể tham gia hoạt động nữa. |
| **Tác nhân (Actor)** | Officer (CLUB_DEPUTY, CLUB_MEMBER, OFFICER) |
| **Điều kiện tiên quyết** | Officer đã đăng nhập, hoạt động tồn tại, officer là `responsiblePerson`, người tham gia tồn tại trong hoạt động |
| **Điều kiện sau** | Người tham gia đã bị xóa khỏi mảng `participants` của hoạt động |
| **Luồng cơ bản** | 1. Officer xem danh sách người tham gia của hoạt động<br>2. Officer chọn người tham gia cần xóa<br>3. Officer nhấn nút "Xóa"<br>4. Frontend hiển thị modal xác nhận xóa<br>5. Officer xác nhận xóa<br>6. Frontend gửi DELETE request đến `/api/activities/[activityId]/participants`<br>7. Request body: `{ userId }`<br>8. API kiểm tra quyền (CLUB_DEPUTY, OFFICER, CLUB_MEMBER)<br>9. API tìm hoạt động theo activityId<br>10. API tìm và xóa participant khỏi mảng `participants`<br>11. API lưu hoạt động<br>12. API trả về success message<br>13. Frontend cập nhật UI, hiển thị thông báo thành công<br>14. Frontend refresh danh sách người tham gia |
| **Luồng thay thế** | **8a. Officer không có quyền**<br>- API trả về lỗi 403 "Bạn không có quyền xóa người tham gia"<br>- Officer không thể xóa<br><br>**10a. Không tìm thấy participant**<br>- API trả về lỗi 404 "Không tìm thấy người tham gia"<br>- Officer được thông báo lỗi<br><br>**5a. Officer hủy xóa**<br>- Frontend đóng modal, không gửi request<br>- Không có thay đổi nào |
| **Quy tắc nghiệp vụ** | - Chỉ CLUB_DEPUTY, CLUB_MEMBER, OFFICER mới có quyền xóa<br>- Officer phải là `responsiblePerson` của hoạt động<br>- Xóa participant khỏi mảng `participants` bằng cách filter<br>- Sau khi xóa, người tham gia không còn trong danh sách |
| **Yêu cầu phi chức năng** | - Thời gian xử lý xóa < 1 giây<br>- Modal xác nhận rõ ràng để tránh xóa nhầm<br>- Hiển thị loading state khi đang xử lý<br>- Thông báo thành công/lỗi rõ ràng |

---

## 8. Xem Danh Sách Điểm Danh (View Attendance List)

| **Trường** | **Nội dung** |
|------------|--------------|
| **Tên Use Case** | Xem Danh Sách Điểm Danh (View Attendance List) |
| **Mô tả** | Officer xem danh sách điểm danh của tất cả người tham gia trong một hoạt động, bao gồm thông tin điểm danh, ảnh, vị trí, và trạng thái duyệt. Hệ thống tự động duyệt các bản ghi điểm danh hợp lệ (đúng thời gian và địa điểm). |
| **Tác nhân (Actor)** | Officer (CLUB_DEPUTY, CLUB_MEMBER, OFFICER) |
| **Điều kiện tiên quyết** | Officer đã đăng nhập, hoạt động tồn tại, officer là `responsiblePerson` |
| **Điều kiện sau** | Officer đã xem danh sách điểm danh |
| **Luồng cơ bản** | **Bước 1: Hệ thống tự động xử lý điểm danh khi student check-in**<br>1.1. Student thực hiện điểm danh qua ứng dụng (chụp ảnh, lấy GPS, gửi request)<br>1.2. API `/api/activities/[id]/attendance` (PATCH) nhận request điểm danh<br>1.3. Hệ thống kiểm tra và validate:<br>   - **Location validation**: Kiểm tra vị trí GPS có nằm trong bán kính cho phép không (nếu có `locationData.radius`)<br>   - **Time validation**: Kiểm tra thời gian điểm danh có trong cửa sổ cho phép không:<br>     - **Cửa sổ đúng giờ (On-time window)**: ±15 phút so với thời gian quy định (tự động duyệt)<br>     - **Cửa sổ trễ (Late window)**: Từ +15 phút đến +30 phút sau thời gian quy định (cần officer duyệt)<br>   - **Photo validation**: Kiểm tra có ảnh điểm danh không<br>1.4. Hệ thống xác định trạng thái điểm danh:<br>   - **Nếu location hợp lệ VÀ time trong cửa sổ đúng giờ (±15 phút) VÀ có ảnh**:<br>     - `status = 'approved'` (tự động duyệt)<br>     - `verifiedBy = system` (ghi nhận hệ thống tự động duyệt)<br>     - `verifiedAt = new Date()`<br>     - Thông báo: "Đã điểm danh và tự động duyệt thành công"<br>   - **Nếu location hợp lệ VÀ time trong cửa sổ trễ (15-30 phút) VÀ có ảnh**:<br>     - `status = 'pending'` (chờ officer duyệt)<br>     - Student có thể nhập lý do trễ<br>     - Thông báo: "Đã điểm danh. Đang chờ xét duyệt"<br>   - **Nếu location không hợp lệ HOẶC time không hợp lệ HOẶC không có ảnh**:<br>     - `status = 'pending'` hoặc `'rejected'` (tùy trường hợp)<br>     - Cần officer xem xét và duyệt/từ chối<br>1.5. Hệ thống lưu bản ghi điểm danh vào database<br><br>**Bước 2: Officer xem danh sách điểm danh**<br>2.1. Officer truy cập `/officer/attendance/[activityId]`<br>2.2. Hệ thống gọi API `/api/activities/[id]/attendance` (GET)<br>2.3. API kiểm tra quyền và xác minh `responsiblePerson`<br>2.4. API lấy danh sách người tham gia đã được duyệt (`approvalStatus = 'approved'`)<br>2.5. API tìm tất cả Attendance documents theo `activityId`<br>2.6. API populate thông tin `userId` (name, email, studentId) và `verifiedBy` (nếu có)<br>2.7. API tính toán validation status cho từng bản ghi:<br>   - **Perfect**: Location hợp lệ VÀ time đúng giờ (±15 phút) VÀ status = 'approved'<br>   - **Late but valid**: Location hợp lệ VÀ time trễ (15-30 phút) VÀ status = 'approved' hoặc 'pending'<br>   - **Invalid**: Location không hợp lệ HOẶC time không hợp lệ<br>2.8. API trả về danh sách participants kèm attendance records với:<br>   - Thông tin người tham gia (userId, name, email, studentId)<br>   - Các bản ghi điểm danh (timeSlot, checkInType, checkInTime, location, photoUrl, status)<br>   - Thông tin xác minh (verifiedBy, verifiedAt, verificationNote, cancelReason)<br>   - Validation status (perfect, late_but_valid, invalid)<br>2.9. Frontend hiển thị:<br>   - Bảng danh sách người tham gia và điểm danh<br>   - Thống kê tổng quan:<br>     - Tổng số người tham gia<br>     - Số người đã điểm danh<br>     - Số người chưa điểm danh<br>     - Tỷ lệ điểm danh (%)<br>     - Số bản ghi "Perfect" (đúng giờ, đúng địa điểm, đã tự động duyệt)<br>     - Số bản ghi "Late but valid" (trễ nhưng hợp lệ, đã được duyệt)<br>     - Số bản ghi "Invalid" (không hợp lệ)<br>   - Bộ lọc:<br>     - Lọc theo trạng thái điểm danh (all, checkedIn, notCheckedIn)<br>     - Lọc theo trạng thái duyệt (all, pending, approved, rejected)<br>     - Lọc theo validation status (all, perfect, late_but_valid, invalid)<br>     - Tìm kiếm theo tên, email<br>   - Nút hành động cho từng bản ghi:<br>     - "Duyệt" (nếu status = 'pending')<br>     - "Từ chối" (nếu status = 'pending' hoặc 'approved' nhưng invalid)<br>     - "Xem chi tiết" (expand row) |
| **Luồng thay thế** | **1.3a. Location không hợp lệ**<br>- Hệ thống tính khoảng cách từ vị trí điểm danh đến vị trí hoạt động<br>- Nếu khoảng cách > bán kính cho phép: location không hợp lệ<br>- `status = 'pending'` (cần officer xem xét)<br><br>**1.3b. Time không hợp lệ (quá sớm hoặc quá trễ)**<br>- Nếu điểm danh sớm hơn 15 phút trước giờ quy định: time không hợp lệ<br>- Nếu điểm danh trễ hơn 30 phút sau giờ quy định: time không hợp lệ<br>- `status = 'pending'` hoặc `'rejected'` (cần officer xem xét)<br><br>**1.3c. Không có ảnh**<br>- Nếu không có photoUrl: `status = 'rejected'`<br>- Thông báo: "Thiếu ảnh hoặc thông tin không hợp lệ"<br><br>**2.3a. Officer không có quyền**<br>- API trả về lỗi 403<br>- Officer không thể xem danh sách<br><br>**2.5a. Không có bản ghi điểm danh nào**<br>- Hệ thống hiển thị thông báo "Chưa có điểm danh nào"<br>- Thống kê hiển thị giá trị 0 |
| **Quy tắc nghiệp vụ** | - **Tự động duyệt**: Hệ thống tự động duyệt (`status = 'approved'`) khi:<br>  - Location hợp lệ (nằm trong bán kính cho phép, nếu có)<br>  - Time trong cửa sổ đúng giờ (±15 phút so với thời gian quy định)<br>  - Có ảnh điểm danh (photoUrl)<br>  - Ghi nhận `verifiedBy = system`, `verifiedAt = thời gian điểm danh`<br><br>- **Chờ duyệt**: Hệ thống đặt `status = 'pending'` khi:<br>  - Location hợp lệ VÀ time trong cửa sổ trễ (15-30 phút) VÀ có ảnh<br>  - Location không hợp lệ HOẶC time không hợp lệ (nhưng vẫn có ảnh)<br>  - Cần officer xem xét và quyết định duyệt/từ chối<br><br>- **Từ chối tự động**: Hệ thống đặt `status = 'rejected'` khi:<br>  - Không có ảnh điểm danh<br>  - Time quá sớm (>15 phút trước giờ quy định) hoặc quá trễ (>30 phút sau giờ quy định)<br><br>- Chỉ hiển thị điểm danh của hoạt động mà officer phụ trách<br>- Mỗi người tham gia có thể có nhiều bản ghi điểm danh (theo timeSlot và checkInType)<br>- Trạng thái điểm danh: `pending` (chờ duyệt), `approved` (đã duyệt), `rejected` (đã từ chối)<br>- Validation status: `perfect` (hoàn hảo), `late_but_valid` (trễ nhưng hợp lệ), `invalid` (không hợp lệ) |
| **Yêu cầu phi chức năng** | - Thời gian tải danh sách < 1.5 giây<br>- Thời gian xử lý tự động duyệt < 0.5 giây<br>- Hỗ trợ filter và search real-time<br>- Hỗ trợ dark mode<br>- Responsive design<br>- Hiển thị ảnh điểm danh trong modal (click để xem full size)<br>- Hiển thị vị trí trên bản đồ (nếu có)<br>- Tự động refresh danh sách khi có điểm danh mới |

---

## 9. Duyệt Điểm Danh (Approve Attendance)

| **Trường** | **Nội dung** |
|------------|--------------|
| **Tên Use Case** | Duyệt Điểm Danh (Approve Attendance) |
| **Mô tả** | Officer duyệt các bản ghi điểm danh của người tham gia có trạng thái `pending` (chờ duyệt). Các bản ghi đã được hệ thống tự động duyệt (`status = 'approved'`) không cần officer duyệt lại. Officer chỉ cần xem xét và duyệt các trường hợp đặc biệt như điểm danh trễ, sai vị trí, hoặc các trường hợp khác cần xác minh thủ công. |
| **Tác nhân (Actor)** | Officer (CLUB_DEPUTY, CLUB_MEMBER, OFFICER, CLUB_LEADER, ADMIN, SUPER_ADMIN) |
| **Điều kiện tiên quyết** | Officer đã đăng nhập, hoạt động tồn tại, officer là `responsiblePerson` hoặc có quyền quản lý, có bản ghi điểm danh chờ duyệt (`status = 'pending'`) hoặc cần điều chỉnh (`status = 'approved'` nhưng invalid) |
| **Điều kiện sau** | Điểm danh đã được duyệt, `status = 'approved'`, thông tin người duyệt đã được lưu |
| **Luồng cơ bản** | **Bước 1: Officer mở mục "Điểm danh" của hoạt động**<br>1.1. Officer truy cập `/officer/attendance/[activityId]` từ dashboard hoặc danh sách hoạt động<br>1.2. Hệ thống kiểm tra quyền truy cập (CLUB_DEPUTY, OFFICER, CLUB_MEMBER, CLUB_LEADER, ADMIN, SUPER_ADMIN)<br>1.3. Hệ thống gọi API `GET /api/activities/[activityId]/attendance`<br>1.4. API kiểm tra quyền và xác minh hoạt động tồn tại<br>1.5. API lấy danh sách người tham gia đã được duyệt (`approvalStatus = 'approved'`)<br>1.6. API tìm tất cả Attendance documents theo `activityId`<br>1.7. API populate thông tin `userId` (name, email, studentId) và `verifiedBy` (nếu có)<br>1.8. API tính toán thống kê:<br>   - Tổng số người tham gia<br>   - Số người đã điểm danh<br>   - Số người chưa điểm danh<br>   - Tỷ lệ điểm danh<br>1.9. API trả về danh sách participants kèm attendance records<br><br>**Bước 2: Hệ thống hiển thị danh sách sinh viên đã điểm danh kèm thông tin**<br>2.1. Frontend nhận dữ liệu từ API<br>2.2. Frontend phân loại và hiển thị bảng danh sách với các cột:<br>   - Thông tin sinh viên (tên, email, studentId, avatar)<br>   - Thời gian điểm danh (`checkInTime`)<br>   - Ảnh điểm danh (`photoUrl`) - có thể click để xem full size<br>   - Vị trí điểm danh (`location.lat`, `location.lng`, `location.address`)<br>   - Trạng thái hiện tại (`status`: pending, approved, rejected)<br>   - Validation status (perfect, late_but_valid, invalid)<br>   - TimeSlot và checkInType (start/end)<br>   - Badge phân loại:<br>     - ✅ "Đã tự động duyệt" (nếu status = 'approved' và perfect)<br>     - ⏳ "Chờ duyệt" (nếu status = 'pending')<br>     - ❌ "Đã từ chối" (nếu status = 'rejected')<br>2.3. Frontend hiển thị thống kê tổng quan ở đầu trang:<br>   - Tổng số người tham gia<br>   - Số người đã điểm danh<br>   - Số người chưa điểm danh<br>   - Tỷ lệ điểm danh (%)<br>   - Số bản ghi "Perfect" (đã tự động duyệt)<br>   - Số bản ghi "Chờ duyệt" (pending)<br>   - Số bản ghi "Đã từ chối" (rejected)<br>2.4. Frontend hiển thị các bộ lọc:<br>   - Lọc theo trạng thái (all, checkedIn, notCheckedIn)<br>   - Lọc theo trạng thái duyệt (all, pending, approved, rejected)<br>   - Lọc theo validation status (all, perfect, late_but_valid, invalid)<br>   - Tìm kiếm theo tên, email<br>2.5. Frontend cho phép expand row để xem chi tiết từng bản ghi điểm danh<br>2.6. Frontend highlight các bản ghi cần officer xem xét (status = 'pending' hoặc invalid)<br><br>**Bước 3: Officer xem chi tiết từng bản điểm danh**<br>3.1. Officer click vào row hoặc nút "Xem chi tiết" để expand<br>3.2. Frontend hiển thị chi tiết bản ghi điểm danh:<br>   - **Thông tin thời gian**:<br>     - TimeSlot (morning/afternoon/evening hoặc tên buổi)<br>     - CheckInType (start/end)<br>     - CheckInTime (thời gian chính xác điểm danh)<br>     - So sánh với thời gian quy định (đúng giờ, muộn, sớm)<br>   - **Thông tin vị trí**:<br>     - Tọa độ GPS (lat, lng)<br>     - Địa chỉ (nếu có)<br>     - Khoảng cách từ vị trí hoạt động (nếu có locationData)<br>     - Hiển thị trên bản đồ (nếu có)<br>   - **Thông tin ảnh**:<br>     - Ảnh điểm danh (photoUrl)<br>     - Có thể click để xem full size trong modal<br>     - Có thể mở trong tab mới<br>   - **Trạng thái**:<br>     - Status hiện tại (pending/approved/rejected)<br>     - Thông tin người duyệt (nếu đã duyệt): verifiedBy.name, verifiedAt<br>     - Ghi chú xác minh (verificationNote hoặc cancelReason)<br>3.3. Officer có thể xem nhiều bản ghi điểm danh của cùng một người (nếu có nhiều timeSlot)<br>3.4. Officer có thể nhập ghi chú xác minh vào ô text (tùy chọn)<br><br>**Bước 4: Officer xem xét và quyết định duyệt/từ chối**<br>4.1. Officer xem xét các bản ghi có `status = 'pending'` (chờ duyệt):<br>   - **Các bản ghi đã được tự động duyệt** (`status = 'approved'` và perfect):<br>     - Không cần officer duyệt lại<br>     - Hiển thị badge "✅ Đã tự động duyệt"<br>     - Hiển thị thông tin: "Đã duyệt bởi Hệ thống lúc [Thời gian]"<br>     - Không có nút "Duyệt" hoặc "Từ chối"<br>   - **Các bản ghi chờ duyệt** (`status = 'pending'`):<br>     - Officer xem xét các tiêu chí:<br>       - Thời gian điểm danh có trong cửa sổ trễ (15-30 phút) không?<br>       - Vị trí điểm danh có nằm trong bán kính cho phép không?<br>       - Ảnh điểm danh có hợp lệ không?<br>       - Có lý do trễ hợp lệ không? (nếu student đã nhập `lateReason`)<br>     - Nếu tất cả đều hợp lệ:<br>       - Officer có thể nhập ghi chú xác minh (bắt buộc nếu invalid, tùy chọn nếu valid)<br>       - Officer nhấn nút "✅ Duyệt"<br>     - Nếu không hợp lệ:<br>       - Officer nhập lý do từ chối (bắt buộc)<br>       - Officer nhấn nút "❌ Từ chối" hoặc "Không hợp lệ"<br>4.2. Frontend hiển thị modal xác nhận (nếu cần)<br>4.3. Frontend gửi PATCH request đến `/api/attendance/[recordId]/verify`<br>4.4. Request body: `{ status: 'approved' hoặc 'rejected', verificationNote: '...', cancelReason: '...' }`<br>4.5. Frontend hiển thị loading state trên nút hành động<br><br>**Bước 5: Hệ thống cập nhật trạng thái thành "Hợp lệ" và lưu thông tin người duyệt**<br>5.1. API nhận request và kiểm tra quyền (CLUB_DEPUTY, OFFICER, CLUB_MEMBER, CLUB_LEADER, ADMIN, SUPER_ADMIN)<br>5.2. API validate ObjectId của recordId<br>5.3. API validate status phải là 'approved' hoặc 'rejected'<br>5.4. API tìm Attendance document chứa recordId:<br>   - Query: `Attendance.findOne({ 'attendances._id': recordId })`<br>5.5. API tìm attendance record trong mảng `attendances`:<br>   - Tìm index của record có `_id` trùng với recordId<br>5.6. API cập nhật attendance record:<br>   - `status = 'approved'`<br>   - `verifiedBy = new ObjectId(officer.userId)`<br>   - `verifiedAt = new Date()`<br>   - `verificationNote = verificationNote || ''` (nếu có)<br>   - `cancelReason = undefined` (xóa nếu có)<br>5.7. API đánh dấu mảng `attendances` đã được modify: `attendanceDoc.markModified('attendances')`<br>5.8. API lưu Attendance document: `await attendanceDoc.save()`<br>5.9. API populate thông tin `verifiedBy` để trả về:<br>   - Tìm User theo `record.verifiedBy`<br>   - Lấy name, email<br>5.10. API trả về response:<br>   - `success: true`<br>   - `message: 'Đã xác nhận điểm danh thành công'`<br>   - `data.attendance`: thông tin record đã cập nhật<br>5.11. Frontend nhận response thành công<br>5.12. Frontend cập nhật UI:<br>   - Thay đổi badge trạng thái từ "Chờ duyệt" (pending) sang "Hợp lệ" (approved)<br>   - Hiển thị thông tin người duyệt: "Đã duyệt bởi [Tên Officer] lúc [Thời gian]"<br>   - Hiển thị ghi chú xác minh (nếu có)<br>   - Xóa ghi chú xác minh khỏi input field<br>5.13. Frontend hiển thị thông báo thành công: "Đã xác nhận điểm danh thành công"<br>5.14. Frontend tự động refresh danh sách điểm danh (gọi lại API GET)<br>5.15. Frontend cập nhật thống kê (số lượng approved tăng lên) |
| **Luồng thay thế** | **1.2a. Officer không có quyền truy cập**<br>- API trả về lỗi 403 "Bạn không có quyền xem điểm danh"<br>- Frontend hiển thị thông báo lỗi<br>- Officer không thể xem danh sách điểm danh<br><br>**1.4a. Hoạt động không tồn tại**<br>- API trả về lỗi 404 "Không tìm thấy hoạt động"<br>- Frontend hiển thị thông báo lỗi<br>- Officer được chuyển hướng về danh sách hoạt động<br><br>**1.5a. Không có người tham gia nào**<br>- API trả về danh sách rỗng<br>- Frontend hiển thị thông báo "Chưa có người tham gia nào"<br>- Không có điểm danh nào để hiển thị<br><br>**2.2a. Không có điểm danh nào**<br>- Frontend hiển thị thông báo "Chưa có điểm danh nào"<br>- Thống kê hiển thị giá trị 0<br><br>**4.1a. Điểm danh không hợp lệ (sai vị trí, sai thời gian, ảnh không hợp lệ)**<br>- Officer nhấn nút "Từ chối" thay vì "Duyệt"<br>- Officer nhập lý do từ chối (bắt buộc hoặc tùy chọn)<br>- Frontend gửi request với `status: 'rejected'` và `cancelReason`<br>- API cập nhật `status = 'rejected'`, `cancelReason = '...'`<br>- Frontend hiển thị badge "Không hợp lệ" (rejected)<br><br>**4.4a. Lỗi kết nối mạng**<br>- Frontend hiển thị thông báo lỗi "Không thể kết nối đến server"<br>- Officer có thể thử lại<br><br>**5.1a. Officer không có quyền duyệt**<br>- API trả về lỗi 403 "Bạn không có quyền xác nhận điểm danh"<br>- Frontend hiển thị thông báo lỗi<br>- Officer không thể duyệt<br><br>**5.4a. Không tìm thấy Attendance document**<br>- API trả về lỗi 404 "Không tìm thấy bản ghi điểm danh"<br>- Frontend hiển thị thông báo lỗi<br>- Officer được thông báo và có thể refresh trang<br><br>**5.5a. Không tìm thấy attendance record trong mảng**<br>- API trả về lỗi 404 "Không tìm thấy bản ghi điểm danh"<br>- Frontend hiển thị thông báo lỗi<br><br>**5.8a. Lỗi khi lưu database**<br>- API trả về lỗi 500 "Lỗi khi xác nhận điểm danh"<br>- Frontend hiển thị thông báo lỗi<br>- Officer có thể thử lại<br><br>**5.11a. Response không thành công**<br>- Frontend hiển thị thông báo lỗi từ API<br>- Officer có thể thử lại hoặc liên hệ admin |
| **Quy tắc nghiệp vụ** | - **Tự động duyệt (không cần officer can thiệp)**:<br>  - Hệ thống tự động duyệt khi: location hợp lệ VÀ time trong cửa sổ đúng giờ (±15 phút) VÀ có ảnh<br>  - `status = 'approved'`, `verifiedBy = system`, `verifiedAt = thời gian điểm danh`<br>  - Officer không cần duyệt lại các bản ghi này<br>  - Hiển thị badge "✅ Đã tự động duyệt"<br><br>- **Cần officer duyệt**:<br>  - Các bản ghi có `status = 'pending'` (chờ duyệt):<br>    - Điểm danh trễ (15-30 phút sau giờ quy định) nhưng có lý do hợp lệ<br>    - Location không hợp lệ nhưng có thể chấp nhận (ví dụ: GPS lỗi)<br>    - Time không hợp lệ nhưng có lý do khách quan<br>  - Các bản ghi có `status = 'approved'` nhưng invalid (cần điều chỉnh):<br>    - Officer có thể từ chối lại với lý do<br><br>- Chỉ officers và admins mới có quyền duyệt điểm danh (CLUB_DEPUTY, OFFICER, CLUB_MEMBER, CLUB_LEADER, ADMIN, SUPER_ADMIN)<br>- Officer phải là `responsiblePerson` của hoạt động hoặc có quyền quản lý<br>- Điểm danh hợp lệ khi:<br>   - Thời gian điểm danh nằm trong khoảng thời gian quy định (hoặc muộn nhưng có lý do hợp lệ)<br>   - Vị trí điểm danh nằm trong bán kính cho phép (nếu có locationData)<br>   - Ảnh điểm danh tồn tại và hợp lệ<br>- Ghi chú xác minh:<br>   - Bắt buộc khi duyệt điểm danh invalid (location hoặc time không hợp lệ)<br>   - Tùy chọn khi duyệt điểm danh valid nhưng trễ<br>- Khi duyệt, hệ thống tự động ghi lại:<br>   - `verifiedBy`: ID của officer duyệt<br>   - `verifiedAt`: Thời gian duyệt<br>   - `verificationNote`: Ghi chú xác minh (nếu có)<br>- Một bản ghi điểm danh có thể được duyệt lại nếu đã bị từ chối trước đó<br>- Trạng thái điểm danh: `pending` (chờ duyệt) → `approved` (hợp lệ) hoặc `rejected` (không hợp lệ)<br>- Thống kê được cập nhật real-time sau mỗi lần duyệt<br>- Officer chỉ cần tập trung vào các bản ghi `pending`, không cần xử lý các bản ghi đã tự động duyệt |
| **Yêu cầu phi chức năng** | - Thời gian tải danh sách điểm danh < 1.5 giây<br>- Thời gian xử lý duyệt < 1 giây<br>- Hiển thị loading state khi đang tải dữ liệu và khi đang xử lý duyệt<br>- Thông báo thành công/lỗi rõ ràng với màu sắc phân biệt<br>- Tự động refresh danh sách sau khi duyệt thành công<br>- Hỗ trợ xem ảnh full size trong modal<br>- Hỗ trợ hiển thị vị trí trên bản đồ (nếu có)<br>- Hỗ trợ dark mode<br>- Responsive design cho mobile và desktop<br>- Hỗ trợ filter và search real-time<br>- Hỗ trợ expand/collapse row để xem chi tiết<br>- Hiển thị thống kê tổng quan ở đầu trang |

---

## 10. Từ Chối Điểm Danh (Reject Attendance)

| **Trường** | **Nội dung** |
|------------|--------------|
| **Tên Use Case** | Từ Chối Điểm Danh (Reject Attendance) |
| **Mô tả** | Officer từ chối một bản ghi điểm danh của người tham gia. Điểm danh bị từ chối thường do không đúng vị trí, không đúng thời gian, hoặc ảnh không hợp lệ. |
| **Tác nhân (Actor)** | Officer (CLUB_DEPUTY, CLUB_MEMBER, OFFICER, CLUB_LEADER, ADMIN, SUPER_ADMIN) |
| **Điều kiện tiên quyết** | Officer đã đăng nhập, hoạt động tồn tại, có bản ghi điểm danh chờ duyệt (`status = 'pending'`) |
| **Điều kiện sau** | Điểm danh đã bị từ chối, `status = 'rejected'` |
| **Luồng cơ bản** | 1. Officer xem danh sách điểm danh<br>2. Officer tìm bản ghi điểm danh có `status = 'pending'`<br>3. Officer xem thông tin điểm danh (ảnh, vị trí, thời gian)<br>4. Officer nhập ghi chú từ chối (bắt buộc hoặc tùy chọn tùy hệ thống)<br>5. Officer nhấn nút "Từ chối"<br>6. Frontend gửi PATCH request đến `/api/attendance/[id]/verify`<br>7. Request body: `{ status: 'rejected', verificationNote: '...' }`<br>8. API kiểm tra quyền (CLUB_DEPUTY, OFFICER, CLUB_MEMBER, CLUB_LEADER, ADMIN, SUPER_ADMIN)<br>9. API tìm Attendance document chứa recordId<br>10. API tìm attendance record trong mảng `attendances`<br>11. API cập nhật record:<br>    - `status = 'rejected'`<br>    - `verifiedBy = officer.userId`<br>    - `verifiedAt = new Date()`<br>    - `verificationNote = verificationNote || ''`<br>12. API lưu Attendance document<br>13. API trả về success message<br>14. Frontend cập nhật UI, hiển thị thông báo thành công<br>15. Frontend refresh danh sách điểm danh |
| **Luồng thay thế** | **8a. Officer không có quyền**<br>- API trả về lỗi 403 "Bạn không có quyền xác nhận điểm danh"<br>- Officer không thể từ chối<br><br>**10a. Không tìm thấy attendance record**<br>- API trả về lỗi 404 "Không tìm thấy bản ghi điểm danh"<br>- Officer được thông báo lỗi |
| **Quy tắc nghiệp vụ** | - Chỉ officers và admins mới có quyền từ chối điểm danh<br>- Ghi chú từ chối nên được nhập để giải thích lý do<br>- Khi từ chối, hệ thống ghi lại `verifiedBy`, `verifiedAt`, và `verificationNote`<br>- Một bản ghi điểm danh chỉ có thể bị từ chối một lần |
| **Yêu cầu phi chức năng** | - Thời gian xử lý từ chối < 1 giây<br>- Hiển thị loading state khi đang xử lý<br>- Thông báo thành công/lỗi rõ ràng<br>- Tự động refresh danh sách sau khi từ chối |

---

## 11. Điểm Danh Thủ Công (Manual Check-in)

| **Trường** | **Nội dung** |
|------------|--------------|
| **Tên Use Case** | Điểm Danh Thủ Công (Manual Check-in) |
| **Mô tả** | Officer điểm danh thủ công cho một người tham gia khi họ không thể tự điểm danh bằng ứng dụng (ví dụ: mất điện thoại, lỗi GPS). |
| **Tác nhân (Actor)** | Officer (CLUB_DEPUTY, CLUB_MEMBER, OFFICER) |
| **Điều kiện tiên quyết** | Officer đã đăng nhập, hoạt động tồn tại, officer là `responsiblePerson`, người tham gia đã được duyệt |
| **Điều kiện sau** | Bản ghi điểm danh thủ công đã được tạo với `status = 'approved'` |
| **Luồng cơ bản** | 1. Officer xem danh sách điểm danh<br>2. Officer chọn người tham gia cần điểm danh thủ công<br>3. Officer nhấn nút "Điểm danh thủ công"<br>4. Frontend hiển thị form điểm danh:<br>   - Chọn timeSlot (nếu hoạt động có nhiều buổi)<br>   - Chọn checkInType (start/end)<br>   - Nhập thời gian điểm danh<br>5. Officer điền thông tin và nhấn "Xác nhận"<br>6. Frontend gửi POST request đến `/api/activities/[id]/attendance`<br>7. Request body: `{ userId, timeSlot, checkInType, checkInTime, manual: true }`<br>8. API kiểm tra quyền (CLUB_DEPUTY, OFFICER, CLUB_MEMBER)<br>9. API xác minh người tham gia đã được duyệt<br>10. API tìm hoặc tạo Attendance document<br>11. API tạo attendance record mới:<br>    - `timeSlot`, `checkInType`, `checkInTime`<br>    - `location` = location của hoạt động (hoặc null)<br>    - `photoUrl` = null (không có ảnh)<br>    - `status = 'approved'` (tự động duyệt)<br>    - `verifiedBy = officer.userId`<br>    - `verifiedAt = new Date()`<br>12. API lưu Attendance document<br>13. API trả về success message<br>14. Frontend cập nhật UI, hiển thị thông báo thành công<br>15. Frontend refresh danh sách điểm danh |
| **Luồng thay thế** | **8a. Officer không có quyền**<br>- API trả về lỗi 403<br>- Officer không thể điểm danh thủ công<br><br>**9a. Người tham gia chưa được duyệt**<br>- API trả về lỗi "Người tham gia chưa được duyệt"<br>- Officer không thể điểm danh<br><br>**5a. Officer hủy form**<br>- Frontend đóng form, không gửi request<br>- Không có thay đổi nào |
| **Quy tắc nghiệp vụ** | - Chỉ CLUB_DEPUTY, CLUB_MEMBER, OFFICER mới có quyền điểm danh thủ công<br>- Người tham gia phải có `approvalStatus = 'approved'`<br>- Điểm danh thủ công tự động được duyệt (`status = 'approved'`)<br>- Ghi lại `verifiedBy` và `verifiedAt` khi tạo<br>- Không yêu cầu ảnh và GPS cho điểm danh thủ công |
| **Yêu cầu phi chức năng** | - Thời gian xử lý điểm danh thủ công < 1 giây<br>- Form có validation đầy đủ<br>- Hiển thị loading state khi đang xử lý<br>- Thông báo thành công/lỗi rõ ràng |

---

## 12. Xem Thông Tin Cá Nhân (View Profile)

| **Trường** | **Nội dung** |
|------------|--------------|
| **Tên Use Case** | Xem Thông Tin Cá Nhân (View Profile) |
| **Mô tả** | Officer xem thông tin cá nhân của mình, bao gồm thông tin cơ bản, role, và trạng thái membership. |
| **Tác nhân (Actor)** | Officer (CLUB_DEPUTY, CLUB_MEMBER, OFFICER) |
| **Điều kiện tiên quyết** | Officer đã đăng nhập thành công |
| **Điều kiện sau** | Officer đã xem thông tin cá nhân |
| **Luồng cơ bản** | 1. Officer truy cập `/officer/profile`<br>2. Hệ thống lấy thông tin user từ auth state (localStorage)<br>3. Hệ thống gọi API `/api/auth/me` hoặc `/api/users/profile` (nếu cần)<br>4. API kiểm tra quyền và trả về thông tin user<br>5. Frontend hiển thị:<br>   - Thông tin cơ bản (tên, email, studentId, phone, class, faculty)<br>   - Role và badge màu sắc<br>   - Avatar<br>   - Trạng thái membership (nếu có)<br>   - Nút "Chỉnh sửa" để cập nhật thông tin |
| **Luồng thay thế** | **3a. API trả về lỗi**<br>- Frontend hiển thị thông báo lỗi<br>- Officer có thể thử lại |
| **Quy tắc nghiệp vụ** | - Thông tin được lấy từ JWT token hoặc database<br>- Role được hiển thị với badge màu sắc:<br>  - CLUB_DEPUTY: orange<br>  - CLUB_MEMBER: blue<br>  - CLUB_LEADER: red |
| **Yêu cầu phi chức năng** | - Thời gian tải profile < 0.5 giây<br>- Hỗ trợ dark mode<br>- Responsive design |

---

## 13. Cập Nhật Thông Tin Cá Nhân (Update Profile)

| **Trường** | **Nội dung** |
|------------|--------------|
| **Tên Use Case** | Cập Nhật Thông Tin Cá Nhân (Update Profile) |
| **Mô tả** | Officer cập nhật thông tin cá nhân như tên, số điện thoại, lớp, khoa, và avatar. |
| **Tác nhân (Actor)** | Officer (CLUB_DEPUTY, CLUB_MEMBER, OFFICER) |
| **Điều kiện tiên quyết** | Officer đã đăng nhập thành công |
| **Điều kiện sau** | Thông tin cá nhân đã được cập nhật trong database |
| **Luồng cơ bản** | 1. Officer truy cập `/officer/profile`<br>2. Officer nhấn nút "Chỉnh sửa"<br>3. Frontend hiển thị form chỉnh sửa với các trường:<br>   - Tên (name)<br>   - Số điện thoại (phone)<br>   - Lớp (class)<br>   - Khoa (faculty)<br>   - Avatar (upload ảnh)<br>4. Officer chỉnh sửa thông tin<br>5. Officer nhấn nút "Lưu"<br>6. Frontend validate form<br>7. Nếu có avatar mới, Frontend upload ảnh lên Cloudinary<br>8. Frontend gửi PATCH request đến `/api/users/profile`<br>9. Request body: `{ name, phone, class, faculty, avatarUrl }`<br>10. API kiểm tra quyền và xác minh userId<br>11. API cập nhật thông tin user trong database<br>12. API trả về user đã cập nhật<br>13. Frontend cập nhật auth state và localStorage<br>14. Frontend hiển thị thông báo thành công<br>15. Frontend refresh thông tin profile |
| **Luồng thay thế** | **6a. Form validation thất bại**<br>- Frontend hiển thị lỗi validation<br>- Officer sửa lỗi và thử lại<br><br>**7a. Upload ảnh thất bại**<br>- Frontend hiển thị lỗi upload<br>- Officer có thể thử lại hoặc bỏ qua<br><br>**10a. API trả về lỗi**<br>- Frontend hiển thị thông báo lỗi<br>- Officer có thể thử lại |
| **Quy tắc nghiệp vụ** | - Email và studentId không thể thay đổi<br>- Avatar được upload lên Cloudinary<br>- Tên, phone, class, faculty có thể được cập nhật<br>- Validation: phone phải đúng định dạng (nếu có) |
| **Yêu cầu phi chức năng** | - Thời gian cập nhật < 2 giây<br>- Hỗ trợ upload ảnh với preview<br>- Hiển thị loading state khi đang xử lý<br>- Thông báo thành công/lỗi rõ ràng<br>- Tự động cập nhật auth state sau khi lưu |

---

## 14. Xem Thông Tin Bị Xóa & Đăng Ký Lại (View Removal Info)

| **Trường** | **Nội dung** |
|------------|--------------|
| **Tên Use Case** | Xem Thông Tin Bị Xóa & Đăng Ký Lại (View Removal Info) |
| **Mô tả** | Officer xem thông tin về việc bị xóa khỏi CLB (nếu có), lý do xóa, và có thể đăng ký lại nếu đủ điều kiện. |
| **Tác nhân (Actor)** | Officer (CLUB_DEPUTY, CLUB_MEMBER, OFFICER) |
| **Điều kiện tiên quyết** | Officer đã đăng nhập, có membership với status REMOVED hoặc đã được restore |
| **Điều kiện sau** | Officer đã xem thông tin removal/restoration |
| **Luồng cơ bản** | 1. Officer truy cập `/officer/removal-info`<br>2. Hệ thống gọi API `/api/memberships/my-status` hoặc `/api/memberships/removal-status`<br>3. API tìm membership mới nhất của user<br>4. API kiểm tra membership.status<br>5. Nếu status = 'REMOVED':<br>   - API trả về thông tin removal (removedAt, removedBy, removalReason, waitTime)<br>6. Nếu đã được restore:<br>   - API trả về thông tin restoration (restoredAt, restoredBy, restorationReason)<br>7. Frontend hiển thị:<br>   - Thông tin removal (nếu REMOVED)<br>   - Thông tin restoration (nếu đã restore)<br>   - Nút "Đăng ký lại" (nếu đủ điều kiện)<br>   - Thời gian chờ còn lại (nếu chưa đủ điều kiện) |
| **Luồng thay thế** | **4a. Không có membership REMOVED**<br>- Frontend hiển thị thông báo "Bạn chưa bị xóa khỏi CLB"<br>- Không hiển thị nút đăng ký lại |
| **Quy tắc nghiệp vụ** | - Chỉ hiển thị khi membership.status = 'REMOVED' hoặc đã được restore<br>- Nếu REMOVED, phải đợi `waitTime` (thường 30 ngày) mới được đăng ký lại<br>- Thông tin removal bao gồm: removedAt, removedBy, removalReason<br>- Thông tin restoration bao gồm: restoredAt, restoredBy, restorationReason |
| **Yêu cầu phi chức năng** | - Thời gian tải thông tin < 1 giây<br>- Hỗ trợ dark mode<br>- Hiển thị countdown thời gian chờ (nếu có) |

---

## 15. Xem Danh Sách Người Tham Gia Tất Cả Hoạt Động (View All Participants)

| **Trường** | **Nội dung** |
|------------|--------------|
| **Tên Use Case** | Xem Danh Sách Người Tham Gia Tất Cả Hoạt Động (View All Participants) |
| **Mô tả** | Officer xem danh sách tất cả người tham gia từ tất cả các hoạt động mà mình phụ trách, có thể lọc, tìm kiếm, và quản lý (duyệt/từ chối/xóa). |
| **Tác nhân (Actor)** | Officer (CLUB_DEPUTY, CLUB_MEMBER, OFFICER) |
| **Điều kiện tiên quyết** | Officer đã đăng nhập thành công |
| **Điều kiện sau** | Officer đã xem danh sách người tham gia |
| **Luồng cơ bản** | 1. Officer truy cập `/officer/participants`<br>2. Hệ thống gọi API `/api/activities/officer-dashboard?page=1&limit=100`<br>3. API lọc hoạt động theo `responsiblePerson = userId`<br>4. API trả về danh sách hoạt động với participants<br>5. Frontend flatten tất cả participants từ tất cả hoạt động<br>6. Frontend hiển thị danh sách với:<br>   - Thông tin người tham gia (tên, email, role)<br>   - Tên hoạt động<br>   - Trạng thái duyệt (pending, approved, rejected)<br>   - Ngày tham gia<br>   - Bộ lọc (theo role, theo hoạt động, theo trạng thái)<br>   - Thanh tìm kiếm<br>   - Nút hành động (duyệt, từ chối, xóa) |
| **Luồng thay thế** | **2a. Không có hoạt động nào**<br>- Frontend hiển thị thông báo "Chưa có hoạt động nào"<br>- Không có người tham gia nào để hiển thị |
| **Quy tắc nghiệp vụ** | - Chỉ hiển thị người tham gia từ các hoạt động mà officer phụ trách<br>- Mỗi người tham gia được hiển thị kèm tên hoạt động<br>- Có thể lọc theo role, theo hoạt động, theo trạng thái duyệt<br>- Có thể tìm kiếm theo tên, email |
| **Yêu cầu phi chức năng** | - Thời gian tải danh sách < 1.5 giây<br>- Hỗ trợ filter và search real-time<br>- Hỗ trợ dark mode<br>- Responsive design<br>- Pagination nếu danh sách quá dài |

---

## Tổng Kết

Tài liệu này mô tả **15 Use Cases** chính của Officer trong hệ thống quản lý hoạt động CLB "5 Tốt" TDMU. Các Use Cases được phân loại theo chức năng:

- **Xác thực**: Đăng nhập (1)
- **Dashboard**: Xem dashboard, xem danh sách hoạt động (2-3)
- **Quản lý hoạt động**: Xem chi tiết hoạt động (4)
- **Quản lý người tham gia**: Duyệt, từ chối, xóa người tham gia, xem danh sách (5-7, 15)
- **Quản lý điểm danh**: Xem danh sách, duyệt, từ chối, điểm danh thủ công (8-11)
- **Quản lý cá nhân**: Xem và cập nhật profile, xem thông tin removal (12-14)

Tất cả các Use Cases đều tuân thủ quyền truy cập dựa trên role và membership status, đảm bảo tính bảo mật và toàn vẹn dữ liệu của hệ thống.

