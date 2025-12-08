# Hướng dẫn thêm font tiếng Việt cho jsPDF

## Vấn đề
jsPDF mặc định không hỗ trợ tốt tiếng Việt, dẫn đến lỗi font khi xuất PDF.

## Giải pháp
Nhúng font Roboto hoặc Noto Sans (hỗ trợ tiếng Việt) vào jsPDF.

## Các bước thực hiện

### Bước 1: Tải font Roboto
1. Truy cập: https://fonts.google.com/specimen/Roboto
2. Tải về file `Roboto-Regular.ttf` và `Roboto-Bold.ttf`

### Bước 2: Convert font sang Base64
Có 2 cách:

#### Cách 1: Sử dụng công cụ online
1. Truy cập: https://base64.guru/converter/encode/file
2. Upload file `Roboto-Regular.ttf`
3. Copy chuỗi Base64 được tạo ra
4. Mở file `src/lib/fonts/roboto-normal.ts`
5. Thay thế `PLACEHOLDER_BASE64_STRING_HERE` bằng:
   ```typescript
   export const RobotoNormal = 'data:font/ttf;base64,<paste_base64_string_here>';
   ```

#### Cách 2: Sử dụng jsPDF Font Converter (Khuyến nghị)
1. Truy cập: https://rawgit.com/MrRio/jsPDF/master/fontconverter/fontconverter.html
2. Upload file `Roboto-Regular.ttf`
3. Chọn "Normal" cho font style
4. Click "Convert"
5. Copy toàn bộ nội dung file `.js` được tạo ra
6. Mở file `src/lib/fonts/roboto-normal.ts`
7. Thay thế toàn bộ nội dung bằng code đã copy, hoặc chỉ lấy phần base64 string

### Bước 3: Làm tương tự cho Roboto Bold
1. Convert `Roboto-Bold.ttf` theo cách trên
2. Cập nhật file `src/lib/fonts/roboto-bold.ts`

### Bước 4: Kiểm tra
Sau khi thêm font, chạy lại ứng dụng và thử xuất PDF. Font tiếng Việt sẽ hiển thị đúng.

## Lưu ý
- File font base64 có thể rất lớn (vài trăm KB đến vài MB)
- Nếu không thêm font, hệ thống sẽ fallback về font 'times' (hỗ trợ Unicode tốt hơn helvetica nhưng vẫn không hoàn hảo)
- Để có kết quả tốt nhất, nên sử dụng Roboto hoặc Noto Sans
