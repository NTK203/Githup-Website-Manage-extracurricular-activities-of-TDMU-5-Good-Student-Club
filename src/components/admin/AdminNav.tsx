'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

export default function AdminNav() {
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [showActivityDropdown, setShowActivityDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Load theme from localStorage on component mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Listen for user data changes (for avatar updates)
  useEffect(() => {
    const handleUserDataChange = () => {
      // Force re-render when user data changes
      // This will be triggered when updateUser is called
    };

    const handleAvatarUploaded = (event: CustomEvent) => {
      // Force re-render when avatar is uploaded
      console.log('Avatar uploaded:', event.detail);
    };

    window.addEventListener('userDataChanged', handleUserDataChange);
    window.addEventListener('avatarUploaded', handleAvatarUploaded as EventListener);
    
    return () => {
      window.removeEventListener('userDataChanged', handleUserDataChange);
      window.removeEventListener('avatarUploaded', handleAvatarUploaded as EventListener);
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

  const memberMenuItems = [
    { name: 'Danh Sách Thành Viên CLB', href: '/admin/members', icon: '👥' },
    { name: 'Xét Duyệt Thành Viên', href: '/admin/memberships', icon: '📝' },
    { name: 'Trạng Thái Thành Viên', href: '/admin/members/status', icon: '📊' },
    { name: 'Phân quyền', href: '/admin/members/permissions', icon: '🔐' },
    { name: 'Thêm Thành Viên Mới', href: '/admin/members/add', icon: '➕' },
  ];

  const activityMenuItems = [
    { name: 'Tạo hoạt động mới', href: '/admin/activities/create', icon: '🎯' },
    { name: 'Danh sách hoạt động', href: '/admin/activities', icon: '📋' },
    { name: 'Lọc theo tiêu chí', href: '/admin/activities/filter', icon: '🔍' },
    { name: 'Báo cáo hoạt động', href: '/admin/activities/reports', icon: '📈' },
  ];

  const notifications = [
    { id: 1, message: 'Có 5 thành viên mới đăng ký', time: '2 phút trước', type: 'info' },
    { id: 2, message: 'Hoạt động "Mùa hè xanh" đã được phê duyệt', time: '1 giờ trước', type: 'success' },
    { id: 3, message: 'Cần phê duyệt 3 hoạt động mới', time: '3 giờ trước', type: 'warning' },
  ];

  return (
    <>
      {/* Main Navbar */}
      <nav className={`${isDarkMode ? 'bg-gradient-to-r from-gray-900 to-gray-800 text-white border-gray-700' : 'bg-gradient-to-r from-white to-gray-50 text-gray-900 border-gray-200'} shadow-xl border-b sticky top-0 z-50 transition-all duration-300 backdrop-blur-sm bg-opacity-95`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 sm:h-18">
            {/* Left side - Logo & Brand */}
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center group">
                <div className="relative">
                  <img 
                    src="/logo_clb_sv_5T.jpg" 
                    alt="CLB Sinh viên 5 Tốt TDMU" 
                    className="w-10 h-10 sm:w-12 sm:h-12 mr-3 sm:mr-4 rounded-xl shadow-lg group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className={`absolute -inset-1 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 opacity-0 group-hover:opacity-20 transition-opacity duration-200 -z-10`}></div>
                </div>
                <div className="flex flex-col">
                  <h1 className={`text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent ${isDarkMode ? 'from-blue-400 to-purple-400' : ''}`}>
                    CLB SV 5 Tốt
                  </h1>
                  <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                    TDMU
                  </p>
                </div>
              </div>
            </div>

                                     {/* Center - Main Navigation */}
            <div className="hidden lg:flex items-center space-x-1">
              {/* Dashboard */}
              <a
                href="/admin/dashboard"
                className={`${isDarkMode ? 'text-gray-300 hover:text-blue-400 hover:bg-gray-800' : 'text-gray-700 hover:text-blue-600 hover:bg-gray-100'} px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-all duration-200 group relative`}
              >
                <span className="mr-2 text-lg group-hover:scale-110 transition-transform duration-200">🏠</span>
                Dashboard
                <div className={`absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-600 group-hover:w-full transition-all duration-300 ${isDarkMode ? 'from-blue-400 to-purple-400' : ''}`}></div>
              </a>

              {/* Thành viên CLB Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowMemberDropdown(!showMemberDropdown)}
                  className={`${isDarkMode ? 'text-gray-300 hover:text-blue-400 hover:bg-gray-800' : 'text-gray-700 hover:text-blue-600 hover:bg-gray-100'} px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-all duration-200 group relative`}
                >
                  <span className="mr-2 text-lg group-hover:scale-110 transition-transform duration-200">👥</span>
                  Thành viên CLB
                  <svg className={`ml-1 h-4 w-4 transition-transform duration-200 ${showMemberDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  <div className={`absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-600 group-hover:w-full transition-all duration-300 ${isDarkMode ? 'from-blue-400 to-purple-400' : ''}`}></div>
                </button>
                
                {showMemberDropdown && (
                  <div className={`absolute left-0 mt-2 w-72 ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'} rounded-xl shadow-2xl py-2 z-50 border transition-all duration-200 backdrop-blur-sm`}>
                    <div className={`px-3 py-2 border-b ${isDarkMode ? 'border-gray-600' : 'border-gray-100'}`}>
                      <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Quản lý thành viên
                      </h3>
                    </div>
                    {memberMenuItems.map((item) => (
                      <a
                        key={item.name}
                        href={item.href}
                        className={`block px-4 py-3 text-sm ${isDarkMode ? 'text-gray-300 hover:bg-gray-700 hover:text-blue-400' : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'} flex items-center transition-all duration-200 group/item`}
                      >
                        <span className="mr-3 text-lg group-hover/item:scale-110 transition-transform duration-200">{item.icon}</span>
                        <span className="font-medium">{item.name}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {/* Hoạt động Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowActivityDropdown(!showActivityDropdown)}
                  className={`${isDarkMode ? 'text-gray-300 hover:text-blue-400 hover:bg-gray-800' : 'text-gray-700 hover:text-blue-600 hover:bg-gray-100'} px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-all duration-200 group relative`}
                >
                  <span className="mr-2 text-lg group-hover:scale-110 transition-transform duration-200">🎯</span>
                  Hoạt động
                  <svg className={`ml-1 h-4 w-4 transition-transform duration-200 ${showActivityDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  <div className={`absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-600 group-hover:w-full transition-all duration-300 ${isDarkMode ? 'from-blue-400 to-purple-400' : ''}`}></div>
                </button>
                
                {showActivityDropdown && (
                  <div className={`absolute left-0 mt-2 w-72 ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'} rounded-xl shadow-2xl py-2 z-50 border transition-all duration-200 backdrop-blur-sm`}>
                    <div className={`px-3 py-2 border-b ${isDarkMode ? 'border-gray-600' : 'border-gray-100'}`}>
                      <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Quản lý hoạt động
                      </h3>
                    </div>
                    {activityMenuItems.map((item) => (
                      <a
                        key={item.name}
                        href={item.href}
                        className={`block px-4 py-3 text-sm ${isDarkMode ? 'text-gray-300 hover:bg-gray-700 hover:text-blue-400' : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'} flex items-center transition-all duration-200 group/item`}
                      >
                        <span className="mr-3 text-lg group-hover/item:scale-110 transition-transform duration-200">{item.icon}</span>
                        <span className="font-medium">{item.name}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {/* Quản lý User */}
              <a
                href="/admin/users"
                className={`${isDarkMode ? 'text-gray-300 hover:text-blue-400 hover:bg-gray-800' : 'text-gray-700 hover:text-blue-600 hover:bg-gray-100'} px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-all duration-200 group relative`}
              >
                <span className="mr-2 text-lg group-hover:scale-110 transition-transform duration-200">👤</span>
                Quản lý User
                <div className={`absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-600 group-hover:w-full transition-all duration-300 ${isDarkMode ? 'from-blue-400 to-purple-400' : ''}`}></div>
              </a>

              {/* Tiêu chí */}
              <a
                href="/admin/criteria"
                className={`${isDarkMode ? 'text-gray-300 hover:text-blue-400 hover:bg-gray-800' : 'text-gray-700 hover:text-blue-600 hover:bg-gray-100'} px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-all duration-200 group relative`}
              >
                <span className="mr-2 text-lg group-hover:scale-110 transition-transform duration-200">📋</span>
                Tiêu chí
                <div className={`absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-600 group-hover:w-full transition-all duration-300 ${isDarkMode ? 'from-blue-400 to-purple-400' : ''}`}></div>
              </a>
            </div>

                                     {/* Right side - User controls */}
            <div className="flex items-center space-x-3">
              {/* Dark mode toggle */}
              <button
                onClick={toggleDarkMode}
                className={`${isDarkMode ? 'text-yellow-400 hover:text-yellow-300 hover:bg-gray-800' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'} p-3 rounded-xl transition-all duration-200 group relative`}
                title={isDarkMode ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
              >
                {isDarkMode ? (
                  <svg className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
                <div className={`absolute inset-0 rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 opacity-0 group-hover:opacity-10 transition-opacity duration-200`}></div>
              </button>

              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
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

                {showNotifications && (
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
                              {notifications.length} thông báo mới
                            </p>
                          </div>
                        </div>
                        <button
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${isDarkMode ? 'text-blue-400 hover:text-blue-300 hover:bg-blue-500/20' : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'}`}
                        >
                          Đánh dấu đã đọc
                        </button>
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
                              className={`mx-3 mb-2 rounded-xl p-4 cursor-pointer transition-all duration-200 hover:scale-[1.02] ${isDarkMode ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-100'}`}
                            >
                              <div className="flex items-start space-x-3">
                                {/* Status indicator */}
                                <div className={`flex-shrink-0 w-3 h-3 rounded-full mt-1.5 ${
                                  notification.type === 'info' ? 'bg-blue-500 animate-pulse' : 
                                  notification.type === 'success' ? 'bg-green-500 animate-pulse' : 
                                  'bg-yellow-500 animate-pulse'
                                }`}></div>
                                
                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between">
                                    <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} line-clamp-1`}>
                                      {notification.message}
                                    </p>
                                    <span className={`text-xs px-2 py-1 rounded-full ${
                                      notification.type === 'info' ? (isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700') :
                                      notification.type === 'success' ? (isDarkMode ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700') :
                                      (isDarkMode ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700')
                                    }`}>
                                      {notification.type === 'info' ? 'Thông tin' : 
                                       notification.type === 'success' ? 'Thành công' : 'Cảnh báo'}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between mt-3">
                                    <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} flex items-center`}>
                                      <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      {notification.time}
                                    </p>
                                    <span className="text-xs px-2 py-1 rounded-full bg-blue-500 text-white font-medium">
                                      Mới
                                    </span>
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
                          href="/admin/notifications"
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
              <div className="relative">
                <button
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className={`flex items-center space-x-3 p-2 rounded-xl ${isDarkMode ? 'text-gray-300 hover:text-white hover:bg-gray-800' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'} transition-all duration-200 group`}
                >
                  <div className="relative">
                    {user?.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt="Avatar"
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-transparent group-hover:ring-blue-500 transition-all duration-200"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center ring-2 ring-transparent group-hover:ring-blue-500 transition-all duration-200">
                        <span className="text-white text-sm font-bold">
                          {user?.name?.charAt(0) || 'A'}
                        </span>
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-semibold">
                      {user?.name || 'Admin'}
                    </p>
                    <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {user?.role || 'ADMIN'}
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
                              className="w-12 h-12 rounded-full object-cover ring-2 ring-blue-500/20"
                            />
                            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                          </div>
                        ) : (
                          <div className="relative">
                            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center ring-2 ring-blue-500/20">
                              <span className="text-white text-lg font-bold">
                                {user?.name?.charAt(0) || 'A'}
                              </span>
                            </div>
                            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} truncate`}>
                            {user?.name || 'Admin'}
                          </p>
                          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} truncate`}>
                            {user?.email || 'admin@example.com'}
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
                        href="/admin/profile" 
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
                        href="/admin/settings" 
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
                  className={`${isDarkMode ? 'text-gray-300 hover:text-white hover:bg-gray-800' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'} p-3 rounded-xl transition-all duration-200 group`}
                >
                  <svg className={`h-6 w-6 group-hover:scale-110 transition-transform duration-200 ${isMenuOpen ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

            {/* Mobile menu */}
            {isMenuOpen && (
              <div className="lg:hidden">
                <div className={`px-4 pt-4 pb-6 space-y-2 border-t ${isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
                  <div className={`px-3 py-2 border-b ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                    <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Menu chính
                    </h3>
                  </div>
                  <a href="/admin/dashboard" className={`${isDarkMode ? 'text-gray-300 hover:text-blue-400 hover:bg-gray-700' : 'text-gray-700 hover:text-blue-600 hover:bg-white'} block px-4 py-3 rounded-lg text-base font-medium flex items-center transition-all duration-200 group`}>
                    <span className="mr-3 text-lg group-hover:scale-110 transition-transform duration-200">🏠</span>
                    Dashboard
                  </a>
                  <a href="/admin/members" className={`${isDarkMode ? 'text-gray-300 hover:text-blue-400 hover:bg-gray-700' : 'text-gray-700 hover:text-blue-600 hover:bg-white'} block px-4 py-3 rounded-lg text-base font-medium flex items-center transition-all duration-200 group`}>
                    <span className="mr-3 text-lg group-hover:scale-110 transition-transform duration-200">👥</span>
                    Thành viên CLB
                  </a>
                  <a href="/admin/activities" className={`${isDarkMode ? 'text-gray-300 hover:text-blue-400 hover:bg-gray-700' : 'text-gray-700 hover:text-blue-600 hover:bg-white'} block px-4 py-3 rounded-lg text-base font-medium flex items-center transition-all duration-200 group`}>
                    <span className="mr-3 text-lg group-hover:scale-110 transition-transform duration-200">🎯</span>
                    Hoạt động
                  </a>
                  <a href="/admin/users" className={`${isDarkMode ? 'text-gray-300 hover:text-blue-400 hover:bg-gray-700' : 'text-gray-700 hover:text-blue-600 hover:bg-white'} block px-4 py-3 rounded-lg text-base font-medium flex items-center transition-all duration-200 group`}>
                    <span className="mr-3 text-lg group-hover:scale-110 transition-transform duration-200">👤</span>
                    Quản lý User
                  </a>
                  <a href="/admin/criteria" className={`${isDarkMode ? 'text-gray-300 hover:text-blue-400 hover:bg-gray-700' : 'text-gray-700 hover:text-blue-600 hover:bg-white'} block px-4 py-3 rounded-lg text-base font-medium flex items-center transition-all duration-200 group`}>
                    <span className="mr-3 text-lg group-hover:scale-110 transition-transform duration-200">📋</span>
                    Tiêu chí
                  </a>
                </div>
              </div>
            )}
        </div>
      </nav>

      {/* Breadcrumb */}
      <div className={`${isDarkMode ? 'bg-gradient-to-r from-gray-800 to-gray-700 border-gray-600' : 'bg-gradient-to-r from-gray-50 to-white border-gray-200'} border-b px-6 py-3 transition-all duration-300`}>
        <div className="max-w-7xl mx-auto">
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-3">
              <li>
                <a href="/admin/dashboard" className={`${isDarkMode ? 'text-gray-400 hover:text-blue-400' : 'text-gray-500 hover:text-blue-600'} text-sm font-medium transition-all duration-200 flex items-center group`}>
                  <span className="mr-1 group-hover:scale-110 transition-transform duration-200">🏠</span>
                  Dashboard
                </a>
              </li>
              <li className="flex items-center">
                <svg className={`h-4 w-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} mx-2`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'} text-sm font-medium transition-colors duration-200`}>
                  Trang hiện tại
                </span>
              </li>
            </ol>
          </nav>
        </div>
      </div>
    </>
  );
}
