'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import AdminNav from '@/components/admin/AdminNav';
import Footer from '@/components/common/Footer';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import { Loader, UserPlus, ArrowLeft, CheckCircle2, XCircle, Info, User, GraduationCap, Shield, AlertCircle } from 'lucide-react';
import { validatePassword } from '@/lib/passwordValidation';

interface FormData {
  studentId: string;
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: 'SUPER_ADMIN' | 'CLUB_LEADER' | 'CLUB_DEPUTY' | 'CLUB_MEMBER' | 'CLUB_STUDENT' | 'STUDENT';
  phone: string;
  class: string;
  faculty: string;
  customFaculty: string;
  isClubMember: boolean;
}

interface FormErrors {
  studentId?: string;
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  role?: string;
  phone?: string;
  class?: string;
  faculty?: string;
  customFaculty?: string;
}

function AddMemberPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    studentId: '',
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'STUDENT',
    phone: '',
    class: '',
    faculty: '',
    customFaculty: '',
    isClubMember: false,
  });
  const [errors, setErrors] = useState<FormErrors>({});

  // Load theme and sidebar state from localStorage on component mount and pre-fill form data
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
    }

    const savedSidebarState = localStorage.getItem('sidebarOpen');
    if (savedSidebarState !== null) {
      setIsSidebarOpen(savedSidebarState === 'true');
    }

    // Listen for theme changes from AdminNav
    const handleThemeChange = () => {
      const currentTheme = localStorage.getItem('theme');
      setIsDarkMode(currentTheme === 'dark');
    };

    window.addEventListener('themeChange', handleThemeChange);
    
    // Listen for sidebar state changes via custom event
    const handleSidebarChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ isOpen: boolean }>;
      if (customEvent.detail) {
        setIsSidebarOpen(customEvent.detail.isOpen);
      }
    };

    window.addEventListener('sidebarStateChange', handleSidebarChange);
    
    // Also check localStorage periodically as fallback
    const checkSidebarState = () => {
      const currentSidebarState = localStorage.getItem('sidebarOpen');
      if (currentSidebarState !== null) {
        const newState = currentSidebarState === 'true';
        setIsSidebarOpen(prev => {
          if (prev !== newState) {
            return newState;
          }
          return prev;
        });
      }
    };
    
    checkSidebarState();
    const intervalId = setInterval(checkSidebarState, 100);

    // Pre-fill form data from URL parameters
    const studentId = searchParams.get('studentId');
    const name = searchParams.get('name');
    const email = searchParams.get('email');
    const phone = searchParams.get('phone');
    const className = searchParams.get('class');
    const faculty = searchParams.get('faculty');

    if (studentId || name || email || phone || className || faculty) {
      setFormData(prev => ({
        ...prev,
        studentId: studentId || prev.studentId,
        name: name || prev.name,
        email: email || prev.email,
        phone: phone || prev.phone,
        class: className || prev.class,
        faculty: faculty || prev.faculty,
      }));
    }

    return () => {
      window.removeEventListener('themeChange', handleThemeChange);
      window.removeEventListener('sidebarStateChange', handleSidebarChange);
      clearInterval(intervalId);
    };
  }, [searchParams]);

  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: checked,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }

    // Clear error for this field
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.studentId.trim()) {
      newErrors.studentId = 'Mã sinh viên là bắt buộc';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Họ và tên là bắt buộc';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email là bắt buộc';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email không hợp lệ';
    }

    if (!formData.password) {
      newErrors.password = 'Mật khẩu là bắt buộc';
    } else {
      const passwordValidation = validatePassword(formData.password);
      if (!passwordValidation.isValid) {
        newErrors.password = passwordValidation.errors[0];
      }
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    }

    if (!formData.role) {
      newErrors.role = 'Vai trò là bắt buộc';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Số điện thoại là bắt buộc';
    } else if (!/^[0-9]{10,11}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Số điện thoại không hợp lệ';
    }

    if (!formData.class.trim()) {
      newErrors.class = 'Lớp là bắt buộc';
    }

    if (!formData.faculty) {
      newErrors.faculty = 'Khoa là bắt buộc';
    } else if (formData.faculty === 'OTHER' && !formData.customFaculty.trim()) {
      newErrors.customFaculty = 'Vui lòng nhập tên khoa';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!validate()) {
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Không tìm thấy token xác thực');
      }

      const facultyValue = formData.faculty === 'OTHER' ? formData.customFaculty : formData.faculty;

      const response = await fetch('/api/memberships', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          studentId: formData.studentId.trim(),
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          role: formData.role,
          phone: formData.phone.trim(),
          class: formData.class.trim(),
          faculty: facultyValue.trim(),
          isClubMember: formData.isClubMember,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Có lỗi xảy ra khi thêm thành viên');
      }

      if (data.success) {
        setSuccess(true);
        setFormData({
          studentId: '',
          name: '',
          email: '',
          password: '',
          confirmPassword: '',
          role: 'STUDENT',
          phone: '',
          class: '',
          faculty: '',
          customFaculty: '',
          isClubMember: false,
        });
        setErrors({});

        // Redirect after 2 seconds
        setTimeout(() => {
          router.push('/admin/members');
        }, 2000);
      } else {
        throw new Error(data.error || 'Có lỗi xảy ra khi thêm thành viên');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi thêm thành viên');
    } finally {
      setLoading(false);
    }
  };

  const faculties = [
    'Khoa Công nghệ thông tin',
    'Khoa Kinh tế',
    'Khoa Ngoại ngữ',
    'Khoa Sư phạm',
    'Khoa Khoa học tự nhiên',
    'Khoa Khoa học xã hội và Nhân văn',
    'Khoa Y dược',
    'Khoa Nông nghiệp',
    'Khoa Môi trường',
    'OTHER',
  ];

  return (
    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'CLUB_LEADER']}>
      <div className={`min-h-screen flex flex-col ${isDarkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
        <AdminNav 
          isDarkMode={isDarkMode} 
          isSidebarOpen={isSidebarOpen}
          onSidebarToggle={(open) => setIsSidebarOpen(open)}
        />
        
        <main className={`flex-1 transition-all duration-300 ${
          isSidebarOpen && isDesktop ? 'ml-64' : 'ml-0'
        } ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
          <div className="container mx-auto px-4 py-8 max-w-4xl">
            <div className="mb-6">
              <button
                onClick={() => router.back()}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  isDarkMode
                    ? 'bg-gray-800 text-gray-200 hover:bg-gray-700'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                } shadow-sm`}
              >
                <ArrowLeft size={20} />
                Quay lại
              </button>
            </div>

            <div className={`rounded-lg shadow-lg p-6 ${
              isDarkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
              <div className="flex items-center gap-3 mb-6">
                <div className={`p-3 rounded-lg ${
                  isDarkMode ? 'bg-blue-900/30' : 'bg-blue-100'
                }`}>
                  <UserPlus className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} size={24} />
                </div>
                <div>
                  <h1 className={`text-2xl font-bold ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    Thêm thành viên mới
                  </h1>
                  <p className={`text-sm ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Điền thông tin để thêm thành viên mới vào hệ thống
                  </p>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-3">
                  <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" size={20} />
                  <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
                </div>
              )}

              {success && (
                <div className="mb-4 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex items-start gap-3">
                  <CheckCircle2 className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" size={20} />
                  <div className="flex-1">
                    <p className="text-green-800 dark:text-green-200 font-medium mb-1">
                      Thêm thành viên thành công!
                    </p>
                    <p className="text-green-700 dark:text-green-300 text-sm">
                      Đang chuyển hướng về trang danh sách thành viên...
                    </p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Mã sinh viên <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="studentId"
                      value={formData.studentId}
                      onChange={handleChange}
                      className={`w-full px-4 py-2 rounded-lg border ${
                        errors.studentId
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                          : isDarkMode
                          ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-500'
                          : 'bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                      } focus:outline-none focus:ring-2`}
                      placeholder="Nhập mã sinh viên"
                    />
                    {errors.studentId && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.studentId}</p>
                    )}
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Họ và tên <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className={`w-full px-4 py-2 rounded-lg border ${
                        errors.name
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                          : isDarkMode
                          ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-500'
                          : 'bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                      } focus:outline-none focus:ring-2`}
                      placeholder="Nhập họ và tên"
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className={`w-full px-4 py-2 rounded-lg border ${
                        errors.email
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                          : isDarkMode
                          ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-500'
                          : 'bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                      } focus:outline-none focus:ring-2`}
                      placeholder="example@email.com"
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>
                    )}
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Số điện thoại <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className={`w-full px-4 py-2 rounded-lg border ${
                        errors.phone
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                          : isDarkMode
                          ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-500'
                          : 'bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                      } focus:outline-none focus:ring-2`}
                      placeholder="0123456789"
                    />
                    {errors.phone && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.phone}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Mật khẩu <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className={`w-full px-4 py-2 rounded-lg border ${
                        errors.password
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                          : isDarkMode
                          ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-500'
                          : 'bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                      } focus:outline-none focus:ring-2`}
                      placeholder="Nhập mật khẩu"
                    />
                    {errors.password && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password}</p>
                    )}
                    <div className={`mt-2 p-3 rounded-lg text-xs ${
                      isDarkMode ? 'bg-gray-700/50 text-gray-400' : 'bg-gray-50 text-gray-600'
                    }`}>
                      <Info className="inline mr-1" size={14} />
                      Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt
                    </div>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Xác nhận mật khẩu <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className={`w-full px-4 py-2 rounded-lg border ${
                        errors.confirmPassword
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                          : isDarkMode
                          ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-500'
                          : 'bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                      } focus:outline-none focus:ring-2`}
                      placeholder="Nhập lại mật khẩu"
                    />
                    {errors.confirmPassword && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.confirmPassword}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Vai trò <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      className={`w-full px-4 py-2 rounded-lg border ${
                        errors.role
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                          : isDarkMode
                          ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-500'
                          : 'bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                      } focus:outline-none focus:ring-2`}
                    >
                      <option value="STUDENT">Sinh viên</option>
                      <option value="CLUB_STUDENT">Thành viên CLB</option>
                      <option value="CLUB_MEMBER">Thành viên CLB (Cấp độ cao)</option>
                      <option value="CLUB_DEPUTY">Phó chủ nhiệm CLB</option>
                      <option value="CLUB_LEADER">Chủ nhiệm CLB</option>
                      <option value="SUPER_ADMIN">Quản trị viên</option>
                    </select>
                    {errors.role && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.role}</p>
                    )}
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Lớp <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="class"
                      value={formData.class}
                      onChange={handleChange}
                      className={`w-full px-4 py-2 rounded-lg border ${
                        errors.class
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                          : isDarkMode
                          ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-500'
                          : 'bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                      } focus:outline-none focus:ring-2`}
                      placeholder="VD: CNTT2021"
                    />
                    {errors.class && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.class}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Khoa <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="faculty"
                    value={formData.faculty}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 rounded-lg border ${
                      errors.faculty
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                        : isDarkMode
                        ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-500'
                        : 'bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                    } focus:outline-none focus:ring-2`}
                  >
                    <option value="">Chọn khoa</option>
                    {faculties.map((faculty) => (
                      <option key={faculty} value={faculty}>
                        {faculty === 'OTHER' ? 'Khác' : faculty}
                      </option>
                    ))}
                  </select>
                  {errors.faculty && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.faculty}</p>
                  )}

                  {formData.faculty === 'OTHER' && (
                    <div className="mt-4">
                      <label className={`block text-sm font-medium mb-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Tên khoa <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="customFaculty"
                        value={formData.customFaculty}
                        onChange={handleChange}
                        className={`w-full px-4 py-2 rounded-lg border ${
                          errors.customFaculty
                            ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                            : isDarkMode
                            ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-500'
                            : 'bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                        } focus:outline-none focus:ring-2`}
                        placeholder="Nhập tên khoa"
                      />
                      {errors.customFaculty && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.customFaculty}</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="isClubMember"
                    id="isClubMember"
                    checked={formData.isClubMember}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="isClubMember" className={`text-sm ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Là thành viên CLB
                  </label>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors ${
                      isDarkMode
                        ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors ${
                      loading
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader className="animate-spin" size={20} />
                        Đang xử lý...
                      </span>
                    ) : (
                      'Thêm thành viên'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>

        <Footer isDarkMode={isDarkMode} />
      </div>
    </ProtectedRoute>
  );
}

export default function AddMemberPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="animate-spin" size={32} />
      </div>
    }>
      <AddMemberPageContent />
    </Suspense>
  );
}
