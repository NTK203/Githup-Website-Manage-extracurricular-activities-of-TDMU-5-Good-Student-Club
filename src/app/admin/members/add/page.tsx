'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import AdminNav from '@/components/admin/AdminNav';
import Footer from '@/components/common/Footer';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import { Loader, UserPlus, ArrowLeft, CheckCircle2, XCircle, Info, User, GraduationCap, Shield, AlertCircle } from 'lucide-react';

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

export default function AddMemberPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    studentId: '',
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'CLUB_STUDENT' as 'SUPER_ADMIN' | 'CLUB_LEADER' | 'CLUB_DEPUTY' | 'CLUB_MEMBER' | 'CLUB_STUDENT' | 'STUDENT',
    phone: '',
    class: '',
    faculty: '',
    customFaculty: '', // For "Khác" option
    isClubMember: true // Default to true for new club members
  });

  // Track if user wants to create non-club member
  const [isNonClubMember, setIsNonClubMember] = useState(false);

  const [errors, setErrors] = useState<FormErrors>({});

  // Danh sách khoa/viện
  const facultyOptions = [
    'Trường Kinh Tế Tài Chính',
    'Trường Luật Và Quản Lí Phát Triển',
    'Viện Kỹ Thuật Công Nghệ',
    'Viện Đào Tạo Ngoại Ngữ',
    'Viện Đào Tạo CNTT Chuyển Đổi Số',
    'Viện Đào Tạo Kiến Trúc Xây Dựng Và Giao Thông',
    'Khoa Sư Phạm',
    'Khoa Kiến Thức Chung',
    'Khoa Công Nghiệp Văn Hóa Thể Thao Và Du Lịch',
    'Ban Quản Lý Đào Tạo Sau Đại Học',
    'Khác'
  ];

  // Check if desktop
  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

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
        customFaculty: faculty && !facultyOptions.includes(faculty) ? faculty : prev.customFaculty
      }));
    }

    return () => {
      window.removeEventListener('themeChange', handleThemeChange);
      window.removeEventListener('sidebarStateChange', handleSidebarChange);
      clearInterval(intervalId);
    };
  }, [searchParams]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validate studentId
    if (!formData.studentId.trim()) {
      newErrors.studentId = 'Mã số sinh viên là bắt buộc';
    } else if (!formData.studentId.startsWith('admin') && !/^\d{13}$/.test(formData.studentId)) {
      newErrors.studentId = 'Mã số sinh viên phải có 13 chữ số ';
    }

    // Validate name
    if (!formData.name.trim()) {
      newErrors.name = 'Họ và tên là bắt buộc';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Họ và tên phải có ít nhất 2 ký tự';
    }

    // Validate email
    if (!formData.email.trim()) {
      newErrors.email = 'Email là bắt buộc';
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Email không hợp lệ';
    }

    // Additional validation for non-club members
    if (isNonClubMember) {
      // For non-club members, email must match studentId if it's a student email
      if (formData.email.includes('@student.tdmu.edu.vn')) {
        const emailStudentId = formData.email.split('@')[0];
        if (emailStudentId !== formData.studentId) {
          newErrors.email = 'Email phải khớp với mã số sinh viên';
        }
      }
    }

    // Validate password
    if (!formData.password) {
      newErrors.password = 'Mật khẩu là bắt buộc';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
    }

    // Validate confirm password
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Xác nhận mật khẩu là bắt buộc';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    }

    // Validate role
    if (!formData.role) {
      newErrors.role = 'Vai trò là bắt buộc';
    } else if (isNonClubMember && formData.role !== 'STUDENT') {
      newErrors.role = 'Sinh viên không thuộc CLB chỉ có thể có vai trò STUDENT';
    }

    // Validate faculty (only required for club members)
    if (!isNonClubMember) {
      if (!formData.faculty) {
        newErrors.faculty = 'Khoa/Viện là bắt buộc';
      } else if (formData.faculty === 'Khác' && !formData.customFaculty.trim()) {
        newErrors.customFaculty = 'Vui lòng nhập tên khoa/viện khác';
      }
    }

    // Validate phone (optional but if provided, must be valid)
    if (formData.phone && !/^[0-9]{10,11}$/.test(formData.phone)) {
      newErrors.phone = 'Số điện thoại phải có 10-11 chữ số';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidEmail = (email: string): boolean => {
    // Allow admin emails or valid student emails
    if (email === 'admin@tdmu.edu.vn' || email === 'admin.clb@tdmu.edu.vn') return true;
    return /^[0-9]{13}@student\.tdmu\.edu\.vn$/.test(email);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    console.log('Form data before validation:', formData);

    if (!validateForm()) {
      console.log('Validation failed, errors:', errors);
      return;
    }

    console.log('Form data after validation:', formData);
    setLoading(true);

    try {
      // If creating non-club member, use register API instead of members API
      if (isNonClubMember) {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            studentId: formData.studentId,
            name: formData.name,
            email: formData.email,
            password: formData.password,
            role: 'STUDENT', // Luôn là STUDENT cho sinh viên không thuộc CLB
            phone: formData.phone || undefined,
            class: formData.class || undefined,
            faculty: formData.faculty === 'Khác' ? formData.customFaculty : formData.faculty || undefined,
          })
        });

        const data = await response.json();
        console.log('Register API Response:', data);

        if (response.ok && data.success) {
          setMessage({ type: 'success', text: 'Tài khoản sinh viên đã được tạo thành công (không thuộc câu lạc bộ)' });
          // Reset form
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
            isClubMember: true
          });
          
          // Redirect to members list after 2 seconds
          setTimeout(() => {
            router.push('/admin/members');
          }, 2000);
        } else {
          const errorMessage = data.message || 'Tạo tài khoản thất bại';
          setMessage({ type: 'error', text: errorMessage });
        }
      } else {
        // Use members API for club members (STUDENT, OFFICER, ADMIN)
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token found');
        }

        const response = await fetch('/api/members', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            studentId: formData.studentId,
            name: formData.name,
            email: formData.email,
            password: formData.password,
            role: formData.role,
            phone: formData.phone || undefined,
            class: formData.class || undefined,
            faculty: formData.faculty === 'Khác' ? formData.customFaculty : formData.faculty || undefined,
            isClubMember: true // Always true for club members
          })
        });

        const data = await response.json();
        console.log('Members API Response:', data);

        if (response.ok && data.success) {
          setMessage({ type: 'success', text: data.message || 'Thêm thành viên thành công!' });
          // Reset form
          setFormData({
            studentId: '',
            name: '',
            email: '',
            password: '',
            confirmPassword: '',
            role: 'CLUB_STUDENT',
            phone: '',
            class: '',
            faculty: '',
            customFaculty: '',
            isClubMember: true
          });
          
          // Redirect to members list after 2 seconds
          setTimeout(() => {
            router.push('/admin/members');
          }, 2000);
        } else {
          const errorMessage = data.details ? `${data.error}: ${data.details}` : data.error || 'Thêm thành viên thất bại';
          setMessage({ type: 'error', text: errorMessage });
        }
      }
    } catch (error: any) {
      console.error('Error adding member:', error);
      setMessage({ type: 'error', text: error.message || 'Có lỗi xảy ra' });
    } finally {
      setLoading(false);
    }
  };

  const getInputClassName = (fieldName: keyof FormErrors) => {
    const baseClasses = 'w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 text-sm';
    const errorClasses = 'border-red-500 focus:ring-red-500/20 focus:border-red-500';
    const normalClasses = isDarkMode 
      ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500/20 focus:border-blue-500' 
      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-blue-500/20 focus:border-blue-500';
    
    return `${baseClasses} ${errors[fieldName] ? errorClasses : normalClasses}`;
  };

  return (
    <ProtectedRoute requiredRole="CLUB_MEMBER">
      <div 
        className={`min-h-screen flex flex-col transition-colors duration-200 overflow-x-hidden ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}
        style={{
          '--sidebar-width': isSidebarOpen ? '288px' : '80px'
        } as React.CSSProperties}
      >
        <AdminNav />
        
        <main 
          className="flex-1 transition-all duration-300 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 overflow-x-hidden min-w-0"
          style={{
            marginLeft: isDesktop ? (isSidebarOpen ? '288px' : '80px') : '0',
            width: isDesktop ? `calc(100% - ${isSidebarOpen ? '288px' : '80px'})` : '100%',
            maxWidth: isDesktop ? `calc(100% - ${isSidebarOpen ? '288px' : '80px'})` : '100%'
          }}
        >
          {/* Header */}
          <div className="mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-3">
                  <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                    <UserPlus size={24} strokeWidth={1.5} />
                  </div>
                  <div>
                    <h1 className={`text-2xl sm:text-3xl font-bold transition-colors duration-200 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {isNonClubMember ? 'Tạo tài khoản sinh viên' : 'Thêm thành viên mới'}
                    </h1>
                    <p className={`text-sm sm:text-base transition-colors duration-200 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mt-1`}>
                      {isNonClubMember 
                        ? 'Tạo tài khoản cho sinh viên không thuộc câu lạc bộ' 
                        : 'Thêm thành viên mới vào câu lạc bộ'
                      }
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  const fromUsers = searchParams.get('from');
                  if (fromUsers === 'users') {
                    router.push('/admin/users');
                  } else if (fromUsers === 'register') {
                    router.push('/auth/register');
                  } else {
                    router.push('/admin/members');
                  }
                }}
                className={`px-4 py-2 border-2 rounded-lg transition-all duration-200 flex items-center space-x-2 text-sm font-medium ${
                  isDarkMode 
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700 hover:border-gray-500' 
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                }`}
              >
                <ArrowLeft size={16} strokeWidth={1.5} />
                <span>Quay lại</span>
              </button>
            </div>
          </div>

          {/* Message */}
          {message && (
            <div className={`mb-6 p-4 rounded-xl border-2 ${
              message.type === 'success' 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <div className="flex items-center space-x-2">
                {message.type === 'success' ? (
                  <CheckCircle2 size={18} className="text-green-600" strokeWidth={1.5} />
                ) : (
                  <XCircle size={18} className="text-red-600" strokeWidth={1.5} />
                )}
                <p className="text-sm font-medium">{message.text}</p>
              </div>
            </div>
          )}

          {/* Role Information */}
          {isNonClubMember && (
            <div className={`mb-6 p-4 rounded-xl border-2 ${isDarkMode ? 'bg-blue-500/10 border-blue-500/20 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
              <div className="flex items-start space-x-3">
                <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                  <Info size={18} strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="font-semibold text-base mb-1.5">Tạo tài khoản sinh viên không thuộc câu lạc bộ</h3>
                  <p className="text-xs leading-relaxed">Sinh viên này sẽ có tài khoản để đăng nhập hệ thống nhưng không phải là thành viên câu lạc bộ. Họ có thể đăng ký tham gia câu lạc bộ sau này.</p>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <div className={`${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'} rounded-xl border-2 shadow-xl backdrop-blur-sm`}>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Basic Information */}
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                    <User size={18} strokeWidth={1.5} />
                  </div>
                  <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Thông tin cơ bản
                  </h3>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-xs font-semibold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Mã số sinh viên *
                    </label>
                    <input
                      type="text"
                      name="studentId"
                      value={formData.studentId}
                      onChange={handleInputChange}
                                             placeholder="2x1234567890123 hoặc admin001"
                      className={getInputClassName('studentId')}
                    />
                    {errors.studentId && (
                      <p className="mt-1.5 text-xs text-red-600 font-medium flex items-center">
                        <AlertCircle size={14} className="mr-1" strokeWidth={1.5} />
                        {errors.studentId}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className={`block text-xs font-semibold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Họ và tên *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Nguyễn Văn A"
                      className={getInputClassName('name')}
                    />
                    {errors.name && (
                      <p className="mt-1.5 text-xs text-red-600 font-medium flex items-center">
                        <AlertCircle size={14} className="mr-1" strokeWidth={1.5} />
                        {errors.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className={`block text-xs font-semibold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="2X12345678901@student.tdmu.edu.vn"
                      className={getInputClassName('email')}
                    />
                    {errors.email && (
                      <p className="mt-1.5 text-xs text-red-600 font-medium flex items-center">
                        <AlertCircle size={14} className="mr-1" strokeWidth={1.5} />
                        {errors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className={`block text-xs font-semibold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Số điện thoại
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="0901234567"
                      className={getInputClassName('phone')}
                    />
                    {errors.phone && (
                      <p className="mt-1.5 text-xs text-red-600 font-medium flex items-center">
                        <AlertCircle size={14} className="mr-1" strokeWidth={1.5} />
                        {errors.phone}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Academic Information */}
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600'}`}>
                    <GraduationCap size={18} strokeWidth={1.5} />
                  </div>
                  <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Thông tin học tập
                  </h3>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Khoa/Viện - Quan trọng hơn */}
                  <div>
                    <label className={`block text-xs font-semibold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Khoa/Viện {!isNonClubMember && <span className="text-red-500">*</span>}
                    </label>
                    <select
                      name="faculty"
                      value={formData.faculty}
                      onChange={handleInputChange}
                      className={getInputClassName('faculty')}
                    >
                      <option value="">Chọn khoa/viện</option>
                      {facultyOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    {errors.faculty && (
                      <p className="mt-1.5 text-xs text-red-600 font-medium flex items-center">
                        <AlertCircle size={14} className="mr-1" strokeWidth={1.5} />
                        {errors.faculty}
                      </p>
                    )}
                  </div>

                  {/* Lớp */}
                  <div>
                    <label className={`block text-xs font-semibold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Lớp
                    </label>
                    <input
                      type="text"
                      name="class"
                      value={formData.class}
                      onChange={handleInputChange}
                      placeholder="D2XCNTT0X"
                      className={getInputClassName('class')}
                    />
                    {errors.class && (
                      <p className="mt-1.5 text-xs text-red-600 font-medium flex items-center">
                        <AlertCircle size={14} className="mr-1" strokeWidth={1.5} />
                        {errors.class}
                      </p>
                    )}
                  </div>

                  {/* Custom Faculty Input - Only show when "Khác" is selected */}
                  {formData.faculty === 'Khác' && (
                    <div className="lg:col-span-2">
                      <label className={`block text-xs font-semibold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Nhập tên khoa/viện khác
                      </label>
                      <input
                        type="text"
                        name="customFaculty"
                        value={formData.customFaculty}
                        onChange={handleInputChange}
                        placeholder="Nhập tên khoa/viện"
                        className={getInputClassName('customFaculty')}
                      />
                      {errors.customFaculty && (
                        <p className="mt-1.5 text-xs text-red-600 font-medium flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {errors.customFaculty}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Account Information */}
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-600'}`}>
                    <Shield size={18} strokeWidth={1.5} />
                  </div>
                  <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Thông tin tài khoản
                  </h3>
                </div>
                <div className="space-y-4">
                  {/* Checkbox - Đặt lên đầu để user quyết định trước */}
                  <div className={`p-4 rounded-lg border-2 ${isDarkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                    <label className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isNonClubMember}
                        onChange={(e) => {
                          setIsNonClubMember(e.target.checked);
                          // Tự động set role về STUDENT khi chọn không thuộc CLB
                          if (e.target.checked) {
                            setFormData(prev => ({ ...prev, role: 'STUDENT' }));
                          }
                        }}
                        className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <span className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Tạo tài khoản sinh viên không thuộc câu lạc bộ
                        </span>
                        <p className={`text-xs mt-1.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Sinh viên này sẽ có tài khoản để đăng nhập nhưng không phải thành viên CLB
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Vai trò và mật khẩu */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-xs font-semibold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Vai trò *
                      </label>
                      <select
                        name="role"
                        value={formData.role}
                        onChange={handleInputChange}
                        disabled={isNonClubMember}
                        className={`${getInputClassName('role')} ${isNonClubMember ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <option value="CLUB_STUDENT">Thành Viên CLB</option>
                        <option value="CLUB_MEMBER">Ủy Viên BCH</option>
                        <option value="CLUB_DEPUTY">Phó Chủ Nhiệm</option>
                        <option value="CLUB_LEADER">Chủ Nhiệm CLB</option>
                        <option value="SUPER_ADMIN">Quản Trị Hệ Thống</option>
                        <option value="STUDENT">Sinh Viên (Không thuộc CLB)</option>
                      </select>
                      {isNonClubMember && (
                        <p className={`text-xs mt-1.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Sinh viên không thuộc CLB chỉ có thể có vai trò STUDENT
                        </p>
                      )}
                      {errors.role && (
                        <p className="mt-1.5 text-xs text-red-600 font-medium flex items-center">
                          <AlertCircle size={14} className="mr-1" strokeWidth={1.5} />
                          {errors.role}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className={`block text-xs font-semibold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Mật khẩu *
                      </label>
                      <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        placeholder="Mật khẩu"
                        className={getInputClassName('password')}
                      />
                      {errors.password && (
                        <p className="mt-1.5 text-xs text-red-600 font-medium flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {errors.password}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Xác nhận mật khẩu - Full width */}
                  <div>
                    <label className={`block text-xs font-semibold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Xác nhận mật khẩu *
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      placeholder="Nhập lại mật khẩu"
                      className={getInputClassName('confirmPassword')}
                    />
                    {errors.confirmPassword && (
                      <p className="mt-1.5 text-xs text-red-600 font-medium flex items-center">
                        <AlertCircle size={14} className="mr-1" strokeWidth={1.5} />
                        {errors.confirmPassword}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex flex-col lg:flex-row gap-4 pt-6 border-t-2 border-gray-200">
                <button
                  type="submit"
                  disabled={loading}
                  className={`flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2 font-semibold text-sm shadow-md hover:shadow-lg`}
                >
                  {loading ? (
                    <>
                      <Loader size={18} className="animate-spin" strokeWidth={1.5} />
                      <span>Đang xử lý...</span>
                    </>
                  ) : (
                    <>
                      {isNonClubMember ? (
                        <User size={18} strokeWidth={1.5} />
                      ) : (
                        <UserPlus size={18} strokeWidth={1.5} />
                      )}
                      <span>{isNonClubMember ? 'Tạo tài khoản' : 'Thêm thành viên'}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => router.push('/admin/members')}
                  className={`px-6 py-3 border-2 rounded-lg transition-all duration-200 font-semibold text-sm ${
                    isDarkMode 
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700 hover:border-gray-500' 
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                  }`}
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </main>

        <Footer isDarkMode={isDarkMode} />
      </div>
    </ProtectedRoute>
  );
}
