# Tài liệu kỹ thuật - CLB Sinh viên 5 Tốt TDMU

## Sơ đồ tuần tự (Sequence Diagrams)

### Tạo hoạt động nhiều ngày

1. **[Sơ đồ tuần tự đơn giản - Dễ hiểu](./so-do-tuan-tu-don-gian-tao-hoat-dong-nhieu-ngay.md)** ⭐ **KHUYẾN NGHỊ**
   - Sơ đồ được trình bày đơn giản, dễ hiểu
   - Ít thuật ngữ kỹ thuật, phù hợp cho người mới
   - Giải thích từng bước bằng ngôn ngữ thông thường
   - Bao gồm các trường hợp lỗi thường gặp

2. **[Sơ đồ tuần tự - Tạo hoạt động nhiều ngày](./sequence-diagram-tao-hoat-dong-nhieu-ngay.md)**
   - Sơ đồ UML dạng Mermaid và PlantUML (chi tiết kỹ thuật)
   - Có thể render trực tiếp trên GitHub/GitLab hoặc các tool hỗ trợ
   - Bao gồm luồng chính và các luồng thay thế
   - Phù hợp cho developer

3. **[Hướng dẫn chi tiết vẽ sơ đồ tuần tự](./huong-dan-ve-so-do-tuan-tu-tao-hoat-dong-nhieu-ngay.md)**
   - Hướng dẫn từng bước cách vẽ sơ đồ
   - Mô tả chi tiết từng message và lifeline
   - Checklist và quy tắc đặt tên
   - Các công cụ hỗ trợ vẽ sơ đồ

## Cách sử dụng

### Xem sơ đồ Mermaid

1. Copy code Mermaid từ file `sequence-diagram-tao-hoat-dong-nhieu-ngay.md`
2. Paste vào:
   - GitHub/GitLab (render tự động trong markdown)
   - [Mermaid Live Editor](https://mermaid.live/)
   - VS Code với extension Mermaid Preview

### Xem sơ đồ PlantUML

1. Copy code PlantUML từ file `sequence-diagram-tao-hoat-dong-nhieu-ngay.md`
2. Paste vào:
   - [PlantUML Online Server](http://www.plantuml.com/plantuml/uml/)
   - VS Code với extension PlantUML
   - Desktop application PlantUML

### Vẽ sơ đồ từ hướng dẫn

1. Đọc file `huong-dan-ve-so-do-tuan-tu-tao-hoat-dong-nhieu-ngay.md`
2. Sử dụng các công cụ như Draw.io, Lucidchart, Visual Paradigm
3. Vẽ theo từng bước được mô tả chi tiết
4. Đối chiếu với code thực tế trong project

## File code tham khảo

Khi vẽ sơ đồ, có thể tham khảo các file sau:

- **Frontend**: `src/app/admin/activities/create-multiple/page.tsx`
  - Function `handleSubmit`: Dòng 2154-2467
  - Xử lý form, validation, upload ảnh, build schedule

- **Backend API**: `src/app/api/activities/route.ts`
  - Function `POST`: Dòng 99-276
  - Xử lý authentication, validation, lưu database, tạo notification

- **Upload API**: `src/app/api/upload/activity-image/route.ts`
  - Upload ảnh lên Cloudinary

- **Models**:
  - `src/models/Activity.ts` - Activity model
  - `src/models/Notification.ts` - Notification model
  - `src/models/Membership.ts` - Membership model

## Lưu ý

- Tất cả các sơ đồ và hướng dẫn đều dựa trên code thực tế trong project
- Khi code thay đổi, cần cập nhật lại sơ đồ tương ứng
- Sơ đồ chỉ mô tả luồng chính và các luồng thay thế quan trọng, không bao gồm tất cả edge cases

