'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { useGoogleLogin } from '@react-oauth/google';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

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

  const validateEmail = (email: string): string | null => {
    if (!email || email.trim() === '') {
      return 'Vui lòng nhập email';
    }

    // Email must be student email format or admin email
    const studentEmailPattern = /^[0-9]{13}@student\.tdmu\.edu\.vn$/;
    const isAdminEmail = email.toLowerCase() === 'admin@tdmu.edu.vn' || 
                        email.toLowerCase() === 'admin.clb@tdmu.edu.vn' ||
                        email.toLowerCase() === 'superadmin@tdmu.edu.vn';
    
    if (!isAdminEmail && !studentEmailPattern.test(email)) {
      return 'Email không đúng định dạng';
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate email format
    const emailError = validateEmail(formData.email);
    if (emailError) {
      setError(emailError);
      setLoading(false);
      return;
    }

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
      case 'OFFICER': return 'text-blue-600';
      case 'CLUB_STUDENT': return 'text-purple-600';
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
      case 'OFFICER': return '👥';
      case 'CLUB_STUDENT': return '👥';
      case 'STUDENT': return '🎓';
      default: return '👤';
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
      case 'ADMIN': return 'Quản Trị Hệ Thống';
      case 'CLUB_LEADER': return 'Chủ Nhiệm CLB';
      case 'CLUB_DEPUTY': return 'Phó Chủ Nhiệm';
      case 'OFFICER': return 'Ủy Viên BCH';
      case 'CLUB_STUDENT': return 'Thành Viên CLB';
      case 'STUDENT': return 'Sinh Viên';
      default: return role;
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center py-4 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes gradient-xy {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%) skewX(-12deg); }
          100% { transform: translateX(200%) skewX(-12deg); }
        }
        .animate-gradient-xy {
          background-size: 200% 200%;
          animation: gradient-xy 15s ease infinite;
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
        .animation-delay-6000 { animation-delay: 6s; }
        .animate-shimmer {
          animation: shimmer 3s infinite;
        }
      `}} />
        {/* Neutral Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-slate-50 to-gray-100"></div>
        
        {/* Subtle Grid Pattern Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000005_1px,transparent_1px),linear-gradient(to_bottom,#00000005_1px,transparent_1px)] bg-[size:24px_24px] opacity-30"></div>
        
        {/* Glassmorphism Card */}
        <div className="relative z-10 w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
          {/* Compact Header with Glassmorphism */}
          <div className="relative bg-gradient-to-r from-purple-600 via-violet-600 to-fuchsia-600 px-6 py-8 text-center text-white overflow-hidden shadow-lg">
            {/* Animated background pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(255,255,255,0.15),transparent_50%)]"></div>
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:20px_20px] opacity-40"></div>
            
            <div className="relative z-10">
              <div className="flex justify-center mb-4">
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
              <h1 className="text-2xl sm:text-3xl font-bold mb-1 drop-shadow-lg">
                Đăng nhập
              </h1>
              <p className="text-purple-100 text-sm drop-shadow-md">
                CLB Sinh viên 5 Tốt TDMU
              </p>
            </div>
          </div>

          {/* Compact Form Section */}
          <div className="px-6 py-6 sm:px-8 sm:py-8">
            <form className="space-y-4" onSubmit={handleSubmit} suppressHydrationWarning>
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="block w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-gray-50 hover:bg-white"
                    placeholder="21100011@student.tdmu.edu.vn"
                    suppressHydrationWarning
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Mật khẩu
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    className="block w-full pl-9 pr-10 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-gray-50 hover:bg-white"
                    placeholder="Nhập mật khẩu"
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
                <div className="mt-1.5 flex justify-end">
                  <Link
                    href="/auth/forgot-password"
                    className="text-xs text-purple-600 hover:text-purple-700 font-medium transition-colors"
                  >
                    Quên mật khẩu?
                  </Link>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-lg flex items-start gap-2">
                  <AlertCircle size={16} strokeWidth={2.5} className="mt-0.5 flex-shrink-0" />
                  <div className="text-xs flex-1">
                    <p>{error}</p>
                    {error.includes('chưa được đăng ký') && (
                      <p className="mt-1.5">
                        <a href="/auth/register" className="font-semibold text-purple-600 hover:text-purple-700 underline">
                          Đăng ký ngay
                        </a>
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
                suppressHydrationWarning
              >
                {loading ? (
                  <>
                    <Loader2 size={16} strokeWidth={2.5} className="animate-spin" />
                    <span>Đang đăng nhập...</span>
                  </>
                ) : (
                  <span>Đăng nhập</span>
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
              onClick={handleGoogleLogin}
              disabled={loading || googleLoading || !googleClientId}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium rounded-lg border border-gray-300 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
              suppressHydrationWarning
            >
              {googleLoading ? (
                <>
                  <Loader2 size={16} strokeWidth={2.5} className="animate-spin text-gray-600" />
                  <span className="text-gray-700">Đang đăng nhập...</span>
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
                  <span className="text-gray-700">Đăng nhập bằng Google</span>
                </>
              )}
            </button>

            {/* Compact Footer */}
            <div className="mt-6 text-center space-y-2">
              <p className="text-xs text-gray-600">
                Chưa có tài khoản?{' '}
                <a href="/auth/register" className="font-semibold text-purple-600 hover:text-purple-700 transition-colors">
                  Đăng ký ngay
                </a>
              </p>
              <p className="text-[10px] text-gray-400">
                © 2025 CLB Sinh viên 5 Tốt TDMU
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
