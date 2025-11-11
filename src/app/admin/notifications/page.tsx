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
  readAt?: string;
  relatedType?: string;
  relatedId?: string;
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

export default function NotificationsPage() {
  const { user } = useAuth();
  const { isDarkMode } = useDarkMode();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [unreadCount, setUnreadCount] = useState(0);

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
      loadUnreadCount();
    }
  }, [user, filter, currentPage]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      if (!token) return;

      const unreadOnly = filter === 'unread';
      const response = await fetch(`/api/notifications?page=${currentPage}&limit=20&unreadOnly=${unreadOnly}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          // Log để debug
          console.log('Notifications data:', data.data.notifications);
          if (data.data.notifications && data.data.notifications.length > 0) {
            console.log('First notification createdBy:', data.data.notifications[0].createdBy);
          }
          setNotifications(data.data.notifications || []);
          setPagination(data.data.pagination || null);
        }
      } else {
        setError('Không thể tải thông báo');
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      setError('Đã xảy ra lỗi khi tải thông báo');
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/notifications/unread-count', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUnreadCount(data.data.count);
        }
      }
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        // Reload notifications
        loadNotifications();
        loadUnreadCount();
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/notifications/read-all', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        // Reload notifications
        loadNotifications();
        loadUnreadCount();
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
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
      case 'success': return isDarkMode ? 'bg-green-500/20 text-green-300 border-green-500/30' : 'bg-green-100 text-green-700 border-green-200';
      case 'warning': return isDarkMode ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' : 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'error': return isDarkMode ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-red-100 text-red-700 border-red-200';
      default: return isDarkMode ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 'bg-blue-100 text-blue-700 border-blue-200';
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

  // Check if user has permission
  const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'CLUB_LEADER', 'CLUB_DEPUTY', 'CLUB_MEMBER'];
  const hasPermission = user && allowedRoles.includes(user.role || '');

  if (!hasPermission && user) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className={`text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          <h1 className="text-2xl font-bold mb-2">Không có quyền truy cập</h1>
          <p className="text-gray-500">Bạn không có quyền xem trang này.</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute requiredRole="CLUB_LEADER">
      <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} overflow-x-hidden`}>
        <AdminNav />
        
        <main 
          className={`transition-all duration-300 ${isDesktop ? (isSidebarOpen ? 'ml-64' : 'ml-20') : 'ml-0'}`}
          style={{
            marginLeft: isDesktop ? (isSidebarOpen ? '16rem' : '5rem') : '0',
            width: isDesktop ? (isSidebarOpen ? 'calc(100% - 16rem)' : 'calc(100% - 5rem)') : '100%',
            maxWidth: isDesktop ? (isSidebarOpen ? 'calc(100% - 16rem)' : 'calc(100% - 5rem)') : '100%',
            minWidth: 0
          }}
        >
          <div className="p-6">
            <div className={`max-w-6xl mx-auto ${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg`}>
              {/* Header */}
              <div className={`px-6 py-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    📢 Thông Báo
                  </h1>
                  <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : 'Tất cả thông báo đã được đọc'}
                  </p>
                </div>
                
                <div className="flex items-center gap-3 flex-wrap">
                  <a
                    href="/admin/notifications/sent"
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${isDarkMode ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-green-500 hover:bg-green-600 text-white'}`}
                  >
                    📤 Thông báo đã gửi
                  </a>
                    {/* Gửi thông báo mới button */}
                    <a
                      href="/admin/notifications/send"
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                        isDarkMode
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg'
                          : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-md hover:shadow-lg'
                      }`}
                    >
                      <span>➕</span>
                      <span>Gửi thông báo mới</span>
                    </a>

                    {/* Filter Buttons */}
                    <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                      {(['all', 'unread', 'read'] as const).map((f) => (
                        <button
                          key={f}
                          onClick={() => {
                            setFilter(f);
                            setCurrentPage(1);
                          }}
                          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                            filter === f
                              ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                          }`}
                        >
                          {f === 'all' ? 'Tất cả' : f === 'unread' ? 'Chưa đọc' : 'Đã đọc'}
                        </button>
                      ))}
                    </div>

                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          isDarkMode
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : 'bg-blue-500 hover:bg-blue-600 text-white'
                        }`}
                      >
                        Đánh dấu tất cả đã đọc
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                {loading ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
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
                    <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      <span className="text-3xl">📭</span>
                    </div>
                    <p className={`text-lg font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {filter === 'unread' ? 'Không có thông báo chưa đọc' : filter === 'read' ? 'Không có thông báo đã đọc' : 'Không có thông báo nào'}
                    </p>
                    <p className={`text-sm mt-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                      {filter === 'all' && 'Tất cả thông báo sẽ hiển thị ở đây'}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      {notifications.map((notification) => (
                        <div
                          key={notification._id}
                          className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer hover:shadow-md ${
                            !notification.isRead
                              ? isDarkMode
                                ? 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/15'
                                : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                              : isDarkMode
                              ? 'bg-gray-700/30 border-gray-600 hover:bg-gray-700/50'
                              : 'bg-white border-gray-200 hover:bg-gray-50'
                          }`}
                          onClick={() => !notification.isRead && markAsRead(notification._id)}
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
                                  <h3 className={`text-base font-semibold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'} ${!notification.isRead ? 'font-bold' : ''}`}>
                                    {notification.title}
                                  </h3>
                                  <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} line-clamp-2`}>
                                    {notification.message}
                                  </p>
                                </div>
                                
                                {!notification.isRead && (
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                                    isDarkMode ? 'bg-blue-500 text-white' : 'bg-blue-500 text-white'
                                  }`}>
                                    Mới
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center justify-between mt-3">
                                <div className="flex items-center gap-4 text-xs flex-wrap">
                                  <span className={`flex items-center gap-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {formatDate(notification.createdAt)}
                                  </span>
                                  {notification.createdBy && typeof notification.createdBy === 'object' && notification.createdBy.name ? (
                                    <span className={`flex items-center gap-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                      </svg>
                                      <span className="font-medium">Người gửi:</span>
                                      <span>{notification.createdBy.name || 'Không xác định'}</span>
                                      {notification.createdBy.studentId && (
                                        <span className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>
                                          ({notification.createdBy.studentId})
                                        </span>
                                      )}
                                    </span>
                                  ) : (
                                    <span className={`flex items-center gap-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      Hệ thống
                                    </span>
                                  )}
                                </div>
                                
                                {notification.relatedType && notification.relatedId && (
                                  <a
                                    href={`/admin/${notification.relatedType}s/${notification.relatedId}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className={`text-xs font-medium ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                                  >
                                    Xem chi tiết →
                                  </a>
                                )}
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
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={!pagination.hasPrevPage}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              pagination.hasPrevPage
                                ? isDarkMode
                                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                                  : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'
                                : 'opacity-50 cursor-not-allowed'
                            }`}
                          >
                            Trước
                          </button>
                          <button
                            onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                            disabled={!pagination.hasNextPage}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              pagination.hasNextPage
                                ? isDarkMode
                                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                                  : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'
                                : 'opacity-50 cursor-not-allowed'
                            }`}
                          >
                            Sau
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

