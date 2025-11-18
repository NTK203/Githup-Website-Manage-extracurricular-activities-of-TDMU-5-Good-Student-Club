# Hướng Dẫn Sử Dụng Icon Library

Dự án sử dụng **lucide-react** - icon library hiện đại, nhẹ và đẹp, đảm bảo tính nhất quán và đẹp mắt trên mọi thiết bị.

## 📦 Đã Cài Đặt

- **lucide-react**: Icon library hiện đại, nhẹ và đẹp (import trực tiếp)

## 🎯 Cách Sử Dụng - Import Trực Tiếp từ lucide-react

### 1. Import Icon Cần Dùng

```tsx
import { 
  Home, 
  Bell, 
  Users, 
  Settings, 
  CheckCircle2, 
  XCircle,
  Clock,
  User,
  type LucideIcon 
} from 'lucide-react';
```

### 2. Sử Dụng Icon Cơ Bản

```tsx
// Icon đơn giản
<Home size={24} />

// Icon với màu sắc
<Bell size={20} className="text-blue-600" />

// Icon với strokeWidth mỏng (style hiện đại)
<Target size={24} strokeWidth={1.5} />

// Icon với đầy đủ props
<CheckCircle2 
  size={20} 
  className="text-green-600 dark:text-green-400" 
  strokeWidth={1.5} 
/>
```

### 3. Sử Dụng Icon trong Component

```tsx
'use client';

import { Bell, Users, Settings } from 'lucide-react';

export default function MyComponent() {
  return (
    <div className="flex items-center gap-2">
      <Bell size={20} className="text-gray-600" strokeWidth={1.5} />
      <span>Thông báo</span>
    </div>
  );
}
```

### 4. Sử Dụng Icon với Conditional Rendering

```tsx
import { CheckCircle2, XCircle, Clock } from 'lucide-react';

function StatusIcon({ status }: { status: 'success' | 'error' | 'pending' }) {
  if (status === 'success') {
    return <CheckCircle2 size={20} className="text-green-600" strokeWidth={1.5} />;
  }
  if (status === 'error') {
    return <XCircle size={20} className="text-red-600" strokeWidth={1.5} />;
  }
  return <Clock size={20} className="text-yellow-600" strokeWidth={1.5} />;
}
```

### 5. Sử Dụng Icon trong Menu/Navigation

```tsx
import { Home, Bell, Users, Settings, type LucideIcon } from 'lucide-react';

interface MenuItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

const menuItems: MenuItem[] = [
  { name: 'Trang chủ', href: '/', icon: Home },
  { name: 'Thông báo', href: '/notifications', icon: Bell },
  { name: 'Người dùng', href: '/users', icon: Users },
  { name: 'Cài đặt', href: '/settings', icon: Settings },
];

function Navigation() {
  return (
    <nav>
      {menuItems.map((item) => {
        const Icon = item.icon;
        return (
          <a key={item.href} href={item.href}>
            <Icon size={20} className="text-gray-600" strokeWidth={1.5} />
            <span>{item.name}</span>
          </a>
        );
      })}
    </nav>
  );
}
```

## 🎨 Props Của Icon

Tất cả icons từ `lucide-react` đều hỗ trợ các props sau:

| Prop | Type | Mặc định | Mô tả |
|------|------|----------|-------|
| `size` | `number` | `24` | Kích thước icon (px) |
| `className` | `string` | - | CSS classes cho styling |
| `strokeWidth` | `number` | `2` | Độ dày nét vẽ (1.5 cho style hiện đại) |
| `color` | `string` | - | Màu sắc (nên dùng className thay thế) |
| `style` | `CSSProperties` | - | Inline styles |

## 🎨 Style Hiện Đại - Best Practices

### 1. Stroke Width
Sử dụng `strokeWidth={1.5}` cho style hiện đại, mỏng và tinh tế:
```tsx
<Bell size={20} strokeWidth={1.5} />
```

### 2. Màu Sắc
Sử dụng màu neutral với dark mode support:
```tsx
// Light mode: gray-600, Dark mode: gray-300
<Home size={20} className="text-gray-600 dark:text-gray-300" strokeWidth={1.5} />

// Hoặc màu có ý nghĩa
<CheckCircle2 size={20} className="text-green-600 dark:text-green-400" strokeWidth={1.5} />
```

### 3. Kích Thước
- **Small**: `16px` - Trong text, labels nhỏ
- **Medium**: `20px` - Mặc định, trong buttons, menu items
- **Large**: `24px` - Trong cards, headers
- **XLarge**: `32px+` - Hero sections, landing pages

```tsx
// Small
<Bell size={16} strokeWidth={1.5} />

// Medium (mặc định)
<Bell size={20} strokeWidth={1.5} />

// Large
<Bell size={24} strokeWidth={1.5} />

// XLarge
<Bell size={32} strokeWidth={2} />
```

### 4. Consistency
Sử dụng cùng một style cho tất cả icons trong một component:
```tsx
// ✅ Tốt - Consistent
<div className="flex gap-2">
  <Home size={20} className="text-gray-600" strokeWidth={1.5} />
  <Bell size={20} className="text-gray-600" strokeWidth={1.5} />
  <Users size={20} className="text-gray-600" strokeWidth={1.5} />
</div>

// ❌ Không tốt - Inconsistent
<div className="flex gap-2">
  <Home size={24} className="text-blue-600" strokeWidth={2} />
  <Bell size={16} className="text-red-600" strokeWidth={1} />
  <Users size={20} className="text-green-600" strokeWidth={2.5} />
</div>
```

## 📝 Ví Dụ Thực Tế

### Ví Dụ 1: Button với Icon

```tsx
import { Plus, Save, Trash2 } from 'lucide-react';

function ActionButtons() {
  return (
    <div className="flex gap-2">
      <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded">
        <Plus size={18} strokeWidth={1.5} />
        Thêm mới
      </button>
      <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded">
        <Save size={18} strokeWidth={1.5} />
        Lưu
      </button>
      <button className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded">
        <Trash2 size={18} strokeWidth={1.5} />
        Xóa
      </button>
    </div>
  );
}
```

### Ví Dụ 2: Notification Badge

```tsx
import { Bell } from 'lucide-react';

function NotificationButton({ count }: { count: number }) {
  return (
    <button className="relative">
      <Bell size={20} className="text-gray-600" strokeWidth={1.5} />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  );
}
```

### Ví Dụ 3: Status Icons

```tsx
import { CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react';

function StatusDisplay({ status }: { status: 'success' | 'error' | 'pending' | 'warning' }) {
  const icons = {
    success: <CheckCircle2 size={20} className="text-green-600" strokeWidth={1.5} />,
    error: <XCircle size={20} className="text-red-600" strokeWidth={1.5} />,
    pending: <Clock size={20} className="text-yellow-600" strokeWidth={1.5} />,
    warning: <AlertTriangle size={20} className="text-orange-600" strokeWidth={1.5} />,
  };

  return <div>{icons[status]}</div>;
}
```

### Ví Dụ 4: Sidebar Navigation (như AdminNav.tsx)

```tsx
import { 
  Home, 
  Bell, 
  Users, 
  Settings,
  type LucideIcon 
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { name: 'Trang chủ', href: '/admin', icon: Home },
  { name: 'Thông báo', href: '/admin/notifications', icon: Bell },
  { name: 'Người dùng', href: '/admin/users', icon: Users },
  { name: 'Cài đặt', href: '/admin/settings', icon: Settings },
];

function Sidebar() {
  return (
    <aside className="bg-blue-800 text-white">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <a 
            key={item.href} 
            href={item.href}
            className="flex items-center gap-3 p-3 hover:bg-blue-700"
          >
            <Icon size={20} className="text-white" strokeWidth={1.5} />
            <span>{item.name}</span>
          </a>
        );
      })}
    </aside>
  );
}
```

## 🔍 Tìm Icon Phù Hợp

Truy cập: **https://lucide.dev/icons** để:
- Tìm icon theo tên
- Xem preview của icon
- Copy tên icon để import
- Xem các variants của icon

### Cách Tìm Icon:
1. Vào https://lucide.dev/icons
2. Tìm kiếm bằng từ khóa (ví dụ: "bell", "user", "home")
3. Click vào icon để xem chi tiết
4. Copy tên icon (ví dụ: `Bell`, `User`, `Home`)
5. Import vào code: `import { Bell } from 'lucide-react';`

## 💡 Best Practices

1. **Luôn import icon cần dùng** thay vì import toàn bộ:
   ```tsx
   // ✅ Tốt
   import { Home, Bell, Users } from 'lucide-react';
   
   // ❌ Không tốt (không có cách import toàn bộ)
   ```

2. **Sử dụng size phù hợp**:
   - 16px: Trong text, labels
   - 20px: Buttons, menu items (mặc định)
   - 24px: Cards, headers
   - 32px+: Hero sections

3. **Thêm className cho màu sắc** thay vì dùng inline style:
   ```tsx
   // ✅ Tốt
   <Bell className="text-blue-600" />
   
   // ❌ Không tốt
   <Bell color="#2563eb" />
   ```

4. **Giữ strokeWidth = 1.5** cho style hiện đại:
   ```tsx
   <Bell size={20} strokeWidth={1.5} />
   ```

5. **Sử dụng cùng một icon** cho cùng một chức năng trong toàn bộ app:
   - Thông báo: `Bell`
   - Người dùng: `User` hoặc `Users`
   - Cài đặt: `Settings`
   - Trang chủ: `Home`

6. **Type Safety với TypeScript**:
   ```tsx
   import { type LucideIcon } from 'lucide-react';
   
   interface MenuItem {
     name: string;
     icon: LucideIcon; // Type-safe
   }
   ```

## 📚 Tài Liệu Tham Khảo

- **Lucide Icons**: https://lucide.dev
- **Lucide React**: https://lucide.dev/guide/packages/lucide-react
- **Icon Gallery**: https://lucide.dev/icons
- **GitHub**: https://github.com/lucide-icons/lucide

## ⚡ Lợi Ích của lucide-react

1. **Performance tốt**: Tree-shaking, chỉ bundle icons được sử dụng
2. **Type-safe**: Full TypeScript support
3. **Nhẹ**: Mỗi icon chỉ ~1KB
4. **Consistent**: Tất cả icons có cùng style
5. **Customizable**: Dễ dàng customize size, color, strokeWidth
6. **Accessible**: SVG-based, có thể thêm aria-label
7. **No dependencies**: Không cần thêm dependencies khác
