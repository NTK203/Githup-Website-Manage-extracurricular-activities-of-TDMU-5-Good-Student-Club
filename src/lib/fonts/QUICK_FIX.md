# 🔧 QUICK FIX: Sửa lỗi font tiếng Việt trong PDF

## Vấn đề
Font Roboto đã được convert sang base64 nhưng vẫn không hiển thị đúng trong PDF.

## Nguyên nhân
jsPDF **KHÔNG** chấp nhận TTF font dưới dạng base64 đơn giản. Bạn **PHẢI** sử dụng jsPDF Font Converter để convert font theo format đặc biệt.

## Giải pháp nhanh

### Bước 1: Truy cập jsPDF Font Converter
https://rawgit.com/MrRio/jsPDF/master/fontconverter/fontconverter.html

### Bước 2: Convert Font Roboto-Regular.ttf
1. Upload file: `src/lib/Roboto/static/Roboto-Regular.ttf`
2. Chọn "Normal"
3. Click "Convert"
4. Copy toàn bộ code JavaScript được tạo ra

### Bước 3: Cập nhật file roboto-normal.ts
Thay thế nội dung file `src/lib/fonts/roboto-normal.ts` bằng:

```typescript
// File được tạo bởi jsPDF Font Converter
// Source: Roboto-Regular.ttf

export const RobotoNormal = 'AAEAAAASAQAABAAgR0RFRqZDpEwAAAOUAAACWEdQT1MH0trkAABd6AAAWMBHU1VC+5TlMQAAR/AAABX2T1MvMpeDsYYAAAI0AAAAYFNUQVRe/0M5AAAB1AAAAF5jbWFwwSVh0wAACLwAAAaEY3Z0IDv4Jn0AAAKUAAAA/mZwZ22oBYQyAAAjxAAAD4ZnYXNwAAgAGQAAASwAAAAMZ2x5Zt9nXN4AALaoAAGDrGhlYWQJQGExAAABnAAAADZoaGVhCroKygAAAXgAAAAkaG10eP/5nlIAADNMAAAUpGxvY2GklQEnAAAZcAAAClRtYXhwCNkQxgAAATgAAAAgbmFtZbIUoGAAAA9AAAAKLnBvc3T/bQBkAAABWAAAACBwcmVweVjO0wAABewAAALO...';
// (Paste toàn bộ base64 string từ font converter vào đây)
```

### Bước 4: Làm tương tự cho Roboto-Bold.ttf
Convert `Roboto-Bold.ttf` và cập nhật `src/lib/fonts/roboto-bold.ts`

### Bước 5: Restart server và test
Sau khi cập nhật, restart development server và thử xuất PDF lại.

## Lưu ý
- Font converter của jsPDF tạo ra format đặc biệt mà chỉ jsPDF mới hiểu được
- Base64 đơn giản từ TTF file sẽ KHÔNG hoạt động
- File font sau khi convert sẽ rất lớn (có thể vài MB)
