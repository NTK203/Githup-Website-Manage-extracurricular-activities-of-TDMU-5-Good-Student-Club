# Hướng Dẫn Sử Dụng PaginationBar Component

## Tổng Quan

`PaginationBar` là một component có thể tái sử dụng để hiển thị thông tin phân trang và điều hướng trong toàn bộ hệ thống. Component này cung cấp:

- Hiển thị số lượng items hiện tại và tổng số items
- Các nút điều hướng (Trước/Sau)
- Các nút số trang với logic ellipsis thông minh
- Dropdown để chọn số items hiển thị trên mỗi trang
- Hỗ trợ dark mode

## Cài Đặt

Component được đặt tại: `src/components/common/PaginationBar.tsx`

## Cách Sử Dụng

### 1. Import Component

```tsx
import PaginationBar from '@/components/common/PaginationBar';
```

### 2. Khai Báo State

Trong component của bạn, khai báo các state cần thiết:

```tsx
const [currentPage, setCurrentPage] = useState(1);
const [itemsPerPage, setItemsPerPage] = useState(10);
const [totalItems, setTotalItems] = useState(0);
const [isDarkMode, setIsDarkMode] = useState(false);
```

### 3. Tính Toán Pagination (Tùy chọn)

Component sẽ tự động tính toán, nhưng bạn có thể tính toán thủ công nếu cần:

```tsx
const totalPages = Math.ceil(totalItems / itemsPerPage);
const currentPageStart = totalItems > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0;
const currentPageEnd = Math.min(currentPage * itemsPerPage, totalItems);
const currentPageCount = totalItems > 0 ? currentPageEnd - currentPageStart + 1 : 0;
```

### 4. Sử Dụng Component

#### Ví Dụ Cơ Bản

```tsx
<PaginationBar
  totalItems={totalItems}
  currentPage={currentPage}
  itemsPerPage={itemsPerPage}
  onPageChange={setCurrentPage}
  onItemsPerPageChange={setItemsPerPage}
  isDarkMode={isDarkMode}
/>
```

#### Ví Dụ Với Custom Label

```tsx
<PaginationBar
  totalItems={totalActivities}
  currentPage={currentPage}
  itemsPerPage={itemsPerPage}
  onPageChange={setCurrentPage}
  onItemsPerPageChange={setItemsPerPage}
  itemLabel="hoạt động"
  isDarkMode={isDarkMode}
/>
```

#### Ví Dụ Với Custom Items Per Page Options

```tsx
<PaginationBar
  totalItems={totalItems}
  currentPage={currentPage}
  itemsPerPage={itemsPerPage}
  onPageChange={setCurrentPage}
  onItemsPerPageChange={setItemsPerPage}
  itemsPerPageOptions={[10, 25, 50, 100]}
  isDarkMode={isDarkMode}
/>
```

#### Ví Dụ Ẩn Dropdown Items Per Page

```tsx
<PaginationBar
  totalItems={totalItems}
  currentPage={currentPage}
  itemsPerPage={itemsPerPage}
  onPageChange={setCurrentPage}
  onItemsPerPageChange={setItemsPerPage}
  showItemsPerPage={false}
  isDarkMode={isDarkMode}
/>
```

## Props

| Prop | Type | Required | Default | Mô Tả |
|------|------|----------|---------|-------|
| `totalItems` | `number` | ✅ | - | Tổng số items trong danh sách |
| `currentPage` | `number` | ✅ | - | Trang hiện tại (bắt đầu từ 1) |
| `itemsPerPage` | `number` | ✅ | - | Số items hiển thị trên mỗi trang |
| `onPageChange` | `(page: number) => void` | ✅ | - | Callback khi thay đổi trang |
| `onItemsPerPageChange` | `(itemsPerPage: number) => void` | ✅ | - | Callback khi thay đổi số items per page |
| `itemLabel` | `string` | ❌ | `'thành viên'` | Label cho items (ví dụ: "thành viên", "hoạt động", "bản ghi") |
| `isDarkMode` | `boolean` | ❌ | `false` | Bật/tắt dark mode |
| `itemsPerPageOptions` | `number[]` | ❌ | `[5, 10, 20, 50, 100]` | Các tùy chọn số items per page |
| `showItemsPerPage` | `boolean` | ❌ | `true` | Hiển thị/ẩn dropdown items per page |
| `className` | `string` | ❌ | `''` | CSS classes bổ sung |

## Ví Dụ Hoàn Chỉnh

### Trang Quản Lý Thành Viên

```tsx
'use client';

import { useState, useEffect } from 'react';
import PaginationBar from '@/components/common/PaginationBar';

export default function MembersPage() {
  const [members, setMembers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalMembers, setTotalMembers] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMembers();
  }, [currentPage, itemsPerPage]);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/memberships?page=${currentPage}&limit=${itemsPerPage}`
      );
      const data = await response.json();
      
      if (data.success) {
        setMembers(data.data.memberships);
        setTotalMembers(data.data.pagination?.totalCount || data.data.memberships.length);
      }
    } catch (error) {
      console.error('Error loading members:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Nội dung bảng */}
      <table>
        {/* ... */}
      </table>

      {/* Pagination Bar - Phía trên bảng */}
      <PaginationBar
        totalItems={totalMembers}
        currentPage={currentPage}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={setItemsPerPage}
        itemLabel="thành viên"
        isDarkMode={isDarkMode}
        className="mb-3"
      />

      {/* Pagination Bar - Phía dưới bảng */}
      <PaginationBar
        totalItems={totalMembers}
        currentPage={currentPage}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={setItemsPerPage}
        itemLabel="thành viên"
        isDarkMode={isDarkMode}
        className="mt-3 border-t"
      />
    </div>
  );
}
```

### Trang Quản Lý Hoạt Động

```tsx
'use client';

import { useState, useEffect } from 'react';
import PaginationBar from '@/components/common/PaginationBar';

export default function ActivitiesPage() {
  const [activities, setActivities] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [totalActivities, setTotalActivities] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    loadActivities();
  }, [currentPage, itemsPerPage]);

  const loadActivities = async () => {
    try {
      const response = await fetch(
        `/api/activities?page=${currentPage}&limit=${itemsPerPage}`
      );
      const data = await response.json();
      
      if (data.success) {
        setActivities(data.data.activities);
        setTotalActivities(data.data.pagination?.totalCount || data.data.activities.length);
      }
    } catch (error) {
      console.error('Error loading activities:', error);
    }
  };

  return (
    <div>
      {/* Pagination Bar */}
      <PaginationBar
        totalItems={totalActivities}
        currentPage={currentPage}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={setItemsPerPage}
        itemLabel="hoạt động"
        isDarkMode={isDarkMode}
        itemsPerPageOptions={[10, 20, 50, 100]}
      />

      {/* Danh sách hoạt động */}
      {/* ... */}
    </div>
  );
}
```

## Tính Năng

### 1. Hiển Thị Thông Minh Các Nút Số Trang

- **≤ 7 trang**: Hiển thị tất cả các nút số trang
- **> 7 trang**: Hiển thị với ellipsis (`...`) thông minh:
  - Ở đầu: `1 2 3 4 5 ... 40`
  - Ở giữa: `1 ... 19 20 21 ... 40`
  - Ở cuối: `1 ... 36 37 38 39 40`

### 2. Tự Động Reset Về Trang 1

Khi thay đổi số items per page, component tự động reset về trang 1.

### 3. Disable States

- Nút "Trước" bị disable khi ở trang 1 hoặc không có dữ liệu
- Nút "Sau" bị disable khi ở trang cuối hoặc không có dữ liệu

### 4. Dark Mode Support

Component tự động thay đổi màu sắc dựa trên prop `isDarkMode`.

## Lưu Ý

1. **API Response Format**: Đảm bảo API trả về `totalCount` trong object `pagination`:
   ```json
   {
     "success": true,
     "data": {
       "items": [...],
       "pagination": {
         "totalCount": 100,
         "currentPage": 1,
         "totalPages": 10
       }
     }
   }
   ```

2. **State Management**: Luôn đồng bộ `currentPage` và `itemsPerPage` với API calls.

3. **Reset Page**: Khi thay đổi filter/search, nhớ reset về trang 1:
   ```tsx
   const handleFilterChange = () => {
     setCurrentPage(1);
     // ... load data
   };
   ```

## Troubleshooting

### Vấn Đề: Tổng số items không đúng

**Nguyên nhân**: API không trả về `totalCount` trong `pagination`.

**Giải pháp**: Kiểm tra API response và đảm bảo có field `pagination.totalCount`:
```tsx
const total = data.data.pagination?.totalCount ?? data.data.items.length;
setTotalItems(total);
```

### Vấn Đề: Các nút số trang không hiển thị

**Nguyên nhân**: `totalItems` hoặc `totalPages` = 0.

**Giải pháp**: Đảm bảo `totalItems` được set đúng từ API response.

## Tích Hợp Với API

### Pattern Chuẩn

```tsx
const loadData = async () => {
  try {
    const params = new URLSearchParams({
      page: currentPage.toString(),
      limit: itemsPerPage.toString(),
      // ... other filters
    });

    const response = await fetch(`/api/endpoint?${params}`);
    const data = await response.json();

    if (data.success) {
      setItems(data.data.items);
      // Lấy totalCount từ pagination object
      setTotalItems(data.data.pagination?.totalCount ?? data.data.items.length);
    }
  } catch (error) {
    console.error('Error loading data:', error);
  }
};
```

## Best Practices

1. **Luôn sử dụng cùng một component** cho tất cả các trang có pagination để đồng bộ UI
2. **Đặt pagination bar ở cả trên và dưới** bảng/danh sách để tiện điều hướng
3. **Reset về trang 1** khi thay đổi filter, search, hoặc items per page
4. **Sử dụng label phù hợp** với context (ví dụ: "thành viên", "hoạt động", "bản ghi")

