# Hướng dẫn chi tiết vẽ sơ đồ tuần tự: Tạo hoạt động nhiều ngày

## Mục đích
Tài liệu này hướng dẫn cách vẽ sơ đồ tuần tự (Sequence Diagram) cho chức năng "Tạo hoạt động nhiều ngày" trong hệ thống quản lý CLB Sinh viên 5 Tốt TDMU.

## 1. Xác định các thành phần (Lifelines)

### 1.1. Danh sách Lifelines

| Thành phần | Loại | Mô tả | File code tham khảo |
|------------|------|-------|---------------------|
| **Admin** | Actor | Người dùng có role CLUB_LEADER | - |
| **Form_TaoHoatDongNhieuNgay** | Boundary | Component React hiển thị form | `src/app/admin/activities/create-multiple/page.tsx` |
| **Ctr_TaoHoatDong** | Control | API Route Handler xử lý logic | `src/app/api/activities/route.ts` |
| **Entity_HoatDong** | Entity | Activity Model (MongoDB) | `src/models/Activity.ts` |
| **Entity_ThongBao** | Entity | Notification Model | `src/models/Notification.ts` |
| **Entity_ThanhVien** | Entity | Membership Model | `src/models/Membership.ts` |
| **Cloudinary** | External | Dịch vụ upload ảnh | `src/app/api/upload/activity-image/route.ts` |

### 1.2. Ký hiệu UML

- **Actor**: Hình người (stick figure) - Admin
- **Boundary**: Hình chữ nhật với đường gạch ngang ở trên - Form_TaoHoatDongNhieuNgay
- **Control**: Hình chữ nhật với mũi tên ở góc trên bên phải - Ctr_TaoHoatDong
- **Entity**: Hình chữ nhật với đường gạch ngang ở trên - Entity_HoatDong, Entity_ThongBao, Entity_ThanhVien
- **External**: Hình chữ nhật hoặc cloud - Cloudinary

### 1.3. Thứ tự Lifelines (từ trái sang phải)

```
Admin | Form_TaoHoatDongNhieuNgay | Ctr_TaoHoatDong | Entity_HoatDong | Entity_ThongBao | Entity_ThanhVien | Cloudinary
```

## 2. Luồng chính (Main Flow) - Chi tiết từng bước

### Bước 1: Khởi tạo

**Message 1:**
- **Từ**: Admin
- **Đến**: Form_TaoHoatDongNhieuNgay
- **Nội dung**: `1: Truy cập trang tạo hoạt động nhiều ngày`
- **Loại**: Synchronous call
- **Mô tả**: Admin truy cập URL `/admin/activities/create-multiple`

**Message 2:**
- **Từ**: Form_TaoHoatDongNhieuNgay
- **Đến**: Admin
- **Nội dung**: `2: Hiển thị form`
- **Loại**: Return message
- **Mô tả**: Component render form với các trường: tên, mô tả, ngày bắt đầu/kết thúc, địa điểm, lịch trình tuần, người phụ trách

### Bước 2: Nhập dữ liệu

**Message 3:**
- **Từ**: Admin
- **Đến**: Form_TaoHoatDongNhieuNgay
- **Nội dung**: `3: Nhập thông tin hoạt động`
- **Loại**: User input
- **Chi tiết dữ liệu**:
  - Tên hoạt động (required)
  - Mô tả (required)
  - Ngày bắt đầu (required, format: YYYY-MM-DD)
  - Ngày kết thúc (required, format: YYYY-MM-DD)
  - Địa điểm (3 modes: global/per-day/per-slot)
  - Lịch trình tuần (Mon-Sun, mỗi ngày có 3 buổi: Sáng/Chiều/Tối)
  - Người phụ trách (array, ít nhất 1 người)
  - Ảnh (tùy chọn, max 10MB)
  - Trạng thái (draft/published/ongoing/completed/cancelled/postponed)
  - Visibility (public/private)
  - Max participants (tùy chọn)

### Bước 3: Validate dữ liệu (Client-side)

**Message 4:**
- **Từ**: Admin
- **Đến**: Form_TaoHoatDongNhieuNgay
- **Nội dung**: `4: Nhấn nút "Tạo hoạt động"`
- **Loại**: User action (form submit)

**Message 4.1 (Self-message):**
- **Từ**: Form_TaoHoatDongNhieuNgay
- **Đến**: Form_TaoHoatDongNhieuNgay
- **Nội dung**: `4.1: Kiểm tra dữ liệu hợp lệ`
- **Loại**: Self-call
- **Chi tiết validation**:
  1. Tên hoạt động không rỗng
  2. Mô tả không rỗng
  3. Ngày bắt đầu không rỗng
  4. Ngày kết thúc không rỗng
  5. Ngày kết thúc >= ngày bắt đầu
  6. Khoảng ngày hợp lệ (datesInRange.length > 0)
  7. Có ít nhất 1 buổi active trong tuần
  8. Thời gian các buổi hợp lệ (endTime > startTime)
  9. Địa điểm đã chọn (theo mode: global/per-day/per-slot)
  10. Có ít nhất 1 người phụ trách

**Alternative Flow 4.2 (Nếu dữ liệu không hợp lệ):**
- **Từ**: Form_TaoHoatDongNhieuNgay
- **Đến**: Admin
- **Nội dung**: `4.2: Hiển thị lỗi, yêu cầu nhập lại`
- **Loại**: Error message
- **Mô tả**: Hiển thị thông báo lỗi cụ thể, form không submit

### Bước 4: Upload ảnh (nếu có)

**Message 5 (Optional):**
- **Từ**: Form_TaoHoatDongNhieuNgay
- **Đến**: Cloudinary
- **Nội dung**: `5: Upload ảnh (POST /api/upload/activity-image)`
- **Loại**: HTTP POST request
- **Điều kiện**: Chỉ thực hiện nếu `selectedImage !== null`
- **Payload**: FormData với field `activityImage`
- **Headers**: `Authorization: Bearer {token}`

**Message 5.1 (Success):**
- **Từ**: Cloudinary
- **Đến**: Form_TaoHoatDongNhieuNgay
- **Nội dung**: `5.1: Trả về imageUrl`
- **Loại**: HTTP Response (200 OK)
- **Response body**: `{ success: true, url: string, public_id: string }`

**Alternative Flow 5.2-5.3 (Upload thất bại):**
- **Từ**: Cloudinary
- **Đến**: Form_TaoHoatDongNhieuNgay
- **Nội dung**: `5.2: Lỗi (400/500)`
- **Loại**: HTTP Error Response
- **Từ**: Form_TaoHoatDongNhieuNgay
- **Đến**: Admin
- **Nội dung**: `5.3: Hiển thị lỗi upload`
- **Mô tả**: Quá trình dừng lại, không tiếp tục tạo activity

### Bước 5: Build schedule payload

**Message 6 (Self-message):**
- **Từ**: Form_TaoHoatDongNhieuNgay
- **Đến**: Form_TaoHoatDongNhieuNgay
- **Nội dung**: `6: Xây dựng schedule array`
- **Loại**: Self-call
- **Chi tiết xử lý**:
  1. Duyệt qua tất cả các ngày trong khoảng (startDate → endDate)
  2. Với mỗi ngày, xác định dayKey (mon/tue/wed/thu/fri/sat/sun)
  3. Lấy lịch trình từ `weeklyPlan[dayKey]`
  4. Lọc các buổi active
  5. Format mỗi buổi: `"${name} (${startTime}-${endTime}) - ${activities} - Địa điểm: ${location}"`
  6. Thêm thông tin địa điểm theo mode (global/per-day/per-slot)
  7. Thêm free text từ `daySchedules[date]`
  8. Tạo object: `{ day: number, date: Date, activities: string }`
  9. Validate độ dài activities (max 1000 ký tự)

### Bước 6: Gửi request đến API

**Message 7:**
- **Từ**: Form_TaoHoatDongNhieuNgay
- **Đến**: Ctr_TaoHoatDong
- **Nội dung**: `7: POST /api/activities`
- **Loại**: HTTP POST request
- **Headers**: 
  - `Content-Type: application/json`
  - `Authorization: Bearer {token}`
- **Request body**:
```json
{
  "name": "string",
  "description": "string",
  "startDate": "2025-01-01T00:00:00.000Z",
  "endDate": "2025-01-07T00:00:00.000Z",
  "location": "string",
  "locationData": { "lat": number, "lng": number, "address": "string", "radius": number },
  "schedule": [
    { "day": 1, "date": "2025-01-01T00:00:00.000Z", "activities": "string" }
  ],
  "responsiblePerson": ["userId1", "userId2"],
  "status": "draft",
  "visibility": "public",
  "maxParticipants": number,
  "imageUrl": "string",
  "overview": "string",
  "type": "multiple_days"
}
```

### Bước 7: Xác thực và validate (Server-side)

**Message 7.1 (Self-message):**
- **Từ**: Ctr_TaoHoatDong
- **Đến**: Ctr_TaoHoatDong
- **Nội dung**: `7.1: Kiểm tra token xác thực`
- **Loại**: Self-call
- **Chi tiết**: Gọi `getUserFromRequest(request)` để lấy user từ JWT token

**Message 7.2 (Self-message):**
- **Từ**: Ctr_TaoHoatDong
- **Đến**: Ctr_TaoHoatDong
- **Nội dung**: `7.2: Validate dữ liệu`
- **Loại**: Self-call
- **Chi tiết validation**:
  1. Required fields: name, description, responsiblePerson
  2. Với type='multiple_days': startDate, endDate phải có
  3. schedule phải là array không rỗng
  4. Nếu thiếu field → trả về 400 với danh sách missingFields

**Alternative Flow 7.3-7.4 (Token không hợp lệ):**
- **Từ**: Ctr_TaoHoatDong
- **Đến**: Form_TaoHoatDongNhieuNgay
- **Nội dung**: `7.3: 401 Unauthorized`
- **Từ**: Form_TaoHoatDongNhieuNgay
- **Đến**: Admin
- **Nội dung**: `7.4: Yêu cầu đăng nhập lại`

**Alternative Flow 7.5-7.6 (Dữ liệu không hợp lệ):**
- **Từ**: Ctr_TaoHoatDong
- **Đến**: Form_TaoHoatDongNhieuNgay
- **Nội dung**: `7.5: 400 Bad Request với details`
- **Response**: `{ success: false, message: "Missing required fields", details: ["field1", "field2"] }`
- **Từ**: Form_TaoHoatDongNhieuNgay
- **Đến**: Admin
- **Nội dung**: `7.6: Hiển thị lỗi`

### Bước 8: Lưu vào database

**Message 8:**
- **Từ**: Ctr_TaoHoatDong
- **Đến**: Entity_HoatDong
- **Nội dung**: `8: Tạo Activity mới`
- **Loại**: Database operation
- **Chi tiết**: `new Activity(activityData)`

**Message 8.1 (Self-message):**
- **Từ**: Entity_HoatDong
- **Đến**: Entity_HoatDong
- **Nội dung**: `8.1: Validate schema (Mongoose)`
- **Loại**: Self-call
- **Chi tiết**: Mongoose validate theo schema định nghĩa trong `src/models/Activity.ts`

**Message 8.2 (Self-message):**
- **Từ**: Entity_HoatDong
- **Đến**: Entity_HoatDong
- **Nội dung**: `8.2: Lưu vào MongoDB`
- **Loại**: Self-call
- **Chi tiết**: `activity.save()`

**Message 8.3:**
- **Từ**: Entity_HoatDong
- **Đến**: Ctr_TaoHoatDong
- **Nội dung**: `8.3: Trả về savedActivity`
- **Loại**: Return value
- **Chi tiết**: Activity document đã được lưu với _id

**Alternative Flow 8.4-8.6 (Lưu thất bại):**
- **Từ**: Entity_HoatDong
- **Đến**: Ctr_TaoHoatDong
- **Nội dung**: `8.4: ValidationError hoặc lỗi khác`
- **Từ**: Ctr_TaoHoatDong
- **Đến**: Form_TaoHoatDongNhieuNgay
- **Nội dung**: `8.5: Trả về lỗi`
- **Response**: `{ success: false, message: "Validation failed", details: ["error1", "error2"] }`
- **Từ**: Form_TaoHoatDongNhieuNgay
- **Đến**: Admin
- **Nội dung**: `8.6: Hiển thị lỗi`

### Bước 9: Tạo thông báo (Background)

**Message 9:**
- **Từ**: Ctr_TaoHoatDong
- **Đến**: Entity_ThanhVien
- **Nội dung**: `9: Tìm tất cả thành viên ACTIVE`
- **Loại**: Database query
- **Chi tiết**: `Membership.find({ status: 'ACTIVE' }).select('userId')`

**Message 9.1:**
- **Từ**: Entity_ThanhVien
- **Đến**: Ctr_TaoHoatDong
- **Nội dung**: `9.1: Trả về danh sách userIds`
- **Loại**: Return value
- **Chi tiết**: Array of userIds

**Message 9.2:**
- **Từ**: Ctr_TaoHoatDong
- **Đến**: Entity_ThongBao
- **Nội dung**: `9.2: Tạo thông báo cho tất cả thành viên`
- **Loại**: Database operation
- **Chi tiết**: `Notification.createForUsers(userIds, { title, message, type, relatedType, relatedId })`
- **Payload**:
  - title: "Hoạt động mới"
  - message: "Hoạt động [name] đã được tạo. Hãy kiểm tra và đăng ký tham gia!"
  - type: "info"
  - relatedType: "activity"
  - relatedId: savedActivity._id
  - createdBy: user.userId

**Message 9.3 (Self-message):**
- **Từ**: Entity_ThongBao
- **Đến**: Entity_ThongBao
- **Nội dung**: `9.3: Lưu thông báo (không block response)`
- **Loại**: Self-call
- **Lưu ý**: Lỗi ở bước này không ảnh hưởng đến response, chỉ log error

### Bước 10: Trả về kết quả

**Message 10:**
- **Từ**: Ctr_TaoHoatDong
- **Đến**: Form_TaoHoatDongNhieuNgay
- **Nội dung**: `10: Trả về success + activity data`
- **Loại**: HTTP Response (201 Created)
- **Response body**: 
```json
{
  "success": true,
  "message": "Activity created successfully",
  "data": { /* savedActivity */ }
}
```

**Message 10.1 (Self-message):**
- **Từ**: Form_TaoHoatDongNhieuNgay
- **Đến**: Form_TaoHoatDongNhieuNgay
- **Nội dung**: `10.1: Reset form (nếu tạo mới)`
- **Loại**: Self-call
- **Điều kiện**: Chỉ reset nếu `isEditMode === false`
- **Chi tiết**: Reset tất cả state về giá trị mặc định

**Message 10.2:**
- **Từ**: Form_TaoHoatDongNhieuNgay
- **Đến**: Admin
- **Nội dung**: `10.2: Hiển thị modal thành công`
- **Loại**: UI update
- **Chi tiết**: Hiển thị modal với message "Hoạt động nhiều ngày đã được tạo thành công!"

## 3. Các luồng thay thế (Alternative Flows) - Chi tiết

### 3.1. Upload ảnh thất bại

**Điều kiện**: Khi upload ảnh lên Cloudinary trả về lỗi (400/500)

**Luồng**:
1. Form_TaoHoatDongNhieuNgay → Cloudinary: Upload ảnh
2. Cloudinary → Form_TaoHoatDongNhieuNgay: Lỗi (400/500)
3. Form_TaoHoatDongNhieuNgay → Admin: Hiển thị lỗi upload
4. **Quá trình dừng lại**, không tiếp tục tạo activity

**Xử lý lỗi**: 
- Hiển thị alert với message lỗi
- Không submit form
- User có thể chọn ảnh khác hoặc bỏ qua ảnh

### 3.2. Token hết hạn

**Điều kiện**: JWT token không hợp lệ hoặc đã hết hạn

**Luồng**:
1. Form_TaoHoatDongNhieuNgay → Ctr_TaoHoatDong: POST /api/activities
2. Ctr_TaoHoatDong → Ctr_TaoHoatDong: Kiểm tra token → null hoặc invalid
3. Ctr_TaoHoatDong → Form_TaoHoatDongNhieuNgay: 401 Unauthorized
4. Form_TaoHoatDongNhieuNgay → Admin: Yêu cầu đăng nhập lại

**Xử lý lỗi**:
- Redirect về trang login
- Hoặc hiển thị modal yêu cầu đăng nhập lại

### 3.3. Validation lỗi ở server

**Điều kiện**: Dữ liệu không pass validation ở server hoặc Mongoose schema validation

**Luồng**:
1. Ctr_TaoHoatDong → Entity_HoatDong: Save activity
2. Entity_HoatDong → Ctr_TaoHoatDong: ValidationError
3. Ctr_TaoHoatDong → Form_TaoHoatDongNhieuNgay: 400 với details
4. Form_TaoHoatDongNhieuNgay → Admin: Hiển thị lỗi validation

**Xử lý lỗi**:
- Parse error.details từ response
- Hiển thị danh sách lỗi cụ thể
- User có thể sửa và submit lại

## 4. Cách vẽ sơ đồ

### 4.1. Sử dụng công cụ

**Các công cụ hỗ trợ**:
1. **Draw.io / diagrams.net**: Miễn phí, hỗ trợ UML
2. **Lucidchart**: Có bản miễn phí, hỗ trợ UML tốt
3. **PlantUML**: Text-based, có thể render online
4. **Mermaid**: Text-based, hỗ trợ trên GitHub/GitLab
5. **Visual Paradigm**: Professional UML tool
6. **StarUML**: Desktop application

### 4.2. Các bước vẽ

1. **Vẽ các Lifelines**: Vẽ các thành phần theo thứ tự từ trái sang phải
2. **Vẽ Activation boxes**: Vẽ các activation box khi component được gọi
3. **Vẽ Messages**: Vẽ các mũi tên từ lifeline này sang lifeline khác
4. **Vẽ Alternative flows**: Sử dụng `alt/else` blocks cho các luồng thay thế
5. **Vẽ Optional flows**: Sử dụng `opt` blocks cho các bước tùy chọn
6. **Vẽ Notes**: Thêm notes để giải thích các bước phức tạp
7. **Đánh số messages**: Đánh số thứ tự các messages để dễ theo dõi

### 4.3. Quy tắc đặt tên messages

- Sử dụng số thứ tự: `1:`, `2:`, `3:`, ...
- Với sub-messages: `3.1:`, `3.2:`, ...
- Mô tả ngắn gọn, rõ ràng
- Sử dụng tiếng Việt hoặc tiếng Anh nhất quán

## 5. Checklist khi vẽ sơ đồ

- [ ] Đã vẽ đầy đủ các lifelines
- [ ] Đã vẽ luồng chính (happy path)
- [ ] Đã vẽ các alternative flows
- [ ] Đã vẽ các optional flows
- [ ] Đã đánh số messages
- [ ] Đã thêm notes cho các bước phức tạp
- [ ] Đã kiểm tra tính logic của luồng
- [ ] Đã đối chiếu với code thực tế

## 6. Tài liệu tham khảo

- [UML Sequence Diagram Specification](https://www.uml-diagrams.org/sequence-diagrams.html)
- [Mermaid Sequence Diagram Syntax](https://mermaid.js.org/syntax/sequenceDiagram.html)
- [PlantUML Sequence Diagram](https://plantuml.com/sequence-diagram)

