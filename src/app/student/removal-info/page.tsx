'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import StudentNav from '@/components/student/StudentNav';
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
  status: 'REMOVED' | 'ACTIVE';
  removedAt: string;
  removedBy?: {
    _id: string;
    name: string;
    studentId: string;
  };
  removalReason?: string;
  removalReasonTrue?: string;
  joinedAt: string;
  createdAt: string;
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
  // Removal history
  removalHistory?: Array<{
    removedAt: string;
    removedBy: {
      _id: string;
      name: string;
      studentId: string;
    };
    removalReason: string;
    restoredAt?: string;
    restoredBy?: string;
    restorationReason?: string;
  }>;
}

export default function RemovalInfoPage() {
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

    // Listen for theme changes from StudentNav
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

      console.log('🔍 Making API call to /api/memberships/my-status');
      const response = await fetch('/api/memberships/my-status', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📡 API Response status:', response.status);

                   if (response.ok) {
        const data = await response.json();
        console.log('API Response:', data); // Debug log
        
        if (data.success && data.data && data.data.membership) {
          const membership = data.data.membership;
          console.log('Membership data:', {
            status: membership.status,
            removedAt: membership.removedAt,
            removalReason: membership.removalReason,
            removalReasonTrue: membership.removalReasonTrue,
            restorationReason: membership.restorationReason,
            restoredAt: membership.restoredAt,
            restoredBy: membership.restoredBy,
            removalHistory: membership.removalHistory
          });
          
          // Logic đơn giản: Hiển thị trang này cho tất cả user có membership
          // Đặc biệt là user có status REMOVED hoặc có thông tin bị xóa
          console.log('Checking conditions:');
          console.log('- Status:', membership.status);
          console.log('- Status === REMOVED:', membership.status === 'REMOVED');
          console.log('- removalReason:', membership.removalReason);
          console.log('- removalReasonTrue:', membership.removalReasonTrue);
          console.log('- removedAt:', membership.removedAt);
          console.log('- removalHistory length:', membership.removalHistory?.length || 0);
          
          if (membership.status === 'REMOVED') {
            // User đang bị xóa - luôn hiển thị
            console.log('✅ Condition 1: Status is REMOVED - showing page');
            setRemovalInfo(membership);
          } else if (membership.status === 'ACTIVE' && 
                     (membership.removedAt || membership.removalReason || membership.removalReasonTrue || 
                      (membership.removalHistory && membership.removalHistory.length > 0))) {
            // User đã được duyệt lại nhưng có lịch sử bị xóa
            console.log('✅ Condition 2: ACTIVE with removal info - showing page');
            setRemovalInfo(membership);
          } else if (membership.removalHistory && membership.removalHistory.length > 0) {
            // Có lịch sử bị xóa dù status là gì
            console.log('✅ Condition 3: Has removal history - showing page');
            setRemovalInfo(membership);
          } else {
            console.log('❌ No conditions met - showing error');
            console.log('Debug info:');
            console.log('  - Status:', membership.status);
            console.log('  - removedAt:', membership.removedAt);
            console.log('  - removalReason:', membership.removalReason);
            console.log('  - removalReasonTrue:', membership.removalReasonTrue);
            console.log('  - removalHistory:', membership.removalHistory);
            setError('Bạn chưa bị xóa khỏi CLB. Trang này chỉ dành cho thành viên đã từng bị xóa.');
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
      setError('Có lỗi khi tải thông tin');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime()) || date.getTime() === 0) {
        return 'Không có thông tin';
      }
      return date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting date:', dateString, error);
      return 'Không có thông tin';
    }
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
      <ProtectedRoute requiredRole="STUDENT">
        <div className={`min-h-screen flex flex-col transition-colors duration-200 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
            <StudentNav key="student-nav" />
            <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className={`mt-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Đang tải thông tin...</p>
              </div>
            </main>
            <Footer />
          </div></ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute requiredRole="STUDENT">
        <div className={`min-h-screen flex flex-col transition-colors duration-200 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
            <StudentNav key="student-nav" />
            <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="text-center">
                <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-red-500/20' : 'bg-red-100'}`}>
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className={`text-xl font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Không thể tải thông tin</h2>
                <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{error}</p>
                <button
                  onClick={() => router.push('/student/dashboard')}
                  className={`mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors`}
                >
                  Quay về Dashboard
                </button>
              </div>
            </main>
            <Footer />
          </div></ProtectedRoute>
    );
  }

  if (!removalInfo) {
    return (
      <ProtectedRoute requiredRole="STUDENT">
        <div className={`min-h-screen flex flex-col transition-colors duration-200 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
            <StudentNav key="student-nav" />
            <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="text-center">
                <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h2 className={`text-xl font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Không tìm thấy thông tin</h2>
                <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Bạn chưa bị xóa khỏi CLB hoặc thông tin không có sẵn.</p>
                <button
                  onClick={() => router.push('/student/dashboard')}
                  className={`mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors`}
                >
                  Quay về Dashboard
                </button>
              </div>
            </main>
            <Footer />
          </div></ProtectedRoute>
    );
  }



  return (
    <ProtectedRoute requiredRole="STUDENT">
      <div className={`min-h-screen flex flex-col transition-colors duration-200 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
          <StudentNav key="student-nav" />
          
          <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {removalInfo.status === 'ACTIVE' ? 'Thông tin duyệt lại CLB' : 'Thông tin bị xóa khỏi CLB'}
                  </h1>
                  <p className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    {removalInfo.status === 'ACTIVE'
                      ? 'Chi tiết về việc tài khoản được duyệt lại vào CLB Sinh viên 5 Tốt TDMU'
                      : 'Chi tiết về việc tài khoản bị xóa khỏi CLB Sinh viên 5 Tốt TDMU'
                    }
                  </p>
                </div>
                                <div className="flex space-x-3">
                  {removalInfo.status === 'REMOVED' && (
                    <button
                      onClick={() => router.push('/student/register')}
                      className={`px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2`}
                    >
                      <span>🔄</span>
                      <span>Đăng ký lại</span>
                    </button>
                  )}
                  <button
                    onClick={() => router.push('/student/dashboard')}
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
              {removalInfo.status === 'ACTIVE' ? (
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
                  {/* Reason - Show removal reason for REMOVED status */}
                  {removalInfo.status === 'REMOVED' && removalInfo.removalReason && (
                    <div>
                      <h3 className={`text-lg font-medium mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        Lý do bị xóa
                      </h3>
                      <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700/50 border border-gray-600' : 'bg-red-50 border border-red-200'}`}>
                        <p className={`${isDarkMode ? 'text-gray-300' : 'text-red-900'}`}>
                                                          {removalInfo.removalReasonTrue || removalInfo.removalReason}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Restoration Reason - Show for ACTIVE status (đã được duyệt lại) */}
                  {removalInfo.status === 'ACTIVE' && removalInfo.restorationReason && (
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
                      {/* Create timeline events and sort them by date */}
                      {(() => {
                        const timelineEvents = [];
                        
                        // 1. Ngày đăng ký CLB (từ createdAt)
                        timelineEvents.push({
                          type: 'registered',
                          date: removalInfo.createdAt,
                          title: 'Ngày đăng ký CLB',
                          description: formatDate(removalInfo.createdAt),
                          badge: 'Đăng ký',
                          badgeColor: 'gray'
                        });
                        
                        // 2. Ngày được duyệt đăng ký đầu tiên (từ approvedAt)
                        // Luôn hiển thị ngày được duyệt đầu tiên
                        if (removalInfo.approvedAt) {
                          timelineEvents.push({
                            type: 'approved',
                            date: removalInfo.approvedAt,
                            title: 'Ngày được duyệt đăng ký đầu tiên',
                            description: formatDate(removalInfo.approvedAt),
                            subDescription: removalInfo.approvedBy ? `Duyệt bởi: ${removalInfo.approvedBy.name}` : null,
                            badge: 'Được duyệt lần đầu',
                            badgeColor: 'blue'
                          });
                        }
                        
                        // 3. Ngày tham gia CLB (từ approvedAt - ngày được duyệt đầu tiên)
                        // Ngày tham gia CLB chính là ngày được duyệt đầu tiên
                        if (removalInfo.approvedAt) {
                          timelineEvents.push({
                            type: 'joined',
                            date: removalInfo.approvedAt,
                            title: 'Ngày tham gia CLB',
                            description: formatDate(removalInfo.approvedAt),
                            badge: 'Tham gia',
                            badgeColor: 'green'
                          });
                        }
                        
                        // 4. Xử lý lịch sử xóa/duyệt lại từ removalHistory
                        const hasRemovalHistory = removalInfo.removalHistory && removalInfo.removalHistory.length > 0;
                        
                        if (hasRemovalHistory) {
                          // Loại bỏ các entries trùng lặp dựa trên removedAt (trong vòng 1 giây)
                          // Ưu tiên giữ lại entry có thông tin duyệt lại
                          const uniqueHistory = removalInfo.removalHistory!.reduce<Array<{
                            removedAt: string;
                            removedBy: {
                              _id: string;
                              name: string;
                              studentId: string;
                            };
                            removalReason: string;
                            restoredAt?: string;
                            restoredBy?: string;
                            restorationReason?: string;
                          }>>((acc, history) => {
                            const existingIndex = acc.findIndex(h => 
                              Math.abs(new Date(h.removedAt).getTime() - new Date(history.removedAt).getTime()) < 1000
                            );
                            
                            if (existingIndex === -1) {
                              // Không tìm thấy entry trùng lặp, thêm vào
                              acc.push(history);
                            } else {
                              // Tìm thấy entry trùng lặp, kiểm tra xem có thông tin duyệt lại không
                              const existing = acc[existingIndex];
                              const hasRestorationInfo = history.restoredAt && history.restorationReason;
                              const existingHasRestorationInfo = existing.restoredAt && existing.restorationReason;
                              
                              // Nếu entry mới có thông tin duyệt lại mà entry cũ không có, thay thế
                              if (hasRestorationInfo && !existingHasRestorationInfo) {
                                acc[existingIndex] = history;
                              }
                              // Nếu cả hai đều có hoặc đều không có thông tin duyệt lại, giữ lại entry đầu tiên
                            }
                            return acc;
                          }, []);

                          // Có lịch sử - hiển thị từ uniqueHistory
                          uniqueHistory.forEach((history, index) => {
                            const removalNumber = index + 1;
                            
                            // Add removal event
                            timelineEvents.push({
                              type: 'removed',
                              date: history.removedAt,
                              title: `Thời gian xóa lần thứ ${removalNumber}`,
                              description: `${formatDate(history.removedAt)} - ${history.removalReason}`,
                              subDescription: `Xóa bởi: ${history.removedBy.name} (${history.removedBy.studentId})`,
                              badge: `Bị xóa lần ${removalNumber}`,
                              badgeColor: 'red'
                            });
                            
                            // Add restoration event if exists
                            if (history.restoredAt && history.restorationReason) {
                              timelineEvents.push({
                                type: 'restored',
                                date: history.restoredAt,
                                title: `Thời gian duyệt lại sau lần xóa thứ ${removalNumber}`,
                                description: `${formatDate(history.restoredAt)} - ${history.restorationReason}`,
                                subDescription: `Duyệt lại bởi: Admin Hệ thống`,
                                badge: `Được duyệt lại lần ${removalNumber}`,
                                badgeColor: 'purple'
                              });
                            }
                          });
                        } else {
                          // Không có lịch sử - sử dụng fallback logic (backward compatibility)
                          const hasRemovalInfo = removalInfo.removedAt && removalInfo.removalReason;
                          const hasRestorationInfo = removalInfo.restoredAt && removalInfo.restorationReason;
                          
                          if (hasRemovalInfo && removalInfo.removedAt && removalInfo.removalReason) {
                            const removedDate = new Date(removalInfo.removedAt);
                            const isValidRemovedDate = !isNaN(removedDate.getTime()) && removedDate.getTime() > 0;
                            
                            if (isValidRemovedDate) {
                              timelineEvents.push({
                                type: 'removed',
                                date: removalInfo.removedAt,
                                title: 'Thời gian xóa lần đầu',
                                description: `${formatDate(removalInfo.removedAt)} - ${removalInfo.removalReason}`,
                                subDescription: removalInfo.removedBy ? 
                                  `Xóa bởi: ${removalInfo.removedBy.name} (${removalInfo.removedBy.studentId})` : 
                                  null,
                                badge: 'Bị xóa lần đầu',
                                badgeColor: 'red'
                              });
                            }
                          }
                          
                          if (hasRestorationInfo && removalInfo.restoredAt && removalInfo.restorationReason) {
                            const restorationDate = new Date(removalInfo.restoredAt);
                            const isValidRestorationDate = !isNaN(restorationDate.getTime()) && restorationDate.getTime() > 0;
                            
                            if (isValidRestorationDate) {
                              timelineEvents.push({
                                type: 'restored',
                                date: removalInfo.restoredAt,
                                title: 'Thời gian duyệt lại sau lần xóa đầu tiên',
                                description: `${formatDate(removalInfo.restoredAt)} - ${removalInfo.restorationReason}`,
                                subDescription: removalInfo.restoredBy ? 
                                  `Duyệt lại bởi: ${removalInfo.restoredBy.name} (${removalInfo.restoredBy.studentId})` : 
                                  null,
                                badge: 'Được duyệt lại lần đầu',
                                badgeColor: 'purple'
                              });
                            }
                          }
                        }
                        
                        // Sort events by actual chronological order (thời gian thực tế)
                        timelineEvents.sort((a, b) => {
                          return new Date(a.date).getTime() - new Date(b.date).getTime();
                        });
                        
                        // Debug: Log timeline events để kiểm tra
                        console.log('Timeline events:', timelineEvents.map(e => ({
                          type: e.type,
                          title: e.title,
                          date: e.date,
                          badge: e.badge
                        })));
                        
                        return timelineEvents.map((event, index) => (
                          <div key={index} className="flex items-center justify-between p-4 rounded-lg border">
                            <div>
                              <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                {event.title}
                              </p>
                              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                {event.description}
                              </p>
                              {event.subDescription && (
                                <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                                  {event.subDescription}
                                </p>
                              )}
                            </div>
                                                         <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                               event.badgeColor === 'green' 
                                 ? (isDarkMode ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700')
                                 : event.badgeColor === 'blue'
                                 ? (isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700')
                                 : event.badgeColor === 'purple'
                                 ? (isDarkMode ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-700')
                                 : event.badgeColor === 'gray'
                                 ? (isDarkMode ? 'bg-gray-500/20 text-gray-400' : 'bg-gray-100 text-gray-700')
                                 : (isDarkMode ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700')
                             }`}>
                              {event.badge}
                            </div>
                          </div>
                        ));
                      })()}
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
              {removalInfo.status === 'REMOVED' ? (
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
                            Tham gia hoạt động
                          </h3>
                          <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            Truy cập vào các hoạt động và sự kiện của CLB
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-4">
                        <div className={`p-2 rounded-full ${isDarkMode ? 'bg-purple-500/20' : 'bg-purple-100'}`}>
                          <span className="text-purple-600 text-lg">⭐</span>
                        </div>
                        <div>
                          <h3 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            Tích lũy điểm
                          </h3>
                          <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            Tham gia hoạt động để tích lũy điểm và nâng cao kỹ năng
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-6 border-t">
                      <button
                        onClick={() => router.push('/student/dashboard')}
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
