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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

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
                Quên mật khẩu
              </h1>
              <p className="text-purple-100 text-sm drop-shadow-md">
                Nhập email để nhận link đặt lại mật khẩu
              </p>
            </div>
          </div>

          {/* Compact Form Section */}
          <div className="px-6 py-6 sm:px-8 sm:py-8">
          <form onSubmit={handleSubmit} className="space-y-4" suppressHydrationWarning>
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
                  className="block w-full pl-9 pr-3 py-2.5 text-sm text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-gray-50 hover:bg-white placeholder:text-gray-400"
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

