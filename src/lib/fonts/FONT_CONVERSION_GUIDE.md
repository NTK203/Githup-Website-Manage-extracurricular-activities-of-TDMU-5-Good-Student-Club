# Hướng dẫn Convert Font cho jsPDF

## ⚠️ QUAN TRỌNG

jsPDF **KHÔNG** chấp nhận TTF font dưới dạng base64 đơn giản. Bạn **PHẢI** sử dụng jsPDF Font Converter để convert font.

## Các bước:

### 1. Truy cập jsPDF Font Converter
- Link: https://rawgit.com/MrRio/jsPDF/master/fontconverter/fontconverter.html
- Hoặc: https://github.com/MrRio/jsPDF/tree/master/fontconverter

### 2. Convert Font
1. Upload file `Roboto-Regular.ttf` từ `src/lib/Roboto/static/`
2. Chọn "Normal" cho font style
3. Click "Convert"
4. Copy toàn bộ code JavaScript được tạo ra

### 3. Tạo file font helper
File sẽ có dạng:
```javascript
// File: src/lib/fonts/roboto-normal-converted.js
var fontBase64 = 'AAEAAAASAQAABAAgR0RFRqZDpEwAAAOUAAACWEdQT1MH0trkAABd6AAAWMBHU1VC+5TlMQAAR/AAABX2T1MvMpeDsYYAAAI0AAAAYFNUQVRe/0M5AAAB1AAAAF5jbWFwwSVh0wAACLwAAAaEY3Z0IDv4Jn0AAAKUAAAA/mZwZ22oBYQyAAAjxAAAD4ZnYXNwAAgAGQAAASwAAAAMZ2x5Zt9nXN4AALaoAAGDrGhlYWQJQGExAAABnAAAADZoaGVhCroKygAAAXgAAAAkaG10eP/5nlIAADNMAAAUpGxvY2GklQEnAAAZcAAAClRtYXhwCNkQxgAAATgAAAAgbmFtZbIUoGAAAA9AAAAKLnBvc3T/bQBkAAABWAAAACBwcmVweVjO0wAABewAAALO...';

// Extract just the base64 string (without the variable declaration)
export const RobotoNormal = fontBase64;
```

### 4. Cập nhật code
Sau khi có font đã convert, cập nhật `addVietnameseFont` để sử dụng font đã convert.

## Lưu ý:
- Font converter của jsPDF sẽ tạo ra format đặc biệt mà jsPDF hiểu được
- Base64 đơn giản từ TTF file sẽ KHÔNG hoạt động
- File font sau khi convert sẽ rất lớn (có thể vài MB)
