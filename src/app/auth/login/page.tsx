'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { useGoogleLogin } from '@react-oauth/google';
import { useRouter } from 'next/navigation';

interface LoginForm {
  email: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  message: string;
  user?: {
    _id: string;
    studentId: string;
    name: string;
    email: string;
    role: 'SUPER_ADMIN' | 'CLUB_LEADER' | 'CLUB_DEPUTY' | 'CLUB_MEMBER' | 'CLUB_STUDENT' | 'STUDENT' | 'OFFICER' | 'ADMIN';
    isClubMember?: boolean;
  };
  token?: string;
}

export default function LoginPage() {
  const auth = useAuth();
  const { login, isAuthenticated } = auth;
  // Safely get loginGoogle - handle case where it might not exist
  const loginGoogle = 'loginGoogle' in auth ? (auth as any).loginGoogle : null;
  const router = useRouter();
  const [formData, setFormData] = useState<LoginForm>({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Get Google Client ID (check at runtime)
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
  
  // Initialize useGoogleLogin hook (must be called unconditionally)
  const googleLogin = useGoogleLogin({
    onSuccess: async (response) => {
      setGoogleLoading(true);
      setError(null);
      
      try {
        // Send access_token to backend to fetch user info and authenticate
        if (loginGoogle) {
          const result = await loginGoogle(response.access_token);
          
          if (!result.success) {
            setError(result.error || 'Đăng nhập Google thất bại');
          }
        }
      } catch (err) {
        console.error('Google login error:', err);
        setError('Lỗi đăng nhập Google. Vui lòng thử lại.');
      } finally {
        setGoogleLoading(false);
      }
    },
    onError: () => {
      setError('Đăng nhập Google thất bại. Vui lòng thử lại.');
      setGoogleLoading(false);
    },
  });

  const handleGoogleLogin = () => {
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await login(formData.email, formData.password);
      
      if (result.success) {
        // Login successful, redirect will be handled by useAuth hook
        console.log('Login successful:', result.user);
      } else {
        setError(result.error || 'Đăng nhập thất bại');
      }
    } catch (err) {
      setError('Lỗi kết nối. Vui lòng thử lại.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
      case 'ADMIN': return 'text-purple-600';
      case 'CLUB_LEADER': return 'text-red-600';
      case 'CLUB_DEPUTY': return 'text-orange-600';
      case 'CLUB_MEMBER':
      case 'OFFICER': return 'text-blue-600';
      case 'CLUB_STUDENT':
      case 'STUDENT': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
      case 'ADMIN': return '👨‍💻';
      case 'CLUB_LEADER': return '👑';
      case 'CLUB_DEPUTY': return '👨‍💼';
      case 'CLUB_MEMBER':
      case 'OFFICER': return '👥';
      case 'CLUB_STUDENT':
      case 'STUDENT': return '🎓';
      default: return '👤';
    }
  };
0
  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
      case 'ADMIN': return 'Quản Trị Hệ Thống';
      case 'CLUB_LEADER': return 'Chủ Nhiệm CLB';
      case 'CLUB_DEPUTY': return 'Phó Chủ Nhiệm';
      case 'CLUB_MEMBER':
      case 'OFFICER': return 'Ủy Viên BCH';
      case 'CLUB_STUDENT':
      case 'STUDENT': return 'Thành Viên CLB';
      default: return role;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-violet-50 to-fuchsia-100 flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8 text-black">
      <div className="max-w-4xl w-full">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-purple-600 to-violet-700 px-8 py-12 text-center text-white">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <Image
                  src="/logo_clb_sv_5T.jpg"
                  alt="CLB Sinh viên 5 Tốt TDMU"
                  width={100}
                  height={100}
                  className="rounded-2xl shadow-2xl border-4 border-white/20"
                />
              </div>
            </div>
            <h1 className="text-4xl font-bold mb-3">
              Đăng nhập
            </h1>
            <p className="text-purple-100 text-lg">
              CLB Sinh viên 5 Tốt TDMU
            </p>
            <div className="mt-6 flex justify-center">
              <div className="w-24 h-1 bg-white/30 rounded-full"></div>
            </div>
          </div>

          {/* Form Section */}
          <div className="px-8 py-12 text-black">
            <form className="space-y-6" onSubmit={handleSubmit} suppressHydrationWarning>
              {/* Email Field */}
              <div suppressHydrationWarning>
                <label htmlFor="email" className="block text-sm font-semibold text-black mb-2">
                  Email
                </label>
                <div className="relative" suppressHydrationWarning>
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-gray-50 hover:bg-white"
                    placeholder="21100011@student.tdmu.edu.vn"
                    suppressHydrationWarning
                  />
                </div>
              </div>

              {/* Password Field */}
              <div suppressHydrationWarning>
                <label htmlFor="password" className="block text-sm font-semibold text-black mb-2">
                  Mật khẩu
                </label>
                <div className="relative" suppressHydrationWarning>
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-gray-50 hover:bg-white"
                    placeholder="Nhập mật khẩu"
                    suppressHydrationWarning
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    suppressHydrationWarning
                  >
                    {showPassword ? (
                      <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
                  <div className="flex">
                    <svg className="h-5 w-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-4 px-6 border border-transparent text-lg font-semibold rounded-xl text-white bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                suppressHydrationWarning
              >
                {loading ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Đang đăng nhập...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    Đăng nhập
                  </div>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Hoặc</span>
              </div>
            </div>

            {/* Google Sign-In Button - ALWAYS VISIBLE */}
            <div className="w-full" style={{ display: 'block', visibility: 'visible', opacity: 1 }} suppressHydrationWarning>
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading || googleLoading || !googleClientId}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 border-2 border-gray-300 rounded-xl bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
                style={{ display: 'flex', visibility: 'visible', opacity: (!googleClientId) ? 0.5 : 1 }}
                suppressHydrationWarning
              >
              {googleLoading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-gray-700 font-medium">Đang đăng nhập...</span>
                </div>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
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
                  <span className="text-gray-700 font-medium">Đăng nhập bằng Google</span>
                </>
              )}
              </button>
            </div>
          

            {/* Footer */}
            <div className="mt-8 text-center">
              <p className="text-sm text-black">
                Chưa có tài khoản?{' '}
                <a href="/auth/register" className="font-semibold text-purple-600 hover:text-purple-700 transition-colors">
                  Đăng ký ngay
                </a>
              </p>
              <p className="text-xs text-gray-500 mt-3">
                © 2025 CLB Sinh viên 5 Tốt TDMU. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
