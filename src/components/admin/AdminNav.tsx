'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useDarkMode } from '@/hooks/useDarkMode';

export default function AdminNav() {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [currentMemberPage, setCurrentMemberPage] = useState<string | null>(null);
  const [currentActivityPage, setCurrentActivityPage] = useState<string | null>(null);
  
  // Refs for dropdown containers
  const memberDropdownRef = useRef<HTMLDivElement>(null);
  const activityDropdownRef = useRef<HTMLDivElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Helper functions for dropdown management
  const toggleDropdown = (dropdownName: string) => {
    console.log('Toggle dropdown:', dropdownName, 'Current:', activeDropdown);
    setActiveDropdown(activeDropdown === dropdownName ? null : dropdownName);
  };

  const closeAllDropdowns = () => {
    setActiveDropdown(null);
    setShowNotifications(false);
  };

  const handleMemberPageChange = (item: { key: string; name: string; href: string; icon: string }) => {
    setCurrentMemberPage(item.key);
    localStorage.setItem('currentMemberPage', item.key);
    setActiveDropdown(null);
  };

  const handleActivityPageChange = (item: { key: string; name: string; href: string; icon: string }) => {
    setCurrentActivityPage(item.key);
    localStorage.setItem('currentActivityPage', item.key);
    setActiveDropdown(null);
  };

  const resetMemberPage = () => {
    setCurrentMemberPage(null);
    localStorage.removeItem('currentMemberPage');
  };

  const resetActivityPage = () => {
    setCurrentActivityPage(null);
    localStorage.removeItem('currentActivityPage');
  };

  // Load saved page states from localStorage
  useEffect(() => {
    const savedMemberPage = localStorage.getItem('currentMemberPage');
    const savedActivityPage = localStorage.getItem('currentActivityPage');
    const savedSidebarState = localStorage.getItem('sidebarOpen');
    
    if (savedMemberPage) {
      setCurrentMemberPage(savedMemberPage);
    }
    if (savedActivityPage) {
      setCurrentActivityPage(savedActivityPage);
    }
    if (savedSidebarState !== null) {
      const sidebarState = savedSidebarState === 'true';
      setIsSidebarOpen(sidebarState);
      // Dispatch event immediately to sync with other components
      window.dispatchEvent(new CustomEvent('sidebarStateChange', { detail: { isOpen: sidebarState } }));
    }
  }, []);

  // Save sidebar state and dispatch event
  useEffect(() => {
    localStorage.setItem('sidebarOpen', isSidebarOpen.toString());
    // Dispatch custom event for other components to listen
    window.dispatchEvent(new CustomEvent('sidebarStateChange', { detail: { isOpen: isSidebarOpen } }));
  }, [isSidebarOpen]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      if (memberDropdownRef.current && !memberDropdownRef.current.contains(target)) {
        setActiveDropdown(prev => prev === 'member' ? null : prev);
      }
      if (activityDropdownRef.current && !activityDropdownRef.current.contains(target)) {
        setActiveDropdown(prev => prev === 'activity' ? null : prev);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(target)) {
        setActiveDropdown(prev => prev === 'profile' ? null : prev);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const memberMenuItems = [
    { name: 'Danh Sách Thành Viên CLB', href: '/admin/members', icon: '👥', key: 'members' },
    { name: 'Xét Duyệt Thành Viên', href: '/admin/memberships', icon: '📝', key: 'memberships' },
    { name: 'Trạng Thái Thành Viên', href: '/admin/members/status', icon: '📊', key: 'status' },
    { name: 'Phân quyền', href: '/admin/members/permissions', icon: '🔐', key: 'permissions' },
    { name: 'Thêm Thành Viên Mới', href: '/admin/members/add', icon: '➕', key: 'add' },
  ];

  const activityMenuItems = [
    { name: 'Tạo hoạt động 1 ngày', href: '/admin/activities/create-single', icon: '📅', key: 'create-single' },
    { name: 'Tạo hoạt động nhiều ngày', href: '/admin/activities/create-multiple', icon: '📆', key: 'create-multiple' },
    { name: 'Danh sách hoạt động', href: '/admin/activities', icon: '📋', key: 'list' },
    { name: 'Lọc theo tiêu chí', href: '/admin/activities/filter', icon: '🔍', key: 'filter' },
    { name: 'Báo cáo hoạt động', href: '/admin/activities/reports', icon: '📈', key: 'reports' },
  ];

  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load notifications
  const loadNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/notifications?limit=20', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.notifications) {
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

  // Load unread count
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

  // Load notifications on mount and when dropdown opens
  useEffect(() => {
    if (user) {
      loadUnreadCount();
      if (showNotifications) {
        loadNotifications();
      }

      // Poll for new notifications every 30 seconds
      const notificationInterval = setInterval(() => {
        loadUnreadCount();
        if (showNotifications) {
          loadNotifications();
        }
      }, 30000);

      return () => clearInterval(notificationInterval);
    }
  }, [user, showNotifications]);

  // Format date helper
  const formatDate = (date: Date) => {
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

  const getRoleDisplayName = (role: string) => {
    const roleNames = {
      'SUPER_ADMIN': 'Quản Trị Hệ Thống',
      'CLUB_LEADER': 'Chủ Nhiệm CLB',
      'CLUB_DEPUTY': 'Phó Chủ Nhiệm',
      'CLUB_MEMBER': 'Ủy Viên BCH',
      'CLUB_STUDENT': 'Thành Viên CLB',
      'ADMIN': 'Quản Trị Hệ Thống',
      'OFFICER': 'Ban Chấp Hành',
      'STUDENT': 'Thành Viên CLB'
    };
    return roleNames[role as keyof typeof roleNames] || role;
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideDown {
          0% {
            opacity: 0;
            transform: translateY(-10px);
            max-height: 0;
          }
          100% {
            opacity: 1;
            transform: translateY(0);
            max-height: 1000px;
          }
        }
         
         @keyframes slideInFromRight {
          0% {
            opacity: 0;
            transform: translateX(20px) scale(0.95);
          }
          100% {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
         
         .dropdown-accordion {
           animation: slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
           overflow: hidden;
         }
         
         .dropdown-right {
           animation: slideInFromRight 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
           position: absolute !important;
           z-index: 99999 !important;
         }
         
         .dropdown-container {
           position: relative !important;
           z-index: 99999 !important;
         }
         
         .scrollbar-hide {
           -ms-overflow-style: none;
           scrollbar-width: none;
         }
         
         .scrollbar-hide::-webkit-scrollbar {
           display: none;
         }

         .sidebar-transition {
           transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
         }
       `}} />
      
      {/* Mobile overlay */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[9998] lg:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        className={`fixed left-0 top-0 h-screen ${isSidebarOpen ? 'w-72' : 'w-20'} ${isDarkMode ? 'bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900' : 'bg-gradient-to-b from-white via-blue-50/30 to-purple-50/30'} shadow-xl border-r ${isDarkMode ? 'border-gray-700' : 'border-blue-100/50'} z-[9999] sidebar-transition flex flex-col overflow-visible ${
          isMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        style={{
          '--sidebar-width': isSidebarOpen ? '288px' : '80px'
        } as React.CSSProperties}
      >
        {/* Sidebar Header */}
        <div className={`flex items-center ${isSidebarOpen ? 'justify-between' : 'justify-center'} p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          {isSidebarOpen && (
            <div className="flex items-center group flex-shrink-0">
              <img 
                src="/logo_clb_sv_5T.jpg" 
                alt="CLB Sinh viên 5 Tốt TDMU" 
                className={`w-10 h-10 rounded-xl border ${isDarkMode ? 'border-gray-600/50' : 'border-blue-200/50'} group-hover:border-blue-300 group-hover:scale-105 transition-all duration-300`}
              />
              <div className="ml-3">
                <h1 className={`text-base font-bold bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent ${isDarkMode ? 'from-blue-300 via-purple-300 to-pink-300' : ''}`}>
                  CLB SV 5 Tốt
                </h1>
                <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  TDMU
                </p>
              </div>
            </div>
          )}
          {!isSidebarOpen && (
            <img 
              src="/logo_clb_sv_5T.jpg" 
              alt="CLB Logo" 
              className={`w-10 h-10 rounded-xl border ${isDarkMode ? 'border-gray-600/50' : 'border-blue-200/50'}`}
            />
          )}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`p-2 rounded-lg ${isDarkMode ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'} transition-all duration-200 ${isSidebarOpen ? '' : 'mx-auto'}`}
            title={isSidebarOpen ? 'Thu gọn' : 'Mở rộng'}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isSidebarOpen ? "M11 19l-7-7 7-7m8 14l-7-7 7-7" : "M13 5l7 7-7 7M5 5l7 7-7 7"} />
            </svg>
          </button>
        </div>

        {/* Sidebar Content - Scrollable */}
        <div className="flex-1 overflow-y-auto overflow-x-visible scrollbar-hide py-4">
          <nav className="space-y-1 px-3">
            {/* Dashboard */}
            <a
              href="/admin/dashboard"
              className={`${isDarkMode ? 'text-gray-300 hover:text-white hover:bg-gray-800/50' : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50/50'} ${isSidebarOpen ? 'justify-start px-4' : 'justify-center px-2'} py-3 rounded-lg text-sm font-medium flex items-center transition-all duration-200 group relative`}
              title="Dashboard"
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isDarkMode ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100/70 text-blue-600'} group-hover:bg-blue-500/30 group-hover:scale-105 transition-all duration-200`}>
                <span className="text-base">🏠</span>
              </div>
              {isSidebarOpen && <span className="ml-3">Dashboard</span>}
            </a>

            {/* Báo Cáo Thống Kê */}
            <a
              href="/admin/reports"
              className={`${isDarkMode ? 'text-gray-300 hover:text-white hover:bg-gray-800/50' : 'text-gray-700 hover:text-indigo-600 hover:bg-indigo-50/50'} ${isSidebarOpen ? 'justify-start px-4' : 'justify-center px-2'} py-3 rounded-lg text-sm font-medium flex items-center transition-all duration-200 group relative`}
              title="Báo Cáo Thống Kê"
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isDarkMode ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-100/70 text-indigo-600'} group-hover:bg-indigo-500/30 group-hover:scale-105 transition-all duration-200`}>
                <span className="text-base">📊</span>
              </div>
              {isSidebarOpen && <span className="ml-3">Báo Cáo Thống Kê</span>}
            </a>

            {/* Gửi Thông Báo */}
            <a
              href="/admin/notifications/send"
              className={`${isDarkMode ? 'text-gray-300 hover:text-white hover:bg-gray-800/50' : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50/50'} ${isSidebarOpen ? 'justify-start px-4' : 'justify-center px-2'} py-3 rounded-lg text-sm font-medium flex items-center transition-all duration-200 group relative`}
              title="Gửi Thông Báo"
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isDarkMode ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100/70 text-blue-600'} group-hover:bg-blue-500/30 group-hover:scale-105 transition-all duration-200`}>
                <span className="text-base">📢</span>
              </div>
              {isSidebarOpen && <span className="ml-3">Gửi Thông Báo</span>}
            </a>

            {/* Thông Báo Đã Gửi */}
            <a
              href="/admin/notifications/sent"
              className={`${isDarkMode ? 'text-gray-300 hover:text-white hover:bg-gray-800/50' : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50/50'} ${isSidebarOpen ? 'justify-start px-4' : 'justify-center px-2'} py-3 rounded-lg text-sm font-medium flex items-center transition-all duration-200 group relative`}
              title="Thông Báo Đã Gửi"
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isDarkMode ? 'bg-green-500/20 text-green-300' : 'bg-green-100/70 text-green-600'} group-hover:bg-green-500/30 group-hover:scale-105 transition-all duration-200`}>
                <span className="text-base">📤</span>
              </div>
              {isSidebarOpen && <span className="ml-3">Thông Báo Đã Gửi</span>}
            </a>

            {/* Thành viên CLB Dropdown - Accordion Style */}
            <div className="relative dropdown-container overflow-visible" ref={memberDropdownRef}>
              <button
                onClick={() => toggleDropdown('member')}
                className={`w-full ${isDarkMode ? 'text-gray-300 hover:text-white hover:bg-gray-800/50' : 'text-gray-700 hover:text-purple-600 hover:bg-purple-50/50'} ${isSidebarOpen ? 'justify-between px-4' : 'justify-center px-2'} py-3 rounded-lg text-sm font-medium flex items-center transition-all duration-200 group relative ${activeDropdown === 'member' ? isDarkMode ? 'bg-gradient-to-r from-purple-500/20 to-purple-600/20 text-white' : 'bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700' : ''}`}
                title={currentMemberPage ? memberMenuItems.find(item => item.key === currentMemberPage)?.name || 'Thành viên CLB' : 'Thành viên CLB'}
              >
                <div className="flex items-center flex-1 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isDarkMode ? 'bg-purple-500/30 text-purple-200' : 'bg-gradient-to-br from-purple-400 to-purple-600 text-white'} group-hover:scale-110 transition-all duration-200 shadow-md ${activeDropdown === 'member' ? 'ring-2 ring-purple-400/50' : ''}`}>
                    <span className="text-lg">👥</span>
                  </div>
                  {isSidebarOpen && (
                    <span className="ml-3 font-semibold truncate">
                      {currentMemberPage ? 
                        (currentMemberPage === 'members' ? 'Danh sách' :
                         currentMemberPage === 'memberships' ? 'Xét duyệt' :
                         currentMemberPage === 'status' ? 'Trạng thái' :
                         currentMemberPage === 'permissions' ? 'Phân quyền' :
                         currentMemberPage === 'add' ? 'Thêm mới' :
                         memberMenuItems.find(item => item.key === currentMemberPage)?.name || 'Thành viên CLB') 
                        : 'Thành viên CLB'
                      }
                    </span>
                  )}
                </div>
                {isSidebarOpen && (
                  <svg className={`h-5 w-5 flex-shrink-0 transition-all duration-300 ${activeDropdown === 'member' ? 'rotate-180 text-purple-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>
              
              {/* Accordion Dropdown */}
              <div className={`overflow-hidden transition-all duration-300 ${activeDropdown === 'member' ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className={`mt-2 ${isDarkMode ? 'bg-gray-800/80 backdrop-blur-sm border border-purple-500/20' : 'bg-white/90 backdrop-blur-sm border border-purple-100'} rounded-xl shadow-2xl py-3 dropdown-accordion`}>
                  <div className="px-2 space-y-1">
                    {memberMenuItems.map((item, index) => (
                      <a
                        key={item.name}
                        href={item.href}
                        onClick={() => handleMemberPageChange(item)}
                        className={`block px-4 py-2.5 rounded-lg ${isDarkMode ? 'text-gray-300 hover:bg-gradient-to-r hover:from-purple-500/30 hover:to-purple-600/30 hover:text-white' : 'text-gray-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-purple-100 hover:text-purple-700'} transition-all duration-200 group/item transform hover:scale-[1.02] ${currentMemberPage === item.key ? isDarkMode ? 'bg-gradient-to-r from-purple-500/30 to-purple-600/30 text-white' : 'bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700' : ''}`}
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <div className="flex items-center">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 ${isDarkMode ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-600'} group-hover/item:bg-purple-500/40 group-hover/item:scale-110 transition-all duration-200 shadow-sm`}>
                            <span className="text-base">{item.icon}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="font-medium text-sm block">{item.name}</span>
                          </div>
                          {currentMemberPage === item.key && (
                            <div className={`w-2 h-2 rounded-full ${isDarkMode ? 'bg-purple-400' : 'bg-purple-600'}`}></div>
                          )}
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Hoạt động Dropdown - Accordion Style */}
            <div className="relative dropdown-container overflow-visible" ref={activityDropdownRef}>
              <button
                onClick={() => toggleDropdown('activity')}
                className={`w-full ${isDarkMode ? 'text-gray-300 hover:text-white hover:bg-gray-800/50' : 'text-gray-700 hover:text-red-600 hover:bg-red-50/50'} ${isSidebarOpen ? 'justify-between px-4' : 'justify-center px-2'} py-3 rounded-lg text-sm font-medium flex items-center transition-all duration-200 group relative ${activeDropdown === 'activity' ? isDarkMode ? 'bg-gradient-to-r from-red-500/20 to-red-600/20 text-white' : 'bg-gradient-to-r from-red-50 to-red-100 text-red-700' : ''}`}
                title={currentActivityPage ? activityMenuItems.find(item => item.key === currentActivityPage)?.name || 'Hoạt động' : 'Hoạt động'}
              >
                <div className="flex items-center flex-1 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isDarkMode ? 'bg-red-500/30 text-red-200' : 'bg-gradient-to-br from-red-400 to-red-600 text-white'} group-hover:scale-110 transition-all duration-200 shadow-md ${activeDropdown === 'activity' ? 'ring-2 ring-red-400/50' : ''}`}>
                    <span className="text-lg">🎯</span>
                  </div>
                  {isSidebarOpen && (
                    <span className="ml-3 font-semibold truncate">
                      {currentActivityPage ? 
                        (currentActivityPage === 'create-single' ? 'Tạo 1 ngày' :
                         currentActivityPage === 'create-multiple' ? 'Tạo nhiều ngày' :
                         currentActivityPage === 'list' ? 'Danh sách' :
                         currentActivityPage === 'filter' ? 'Lọc' :
                         currentActivityPage === 'reports' ? 'Báo cáo' :
                         activityMenuItems.find(item => item.key === currentActivityPage)?.name || 'Hoạt động') 
                        : 'Hoạt động'
                      }
                    </span>
                  )}
                </div>
                {isSidebarOpen && (
                  <svg className={`h-5 w-5 flex-shrink-0 transition-all duration-300 ${activeDropdown === 'activity' ? 'rotate-180 text-red-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>
              
              {/* Accordion Dropdown */}
              <div className={`overflow-hidden transition-all duration-300 ${activeDropdown === 'activity' ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className={`mt-2 ${isDarkMode ? 'bg-gray-800/80 backdrop-blur-sm border border-red-500/20' : 'bg-white/90 backdrop-blur-sm border border-red-100'} rounded-xl shadow-2xl py-3 dropdown-accordion`}>
                  <div className="px-2 space-y-1">
                    {activityMenuItems.map((item, index) => (
                      <a
                        key={item.name}
                        href={item.href}
                        onClick={() => handleActivityPageChange(item)}
                        className={`block px-4 py-2.5 rounded-lg ${isDarkMode ? 'text-gray-300 hover:bg-gradient-to-r hover:from-red-500/30 hover:to-red-600/30 hover:text-white' : 'text-gray-700 hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 hover:text-red-700'} transition-all duration-200 group/item transform hover:scale-[1.02] ${currentActivityPage === item.key ? isDarkMode ? 'bg-gradient-to-r from-red-500/30 to-red-600/30 text-white' : 'bg-gradient-to-r from-red-50 to-red-100 text-red-700' : ''}`}
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <div className="flex items-center">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 ${isDarkMode ? 'bg-red-500/20 text-red-300' : 'bg-red-100 text-red-600'} group-hover/item:bg-red-500/40 group-hover/item:scale-110 transition-all duration-200 shadow-sm`}>
                            <span className="text-base">{item.icon}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="font-medium text-sm block">{item.name}</span>
                          </div>
                          {currentActivityPage === item.key && (
                            <div className={`w-2 h-2 rounded-full ${isDarkMode ? 'bg-red-400' : 'bg-red-600'}`}></div>
                          )}
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Quản lý người dùng */}
            <a
              href="/admin/users"
              className={`${isDarkMode ? 'text-gray-300 hover:text-white hover:bg-gray-800/50' : 'text-gray-700 hover:text-green-600 hover:bg-green-50/50'} ${isSidebarOpen ? 'justify-start px-4' : 'justify-center px-2'} py-3 rounded-lg text-sm font-medium flex items-center transition-all duration-200 group relative`}
              title="Quản lý người dùng"
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isDarkMode ? 'bg-green-500/20 text-green-300' : 'bg-green-100/70 text-green-600'} group-hover:bg-green-500/30 group-hover:scale-105 transition-all duration-200`}>
                <span className="text-base">👤</span>
              </div>
              {isSidebarOpen && <span className="ml-3">Quản lý người dùng</span>}
            </a>

            {/* Tiêu chí */}
            <a
              href="/admin/criteria"
              className={`${isDarkMode ? 'text-gray-300 hover:text-white hover:bg-gray-800/50' : 'text-gray-700 hover:text-orange-600 hover:bg-orange-50/50'} ${isSidebarOpen ? 'justify-start px-4' : 'justify-center px-2'} py-3 rounded-lg text-sm font-medium flex items-center transition-all duration-200 group relative`}
              title="Tiêu chí"
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isDarkMode ? 'bg-orange-500/20 text-orange-300' : 'bg-orange-100/70 text-orange-600'} group-hover:bg-orange-500/30 group-hover:scale-105 transition-all duration-200`}>
                <span className="text-base">📋</span>
              </div>
              {isSidebarOpen && <span className="ml-3">Tiêu chí</span>}
            </a>

            {/* Quản lý yêu cầu liên hệ - Chỉ hiển thị cho SUPER_ADMIN và CLUB_LEADER */}
            {['SUPER_ADMIN', 'CLUB_LEADER'].includes(user?.role || '') && (
              <a
                href="/admin/contact-requests"
                className={`${isDarkMode ? 'text-gray-300 hover:text-white hover:bg-gray-800/50' : 'text-gray-700 hover:text-pink-600 hover:bg-pink-50/50'} ${isSidebarOpen ? 'justify-start px-4' : 'justify-center px-2'} py-3 rounded-lg text-sm font-medium flex items-center transition-all duration-200 group relative`}
                title="Yêu cầu liên hệ"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isDarkMode ? 'bg-pink-500/20 text-pink-300' : 'bg-pink-100/70 text-pink-600'} group-hover:bg-pink-500/30 group-hover:scale-105 transition-all duration-200`}>
                  <span className="text-base">📞</span>
                </div>
                {isSidebarOpen && <span className="ml-3">Yêu cầu liên hệ</span>}
              </a>
            )}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className={`border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} p-4 space-y-3`}>
          {/* Dark mode toggle */}
          <button
            onClick={toggleDarkMode}
            className={`w-full ${isDarkMode ? 'text-yellow-300 hover:text-yellow-200 hover:bg-gray-800/50' : 'text-gray-500 hover:text-yellow-600 hover:bg-yellow-50/50'} ${isSidebarOpen ? 'justify-start px-4' : 'justify-center px-2'} py-3 rounded-lg transition-all duration-200 group flex items-center`}
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
            {isSidebarOpen && <span className="ml-3 text-sm font-medium">Dark Mode</span>}
          </button>

          {/* Notifications - Modern Design */}
          <div className="relative dropdown-container overflow-visible" ref={notificationsRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={`w-full ${isDarkMode ? 'text-gray-300 hover:text-white hover:bg-gray-800/50' : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50/50'} ${isSidebarOpen ? 'justify-start px-4' : 'justify-center px-2'} py-3 rounded-lg relative transition-all duration-200 group flex items-center ${showNotifications ? isDarkMode ? 'bg-blue-500/20' : 'bg-blue-50' : ''}`}
              title="Thông báo"
            >
              <div className="relative">
                <svg className={`h-5 w-5 group-hover:scale-110 transition-transform duration-300 ${showNotifications ? 'text-blue-600' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className={`absolute -top-1 -right-1 ${isDarkMode ? 'bg-red-400 text-white' : 'bg-red-500 text-white'} text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold border-2 ${isDarkMode ? 'border-gray-900' : 'border-white'} shadow-md animate-pulse`}>
                    {unreadCount}
                  </span>
                )}
              </div>
              {isSidebarOpen && <span className="ml-3 text-sm font-medium">Thông báo</span>}
            </button>

            {showNotifications && (
              <div className={`absolute ${isSidebarOpen ? 'bottom-full left-0 mb-2' : 'bottom-0 left-full ml-2'} w-80 ${isDarkMode ? 'bg-gray-800/95 backdrop-blur-md border border-blue-500/30' : 'bg-white/95 backdrop-blur-md border border-blue-200/50'} rounded-2xl shadow-2xl overflow-hidden dropdown-right max-h-[500px]`} style={{position: 'absolute', zIndex: 100001}}>
                {/* Header */}
                <div className={`px-5 py-4 ${isDarkMode ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-gray-700' : 'bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-100'}`}>
                  <div className="flex items-center justify-between">
                    <h3 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} flex items-center`}>
                      <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                      Thông báo
                    </h3>
                    {unreadCount > 0 && (
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${isDarkMode ? 'bg-red-500/30 text-red-300 border border-red-500/50' : 'bg-red-100 text-red-600 border border-red-200'}`}>
                        {unreadCount} mới
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Notifications List */}
                <div className="p-3 max-h-[400px] overflow-y-auto scrollbar-hide">
                  {notifications.length === 0 ? (
                    <div className="text-center py-8">
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Không có thông báo nào
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {notifications.map((notification, index) => (
                        <div
                          key={notification.id}
                          className={`p-4 rounded-xl transition-all duration-200 transform hover:scale-[1.02] ${!notification.isRead ? (isDarkMode ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-blue-50 border border-blue-200') : (isDarkMode ? 'bg-gray-700/50 border border-gray-600/50 hover:bg-gray-700 hover:border-blue-500/30' : 'bg-gray-50 border border-gray-200 hover:bg-white hover:border-blue-200 hover:shadow-md')} group/notif`}
                          style={{ animationDelay: `${index * 0.05}s` }}
                        >
                          <div className="flex items-start">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mr-3 flex-shrink-0 ${
                              notification.type === 'success' ? isDarkMode ? 'bg-green-500/20 text-green-300' : 'bg-green-100 text-green-600' :
                              notification.type === 'warning' ? isDarkMode ? 'bg-yellow-500/20 text-yellow-300' : 'bg-yellow-100 text-yellow-600' :
                              notification.type === 'error' ? isDarkMode ? 'bg-red-500/20 text-red-300' : 'bg-red-100 text-red-600' :
                              isDarkMode ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-600'
                            } group-hover/notif:scale-110 transition-all duration-200 shadow-sm`}>
                              {notification.type === 'success' ? '✓' : notification.type === 'warning' ? '⚠' : notification.type === 'error' ? '✕' : 'ℹ'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-900'} mb-1 ${!notification.isRead ? 'font-bold' : ''}`}>
                                {notification.title || notification.message}
                              </p>
                              {notification.title && (
                                <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-2 line-clamp-2`}>
                                  {notification.message}
                                </p>
                              )}
                              <div className="flex items-center gap-3 flex-wrap">
                                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} flex items-center`}>
                                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  {formatDate(notification.createdAt)}
                                </p>
                                {notification.createdBy ? (
                                  <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} flex items-center`}>
                                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    {notification.createdBy.name}
                                    {notification.createdBy.studentId && (
                                      <span className="ml-1 opacity-75">({notification.createdBy.studentId})</span>
                                    )}
                                  </p>
                                ) : (
                                  <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} flex items-center`}>
                                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Hệ thống
                                  </p>
                                )}
                              </div>
                            </div>
                            {!notification.isRead && (
                              <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${isDarkMode ? 'bg-blue-500 text-white' : 'bg-blue-500 text-white'}`}>
                                Mới
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Footer */}
                {notifications.length > 0 && (
                  <div className={`px-4 py-3 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                    <a
                      href="/admin/notifications"
                      className={`text-center block text-sm font-semibold ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'} transition-colors duration-200`}
                    >
                      Xem tất cả thông báo →
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Profile dropdown - Modern Design */}
          <div className="relative dropdown-container overflow-visible" ref={profileDropdownRef}>
            <button
              onClick={() => toggleDropdown('profile')}
              className={`w-full flex items-center ${isSidebarOpen ? 'justify-between px-4' : 'justify-center px-2'} py-3 rounded-lg transition-all duration-200 group ${activeDropdown === 'profile' ? isDarkMode ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20' : 'bg-gradient-to-r from-blue-50 to-purple-50' : isDarkMode ? 'text-gray-300 hover:text-white hover:bg-gray-800/50' : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50/50'}`}
            >
              <div className="flex items-center flex-1 min-w-0">
                <div className="relative">
                  {user?.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt="Avatar"
                      className={`w-10 h-10 rounded-xl object-cover border-2 ${isDarkMode ? 'border-blue-400/50' : 'border-blue-300/50'} group-hover:border-blue-500 group-hover:scale-105 transition-all duration-200 shadow-md ${activeDropdown === 'profile' ? 'ring-2 ring-blue-400/50' : ''}`}
                    />
                  ) : (
                    <div className={`w-10 h-10 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center border-2 ${isDarkMode ? 'border-blue-400/50' : 'border-blue-300/50'} group-hover:border-blue-500 group-hover:scale-105 transition-all duration-200 shadow-md ${activeDropdown === 'profile' ? 'ring-2 ring-blue-400/50' : ''}`}>
                      <span className="text-white text-sm font-bold">
                        {user?.name?.charAt(0) || 'A'}
                      </span>
                    </div>
                  )}
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${isDarkMode ? 'bg-green-400' : 'bg-green-500'} rounded-full border-2 ${isDarkMode ? 'border-gray-900' : 'border-white'} shadow-sm`}></div>
                </div>
                {isSidebarOpen && (
                  <div className="ml-3 text-left min-w-0 flex-1">
                    <p className="text-sm font-bold truncate">
                      {user?.name || 'Admin'}
                    </p>
                    <p className={`text-xs truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {getRoleDisplayName(user?.role || 'ADMIN')}
                    </p>
                  </div>
                )}
              </div>
              {isSidebarOpen && (
                <svg className={`h-5 w-5 flex-shrink-0 transition-all duration-300 ${activeDropdown === 'profile' ? 'rotate-180 text-blue-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </button>

            {activeDropdown === 'profile' && (
              <div className={`absolute ${isSidebarOpen ? 'bottom-full left-0 mb-2' : 'bottom-0 left-full ml-2'} w-80 ${isDarkMode ? 'bg-gray-800/95 backdrop-blur-md border border-blue-500/30' : 'bg-white/95 backdrop-blur-md border border-blue-200/50'} rounded-2xl shadow-2xl overflow-hidden dropdown-right`} style={{position: 'absolute', zIndex: 100001}}>
                {/* Profile Header */}
                <div className={`px-5 py-4 ${isDarkMode ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-gray-700' : 'bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-100'}`}>
                  <div className="flex items-center space-x-4">
                    {user?.avatarUrl ? (
                      <div className="relative">
                        <img
                          src={user.avatarUrl}
                          alt="Avatar"
                          className="w-14 h-14 rounded-2xl object-cover ring-4 ring-blue-500/20 shadow-lg"
                        />
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-3 border-white shadow-md"></div>
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center ring-4 ring-blue-500/20 shadow-lg">
                          <span className="text-white text-lg font-bold">
                            {user?.name?.charAt(0) || 'A'}
                          </span>
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-3 border-white shadow-md"></div>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} truncate mb-1`}>
                        {user?.name || 'Admin'}
                      </p>
                      <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} truncate mb-2`}>
                        {user?.email || 'admin@example.com'}
                      </p>
                      <div className="flex items-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${isDarkMode ? 'bg-gray-700/50 text-gray-200 border border-gray-600' : 'bg-white text-gray-700 border border-gray-200 shadow-sm'}`}>
                          <span className={`w-2 h-2 ${isDarkMode ? 'bg-green-400' : 'bg-green-500'} rounded-full mr-2`}></span>
                          {getRoleDisplayName(user?.role || 'ADMIN')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Menu Items */}
                <div className="p-3">
                  <div className="space-y-1">
                    <a 
                      href="/admin/profile" 
                      className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 group/item transform hover:scale-[1.02] ${isDarkMode ? 'text-gray-300 hover:bg-gradient-to-r hover:from-blue-500/30 hover:to-blue-600/30 hover:text-white' : 'text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 hover:text-blue-700'}`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mr-3 ${isDarkMode ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-600'} group-hover/item:bg-blue-500/40 group-hover/item:scale-110 transition-all duration-200 shadow-sm`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm">Hồ sơ cá nhân</p>
                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Quản lý thông tin cá nhân</p>
                      </div>
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </a>
                    
                    <a 
                      href="/admin/settings" 
                      className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 group/item transform hover:scale-[1.02] ${isDarkMode ? 'text-gray-300 hover:bg-gradient-to-r hover:from-gray-700/50 hover:to-gray-600/50 hover:text-white' : 'text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 hover:text-gray-900'}`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mr-3 ${isDarkMode ? 'bg-gray-700/30 text-gray-300' : 'bg-gray-100 text-gray-600'} group-hover/item:bg-gray-500/40 group-hover/item:scale-110 transition-all duration-200 shadow-sm`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm">Cài đặt</p>
                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Tùy chỉnh tài khoản</p>
                      </div>
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </a>
                  </div>
                </div>
                
                {/* Logout Button */}
                <div className={`px-4 py-3 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                  <a
                    href="/auth/login"
                    className={`flex items-center justify-center w-full py-3 text-sm font-semibold rounded-xl transition-all duration-200 transform hover:scale-[1.02] ${isDarkMode ? 'text-red-300 hover:text-red-200 hover:bg-gradient-to-r hover:from-red-500/20 hover:to-red-600/20 border border-red-500/30' : 'text-red-600 hover:text-red-700 hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 border border-red-200'}`}
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Đăng xuất</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile menu button - Top bar */}
      <nav className={`lg:hidden fixed top-0 left-0 right-0 ${isDarkMode ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white' : 'bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30 text-gray-900'} shadow-lg z-[9997] border-b ${isDarkMode ? 'border-gray-700' : 'border-blue-100/50'}`}>
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center">
            <img 
              src="/logo_clb_sv_5T.jpg" 
              alt="CLB Logo" 
              className="w-10 h-10 rounded-xl border border-blue-200/50"
            />
            <div className="ml-3">
              <h1 className={`text-sm font-bold bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent`}>
                CLB SV 5 Tốt
              </h1>
            </div>
          </div>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`${isDarkMode ? 'text-gray-300 hover:text-white hover:bg-gray-800/50' : 'text-gray-700 hover:text-gray-900 hover:bg-white/50'} p-2 rounded-lg transition-all duration-300`}
          >
            <svg className={`h-6 w-6 transition-transform duration-200 ${isMenuOpen ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </nav>

      {/* Spacer for mobile top bar */}
      <div className="lg:hidden h-16"></div>
    </>
  );
}
