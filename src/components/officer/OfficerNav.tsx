'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useRouter, usePathname } from 'next/navigation';
import {
  Home,
  Target,
  Users,
  CheckCircle2,
  BarChart3,
  Bell,
  Building2,
  X,
  XCircle,
  ChevronDown,
  Sun,
  Moon,
  Menu,
  User,
  Settings,
  LogOut,
  Clock,
  Info,
  ArrowRight,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Newspaper,
  type LucideIcon
} from 'lucide-react';

interface MenuItem {
  name: string;
  href?: string;
  icon: LucideIcon;
  isDropdown?: boolean;
  children?: { name: string; href: string; icon: LucideIcon }[];
}

type MembershipStatus = 'PENDING' | 'ACTIVE' | 'REJECTED' | 'REMOVED' | 'removed' | null;

const isRemovedStatus = (status: MembershipStatus) =>
  status === 'REMOVED' || status === 'removed';

export default function OfficerNav() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [showActivitiesDropdown, setShowActivitiesDropdown] = useState(false);
  const [showUsersDropdown, setShowUsersDropdown] = useState(false);
  const [showClubDropdown, setShowClubDropdown] = useState(false);
  const [showMobileActivitiesDropdown, setShowMobileActivitiesDropdown] = useState(false);
  const [showMobileUsersDropdown, setShowMobileUsersDropdown] = useState(false);
  const [showMobileClubDropdown, setShowMobileClubDropdown] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingParticipantsCount, setPendingParticipantsCount] = useState(0);
  const [membershipStatus, setMembershipStatus] = useState<MembershipStatus>(null);
  const [restorationInfo, setRestorationInfo] = useState<{
    restoredAt?: string;
    restoredBy?: { name: string; studentId: string };
    restorationReason?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false);
  const [showRestorationBanner, setShowRestorationBanner] = useState(false);
  const [hasCheckedStatus, setHasCheckedStatus] = useState(false);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.notification-dropdown') && !target.closest('.profile-dropdown') &&
          !target.closest('.activities-dropdown') && !target.closest('.users-dropdown') &&
          !target.closest('.club-dropdown')) {
        setShowNotificationDropdown(false);
        setShowProfileDropdown(false);
        setShowActivitiesDropdown(false);
        setShowUsersDropdown(false);
        setShowClubDropdown(false);
        setShowMobileActivitiesDropdown(false);
        setShowMobileUsersDropdown(false);
        setShowMobileClubDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Load pending participants count - optimized with dedicated API
  const loadPendingParticipantsCount = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // Use dedicated API endpoint for faster response
      const response = await fetch('/api/activities/pending-participants-count', {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        // Add cache control for faster loading
        cache: 'no-store'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.count !== undefined) {
          setPendingParticipantsCount(data.data.count);
          // Cache in localStorage for instant display on next load
          localStorage.setItem('pendingParticipantsCount', data.data.count.toString());
          localStorage.setItem('pendingParticipantsCountTime', Date.now().toString());
        }
      }
    } catch (error) {
      console.error('Error loading pending participants count:', error);
      // Try to load from cache if API fails
      const cached = localStorage.getItem('pendingParticipantsCount');
      const cacheTime = localStorage.getItem('pendingParticipantsCountTime');
      if (cached && cacheTime) {
        const age = Date.now() - parseInt(cacheTime);
        // Use cache if less than 5 minutes old
        if (age < 5 * 60 * 1000) {
          setPendingParticipantsCount(parseInt(cached));
        }
      }
    }
  };

  // Load cached counts immediately on mount for instant display
  useEffect(() => {
    // Load from cache immediately for instant display
    const cachedPending = localStorage.getItem('pendingParticipantsCount');
    const cachedPendingTime = localStorage.getItem('pendingParticipantsCountTime');
    if (cachedPending && cachedPendingTime) {
      const age = Date.now() - parseInt(cachedPendingTime);
      // Use cache if less than 5 minutes old
      if (age < 5 * 60 * 1000) {
        setPendingParticipantsCount(parseInt(cachedPending));
      }
    }

    const cachedUnread = localStorage.getItem('unreadCount');
    const cachedUnreadTime = localStorage.getItem('unreadCountTime');
    if (cachedUnread && cachedUnreadTime) {
      const age = Date.now() - parseInt(cachedUnreadTime);
      // Use cache if less than 5 minutes old
      if (age < 5 * 60 * 1000) {
        setUnreadCount(parseInt(cachedUnread));
      }
    }
  }, []);

  // Load notifications and check membership status
  useEffect(() => {
    if (!user?._id) return;
    
    // Fetch all data in parallel for faster loading
    Promise.all([
      loadNotifications(),
      loadUnreadCount(),
      loadPendingParticipantsCount()
    ]).catch(error => {
      console.error('Error loading notification data:', error);
    });
    
    // Check membership status only once on mount
    // This prevents excessive checks and redirects
    if (!hasCheckedStatus) {
      const checkOnce = async () => {
        try {
          await checkMembershipStatus();
        } finally {
          setHasCheckedStatus(true);
          setLoading(false); // Ensure loading is reset
        }
      };
      checkOnce();
    }
    
    // Poll for new notifications every 30 seconds
    const notificationInterval = setInterval(() => {
      // Fetch in parallel
      Promise.all([
        loadUnreadCount(),
        loadPendingParticipantsCount(),
        loadNotifications()
      ]).catch(error => {
        console.error('Error refreshing notification data:', error);
      });
    }, 30000);
    
    return () => clearInterval(notificationInterval);
  }, [user?._id]); // Only depend on user ID

  const checkMembershipStatus = async () => {
    if (!user?._id || hasCheckedStatus) {
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
            
            // Only redirect if membership is REMOVED - this is critical
            // Don't redirect for other cases to avoid interrupting user workflow
            if (membership && membership.status === 'REMOVED' && !hasRedirected) {
              const currentPath = window.location.pathname;
              const isOnNotificationsPage = currentPath.includes('/notifications');
              // Only redirect if not already on student dashboard
              if (!currentPath.startsWith('/student/') && !isOnNotificationsPage) {
                setHasRedirected(true);
                setLoading(false);
                router.push('/student/dashboard');
                return;
              }
            }
            
            // Only redirect on initial load if user is completely on wrong page
            // Don't redirect if user is already on officer/admin/student pages
            if (shouldRedirect && redirectUrl && !hasRedirected) {
              const currentPath = window.location.pathname;
              const isOnOfficerPage = currentPath.startsWith('/officer/');
              const isOnAdminPage = currentPath.startsWith('/admin/');
              const isOnStudentPage = currentPath.startsWith('/student/');
              const isOnTargetPage = currentPath === redirectUrl;
              const isOnNotificationsPage = currentPath.includes('/notifications');
              
              // Only redirect if completely on wrong page (not any dashboard pages)
              // This prevents redirect loops and allows free navigation
              if (!isOnOfficerPage && !isOnAdminPage && !isOnStudentPage && !isOnTargetPage && !isOnNotificationsPage) {
                setHasRedirected(true);
                router.push(redirectUrl);
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
        },
        // Add cache control for faster loading
        cache: 'no-store'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.count !== undefined) {
          setUnreadCount(data.data.count);
          // Cache in localStorage for instant display on next load
          localStorage.setItem('unreadCount', data.data.count.toString());
          localStorage.setItem('unreadCountTime', Date.now().toString());
        }
      }
    } catch (error) {
      console.error('Error loading unread count:', error);
      // Try to load from cache if API fails
      const cached = localStorage.getItem('unreadCount');
      const cacheTime = localStorage.getItem('unreadCountTime');
      if (cached && cacheTime) {
        const age = Date.now() - parseInt(cacheTime);
        // Use cache if less than 5 minutes old
        if (age < 5 * 60 * 1000) {
          setUnreadCount(parseInt(cached));
        }
      }
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

  const getMenuItems = (): MenuItem[] => {
    const items: MenuItem[] = [
      { name: 'Trang chủ', href: '/officer/dashboard', icon: Home },
      {
        name: 'Hoạt động',
        href: '/officer/activities',
        icon: Target,
      },
      {
        name: 'Thành viên',
        href: '/officer/participants',
        icon: Users,
      },
      { name: 'Bản tin', href: '/officer/news', icon: Newspaper },
      { name: 'Báo cáo', href: '/officer/reports', icon: BarChart3 },
    ];

    // Thêm dropdown CLB nếu có thông tin bị xóa/duyệt lại
    if (isRemovedStatus(membershipStatus)) {
      const clubChildren: NonNullable<MenuItem['children']> = [];

      if (restorationInfo && restorationInfo.restoredAt) {
        clubChildren.push({
          name: 'Thông tin duyệt lại',
          href: '/officer/removal-info',
          icon: CheckCircle2
        });
      } else {
        clubChildren.push({
          name: 'Thông tin bị xóa & Đăng ký lại',
          href: '/officer/removal-info',
          icon: XCircle
        });
      }

      // Nếu CLB chỉ có 1 mục, không dùng dropdown
      if (clubChildren.length === 1) {
        items.push({
          name: clubChildren[0].name,
          href: clubChildren[0].href,
          icon: clubChildren[0].icon,
        });
      } else {
        items.push({
          name: 'CLB',
          icon: Building2,
          isDropdown: true,
          children: clubChildren
        });
      }
    }

    return items;
  };



  return (
    <>
      {/* Restoration Notification Banner */}
      {restorationInfo && restorationInfo.restoredAt && membershipStatus === 'ACTIVE' && showRestorationBanner && (
        <div className={`${isDarkMode ? 'bg-green-900/90 border-green-700' : 'bg-green-50 border-green-200'} border-b px-4 py-2.5 shadow-sm`}>
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className={`p-1.5 rounded-full ${isDarkMode ? 'bg-green-800 text-green-300' : 'bg-green-100 text-green-600'}`}>
                <CheckCircle className="h-4 w-4" strokeWidth={2} />
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
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${isDarkMode ? 'bg-green-800 text-green-200 hover:bg-green-700' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
              >
                Xem chi tiết
              </a>
              <button
                onClick={() => setShowRestorationBanner(false)}
                className={`p-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${isDarkMode ? 'text-green-300 hover:text-green-200 hover:bg-green-800' : 'text-green-600 hover:text-green-700 hover:bg-green-200'}`}
                title="Đóng thông báo"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Removal Notification Banner */}
      {isRemovedStatus(membershipStatus) && (
        <div className={`${isDarkMode ? 'bg-red-900/90 border-red-700' : 'bg-red-50 border-red-200'} border-b px-4 py-2.5 shadow-sm`}>
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className={`p-1.5 rounded-full ${isDarkMode ? 'bg-red-800 text-red-300' : 'bg-red-100 text-red-600'}`}>
                <AlertTriangle className="h-4 w-4" strokeWidth={2} />
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
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${isDarkMode ? 'bg-red-800 text-red-200 hover:bg-red-700' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
              >
                Đăng xuất
              </a>
            </div>
          </div>
        </div>
      )}

      <nav className={`${isDarkMode 
        ? 'bg-gray-900/95 backdrop-blur-md text-white border-gray-800' 
        : 'bg-white/90 backdrop-blur-md text-gray-900 border-gray-200'} shadow-sm border-b sticky top-0 z-50 transition-all duration-200 ${isRemovedStatus(membershipStatus) ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14">
          {/* Left side - Logo & Brand */}
          <div className="flex items-center">
            <div className="flex items-center space-x-3">
              <img
                src="/logo_clb_sv_5T.jpg"
                alt="CLB Sinh viên 5 Tốt TDMU"
                className="w-10 h-10 rounded-lg shadow-md object-cover ring-2 ring-blue-500/20"
              />
              <div className="flex flex-col">
                <h1 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Bảng điều khiển cán bộ
                </h1>
                <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  CLB Sinh viên 5 Tốt TDMU
                </p>
              </div>
            </div>
          </div>

          {/* Center - Main Navigation */}
          <div className="hidden lg:flex items-center space-x-0.5">
            {getMenuItems().map((item) => {
              const isActive = pathname === item.href;
              const IconComponent = item.icon;
              return (
                <div key={item.name} className="relative">
                  {item.isDropdown ? (
                    <div className={`${
                      item.name === 'Hoạt động' ? 'activities-dropdown' :
                      item.name === 'Người dùng' ? 'users-dropdown' :
                      'club-dropdown'
                    }`}>
                      <button
                        onClick={() => {
                          if (item.name === 'Hoạt động') {
                            setShowActivitiesDropdown(!showActivitiesDropdown);
                            setShowUsersDropdown(false);
                            setShowClubDropdown(false);
                          } else if (item.name === 'Người dùng') {
                            setShowUsersDropdown(!showUsersDropdown);
                            setShowActivitiesDropdown(false);
                            setShowClubDropdown(false);
                          } else if (item.name === 'CLB') {
                            setShowClubDropdown(!showClubDropdown);
                            setShowActivitiesDropdown(false);
                            setShowUsersDropdown(false);
                          }
                        }}
                        className={`${isDarkMode
                          ? `${isActive ? 'bg-gray-800 text-white shadow-lg' : 'text-gray-300 hover:text-white hover:bg-gray-800 hover:shadow-md'}`
                          : `${isActive ? 'bg-gray-100 text-gray-900 shadow-lg' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 hover:shadow-md'}`} px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-all duration-300 relative`}
                      >
                        <div className="relative">
                          <IconComponent className="mr-1.5 h-3.5 w-3.5" strokeWidth={2} />
                          {item.name === 'Người dùng' && pendingParticipantsCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold rounded-full h-4 w-4 flex items-center justify-center border border-white dark:border-gray-800">
                              {pendingParticipantsCount > 9 ? '9+' : pendingParticipantsCount}
                            </span>
                          )}
                        </div>
                        <span>{item.name}</span>
                        <ChevronDown className={`ml-1.5 h-3 w-3 transition-transform duration-200 ${
                          (item.name === 'Hoạt động' && showActivitiesDropdown) ||
                          (item.name === 'Người dùng' && showUsersDropdown) ||
                          (item.name === 'CLB' && showClubDropdown) ? 'rotate-180' : ''
                        }`} strokeWidth={2} />
                      </button>

                      {((item.name === 'Hoạt động' && showActivitiesDropdown) ||
                        (item.name === 'Người dùng' && showUsersDropdown) ||
                        (item.name === 'CLB' && showClubDropdown)) && (
                        <div className={`absolute top-full left-0 mt-2 w-72 ${isDarkMode
                          ? 'bg-gray-800/95 backdrop-blur-md border-gray-700 shadow-2xl'
                          : 'bg-white/95 backdrop-blur-md border-gray-200 shadow-2xl'} rounded-xl border z-50`}>
                          <div className="py-1">
                            {item.children?.map((child, index) => {
                              const ChildIcon = child.icon;
                              return (
                                <a
                                  key={index}
                                  href={child.href}
                                  className={`${isDarkMode
                                    ? 'text-gray-300 hover:text-white hover:bg-gray-700 hover:scale-105'
                                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50 hover:scale-105'} flex items-center px-5 py-3 text-sm font-medium transition-all duration-200 hover:translate-x-1`}
                                  onClick={() => {
                                    setShowActivitiesDropdown(false);
                                    setShowUsersDropdown(false);
                                    setShowClubDropdown(false);
                                  }}
                                >
                                  <ChildIcon className="mr-4 h-5 w-5" strokeWidth={2} />
                                  <span>{child.name}</span>
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <a
                      href={item.href}
                      className={`${isDarkMode
                        ? `${isActive ? 'bg-gray-800 text-white shadow-lg' : 'text-gray-300 hover:text-white hover:bg-gray-800 hover:shadow-md'}`
                        : `${isActive ? 'bg-gray-100 text-gray-900 shadow-lg' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 hover:shadow-md'}`} px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-all duration-300`}
                    >
                      <IconComponent className="mr-2 h-4 w-4" strokeWidth={2} />
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
                <Sun className="h-4 w-4" strokeWidth={2} />
              ) : (
                <Moon className="h-4 w-4" strokeWidth={2} />
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
                <Bell className="h-4 w-4" strokeWidth={2} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center font-semibold">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotificationDropdown && (
                <div className={`absolute right-0 mt-4 w-[420px] ${isDarkMode ? 'bg-gray-800/95 backdrop-blur-md border-gray-700 shadow-2xl' : 'bg-white/95 backdrop-blur-md border-gray-200 shadow-2xl'} rounded-xl py-0 z-50 border max-h-[550px] overflow-hidden`}>
                  {/* Header */}
                  <div className={`px-6 py-4 border-b ${isDarkMode ? 'border-gray-600 bg-gray-800/50' : 'border-gray-100 bg-gray-50/50'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                          <Bell className="h-4 w-4" strokeWidth={2} />
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
                      <div className={`px-6 py-10 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        <div className={`w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
                          <Bell className="h-6 w-6 opacity-50" strokeWidth={2} />
                        </div>
                        <p className="text-sm font-medium mb-1">Không có thông báo mới</p>
                        <p className="text-xs opacity-75">Tất cả thông báo đã được đọc</p>
                      </div>
                    ) : (
                      <div className="py-2">
                        {notifications.map((notification, index) => {
                          const isClickable = notification.relatedType === 'activity' && notification.relatedId;
                          return (
                            <div
                              key={notification.id}
                              className={`mx-3 mb-2 rounded-xl p-4 transition-all duration-200 ${isClickable ? 'cursor-pointer hover:scale-[1.02]' : 'cursor-default'} ${!notification.isRead ? (isDarkMode ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-100') : (isDarkMode ? 'bg-gray-700/30 hover:bg-gray-700/50' : 'bg-gray-50 hover:bg-gray-100')}`}
                              onClick={() => {
                                markAsRead(notification.id);
                                // Navigate to activity participants page if related to activity
                                if (notification.relatedType === 'activity' && notification.relatedId) {
                                  // Convert relatedId to string if it's an object
                                  const activityId = typeof notification.relatedId === 'string' 
                                    ? notification.relatedId 
                                    : notification.relatedId.toString();
                                  router.push(`/officer/activities/${activityId}/participants`);
                                  setShowNotificationDropdown(false);
                                }
                              }}
                              title={isClickable ? 'Nhấn để xem chi tiết và duyệt thành viên' : undefined}
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
                                        <Clock className="h-2.5 w-2.5 mr-1 flex-shrink-0" strokeWidth={2} />
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
                                          <User className="h-2.5 w-2.5 mr-1 flex-shrink-0" strokeWidth={2} />
                                          {notification.createdBy.name}
                                          {notification.createdBy.studentId && (
                                            <span className="ml-1 opacity-75">({notification.createdBy.studentId})</span>
                                          )}
                                        </p>
                                      ) : (
                                        <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} flex items-center`}>
                                          <Info className="h-2.5 w-2.5 mr-1 flex-shrink-0" strokeWidth={2} />
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
                          );
                        })}
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
                        <ArrowRight className="h-4 w-4 ml-2" strokeWidth={2} />
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
                <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${showProfileDropdown ? 'rotate-180' : ''}`} strokeWidth={2} />
              </button>

              {showProfileDropdown && (
                <div className={`absolute right-0 mt-4 w-80 ${isDarkMode ? 'bg-gray-800/95 backdrop-blur-md border-gray-700 shadow-2xl' : 'bg-white/95 backdrop-blur-md border-gray-200 shadow-2xl'} rounded-xl py-0 z-50 border`}>
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
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center mr-3 ${isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                        <User className="w-3.5 h-3.5" strokeWidth={2} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Hồ sơ cá nhân</p>
                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Quản lý thông tin cá nhân</p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 opacity-50" strokeWidth={2} />
                    </a>
                    
                    <a 
                      href="/officer/settings" 
                      className={`flex items-center px-6 py-3 text-sm transition-all duration-200 hover:scale-[1.02] ${isDarkMode ? 'text-gray-300 hover:bg-gray-700/50 hover:text-white' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'}`}
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center mr-3 ${isDarkMode ? 'bg-gray-500/20 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
                        <Settings className="w-3.5 h-3.5" strokeWidth={2} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Cài đặt</p>
                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Tùy chỉnh tài khoản</p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 opacity-50" strokeWidth={2} />
                    </a>
                  </div>
                  
                  {/* Footer */}
                  <div className={`px-6 py-3 border-t ${isDarkMode ? 'border-gray-600 bg-gray-800/50' : 'border-gray-100 bg-gray-50/50'}`}>
                    <a
                      href="/auth/login"
                      className={`flex items-center justify-center w-full py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${isDarkMode ? 'text-red-400 hover:text-red-300 hover:bg-red-500/20' : 'text-red-600 hover:text-red-700 hover:bg-red-50'}`}
                    >
                      <LogOut className="w-3.5 h-3.5 mr-2" strokeWidth={2} />
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
                <Menu className="h-6 w-6" strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="lg:hidden">
            <div className={`px-4 pt-2 pb-4 space-y-1 border-t ${isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
              {getMenuItems().map((item) => {
                const IconComponent = item.icon;
                return (
                  <div key={item.name}>
                    {item.isDropdown ? (
                      <div className={`${
                        item.name === 'Hoạt động' ? 'activities-dropdown' :
                        item.name === 'Người dùng' ? 'users-dropdown' :
                        'club-dropdown'
                      }`}>
                        <button
                          onClick={() => {
                            if (item.name === 'Hoạt động') {
                              setShowMobileActivitiesDropdown(!showMobileActivitiesDropdown);
                              setShowMobileUsersDropdown(false);
                              setShowMobileClubDropdown(false);
                            } else if (item.name === 'Người dùng') {
                              setShowMobileUsersDropdown(!showMobileUsersDropdown);
                              setShowMobileActivitiesDropdown(false);
                              setShowMobileClubDropdown(false);
                            } else if (item.name === 'CLB') {
                              setShowMobileClubDropdown(!showMobileClubDropdown);
                              setShowMobileActivitiesDropdown(false);
                              setShowMobileUsersDropdown(false);
                            }
                          }}
                          className={`${isDarkMode ? 'text-gray-300 hover:text-white hover:bg-gray-700 hover:shadow-md' : 'text-gray-700 hover:text-gray-900 hover:bg-white hover:shadow-md'} w-full px-4 py-3 rounded-lg text-base font-medium flex items-center justify-between transition-all duration-300`}
                        >
                          <div className="flex items-center">
                            <div className="relative mr-3">
                              <IconComponent className="h-5 w-5" strokeWidth={2} />
                              {item.name === 'Người dùng' && pendingParticipantsCount > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold rounded-full h-4 w-4 flex items-center justify-center border border-white dark:border-gray-800">
                                  {pendingParticipantsCount > 9 ? '9+' : pendingParticipantsCount}
                                </span>
                              )}
                            </div>
                            <span className="flex-1">{item.name}</span>
                          </div>
                          <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${
                            (item.name === 'Hoạt động' && showMobileActivitiesDropdown) ||
                            (item.name === 'Người dùng' && showMobileUsersDropdown) ||
                            (item.name === 'CLB' && showMobileClubDropdown) ? 'rotate-180' : ''
                          }`} strokeWidth={2} />
                        </button>

                        {((item.name === 'Hoạt động' && showMobileActivitiesDropdown) ||
                          (item.name === 'Người dùng' && showMobileUsersDropdown) ||
                          (item.name === 'CLB' && showMobileClubDropdown)) && (
                          <div className={`ml-8 mt-2 space-y-1 ${isDarkMode ? 'bg-gray-700/80' : 'bg-gray-100/80'} rounded-lg p-3 backdrop-blur-sm`}>
                            {item.children?.map((child, index) => {
                              const ChildIcon = child.icon;
                              return (
                                <a
                                  key={index}
                                  href={child.href}
                                  className={`${isDarkMode ? 'text-gray-300 hover:text-white hover:bg-gray-600 hover:shadow-md hover:scale-105' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200 hover:shadow-md hover:scale-105'} block px-4 py-3 rounded-lg text-sm font-medium flex items-center transition-all duration-300 hover:translate-x-2`}
                                  onClick={() => {
                                    setIsMenuOpen(false);
                                    setShowMobileActivitiesDropdown(false);
                                    setShowMobileUsersDropdown(false);
                                    setShowMobileClubDropdown(false);
                                  }}
                                >
                                  <ChildIcon className="mr-3 h-4 w-4" strokeWidth={2} />
                                  <span>{child.name}</span>
                                </a>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : (
                      <a
                        href={item.href}
                        className={`${isDarkMode ? 'text-gray-300 hover:text-white hover:bg-gray-700 hover:shadow-md hover:scale-105' : 'text-gray-700 hover:text-gray-900 hover:bg-white hover:shadow-md hover:scale-105'} block px-4 py-3 rounded-lg text-base font-medium flex items-center transition-all duration-300 hover:translate-x-1`}
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <IconComponent className="mr-3 h-5 w-5" strokeWidth={2} />
                        <span className="flex-1">{item.name}</span>
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </nav>
    </>
  );
}