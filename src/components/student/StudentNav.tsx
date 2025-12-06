'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import {
  Home,
  Target,
  FileText,
  CheckCircle2,
  CheckSquare,
  Star,
  ClipboardList,
  Users,
  User,
  Phone,
  Sun,
  Moon,
  Bell,
  ChevronDown,
  Menu,
  X,
  UserCircle,
  Settings,
  LogOut,
  AlertTriangle,
  Clock,
  Info,
  ArrowRight,
  Loader2,
  Sparkles,
  UserCheck,
  FileCheck,
  History,
  Newspaper,
  Heart,
  MessageCircle,
  Share2,
  ThumbsUp
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';

interface MenuItem {
  name: string;
  href: string;
  icon: LucideIcon;
  isDropdown?: boolean;
  children?: MenuItem[];
}

export default function StudentNav() {
  const { user, logout, isAuthenticated } = useAuth();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showActivitiesDropdown, setShowActivitiesDropdown] = useState(false);
  const [showMembersDropdown, setShowMembersDropdown] = useState(false);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [showNewsDropdown, setShowNewsDropdown] = useState(false);
  const [membershipStatus, setMembershipStatus] = useState<'PENDING' | 'ACTIVE' | 'REJECTED' | 'INACTIVE' | 'REMOVED' | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasRedirected, setHasRedirected] = useState(false);
  const [hasRestorationInfo, setHasRestorationInfo] = useState(false);
  const [newsPosts, setNewsPosts] = useState<any[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [interactingPosts, setInteractingPosts] = useState<Set<string>>(new Set());

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
      if (!target.closest('.profile-dropdown') && !target.closest('.activities-dropdown') && !target.closest('.members-dropdown') && !target.closest('.notification-dropdown') && !target.closest('.news-dropdown')) {
        setShowProfileDropdown(false);
        setShowActivitiesDropdown(false);
        setShowMembersDropdown(false);
        setShowNotificationDropdown(false);
        setShowNewsDropdown(false);
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
    
    if (isAuthenticated && user && isMounted) {
      // Luôn check membership status để hiển thị loading, nhưng không redirect nếu ở profile
      checkMembershipStatus();
      loadNotifications();
      loadUnreadCount();
      loadNewsPosts();
      
      // Poll for new notifications every 30 seconds
      const notificationInterval = setInterval(() => {
        if (isMounted) {
          loadUnreadCount();
          // Only reload full list if dropdown is open
          if (showNotificationDropdown) {
            loadNotifications();
          }
          // Reload news if dropdown is open
          if (showNewsDropdown) {
            loadNewsPosts();
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
  }, [user?._id, showNotificationDropdown, showNewsDropdown]);

  const checkMembershipStatus = async () => {
    try {
      setLoading(true);
      
      // Kiểm tra xem có đang ở trang profile không
      const currentPath = window.location.pathname;
      const isOnProfilePage = currentPath.includes('/profile');
      const isOnMemberPage = currentPath.includes('/student/member');
      const activityIdPattern = /\/student\/activities\/[0-9a-fA-F]+/;
      const attendanceIdPattern = /\/student\/attendance\/[0-9a-fA-F]+/;
      const isOnActivityDetailPage = currentPath.startsWith('/student/activities/') && activityIdPattern.test(currentPath);
      const isOnAttendancePage = currentPath.startsWith('/student/attendance/') && attendanceIdPattern.test(currentPath);
      // Kiểm tra các trang activities con (registered, register, joined, etc.)
      const isOnActivitiesSubPage = currentPath.startsWith('/student/activities/') && 
        (currentPath.includes('/registered') || 
         currentPath.includes('/register') || 
         currentPath.includes('/joined') ||
         currentPath === '/student/activities');
      const isOnActivitiesPage = isOnActivityDetailPage || isOnActivitiesSubPage;
      const isOnNewsPage = currentPath.includes('/student/news');
      
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
            if (shouldRedirect && redirectUrl && !hasRedirected && !isOnProfilePage && !isOnMemberPage && !isOnActivitiesPage && !isOnAttendancePage && !isOnNewsPage) {
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
            if (membership && membership.status === 'REMOVED' && !hasRedirected && !isOnProfilePage && !isOnMemberPage && !isOnActivitiesPage && !isOnAttendancePage && !isOnNewsPage) {
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
                !hasRedirected && !isOnProfilePage && !isOnMemberPage) {
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
            if (membership && membership.status === 'INACTIVE' && !hasRedirected && !isOnProfilePage && !isOnMemberPage && !isOnActivitiesPage && !isOnAttendancePage && !isOnNewsPage) {
              const currentPath = window.location.pathname;
              const isOnNotificationsPage = currentPath.includes('/notifications');
              
              // Chỉ cho phép ở dashboard, contact page, member page, activity pages, attendance page, news page và notifications page
              if (currentPath !== '/student/dashboard' && currentPath !== '/student/contact' && currentPath !== '/student/member' && !isOnActivitiesPage && !isOnAttendancePage && !isOnNewsPage && !isOnNotificationsPage) {
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
        // For now, use mock data if API doesn't exist
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

  // Menu items based on membership status
  const getMenuItems = (): MenuItem[] => {
    const baseItems: MenuItem[] = [
      { name: 'Trang chủ', href: '/student/dashboard', icon: Home },
      { name: 'Bản tin', href: '/student/news', icon: Newspaper },
    ];

    // Activities dropdown
    const activitiesItems: MenuItem[] = [
      { name: 'Tất cả', href: '/student/activities', icon: Target },
      { name: 'Đăng ký', href: '/student/activities/register', icon: FileText },
      { name: 'Đã đăng ký', href: '/student/activities/registered', icon: CheckSquare },
      { name: 'Đã tham gia', href: '/student/activities/joined', icon: CheckCircle2 },
      { name: 'Điểm tích lũy', href: '/student/points', icon: Star },
      { name: 'Lịch sử', href: '/student/history', icon: ClipboardList },
    ];

    // Members dropdown
    const membersItems: MenuItem[] = [];
    if (membershipStatus === 'ACTIVE') {
      membersItems.push({ name: 'Thông tin thành viên', href: '/student/member', icon: Users });
      membersItems.push({ name: 'Hồ sơ cá nhân', href: '/student/profile', icon: User });
      membersItems.push({ name: 'Lịch sử đăng ký CLB', href: '/student/membership-history', icon: History });
    }

    if (!membershipStatus) {
      return [
        ...baseItems,
        { name: 'Hoạt động', href: '#', icon: Target, isDropdown: true, children: activitiesItems },
        { name: 'Đăng ký CLB', href: isAuthenticated ? '/student/register' : '/auth/login', icon: FileText }
      ];
    }

    if (membershipStatus === 'ACTIVE') {
      const activeItems = [
        ...baseItems,
        { name: 'Hoạt động', href: '#', icon: Target, isDropdown: true, children: activitiesItems },
        { name: 'Thành viên', href: '#', icon: Users, isDropdown: true, children: membersItems }
      ];
      
      // Thêm menu "Xem lý do duyệt lại" trực tiếp nếu có thông tin bị xóa (đã được duyệt lại)
      if (hasRestorationInfo) {
        activeItems.push({ name: 'Xem lý do duyệt lại', href: '/student/removal-info', icon: FileCheck });
      }
      
      return activeItems;
    } else if (membershipStatus === 'PENDING') {
      return [
        ...baseItems,
        { name: 'Hoạt động', href: '#', icon: Target, isDropdown: true, children: activitiesItems },
        { name: 'Đăng ký CLB', href: isAuthenticated ? '/student/register' : '/auth/login', icon: FileText }
      ];
    } else if (membershipStatus === 'REJECTED') {
      return [
        ...baseItems,
        { name: 'Hoạt động', href: '#', icon: Target, isDropdown: true, children: activitiesItems },
        { name: 'Đăng ký lại CLB', href: isAuthenticated ? '/student/register' : '/auth/login', icon: FileText }
      ];
    } else if (membershipStatus === 'INACTIVE') {
      // Khi tài khoản không hoạt động, chỉ cho phép xem dashboard và liên hệ admin
      return [
        { name: 'Trang chủ', href: '/student/dashboard', icon: Home },
        { name: 'Liên hệ admin', href: '/student/contact', icon: Phone }
      ];
    } else if (membershipStatus === 'REMOVED') {
      // Luôn hiển thị menu "Xem lý do xóa" trực tiếp cho REMOVED status
      return [
        ...baseItems,
        { name: 'Hoạt động', href: '#', icon: Target, isDropdown: true, children: activitiesItems },
        { name: 'Xem lý do xóa', href: '/student/removal-info', icon: ClipboardList }
      ];
    }

    return [
      ...baseItems,
      { name: 'Hoạt động', href: '#', icon: Target, isDropdown: true, children: activitiesItems },
      { name: 'Đăng ký CLB', href: isAuthenticated ? '/student/register' : '/auth/login', icon: FileText }
    ];
  };

  const menuItems = getMenuItems();

  const getMembershipChip = () => {
    if (loading) {
      return (
        <div className={`flex items-center px-2.5 py-1 rounded-md ${
          isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
        }`}>
          <Loader2 className={`w-3 h-3 mr-1.5 animate-spin ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`} />
          <span className={`text-xs ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>...</span>
        </div>
      );
    }

    if (!membershipStatus) {
      return (
        <div className={`flex items-center px-2.5 py-1 rounded-md ${
          isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
        }`}>
          <span className={`text-xs font-medium ${
            isDarkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>Chưa là thành viên</span>
        </div>
      );
    }

    switch (membershipStatus) {
      case 'ACTIVE':
        return (
          <div className={`flex items-center px-2.5 py-1 rounded-md ${
            isDarkMode ? 'bg-green-900/30 border border-green-800/50' : 'bg-green-100 border border-green-200'
          }`}>
            <UserCheck className={`w-3 h-3 mr-1.5 ${
              isDarkMode ? 'text-green-400' : 'text-green-600'
            }`} />
            <span className={`text-xs font-medium ${
              isDarkMode ? 'text-green-300' : 'text-green-700'
            }`}>Thành viên</span>
          </div>
        );
      case 'PENDING':
        return (
          <div className={`flex items-center px-2.5 py-1 rounded-md ${
            isDarkMode ? 'bg-yellow-900/30 border border-yellow-800/50' : 'bg-yellow-100 border border-yellow-200'
          }`}>
            <Clock className={`w-3 h-3 mr-1.5 ${
              isDarkMode ? 'text-yellow-400' : 'text-yellow-600'
            }`} />
            <span className={`text-xs font-medium ${
              isDarkMode ? 'text-yellow-300' : 'text-yellow-700'
            }`}>Đang chờ duyệt</span>
          </div>
        );
      case 'REJECTED':
        return (
          <div className={`flex items-center px-2.5 py-1 rounded-md ${
            isDarkMode ? 'bg-red-900/30 border border-red-800/50' : 'bg-red-100 border border-red-200'
          }`}>
            <X className={`w-3 h-3 mr-1.5 ${
              isDarkMode ? 'text-red-400' : 'text-red-600'
            }`} />
            <span className={`text-xs font-medium ${
              isDarkMode ? 'text-red-300' : 'text-red-700'
            }`}>Đơn bị từ chối</span>
          </div>
        );
      case 'INACTIVE':
        return (
          <div className={`flex items-center px-2.5 py-1 rounded-md ${
            isDarkMode ? 'bg-red-900/30 border border-red-800/50' : 'bg-red-100 border border-red-200'
          }`} title="Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ admin để được hỗ trợ.">
            <AlertTriangle className={`w-3 h-3 mr-1.5 ${
              isDarkMode ? 'text-red-400' : 'text-red-600'
            }`} />
            <span className={`text-xs font-medium ${
              isDarkMode ? 'text-red-300' : 'text-red-700'
            }`}>Tài khoản không hoạt động</span>
          </div>
        );
      case 'REMOVED':
        return (
          <div className={`flex items-center px-2.5 py-1 rounded-md ${
            isDarkMode ? 'bg-red-900/30 border border-red-800/50' : 'bg-red-100 border border-red-200'
          }`}>
            <User className={`w-3 h-3 mr-1.5 ${
              isDarkMode ? 'text-red-400' : 'text-red-600'
            }`} />
            <span className={`text-xs font-medium ${
              isDarkMode ? 'text-red-300' : 'text-red-700'
            }`}>Đã bị xóa khỏi CLB</span>
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
        <div className={`border-b ${
          isDarkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'
        }`}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className={`w-5 h-5 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`} style={{ flexShrink: 0 }} />
                <p className={`text-sm ${
                  isDarkMode ? 'text-red-300' : 'text-red-700'
                }`}>
                  <strong>Tài khoản không hoạt động:</strong> Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ admin để được hỗ trợ.
                </p>
              </div>
              <button
                onClick={() => router.push('/student/contact')}
                className={`flex items-center gap-1.5 text-sm font-medium underline transition-colors ${
                  isDarkMode 
                    ? 'text-red-400 hover:text-red-200' 
                    : 'text-red-600 hover:text-red-800'
                }`}
              >
                <Phone className="w-4 h-4" />
                Liên hệ ngay
              </button>
            </div>
          </div>
        </div>
      )}
      
      <nav className={`border-b sticky top-0 z-50 transition-all duration-300 backdrop-blur-md ${
        isDarkMode 
          ? 'bg-gray-900/95 border-gray-800 shadow-lg' 
          : 'bg-white/95 border-gray-200 shadow-sm'
      }`}>
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="flex items-center justify-between h-16">
            
            {/* Left: Logo + Portal Name */}
            <div className="flex items-center gap-x-3">
              <div className="relative group" title="CLB Sinh viên 5 Tốt TDMU">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-xl blur-sm group-hover:blur-md transition-all duration-300"></div>
                <img 
                  src="/logo_clb_sv_5T.jpg" 
                  alt="CLB Logo" 
                  className="relative w-10 h-10 rounded-xl shadow-lg ring-2 ring-purple-500/20 group-hover:scale-105 group-hover:ring-purple-500/40 transition-all duration-300"
                />
                <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full border-2 border-white dark:border-gray-900 shadow-lg"></div>
              </div>
              <div className="flex flex-col">
                <h1 className={`text-lg font-bold tracking-tight bg-gradient-to-r ${
                  isDarkMode 
                    ? 'from-white to-gray-300 bg-clip-text text-transparent' 
                    : 'from-gray-900 to-gray-700 bg-clip-text text-transparent'
                }`}>
                  Cổng Sinh viên
                </h1>
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  CLB Sinh viên 5 Tốt TDMU
                </p>
              </div>
            </div>

            {/* Center: Main Menu */}
            <div className="hidden lg:flex items-center gap-x-1">
              {menuItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = typeof window !== 'undefined' && window.location.pathname === item.href;
                return item.isDropdown ? (
                  <div key={item.name} className="relative activities-dropdown">
                    <button
                      onClick={() => {
                        if (item.name === 'Hoạt động') {
                          setShowActivitiesDropdown(!showActivitiesDropdown);
                          setShowMembersDropdown(false);
                        }
                        if (item.name === 'Thành viên') {
                          setShowMembersDropdown(!showMembersDropdown);
                          setShowActivitiesDropdown(false);
                        }
                      }}
                      className={`relative flex items-center gap-x-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-300 group ${
                        isDarkMode 
                          ? `text-gray-200 hover:text-white hover:bg-gradient-to-r hover:from-purple-600/20 hover:to-blue-600/20 ${showActivitiesDropdown || showMembersDropdown ? 'bg-gradient-to-r from-purple-600/20 to-blue-600/20 text-white' : ''}` 
                          : `text-gray-700 hover:text-gray-900 hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 ${showActivitiesDropdown || showMembersDropdown ? 'bg-gradient-to-r from-purple-50 to-blue-50 text-gray-900' : ''}`
                      }`}
                    >
                      <IconComponent className={`w-4 h-4 transition-transform duration-300 group-hover:scale-110 ${showActivitiesDropdown || showMembersDropdown ? 'scale-110' : ''}`} />
                      <span className="font-semibold">{item.name}</span>
                      <ChevronDown className={`w-4 h-4 transition-all duration-300 ${
                        (item.name === 'Hoạt động' && showActivitiesDropdown) || 
                        (item.name === 'Thành viên' && showMembersDropdown) 
                          ? 'rotate-180' : ''
                      }`} />
                    </button>
                    
                    {(item.name === 'Hoạt động' && showActivitiesDropdown) && (
                      <div className={`absolute top-full left-0 mt-3 w-72 ${isDarkMode ? 'bg-gray-900/95 border-gray-700/50' : 'bg-white/95 border-gray-200/50'} rounded-2xl shadow-2xl border backdrop-blur-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-300`}>
                        {item.children?.map((child) => {
                          const ChildIcon = child.icon;
                          const isChildActive = typeof window !== 'undefined' && window.location.pathname === child.href;
                          return (
                            <button
                              key={child.name}
                              className={`relative w-full text-left flex items-center gap-x-3 px-5 py-3 text-sm font-medium transition-all duration-300 group ${
                                isDarkMode 
                                  ? `text-gray-200 hover:text-white hover:bg-gradient-to-r hover:from-purple-600/20 hover:to-blue-600/20 ${isChildActive ? 'bg-gradient-to-r from-purple-600/20 to-blue-600/20 text-white' : ''}` 
                                  : `text-gray-700 hover:text-gray-900 hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 ${isChildActive ? 'bg-gradient-to-r from-purple-50 to-blue-50 text-gray-900' : ''}`
                              }`}
                              onClick={() => {
                                setShowActivitiesDropdown(false);
                                setShowMembersDropdown(false);
                                router.push(child.href);
                              }}
                            >
                              <ChildIcon className={`w-4 h-4 transition-transform duration-300 group-hover:scale-110 ${isChildActive ? 'scale-110' : ''}`} />
                              <span className="font-semibold">{child.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {(item.name === 'Thành viên' && showMembersDropdown) && (
                      <div className={`absolute top-full left-0 mt-3 w-72 ${isDarkMode ? 'bg-gray-900/95 border-gray-700/50' : 'bg-white/95 border-gray-200/50'} rounded-2xl shadow-2xl border backdrop-blur-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-300`}>
                        {item.children?.map((child) => {
                          const ChildIcon = child.icon;
                          const isChildActive = typeof window !== 'undefined' && window.location.pathname === child.href;
                          return (
                            <button
                              key={child.name}
                              className={`relative w-full text-left flex items-center gap-x-3 px-5 py-3 text-sm font-medium transition-all duration-300 group ${
                                isDarkMode 
                                  ? `text-gray-200 hover:text-white hover:bg-gradient-to-r hover:from-purple-600/20 hover:to-blue-600/20 ${isChildActive ? 'bg-gradient-to-r from-purple-600/20 to-blue-600/20 text-white' : ''}` 
                                  : `text-gray-700 hover:text-gray-900 hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 ${isChildActive ? 'bg-gradient-to-r from-purple-50 to-blue-50 text-gray-900' : ''}`
                              }`}
                              onClick={() => {
                                setShowActivitiesDropdown(false);
                                setShowMembersDropdown(false);
                                router.push(child.href);
                              }}
                            >
                              <ChildIcon className={`w-4 h-4 transition-transform duration-300 group-hover:scale-110 ${isChildActive ? 'scale-110' : ''}`} />
                              <span className="font-semibold">{child.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <a
                    key={item.name}
                    href={item.href}
                    onClick={(e) => {
                      // Nếu là "Đăng ký CLB" và chưa đăng nhập, redirect đến trang đăng nhập
                      if ((item.name === 'Đăng ký CLB' || item.name === 'Đăng ký lại CLB') && !isAuthenticated) {
                        e.preventDefault();
                        router.push('/auth/login');
                      }
                    }}
                    className={`relative flex items-center gap-x-2.5 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-300 group ${
                      isActive 
                        ? isDarkMode 
                          ? 'bg-gradient-to-r from-purple-600/20 to-blue-600/20 text-white shadow-lg shadow-purple-500/10' 
                          : 'bg-gradient-to-r from-purple-50 to-blue-50 text-gray-900 shadow-lg shadow-purple-500/5'
                        : isDarkMode 
                          ? 'text-gray-200 hover:text-white hover:bg-gradient-to-r hover:from-purple-600/20 hover:to-blue-600/20' 
                          : 'text-gray-700 hover:text-gray-900 hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50'
                    }`}
                  >
                    <IconComponent className={`w-4 h-4 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'scale-110' : ''}`} />
                    <span className="font-semibold">{item.name}</span>
                  </a>
                );
              })}
            </div>

             {/* Right: CTA, Theme, Bell, Avatar */}
             <div className="flex items-center gap-x-2">

                             {/* CTA Button - Removed to avoid duplication with Members dropdown */}

              {/* Theme Toggle */}
              <button
                onClick={toggleDarkMode}
                className={`p-2.5 rounded-xl transition-all duration-300 hover:scale-110 ${
                  isDarkMode 
                    ? 'text-yellow-300 hover:bg-yellow-500/20 hover:text-yellow-200' 
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
                title={isDarkMode ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
              >
                {isDarkMode ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>

              {/* News/Bản tin Button - Chỉ hiển thị khi đã đăng nhập */}
              {isAuthenticated && (
                <div className="relative news-dropdown">
                  <button
                    onClick={() => {
                      setShowNewsDropdown(!showNewsDropdown);
                      setShowNotificationDropdown(false);
                      if (!showNewsDropdown) {
                        loadNewsPosts();
                      }
                    }}
                    className={`relative p-2.5 rounded-xl transition-all duration-300 hover:scale-110 ${
                      isDarkMode 
                        ? 'text-gray-200 hover:bg-purple-500/20 hover:text-purple-300' 
                        : 'text-gray-700 hover:bg-purple-50 hover:text-purple-600'
                    } ${showNewsDropdown ? (isDarkMode ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-50 text-purple-600') : ''}`}
                    title="Bản tin"
                  >
                    <Newspaper className="w-5 h-5" />
                  </button>

                  {showNewsDropdown && (
                    <div className={`absolute right-0 mt-3 w-96 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg shadow-xl py-0 z-50 border max-h-[600px] overflow-hidden`}>
                      {/* Header */}
                      <div className={`px-6 py-4 border-b ${isDarkMode ? 'border-gray-600 bg-gray-800/50' : 'border-gray-100 bg-gray-50/50'}`}>
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-600'}`}>
                            <Newspaper className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              Bản tin
                            </h3>
                            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              Cập nhật từ CLB
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {/* News List */}
                      <div className="overflow-y-auto max-h-[450px]">
                        {newsLoading ? (
                          <div className={`px-6 py-12 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin" />
                            <p className="text-sm">Đang tải bản tin...</p>
                          </div>
                        ) : newsPosts.length === 0 ? (
                          <div className={`px-6 py-12 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
                              <Newspaper className="h-8 w-8 opacity-50" />
                            </div>
                            <p className="text-sm font-medium mb-1">Chưa có bản tin nào</p>
                            <p className="text-xs opacity-75">Các bản tin sẽ hiển thị ở đây</p>
                          </div>
                        ) : (
                          <div className="py-2">
                            {newsPosts.map((post) => (
                              <div
                                key={post._id}
                                className={`mx-3 mb-3 rounded-xl p-4 transition-all duration-200 hover:scale-[1.01] ${isDarkMode ? 'bg-gray-700/30 hover:bg-gray-700/50' : 'bg-gray-50 hover:bg-gray-100'}`}
                              >
                                {/* Post Header */}
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                                    {post.author?.avatarUrl ? (
                                      <img
                                        src={post.author.avatarUrl}
                                        alt={post.author.name}
                                        className="w-8 h-8 rounded-full object-cover"
                                      />
                                    ) : (
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`}>
                                        <User className="w-4 h-4" />
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} truncate`}>
                                        {post.author?.name || 'Admin'}
                                      </p>
                                      <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                        {new Date(post.createdAt).toLocaleString('vi-VN', {
                                          day: '2-digit',
                                          month: '2-digit',
                                          year: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </p>
                                    </div>
                                  </div>
                                  {post.isPinned && (
                                    <div className={`p-1 rounded ${isDarkMode ? 'bg-yellow-500/20' : 'bg-yellow-100'}`} title="Bản tin ghim">
                                      <Sparkles className={`w-4 h-4 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
                                    </div>
                                  )}
                                </div>

                                {/* Post Content */}
                                {post.imageUrl && (
                                  <div className="mb-3 rounded-lg overflow-hidden">
                                    <img
                                      src={post.imageUrl}
                                      alt={post.title}
                                      className="w-full h-48 object-cover"
                                    />
                                  </div>
                                )}
                                <h4 className={`text-sm font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {post.title}
                                </h4>
                                <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} line-clamp-3 mb-3`}>
                                  {post.content}
                                </p>

                                {/* Interaction Buttons */}
                                <div className="flex items-center gap-4 pt-3 border-t border-gray-200 dark:border-gray-600">
                                  <button
                                    onClick={() => handleLikePost(post._id, post.isLiked)}
                                    disabled={interactingPosts.has(post._id)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-200 ${
                                      post.isLiked
                                        ? isDarkMode
                                          ? 'bg-red-500/20 text-red-400'
                                          : 'bg-red-50 text-red-600'
                                        : isDarkMode
                                          ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-300'
                                          : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
                                    }`}
                                  >
                                    <Heart className={`w-4 h-4 ${post.isLiked ? 'fill-current' : ''}`} />
                                    <span className="text-xs font-medium">{post.likesCount || 0}</span>
                                  </button>
                                  <button
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-200 ${
                                      isDarkMode
                                        ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-300'
                                        : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
                                    }`}
                                  >
                                    <MessageCircle className="w-4 h-4" />
                                    <span className="text-xs font-medium">{post.commentsCount || 0}</span>
                                  </button>
                                  <button
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-200 ${
                                      isDarkMode
                                        ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-300'
                                        : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
                                    }`}
                                  >
                                    <Share2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {/* Footer */}
                      {newsPosts.length > 0 && (
                        <div className={`px-6 py-3 border-t ${isDarkMode ? 'border-gray-600 bg-gray-800/50' : 'border-gray-100 bg-gray-50/50'}`}>
                          <a
                            href="/student/news"
                            className={`flex items-center justify-center w-full py-2 text-sm font-medium rounded-lg transition-all duration-200 ${isDarkMode ? 'text-purple-400 hover:text-purple-300 hover:bg-purple-500/20' : 'text-purple-600 hover:text-purple-700 hover:bg-purple-50'}`}
                          >
                            <span>Xem tất cả bản tin</span>
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Bell with Badge - Chỉ hiển thị khi đã đăng nhập */}
              {isAuthenticated && (
                <div className="relative notification-dropdown">
                  <button
                    onClick={() => {
                      setShowNotificationDropdown(!showNotificationDropdown);
                      setShowNewsDropdown(false);
                      if (!showNotificationDropdown) {
                        loadNotifications();
                      }
                    }}
                    className={`relative p-2.5 rounded-xl transition-all duration-300 hover:scale-110 ${
                      isDarkMode 
                        ? 'text-gray-200 hover:bg-blue-500/20 hover:text-blue-300' 
                        : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                    } ${showNotificationDropdown ? (isDarkMode ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-50 text-blue-600') : ''}`}
                    title="Thông báo"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900 shadow-lg animate-pulse">
                        <span className="text-[10px] text-white font-bold">{unreadCount > 99 ? '99+' : unreadCount}</span>
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
                            <Bell className="h-5 w-5" />
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
                            <Bell className="h-8 w-8 opacity-50" />
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
                                <div className={`w-3 h-3 rounded-full mt-1.5 ${notification.isRead ? (isDarkMode ? 'bg-gray-500' : 'bg-gray-300') : 'bg-blue-500 animate-pulse'}`} style={{ flexShrink: 0 }}></div>
                                
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
                                        <Clock className="h-3 w-3 mr-1" />
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
                                          <User className="h-3 w-3 mr-1" />
                                          {notification.createdBy.name}
                                          {notification.createdBy.studentId && (
                                            <span className="ml-1 opacity-75">({notification.createdBy.studentId})</span>
                                          )}
                                        </p>
                                      ) : (
                                        <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} flex items-center`}>
                                          <Info className="h-3 w-3 mr-1" />
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
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </a>
                      </div>
                    )}
                  </div>
                )}
                </div>
              )}

              {/* Avatar with Profile Dropdown */}
              <div className="relative profile-dropdown">
                <button
                  onClick={() => {
                    if (!isAuthenticated) {
                      router.push('/auth/login');
                      return;
                    }
                    setShowProfileDropdown(!showProfileDropdown);
                  }}
                  className={`flex items-center gap-x-2.5 p-1.5 rounded-xl transition-all duration-300 ${
                    isDarkMode 
                      ? 'hover:bg-gray-800/80' 
                      : 'hover:bg-gray-100'
                  } ${showProfileDropdown ? (isDarkMode ? 'bg-gray-800/80 ring-2 ring-purple-500/50' : 'bg-gray-100 ring-2 ring-purple-500/30') : ''}`}
                >
                  <div className="relative">
                    {isAuthenticated && user?.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt="Avatar"
                        className={`w-9 h-9 rounded-full object-cover ring-2 shadow-md ${
                          isDarkMode ? 'ring-gray-600' : 'ring-gray-200'
                        }`}
                      />
                    ) : (
                      <div className={`w-9 h-9 bg-gradient-to-br from-gray-400 via-gray-500 to-gray-600 rounded-full flex items-center justify-center ring-2 shadow-md ${
                        isDarkMode ? 'ring-gray-600' : 'ring-gray-200'
                      }`}>
                        <User className="w-5 h-5 text-white" />
                      </div>
                    )}
                    {isAuthenticated && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full border-2 border-white dark:border-gray-900 shadow-lg"></div>
                    )}
                  </div>
                  <div className="hidden md:flex items-center gap-x-2">
                    <div className="text-left">
                      <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {isAuthenticated && user ? (user.name || 'Sinh viên') : 'Khách'}
                      </p>
                      {isAuthenticated && getMembershipChip()}
                      {!isAuthenticated && (
                        <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Chưa đăng nhập
                        </span>
                      )}
                    </div>
                    {isAuthenticated && (
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showProfileDropdown ? 'rotate-180' : ''} ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`} />
                    )}
                  </div>
                </button>

                {showProfileDropdown && isAuthenticated && (
                  <div className={`absolute right-0 mt-3 w-72 ${isDarkMode ? 'bg-gray-900/95 border-gray-700' : 'bg-white/95 border-gray-200'} rounded-xl shadow-2xl border backdrop-blur-md py-3 z-50`}>
                    <div className={`px-5 py-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                      <div className="flex items-center gap-x-4">
                        {user?.avatarUrl ? (
                          <img
                            src={user.avatarUrl}
                            alt="Avatar"
                            className={`w-12 h-12 rounded-full object-cover ring-2 shadow-md ${
                              isDarkMode ? 'ring-gray-600' : 'ring-gray-200'
                            }`}
                          />
                        ) : (
                          <div className={`w-12 h-12 bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600 rounded-full flex items-center justify-center ring-2 shadow-md ${
                            isDarkMode ? 'ring-gray-600' : 'ring-gray-200'
                          }`}>
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
                        <UserCircle className="w-4 h-4" />
                        <span>Hồ sơ cá nhân</span>
                      </a>
                      
                      <a 
                        href="/student/settings" 
                        className={`flex items-center gap-x-3 px-5 py-2.5 text-sm font-medium rounded-lg mx-2 ${isDarkMode ? 'text-white hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'} transition-colors duration-200`}
                      >
                        <Settings className="w-4 h-4" />
                        <span>Cài đặt</span>
                      </a>
                    </div>
                    
                    <div className={`border-t pt-2 ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                      <button
                        onClick={() => {
                          logout();
                          setShowProfileDropdown(false);
                        }}
                        className={`w-full flex items-center gap-x-3 px-5 py-2.5 text-sm font-medium rounded-lg mx-2 transition-colors duration-200 ${
                          isDarkMode 
                            ? 'text-red-400 hover:bg-red-900/20' 
                            : 'text-red-600 hover:bg-red-50'
                        }`}
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Đăng xuất</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Menu Button */}
              <div className="lg:hidden">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className={`p-2 rounded-lg transition-all duration-200 hover:bg-opacity-80 ${
                    isDarkMode 
                      ? 'text-gray-200 hover:bg-gray-800/80' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {isMenuOpen ? (
                    <X className="w-5 h-5" />
                  ) : (
                    <Menu className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className={`lg:hidden border-t ${isDarkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'} shadow-lg animate-in slide-in-from-top duration-300`}>
              <div className="px-4 py-4 space-y-2">
                {menuItems.map((item) => {
                  const IconComponent = item.icon;
                  const isActive = typeof window !== 'undefined' && window.location.pathname === item.href;
                  return (
                    <a
                      key={item.name}
                      href={item.href}
                      onClick={(e) => {
                        setIsMenuOpen(false);
                        // Nếu là "Đăng ký CLB" và chưa đăng nhập, redirect đến trang đăng nhập
                        if ((item.name === 'Đăng ký CLB' || item.name === 'Đăng ký lại CLB') && !isAuthenticated) {
                          e.preventDefault();
                          router.push('/auth/login');
                        }
                      }}
                      className={`flex items-center gap-x-3 px-4 py-3.5 text-sm font-semibold rounded-xl transition-all duration-300 ${
                        isActive
                          ? isDarkMode 
                            ? 'bg-gradient-to-r from-purple-600/20 to-blue-600/20 text-white' 
                            : 'bg-gradient-to-r from-purple-50 to-blue-50 text-gray-900'
                          : isDarkMode 
                            ? 'text-white hover:bg-gray-800' 
                            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <IconComponent className="w-5 h-5" />
                      <span>{item.name}</span>
                    </a>
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