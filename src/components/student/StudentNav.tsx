'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

interface MenuItem {
  name: string;
  href: string;
  icon: string;
  isDropdown?: boolean;
  children?: MenuItem[];
}

export default function StudentNav() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showActivitiesDropdown, setShowActivitiesDropdown] = useState(false);
  const [showMembersDropdown, setShowMembersDropdown] = useState(false);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [membershipStatus, setMembershipStatus] = useState<'PENDING' | 'ACTIVE' | 'REJECTED' | 'INACTIVE' | 'REMOVED' | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasRedirected, setHasRedirected] = useState(false);
  const [hasRestorationInfo, setHasRestorationInfo] = useState(false);

  // Load theme from localStorage on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'dark') {
        setIsDarkMode(true);
        document.documentElement.classList.add('dark');
      }
    }
  }, []);



  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.profile-dropdown') && !target.closest('.activities-dropdown') && !target.closest('.members-dropdown') && !target.closest('.notification-dropdown')) {
        setShowProfileDropdown(false);
        setShowActivitiesDropdown(false);
        setShowMembersDropdown(false);
        setShowNotificationDropdown(false);
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
    
    if (typeof window !== 'undefined') {
      if (newDarkMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
      window.dispatchEvent(new CustomEvent('themeChange'));
    }
  };

  // Check membership status and notifications
  useEffect(() => {
    let isMounted = true;
    
    if (user && isMounted) {
      // Luôn check membership status để hiển thị loading, nhưng không redirect nếu ở profile
      checkMembershipStatus();
      loadNotifications();
      loadUnreadCount();
      
      // Poll for new notifications every 30 seconds
      const notificationInterval = setInterval(() => {
        if (isMounted) {
          loadUnreadCount();
          // Only reload full list if dropdown is open
          if (showNotificationDropdown) {
            loadNotifications();
          }
        }
      }, 30000);
      
      return () => {
        isMounted = false;
        clearInterval(notificationInterval);
      };
    } else {
      setMembershipStatus(null);
      setHasRestorationInfo(false);
    }
  }, [user?._id, showNotificationDropdown]);

  const checkMembershipStatus = async () => {
    try {
      setLoading(true);
      
      // Kiểm tra xem có đang ở trang profile không
      const currentPath = window.location.pathname;
      const isOnProfilePage = currentPath.includes('/profile');
      const activityIdPattern = /\/student\/activities\/[0-9a-fA-F]+/;
      const attendanceIdPattern = /\/student\/attendance\/[0-9a-fA-F]+/;
      const isOnActivityDetailPage = currentPath.startsWith('/student/activities/') && activityIdPattern.test(currentPath);
      const isOnAttendancePage = currentPath.startsWith('/student/attendance/') && attendanceIdPattern.test(currentPath);
      
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
                         if (typeof window !== 'undefined') {
               setMembershipStatus(membership.status);
               const hasRestoration = !!(membership.removalReason || membership.removalReasonTrue || membership.removedAt || membership.restorationReason || membership.restoredAt || (membership.removalHistory && membership.removalHistory.length > 0));
               console.log('🔍 Setting hasRestorationInfo:');
               console.log('  - membership.removalReason:', membership.removalReason);
               console.log('  - membership.removalReasonTrue:', membership.removalReasonTrue);
               console.log('  - membership.removedAt:', membership.removedAt);
               console.log('  - membership.restorationReason:', membership.restorationReason);
               console.log('  - membership.restoredAt:', membership.restoredAt);
               console.log('  - membership.removalHistory length:', membership.removalHistory?.length || 0);
               console.log('  - hasRestoration calculated:', hasRestoration);
               setHasRestorationInfo(hasRestoration);
             }
            
            // Chỉ redirect nếu có yêu cầu redirect cụ thể từ server
            if (shouldRedirect && redirectUrl && !hasRedirected && !isOnProfilePage && !isOnActivityDetailPage && !isOnAttendancePage) {
              const currentPath = window.location.pathname;
              const isOnNotificationsPage = currentPath.includes('/notifications');
              if (currentPath === '/student/removal-info' || isOnNotificationsPage) {
                return;
              }
              // Chỉ redirect nếu đang ở trang khác với redirectUrl
              if (currentPath !== redirectUrl) {
                if (typeof window !== 'undefined') {
                  setHasRedirected(true);
                }
                router.push(redirectUrl);
              }
              return;
            }
            
            // Chỉ redirect nếu user đang ở trang không phải student và không phải removal-info
            if (membership && membership.status === 'REMOVED' && !hasRedirected && !isOnProfilePage && !isOnActivityDetailPage && !isOnAttendancePage) {
              const currentPath = window.location.pathname;
              const isOnNotificationsPage = currentPath.includes('/notifications');
              if (currentPath === '/student/removal-info' || isOnNotificationsPage) {
                return;
              }
              // Chỉ redirect nếu đang ở trang không phải student
              if (!currentPath.startsWith('/student/')) {
                if (typeof window !== 'undefined') {
                  setHasRedirected(true);
                }
                router.push('/student/dashboard');
                return;
              }
            }
            
            // Chỉ redirect nếu user đang ở trang student dashboard hoặc trang chính
            if (membership && membership.status === 'ACTIVE' && 
                ['CLUB_LEADER', 'CLUB_DEPUTY', 'CLUB_MEMBER'].includes(user?.role || '') && 
                !hasRedirected && !isOnProfilePage) {
              const currentPath = window.location.pathname;
              const isOnNotificationsPage = currentPath.includes('/notifications');
              
              // Chỉ redirect nếu đang ở trang dashboard hoặc trang chính, và không phải notifications page
              if ((currentPath === '/student/dashboard' || currentPath === '/student' || currentPath === '/') && !isOnNotificationsPage) {
                if (user?.role === 'CLUB_LEADER') {
                  if (typeof window !== 'undefined') {
                    setHasRedirected(true);
                  }
                  router.push('/admin/dashboard');
                  return;
                } else {
                  if (typeof window !== 'undefined') {
                    setHasRedirected(true);
                  }
                  router.push('/officer/dashboard');
                  return;
                }
              }
            }
            
            // Redirect user về dashboard nếu tài khoản không hoạt động và đang ở trang khác
            if (membership && membership.status === 'INACTIVE' && !hasRedirected && !isOnProfilePage && !isOnActivityDetailPage && !isOnAttendancePage) {
              const currentPath = window.location.pathname;
              const isOnNotificationsPage = currentPath.includes('/notifications');
              
              // Chỉ cho phép ở dashboard, contact page, activity detail page, attendance page và notifications page
              if (currentPath !== '/student/dashboard' && currentPath !== '/student/contact' && !isOnActivityDetailPage && !isOnAttendancePage && !isOnNotificationsPage) {
                if (typeof window !== 'undefined') {
                  setHasRedirected(true);
                }
                router.push('/student/dashboard');
                return;
              }
            }
          } else {
            if (typeof window !== 'undefined') {
              setMembershipStatus(null);
              setHasRestorationInfo(false);
            }
          }
        }
      } else {
        console.error('API response not ok:', response.status);
        if (typeof window !== 'undefined') {
          setMembershipStatus(null);
          setHasRestorationInfo(false);
        }
      }
    } catch (err) {
      console.error('Error checking user status:', err);
      if (typeof window !== 'undefined') {
        setMembershipStatus(null);
        setHasRestorationInfo(false);
      }
    } finally {
      if (typeof window !== 'undefined') {
        setLoading(false);
      }
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

  // Menu items based on membership status
  const getMenuItems = (): MenuItem[] => {
    const baseItems: MenuItem[] = [
      { name: 'Bảng điều khiển', href: '/student/dashboard', icon: '🏠' },
    ];

    // Activities dropdown
    const activitiesItems: MenuItem[] = [
      { name: 'Tất cả', href: '/student/activities', icon: '🎯' },
      { name: 'Đăng ký', href: '/student/activities/register', icon: '📝' },
      { name: 'Đã tham gia', href: '/student/activities/joined', icon: '✅' },
      { name: 'Điểm tích lũy', href: '/student/points', icon: '⭐' },
      { name: 'Lịch sử', href: '/student/history', icon: '📋' },
    ];

               // Members dropdown
      const membersItems: MenuItem[] = [];
      if (membershipStatus === 'ACTIVE') {
        membersItems.push({ name: 'Thông tin thành viên', href: '/student/member', icon: '👥' });
        membersItems.push({ name: 'Hồ sơ cá nhân', href: '/student/profile', icon: '👤' });
      }

    if (!membershipStatus) {
      return [
        ...baseItems,
        { name: 'Hoạt động', href: '#', icon: '🎯', isDropdown: true, children: activitiesItems },
        { name: 'Đăng ký CLB', href: '/student/register', icon: '📝' }
      ];
    }

         if (membershipStatus === 'ACTIVE') {
       const activeItems = [
         ...baseItems,
         { name: 'Hoạt động', href: '#', icon: '🎯', isDropdown: true, children: activitiesItems },
         { name: 'Thành viên', href: '#', icon: '👥', isDropdown: true, children: membersItems }
       ];
       
               // Thêm menu "Xem lý do duyệt lại" trực tiếp nếu có thông tin bị xóa (đã được duyệt lại)
        if (hasRestorationInfo) {
          activeItems.push({ name: 'Xem lý do duyệt lại', href: '/student/removal-info', icon: '📋' });
        }
       
       return activeItems;
     } else if (membershipStatus === 'PENDING') {
       return [
         ...baseItems,
         { name: 'Hoạt động', href: '#', icon: '🎯', isDropdown: true, children: activitiesItems },
         { name: 'Đăng ký CLB', href: '/student/register', icon: '📝' }
       ];
     } else if (membershipStatus === 'REJECTED') {
       return [
         ...baseItems,
         { name: 'Hoạt động', href: '#', icon: '🎯', isDropdown: true, children: activitiesItems },
         { name: 'Đăng ký lại CLB', href: '/student/register', icon: '📝' }
       ];
     } else if (membershipStatus === 'INACTIVE') {
       // Khi tài khoản không hoạt động, chỉ cho phép xem dashboard và liên hệ admin
       return [
         { name: 'Bảng điều khiển', href: '/student/dashboard', icon: '🏠' },
         { name: 'Liên hệ admin', href: '/student/contact', icon: '📞' }
       ];
     } else if (membershipStatus === 'REMOVED') {
        // Luôn hiển thị menu "Xem lý do xóa" trực tiếp cho REMOVED status
        return [
          ...baseItems,
          { name: 'Hoạt động', href: '#', icon: '🎯', isDropdown: true, children: activitiesItems },
          { name: 'Xem lý do xóa', href: '/student/removal-info', icon: '📋' }
        ];
      }

    return [
      ...baseItems,
      { name: 'Hoạt động', href: '#', icon: '🎯', isDropdown: true, children: activitiesItems },
      { name: 'Đăng ký CLB', href: '/student/register', icon: '📝' }
    ];
  };

  const menuItems = getMenuItems();

  const getMembershipChip = () => {
    if (loading) {
      return (
        <div className="flex items-center px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800">
          <div className="animate-spin w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full mr-1"></div>
          <span className="text-xs text-gray-600 dark:text-gray-400">...</span>
        </div>
      );
    }

    if (!membershipStatus) {
      return (
        <div className="flex items-center px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800">
          <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">Chưa là thành viên</span>
        </div>
      );
    }

    switch (membershipStatus) {
      case 'ACTIVE':
        return (
          <div className="flex items-center px-2 py-1 rounded-md bg-green-100 dark:bg-green-900/30">
            <span className="text-xs text-green-700 dark:text-green-300 font-medium">Thành viên</span>
          </div>
        );
      case 'PENDING':
        return (
          <div className="flex items-center px-2 py-1 rounded-md bg-yellow-100 dark:bg-yellow-900/30">
            <span className="text-xs text-yellow-700 dark:text-yellow-300 font-medium">Đang chờ duyệt</span>
          </div>
        );
      case 'REJECTED':
        return (
          <div className="flex items-center px-2 py-1 rounded-md bg-red-100 dark:bg-red-900/30">
            <span className="text-xs text-red-700 dark:text-red-300 font-medium">Đơn bị từ chối</span>
          </div>
        );
      case 'INACTIVE':
        return (
          <div className="flex items-center px-2 py-1 rounded-md bg-red-100 dark:bg-red-900/30" title="Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ admin để được hỗ trợ.">
            <svg className="w-3 h-3 mr-1 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-xs text-red-700 dark:text-red-300 font-medium">Tài khoản không hoạt động</span>
          </div>
        );
      case 'REMOVED':
        return (
          <div className="flex items-center px-2 py-1 rounded-md bg-red-100 dark:bg-red-900/30">
            <span className="text-xs text-red-700 dark:text-red-300 font-medium">Đã bị xóa khỏi CLB</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      {/* Warning banner for inactive accounts */}
      {membershipStatus === 'INACTIVE' && (
        <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-red-700 dark:text-red-300">
                  <strong>Tài khoản không hoạt động:</strong> Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ admin để được hỗ trợ.
                </p>
              </div>
              <button
                onClick={() => router.push('/student/contact')}
                className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 font-medium underline"
              >
                Liên hệ ngay
              </button>
            </div>
          </div>
        </div>
      )}
      
      <nav className={`${isDarkMode ? 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800' : 'bg-white border-gray-200'} border-b sticky top-0 z-50 transition-all duration-300 shadow-sm`}>
         <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="flex items-center justify-between h-14">
            
                         {/* Left: Logo + Portal Name */}
             <div className="flex items-center gap-x-3">
               <div className="relative group" title="CLB Sinh viên 5 Tốt TDMU">
                 <img 
                   src="/logo_clb_sv_5T.jpg" 
                   alt="CLB Logo" 
                   className="w-8 h-8 rounded-lg shadow-sm group-hover:scale-105 transition-transform duration-200"
                 />
                 <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-purple-500 rounded-full border border-white"></div>
               </div>
               <div className="flex flex-col">
                 <h1 className={`text-lg font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                   Cổng Sinh viên
                 </h1>
                 <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                   CLB Sinh viên 5 Tốt TDMU
                 </p>
               </div>
             </div>

                         {/* Center: Main Menu */}
             <div className="hidden lg:flex items-center gap-x-4">
              {menuItems.map((item) => (
                item.isDropdown ? (
                  <div key={item.name} className="relative">
                                         <button
                       onClick={() => {
                         console.log('🔍 Clicked dropdown button:', item.name);
                         if (item.name === 'Hoạt động') {
                           console.log('🔄 Toggling Activities dropdown from:', showActivitiesDropdown, 'to:', !showActivitiesDropdown);
                           setShowActivitiesDropdown(!showActivitiesDropdown);
                         }
                         if (item.name === 'Thành viên') {
                           console.log('🔄 Toggling Members dropdown from:', showMembersDropdown, 'to:', !showMembersDropdown);
                           setShowMembersDropdown(!showMembersDropdown);
                         }
                       }}
                      className={`flex items-center gap-x-2 px-3 py-2 text-sm font-semibold rounded-md transition-all duration-200 hover:translate-y-[-1px] hover:shadow-sm ${
                        isDarkMode 
                          ? 'text-white hover:bg-gray-800/80' 
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      } ${item.name === 'Thành viên' && membershipStatus === 'ACTIVE' ? 'bg-green-50 border border-green-200' : ''}`}
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span>{item.name}</span>
                      <svg className="w-4 h-4 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                                                                 {(item.name === 'Hoạt động' && showActivitiesDropdown) && (
                       <div className={`absolute top-full left-0 mt-1 w-64 ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'} rounded-lg shadow-lg border py-2 z-50`}>
                         {item.children?.map((child) => (
                           <button
                             key={child.name}
                             className={`w-full text-left flex items-center gap-x-3 px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                               isDarkMode 
                                 ? 'text-white hover:bg-gray-800' 
                                 : 'text-black hover:bg-gray-50'
                             }`}
                             onClick={() => {
                               console.log('🔍 Clicked menu item:', child.name, 'href:', child.href);
                               setShowActivitiesDropdown(false);
                               setShowMembersDropdown(false);
                               console.log('🚀 Navigating to:', child.href);
                               router.push(child.href);
                             }}
                           >
                             <span className="text-base">{child.icon}</span>
                             <span>{child.name}</span>
                           </button>
                         ))}
                       </div>
                     )}

                                         {(item.name === 'Thành viên' && showMembersDropdown) && (
                       <div className={`absolute top-full left-0 mt-1 w-64 ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'} rounded-lg shadow-lg border py-2 z-50`}>
                         {(() => { console.log('🎯 Rendering Members dropdown with items:', item.children?.map(c => c.name)); return null; })()}
                         {item.children?.map((child) => (
                          <button
                            key={child.name}
                            className={`w-full text-left flex items-center gap-x-3 px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                              isDarkMode 
                                ? 'text-white hover:bg-gray-800' 
                                : 'text-black hover:bg-gray-50'
                            }`}
                                                         onClick={() => {
                               console.log('🔍 Clicked Members menu item:', child.name, 'href:', child.href);
                               setShowActivitiesDropdown(false);
                               setShowMembersDropdown(false);
                               console.log('🚀 Navigating to Members item:', child.href);
                               router.push(child.href);
                             }}
                          >
                            <span className="text-base">{child.icon}</span>
                            <span>{child.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                                     <a
                     key={item.name}
                     href={item.href}
                     className={`flex items-center gap-x-2 px-3 py-2 text-sm font-semibold rounded-md transition-all duration-200 hover:translate-y-[-1px] hover:shadow-sm ${
                       isDarkMode 
                         ? 'text-white hover:bg-gray-800/80' 
                         : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                     }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span>{item.name}</span>
                  </a>
                )
              ))}
            </div>

             {/* Right: CTA, Theme, Bell, Avatar */}
             <div className="flex items-center gap-x-3">

                             {/* CTA Button - Removed to avoid duplication with Members dropdown */}

                             {/* Theme Toggle */}
               <button
                 onClick={toggleDarkMode}
                 className={`p-2 rounded-md transition-all duration-200 hover:translate-y-[-1px] hover:shadow-sm ${
                   isDarkMode 
                     ? 'text-gray-200 hover:bg-gray-800/80' 
                     : 'text-gray-700 hover:bg-gray-100'
                 }`}
                 title={isDarkMode ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
               >
                {isDarkMode ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
              </button>

                             {/* Bell with Badge */}
               <div className="relative notification-dropdown">
                 <button
                   onClick={() => {
                     setShowNotificationDropdown(!showNotificationDropdown);
                     if (!showNotificationDropdown) {
                       loadNotifications();
                     }
                   }}
                   className={`p-2 rounded-md transition-all duration-200 hover:translate-y-[-1px] hover:shadow-sm ${
                     isDarkMode 
                       ? 'text-gray-200 hover:bg-gray-800/80' 
                       : 'text-gray-700 hover:bg-gray-100'
                   }`}
                   title="Thông báo"
                 >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-xs text-white font-bold">{unreadCount}</span>
                    </div>
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
                                    <span className={`text-xs px-2 py-1 rounded-full ${notification.type === 'success' ? (isDarkMode ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700') : notification.type === 'warning' ? (isDarkMode ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700') : notification.type === 'error' ? (isDarkMode ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700') : (isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700')}`}>
                                      {notification.type === 'success' ? 'Thành công' : notification.type === 'warning' ? 'Cảnh báo' : notification.type === 'error' ? 'Lỗi' : 'Thông tin'}
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

              {/* Avatar with Profile Dropdown */}
              <div className="relative profile-dropdown">
                <button
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className={`flex items-center gap-x-2 p-1 rounded-md transition-all duration-200 hover:translate-y-[-1px] ${
                    isDarkMode 
                      ? 'hover:bg-gray-800' 
                      : 'hover:bg-gray-100'
                  }`}
                >
                                     <div className="relative">
                     {user?.avatarUrl ? (
                       <img
                         src={user.avatarUrl}
                         alt="Avatar"
                         className="w-8 h-8 rounded-full object-cover ring-2 ring-gray-200 dark:ring-gray-600 shadow-sm"
                       />
                     ) : (
                       <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center ring-2 ring-gray-200 dark:ring-gray-600 shadow-sm">
                         <span className="text-white text-sm font-bold">
                           {user?.name?.split(' ').pop()?.charAt(0) || 'S'}
                         </span>
                       </div>
                     )}
                     <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border border-white"></div>
                   </div>
                                     <div className="hidden md:flex items-center gap-x-2">
                     <div className="text-left">
                       <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                         {user?.name || 'Sinh viên'}
                       </p>
                       {getMembershipChip()}
                     </div>
                     <svg className={`w-4 h-4 transition-transform duration-200 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                     </svg>
                   </div>
                </button>

                                 {showProfileDropdown && (
                   <div className={`absolute right-0 mt-3 w-72 ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-xl border py-3 z-50`}>
                                         <div className={`px-5 py-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                       <div className="flex items-center gap-x-4">
                         {user?.avatarUrl ? (
                           <img
                             src={user.avatarUrl}
                             alt="Avatar"
                             className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-200 dark:ring-gray-600 shadow-sm"
                           />
                         ) : (
                           <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center ring-2 ring-gray-200 dark:ring-gray-600 shadow-sm">
                             <span className="text-white text-xl font-bold">
                               {user?.name?.charAt(0) || 'S'}
                             </span>
                           </div>
                         )}
                                                 <div className="flex-1 min-w-0">
                           <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} truncate`}>
                             {user?.name || 'Sinh viên'}
                           </p>
                           <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} truncate`}>
                             {user?.email || 'sinhvien@example.com'}
                           </p>
                         </div>
                      </div>
                    </div>
                    
                                         <div className="py-2">
                                             <a 
                         href="/student/profile" 
                         onClick={() => setHasRedirected(true)}
                         className={`flex items-center gap-x-3 px-5 py-2.5 text-sm font-medium rounded-lg mx-2 ${isDarkMode ? 'text-white hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'} transition-colors duration-200`}
                       >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>Hồ sơ cá nhân</span>
                      </a>
                      
                                             <a 
                         href="/student/settings" 
                         className={`flex items-center gap-x-3 px-5 py-2.5 text-sm font-medium rounded-lg mx-2 ${isDarkMode ? 'text-white hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'} transition-colors duration-200`}
                       >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>Cài đặt</span>
                      </a>
                    </div>
                    
                                         <div className={`border-t pt-2 ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                       <a
                         href="/auth/login"
                         className={`flex items-center gap-x-3 px-5 py-2.5 text-sm font-medium rounded-lg mx-2 transition-colors duration-200 ${
                           isDarkMode 
                             ? 'text-red-400 hover:bg-red-900/20' 
                             : 'text-red-600 hover:bg-red-50'
                         }`}
                       >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span>Đăng xuất</span>
                      </a>
                    </div>
                  </div>
                )}
              </div>

                             {/* Mobile Menu Button */}
               <div className="lg:hidden">
                 <button
                   onClick={() => setIsMenuOpen(!isMenuOpen)}
                   className={`p-2 rounded-md transition-all duration-200 hover:translate-y-[-1px] hover:shadow-sm ${
                     isDarkMode 
                       ? 'text-gray-200 hover:bg-gray-800/80' 
                       : 'text-gray-700 hover:bg-gray-100'
                   }`}
                 >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

                     {/* Mobile Menu */}
           {isMenuOpen && (
             <div className={`lg:hidden border-t ${isDarkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'} shadow-lg`}>
               <div className="px-4 py-3 space-y-1">
                {menuItems.map((item) => (
                                     <a
                     key={item.name}
                     href={item.href}
                     className={`flex items-center gap-x-3 px-4 py-3 text-sm font-semibold rounded-lg transition-colors duration-200 ${
                       isDarkMode 
                         ? 'text-white hover:bg-gray-800' 
                         : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                     }`}
                     onClick={() => setIsMenuOpen(false)}
                   >
                    <span className="text-lg">{item.icon}</span>
                    <span>{item.name}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </nav>
    </>
  );
}