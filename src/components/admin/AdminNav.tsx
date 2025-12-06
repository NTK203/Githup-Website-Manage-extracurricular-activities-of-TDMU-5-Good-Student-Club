'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useDarkMode } from '@/hooks/useDarkMode';
import { 
  Home, 
  BarChart3, 
  Bell, 
  Send, 
  Users, 
  FileEdit, 
  Activity, 
  Shield, 
  Plus, 
  Calendar, 
  CalendarDays, 
  List, 
  Filter, 
  TrendingUp, 
  Target, 
  User, 
  ClipboardList, 
  Phone,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Menu as MenuIcon,
  Sun,
  Moon,
  Clock,
  Info,
  ArrowRight,
  LogOut,
  Settings,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Newspaper,
  Heart,
  MessageCircle,
  Share2,
  Sparkles,
  Loader2,
  type LucideIcon
} from 'lucide-react';

export default function AdminNav() {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const [currentMemberPage, setCurrentMemberPage] = useState<string | null>(null);
  const [currentActivityPage, setCurrentActivityPage] = useState<string | null>(null);
  const [notificationDropdownPosition, setNotificationDropdownPosition] = useState({ top: 0, left: 0 });
  
  // Refs for dropdown containers
  const memberDropdownRef = useRef<HTMLDivElement>(null);
  const activityDropdownRef = useRef<HTMLDivElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const notificationMenuRef = useRef<HTMLDivElement>(null);
  const notificationsListRef = useRef<HTMLDivElement>(null);
  const viewNotificationsButtonRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Helper functions for dropdown management
  const toggleDropdown = (dropdownName: string) => {
    console.log('Toggle dropdown:', dropdownName, 'Current:', activeDropdown);
    setActiveDropdown(activeDropdown === dropdownName ? null : dropdownName);
  };

  const closeAllDropdowns = () => {
    setActiveDropdown(null);
    setShowNotifications(false);
    setShowNotificationMenu(false);
  };

  const handleMemberPageChange = (item: { key: string; name: string; href: string; icon: LucideIcon }) => {
    setCurrentMemberPage(item.key);
    localStorage.setItem('currentMemberPage', item.key);
    setActiveDropdown(null);
  };

  const handleActivityPageChange = (item: { key: string; name: string; href: string; icon: LucideIcon }) => {
    setCurrentActivityPage(item.key);
    localStorage.setItem('currentActivityPage', item.key);
    setActiveDropdown(null);
  };

  const handleNotificationPageChange = (item: { key: string; name: string; href: string; icon: LucideIcon }) => {
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
      if (notificationsListRef.current && !notificationsListRef.current.contains(target) && viewNotificationsButtonRef.current && !viewNotificationsButtonRef.current.contains(target) && notificationMenuRef.current && !notificationMenuRef.current.contains(target)) {
        setShowNotifications(false);
      }
      if (notificationMenuRef.current && !notificationMenuRef.current.contains(target) && viewNotificationsButtonRef.current && !viewNotificationsButtonRef.current.contains(target) && notificationsListRef.current && !notificationsListRef.current.contains(target)) {
        setShowNotificationMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Calculate notification dropdown position
  useEffect(() => {
    if (showNotifications && viewNotificationsButtonRef.current) {
      const updatePosition = () => {
        if (viewNotificationsButtonRef.current) {
          const buttonRect = viewNotificationsButtonRef.current.getBoundingClientRect();
          const sidebarWidth = isSidebarOpen ? 288 : 80; // w-72 = 288px, w-20 = 80px
          const dropdownWidth = 320; // w-80 = 320px
          
          // Calculate position: show to the right of sidebar when open, or to the right of button when closed
          let left = isSidebarOpen ? sidebarWidth + 8 : buttonRect.right + 8;
          
          // Ensure dropdown doesn't go off screen
          if (left + dropdownWidth > window.innerWidth) {
            left = window.innerWidth - dropdownWidth - 8;
          }
          
          setNotificationDropdownPosition({
            top: buttonRect.bottom + 8,
            left: left
          });
        }
      };
      
      updatePosition();
      
      // Update on scroll and resize
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [showNotifications, isSidebarOpen]);

  const memberMenuItems = [
    { name: 'Danh Sách Thành Viên CLB', href: '/admin/members', icon: Users, key: 'members' },
    { name: 'Xét Duyệt Thành Viên', href: '/admin/memberships', icon: FileEdit, key: 'memberships' },
    { name: 'Trạng Thái Thành Viên', href: '/admin/members/status', icon: Activity, key: 'status' },
    { name: 'Phân quyền', href: '/admin/members/permissions', icon: Shield, key: 'permissions' },
    { name: 'Thêm Thành Viên Mới', href: '/admin/members/add', icon: Plus, key: 'add' },
  ];

  const activityMenuItems = [
    { name: 'Tạo hoạt động 1 ngày', href: '/admin/activities/create-single', icon: Calendar, key: 'create-single' },
    { name: 'Tạo hoạt động nhiều ngày', href: '/admin/activities/create-multiple', icon: CalendarDays, key: 'create-multiple' },
  ];

  const notificationMenuItems = [
    { name: 'Gửi Thông Báo', href: '/admin/notifications/send', icon: Bell, key: 'send' },
    { name: 'Thông Báo Đã Gửi', href: '/admin/notifications/sent', icon: Send, key: 'sent' },
  ];

  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingMembershipsCount, setPendingMembershipsCount] = useState(0);
  const [showNewsDropdown, setShowNewsDropdown] = useState(false);
  const [newsPosts, setNewsPosts] = useState<any[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [interactingPosts, setInteractingPosts] = useState<Set<string>>(new Set());

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

  // Load pending memberships count
  const loadPendingMembershipsCount = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/memberships?status=PENDING&limit=1', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data && data.data.pagination) {
          setPendingMembershipsCount(data.data.pagination.totalCount || 0);
        }
      }
    } catch (error) {
      console.error('Error loading pending memberships count:', error);
    }
  };

  // Load notifications on mount and when dropdown opens
  useEffect(() => {
    if (user) {
      loadUnreadCount();
      loadPendingMembershipsCount();
      loadNewsPosts();
      if (showNotifications) {
        loadNotifications();
      }

      // Poll for new notifications and pending memberships every 30 seconds
      const notificationInterval = setInterval(() => {
        loadUnreadCount();
        loadPendingMembershipsCount();
        if (showNotifications) {
          loadNotifications();
        }
        if (showNewsDropdown) {
          loadNewsPosts();
        }
      }, 30000);

      return () => clearInterval(notificationInterval);
    }
  }, [user, showNotifications, showNewsDropdown]);

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

  // Load news posts
  const loadNewsPosts = async () => {
    try {
      setNewsLoading(true);
      const token = localStorage.getItem('token');
      if (!token) return;

      // TODO: Replace with actual API endpoint when ready
      const response = await fetch('/api/news?limit=10', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.posts) {
          setNewsPosts(data.data.posts);
        }
      } else {
        // For now, use empty array if API doesn't exist
        setNewsPosts([]);
      }
    } catch (error) {
      console.error('Error loading news posts:', error);
      // Use empty array on error
      setNewsPosts([]);
    } finally {
      setNewsLoading(false);
    }
  };

  // Handle like/unlike post
  const handleLikePost = async (postId: string, isLiked: boolean) => {
    if (interactingPosts.has(postId)) return;
    
    try {
      setInteractingPosts(prev => new Set(prev).add(postId));
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/news/${postId}/${isLiked ? 'unlike' : 'like'}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Update local state
          setNewsPosts(prev =>
            prev.map(post =>
              post._id === postId
                ? {
                    ...post,
                    isLiked: !isLiked,
                    likesCount: isLiked ? post.likesCount - 1 : post.likesCount + 1
                  }
                : post
            )
          );
        }
      }
    } catch (error) {
      console.error('Error liking post:', error);
    } finally {
      setInteractingPosts(prev => {
        const newSet = new Set(prev);
        newSet.delete(postId);
        return newSet;
      });
    }
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
        className={`fixed left-0 top-0 h-screen ${isSidebarOpen ? 'w-72' : 'w-20'} ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-blue-600 border-blue-700'} border-r z-[9999] sidebar-transition flex flex-col overflow-visible ${
          isMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        style={{
          '--sidebar-width': isSidebarOpen ? '288px' : '80px'
        } as React.CSSProperties}
      >
        {/* Sidebar Header */}
        <div className={`flex items-center ${isSidebarOpen ? 'justify-between' : 'justify-center'} p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-blue-700'}`}>
          {isSidebarOpen && (
            <div className="flex items-center group flex-shrink-0">
              <img 
                src="/logo_clb_sv_5T.jpg" 
                alt="CLB Sinh viên 5 Tốt TDMU" 
                className={`w-10 h-10 rounded-xl border ${isDarkMode ? 'border-gray-600/50' : 'border-blue-500/50'} group-hover:scale-105 transition-all duration-300`}
              />
              <div className="ml-3">
                <h1 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-white'}`}>
                  CLB SV 5 Tốt
                </h1>
                <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-blue-100'}`}>
                  TDMU
                </p>
              </div>
            </div>
          )}
          {!isSidebarOpen && (
            <img 
              src="/logo_clb_sv_5T.jpg" 
              alt="CLB Logo" 
              className={`w-10 h-10 rounded-xl border ${isDarkMode ? 'border-gray-600/50' : 'border-gray-300/50'}`}
            />
          )}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`p-2 rounded-lg transition-all duration-200 ${isDarkMode ? 'text-white hover:bg-gray-700' : 'text-white hover:bg-blue-700'}`}
            title={isSidebarOpen ? 'Thu gọn' : 'Mở rộng'}
          >
            {isSidebarOpen ? (
              <ChevronLeft size={16} className={isDarkMode ? 'text-white' : 'text-white'} strokeWidth={1.5} />
            ) : (
              <ChevronRight size={16} className={isDarkMode ? 'text-white' : 'text-white'} strokeWidth={1.5} />
            )}
          </button>
        </div>

        {/* Sidebar Content - Scrollable */}
        <div className="flex-1 overflow-y-auto overflow-x-visible scrollbar-hide py-4">
          <nav className="space-y-1 px-3">
            {/* Trang Chủ */}
            <a
              href="/admin/dashboard"
              className={`${isDarkMode ? 'text-white hover:bg-gray-700' : 'text-white hover:bg-blue-700'} ${isSidebarOpen ? 'justify-start px-3' : 'justify-center px-2'} py-2 rounded-lg text-sm font-medium flex items-center transition-all duration-200`}
              title="Trang Chủ"
            >
              <Home size={16} className={isDarkMode ? 'text-white' : 'text-white'} strokeWidth={1.5} />
              {isSidebarOpen && <span className={`ml-2 text-sm ${isDarkMode ? 'text-white' : 'text-white'}`}>Trang Chủ</span>}
            </a>

            {/* Thành viên CLB Dropdown - Accordion Style */}
            <div className="relative dropdown-container overflow-visible" ref={memberDropdownRef}>
              <button
                onClick={() => toggleDropdown('member')}
                className={`w-full ${isDarkMode ? 'text-white hover:bg-gray-700' : 'text-white hover:bg-blue-700'} ${isSidebarOpen ? 'justify-between px-3' : 'justify-center px-2'} py-2 rounded-lg text-sm font-medium flex items-center transition-all duration-200 ${activeDropdown === 'member' ? (isDarkMode ? 'bg-gray-700' : 'bg-blue-700') : ''}`}
                title={currentMemberPage ? memberMenuItems.find(item => item.key === currentMemberPage)?.name || 'Thành viên CLB' : 'Thành viên CLB'}
              >
                <div className="flex items-center flex-1 min-w-0 relative">
                  <Users size={18} className={isDarkMode ? 'text-white' : 'text-white'} strokeWidth={1.5} />
                  {isSidebarOpen && (
                    <span className={`ml-2 text-sm font-semibold truncate ${isDarkMode ? 'text-white' : 'text-white'}`}>
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
                  {!isSidebarOpen && pendingMembershipsCount > 0 && (
                    <span className={`absolute top-0.5 right-1 ${isDarkMode ? 'bg-red-400 text-white' : 'bg-red-600 text-white'} text-[10px] font-bold leading-none rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 border-2 ${isDarkMode ? 'border-gray-800' : 'border-white'} shadow-lg z-20`}>
                      {pendingMembershipsCount > 9 ? '9+' : pendingMembershipsCount}
                    </span>
                  )}
                  {isSidebarOpen && pendingMembershipsCount > 0 && (
                    <span className={`absolute -top-1 right-0 ${isDarkMode ? 'bg-red-400 text-white' : 'bg-red-600 text-white'} text-[10px] font-bold leading-none rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 border-2 ${isDarkMode ? 'border-gray-800' : 'border-white'} shadow-lg`}>
                      {pendingMembershipsCount > 99 ? '99+' : pendingMembershipsCount}
                    </span>
                  )}
                </div>
                {isSidebarOpen && (
                  <ChevronDown size={16} className={`flex-shrink-0 transition-all duration-300 ${isDarkMode ? 'text-white' : 'text-white'} ${activeDropdown === 'member' ? 'rotate-180' : ''}`} strokeWidth={1.5} />
                )}
              </button>
              
              {/* Accordion Dropdown */}
              <div className={`overflow-hidden transition-all duration-300 ${activeDropdown === 'member' ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className={`mt-2 ${isDarkMode ? 'bg-gray-700' : 'bg-blue-700'} rounded-lg py-2 dropdown-accordion`}>
                  <div className="px-2 space-y-1">
                    {memberMenuItems.map((item, index) => (
                      <a
                        key={item.name}
                        href={item.href}
                        onClick={() => handleMemberPageChange(item)}
                        className={`block px-3 py-2 rounded-lg ${isDarkMode ? 'text-white hover:bg-gray-600' : 'text-white hover:bg-blue-500'} transition-all duration-200 ${currentMemberPage === item.key ? (isDarkMode ? 'bg-gray-600' : 'bg-blue-500') : ''}`}
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <div className="flex items-center">
                          <item.icon size={16} className={isDarkMode ? 'text-white' : 'text-white'} strokeWidth={1.5} />
                          <div className="flex-1 min-w-0 ml-2">
                            <span className={`font-medium text-sm block ${isDarkMode ? 'text-white' : 'text-white'}`}>{item.name}</span>
                          </div>
                          {item.key === 'memberships' && pendingMembershipsCount > 0 && (
                            <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${isDarkMode ? 'bg-red-500' : 'bg-red-500'} text-white min-w-[18px] text-center`}>
                              {pendingMembershipsCount > 99 ? '99+' : pendingMembershipsCount}
                            </span>
                          )}
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Tạo hoạt động Dropdown - Accordion Style */}
            <div className="relative dropdown-container overflow-visible" ref={activityDropdownRef}>
              <button
                onClick={() => toggleDropdown('activity')}
                className={`w-full ${isDarkMode ? 'text-white hover:bg-gray-700' : 'text-white hover:bg-blue-700'} ${isSidebarOpen ? 'justify-between px-3' : 'justify-center px-2'} py-2 rounded-lg text-sm font-medium flex items-center transition-all duration-200 ${activeDropdown === 'activity' ? (isDarkMode ? 'bg-gray-700' : 'bg-blue-700') : ''}`}
                title={currentActivityPage ? activityMenuItems.find(item => item.key === currentActivityPage)?.name || 'Tạo hoạt động' : 'Tạo hoạt động'}
              >
                <div className="flex items-center flex-1 min-w-0">
                  <Target size={18} className={isDarkMode ? 'text-white' : 'text-white'} strokeWidth={1.5} />
                  {isSidebarOpen && (
                    <span className={`ml-2 text-sm font-semibold truncate ${isDarkMode ? 'text-white' : 'text-white'}`}>
                      {currentActivityPage ? 
                        (currentActivityPage === 'create-single' ? 'Tạo 1 ngày' :
                         currentActivityPage === 'create-multiple' ? 'Tạo nhiều ngày' :
                         activityMenuItems.find(item => item.key === currentActivityPage)?.name || 'Tạo hoạt động') 
                        : 'Tạo hoạt động'
                      }
                    </span>
                  )}
                </div>
                {isSidebarOpen && (
                  <ChevronDown size={16} className={`flex-shrink-0 transition-all duration-300 ${isDarkMode ? 'text-white' : 'text-white'} ${activeDropdown === 'activity' ? 'rotate-180' : ''}`} strokeWidth={1.5} />
                )}
              </button>
              
              {/* Accordion Dropdown */}
              <div className={`overflow-hidden transition-all duration-300 ${activeDropdown === 'activity' ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className={`mt-2 ${isDarkMode ? 'bg-gray-700' : 'bg-blue-700'} rounded-lg py-2 dropdown-accordion`}>
                  <div className="px-2 space-y-1">
                    {activityMenuItems.map((item, index) => (
                      <a
                        key={item.name}
                        href={item.href}
                        onClick={() => handleActivityPageChange(item)}
                        className={`block px-3 py-2 rounded-lg ${isDarkMode ? 'text-white hover:bg-gray-600' : 'text-white hover:bg-blue-500'} transition-all duration-200 ${currentActivityPage === item.key ? (isDarkMode ? 'bg-gray-600' : 'bg-blue-500') : ''}`}
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <div className="flex items-center">
                          <item.icon size={16} className={isDarkMode ? 'text-white' : 'text-white'} strokeWidth={1.5} />
                          <div className="flex-1 min-w-0 ml-2">
                            <span className={`font-medium text-sm block ${isDarkMode ? 'text-white' : 'text-white'}`}>{item.name}</span>
                          </div>
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
              className={`${isDarkMode ? 'text-white hover:bg-gray-700' : 'text-white hover:bg-blue-700'} ${isSidebarOpen ? 'justify-start px-3' : 'justify-center px-2'} py-2 rounded-lg text-sm font-medium flex items-center transition-all duration-200`}
              title="Quản lý người dùng"
            >
              <User size={16} className={isDarkMode ? 'text-white' : 'text-white'} strokeWidth={1.5} />
              {isSidebarOpen && <span className={`ml-2 text-sm ${isDarkMode ? 'text-white' : 'text-white'}`}>Quản lý người dùng</span>}
            </a>

            {/* Báo Cáo Thống Kê */}
            <a
              href="/admin/reports"
              className={`${isDarkMode ? 'text-white hover:bg-gray-700' : 'text-white hover:bg-blue-700'} ${isSidebarOpen ? 'justify-start px-3' : 'justify-center px-2'} py-2 rounded-lg text-sm font-medium flex items-center transition-all duration-200`}
              title="Báo Cáo Thống Kê"
            >
              <BarChart3 size={16} className={isDarkMode ? 'text-white' : 'text-white'} strokeWidth={1.5} />
              {isSidebarOpen && <span className={`ml-2 text-sm ${isDarkMode ? 'text-white' : 'text-white'}`}>Báo Cáo Thống Kê</span>}
            </a>

            {/* Bản tin - News */}
            <a
              href="/admin/news"
              className={`${isDarkMode ? 'text-white hover:bg-gray-700' : 'text-white hover:bg-blue-700'} ${isSidebarOpen ? 'justify-start px-3' : 'justify-center px-2'} py-2 rounded-lg text-sm font-medium flex items-center transition-all duration-200`}
              title="Bản tin"
            >
              <Newspaper size={16} className={isDarkMode ? 'text-white' : 'text-white'} strokeWidth={1.5} />
              {isSidebarOpen && <span className={`ml-2 text-sm ${isDarkMode ? 'text-white' : 'text-white'}`}>Bản tin</span>}
            </a>

            {/* Thông báo Dropdown - Accordion Style */}
            <div className="relative dropdown-container overflow-visible" ref={notificationMenuRef}>
              <button
                onClick={() => {
                  const newMenuState = !showNotificationMenu;
                  setShowNotificationMenu(newMenuState);
                  // Only close notifications list when closing the menu
                  if (!newMenuState) {
                    setShowNotifications(false);
                  }
                }}
                className={`w-full ${isDarkMode ? 'text-white hover:bg-gray-700' : 'text-white hover:bg-blue-700'} ${isSidebarOpen ? 'justify-between px-3' : 'justify-center px-2'} py-2 rounded-lg text-sm font-medium flex items-center transition-all duration-200 relative ${showNotificationMenu ? (isDarkMode ? 'bg-gray-700' : 'bg-blue-700') : ''}`}
                title="Thông báo"
              >
                <div className="flex items-center flex-1 min-w-0 relative">
                  <Bell size={18} className={isDarkMode ? 'text-white' : 'text-white'} strokeWidth={1.5} />
                  {isSidebarOpen && (
                    <span className={`ml-2 text-sm font-semibold truncate ${isDarkMode ? 'text-white' : 'text-white'}`}>
                      Thông báo
                    </span>
                  )}
                  {!isSidebarOpen && unreadCount > 0 && (
                    <span className={`absolute top-0.5 right-1 ${isDarkMode ? 'bg-red-400 text-white' : 'bg-red-600 text-white'} text-[10px] font-bold leading-none rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 border-2 ${isDarkMode ? 'border-gray-800' : 'border-white'} shadow-lg z-20`}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                  {isSidebarOpen && unreadCount > 0 && (
                    <span className={`absolute -top-1 right-0 ${isDarkMode ? 'bg-red-400 text-white' : 'bg-red-600 text-white'} text-[10px] font-bold leading-none rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 border-2 ${isDarkMode ? 'border-gray-800' : 'border-white'} shadow-lg`}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </div>
                {isSidebarOpen && (
                  <ChevronDown size={16} className={`flex-shrink-0 transition-all duration-300 ${isDarkMode ? 'text-white' : 'text-white'} ${showNotificationMenu ? 'rotate-180' : ''}`} strokeWidth={1.5} />
                )}
              </button>
              
              {/* Accordion Dropdown */}
              <div className={`overflow-hidden transition-all duration-300 ${showNotificationMenu ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className={`mt-2 ${isDarkMode ? 'bg-gray-700' : 'bg-blue-700'} rounded-lg py-2 dropdown-accordion`}>
                  <div className="px-2 space-y-1">
                    {/* Button to show notifications list */}
                    <button
                      ref={viewNotificationsButtonRef}
                      onClick={() => {
                        setShowNotifications(!showNotifications);
                        setShowNotificationMenu(false);
                      }}
                      className={`w-full block px-3 py-2 rounded-lg ${isDarkMode ? 'text-white hover:bg-gray-600' : 'text-white hover:bg-blue-500'} transition-all duration-200 text-left`}
                    >
                      <div className="flex items-center gap-2">
                        <Bell size={16} className={isDarkMode ? 'text-white' : 'text-white'} strokeWidth={1.5} />
                        <div className="flex-1 min-w-0">
                          <span className={`font-medium text-sm block ${isDarkMode ? 'text-white' : 'text-white'}`}>Xem thông báo</span>
                        </div>
                        {unreadCount > 0 && (
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${isDarkMode ? 'bg-red-500' : 'bg-red-500'} text-white min-w-[20px] text-center`}>
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        )}
                      </div>
                    </button>
                    {notificationMenuItems.map((item, index) => (
                      <a
                        key={item.name}
                        href={item.href}
                        onClick={() => handleNotificationPageChange(item)}
                        className={`block px-3 py-2 rounded-lg ${isDarkMode ? 'text-white hover:bg-gray-600' : 'text-white hover:bg-blue-500'} transition-all duration-200`}
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <div className="flex items-center">
                          <item.icon size={16} className={isDarkMode ? 'text-white' : 'text-white'} strokeWidth={1.5} />
                          <div className="flex-1 min-w-0 ml-2">
                            <span className={`font-medium text-sm block ${isDarkMode ? 'text-white' : 'text-white'}`}>{item.name}</span>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Quản lý yêu cầu liên hệ - Chỉ hiển thị cho SUPER_ADMIN và CLUB_LEADER */}
            {['SUPER_ADMIN', 'CLUB_LEADER'].includes(user?.role || '') && (
              <a
                href="/admin/contact-requests"
                className={`${isDarkMode ? 'text-white hover:bg-gray-700' : 'text-white hover:bg-blue-700'} ${isSidebarOpen ? 'justify-start px-3' : 'justify-center px-2'} py-2 rounded-lg text-sm font-medium flex items-center transition-all duration-200`}
                title="Yêu cầu liên hệ"
              >
                <Phone size={16} className={isDarkMode ? 'text-white' : 'text-white'} strokeWidth={1.5} />
                {isSidebarOpen && <span className={`ml-2 text-sm ${isDarkMode ? 'text-white' : 'text-white'}`}>Yêu cầu liên hệ</span>}
              </a>
            )}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className={`border-t ${isDarkMode ? 'border-gray-700' : 'border-blue-700'} p-4 space-y-3`}>
          {/* Chuyển đổi chế độ tối/sáng */}
          <button
            onClick={toggleDarkMode}
            className={`w-full ${isDarkMode ? 'text-white hover:bg-gray-700' : 'text-white hover:bg-blue-700'} ${isSidebarOpen ? 'justify-start px-3' : 'justify-center px-2'} py-2 rounded-lg transition-all duration-200 flex items-center`}
            title={isDarkMode ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
          >
            {isDarkMode ? (
              <Sun size={16} className={isDarkMode ? 'text-white' : 'text-white'} strokeWidth={1.5} />
            ) : (
              <Moon size={16} className={isDarkMode ? 'text-white' : 'text-white'} strokeWidth={1.5} />
            )}
            {isSidebarOpen && <span className={`ml-2 text-sm font-medium ${isDarkMode ? 'text-white' : 'text-white'}`}>{isDarkMode ? 'Chế độ tối' : 'Chế độ sáng'}</span>}
          </button>

          {/* Profile dropdown - Modern Design */}
          <div className="relative dropdown-container overflow-visible" ref={profileDropdownRef}>
            <button
              onClick={() => toggleDropdown('profile')}
              className={`w-full flex items-center ${isDarkMode ? 'text-white hover:bg-gray-700' : 'text-white hover:bg-blue-700'} ${isSidebarOpen ? 'justify-between px-3' : 'justify-center px-2'} py-2 rounded-lg transition-all duration-200 ${activeDropdown === 'profile' ? (isDarkMode ? 'bg-gray-700' : 'bg-blue-700') : ''}`}
            >
              <div className="flex items-center flex-1 min-w-0">
                <div className="relative">
                  {user?.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt="Avatar"
                      className={`w-10 h-10 rounded-xl object-cover border-2 ${isDarkMode ? 'border-gray-600/50' : 'border-gray-300/50'} group-hover:border-gray-500 group-hover:scale-105 transition-all duration-200 shadow-md ${activeDropdown === 'profile' ? (isDarkMode ? 'ring-2 ring-gray-500/50' : 'ring-2 ring-gray-400/50') : ''}`}
                    />
                  ) : (
                    <div className={`w-10 h-10 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-xl flex items-center justify-center border-2 ${isDarkMode ? 'border-gray-600/50' : 'border-gray-300/50'} group-hover:border-gray-500 group-hover:scale-105 transition-all duration-200 shadow-md ${activeDropdown === 'profile' ? (isDarkMode ? 'ring-2 ring-gray-500/50' : 'ring-2 ring-gray-400/50') : ''}`}>
                      <span className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {user?.name?.charAt(0) || 'A'}
                      </span>
                    </div>
                  )}
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${isDarkMode ? 'bg-green-400' : 'bg-green-600'} rounded-full border-2 ${isDarkMode ? 'border-gray-900' : 'border-white'} shadow-sm`}></div>
                </div>
                {isSidebarOpen && (
                  <div className="ml-3 text-left min-w-0 flex-1">
                    <p className={`text-xs font-bold truncate ${isDarkMode ? 'text-white' : 'text-white'}`}>
                      {user?.name || 'Admin'}
                    </p>
                    <p className={`text-xs truncate ${isDarkMode ? 'text-gray-400' : 'text-blue-100'}`}>
                      {getRoleDisplayName(user?.role || 'ADMIN')}
                    </p>
                  </div>
                )}
              </div>
              {isSidebarOpen && (
                <ChevronDown size={16} className={`flex-shrink-0 transition-all duration-300 ${isDarkMode ? 'text-white' : 'text-white'} ${activeDropdown === 'profile' ? 'rotate-180' : ''}`} strokeWidth={1.5} />
              )}
            </button>

            {activeDropdown === 'profile' && (
              <div className={`absolute ${isSidebarOpen ? 'bottom-full left-0 mb-2' : 'bottom-0 left-full ml-2'} w-80 ${isDarkMode ? 'bg-gray-800/95 backdrop-blur-md border border-gray-600/30' : 'bg-white/95 backdrop-blur-md border border-gray-200/50'} rounded-2xl shadow-2xl overflow-hidden dropdown-right`} style={{position: 'absolute', zIndex: 100001}}>
                {/* Profile Header */}
                <div className={`px-5 py-4 ${isDarkMode ? 'bg-gradient-to-r from-gray-700 to-gray-600 border-b border-gray-600' : 'bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200'}`}>
                  <div className="flex items-center space-x-4">
                    {user?.avatarUrl ? (
                      <div className="relative">
                        <img
                          src={user.avatarUrl}
                          alt="Avatar"
                          className={`w-14 h-14 rounded-2xl object-cover ring-4 ${isDarkMode ? 'ring-gray-600/20' : 'ring-gray-300/20'} shadow-lg`}
                        />
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-600 rounded-full border-3 border-white shadow-md"></div>
                      </div>
                    ) : (
                      <div className="relative">
                        <div className={`w-14 h-14 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-2xl flex items-center justify-center ring-4 ${isDarkMode ? 'ring-gray-600/20' : 'ring-gray-300/20'} shadow-lg`}>
                          <span className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {user?.name?.charAt(0) || 'A'}
                          </span>
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-600 rounded-full border-3 border-white shadow-md"></div>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} truncate mb-1`}>
                        {user?.name || 'Admin'}
                      </p>
                      <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} truncate mb-2`}>
                        {user?.email || 'admin@example.com'}
                      </p>
                      <div className="flex items-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${isDarkMode ? 'bg-gray-600/50 text-gray-200 border border-gray-600' : 'bg-white text-gray-600 border border-gray-200 shadow-sm'}`}>
                          <span className={`w-2 h-2 ${isDarkMode ? 'bg-green-400' : 'bg-green-600'} rounded-full mr-2`}></span>
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
                      className={`flex items-center px-3 py-2 rounded-xl transition-all duration-200 group/item transform hover:scale-[1.02] ${isDarkMode ? 'text-gray-300 hover:bg-blue-600/30 hover:text-white' : 'text-gray-600 hover:bg-blue-50 hover:text-blue-700'}`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center mr-2 ${isDarkMode ? 'bg-blue-600/20 text-blue-300 group-hover/item:bg-blue-600/40' : 'bg-blue-100 text-blue-600 group-hover/item:bg-blue-200'} group-hover/item:scale-110 transition-all duration-200 shadow-sm`}>
                        <User size={12} className={isDarkMode ? 'text-blue-300' : 'text-blue-600'} strokeWidth={1.5} />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-xs">Hồ sơ cá nhân</p>
                        <p className={`text-[10px] ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Quản lý thông tin cá nhân</p>
                      </div>
                      <ArrowRight size={10} className="text-gray-400" strokeWidth={1.5} />
                    </a>
                    
                    <a 
                      href="/admin/settings" 
                      className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 group/item transform hover:scale-[1.02] ${isDarkMode ? 'text-gray-300 hover:bg-purple-600/30 hover:text-white' : 'text-gray-600 hover:bg-purple-50 hover:text-purple-700'}`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center mr-2 ${isDarkMode ? 'bg-purple-600/20 text-purple-300 group-hover/item:bg-purple-600/40' : 'bg-purple-100 text-purple-600 group-hover/item:bg-purple-200'} group-hover/item:scale-110 transition-all duration-200 shadow-sm`}>
                        <Settings size={12} className={isDarkMode ? 'text-purple-300' : 'text-purple-600'} strokeWidth={1.5} />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-xs">Cài đặt</p>
                        <p className={`text-[10px] ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Tùy chỉnh tài khoản</p>
                      </div>
                      <ArrowRight size={10} className="text-gray-400" strokeWidth={1.5} />
                    </a>
                  </div>
                </div>
                
                {/* Logout Button */}
                <div className={`px-3 py-2 border-t ${isDarkMode ? 'border-gray-600' : 'border-gray-100'}`}>
                  <a
                    href="/auth/login"
                    className={`flex items-center justify-center w-full py-2 text-xs font-semibold rounded-xl transition-all duration-200 transform hover:scale-[1.02] ${isDarkMode ? 'text-red-300 hover:text-red-200 hover:bg-gradient-to-r hover:from-red-600/20 hover:to-red-600/20 border border-red-600/30' : 'text-red-600 hover:text-red-600 hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 border border-red-200'}`}
                  >
                    <LogOut size={12} className={`mr-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`} strokeWidth={1.5} />
                    <span>Đăng xuất</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Notifications List Dropdown - Outside sidebar to prevent clipping */}
      {showNotifications && (
        <div 
          className={`fixed w-80 ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'} border-2 rounded-lg shadow-2xl overflow-hidden dropdown-right max-h-[500px]`} 
          style={{
            zIndex: 99999, 
            position: 'fixed',
            top: `${notificationDropdownPosition.top}px`,
            left: `${notificationDropdownPosition.left}px`
          }} 
          ref={notificationsListRef}
        >
          {/* Header */}
          <div className={`px-4 py-3 border-b-2 ${isDarkMode ? 'border-gray-600 bg-gradient-to-r from-gray-800 to-gray-700' : 'border-gray-300 bg-gradient-to-r from-gray-50 to-gray-100'}`}>
            <div className="flex items-center justify-between">
              <h3 className={`text-sm font-medium flex items-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                <Bell size={16} className={`mr-2 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`} strokeWidth={1.5} />
                Thông báo
              </h3>
              {unreadCount > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${isDarkMode ? 'bg-red-500' : 'bg-red-500'} text-white`}>
                  {unreadCount} mới
                </span>
              )}
            </div>
          </div>
          
          {/* Notifications List */}
          <div className={`p-3 max-h-[380px] overflow-y-auto scrollbar-hide ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
            {notifications.length === 0 ? (
              <div className="text-center py-8">
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-400'}`}>
                  Không có thông báo nào
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {notifications.map((notification, index) => (
                  <div
                    key={notification.id}
                    className={`p-3 rounded-lg border transition-colors duration-150 ${
                      isDarkMode 
                        ? `border-gray-600 ${!notification.isRead ? 'bg-gradient-to-r from-gray-700/80 to-gray-700/50' : 'bg-gray-700/30 hover:bg-gray-700/50'}`
                        : `border-gray-200 ${!notification.isRead ? 'bg-gradient-to-r from-blue-50/80 to-blue-50/50' : 'bg-white hover:bg-blue-50/30'}`
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-none flex items-center justify-center flex-shrink-0 ${
                        notification.type === 'success' ? (isDarkMode ? 'bg-green-900/50' : 'bg-green-100') :
                        notification.type === 'warning' ? (isDarkMode ? 'bg-yellow-900/50' : 'bg-yellow-100') :
                        notification.type === 'error' ? (isDarkMode ? 'bg-red-900/50' : 'bg-red-100') :
                        (isDarkMode ? 'bg-gray-700/50' : 'bg-gray-100')
                      }`}>
                        {notification.type === 'success' ? (
                          <CheckCircle2 size={14} className={isDarkMode ? 'text-green-400' : 'text-green-600'} strokeWidth={1.5} />
                        ) : notification.type === 'warning' ? (
                          <AlertTriangle size={14} className={isDarkMode ? 'text-yellow-400' : 'text-yellow-600'} strokeWidth={1.5} />
                        ) : notification.type === 'error' ? (
                          <XCircle size={14} className={isDarkMode ? 'text-red-400' : 'text-red-600'} strokeWidth={1.5} />
                        ) : (
                          <Info size={14} className={isDarkMode ? 'text-gray-300' : 'text-gray-700'} strokeWidth={1.5} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className={`text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-900'} ${!notification.isRead ? 'font-semibold' : 'font-normal'}`}>
                          {notification.title || notification.message}
                        </p>
                          {!notification.isRead && (
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${isDarkMode ? 'bg-blue-500' : 'bg-blue-500'} text-white`}>
                              Mới
                            </span>
                          )}
                        </div>
                        {notification.title && (
                          <p className={`text-xs mb-1.5 line-clamp-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            {notification.message}
                          </p>
                        )}
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <p className={`text-xs flex items-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            <Clock size={10} className={`mr-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} strokeWidth={1.5} />
                            {formatDate(notification.createdAt)}
                          </p>
                          {notification.createdBy ? (
                            <p className={`text-xs flex items-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              <User size={10} className={`mr-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} strokeWidth={1.5} />
                              {notification.createdBy.name}
                              {notification.createdBy.studentId && (
                                <span className="ml-1 opacity-70">({notification.createdBy.studentId})</span>
                              )}
                            </p>
                          ) : (
                            <p className={`text-xs flex items-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              <Info size={10} className={`mr-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} strokeWidth={1.5} />
                              Hệ thống
                            </p>
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
            <div className={`px-4 py-2.5 border-t-2 ${isDarkMode ? 'border-gray-600 bg-gradient-to-r from-gray-800 to-gray-700' : 'border-gray-300 bg-gradient-to-r from-gray-50 to-gray-100'}`}>
              <a
                href="/admin/notifications"
                className={`text-center block text-xs font-medium transition-colors duration-150 ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
              >
                Xem tất cả thông báo →
              </a>
            </div>
          )}
        </div>
      )}

      {/* Mobile menu button - Top bar */}
      <nav className={`lg:hidden fixed top-0 left-0 right-0 ${isDarkMode ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white' : 'bg-white text-gray-900'} shadow-lg z-[9997] border-b ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center">
            <img 
              src="/logo_clb_sv_5T.jpg" 
              alt="CLB Logo" 
              className={`w-10 h-10 rounded-xl border ${isDarkMode ? 'border-gray-600/50' : 'border-gray-300/50'}`}
            />
            <div className="ml-3">
              <h1 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                CLB SV 5 Tốt
              </h1>
            </div>
          </div>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`${isDarkMode ? 'text-gray-300 hover:text-white hover:bg-gray-800/50' : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'} p-2 rounded-lg transition-all duration-300`}
          >
            <MenuIcon size={14} className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} transition-transform duration-200 ${isMenuOpen ? 'rotate-90' : ''}`} strokeWidth={1.5} />
          </button>
        </div>
      </nav>

      {/* Spacer for mobile top bar */}
      <div className="lg:hidden h-16"></div>
    </>
  );
}
