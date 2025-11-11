# Google Maps Integration Setup Guide

## ✅ **Đã hoàn thành:**
- ✅ Cài đặt `@googlemaps/js-api-loader` và `@types/google.maps`
- ✅ Tạo component `GoogleMapPicker` với đầy đủ tính năng
- ✅ Cập nhật trang tạo hoạt động để sử dụng Google Maps
- ✅ Xóa OpenStreetMap (Leaflet) và các file không cần thiết
- ✅ Gỡ cài đặt Leaflet packages

## 🔧 **Bước tiếp theo - Cấu hình API Key:**

### 1. **Tạo file `.env.local` trong thư mục gốc:**
```bash
# Google Maps API Key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# Other environment variables...
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

### 2. **Lấy Google Maps API Key:**

#### **Bước 1: Truy cập Google Cloud Console**
1. Vào [Google Cloud Console](https://console.cloud.google.com/)
2. Tạo project mới hoặc chọn project có sẵn

#### **Bước 2: Enable Maps JavaScript API**
1. Vào "APIs & Services" > "Library"
2. Tìm "Maps JavaScript API"
3. Click "Enable"

#### **Bước 3: Tạo API Key**
1. Vào "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "API Key"
3. Copy API key

#### **Bước 4: Restrict API Key (QUAN TRỌNG)**
1. Click vào API key vừa tạo
2. Trong "Application restrictions":
   - Chọn "HTTP referrers (web sites)"
   - Thêm domain: `localhost:3000/*` (cho development)
   - Thêm domain thật của bạn (cho production)
3. Trong "API restrictions":
   - Chọn "Restrict key"
   - Chỉ chọn "Maps JavaScript API"

### 3. **Thêm API Key vào file `.env.local`:**
```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyYour_Actual_API_Key_Here
```

## ⚠️ **Bảo mật quan trọng:**

### **KHÔNG BAO GIỜ:**
- ❌ Commit file `.env.local` vào Git
- ❌ Chia sẻ API key trên GitHub, Discord, etc.
- ❌ Sử dụng API key không có restrictions

### **LÀM ĐÚNG:**
- ✅ File `.env.local` đã được thêm vào `.gitignore`
- ✅ Restrict API key theo domain và API
- ✅ Chỉ sử dụng `NEXT_PUBLIC_` prefix cho client-side
- ✅ Monitor usage trong Google Cloud Console

## 🚀 **Tính năng Google Maps:**

### **Đã tích hợp:**
- ✅ Bản đồ tương tác với Google Maps
- ✅ Chọn địa điểm bằng click
- ✅ Hiển thị marker và circle radius
- ✅ Geocoding tự động (tọa độ → địa chỉ)
- ✅ Dark mode support
- ✅ Responsive design
- ✅ Loading states
- ✅ Error handling

### **Cấu hình radius:**
- 50m, 100m, 200m, 500m, 1km
- Admin có thể tùy chỉnh
- Hiển thị trực quan trên bản đồ

## 🔄 **Chuyển đổi từ OpenStreetMap:**

### **Đã xóa:**
- ❌ `leaflet` và `react-leaflet` packages
- ❌ `MapPicker.tsx` component
- ❌ `ClientOnly.tsx` component
- ❌ Leaflet CSS trong layout

### **Đã thêm:**
- ✅ `@googlemaps/js-api-loader` package
- ✅ `@types/google.maps` types
- ✅ `GoogleMapPicker.tsx` component
- ✅ Dynamic loading với SSR disabled

## 🧪 **Test ứng dụng:**

1. **Tạo file `.env.local` với API key**
2. **Chạy development server:**
   ```bash
   npm run dev
   ```
3. **Truy cập trang tạo hoạt động**
4. **Test chọn địa điểm trên Google Maps**

## 📱 **Responsive & Dark Mode:**

- ✅ Hoạt động tốt trên mobile
- ✅ Dark mode styles cho Google Maps
- ✅ Loading states cho mọi trạng thái
- ✅ Error handling cho network issues

## 💰 **Chi phí Google Maps:**

- **Free tier:** $200 credit/tháng
- **Maps JavaScript API:** ~$7 per 1000 loads
- **Geocoding API:** ~$5 per 1000 requests
- **Monitor usage** trong Google Cloud Console

## 🔧 **Troubleshooting:**

### **Lỗi "Google Maps failed to load":**
- Kiểm tra API key trong `.env.local`
- Kiểm tra API restrictions
- Kiểm tra domain restrictions

### **Lỗi "Geocoding failed":**
- Kiểm tra internet connection
- Kiểm tra API key có enable Geocoding API
- Kiểm tra quota limits

### **Bản đồ không hiển thị:**
- Kiểm tra console errors
- Kiểm tra network tab
- Restart development server
