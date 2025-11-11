'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import AdminNav from '@/components/admin/AdminNav';
import Footer from '@/components/common/Footer';
import { useDarkMode } from '@/hooks/useDarkMode';

interface Notification {
  _id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  createdAt: string;
  userId: {
    _id: string;
    name: string;
    studentId: string;
    email: string;
  };
  createdBy?: {
    _id: string;
    name: string;
    studentId: string;
  };
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export default function SentNotificationsPage() {
  const { user } = useAuth();
  const { isDarkMode } = useDarkMode();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Load sidebar state
  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  useEffect(() => {
    const savedState = localStorage.getItem('sidebarOpen');
    if (savedState !== null) {
      setIsSidebarOpen(savedState === 'true');
    }

    const handleSidebarChange = (event: CustomEvent<{ isOpen: boolean }>) => {
      setIsSidebarOpen(event.detail.isOpen);
    };

    window.addEventListener('sidebarStateChange', handleSidebarChange as EventListener);
    
    const interval = setInterval(() => {
      const currentState = localStorage.getItem('sidebarOpen');
      if (currentState !== null) {
        const isOpen = currentState === 'true';
        if (isOpen !== isSidebarOpen) {
          setIsSidebarOpen(isOpen);
        }
      }
    }, 100);

    return () => {
      window.removeEventListener('sidebarStateChange', handleSidebarChange as EventListener);
      clearInterval(interval);
    };
  }, [isSidebarOpen]);

  // Load notifications
  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user, currentPage]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/notifications/sent?page=${currentPage}&limit=20`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setNotifications(data.data.notifications || []);
          setPagination(data.data.pagination || null);
        }
      } else {
        setError('Không thể tải thông báo đã gửi');
      }
    } catch (error) {
      console.error('Error loading sent notifications:', error);
      setError('Đã xảy ra lỗi khi tải thông báo đã gửi');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    if (days < 7) return `${days} ngày trước`;
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return 'ℹ️';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success':
        return isDarkMode ? 'bg-green-500/20 border-green-500/30 text-green-300' : 'bg-green-100 border-green-200 text-green-700';
      case 'warning':
        return isDarkMode ? 'bg-yellow-500/20 border-yellow-500/30 text-yellow-300' : 'bg-yellow-100 border-yellow-200 text-yellow-700';
      case 'error':
        return isDarkMode ? 'bg-red-500/20 border-red-500/30 text-red-300' : 'bg-red-100 border-red-200 text-red-700';
      default:
        return isDarkMode ? 'bg-blue-500/20 border-blue-500/30 text-blue-300' : 'bg-blue-100 border-blue-200 text-blue-700';
    }
  };

  // Check if user has permission
  const allowedRoles = ['STUDENT', 'CLUB_STUDENT'];
  const hasPermission = user && !allowedRoles.includes(user.role || '');

  if (!hasPermission && user) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className={`text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          <h1 className="text-2xl font-bold mb-2">Không có quyền truy cập</h1>
          <p className="text-gray-500">Bạn không có quyền xem trang này.</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute requiredRole="CLUB_LEADER">
      <div className={`min-h-screen flex flex-col ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <AdminNav key="admin-nav" />
        
        <main 
          className={`flex-1 transition-all duration-300 ${isDesktop ? (isSidebarOpen ? 'ml-64' : 'ml-20') : 'ml-0'}`}
          style={{
            marginLeft: isDesktop ? (isSidebarOpen ? '16rem' : '5rem') : '0',
            width: isDesktop ? (isSidebarOpen ? 'calc(100% - 16rem)' : 'calc(100% - 5rem)') : '100%',
            maxWidth: isDesktop ? (isSidebarOpen ? 'calc(100% - 16rem)' : 'calc(100% - 5rem)') : '100%',
            minWidth: 0
          }}
        >
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8 w-full">
            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg`}>
              {/* Header */}
              <div className={`px-6 py-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      📤 Thông Báo Đã Gửi
                    </h1>
                    <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Xem tất cả thông báo bạn đã gửi
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <a
                      href="/admin/notifications/send"
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${isDarkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
                    >
                      ➕ Gửi thông báo mới
                    </a>
                    <a
                      href="/admin/notifications"
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                    >
                      📥 Thông báo nhận được
                    </a>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className={`mt-4 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Đang tải thông báo...
                    </p>
                  </div>
                ) : error ? (
                  <div className={`text-center py-12 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                    <p>{error}</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="text-center py-12">
                    <div className={`text-6xl mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`}>
                      📭
                    </div>
                    <p className={`text-lg font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Chưa có thông báo nào được gửi
                    </p>
                    <p className={`text-sm mt-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                      Bắt đầu gửi thông báo để quản lý và theo dõi
                    </p>
                    <a
                      href="/admin/notifications/send"
                      className={`inline-block mt-4 px-6 py-2 rounded-lg text-sm font-medium transition-all ${isDarkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
                    >
                      ➕ Gửi thông báo đầu tiên
                    </a>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      {notifications.map((notification) => (
                        <div
                          key={notification._id}
                          className={`p-4 rounded-xl border transition-all duration-200 ${
                            isDarkMode
                              ? 'bg-gray-700/30 border-gray-600 hover:bg-gray-700/50'
                              : 'bg-white border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            {/* Icon */}
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border ${getTypeColor(notification.type)}`}>
                              <span className="text-xl">{getTypeIcon(notification.type)}</span>
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <h3 className={`text-base font-semibold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                    {notification.title}
                                  </h3>
                                  <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} line-clamp-2 mb-3`}>
                                    {notification.message}
                                  </p>
                                  
                                  {/* Người nhận - Highlighted */}
                                  <div className={`mt-3 p-3 rounded-lg ${isDarkMode ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-100'}`}>
                                    <div className="flex items-center gap-2">
                                      <svg className={`w-4 h-4 flex-shrink-0 ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                      </svg>
                                      <div className="flex-1 min-w-0">
                                        <span className={`text-xs font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                                          Đã gửi cho:
                                        </span>
                                        <div className={`text-sm font-semibold mt-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                          {notification.userId.name}
                                        </div>
                                        <div className={`text-xs mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                          {notification.userId.studentId}
                                          {notification.userId.email && (
                                            <span className="ml-2">• {notification.userId.email}</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-between mt-3">
                                <div className="flex items-center gap-4 text-xs flex-wrap">
                                  <span className={`flex items-center gap-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {formatDate(notification.createdAt)}
                                  </span>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${notification.isRead ? (isDarkMode ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-green-100 text-green-700 border border-green-200') : (isDarkMode ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' : 'bg-yellow-100 text-yellow-700 border border-yellow-200')}`}>
                                    {notification.isRead ? '✓ Đã đọc' : '● Chưa đọc'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Pagination */}
                    {pagination && pagination.totalPages > 1 && (
                      <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                        <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Trang {pagination.currentPage} / {pagination.totalPages} ({pagination.totalCount} thông báo)
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={!pagination.hasPrevPage}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              pagination.hasPrevPage
                                ? isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                                : isDarkMode ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            ← Trước
                          </button>
                          <button
                            onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                            disabled={!pagination.hasNextPage}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              pagination.hasNextPage
                                ? isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                                : isDarkMode ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            Sau →
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </main>
        
        <Footer />
      </div>
    </ProtectedRoute>
  );
}

