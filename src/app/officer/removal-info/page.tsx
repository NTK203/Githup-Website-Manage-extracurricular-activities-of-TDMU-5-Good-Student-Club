'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import OfficerNav from '@/components/officer/OfficerNav';
import Footer from '@/components/common/Footer';
import ProtectedRoute from '@/components/common/ProtectedRoute';
interface RemovalInfo {
  _id: string;
  userId: {
    _id: string;
    name: string;
    studentId: string;
    email: string;
  };
  status: 'REMOVED';
  removedAt: string;
  removedBy: {
    _id: string;
    name: string;
    studentId: string;
  };
  removalReason: string;
  joinedAt: string;
  approvedAt?: string;
  approvedBy?: {
    _id: string;
    name: string;
    studentId: string;
  };
  // Restoration info
  restoredAt?: string;
  restoredBy?: {
    _id: string;
    name: string;
    studentId: string;
  };
  restorationReason?: string;
}

export default function OfficerRemovalInfoPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [removalInfo, setRemovalInfo] = useState<RemovalInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load theme from localStorage on component mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
    }

    // Listen for theme changes from OfficerNav
    const handleThemeChange = () => {
      const currentTheme = localStorage.getItem('theme');
      setIsDarkMode(currentTheme === 'dark');
    };

    window.addEventListener('themeChange', handleThemeChange);
    return () => window.removeEventListener('themeChange', handleThemeChange);
  }, []);

  // Load removal info
  useEffect(() => {
    loadRemovalInfo();
  }, []);

  const loadRemovalInfo = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Không tìm thấy token đăng nhập');
        return;
      }

      const response = await fetch('/api/memberships/my-status', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('API Response:', data); // Debug log
        
        if (data.success && data.data && data.data.membership) {
          if (data.data.membership.status === 'REMOVED') {
            setRemovalInfo(data.data.membership);
          } else {
            setError('Bạn chưa bị xóa khỏi CLB');
          }
        } else {
          setError('Không tìm thấy thông tin về việc bị xóa');
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Không thể tải thông tin');
      }
    } catch (err) {
      console.error('Error loading removal info:', err);
      setError('Có lỗi xảy ra khi tải thông tin');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRole="CLUB_LEADER">
        <div className={`min-h-screen flex flex-col transition-colors duration-200 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
            <OfficerNav />
            <main className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Đang tải thông tin...</p>
              </div>
            </main>
          </div></ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute requiredRole="CLUB_LEADER">
        <div className={`min-h-screen flex flex-col transition-colors duration-200 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
            <OfficerNav />
            <main className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className={`p-4 rounded-full ${isDarkMode ? 'bg-red-500/20' : 'bg-red-100'} mb-4`}>
                  <svg className="w-8 h-8 text-red-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h2 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Có lỗi xảy ra</h2>
                <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-4`}>{error}</p>
                <button
                  onClick={() => router.push('/officer/dashboard')}
                  className={`px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors`}
                >
                  Về trang chủ
                </button>
              </div>
            </main>
          </div></ProtectedRoute>
    );
  }

  if (!removalInfo) {
    return (
      <ProtectedRoute requiredRole="CLUB_LEADER">
        <div className={`min-h-screen flex flex-col transition-colors duration-200 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
            <OfficerNav />
            <main className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className={`p-4 rounded-full ${isDarkMode ? 'bg-gray-500/20' : 'bg-gray-100'} mb-4`}>
                  <svg className="w-8 h-8 text-gray-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h2 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Không tìm thấy thông tin</h2>
                <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-4`}>Không có thông tin về việc bị xóa khỏi CLB</p>
                <button
                  onClick={() => router.push('/officer/dashboard')}
                  className={`px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors`}
                >
                  Về trang chủ
                </button>
              </div>
            </main>
          </div></ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="CLUB_LEADER">
      <div className={`min-h-screen flex flex-col transition-colors duration-200 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
          <OfficerNav />
          
          <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {removalInfo.restoredAt ? 'Thông tin duyệt lại CLB' : 'Thông tin bị xóa khỏi CLB'}
                  </h1>
                  <p className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    {removalInfo.restoredAt 
                      ? 'Chi tiết về việc tài khoản được duyệt lại vào CLB Sinh viên 5 Tốt TDMU'
                      : 'Chi tiết về việc tài khoản bị xóa khỏi CLB Sinh viên 5 Tốt TDMU'
                    }
                  </p>
                </div>
                <div className="flex space-x-3">
                  {!removalInfo.restoredAt && (
                    <button
                      onClick={() => router.push('/student/register')}
                      className={`px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2`}
                    >
                      <span>🔄</span>
                      <span>Đăng ký lại</span>
                    </button>
                  )}
                  <button
                    onClick={() => router.push('/officer/dashboard')}
                    className={`px-6 py-3 ${isDarkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-white text-gray-700 hover:bg-gray-50'} border border-gray-300 rounded-lg transition-colors`}
                  >
                    Quay về
                  </button>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="space-y-6">
              {/* Status Banner */}
              {removalInfo.restoredAt ? (
                <div className={`p-6 rounded-xl border-2 ${isDarkMode ? 'bg-green-500/10 border-green-500/20' : 'bg-green-50 border-green-200'}`}>
                  <div className="flex items-start space-x-4">
                    <div className={`p-3 rounded-full ${isDarkMode ? 'bg-green-500/20' : 'bg-green-100'}`}>
                      <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-green-900'}`}>
                        Tài khoản đã được duyệt lại
                      </h3>
                      <p className={`${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>
                        Tài khoản của bạn đã được duyệt lại vào CLB Sinh viên 5 Tốt TDMU. 
                        Bạn có thể tiếp tục tham gia các hoạt động của CLB.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={`p-6 rounded-xl border-2 ${isDarkMode ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-start space-x-4">
                    <div className={`p-3 rounded-full ${isDarkMode ? 'bg-red-500/20' : 'bg-red-100'}`}>
                      <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-red-900'}`}>
                        Tài khoản đã bị xóa khỏi CLB
                      </h3>
                      <p className={`${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>
                        Tài khoản của bạn đã bị xóa khỏi CLB Sinh viên 5 Tốt TDMU. 
                        Bạn có thể đăng ký lại sau khi đã cải thiện các vấn đề được nêu dưới đây.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Details */}
              <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl border shadow-sm overflow-hidden`}>
                <div className={`px-6 py-4 border-b ${isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
                  <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {removalInfo.restoredAt ? 'Chi tiết duyệt lại' : 'Chi tiết việc xóa'}
                  </h2>
                </div>
                
                <div className="p-6 space-y-6">
                  {/* Reason */}
                  {!removalInfo.restoredAt && (
                    <div>
                      <h3 className={`text-lg font-medium mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        Lý do bị xóa
                      </h3>
                      <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700/50 border border-gray-600' : 'bg-red-50 border border-red-200'}`}>
                        <p className={`${isDarkMode ? 'text-gray-300' : 'text-red-900'}`}>
                          {removalInfo.removalReason || 'Không có thông tin về lý do xóa'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Restoration Reason */}
                  {removalInfo.restoredAt && removalInfo.restorationReason && (
                    <div>
                      <h3 className={`text-lg font-medium mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        Lý do duyệt lại
                      </h3>
                      <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-green-700/50 border border-green-600' : 'bg-green-50 border border-green-200'}`}>
                        <p className={`${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>
                          {removalInfo.restorationReason}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Timeline */}
                  <div>
                    <h3 className={`text-lg font-medium mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Thông tin thời gian
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 rounded-lg border">
                        <div>
                          <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Ngày tham gia CLB</p>
                          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {formatDate(removalInfo.joinedAt)}
                          </p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${isDarkMode ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'}`}>
                          Tham gia
                        </div>
                      </div>

                      {removalInfo.approvedAt && (
                        <div className="flex items-center justify-between p-4 rounded-lg border">
                          <div>
                            <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Ngày được duyệt</p>
                            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {formatDate(removalInfo.approvedAt)}
                            </p>
                            {removalInfo.approvedBy && (
                              <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                                Duyệt bởi: {removalInfo.approvedBy.name}
                              </p>
                            )}
                          </div>
                          <div className={`px-3 py-1 rounded-full text-sm font-medium ${isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>
                            Được duyệt
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between p-4 rounded-lg border">
                        <div>
                          <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Ngày bị xóa</p>
                          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {formatDate(removalInfo.removedAt)}
                          </p>
                          {removalInfo.removedBy && (
                            <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                              Xóa bởi: {removalInfo.removedBy.name}
                            </p>
                          )}
                        </div>
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${isDarkMode ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700'}`}>
                          Bị xóa
                        </div>
                      </div>

                      {removalInfo.restoredAt && (
                        <div className="flex items-center justify-between p-4 rounded-lg border">
                          <div>
                            <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Ngày được duyệt lại</p>
                            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {formatDate(removalInfo.restoredAt)}
                            </p>
                            {removalInfo.restoredBy && (
                              <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                                Duyệt lại bởi: {removalInfo.restoredBy.name}
                              </p>
                            )}
                          </div>
                          <div className={`px-3 py-1 rounded-full text-sm font-medium ${isDarkMode ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'}`}>
                            Được duyệt lại
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Duration */}
                  {removalInfo.approvedAt && (
                    <div>
                      <h3 className={`text-lg font-medium mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        Thời gian tham gia
                      </h3>
                      <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700/50 border border-gray-600' : 'bg-gray-50 border border-gray-200'}`}>
                        <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Bạn đã tham gia CLB trong{' '}
                          <span className="font-semibold">
                            {getDuration(removalInfo.approvedAt, removalInfo.removedAt)} ngày
                          </span>
                          {' '}(từ {formatDate(removalInfo.approvedAt)} đến {formatDate(removalInfo.removedAt)})
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Next Steps */}
              {!removalInfo.restoredAt ? (
                <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl border shadow-sm overflow-hidden`}>
                  <div className={`px-6 py-4 border-b ${isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
                    <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Bước tiếp theo
                    </h2>
                  </div>
                  
                  <div className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-start space-x-4">
                        <div className={`p-2 rounded-full ${isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
                          <span className="text-blue-600 text-lg">1</span>
                        </div>
                        <div>
                          <h3 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            Cải thiện các vấn đề
                          </h3>
                          <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            Xem xét và cải thiện các vấn đề đã dẫn đến việc bị xóa khỏi CLB
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-4">
                        <div className={`p-2 rounded-full ${isDarkMode ? 'bg-green-500/20' : 'bg-green-100'}`}>
                          <span className="text-green-600 text-lg">2</span>
                        </div>
                        <div>
                          <h3 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            Đăng ký lại
                          </h3>
                          <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            Sau khi cải thiện, bạn có thể đăng ký lại để tham gia CLB
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-4">
                        <div className={`p-2 rounded-full ${isDarkMode ? 'bg-purple-500/20' : 'bg-purple-100'}`}>
                          <span className="text-purple-600 text-lg">3</span>
                        </div>
                        <div>
                          <h3 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            Chờ duyệt
                          </h3>
                          <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            Đơn đăng ký sẽ được xem xét và duyệt bởi ban quản lý CLB
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-6 border-t">
                      <button
                        onClick={() => router.push('/student/register')}
                        className={`w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2`}
                      >
                        <span>🔄</span>
                        <span>Đăng ký lại ngay</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl border shadow-sm overflow-hidden`}>
                  <div className={`px-6 py-4 border-b ${isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
                    <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Bước tiếp theo
                    </h2>
                  </div>
                  
                  <div className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-start space-x-4">
                        <div className={`p-2 rounded-full ${isDarkMode ? 'bg-green-500/20' : 'bg-green-100'}`}>
                          <span className="text-green-600 text-lg">✅</span>
                        </div>
                        <div>
                          <h3 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            Tài khoản đã được duyệt lại
                          </h3>
                          <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            Bạn có thể tiếp tục tham gia các hoạt động của CLB
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-4">
                        <div className={`p-2 rounded-full ${isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
                          <span className="text-blue-600 text-lg">🎯</span>
                        </div>
                        <div>
                          <h3 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            Quản lý hoạt động
                          </h3>
                          <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            Truy cập vào các chức năng quản lý hoạt động và thành viên
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-4">
                        <div className={`p-2 rounded-full ${isDarkMode ? 'bg-purple-500/20' : 'bg-purple-100'}`}>
                          <span className="text-purple-600 text-lg">⭐</span>
                        </div>
                        <div>
                          <h3 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            Hỗ trợ thành viên
                          </h3>
                          <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            Hỗ trợ và hướng dẫn các thành viên khác trong CLB
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-6 border-t">
                      <button
                        onClick={() => router.push('/officer/dashboard')}
                        className={`w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2`}
                      >
                        <span>🏠</span>
                        <span>Về trang chủ</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </main>

          <Footer />
        </div></ProtectedRoute>
  );
}
