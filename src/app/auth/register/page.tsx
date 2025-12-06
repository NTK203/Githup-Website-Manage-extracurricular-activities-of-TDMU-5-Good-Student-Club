'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useGoogleLogin } from '@react-oauth/google';
import { User, Mail, Phone, GraduationCap, Building2, Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { validatePassword, getPasswordRequirements } from '@/lib/passwordValidation';

interface RegisterForm {
  studentId: string;
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  class: string;
  faculty: string;
  otherFaculty: string;
  role: string;
}

interface RegisterResponse {
  success: boolean;
  message: string;
  user?: {
    _id: string;
    studentId: string;
    name: string;
    email: string;
    role: 'STUDENT' | 'OFFICER' | 'ADMIN' | 'EXTERNAL';
  };
}

const FACULTY_OPTIONS = [
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

const ROLE_OPTIONS = [
  { value: 'STUDENT', label: 'Thành Viên CLB' },
  { value: 'OFFICER', label: 'Ban Chấp Hành' },
  { value: 'ADMIN', label: 'Quản Trị Viên' },
  { value: 'EXTERNAL', label: 'Sinh viên ngoài câu lạc bộ' }
];

export default function RegisterPage() {
  const auth = useAuth();
  const loginGoogle = 'loginGoogle' in auth ? (auth as any).loginGoogle : null;
  const router = useRouter();
  const [formData, setFormData] = useState<RegisterForm>({
    studentId: '',
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    class: '',
    faculty: '',
    otherFaculty: '',
    role: 'STUDENT'
  });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordModalData, setPasswordModalData] = useState<{ token: string; user: any } | null>(null);
  const [passwordModalForm, setPasswordModalForm] = useState({
    password: '',
    confirmPassword: '',
  });
  const [passwordModalLoading, setPasswordModalLoading] = useState(false);
  const [showPasswordModalFields, setShowPasswordModalFields] = useState({
    password: false,
    confirmPassword: false,
  });

  // Get Google Client ID (check at runtime)
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
  
  // Initialize useGoogleLogin hook (must be called unconditionally)
  const googleLogin = useGoogleLogin({
    onSuccess: async (response) => {
      setGoogleLoading(true);
      setError(null);
      setSuccess(null);
      
      try {
        // Send access_token to backend to fetch user info and authenticate
        if (loginGoogle) {
          const result = await loginGoogle(response.access_token);
          
          if (!result.success) {
            setError(result.error || 'Đăng ký Google thất bại');
          } else {
            // Nếu là user mới và chưa có password, hiển thị form nhập password
            const needsPassword = (result as any).needsPassword;
            
            if (needsPassword && result.user && (result as any).token) {
              setPasswordModalData({ token: (result as any).token, user: result.user });
              setShowPasswordModal(true);
              setSuccess(null); // Clear success message khi hiển thị modal
            } else {
              setSuccess('Đăng ký thành công! Đang chuyển hướng...');
            }
          }
        }
      } catch (err) {
        console.error('Google registration error:', err);
        setError('Lỗi đăng ký Google. Vui lòng thử lại.');
      } finally {
        setGoogleLoading(false);
      }
    },
    onError: () => {
      setError('Đăng ký Google thất bại. Vui lòng thử lại.');
      setGoogleLoading(false);
    },
  });

  const handleGoogleRegister = () => {
    if (!googleClientId) {
      alert('Google Sign-In chưa được cấu hình.\n\nVui lòng:\n1. Thêm NEXT_PUBLIC_GOOGLE_CLIENT_ID vào file .env.local\n2. Restart Next.js dev server\n3. Refresh trang này\n\nXem QUICK_SETUP_GOOGLE.md để biết cách lấy Google Client ID.');
      return;
    }
    try {
      googleLogin();
    } catch (err) {
      console.error('Error calling googleLogin:', err);
      setError('Lỗi khởi tạo Google Sign-In. Vui lòng kiểm tra console.');
    }
  };

  const handlePasswordModalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordModalForm(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const passwordValidation = validatePassword(passwordModalForm.password);
    if (!passwordValidation.valid) {
      setError(passwordValidation.error || 'Mật khẩu không hợp lệ');
      return;
    }

    if (passwordModalForm.password !== passwordModalForm.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    setPasswordModalLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/users/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${passwordModalData?.token}`,
        },
        body: JSON.stringify({
          newPassword: passwordModalForm.password,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Thêm mật khẩu thành công! Đang chuyển hướng...');
        setShowPasswordModal(false);
        // Redirect sau 1 giây
        setTimeout(() => {
          if (passwordModalData?.token) {
            localStorage.setItem('token', passwordModalData.token);
            localStorage.setItem('user', JSON.stringify(passwordModalData.user));
            router.push('/student/dashboard');
          }
        }, 1000);
      } else {
        setError(data.error || 'Thêm mật khẩu thất bại');
      }
    } catch (err) {
      setError('Lỗi kết nối. Vui lòng thử lại.');
      console.error('Password modal error:', err);
    } finally {
      setPasswordModalLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear errors when user starts typing
    if (error) setError(null);
    if (success) setSuccess(null);
  };

  const validateForm = (): string | null => {
    // Student ID validation
    if (!/^\d{13}$/.test(formData.studentId)) {
      return 'Mã số sinh viên phải có 13 chữ số';
    }

    // Name validation
    if (formData.name.length < 2) {
      return 'Họ và tên phải có ít nhất 2 ký tự';
    }

    // Email must be student email format
    const studentEmailPattern = /^[0-9]{13}@student\.tdmu\.edu\.vn$/;
    if (!studentEmailPattern.test(formData.email)) {
      return 'Email không đúng định dạng';
    }

    // Check if email matches student ID
    const emailStudentId = formData.email.split('@')[0];
    if (emailStudentId !== formData.studentId) {
      return 'Email phải khớp với mã số sinh viên. Phần trước @ phải giống với mã số sinh viên đã nhập.';
    }

    // Password validation
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.valid) {
      return passwordValidation.error || 'Mật khẩu không hợp lệ';
    }

    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      return 'Mật khẩu xác nhận không khớp';
    }

    // Phone validation (optional)
    if (formData.phone && !/^[0-9]{10,11}$/.test(formData.phone)) {
      return 'Số điện thoại phải có 10-11 chữ số';
    }

    // Other faculty validation (when "Khác" is selected)
    if (formData.faculty === 'Khác' && !formData.otherFaculty.trim()) {
      return 'Vui lòng nhập tên khoa/viện khác';
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Validate form
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: formData.studentId,
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone || undefined,
          class: formData.class || undefined,
          faculty: formData.faculty === 'Khác' ? formData.otherFaculty : (formData.faculty || undefined),
        }),
      });

      const result: RegisterResponse = await response.json();

      if (result.success) {
        setSuccess('Đăng ký thành công! Bạn sẽ được chuyển hướng đến trang đăng nhập.');
        setTimeout(() => {
          router.push('/auth/login');
        }, 2000);
      } else {
        setError(result.message || 'Đăng ký thất bại');
      }
    } catch (err) {
      setError('Lỗi kết nối. Vui lòng thử lại.');
      console.error('Registration error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center py-4 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes gradient-xy {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient-xy {
          background-size: 200% 200%;
          animation: gradient-xy 15s ease infinite;
        }
      `}} />
      {/* Neutral Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-slate-50 to-gray-100"></div>
      
      {/* Subtle Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000005_1px,transparent_1px),linear-gradient(to_bottom,#00000005_1px,transparent_1px)] bg-[size:24px_24px] opacity-30"></div>
      
      {/* Glassmorphism Card */}
      <div className="relative z-10 w-full max-w-4xl">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
          {/* Compact Header with Glassmorphism */}
          <div className="relative bg-gradient-to-r from-purple-600 via-violet-600 to-fuchsia-600 px-4 sm:px-6 py-6 sm:py-8 text-center text-white overflow-hidden shadow-lg">
            {/* Animated background pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(255,255,255,0.15),transparent_50%)]"></div>
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:20px_20px] opacity-40"></div>
            
            <div className="relative z-10">
              <div className="flex justify-center mb-3 sm:mb-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-white/20 rounded-xl blur-xl"></div>
                  <Image
                    src="/logo_clb_sv_5T.jpg"
                    alt="CLB Sinh viên 5 Tốt TDMU"
                    width={80}
                    height={80}
                    className="relative rounded-xl shadow-2xl border-2 border-white/40"
                  />
                </div>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-1 sm:mb-2 drop-shadow-lg">
                Đăng ký tài khoản
              </h1>
              <p className="text-purple-100 text-xs sm:text-sm drop-shadow-md">
                CLB Sinh viên 5 Tốt TDMU
              </p>
            </div>
          </div>

          {/* Form Section */}
          <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12 text-black">
            <form className="space-y-4 sm:space-y-6" onSubmit={handleSubmit} suppressHydrationWarning>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {/* Student ID Field */}
                <div>
                  <label htmlFor="studentId" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                    Mã số sinh viên <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      id="studentId"
                      name="studentId"
                      type="text"
                      required
                      value={formData.studentId}
                      onChange={handleInputChange}
                      className="block w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-gray-50 hover:bg-white"
                      placeholder="2x24xxxxxxxxx"
                      maxLength={13}
                      suppressHydrationWarning
                    />
                  </div>
                </div>

                {/* Name Field */}
                <div>
                  <label htmlFor="name" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                    Họ và tên <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      value={formData.name}
                      onChange={handleInputChange}
                      className="block w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-gray-50 hover:bg-white"
                      placeholder="Nguyễn Văn A"
                      suppressHydrationWarning
                    />
                  </div>
                </div>

                {/* Email Field */}
                <div>
                  <label htmlFor="email" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      className="block w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-gray-50 hover:bg-white"
                      placeholder="2x24xxxxxxxxx@student.tdmu.edu.vn"
                      suppressHydrationWarning
                    />
                  </div>
                </div>

                {/* Phone Field */}
                <div>
                  <label htmlFor="phone" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                    Số điện thoại
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="block w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-gray-50 hover:bg-white"
                      placeholder="0123456789"
                      maxLength={11}
                      suppressHydrationWarning
                    />
                  </div>
                </div>

                {/* Class Field */}
                <div>
                  <label htmlFor="class" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                    Lớp
                  </label>
                  <div className="relative">
                    <GraduationCap className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      id="class"
                      name="class"
                      type="text"
                      value={formData.class}
                      onChange={handleInputChange}
                      className="block w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-gray-50 hover:bg-white"
                      placeholder="Ví Dụ : D2XCNTT01"
                      suppressHydrationWarning
                    />
                  </div>
                </div>

                {/* Faculty Field */}
                <div>
                  <label htmlFor="faculty" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                    Khoa/Viện
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none z-10" />
                    <select
                      id="faculty"
                      name="faculty"
                      value={formData.faculty}
                      onChange={handleInputChange}
                      className="block w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-gray-50 hover:bg-white appearance-none"
                      suppressHydrationWarning
                    >
                      <option value="">Chọn khoa/viện</option>
                      {FACULTY_OPTIONS.map((faculty) => (
                        <option key={faculty} value={faculty}>
                          {faculty}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Other Faculty Input - Show when "Khác" is selected */}
                  {formData.faculty === 'Khác' && (
                    <div className="mt-3">
                      <label htmlFor="otherFaculty" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                        Nhập tên khoa/viện khác
                      </label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                          id="otherFaculty"
                          name="otherFaculty"
                          type="text"
                          value={formData.otherFaculty}
                          onChange={handleInputChange}
                          className="block w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-gray-50 hover:bg-white"
                          placeholder="Nhập tên khoa/viện của bạn"
                          suppressHydrationWarning
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Password Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {/* Password Field */}
                <div>
                  <label htmlFor="password" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                    Mật khẩu <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={formData.password}
                      onChange={handleInputChange}
                      className="block w-full pl-9 pr-10 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-gray-50 hover:bg-white"
                      placeholder="Nhập mật khẩu (tối thiểu 6 ký tự, 1 chữ hoa, 1 ký tự đặc biệt)"
                      suppressHydrationWarning
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                      suppressHydrationWarning
                    >
                      {showPassword ? (
                        <EyeOff size={18} strokeWidth={2} />
                      ) : (
                        <Eye size={18} strokeWidth={2} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirm Password Field */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                    Xác nhận mật khẩu <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className="block w-full pl-9 pr-10 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-gray-50 hover:bg-white"
                      placeholder="Nhập lại mật khẩu"
                      suppressHydrationWarning
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                      suppressHydrationWarning
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={18} strokeWidth={2} />
                      ) : (
                        <Eye size={18} strokeWidth={2} />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Password Reminder */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800">
                  <strong>Yêu cầu mật khẩu:</strong> {getPasswordRequirements()}
                </p>
                <p className="text-xs text-blue-700 mt-2">
                  <strong>Lưu ý:</strong> Vui lòng ghi nhớ mật khẩu bạn vừa đặt. Mật khẩu này sẽ được sử dụng để đăng nhập vào hệ thống. Nếu quên mật khẩu, bạn có thể sử dụng chức năng "Quên mật khẩu" trên trang đăng nhập.
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-lg flex items-start gap-2">
                  <AlertCircle size={16} strokeWidth={2.5} className="mt-0.5 flex-shrink-0" />
                  <p className="text-xs flex-1">{error}</p>
                </div>
              )}

              {/* Success Message */}
              {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2.5 rounded-lg flex items-start gap-2">
                  <CheckCircle2 size={16} strokeWidth={2.5} className="mt-0.5 flex-shrink-0" />
                  <p className="text-xs flex-1">{success}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || googleLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 sm:py-3 px-4 text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
                suppressHydrationWarning
              >
                {loading ? (
                  <>
                    <Loader2 size={16} strokeWidth={2.5} className="animate-spin" />
                    <span>Đang đăng ký...</span>
                  </>
                ) : (
                  <span>Đăng ký</span>
                )}
              </button>
            </form>

            {/* Compact Divider */}
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-white text-gray-500">Hoặc</span>
              </div>
            </div>

            {/* Compact Google Sign-In Button */}
            <button
              type="button"
              onClick={handleGoogleRegister}
              disabled={loading || googleLoading || !googleClientId}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium rounded-lg border border-gray-300 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
              suppressHydrationWarning
            >
              {googleLoading ? (
                <>
                  <Loader2 size={16} strokeWidth={2.5} className="animate-spin text-gray-600" />
                  <span className="text-gray-700">Đang đăng ký...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span className="text-gray-700">Đăng ký bằng Google</span>
                </>
              )}
            </button>

            {/* Footer */}
            <div className="mt-6 text-center space-y-2">
              <p className="text-xs sm:text-sm text-gray-600">
                Đã có tài khoản?{' '}
                <a href="/auth/login" className="font-semibold text-purple-600 hover:text-purple-700 transition-colors">
                  Đăng nhập ngay
                </a>
              </p>
              <p className="text-[10px] sm:text-xs text-gray-400">
                © 2025 CLB Sinh viên 5 Tốt TDMU
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Password Modal - Hiển thị sau khi đăng ký Google thành công */}
      {showPasswordModal && passwordModalData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 max-w-md w-full">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Thiết lập mật khẩu
              </h2>
              <p className="text-sm text-gray-600">
                Để bảo mật tài khoản, vui lòng thiết lập mật khẩu. Bạn có thể đăng nhập bằng email/mật khẩu hoặc Google sau này.
              </p>
            </div>

            <form onSubmit={handlePasswordModalSubmit} className="space-y-4">
              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-lg flex items-start gap-2">
                  <AlertCircle size={16} strokeWidth={2.5} className="mt-0.5 flex-shrink-0" />
                  <p className="text-xs flex-1">{error}</p>
                </div>
              )}

              {/* Password Field */}
              <div>
                <label htmlFor="modalPassword" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                  Mật khẩu <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    id="modalPassword"
                    name="password"
                    type={showPasswordModalFields.password ? 'text' : 'password'}
                    required
                    value={passwordModalForm.password}
                    onChange={handlePasswordModalChange}
                    className="block w-full pl-9 pr-10 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-gray-50 hover:bg-white"
                    placeholder="Nhập mật khẩu (tối thiểu 6 ký tự, 1 chữ hoa, 1 ký tự đặc biệt)"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordModalFields(prev => ({ ...prev, password: !prev.password }))}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPasswordModalFields.password ? (
                      <EyeOff size={18} strokeWidth={2} />
                    ) : (
                      <Eye size={18} strokeWidth={2} />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password Field */}
              <div>
                <label htmlFor="modalConfirmPassword" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                  Xác nhận mật khẩu <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    id="modalConfirmPassword"
                    name="confirmPassword"
                    type={showPasswordModalFields.confirmPassword ? 'text' : 'password'}
                    required
                    value={passwordModalForm.confirmPassword}
                    onChange={handlePasswordModalChange}
                    className="block w-full pl-9 pr-10 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-gray-50 hover:bg-white"
                    placeholder="Nhập lại mật khẩu"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordModalFields(prev => ({ ...prev, confirmPassword: !prev.confirmPassword }))}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPasswordModalFields.confirmPassword ? (
                      <EyeOff size={18} strokeWidth={2} />
                    ) : (
                      <Eye size={18} strokeWidth={2} />
                    )}
                  </button>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordModalData(null);
                    setPasswordModalForm({ password: '', confirmPassword: '' });
                    setError(null);
                    // Redirect ngay nếu user bỏ qua
                    if (passwordModalData?.token) {
                      localStorage.setItem('token', passwordModalData.token);
                      localStorage.setItem('user', JSON.stringify(passwordModalData.user));
                      router.push('/student/dashboard');
                    }
                  }}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Bỏ qua
                </button>
                <button
                  type="submit"
                  disabled={passwordModalLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {passwordModalLoading ? (
                    <>
                      <Loader2 size={16} strokeWidth={2.5} className="animate-spin" />
                      <span>Đang xử lý...</span>
                    </>
                  ) : (
                    <span>Thiết lập mật khẩu</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
