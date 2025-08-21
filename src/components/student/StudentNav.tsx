'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface MenuItem {
  name: string;
  href: string;
  icon: string;
}

export default function StudentNav() {
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [membershipStatus, setMembershipStatus] = useState<'PENDING' | 'ACTIVE' | 'REJECTED' | 'REMOVED' | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

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
      if (!target.closest('.notification-dropdown') && !target.closest('.profile-dropdown')) {
        setShowNotificationDropdown(false);
        setShowProfileDropdown(false);
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

  // Check membership status and notifications
  useEffect(() => {
    if (user) {
      // Always check membership status for all students
      checkMembershipStatus();
      loadNotifications();
    }
  }, [user]);

  const checkMembershipStatus = async () => {
    try {
      setLoading(true);
      console.log('Checking membership status for user:', user?._id);
      
      const response = await fetch(`/api/memberships/check?userId=${user?._id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Membership check response:', data);
        
        if (data.success && data.data.hasMembership) {
          console.log('Setting membership status to:', data.data.membership.status);
          setMembershipStatus(data.data.membership.status);
        } else {
          console.log('No membership found, setting status to null');
          setMembershipStatus(null);
        }
      } else {
        console.error('API response not ok:', response.status);
        setMembershipStatus(null);
      }
    } catch (err) {
      console.error('Error checking membership status:', err);
      setMembershipStatus(null);
    } finally {
      setLoading(false);
    }
  };

  const loadNotifications = async () => {
    try {
      // Mock notifications for now - you can replace with actual API call
      const mockNotifications = [
        {
          id: 1,
          title: 'Chào mừng bạn đến với CLB!',
          message: 'Bạn đã được chấp nhận vào CLB Sinh viên 5 Tốt TDMU',
          type: 'success',
          isRead: false,
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
        },
        {
          id: 2,
          title: 'Hoạt động mới',
          message: 'Có hoạt động tình nguyện mới vào cuối tuần này',
          type: 'info',
          isRead: true,
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
        }
      ];
      
      setNotifications(mockNotifications);
      setUnreadCount(mockNotifications.filter(n => !n.isRead).length);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const markAsRead = (notificationId: number) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, isRead: true }
          : notification
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, isRead: true }))
    );
    setUnreadCount(0);
  };

  // Menu items based on membership status
  const getMenuItems = (): MenuItem[] => {
    const baseItems: MenuItem[] = [
      { name: 'Dashboard', href: '/student/dashboard', icon: '🏠' },
      { name: 'Hoạt động', href: '/student/activities', icon: '🎯' },
      { name: 'Lịch sử', href: '/student/history', icon: '📋' },
      { name: 'Điểm tích lũy', href: '/student/points', icon: '⭐' },
    ];

    // For non-club members (no membership or status is null), show different menu
    if (!membershipStatus) {
      return [
        ...baseItems,
        { name: 'Đăng ký tham gia CLB', href: '/student/register', icon: '📝' }
      ];
    }

    // Add membership-related items based on status for club members
    if (membershipStatus === 'ACTIVE') {
      return [
        ...baseItems,
        { name: 'Thành viên CLB', href: '/student/member', icon: '👥' }
      ];
    } else if (membershipStatus === 'PENDING') {
      return [
        ...baseItems,
        { name: 'Đăng ký CLB', href: '/student/register', icon: '📝' }
      ];
    } else if (membershipStatus === 'REJECTED') {
      return [
        ...baseItems,
        { name: 'Đăng ký lại CLB', href: '/student/register', icon: '📝' }
      ];
    } else if (membershipStatus === 'REMOVED') {
      return [
        ...baseItems,
        { name: 'Đăng ký lại CLB', href: '/student/register', icon: '🔄' }
      ];
    } else {
      return [
        ...baseItems,
        { name: 'Đăng ký CLB', href: '/student/register', icon: '📝' }
      ];
    }
  };

  const menuItems = getMenuItems();

  const getMembershipBadge = () => {
    // If membership status is not loaded yet, show loading or default
    if (loading) {
      return (
        <div className="hidden md:flex items-center bg-gray-400 px-3 py-1.5 rounded-full shadow-sm">
          <span className="text-white text-xs font-medium flex items-center">
            <span className="mr-1">⏳</span>
            Đang tải...
          </span>
        </div>
      );
    }

    // For non-club members (no membership or status is null), show guest badge
    if (!membershipStatus) {
      return (
        <div className="hidden md:flex items-center bg-orange-500 px-3 py-1.5 rounded-full shadow-sm">
          <span className="text-white text-xs font-medium flex items-center">
            <span className="mr-1">👤</span>
            Khách
          </span>
        </div>
      );
    }

    switch (membershipStatus) {
      case 'ACTIVE':
        return (
          <div className="hidden md:flex items-center bg-green-500 px-3 py-1.5 rounded-full shadow-sm">
            <span className="text-white text-xs font-medium flex items-center">
              <span className="mr-1">👥</span>
              Thành viên
            </span>
          </div>
        );
      case 'PENDING':
        return (
          <div className="hidden md:flex items-center bg-yellow-500 px-3 py-1.5 rounded-full shadow-sm">
            <span className="text-white text-xs font-medium flex items-center">
              <span className="mr-1">⏳</span>
              Chờ duyệt
            </span>
          </div>
        );
      case 'REJECTED':
        return (
          <div className="hidden md:flex items-center bg-red-500 px-3 py-1.5 rounded-full shadow-sm">
            <span className="text-white text-xs font-medium flex items-center">
              <span className="mr-1">❌</span>
              Từ chối
            </span>
          </div>
        );
      case 'REMOVED':
        return (
          <div className="hidden md:flex items-center bg-gray-500 px-3 py-1.5 rounded-full shadow-sm">
            <span className="text-white text-xs font-medium flex items-center">
              <span className="mr-1">🚫</span>
              Đã xóa
            </span>
          </div>
        );
      default:
        return (
          <div className="hidden md:flex items-center bg-purple-500 px-3 py-1.5 rounded-full shadow-sm">
            <span className="text-white text-xs font-medium flex items-center">
              <span className="mr-1">⭐</span>
              8.5 điểm
            </span>
          </div>
        );
    }
  };

  return (
    <nav className={`${isDarkMode ? 'bg-gray-900 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-200'} shadow-lg border-b sticky top-0 z-50 transition-all duration-300`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side - Logo & Brand */}
          <div className="flex items-center">
            <div className="flex items-center group">
              <img 
                src="/logo_clb_sv_5T.jpg" 
                alt="CLB Sinh viên 5 Tốt TDMU" 
                className="w-10 h-10 mr-3 rounded-lg shadow-md group-hover:scale-105 transition-transform duration-200"
              />
              <div className="flex flex-col">
                <h1 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Student Portal
                </h1>
                <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                  CLB Sinh viên 5 Tốt TDMU
                </p>
              </div>
            </div>
          </div>

          {/* Center - Main Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            {menuItems.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className={`${isDarkMode ? 'text-gray-300 hover:text-white hover:bg-gray-800' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'} px-3 py-2 rounded-md text-sm font-medium flex items-center transition-all duration-200 group relative`}
              >
                <span className="mr-2 text-base group-hover:scale-110 transition-transform duration-200">
                  {item.icon}
                </span>
                <span>{item.name}</span>
                <div className={`absolute bottom-0 left-0 w-0 h-0.5 bg-blue-500 group-hover:w-full transition-all duration-300`}></div>
              </a>
            ))}
          </div>

          {/* Right side - User controls */}
          <div className="flex items-center space-x-3">
            {/* Membership status display */}
            {getMembershipBadge()}

            {/* Dark mode toggle */}
            <button
              onClick={toggleDarkMode}
              className={`${isDarkMode ? 'text-yellow-400 hover:text-yellow-300 hover:bg-gray-800' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'} p-2 rounded-md transition-all duration-200`}
              title={isDarkMode ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
            >
              {isDarkMode ? (
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>

            {/* Notification dropdown */}
            <div className="relative notification-dropdown">
              <button
                onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
                className={`${isDarkMode ? 'text-gray-300 hover:text-gray-100 hover:bg-gray-800' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'} p-3 relative transition-all duration-200 group rounded-xl`}
                title="Thông báo"
              >
                <svg className="h-6 w-6 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center font-bold shadow-lg animate-pulse">
                  {notifications.length}
                </span>
              </button>

              {showNotificationDropdown && (
                <div className={`absolute right-0 mt-3 w-96 ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'} rounded-xl shadow-2xl py-0 z-50 border backdrop-blur-sm bg-opacity-95 max-h-[500px] overflow-hidden`}>
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
                        href="/student/notifications"
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
                className={`flex items-center space-x-2 p-2 rounded-md ${isDarkMode ? 'text-gray-300 hover:text-white hover:bg-gray-800' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'} transition-all duration-200`}
              >
                <div className="relative">
                  {user?.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt="Avatar"
                      className="w-8 h-8 rounded-full object-cover ring-2 ring-green-500 group-hover:ring-green-600 transition-all duration-200"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center ring-2 ring-green-500 group-hover:ring-green-600 transition-all duration-200">
                      <span className="text-white text-sm font-bold">
                        {user?.name?.split(' ').pop()?.charAt(0) || 'S'}
                      </span>
                    </div>
                  )}
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border border-white"></div>
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-semibold">
                    {user?.name || 'Student'}
                  </p>
                  <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {user?.studentId || 'MSSV'}
                  </p>
                </div>
                <svg className={`h-4 w-4 transition-transform duration-200 ${showProfileDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

                             {showProfileDropdown && (
                 <div className={`absolute right-0 mt-3 w-72 ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'} rounded-xl shadow-2xl py-0 z-50 border backdrop-blur-sm bg-opacity-95`}>
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
                               {user?.name?.charAt(0) || 'S'}
                             </span>
                           </div>
                           <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                         </div>
                       )}
                       <div className="flex-1 min-w-0">
                         <p className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} truncate`}>
                           {user?.name || 'Student'}
                         </p>
                         <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} truncate`}>
                           {user?.email || 'student@example.com'}
                         </p>
                         <div className="flex items-center mt-1">
                           <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>
                             <span className="w-2 h-2 bg-green-500 rounded-full mr-1.5"></span>
                             Online
                           </span>
                         </div>
                       </div>
                     </div>
                   </div>
                   
                   {/* Menu Items */}
                   <div className="py-2">
                     <a 
                       href="/student/profile" 
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
                       href="/student/settings" 
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
                <a
                  key={item.name}
                  href={item.href}
                  className={`${isDarkMode ? 'text-gray-300 hover:text-white hover:bg-gray-700' : 'text-gray-700 hover:text-gray-900 hover:bg-white'} block px-3 py-2 rounded-md text-base font-medium flex items-center transition-all duration-200`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span className="mr-3 text-lg">{item.icon}</span>
                  <span className="flex-1">{item.name}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
      
    </nav>
  );
}
