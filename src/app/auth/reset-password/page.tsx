'use client';

import { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { validatePassword, getPasswordRequirements } from '@/lib/passwordValidation';
import Loading from './loading';

function ResetPasswordPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Token không hợp lệ. Vui lòng yêu cầu đặt lại mật khẩu mới.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate passwords
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      setError(passwordValidation.error || 'Mật khẩu không hợp lệ');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      setLoading(false);
      return;
    }

    if (!token) {
      setError('Token không hợp lệ');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/auth/login');
        }, 3000);
      } else {
        setError(data.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
      }
    } catch (err) {
      setError('Lỗi kết nối. Vui lòng thử lại.');
      console.error('Reset password error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen relative flex items-center justify-center py-4 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-slate-50 to-gray-100"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000005_1px,transparent_1px),linear-gradient(to_bottom,#00000005_1px,transparent_1px)] bg-[size:24px_24px] opacity-30"></div>
        <div className="relative z-10 w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
            <div className="relative bg-gradient-to-r from-red-500 via-red-600 to-pink-600 px-6 py-8 text-center text-white overflow-hidden shadow-lg">
              <div className="relative z-10">
                <AlertCircle className="w-12 h-12 mx-auto mb-4" />
                <h1 className="text-xl font-bold mb-2">Token không hợp lệ</h1>
                <p className="text-red-100 text-sm">
                  Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.
                </p>
              </div>
            </div>
            <div className="p-6 text-center">
              <Link
                href="/auth/forgot-password"
                className="inline-flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700 font-medium"
              >
                <ArrowLeft size={14} strokeWidth={2} />
                <span>Yêu cầu link mới</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen relative flex items-center justify-center py-4 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-slate-50 to-gray-100"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000005_1px,transparent_1px),linear-gradient(to_bottom,#00000005_1px,transparent_1px)] bg-[size:24px_24px] opacity-30"></div>
        <div className="relative z-10 w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
            <div className="relative bg-gradient-to-r from-green-500 via-green-600 to-emerald-600 px-6 py-8 text-center text-white overflow-hidden shadow-lg">
              <div className="relative z-10">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-4" />
                <h1 className="text-xl font-bold mb-2">Đặt lại mật khẩu thành công</h1>
                <p className="text-green-100 text-sm">
                  Mật khẩu của bạn đã được đặt lại. Đang chuyển đến trang đăng nhập...
                </p>
              </div>
            </div>
            <div className="p-6 text-center">
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700 font-medium"
              >
                <span>Đăng nhập ngay</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center py-4 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <style dangerouslySetInnerHTML={{__html: `
        /* Fix autofill text color */
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        input:-webkit-autofill:active {
          -webkit-text-fill-color: #111827 !important;
          -webkit-box-shadow: 0 0 0 30px #f9fafb inset !important;
          transition: background-color 5000s ease-in-out 0s;
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
                Đặt lại mật khẩu
              </h1>
              <p className="text-purple-100 text-sm drop-shadow-md">
                Nhập mật khẩu mới của bạn
              </p>
            </div>
          </div>

          {/* Compact Form Section */}
          <div className="px-6 py-6 sm:px-8 sm:py-8">

          <form onSubmit={handleSubmit} className="space-y-4" suppressHydrationWarning>
            {/* Password Requirements Info */}
            <div className="mb-4 p-3 rounded-lg bg-gray-50 border border-gray-200">
              <p className="text-xs font-medium text-gray-700 mb-2">Yêu cầu mật khẩu:</p>
              <ul className="text-xs space-y-1 text-gray-600">
                <li>• Tối thiểu 8 ký tự</li>
                <li>• Có ít nhất 1 chữ hoa</li>
                <li>• Có ít nhất 1 chữ thường</li>
                <li>• Có ít nhất 1 số</li>
              </ul>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-gray-700 mb-1.5">
                Mật khẩu mới
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-9 pr-10 py-2.5 text-sm text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-gray-50 hover:bg-white placeholder:text-gray-400"
                  placeholder="Nhập mật khẩu mới"
                  suppressHydrationWarning
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-semibold text-gray-700 mb-1.5">
                Xác nhận mật khẩu
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full pl-9 pr-10 py-2.5 text-sm text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-gray-50 hover:bg-white placeholder:text-gray-400"
                  placeholder="Nhập lại mật khẩu mới"
                  suppressHydrationWarning
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-lg flex items-start gap-2">
                <AlertCircle size={16} strokeWidth={2.5} className="mt-0.5 flex-shrink-0" />
                <p className="text-xs flex-1">{error}</p>
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
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <span>Đặt lại mật khẩu</span>
              )}
            </button>

            {/* Back to Login */}
            <div className="text-center">
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700 font-medium transition-colors"
              >
                <ArrowLeft size={14} strokeWidth={2} />
                <span>Quay lại đăng nhập</span>
              </Link>
            </div>

            {/* Footer */}
            <div className="pt-2 text-center">
              <p className="text-[10px] text-gray-400">
                © 2025 CLB Sinh viên 5 Tốt TDMU
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
    </div>
    );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ResetPasswordPageContent />
    </Suspense>
  );
}

