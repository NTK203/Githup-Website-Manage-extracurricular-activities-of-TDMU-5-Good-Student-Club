'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [resetLink, setResetLink] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    setResetLink(null);

    // Validate email format
    const studentEmailPattern = /^[0-9]{13}@student\.tdmu\.edu\.vn$/;
    const isAdminEmail = email.toLowerCase() === 'admin@tdmu.edu.vn' || 
                        email.toLowerCase() === 'admin.clb@tdmu.edu.vn' ||
                        email.toLowerCase() === 'superadmin@tdmu.edu.vn';
    
    if (!isAdminEmail && !studentEmailPattern.test(email)) {
      setError('Email không đúng định dạng');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(data.message);
        // In development, show reset link
        if (data.resetLink) {
          setResetLink(data.resetLink);
        }
      } else {
        setError(data.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
      }
    } catch (err) {
      setError('Lỗi kết nối. Vui lòng thử lại.');
      console.error('Forgot password error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-violet-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <Image
              src="/logo.png"
              alt="CLB Sinh viên 5 Tốt TDMU"
              width={80}
              height={80}
              className="rounded-full shadow-lg"
              priority
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Quên mật khẩu
          </h1>
          <p className="text-sm text-gray-600">
            Nhập email để nhận link đặt lại mật khẩu
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-gray-50 hover:bg-white"
                  placeholder="21100011@student.tdmu.edu.vn"
                  suppressHydrationWarning
                />
              </div>
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
                <div className="text-xs flex-1">
                  <p>{success}</p>
                  {resetLink && (
                    <div className="mt-3 p-3 bg-white rounded border border-green-200">
                      <p className="text-xs font-semibold mb-2 text-gray-700">Link đặt lại mật khẩu (Development):</p>
                      <a 
                        href={resetLink} 
                        className="text-xs text-purple-600 hover:text-purple-700 underline break-all"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {resetLink}
                      </a>
                    </div>
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
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <span>Gửi link đặt lại mật khẩu</span>
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
          </form>
        </div>
      </div>
    </div>
  );
}

