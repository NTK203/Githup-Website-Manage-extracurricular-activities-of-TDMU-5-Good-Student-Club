'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, usePathname } from 'next/navigation';

export default function OfficerNav() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [showClubDropdown, setShowClubDropdown] = useState(false);
  const [showMobileClubDropdown, setShowMobileClubDropdown] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [membershipStatus, setMembershipStatus] = useState<'PENDING' | 'ACTIVE' | 'REJECTED' | 'REMOVED' | 'removed' | null>(null);
  const [restorationInfo, setRestorationInfo] = useState<{
    restoredAt?: string;
    restoredBy?: { name: string; studentId: string };
    restorationReason?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false);
  const [showRestorationBanner, setShowRestorationBanner] = useState(false);

  // Load theme from localStorage on component mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.notification-dropdown') && !target.closest('.profile-dropdown') && !target.closest('.club-dropdown')) {
        setShowNotificationDropdown(false);
        setShowProfileDropdown(false);
        setShowClubDropdown(false);
        setShowMobileClubDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Toggle dark mode function
  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }

    // Emit custom event for other components to listen
    window.dispatchEvent(new CustomEvent('themeChange'));
  };

  // Load notifications and check membership status
  useEffect(() => {
    if (user) {
      loadNotifications();
      loadUnreadCount();
      
      // Check membership status (but redirect logic will check if on notifications page)
      checkMembershipStatus();
      
      // Poll for new notifications every 30 seconds
      const notificationInterval = setInterval(() => {
        loadUnreadCount();
        // Only reload full list if dropdown is open
        if (showNotificationDropdown) {
          loadNotifications();
        }
      }, 30000);
      
      return () => clearInterval(notificationInterval);
    }
  }, [user, showNotificationDropdown]);

  const checkMembershipStatus = async () => {
    if (!user?._id) {
      return;
    }
    
    try {
      setLoading(true);
      
      const response = await fetch(`/api/auth/check-status`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.success) {
          const { membership, shouldRedirect, redirectUrl } = data.data;
          
          if (membership) {
            setMembershipStatus(membership.status);
            
            // Set restoration info only if membership is ACTIVE and has restoration data (meaning it was restored)
            if (membership.status === 'ACTIVE' && 
                (membership.restoredAt || membership.restoredBy || membership.restorationReason)) {
              setRestorationInfo({
                restoredAt: membership.restoredAt,
                restoredBy: membership.restoredBy,
                restorationReason: membership.restorationReason
              });
              // Show banner for 30 seconds
              setShowRestorationBanner(true);
              setTimeout(() => setShowRestorationBanner(false), 30000);
            } else {
              setRestorationInfo(null);
              setShowRestorationBanner(false);
            }
            
            // If should redirect, redirect to appropriate dashboard
            // Only redirect if user is NOT already on an officer/admin page
            if (shouldRedirect && redirectUrl && !hasRedirected) {
              const currentPath = window.location.pathname;
              // Don't redirect if already on officer/admin pages (allow navigation between officer pages)
              const isOnOfficerPage = currentPath.startsWith('/officer/');
              const isOnAdminPage = currentPath.startsWith('/admin/');
              const isOnTargetPage = currentPath === redirectUrl;
              const isOnNotificationsPage = currentPath.includes('/notifications');
              
              // Only redirect if not on officer/admin pages already and not already on target
              // Also don't redirect if on notifications page
              if (!isOnOfficerPage && !isOnAdminPage && !isOnTargetPage && !isOnNotificationsPage) {
                setHasRedirected(true);
                router.push(redirectUrl);
              }
              return;
            }
            
            // Special case: CLUB_LEADER should always go to admin dashboard
            // Only redirect if NOT already on admin/officer pages
            if (membership && membership.status === 'ACTIVE' && user?.role === 'CLUB_LEADER' && !hasRedirected) {
              const currentPath = window.location.pathname;
              const isOnNotificationsPage = currentPath.includes('/notifications');
              // Don't redirect if already on officer pages (allow navigation between officer pages)
              // Also don't redirect if on notifications page
              if (!currentPath.startsWith('/admin/') && !currentPath.startsWith('/officer/') && !isOnNotificationsPage) {
                setHasRedirected(true);
                router.push('/admin/dashboard');
                return;
              }
            }
            
            // If membership is REMOVED, redirect to student dashboard
            if (membership && membership.status === 'REMOVED' && !hasRedirected) {
              const currentPath = window.location.pathname;
              const isOnNotificationsPage = currentPath.includes('/notifications');
              if (!currentPath.startsWith('/student/') && !isOnNotificationsPage) {
                setHasRedirected(true);
                router.push('/student/dashboard');
                return;
              }
            }
          } else {
            setMembershipStatus(null);
            setRestorationInfo(null);
          }
        }
      } else {
        console.error('Failed to check user status');
        setMembershipStatus(null);
      }
    } catch (error) {
      console.error('Error checking user status:', error);
      setMembershipStatus(null);
    } finally {
      setLoading(false);
    }
  };

  const loadNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // Fetch notifications
      const response = await fetch('/api/notifications?limit=20', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.notifications) {
          // Transform API response to match component format
          const transformedNotifications = data.data.notifications.map((notif: any) => ({
            id: notif._id,
            title: notif.title,
            message: notif.message,
            type: notif.type,
            isRead: notif.isRead,
            createdAt: new Date(notif.createdAt),
            relatedType: notif.relatedType,
            relatedId: notif.relatedId,
            createdBy: notif.createdBy ? {
              _id: notif.createdBy._id || notif.createdBy,
              name: notif.createdBy.name || 'Hệ thống',
              studentId: notif.createdBy.studentId
            } : null
          }));
          
          setNotifications(transformedNotifications);
          setUnreadCount(transformedNotifications.filter((n: any) => !n.isRead).length);
        }
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
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
        const data = await response.json();
        if (data.success) {
          // Update local state
          setNotifications(prev => 
            prev.map(notification => 
              notification.id === notificationId 
                ? { ...notification, isRead: true }
                : notification
            )
          );
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
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
        const data = await response.json();
        if (data.success) {
          // Update local state
          setNotifications(prev => 
            prev.map(notification => ({ ...notification, isRead: true }))
          );
          setUnreadCount(0);
        }
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Helper function to get role display info
  const getRoleDisplay = (role: string | undefined) => {
    const roleConfig = {
      SUPER_ADMIN: { 
        name: 'Quản Trị Hệ Thống', 
        color: isDarkMode ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-700',
        dotColor: 'bg-purple-500'
      },
      CLUB_LEADER: { 
        name: 'Chủ Nhiệm CLB', 
        color: isDarkMode ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700',
        dotColor: 'bg-red-500'
      },
      CLUB_DEPUTY: { 
        name: 'Phó Chủ Nhiệm', 
        color: isDarkMode ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-700',
        dotColor: 'bg-orange-500'
      },
      CLUB_MEMBER: { 
        name: 'Ủy Viên BCH', 
        color: isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700',
        dotColor: 'bg-blue-500'
      },
      CLUB_STUDENT: { 
        name: 'Thành Viên CLB', 
        color: isDarkMode ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700',
        dotColor: 'bg-green-500'
      },
      STUDENT: { 
        name: 'Sinh Viên', 
        color: isDarkMode ? 'bg-gray-500/20 text-gray-400' : 'bg-gray-100 text-gray-700',
        dotColor: 'bg-gray-500'
      }
    };
    
    return roleConfig[role as keyof typeof roleConfig] || { 
      name: 'Quản trị viên', 
      color: isDarkMode ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700',
      dotColor: 'bg-green-500'
    };
  };

  interface MenuItem {
    name: string;
    href?: string;
    icon: string;
    isDropdown?: boolean;
    children?: { name: string; href: string; icon: string }[];
  }

  const menuItems: MenuItem[] = [
    { name: 'Dashboard', href: '/officer/dashboard', icon: '🏠' },
    { name: 'Quản lý hoạt động', href: '/officer/activities', icon: '🎯' },
    { name: 'Quản lý người tham gia', href: '/officer/participants', icon: '👥' },
    { name: 'Danh sách sinh viên', href: '/officer/students', icon: '👥' },
    { name: 'Điểm danh', href: '/officer/attendance', icon: '✅' },
    { name: 'Báo cáo', href: '/officer/reports', icon: '📊' },
    { name: 'Thông báo', href: '/officer/notifications', icon: '📢' },
  ];

  // Add CLB dropdown menu item if user has removal/restoration info
  if (membershipStatus === 'REMOVED' || membershipStatus === 'removed' || restorationInfo) {
    const clubMenuItem: MenuItem = {
      name: 'CLB',
      icon: '🏛️',
      isDropdown: true,
      children: []
    };

    if (membershipStatus === 'REMOVED' || membershipStatus === 'removed') {
      if (restorationInfo && restorationInfo.restoredAt) {
        // User has been restored
        clubMenuItem.children!.push({
          name: 'Thông tin duyệt lại',
          href: '/officer/removal-info',
          icon: '✅'
        });
      } else {
        // User is removed but not restored
        clubMenuItem.children!.push({
          name: 'Thông tin bị xóa & Đăng ký lại',
          href: '/officer/removal-info',
          icon: '❌'
        });
      }
    }

    menuItems.push(clubMenuItem);
  }



  return (
    <>
      {/* Restoration Notification Banner */}
      {restorationInfo && restorationInfo.restoredAt && membershipStatus === 'ACTIVE' && showRestorationBanner && (
        <div className={`${isDarkMode ? 'bg-green-900/90 border-green-700' : 'bg-green-50 border-green-200'} border-b px-4 py-3 shadow-sm`}>
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-full ${isDarkMode ? 'bg-green-800 text-green-300' : 'bg-green-100 text-green-600'}`}>
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className={`text-sm font-medium ${isDarkMode ? 'text-green-200' : 'text-green-800'}`}>
                  Tài khoản đã được duyệt lại
                </p>
                <p className={`text-xs ${isDarkMode ? 'text-green-300' : 'text-green-600'}`}>
                  {restorationInfo.restoredBy?.name && `Duyệt bởi: ${restorationInfo.restoredBy.name}`}
                  {restorationInfo.restorationReason && ` - ${restorationInfo.restorationReason}`}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <a
                                 href="/officer/removal-info"
                className={`px-4 py-2 text-xs font-medium rounded-lg transition-all duration-200 ${isDarkMode ? 'bg-green-800 text-green-200 hover:bg-green-700' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
              >
                Xem chi tiết
              </a>
              <button
                onClick={() => setShowRestorationBanner(false)}
                className={`p-2 text-xs font-medium rounded-lg transition-all duration-200 ${isDarkMode ? 'text-green-300 hover:text-green-200 hover:bg-green-800' : 'text-green-600 hover:text-green-700 hover:bg-green-200'}`}
                title="Đóng thông báo"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Indicator */}
      {loading && (
        <div className={`${isDarkMode ? 'bg-blue-900/90 border-blue-700' : 'bg-blue-50 border-blue-200'} border-b px-4 py-2 shadow-sm`}>
          <div className="max-w-7xl mx-auto flex items-center justify-center">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className={`text-sm ${isDarkMode ? 'text-blue-200' : 'text-blue-700'}`}>
                Đang kiểm tra trạng thái tài khoản...
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Removal Notification Banner */}
      {(membershipStatus === 'REMOVED' || membershipStatus === 'removed') && (
        <div className={`${isDarkMode ? 'bg-red-900/90 border-red-700' : 'bg-red-50 border-red-200'} border-b px-4 py-3 shadow-sm`}>
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-full ${isDarkMode ? 'bg-red-800 text-red-300' : 'bg-red-100 text-red-600'}`}>
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <p className={`text-sm font-medium ${isDarkMode ? 'text-red-200' : 'text-red-800'}`}>
                  Tài khoản đã bị xóa khỏi CLB
                </p>
                <p className={`text-xs ${isDarkMode ? 'text-red-300' : 'text-red-600'}`}>
                  Bạn không còn quyền truy cập vào hệ thống quản lý CLB
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <a
                href="/auth/login"
                className={`px-4 py-2 text-xs font-medium rounded-lg transition-all duration-200 ${isDarkMode ? 'bg-red-800 text-red-200 hover:bg-red-700' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
              >
                Đăng xuất
              </a>
            </div>
          </div>
        </div>
      )}

      <nav className={`${isDarkMode 
        ? 'bg-gray-900/95 backdrop-blur-md text-white border-gray-800' 
        : 'bg-white/90 backdrop-blur-md text-gray-900 border-gray-200'} shadow-sm border-b sticky top-0 z-50 transition-all duration-200 ${(membershipStatus === 'REMOVED' || membershipStatus === 'removed') ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14">
          {/* Left side - Logo & Brand */}
          <div className="flex items-center">
            <div className="flex items-center space-x-2.5">
              <img 
                src="/logo_clb_sv_5T.jpg" 
                alt="CLB Sinh viên 5 Tốt TDMU" 
                className="w-9 h-9 rounded-lg shadow-sm object-cover"
              />
              <div className="flex flex-col">
                <h1 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Officer Panel
                </h1>
                <p className={`text-[10px] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  CLB Sinh viên 5 Tốt TDMU
                </p>
              </div>
            </div>
          </div>

          {/* Center - Main Navigation */}
          <div className="hidden lg:flex items-center space-x-0.5">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <div key={item.name} className="relative">
                  {item.isDropdown ? (
                    <div className="club-dropdown">
                      <button
                        onClick={() => setShowClubDropdown(!showClubDropdown)}
                        className={`${isDarkMode 
                          ? `${isActive ? 'bg-gray-800 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-800'}` 
                          : `${isActive ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`} px-3 py-1.5 rounded-lg text-xs font-medium flex items-center transition-all duration-200`}
                      >
                        <span className="mr-1.5 text-sm">{item.icon}</span>
                        <span>{item.name}</span>
                        <svg className={`ml-1.5 h-3 w-3 transition-transform duration-200 ${showClubDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {showClubDropdown && (
                        <div className={`absolute top-full left-0 mt-1 w-64 ${isDarkMode 
                          ? 'bg-gray-800 border-gray-700' 
                          : 'bg-white border-gray-200'} rounded-lg shadow-lg border z-50`}>
                          <div className="py-1">
                            {item.children?.map((child, index) => (
                              <a
                                key={index}
                                href={child.href}
                                className={`${isDarkMode 
                                  ? 'text-gray-300 hover:text-white hover:bg-gray-700' 
                                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'} flex items-center px-4 py-2 text-sm transition-colors duration-200`}
                                onClick={() => setShowClubDropdown(false)}
                              >
                                <span className="mr-3 text-base">{child.icon}</span>
                                <span>{child.name}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <a
                      href={item.href}
                      className={`${isDarkMode 
                        ? `${isActive ? 'bg-gray-800 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-800'}` 
                        : `${isActive ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`} px-3 py-1.5 rounded-lg text-xs font-medium flex items-center transition-all duration-200`}
                    >
                      <span className="mr-1.5 text-sm">{item.icon}</span>
                      <span>{item.name}</span>
                    </a>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right side - User controls */}
          <div className="flex items-center space-x-1.5">
            {/* Dark mode toggle */}
            <button
              onClick={toggleDarkMode}
              className={`${isDarkMode 
                ? 'text-gray-400 hover:text-yellow-400 hover:bg-gray-800' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'} p-1.5 rounded-lg transition-colors duration-200`}
              title={isDarkMode ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
            >
              {isDarkMode ? (
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>

            {/* Notification dropdown */}
            <div className="relative notification-dropdown">
              <button
                onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
                className={`${isDarkMode 
                  ? 'text-gray-300 hover:text-white hover:bg-gray-800' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'} p-1.5 relative transition-colors duration-200 rounded-lg`}
                title="Thông báo"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center font-semibold">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotificationDropdown && (
                <div className={`absolute right-0 mt-3 w-96 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg shadow-xl py-0 z-50 border max-h-[500px] overflow-hidden`}>
                  {/* Header */}
                  <div className={`px-6 py-4 border-b ${isDarkMode ? 'border-gray-600 bg-gray-800/50' : 'border-gray-100 bg-gray-50/50'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                          </svg>
                        </div>
                        <div>
                          <h3 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            Thông báo
                          </h3>
                          <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {unreadCount} thông báo chưa đọc
                          </p>
                        </div>
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${isDarkMode ? 'text-blue-400 hover:text-blue-300 hover:bg-blue-500/20' : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'}`}
                        >
                          Đánh dấu đã đọc
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Notifications List */}
                  <div className="overflow-y-auto max-h-[350px]">
                    {notifications.length === 0 ? (
                      <div className={`px-6 py-12 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
                          <svg className="h-8 w-8 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                          </svg>
                        </div>
                        <p className="text-sm font-medium mb-1">Không có thông báo mới</p>
                        <p className="text-xs opacity-75">Tất cả thông báo đã được đọc</p>
                      </div>
                    ) : (
                      <div className="py-2">
                        {notifications.map((notification, index) => (
                          <div
                            key={notification.id}
                            className={`mx-3 mb-2 rounded-xl p-4 cursor-pointer transition-all duration-200 hover:scale-[1.02] ${!notification.isRead ? (isDarkMode ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-100') : (isDarkMode ? 'bg-gray-700/30 hover:bg-gray-700/50' : 'bg-gray-50 hover:bg-gray-100')}`}
                            onClick={() => markAsRead(notification.id)}
                          >
                            <div className="flex items-start space-x-3">
                              {/* Status indicator */}
                              <div className={`flex-shrink-0 w-3 h-3 rounded-full mt-1.5 ${notification.isRead ? (isDarkMode ? 'bg-gray-500' : 'bg-gray-300') : 'bg-blue-500 animate-pulse'}`}></div>
                              
                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between">
                                  <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} ${!notification.isRead ? 'font-bold' : ''} line-clamp-1`}>
                                    {notification.title}
                                  </p>
                                  <span className={`text-xs px-2 py-1 rounded-full ${notification.type === 'success' ? (isDarkMode ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700') : (isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700')}`}>
                                    {notification.type === 'success' ? 'Thành công' : 'Thông tin'}
                                  </span>
                                </div>
                                <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mt-2 line-clamp-2 leading-relaxed`}>
                                  {notification.message}
                                </p>
                                <div className="flex items-center justify-between mt-3">
                                  <div className="flex items-center gap-3 flex-wrap">
                                    <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} flex items-center`}>
                                      <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      {notification.createdAt.toLocaleString('vi-VN', { 
                                        hour: '2-digit', 
                                        minute: '2-digit',
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric'
                                      })}
                                    </p>
                                    {notification.createdBy ? (
                                      <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} flex items-center`}>
                                        <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                        {notification.createdBy.name}
                                        {notification.createdBy.studentId && (
                                          <span className="ml-1 opacity-75">({notification.createdBy.studentId})</span>
                                        )}
                                      </p>
                                    ) : (
                                      <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} flex items-center`}>
                                        <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Hệ thống
                                      </p>
                                    )}
                                  </div>
                                  {!notification.isRead && (
                                    <span className="text-xs px-2 py-1 rounded-full bg-blue-500 text-white font-medium">
                                      Mới
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Footer */}
                  {notifications.length > 0 && (
                    <div className={`px-6 py-3 border-t ${isDarkMode ? 'border-gray-600 bg-gray-800/50' : 'border-gray-100 bg-gray-50/50'}`}>
                      <a
                        href="/officer/notifications"
                        className={`flex items-center justify-center w-full py-2 text-sm font-medium rounded-lg transition-all duration-200 ${isDarkMode ? 'text-blue-400 hover:text-blue-300 hover:bg-blue-500/20' : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'}`}
                      >
                        <span>Xem tất cả thông báo</span>
                        <svg className="h-4 w-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Profile dropdown */}
            <div className="relative profile-dropdown">
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className={`flex items-center space-x-1.5 p-1 rounded-lg ${isDarkMode 
                  ? 'text-gray-300 hover:text-white hover:bg-gray-800' 
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'} transition-colors duration-200`}
              >
                <div className="relative">
                  {user?.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt="Avatar"
                      className="w-7 h-7 rounded-full object-cover"
                    />
                  ) : (
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-blue-600' : 'bg-blue-500'}`}>
                      <span className="text-white text-[10px] font-semibold">
                        {user?.name?.split(' ').pop()?.charAt(0) || 'O'}
                      </span>
                    </div>
                  )}
                  <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-white dark:border-gray-900"></div>
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-xs font-semibold">
                    {user?.name || 'Officer'}
                  </p>
                  <p className={`text-[10px] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {getRoleDisplay(user?.role).name}
                  </p>
                </div>
                <svg className={`h-3 w-3 transition-transform duration-200 ${showProfileDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showProfileDropdown && (
                <div className={`absolute right-0 mt-3 w-72 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg shadow-xl py-0 z-50 border`}>
                  {/* Header */}
                  <div className={`px-6 py-4 border-b ${isDarkMode ? 'border-gray-600 bg-gray-800/50' : 'border-gray-100 bg-gray-50/50'}`}>
                    <div className="flex items-center space-x-4">
                      {user?.avatarUrl ? (
                        <div className="relative">
                          <img
                            src={user.avatarUrl}
                            alt="Avatar"
                            className="w-12 h-12 rounded-full object-cover ring-2 ring-green-500"
                          />
                          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                        </div>
                      ) : (
                        <div className="relative">
                          <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center ring-2 ring-green-500">
                            <span className="text-white text-lg font-bold">
                              {user?.name?.split(' ').pop()?.charAt(0) || 'O'}
                            </span>
                          </div>
                          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} truncate`}>
                          {user?.name || 'Officer'}
                        </p>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} truncate`}>
                          {user?.email || 'officer@example.com'}
                        </p>
                        <div className="flex items-center mt-1">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleDisplay(user?.role).color}`}>
                            <span className={`w-2 h-2 ${getRoleDisplay(user?.role).dotColor} rounded-full mr-1.5`}></span>
                            {getRoleDisplay(user?.role).name}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Menu Items */}
                  <div className="py-2">
                    <a 
                      href="/officer/profile" 
                      className={`flex items-center px-6 py-3 text-sm transition-all duration-200 hover:scale-[1.02] ${isDarkMode ? 'text-gray-300 hover:bg-gray-700/50 hover:text-white' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'}`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 ${isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Hồ sơ cá nhân</p>
                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Quản lý thông tin cá nhân</p>
                      </div>
                      <svg className="w-4 h-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </a>
                    
                    <a 
                      href="/officer/settings" 
                      className={`flex items-center px-6 py-3 text-sm transition-all duration-200 hover:scale-[1.02] ${isDarkMode ? 'text-gray-300 hover:bg-gray-700/50 hover:text-white' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'}`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 ${isDarkMode ? 'bg-gray-500/20 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Cài đặt</p>
                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Tùy chỉnh tài khoản</p>
                      </div>
                      <svg className="w-4 h-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </a>
                  </div>
                  
                  {/* Footer */}
                  <div className={`px-6 py-3 border-t ${isDarkMode ? 'border-gray-600 bg-gray-800/50' : 'border-gray-100 bg-gray-50/50'}`}>
                    <a
                      href="/auth/login"
                      className={`flex items-center justify-center w-full py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${isDarkMode ? 'text-red-400 hover:text-red-300 hover:bg-red-500/20' : 'text-red-600 hover:text-red-700 hover:bg-red-50'}`}
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span>Đăng xuất</span>
                    </a>
                  </div>
                </div>
              )}
            </div>

            

            {/* Mobile menu button */}
            <div className="lg:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`${isDarkMode ? 'text-gray-300 hover:text-white hover:bg-gray-800' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'} p-2 rounded-md transition-all duration-200`}
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="lg:hidden">
            <div className={`px-4 pt-2 pb-4 space-y-1 border-t ${isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
              {menuItems.map((item) => (
                <div key={item.name}>
                  {item.isDropdown ? (
                    <div className="club-dropdown">
                      <button
                        onClick={() => setShowMobileClubDropdown(!showMobileClubDropdown)}
                        className={`${isDarkMode ? 'text-gray-300 hover:text-white hover:bg-gray-700' : 'text-gray-700 hover:text-gray-900 hover:bg-white'} w-full px-3 py-2 rounded-md text-base font-medium flex items-center justify-between transition-all duration-200`}
                      >
                        <div className="flex items-center">
                          <span className="mr-3 text-lg">{item.icon}</span>
                          <span className="flex-1">{item.name}</span>
                        </div>
                        <svg className={`h-4 w-4 transition-transform duration-200 ${showMobileClubDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {showMobileClubDropdown && (
                        <div className={`ml-6 mt-1 space-y-1 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-md p-2`}>
                          {item.children?.map((child, index) => (
                            <a
                              key={index}
                              href={child.href}
                              className={`${isDarkMode ? 'text-gray-300 hover:text-white hover:bg-gray-600' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'} block px-3 py-2 rounded-md text-sm font-medium flex items-center transition-all duration-200`}
                              onClick={() => {
                                setIsMenuOpen(false);
                                setShowMobileClubDropdown(false);
                              }}
                            >
                              <span className="mr-3 text-base">{child.icon}</span>
                              <span>{child.name}</span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <a
                      href={item.href}
                      className={`${isDarkMode ? 'text-gray-300 hover:text-white hover:bg-gray-700' : 'text-gray-700 hover:text-gray-900 hover:bg-white'} block px-3 py-2 rounded-md text-base font-medium flex items-center transition-all duration-200`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <span className="mr-3 text-lg">{item.icon}</span>
                      <span className="flex-1">{item.name}</span>
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
    </>
  );
}