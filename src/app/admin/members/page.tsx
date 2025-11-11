'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import AdminNav from '@/components/admin/AdminNav';
import Footer from '@/components/common/Footer';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import Image from 'next/image';
import MemberDetailModal from './components/MemberDetailModal';
import MemberEditModal from './components/MemberEditModal';
import MemberDeleteModal from './components/MemberDeleteModal';

interface ClubMember {
  _id: string;
  userId?: {
    _id: string;
    studentId: string;
    name: string;
    email: string;
    role: 'SUPER_ADMIN' | 'CLUB_LEADER' | 'CLUB_DEPUTY' | 'CLUB_MEMBER' | 'CLUB_STUDENT' | 'STUDENT';
    phone?: string;
    class?: string;
    faculty?: string;
    avatarUrl?: string;
  };
  status: 'ACTIVE' | 'PENDING' | 'REJECTED' | 'REMOVED';
  joinedAt: string;
  approvedAt?: string;
  approvedBy?: {
    _id: string;
    name: string;
    studentId: string;
  };
  removedAt?: string;
  removedBy?: {
    _id: string;
    name: string;
    studentId: string;
  };
  removalReason?: string;
  removalReasonTrue?: string;
  motivation?: string;
  experience?: string;
  expectations?: string;
  commitment?: string;
  // Reapplication fields
  previousStatus?: 'ACTIVE' | 'PENDING' | 'REJECTED' | 'REMOVED';
  reapplicationAt?: string;
  reapplicationReason?: string;
  isReapplication?: boolean;
  // Restoration fields
  restoredBy?: {
    _id: string;
    name: string;
    studentId: string;
  };
  restoredAt?: string;
  restorationReason?: string;
  // Removal history for multiple removals and restorations
  removalHistory?: Array<{
    removedAt: string;
    removedBy: {
      _id: string;
      name: string;
      studentId: string;
    };
    removalReason: string;
    restoredAt?: string;
    restoredBy?: string;
    restorationReason?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export default function MembersPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [roleDropdownPosition, setRoleDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const roleButtonRef = useRef<HTMLButtonElement>(null);
  const [facultyFilter, setFacultyFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<string>('joinedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [membersPerPage] = useState(10);
  const [totalMembers, setTotalMembers] = useState(0);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    pending: 0,
    rejected: 0,
    removed: 0,
    admins: 0,
    leaders: 0,
    deputies: 0,
    members: 0,
    students: 0
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [showExportToast, setShowExportToast] = useState(false);
  const [showRemovedMembers, setShowRemovedMembers] = useState(false);

  // Modal states
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<ClubMember | null>(null);
  const [restorationReason, setRestorationReason] = useState('');
  const [restoring, setRestoring] = useState(false);

  // Danh sách khoa/viện
  const facultyOptions = [
    'Trường Kinh Tế Tài Chính',
    'Trường Luật Và Quản Lí Phát Triển',
    'Viện Kỹ Thuật Công Nghệ',
    'Viện Đào Tạo Ngoại Ngữ',
    'Viện Đào Tạo CNTT Chuyển Đổi Số',
    'Viện Đào Tạo Kiến Trúc Xây Dựng Và Giao Thông',
    'Khoa Sư Phạm',
    'Khoa Kiến Thức Chung',
    'Khoa Công Nghiệp Văn Hóa Thể Thao Và Du Lịch',
    'Ban Quản Lý Đào Tạo Sau Đại Học'
  ];

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);

  // Check if desktop
  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  // Load theme and sidebar state from localStorage on component mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
    }

    const savedSidebarState = localStorage.getItem('sidebarOpen');
    if (savedSidebarState !== null) {
      setIsSidebarOpen(savedSidebarState === 'true');
    }

    // Listen for theme changes from AdminNav
    const handleThemeChange = () => {
      const currentTheme = localStorage.getItem('theme');
      setIsDarkMode(currentTheme === 'dark');
    };

    window.addEventListener('themeChange', handleThemeChange);
    
    // Listen for sidebar state changes via custom event
    const handleSidebarChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ isOpen: boolean }>;
      if (customEvent.detail) {
        setIsSidebarOpen(customEvent.detail.isOpen);
      }
    };

    window.addEventListener('sidebarStateChange', handleSidebarChange);
    
    // Also check localStorage periodically as fallback
    const checkSidebarState = () => {
      const currentSidebarState = localStorage.getItem('sidebarOpen');
      if (currentSidebarState !== null) {
        const newState = currentSidebarState === 'true';
        setIsSidebarOpen(prev => {
          if (prev !== newState) {
            return newState;
          }
          return prev;
        });
      }
    };
    
    checkSidebarState();
    const intervalId = setInterval(checkSidebarState, 100);

    return () => {
      window.removeEventListener('themeChange', handleThemeChange);
      window.removeEventListener('sidebarStateChange', handleSidebarChange);
      clearInterval(intervalId);
    };
  }, []);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      
      // Handle role filtering - use selectedRoles if available, otherwise use roleFilter
      if (selectedRoles.length > 0) {
        selectedRoles.forEach(role => params.append('role', role));
      } else if (roleFilter !== 'ALL') {
        params.append('role', roleFilter);
      }
      
      if (facultyFilter !== 'ALL') params.append('faculty', facultyFilter);
      // Set status based on showRemovedMembers state
      if (showRemovedMembers) {
        params.append('status', 'REMOVED');
      } else {
        params.append('status', 'ACTIVE'); // Only load active members
      }
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);
      params.append('page', currentPage.toString());
      params.append('limit', membersPerPage.toString());

      // Get auth token
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`/api/memberships?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load members');
      }

      const data = await response.json();
      
      if (data.success) {
        // Debug removedAt data for REMOVED members
        if (showRemovedMembers) {
          console.log('DEBUG: REMOVED members data:', data.data.memberships.map((m: any) => ({
            id: m._id,
            status: m.status,
            removedAt: m.removedAt,
            removalReason: m.removalReason
          })));
        }
        
        setMembers(data.data.memberships);
        setTotalMembers(data.data.total || data.data.memberships.length);
      } else {
        throw new Error(data.error || 'Failed to load members');
      }
    } catch (error) {
      console.error('Error loading members:', error);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, roleFilter, selectedRoles, facultyFilter, sortBy, sortOrder, currentPage, showRemovedMembers, membersPerPage]);

  // Load members data
  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // Fetch all active memberships to calculate stats
      const activeResponse = await fetch('/api/memberships?status=ACTIVE&limit=1000', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Fetch removed memberships for stats
      const removedResponse = await fetch('/api/memberships?status=REMOVED&limit=1000', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      let activeMemberships: any[] = [];
      let removedMemberships: any[] = [];

      if (activeResponse.ok) {
        const activeData = await activeResponse.json();
        if (activeData.success) {
          activeMemberships = activeData.data.memberships;
        }
      }

      if (removedResponse.ok) {
        const removedData = await removedResponse.json();
        if (removedData.success) {
          removedMemberships = removedData.data.memberships;
        }
      }

      // Calculate role-based stats
      const roleStats = {
        admins: activeMemberships.filter(m => m.userId?.role === 'SUPER_ADMIN').length,
        leaders: activeMemberships.filter(m => m.userId?.role === 'CLUB_LEADER').length,
        deputies: activeMemberships.filter(m => m.userId?.role === 'CLUB_DEPUTY').length,
        members: activeMemberships.filter(m => m.userId?.role === 'CLUB_MEMBER').length,
        students: activeMemberships.filter(m => m.userId?.role === 'CLUB_STUDENT').length
      };

      setStats({
        total: activeMemberships.length,
        active: activeMemberships.length,
        pending: 0, // This page only shows active members
        rejected: 0,
        removed: removedMemberships.length,
        ...roleStats
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Load stats
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Pagination
  const totalPages = Math.ceil(totalMembers / membersPerPage);

  const getRoleBadge = (role: string | undefined | null) => {
    // Handle undefined, null, or empty string
    if (!role || role.trim() === '') {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
          Không xác định
        </span>
      );
    }

    const roleConfig = {
      SUPER_ADMIN: { color: 'bg-purple-100 text-purple-800', text: 'Quản Trị Hệ Thống' },
      CLUB_LEADER: { color: 'bg-red-100 text-red-800', text: 'Chủ Nhiệm CLB' },
      CLUB_DEPUTY: { color: 'bg-orange-100 text-orange-800', text: 'Phó Chủ Nhiệm' },
      CLUB_MEMBER: { color: 'bg-blue-100 text-blue-800', text: 'Ủy Viên BCH' },
      CLUB_STUDENT: { color: 'bg-green-100 text-green-800', text: 'Thành Viên CLB' },
      STUDENT: { color: 'bg-gray-100 text-gray-800', text: 'Sinh Viên' }
    };
    
    const config = roleConfig[role as keyof typeof roleConfig];
    if (!config) {
      console.warn(`Unknown role: ${role}`);
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
          Không xác định
        </span>
      );
    }
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) {
      return 'Không có';
    }
    
    try {
      const date = new Date(dateString);
      // Kiểm tra xem date có hợp lệ không (không phải Invalid Date)
      if (isNaN(date.getTime())) {
        return 'Không hợp lệ';
      }
      
      return date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', dateString, error);
      return 'Không hợp lệ';
    }
  };

  // Hàm tính toán lần duyệt thứ mấy
  const getRestorationCount = (member: ClubMember) => {
    // Đếm số lần duyệt lại dựa trên removalHistory
    if (member.removalHistory && member.removalHistory.length > 0) {
      // Loại bỏ các entries trùng lặp dựa trên removedAt (trong vòng 1 giây)
      // Ưu tiên giữ lại entry có thông tin duyệt lại
      const uniqueHistory = member.removalHistory.reduce((acc, history) => {
        const existingIndex = acc.findIndex(h => 
          Math.abs(new Date(h.removedAt).getTime() - new Date(history.removedAt).getTime()) < 1000
        );
        
        if (existingIndex === -1) {
          // Không tìm thấy entry trùng lặp, thêm vào
          acc.push(history);
        } else {
          // Tìm thấy entry trùng lặp, kiểm tra xem có thông tin duyệt lại không
          const existing = acc[existingIndex];
          const hasRestorationInfo = history.restoredAt && history.restorationReason;
          const existingHasRestorationInfo = existing.restoredAt && existing.restorationReason;
          
          // Nếu entry mới có thông tin duyệt lại mà entry cũ không có, thay thế
          if (hasRestorationInfo && !existingHasRestorationInfo) {
            acc[existingIndex] = history;
          }
          // Nếu cả hai đều có hoặc đều không có thông tin duyệt lại, giữ lại entry đầu tiên
        }
        return acc;
      }, [] as typeof member.removalHistory);

      // Đếm số entry có thông tin duyệt lại sau khi đã loại bỏ trùng lặp
      const restorationCount = uniqueHistory.filter(history => 
        history.restoredAt && history.restorationReason
      ).length;
      return restorationCount;
    }
    
    // Fallback: nếu không có removalHistory, kiểm tra restoredAt
    if (member.restoredAt) {
      return 1; // Có ít nhất 1 lần duyệt lại
    }
    
    return 0; // Chưa có lần duyệt lại nào
  };

  // Hàm lấy text cho lần duyệt
  const getRestorationText = (count: number) => {
    switch (count) {
      case 1:
        return 'lần đầu';
      case 2:
        return 'lần thứ 2';
      case 3:
        return 'lần thứ 3';
      default:
        return `lần thứ ${count}`;
    }
  };

  // Modal handlers
  const openDetailModal = (memberId: string) => {
    setSelectedMemberId(memberId);
    setShowDetailModal(true);
  };

  const openEditModal = (memberId: string) => {
    setSelectedMemberId(memberId);
    setShowEditModal(true);
  };

  const openDeleteModal = (memberId: string) => {
    setSelectedMemberId(memberId);
    setShowDeleteModal(true);
  };

  const openRestoreModal = (memberId: string) => {
    const member = members.find(m => m._id === memberId);
    setSelectedMemberId(memberId);
    setSelectedMember(member || null);
    setRestorationReason('');
    setShowRestoreModal(true);
  };

  const closeModals = () => {
    setShowDetailModal(false);
    setShowEditModal(false);
    setShowDeleteModal(false);
    setShowRestoreModal(false);
    setSelectedMemberId(null);
    setSelectedMember(null);
    setRestorationReason('');
  };

  // Close modal when clicking outside
  const handleModalBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeModals();
    }
  };



  const handleMemberUpdated = () => {
    loadMembers();
    loadStats();
  };

  const handleMemberDeleted = () => {
    loadMembers();
    loadStats();
  };

  const handleRestoreMember = async () => {
    if (!restorationReason.trim()) {
      alert('Vui lòng nhập lý do duyệt lại');
      return;
    }

    if (!selectedMemberId) {
      alert('Không tìm thấy thông tin thành viên');
      return;
    }

    if (restoring) {
      return;
    }

    setRestoring(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Không tìm thấy token đăng nhập');
        return;
      }

      const response = await fetch(`/api/memberships/${selectedMemberId}/restore`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          restorationReason: restorationReason.trim()
        })
      });

      const responseData = await response.json();

      if (response.ok) {
        alert('Duyệt lại thành viên thành công!');
        closeModals();
        loadMembers();
        loadStats();
      } else {
        alert('Có lỗi khi duyệt lại: ' + (responseData.error || 'Unknown error'));
      }
    } catch (err: any) {
      console.error('Error restoring member:', err);
      alert('Có lỗi khi duyệt lại: ' + err.message);
    } finally {
      setRestoring(false);
    }
  };

  const handleResetWaitTime = async (membershipId: string) => {
    if (!confirm('Bạn có chắc muốn reset thời gian chờ để cho phép user này đăng ký lại ngay?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Không tìm thấy token đăng nhập');
        return;
      }

      const response = await fetch(`/api/memberships/${membershipId}/reset-wait-time`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        alert('Reset thời gian chờ thành công! User có thể đăng ký lại ngay.');
        // Refresh the page to show updated data
        window.location.reload();
      } else {
        const errorData = await response.json();
        alert('Có lỗi khi reset thời gian chờ: ' + (errorData.error || 'Unknown error'));
      }
    } catch (err: any) {
      console.error('Error resetting wait time:', err);
      alert('Có lỗi khi reset thời gian chờ: ' + err.message);
    }
  };

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      
      // Tạo parameters cho API export (bao gồm cả filter hiện tại)
      const params = new URLSearchParams({
        ...(searchTerm && { search: searchTerm }),
        ...(facultyFilter !== 'ALL' && { faculty: facultyFilter }),
        includeRemoved: showRemovedMembers.toString() // Thêm parameter để bao gồm thành viên đã bị xóa
      });

      // Thêm role filter nếu có chọn vai trò
      if (selectedRoles.length > 0) {
        selectedRoles.forEach(role => {
          params.append('role', role);
        });
      }

      const response = await fetch(`/api/members/export?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to export members');
      }

      // Tạo blob từ response
      const blob = await response.blob();
      
      // Tạo URL cho blob
      const url = window.URL.createObjectURL(blob);
      
      // Tạo link để download
      const link = document.createElement('a');
      link.href = url;
      link.download = `members_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.style.display = 'none';
      
      // Thêm vào DOM và trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup sau khi download
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
      
      // Hiển thị toast thông báo
      setShowExportToast(true);
      setTimeout(() => {
        setShowExportToast(false);
      }, 3000);

    } catch (err: any) {
      console.error('Error exporting members:', err);
      alert('Có lỗi khi xuất file: ' + err.message);
    } finally {
      setExporting(false);
    }
  };



  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.role-dropdown')) {
        setRoleDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close modals with ESC key
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeModals();
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, []);

  return (
    <ProtectedRoute requiredRole="CLUB_LEADER">
      <div 
        className={`min-h-screen flex flex-col transition-colors duration-200 overflow-x-hidden ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}
        style={{
          '--sidebar-width': isSidebarOpen ? '288px' : '80px'
        } as React.CSSProperties}
      >
        <AdminNav />
        
        <main 
          className="flex-1 transition-all duration-300 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 overflow-x-hidden min-w-0"
          style={{
            marginLeft: isDesktop ? (isSidebarOpen ? '288px' : '80px') : '0',
            width: isDesktop ? `calc(100% - ${isSidebarOpen ? '288px' : '80px'})` : '100%',
            maxWidth: isDesktop ? `calc(100% - ${isSidebarOpen ? '288px' : '80px'})` : '100%'
          }}
        >
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className={`text-2xl sm:text-3xl font-bold mb-2 transition-colors duration-200 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {showRemovedMembers ? 'Thành viên đã bị xóa' : 'Thành viên CLB Sinh viên 5 Tốt'}
                </h1>
                <p className={`text-sm sm:text-base transition-colors duration-200 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  {showRemovedMembers 
                    ? 'Danh sách các thành viên đã bị xóa khỏi câu lạc bộ'
                    : 'Danh sách các thành viên đã được duyệt và tham gia câu lạc bộ'
                  }
                </p>
              </div>
              <div className="mt-4 sm:mt-0 flex space-x-3">

                <button 
                  onClick={() => router.push('/admin/memberships')}
                  className={`px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200 flex items-center space-x-2 min-w-[140px] justify-center`}
                >
                  <span>📝</span>
                  <span>Xét duyệt đơn</span>
                </button>
                <button 
                  onClick={() => router.push('/admin/members/add')}
                  className={`px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-2 min-w-[160px] justify-center`}
                >
                  <span>➕</span>
                  <span>Thêm thành viên</span>
                </button>
                <button 
                  onClick={() => setShowRemovedMembers(!showRemovedMembers)}
                  className={`px-4 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-2 min-w-[200px] justify-center whitespace-nowrap ${
                    showRemovedMembers
                      ? 'bg-orange-600 text-white hover:bg-orange-700'
                      : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                  }`}
                >
                  <span>🚫</span>
                  <span>{showRemovedMembers ? 'Ẩn' : 'Xem'} thành viên đã xóa</span>
                </button>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border p-4 shadow-sm`}>
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <span className="text-blue-600 text-xl">👥</span>
                </div>
                <div className="ml-4">
                  <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Tổng thành viên</p>
                  {statsLoading ? (
                    <div className="animate-pulse bg-gray-300 h-8 w-16 rounded"></div>
                  ) : (
                    <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stats.total}</p>
                  )}
                </div>
              </div>
            </div>
            <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border p-4 shadow-sm`}>
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <span className="text-green-600 text-xl">✅</span>
                </div>
                <div className="ml-4">
                  <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Đã duyệt</p>
                  {statsLoading ? (
                    <div className="animate-pulse bg-gray-300 h-8 w-16 rounded"></div>
                  ) : (
                    <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stats.active}</p>
                  )}
                </div>
              </div>
            </div>
            <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border p-4 shadow-sm`}>
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <span className="text-orange-600 text-xl">🚫</span>
                </div>
                <div className="ml-4">
                  <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Đã bị xóa</p>
                  {statsLoading ? (
                    <div className="animate-pulse bg-gray-300 h-8 w-16 rounded"></div>
                  ) : (
                    <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stats.removed}</p>
                  )}
                </div>
              </div>
            </div>
            <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border p-4 shadow-sm`}>
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <span className="text-purple-600 text-xl">⚡</span>
                </div>
                <div className="ml-4">
                  <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Quản Trị Hệ Thống</p>
                  {statsLoading ? (
                    <div className="animate-pulse bg-gray-300 h-8 w-16 rounded"></div>
                  ) : (
                    <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stats.admins || 0}</p>
                  )}
                </div>
              </div>
            </div>
            <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border p-4 shadow-sm`}>
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <span className="text-red-600 text-xl">👑</span>
                </div>
                <div className="ml-4">
                  <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Chủ Nhiệm CLB</p>
                  {statsLoading ? (
                    <div className="animate-pulse bg-gray-300 h-8 w-16 rounded"></div>
                  ) : (
                    <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stats.leaders || 0}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Filters and Search */}
          <div className={`${isDarkMode ? 'bg-gray-800/90 backdrop-blur-sm' : 'bg-white/95 backdrop-blur-sm'} rounded-2xl shadow-xl mb-8 border ${isDarkMode ? 'border-gray-700/50' : 'border-gray-200/50'}`} style={{ overflow: 'visible' }}>
            <div className="p-6" style={{ overflow: 'visible' }}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {/* Search */}
                <div className="flex flex-col h-full">
                  <label className={`block text-sm font-semibold mb-3 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      Tìm kiếm
                    </span>
                  </label>
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Tên, MSSV, email..."
                      className={`w-full h-12 pl-10 pr-4 border-2 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 hover:shadow-md ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400 hover:border-gray-500' : 'border-gray-200 bg-white text-gray-900 placeholder-gray-500 hover:border-gray-300'}`}
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Role Filter */}
                <div className="flex flex-col h-full">
                  <label className={`block text-sm font-semibold mb-3 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      Vai trò
                    </span>
                  </label>
                  <div className="relative role-dropdown flex-1">
                    <button
                      ref={roleButtonRef}
                      type="button"
                      onClick={() => {
                        if (roleButtonRef.current) {
                          const rect = roleButtonRef.current.getBoundingClientRect();
                          setRoleDropdownPosition({
                            top: rect.bottom + 8,
                            left: rect.left,
                            width: rect.width
                          });
                        }
                        setRoleDropdownOpen(!roleDropdownOpen);
                      }}
                      className={`w-full h-12 px-4 border-2 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 flex justify-between items-center transition-all duration-300 hover:shadow-md ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white hover:bg-gray-600 hover:border-gray-500' : 'border-gray-200 bg-white text-gray-900 hover:bg-gray-50 hover:border-gray-300'}`}
                    >
                      <span className="flex items-center">
                        {selectedRoles.length === 0 ? (
                          <>
                            <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Tất cả vai trò
                          </>
                        ) : selectedRoles.length === 1 ? (
                          <>
                            <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {selectedRoles[0] === 'SUPER_ADMIN' ? 'Quản Trị Hệ Thống' : 
                             selectedRoles[0] === 'CLUB_LEADER' ? 'Chủ Nhiệm CLB' :
                             selectedRoles[0] === 'CLUB_DEPUTY' ? 'Phó Chủ Nhiệm' :
                             selectedRoles[0] === 'CLUB_MEMBER' ? 'Ủy Viên BCH' :
                             selectedRoles[0] === 'CLUB_STUDENT' ? 'Thành Viên CLB' :
                             selectedRoles[0] === 'STUDENT' ? 'Sinh Viên' : 'Không xác định'}
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {selectedRoles.length} vai trò đã chọn
                          </>
                        )}
                      </span>
                      <svg className={`w-5 h-5 transition-transform duration-200 ${roleDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {/* Inline dropdown for testing */}
                    {roleDropdownOpen && (
                      <div className={`absolute z-[99999] w-full mt-2 border-2 rounded-xl shadow-xl ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
                        <div className="py-1">
                          {['SUPER_ADMIN', 'CLUB_LEADER', 'CLUB_DEPUTY', 'CLUB_MEMBER', 'CLUB_STUDENT', 'STUDENT'].map((role) => (
                                                          <label key={role} className={`flex items-center px-3 py-3 cursor-pointer transition-all duration-200 rounded-lg ${isDarkMode ? 'hover:bg-gray-600 hover:shadow-md' : 'hover:bg-gray-50 hover:shadow-sm'}`}>
                              <input
                                type="checkbox"
                                checked={selectedRoles.includes(role)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedRoles(prev => [...prev, role]);
                                  } else {
                                    setSelectedRoles(prev => prev.filter(r => r !== role));
                                  }
                                }}
                                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 mr-2 w-4 h-4"
                              />
                              <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                {role === 'SUPER_ADMIN' ? 'Quản Trị Hệ Thống' : 
                                 role === 'CLUB_LEADER' ? 'Chủ Nhiệm CLB' :
                                 role === 'CLUB_DEPUTY' ? 'Phó Chủ Nhiệm' :
                                 role === 'CLUB_MEMBER' ? 'Ủy Viên BCH' :
                                 role === 'CLUB_STUDENT' ? 'Thành Viên CLB' :
                                 role === 'STUDENT' ? 'Sinh Viên' : role}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Faculty Filter */}
                <div className="flex flex-col h-full">
                  <label className={`block text-sm font-semibold mb-3 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      Khoa/Viện
                    </span>
                  </label>
                  <select
                    value={facultyFilter}
                    onChange={(e) => setFacultyFilter(e.target.value)}
                    className={`w-full h-12 px-4 border-2 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 hover:shadow-md ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white hover:border-gray-500' : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'}`}
                  >
                    <option value="ALL">Tất cả khoa/viện</option>
                    {facultyOptions.map((faculty) => (
                      <option key={faculty} value={faculty}>
                        {faculty}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sort */}
                <div className="flex flex-col h-full">
                  <label className={`block text-sm font-semibold mb-3 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-2 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                      </svg>
                      Sắp xếp
                    </span>
                  </label>
                  <select
                    value={`${sortBy}-${sortOrder}`}
                    onChange={(e) => {
                      const [field, order] = e.target.value.split('-');
                      setSortBy(field);
                      setSortOrder(order as 'asc' | 'desc');
                    }}
                    className={`w-full h-12 px-4 border-2 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300 hover:shadow-md ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white hover:border-gray-500' : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'}`}
                  >
                    <option value="joinedAt-desc">Tham gia mới nhất</option>
                    <option value="joinedAt-asc">Tham gia cũ nhất</option>
                    <option value="name-asc">Tên A-Z</option>
                    <option value="name-desc">Tên Z-A</option>
                    <option value="studentId-asc">MSSV A-Z</option>
                    <option value="studentId-desc">MSSV Z-A</option>
                  </select>
                </div>

                {/* Export */}
                <div className="flex flex-col h-full">
                  <label className={`block text-sm font-semibold mb-3 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-2 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Xuất dữ liệu
                    </span>
                  </label>
                  <button
                    onClick={handleExportExcel}
                    disabled={exporting}
                    className={`w-full h-12 px-4 border-2 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-300 hover:shadow-lg ${isDarkMode ? 'border-emerald-600 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white hover:from-emerald-700 hover:to-emerald-800 hover:border-emerald-500' : 'border-emerald-500 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 hover:border-emerald-400'} disabled:opacity-50 disabled:cursor-not-allowed`}
                                      >
                      {exporting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          <span className="text-sm font-medium">Đang xuất...</span>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center">
                          <span className="text-sm font-medium">
                            Xuất Excel
                          </span>
                          {showRemovedMembers && (
                            <span className="text-xs text-emerald-200 font-medium">(Đã xóa)</span>
                          )}
                          {!showRemovedMembers && (
                            <span className="text-xs text-emerald-200 font-medium">(Đang hoạt động)</span>
                          )}
                        </div>
                      )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Members Table */}
          <div className={`${isDarkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900' : 'bg-gradient-to-br from-white to-gray-50'} rounded-2xl border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} shadow-xl overflow-hidden`}>
            {loading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className={`text-lg font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Đang tải dữ liệu...</p>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-2`}>Vui lòng chờ trong giây lát</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className={`${isDarkMode ? 'bg-gradient-to-r from-gray-700 to-gray-800' : 'bg-gradient-to-r from-gray-50 to-gray-100'}`}>
                      <tr>
                        <th className={`px-6 py-3 text-center ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                          <div className="flex flex-col items-center justify-center">
                            <div className={`p-1 rounded-md ${isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'} mb-1`}>
                              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                            <div className="text-xs font-semibold text-gray-900">Thành viên</div>
                          </div>
                        </th>
                        <th className={`px-6 py-3 text-center ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                          <div className="flex flex-col items-center justify-center">
                            <div className={`p-1 rounded-md ${isDarkMode ? 'bg-green-500/20' : 'bg-green-100'} mb-1`}>
                              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <div className="text-xs font-semibold text-gray-900">Thông tin liên hệ</div>
                          </div>
                        </th>
                        <th className={`px-6 py-3 text-center ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                          <div className="flex flex-col items-center justify-center">
                            <div className={`p-1 rounded-md ${isDarkMode ? 'bg-purple-500/20' : 'bg-purple-100'} mb-1`}>
                              <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                            </div>
                            <div className="text-xs font-semibold text-gray-900">Vai trò & Ngày tham gia</div>
                          </div>
                        </th>
                        <th className={`px-6 py-3 text-center ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                          <div className="flex flex-col items-center justify-center">
                            <div className={`p-1 rounded-md ${isDarkMode ? 'bg-orange-500/20' : 'bg-orange-100'} mb-1`}>
                              <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div className="text-xs font-semibold text-gray-900">{showRemovedMembers ? 'Người xóa' : 'Người duyệt'}</div>
                          </div>
                        </th>
                        <th className={`px-6 py-3 text-center ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                          <div className="flex flex-col items-center justify-center">
                            <div className={`p-1 rounded-md ${isDarkMode ? 'bg-red-500/20' : 'bg-red-100'} mb-1`}>
                              <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                              </svg>
                            </div>
                            <div className="text-xs font-semibold text-gray-900">{showRemovedMembers ? 'Thông tin xóa' : 'Thao tác'}</div>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className={`${isDarkMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'}`}>
                      {members.map((member: ClubMember, index: number) => (
                        <tr key={member._id} className={`${isDarkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50/80'} transition-all duration-300 ${index % 2 === 0 ? (isDarkMode ? 'bg-gray-800/30' : 'bg-gray-50/30') : ''}`}>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col items-center text-center">
                              <div className="flex-shrink-0 h-12 w-12 mb-2">
                                {member.userId?.avatarUrl ? (
                                  <Image
                                    src={member.userId.avatarUrl}
                                    alt={member.userId.name || 'User'}
                                    width={48}
                                    height={48}
                                    className="h-12 w-12 rounded-lg object-cover border border-gray-200 shadow-md"
                                  />
                                ) : (
                                  <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center border border-gray-200 shadow-md">
                                    <span className="text-white text-sm font-bold">
                                      {getInitials(member.userId?.name || 'U')}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {member.userId?.name || 'Không có tên'}
                                </div>
                                <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                                  {member.userId?.studentId || 'Không có MSSV'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-900'} text-center`}>
                              <div className="flex flex-col items-center space-y-1">
                                <div className="flex items-center">
                                  <svg className="w-3 h-3 text-blue-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                  </svg>
                                  <span className="font-medium">{member.userId?.email || 'Không có email'}</span>
                                </div>
                                {member.userId?.phone && (
                                  <div className={`flex items-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    <svg className="w-3 h-3 text-red-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                    <span>{member.userId.phone}</span>
                                  </div>
                                )}
                                {member.userId?.class && member.userId?.faculty && (
                                  <div className={`flex items-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    <svg className="w-3 h-3 text-orange-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                    <span>{member.userId.class} - {member.userId.faculty}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col items-center space-y-2 text-center">
                              <div className="flex items-center justify-center">
                                {getRoleBadge(member.userId?.role)}
                              </div>
                              <div className={`flex items-center text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                <svg className="w-3 h-3 text-purple-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span>{formatDate(member.joinedAt)}</span>
                              </div>
                              
                              {/* Show reapplication warning if this is a reapplication */}
                              {member.isReapplication && (
                                <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 mt-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                      <span className="text-orange-600 mr-1">⚠️</span>
                                      <span className="text-xs font-medium text-orange-800">
                                        Đăng ký lại sau khi bị xóa
                                      </span>
                                    </div>
                                    {/* Reset Wait Time Button for Admins */}
                                    {(user?.role === 'SUPER_ADMIN' || user?.role === 'CLUB_LEADER') && (
                                      <button
                                        onClick={() => handleResetWaitTime(member._id)}
                                        className="px-2 py-1 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-md hover:from-orange-600 hover:to-red-600 transition-all duration-300 hover:shadow-md hover:scale-105 text-xs font-medium flex items-center space-x-1"
                                        title="Reset thời gian chờ để cho phép đăng ký lại ngay"
                                      >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                        <span>Reset</span>
                                      </button>
                                    )}
                                  </div>
                                  {member.reapplicationReason && (
                                    <div className="text-xs text-orange-700 mt-1">
                                      Lý do: {member.reapplicationReason}
                                    </div>
                                  )}
                                  {member.removalReason && (
                                    <div className="text-xs text-orange-700 mt-1">
                                      Lý do xóa trước: {member.removalReasonTrue || member.removalReason}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                              {showRemovedMembers ? (
                                // Show removal information for removed members
                                member.removedBy ? (
                                  <>
                                    <div className="font-medium">{member.removedBy.name}</div>
                                    {member.removedAt && (
                                      <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                        {formatDate(member.removedAt)}
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    Không có thông tin
                                  </span>
                                )
                              ) : (
                                // Show approval information for active members
                                member.approvedBy ? (
                                  <>
                                    <div className="font-medium">{member.approvedBy.name}</div>
                                    <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                      {member.approvedBy.studentId}
                                    </div>
                                    {member.approvedAt && (
                                      <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                        {formatDate(member.approvedAt)}
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    Không có thông tin
                                  </span>
                                )
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {showRemovedMembers ? (
                              // Show removal information for removed members
                              <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-900'} text-center`}>
                                <div className="mb-2">
                                  <span className={`px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800`}>
                                    🚫 Đã bị xóa khỏi CLB
                                  </span>
                                </div>
                                <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  <div className="flex flex-col items-center space-y-1">
                                    <div className="flex items-center">
                                      <span className="mr-2">📅</span>
                                      <span>Xóa lúc: {member.removedAt ? formatDate(member.removedAt) : 'Không có'}</span>
                                    </div>
                                    <div className="flex items-center">
                                      <span className="mr-2">📝</span>
                                      <span>Lý do: {member.removalReasonTrue || member.removalReason || 'Không có'}</span>
                                    </div>
                                    {member.removedBy && (
                                      <div className="flex items-center">
                                        <span className="mr-2">👤</span>
                                        <span>Người xóa: {member.removedBy.name}</span>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Restore Button for Admins */}
                                  {(user?.role === 'SUPER_ADMIN' || user?.role === 'CLUB_LEADER') && (
                                    <div className="mt-3 flex justify-center">
                                      <button
                                        onClick={() => openRestoreModal(member._id)}
                                        className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-300 hover:shadow-lg hover:scale-105 flex items-center space-x-2 text-sm font-medium"
                                        title="Duyệt lại thành viên đã bị xóa"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                        <span>Duyệt lại</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              // Show action buttons for active members
                              <div className="flex items-center justify-center space-x-2">
                                <button 
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    console.log('Detail button clicked for member:', member._id);
                                    openDetailModal(member._id);
                                  }}
                                  className={`px-3 py-2 rounded-lg transition-all duration-300 hover:shadow-md hover:scale-105 ${
                                    isDarkMode 
                                      ? 'bg-gradient-to-r from-blue-500/20 to-blue-600/20 text-blue-400 hover:from-blue-500/30 hover:to-blue-600/30 hover:text-blue-300 border border-blue-500/30 hover:border-blue-500/50' 
                                      : 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-600 hover:from-blue-100 hover:to-blue-200 hover:text-blue-700 border border-blue-200 hover:border-blue-300'
                                  }`} 
                                  title="Xem chi tiết"
                                >
                                  <div className="flex items-center space-x-1">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                    <span className="text-xs font-semibold">Chi tiết</span>
                                  </div>
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    console.log('Edit button clicked for member:', member._id);
                                    openEditModal(member._id);
                                  }}
                                  className={`px-3 py-2 rounded-lg transition-all duration-300 hover:shadow-md hover:scale-105 ${
                                    isDarkMode 
                                      ? 'bg-gradient-to-r from-green-500/20 to-green-600/20 text-green-400 hover:from-green-500/30 hover:to-green-600/30 hover:text-green-300 border border-green-500/30 hover:border-green-500/50' 
                                      : 'bg-gradient-to-r from-green-50 to-green-100 text-green-600 hover:from-green-100 hover:to-green-200 hover:text-green-700 border border-green-200 hover:border-green-300'
                                  }`} 
                                  title="Chỉnh sửa"
                                >
                                  <div className="flex items-center space-x-1">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    <span className="text-xs font-semibold">Sửa</span>
                                  </div>
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    console.log('Delete button clicked for member:', member._id);
                                    openDeleteModal(member._id);
                                  }}
                                  className={`px-3 py-2 rounded-lg transition-all duration-300 hover:shadow-md hover:scale-105 ${
                                    isDarkMode 
                                      ? 'bg-gradient-to-r from-red-500/20 to-red-600/20 text-red-400 hover:from-red-500/30 hover:to-red-600/30 hover:text-red-300 border border-red-500/30 hover:border-red-500/50' 
                                      : 'bg-gradient-to-r from-red-50 to-red-100 text-red-600 hover:from-red-100 hover:to-red-200 hover:text-red-700 border border-red-200 hover:border-red-300'
                                  }`} 
                                  title="Xóa khỏi CLB"
                                >
                                  <div className="flex items-center space-x-1">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    <span className="text-xs font-semibold">Xóa</span>
                                  </div>
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Empty State */}
                {members.length === 0 && !loading && (
                  <div className="p-12 text-center">
                    <div className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
                      <span className="text-4xl">{showRemovedMembers ? '🚫' : '👥'}</span>
                    </div>
                    <h3 className={`text-xl font-bold mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                      {showRemovedMembers ? 'Chưa có thành viên nào bị xóa' : 'Chưa có thành viên nào'}
                    </h3>
                    <p className={`text-base ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} max-w-md mx-auto`}>
                      {showRemovedMembers 
                        ? 'Hiện tại chưa có thành viên nào bị xóa khỏi CLB'
                        : 'Hiện tại chưa có thành viên nào được duyệt tham gia CLB'
                      }
                    </p>
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className={`px-6 py-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} bg-gradient-to-r ${isDarkMode ? 'from-gray-800/50 to-gray-900/50' : 'from-gray-50 to-white'}`}>
                    <div className="flex items-center justify-between">
                      <div className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Hiển thị <span className="font-bold text-blue-600">{((currentPage - 1) * membersPerPage) + 1}</span> đến <span className="font-bold text-blue-600">{Math.min(currentPage * membersPerPage, totalMembers)}</span> trong tổng số <span className="font-bold text-blue-600">{totalMembers}</span> thành viên
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className={`px-3 py-1 rounded-lg text-xs font-medium transition-all duration-300 ${
                            currentPage === 1
                              ? `${isDarkMode ? 'text-gray-500 bg-gray-700' : 'text-gray-400 bg-gray-100'} cursor-not-allowed`
                              : `${isDarkMode ? 'text-gray-300 hover:bg-gray-700 hover:shadow-md' : 'text-gray-700 hover:bg-gray-100 hover:shadow-md'} border border-gray-300`
                          }`}
                        >
                          <div className="flex items-center space-x-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            <span>Trước</span>
                          </div>
                        </button>
                        
                        <div className="flex items-center space-x-1">
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                            <button
                              key={page}
                              onClick={() => setCurrentPage(page)}
                              className={`px-2 py-1 rounded-md text-xs font-medium transition-all duration-300 ${
                                currentPage === page
                                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                                  : `${isDarkMode ? 'text-gray-300 hover:bg-gray-700 hover:shadow-sm' : 'text-gray-700 hover:bg-gray-100 hover:shadow-sm'} border border-gray-300`
                              }`}
                            >
                              {page}
                            </button>
                          ))}
                        </div>
                        
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className={`px-3 py-1 rounded-lg text-xs font-medium transition-all duration-300 ${
                            currentPage === totalPages
                              ? `${isDarkMode ? 'text-gray-500 bg-gray-700' : 'text-gray-400 bg-gray-100'} cursor-not-allowed`
                              : `${isDarkMode ? 'text-gray-300 hover:bg-gray-700 hover:shadow-md' : 'text-gray-700 hover:bg-gray-100 hover:shadow-md'} border border-gray-300`
                          }`}
                        >
                          <div className="flex items-center space-x-1">
                            <span>Sau</span>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </main>

        <Footer />

        {/* Export Toast Notification */}
        {showExportToast && (
          <div className={`fixed bottom-4 right-4 z-50 p-3 rounded-lg shadow-lg transition-all duration-300 backdrop-blur-sm ${isDarkMode ? 'bg-green-500/90 text-white border border-green-400/50' : 'bg-green-500/90 text-white border border-green-400/50'}`}>
            <div className="flex items-center">
              <div className="p-1 rounded-md bg-white/20 mr-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-sm font-medium">File Excel đã sẵn sàng download</span>
            </div>
          </div>
        )}

        {/* Modals */}
        <div className="relative z-50">




          <MemberDetailModal
            isOpen={showDetailModal}
            onClose={closeModals}
            memberId={selectedMemberId}
            isDarkMode={isDarkMode}
          />

          <MemberEditModal
            isOpen={showEditModal}
            onClose={closeModals}
            memberId={selectedMemberId}
            isDarkMode={isDarkMode}
            onMemberUpdated={handleMemberUpdated}
          />

          <MemberDeleteModal
            isOpen={showDeleteModal}
            onClose={closeModals}
            memberId={selectedMemberId}
            isDarkMode={isDarkMode}
            onMemberDeleted={handleMemberDeleted}
          />

          {/* Restore Modal */}
          {showRestoreModal && (
            <>
              <div className="fixed inset-0 z-[9999] overflow-y-auto" onClick={handleModalBackdropClick}>
              <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                  <div className={`absolute inset-0 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-500'} opacity-75`}></div>
                </div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className={`inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full relative z-[10000] ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  <div className={`px-4 pt-5 pb-4 sm:p-6 sm:pb-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                    <div className="sm:flex sm:items-start">
                      <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100 sm:mx-0 sm:h-10 sm:w-10">
                        <span className="text-green-600 text-xl">✅</span>
                      </div>
                      <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                        <h3 className={`text-lg leading-6 font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          Duyệt lại thành viên
                          {selectedMember && (
                            <span className={`ml-2 text-sm font-normal ${isDarkMode ? 'text-purple-300' : 'text-purple-600'}`}>
                              (Lần thứ {getRestorationCount(selectedMember) + 1})
                            </span>
                          )}
                        </h3>
                        <div className="mt-2">
                          {selectedMember && (
                            <div className={`mb-3 p-3 rounded-lg ${isDarkMode ? 'bg-gray-700 border border-gray-600' : 'bg-gray-50 border border-gray-200'}`}>
                              <div className="flex items-center mb-2">
                                <span className="text-blue-600 mr-2">👤</span>
                                <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {selectedMember.userId?.name || 'Không có tên'}
                                </span>
                                <span className={`ml-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  ({selectedMember.userId?.studentId || 'Không có MSSV'})
                                </span>
                              </div>
                              
                              <div className="space-y-1 text-sm">
                                <div className={`flex items-center ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                  <span className="mr-2">📅</span>
                                  <span>Thời gian xóa: {formatDate(selectedMember?.removedAt || '')}</span>
                                </div>
                                <div className={`flex items-center ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                  <span className="mr-2">📝</span>
                                  <span>Lý do xóa: {selectedMember?.removalReasonTrue || selectedMember?.removalReason || 'Không có'}</span>
                                </div>
                                {selectedMember?.removedBy && (
                                  <div className={`flex items-center ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                    <span className="mr-2">👤</span>
                                    <span>Xóa bởi: {selectedMember.removedBy.name} ({selectedMember.removedBy.studentId})</span>
                                  </div>
                                )}
                                {selectedMember?.restoredAt && (
                                  <div className={`flex items-center ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                    <span className="mr-2">🔄</span>
                                    <span>Đã được duyệt lại {getRestorationText(getRestorationCount(selectedMember))} vào {formatDate(selectedMember.restoredAt)}</span>
                                  </div>
                                )}
                                
                                {/* Hiển thị lịch sử duyệt lại */}
                                {selectedMember?.removalHistory && selectedMember.removalHistory.length > 0 && (
                                  <div className="mt-3 pt-3 border-t border-gray-300/30">
                                    <div className={`text-xs font-medium ${isDarkMode ? 'text-purple-300' : 'text-purple-600'} mb-2`}>
                                      📋 Lịch sử duyệt lại:
                                    </div>
                                    <div className="space-y-2">
                                      {(() => {
                                        // Loại bỏ các entries trùng lặp dựa trên removedAt (trong vòng 1 giây)
                                        // Ưu tiên giữ lại entry có thông tin duyệt lại
                                        const uniqueHistory = selectedMember?.removalHistory?.reduce((acc: any[], history: any) => {
                                          const existingIndex = acc.findIndex((h: any) => 
                                            Math.abs(new Date(h.removedAt).getTime() - new Date(history.removedAt).getTime()) < 1000
                                          );
                                          
                                          if (existingIndex === -1) {
                                            // Không tìm thấy entry trùng lặp, thêm vào
                                            acc.push(history);
                                          } else {
                                            // Tìm thấy entry trùng lặp, kiểm tra xem có thông tin duyệt lại không
                                            const existing = acc[existingIndex];
                                            const hasRestorationInfo = history.restoredAt && history.restorationReason;
                                            const existingHasRestorationInfo = existing.restoredAt && existing.restorationReason;
                                            
                                            // Nếu entry mới có thông tin duyệt lại mà entry cũ không có, thay thế
                                            if (hasRestorationInfo && !existingHasRestorationInfo) {
                                              acc[existingIndex] = history;
                                            }
                                            // Nếu cả hai đều có hoặc đều không có thông tin duyệt lại, giữ lại entry đầu tiên
                                          }
                                          return acc;
                                        }, [] as any);

                                        return uniqueHistory
                                          .filter((history: any) => history.restoredAt && history.restorationReason)
                                          .map((history: any, index: number) => (
                                            <div key={index} className="removal-history-light p-2 rounded border">
                                              <div className="text-header text-xs">
                                                <strong>Lần thứ {index + 1}:</strong> {formatDate(history.restoredAt)}
                                              </div>
                                              <div className="text-content text-xs">
                                                Lý do: {history.restorationReason}
                                              </div>
                                            </div>
                                          ));
                                      })()}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          
                          <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                            Bạn có chắc muốn duyệt lại thành viên này? Hành động này sẽ chuyển thành viên từ trạng thái "Đã bị xóa" sang "Đã duyệt".
                          </p>
                          
                          {/* Hiển thị thông tin lần duyệt lại */}
                          {selectedMember && (
                            <div className={`mt-3 p-3 rounded-lg ${isDarkMode ? 'bg-purple-500/10 border border-purple-500/20' : 'bg-purple-50 border border-purple-200'}`}>
                              <div className={`text-sm font-medium ${isDarkMode ? 'text-purple-300' : 'text-purple-700'}`}>
                                🎯 Lần duyệt lại thứ {getRestorationCount(selectedMember) + 1}
                              </div>
                              <div className={`text-xs mt-1 ${isDarkMode ? 'text-purple-200' : 'text-purple-600'}`}>
                                {(() => {
                                  const restorationCount = getRestorationCount(selectedMember);
                                  if (restorationCount > 0) {
                                    return `Thành viên này đã được duyệt lại ${restorationCount} lần trước đó`;
                                  } else {
                                    return 'Đây sẽ là lần duyệt lại đầu tiên';
                                  }
                                })()}
                              </div>
                            </div>
                          )}
                          
                          <div className="mt-4">
                            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              Lý do duyệt lại {selectedMember ? getRestorationText(getRestorationCount(selectedMember) + 1) : ''} *
                            </label>
                            <textarea
                              value={restorationReason}
                              onChange={(e) => setRestorationReason(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && e.ctrlKey) {
                                  e.preventDefault();
                                  handleRestoreMember();
                                }
                              }}
                              onFocus={(e) => e.stopPropagation()}
                              onBlur={(e) => e.stopPropagation()}
                              onClick={(e) => e.stopPropagation()}
                              placeholder={`Vui lòng nhập lý do duyệt lại ${selectedMember ? getRestorationText(getRestorationCount(selectedMember) + 1) : ''} thành viên...`}
                              rows={3}
                              className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 relative z-[10001] ${
                                isDarkMode 
                                  ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' 
                                  : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                              }`}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className={`px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!restoring && restorationReason.trim()) {
                          handleRestoreMember();
                        } else if (!restorationReason.trim()) {
                          alert('Vui lòng nhập lý do duyệt lại');
                        }
                      }}
                      disabled={restoring || !restorationReason.trim()}
                      className={`w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-lg relative z-[10001]`}
                    >
                      {restoring ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Đang xử lý...
                        </>
                      ) : (
                        `✅ Duyệt lại ${selectedMember ? getRestorationText(getRestorationCount(selectedMember) + 1) : ''}`
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={closeModals}
                      disabled={restoring}
                      className={`mt-3 w-full inline-flex justify-center rounded-lg border shadow-sm px-4 py-2 text-base font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-md ${
                        isDarkMode
                          ? 'border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600 hover:border-gray-500 focus:ring-gray-500'
                          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 focus:ring-gray-500'
                      }`}
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Hủy
                    </button>
                  </div>
                </div>
              </div>
            </div>
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
