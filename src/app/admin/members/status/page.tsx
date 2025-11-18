'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import AdminNav from '@/components/admin/AdminNav';
import Footer from '@/components/common/Footer';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import Image from 'next/image';
import { Loader, Users, CheckCircle2, Clock, XCircle, Ban } from 'lucide-react';
import PaginationBar from '@/components/common/PaginationBar';

interface ClubMember {
  _id: string;
  status: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'INACTIVE' | 'REMOVED';
  joinedAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  removedAt?: string;
  removalReason?: string;
  createdAt: string;
  updatedAt: string;
  userId?: {
    _id: string;
    studentId: string;
    name: string;
    email: string;
    role: 'STUDENT' | 'OFFICER' | 'ADMIN';
    phone?: string;
    class?: string;
    faculty?: string;
    avatarUrl?: string;
  };
  approvedBy?: {
    _id: string;
    name: string;
    studentId: string;
  };
  removedBy?: {
    _id: string;
    name: string;
    studentId: string;
  };
}

export default function MemberStatusPage() {
  const router = useRouter();
  const { user, hasRole } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [selectedMembershipId, setSelectedMembershipId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [membersPerPage, setMembersPerPage] = useState(10);
  const [totalMembers, setTotalMembers] = useState(0);

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

  // Load members data
  useEffect(() => {
    loadMembers();
  }, [currentPage, membersPerPage]);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Load all memberships (all statuses) with pagination
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: membersPerPage.toString()
      });
      
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
        setMembers(data.data.memberships);
        // Get total count from pagination if available, otherwise use length
        const total = data.data.pagination?.totalCount || data.data.memberships.length;
        setTotalMembers(total);
      } else {
        throw new Error(data.error || 'Failed to load members');
      }
    } catch (error) {
      console.error('Error loading members:', error);
      setMessage({ type: 'error', text: 'Không thể tải danh sách thành viên' });
    } finally {
      setLoading(false);
    }
  };

  const updateMemberStatus = async (membershipId: string, newStatus: string, rejectionReason?: string) => {
    setUpdatingStatus(membershipId);
    setMessage(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const requestBody: any = { status: newStatus };
      if (newStatus === 'REJECTED' && rejectionReason) {
        requestBody.rejectionReason = rejectionReason;
      }

      const response = await fetch(`/api/memberships/${membershipId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage({ type: 'success', text: 'Cập nhật trạng thái thành công!' });
        // Update local state
        setMembers(prev => prev.map(member => 
          member._id === membershipId 
            ? { ...member, status: newStatus as 'PENDING' | 'ACTIVE' | 'REJECTED' | 'INACTIVE' }
            : member
        ));
      } else {
        const errorMessage = data.details ? `${data.error}: ${data.details}` : data.error || 'Cập nhật trạng thái thất bại';
        setMessage({ type: 'error', text: errorMessage });
      }
    } catch (error: any) {
      console.error('Error updating member status:', error);
      setMessage({ type: 'error', text: error.message || 'Có lỗi xảy ra' });
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleStatusChange = (membershipId: string, newStatus: string) => {
    if (newStatus === 'REJECTED') {
      setSelectedMembershipId(membershipId);
      setRejectionReason('');
      setShowRejectionModal(true);
    } else {
      updateMemberStatus(membershipId, newStatus);
    }
  };

  const handleRejectWithReason = () => {
    if (selectedMembershipId && rejectionReason.trim()) {
      updateMemberStatus(selectedMembershipId, 'REJECTED', rejectionReason.trim());
      setShowRejectionModal(false);
      setSelectedMembershipId(null);
      setRejectionReason('');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      ACTIVE: { 
        textColor: isDarkMode ? 'text-emerald-400' : 'text-emerald-600', 
        border: isDarkMode ? 'border-emerald-500/50' : 'border-emerald-300', 
        label: 'Hoạt động' 
      },
      INACTIVE: { 
        textColor: isDarkMode ? 'text-red-400' : 'text-red-600', 
        border: isDarkMode ? 'border-red-500/50' : 'border-red-300', 
        label: 'Không hoạt động' 
      },
      PENDING: { 
        textColor: isDarkMode ? 'text-amber-400' : 'text-amber-600', 
        border: isDarkMode ? 'border-amber-500/50' : 'border-amber-300', 
        label: 'Chờ duyệt' 
      },
      REJECTED: { 
        textColor: isDarkMode ? 'text-orange-400' : 'text-orange-600', 
        border: isDarkMode ? 'border-orange-500/50' : 'border-orange-300', 
        label: 'Đã từ chối' 
      },
      REMOVED: { 
        textColor: isDarkMode ? 'text-red-400' : 'text-red-600', 
        border: isDarkMode ? 'border-red-500/50' : 'border-red-300', 
        label: 'Đã xóa' 
      }
    };
    const config = statusConfig[status as keyof typeof statusConfig];
    
    if (!config) {
      return (
        <div className={`w-full min-w-[120px] px-2.5 py-1.5 text-xs font-semibold rounded-lg border text-center flex items-center justify-center ${isDarkMode ? 'border-gray-600 text-gray-300 bg-gray-800/30' : 'border-gray-300 text-gray-700 bg-transparent'} shadow-sm`}>
          {status || 'Không xác định'}
        </div>
      );
    }
    
    return (
      <div className={`w-full min-w-[120px] px-2.5 py-1.5 text-xs font-semibold rounded-lg border shadow-sm text-center flex items-center justify-center ${config.border} ${config.textColor} ${isDarkMode ? 'bg-gray-800/30' : 'bg-transparent'}`}>
        {config.label}
      </div>
    );
  };

  const getRoleBadge = (role: string | undefined | null) => {
    // Handle undefined, null, or empty string
    if (!role || role.trim() === '') {
      return (
        <div className={`w-full min-w-[120px] px-2.5 py-1.5 text-xs font-semibold rounded-lg border text-center flex items-center justify-center ${isDarkMode ? 'border-gray-600 text-gray-300 bg-gray-800/30' : 'border-gray-300 text-gray-700 bg-transparent'} shadow-sm`}>
          Không xác định
        </div>
      );
    }

    const roleConfig = {
      SUPER_ADMIN: { 
        textColor: isDarkMode ? 'text-purple-400' : 'text-purple-600', 
        border: isDarkMode ? 'border-purple-500/50' : 'border-purple-300', 
        label: 'Quản Trị Hệ Thống' 
      },
      CLUB_LEADER: { 
        textColor: isDarkMode ? 'text-red-400' : 'text-red-600', 
        border: isDarkMode ? 'border-red-500/50' : 'border-red-300', 
        label: 'Chủ Nhiệm CLB' 
      },
      CLUB_DEPUTY: { 
        textColor: isDarkMode ? 'text-orange-400' : 'text-orange-600', 
        border: isDarkMode ? 'border-orange-500/50' : 'border-orange-300', 
        label: 'Phó Chủ Nhiệm' 
      },
      CLUB_MEMBER: { 
        textColor: isDarkMode ? 'text-blue-400' : 'text-blue-600', 
        border: isDarkMode ? 'border-blue-500/50' : 'border-blue-300', 
        label: 'Ủy Viên BCH' 
      },
      CLUB_STUDENT: { 
        textColor: isDarkMode ? 'text-emerald-400' : 'text-emerald-600', 
        border: isDarkMode ? 'border-emerald-500/50' : 'border-emerald-300', 
        label: 'Thành Viên CLB' 
      },
      STUDENT: { 
        textColor: isDarkMode ? 'text-gray-400' : 'text-gray-600', 
        border: isDarkMode ? 'border-gray-500/50' : 'border-gray-300', 
        label: 'Sinh Viên' 
      }
    };
    
    const config = roleConfig[role as keyof typeof roleConfig];
    if (!config) {
      console.warn(`Unknown role: ${role}`);
      return (
        <div className={`w-full min-w-[120px] px-2.5 py-1.5 text-xs font-semibold rounded-lg border text-center flex items-center justify-center ${isDarkMode ? 'border-gray-600 text-gray-300 bg-gray-800/30' : 'border-gray-300 text-gray-700 bg-transparent'} shadow-sm`}>
          Không xác định
        </div>
      );
    }
    return (
      <div className={`w-full min-w-[120px] px-2.5 py-1.5 text-xs font-semibold rounded-lg border shadow-sm text-center flex items-center justify-center ${config.border} ${config.textColor} ${isDarkMode ? 'bg-gray-800/30' : 'bg-transparent'}`}>
        {config.label}
      </div>
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

  const getStatusStats = () => {
    const total = members.length;
    const active = members.filter(m => m.status === 'ACTIVE').length;
    const inactive = members.filter(m => m.status === 'INACTIVE').length;
    const pending = members.filter(m => m.status === 'PENDING').length;
    const rejected = members.filter(m => m.status === 'REJECTED').length;
    const removed = members.filter(m => m.status === 'REMOVED').length;

    return { total, active, inactive, pending, rejected, removed };
  };

  const stats = getStatusStats();

  // Check if user has required role
  if (user && !hasRole('CLUB_MEMBER')) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <div className="mb-4">
            <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className={`text-lg font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Quyền truy cập bị từ chối
          </h3>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Bạn không có quyền truy cập trang này. Vai trò hiện tại: {user.role}
          </p>
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Quay lại Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute requiredRole="CLUB_MEMBER">
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
            <div className="flex items-center justify-between">
              <div>
                <h1 className={`text-2xl sm:text-3xl font-bold mb-2 transition-colors duration-200 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Quản lý trạng thái thành viên
                </h1>
                <p className={`text-sm sm:text-base transition-colors duration-200 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Thay đổi trạng thái hoạt động của các thành viên trong câu lạc bộ
                </p>
              </div>
              <button
                onClick={() => router.push('/admin/members')}
                className={`px-4 py-2 border rounded-lg transition-colors duration-200 flex items-center space-x-2 ${
                  isDarkMode 
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>←</span>
                <span>Quay lại</span>
              </button>
            </div>
          </div>

          {/* Message */}
          {message && (
            <div className={`mb-6 p-4 rounded-lg ${
              message.type === 'success' 
                ? 'bg-green-100 text-green-800 border border-green-200' 
                : 'bg-red-100 text-red-800 border border-red-200'
            }`}>
              {message.text}
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border p-4 shadow-sm`}>
              <div className="flex items-center">
                <Users size={20} className={`${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} strokeWidth={1.5} />
                <div className="ml-3">
                  <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Tổng thành viên</p>
                  <p className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stats.total}</p>
                </div>
              </div>
            </div>
            <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border p-4 shadow-sm`}>
              <div className="flex items-center">
                <CheckCircle2 size={20} className={`${isDarkMode ? 'text-green-400' : 'text-green-600'}`} strokeWidth={1.5} />
                <div className="ml-3">
                  <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Đang hoạt động</p>
                  <p className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stats.active}</p>
                </div>
              </div>
            </div>
            <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border p-4 shadow-sm`}>
              <div className="flex items-center">
                <Clock size={20} className={`${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`} strokeWidth={1.5} />
                <div className="ml-3">
                  <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Chờ duyệt</p>
                  <p className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stats.pending}</p>
                </div>
              </div>
            </div>
            <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border p-4 shadow-sm`}>
              <div className="flex items-center">
                <XCircle size={20} className={`${isDarkMode ? 'text-red-400' : 'text-red-600'}`} strokeWidth={1.5} />
                <div className="ml-3">
                  <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Không hoạt động</p>
                  <p className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stats.inactive}</p>
                </div>
              </div>
            </div>
            <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border p-4 shadow-sm`}>
              <div className="flex items-center">
                <Ban size={20} className={`${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`} strokeWidth={1.5} />
                <div className="ml-3">
                  <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Đã từ chối</p>
                  <p className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stats.rejected}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Members Table */}
          <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border shadow-sm overflow-hidden`}>
            {loading ? (
              <div className="p-8 text-center">
                <Loader size={48} className="animate-spin text-blue-600 mx-auto mb-4" strokeWidth={1.5} />
                <p className={`mt-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Đang tải dữ liệu...</p>
              </div>
            ) : (
              <>
                {/* Pagination - Top */}
                {!loading && totalMembers > 0 && (
                  <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700">
                    <PaginationBar
                      totalItems={totalMembers}
                      currentPage={currentPage}
                      itemsPerPage={membersPerPage}
                      onPageChange={(page) => setCurrentPage(page)}
                      onItemsPerPageChange={(newItemsPerPage) => {
                        setMembersPerPage(newItemsPerPage);
                        setCurrentPage(1);
                      }}
                      itemLabel="thành viên"
                      isDarkMode={isDarkMode}
                      itemsPerPageOptions={[5, 10, 20, 50, 100]}
                    />
                  </div>
                )}
                <div className="overflow-x-auto">
                <table className={`min-w-full border-collapse border ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                  <thead>
                    <tr className="bg-blue-600">
                      <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider border border-blue-700 text-white`}>
                        Thành viên
                      </th>
                      <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider border border-blue-700 text-white`}>
                        Thông tin
                      </th>
                      <th className={`px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider border border-blue-700 text-white`}>
                        Vai trò & Trạng thái
                      </th>
                      <th className={`px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider border border-blue-700 text-white`}>
                        Thay đổi trạng thái
                      </th>
                    </tr>
                  </thead>
                  <tbody className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                    {members.map((member) => (
                      <tr key={member._id} className={`${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} transition-colors duration-200`}>
                        <td className={`px-4 py-3 whitespace-nowrap border ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              {member.userId?.avatarUrl ? (
                                <Image
                                  src={member.userId.avatarUrl}
                                  alt={member.userId.name || 'User'}
                                  width={40}
                                  height={40}
                                  className="h-10 w-10 rounded-full object-cover"
                                />
                              ) : (
                                <div className="h-10 w-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                                  <span className="text-white text-xs font-bold">
                                    {getInitials(member.userId?.name || 'U')}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="ml-3">
                              <div className={`text-xs font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                {member.userId?.name || 'Không có tên'}
                              </div>
                              <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                {member.userId?.studentId || 'Không có MSSV'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className={`px-4 py-3 whitespace-nowrap border ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                          <div className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                            <div>{member.userId?.email || 'Không có email'}</div>
                            <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {member.userId?.phone || 'Không có số điện thoại'}
                            </div>
                            <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {member.userId?.class || 'Chưa cập nhật'} - {member.userId?.faculty || 'Chưa cập nhật'}
                            </div>
                          </div>
                        </td>
                        <td className={`px-4 py-3 whitespace-nowrap border text-center ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                          <div className="flex flex-col items-center justify-center gap-2 w-full max-w-[140px] mx-auto">
                            {getRoleBadge(member.userId?.role)}
                            {getStatusBadge(member.status)}
                          </div>
                        </td>
                        <td className={`px-4 py-3 whitespace-nowrap border text-center ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                          <div className="flex items-center justify-center space-x-2">
                            <select
                              value={member.status}
                              onChange={(e) => handleStatusChange(member._id, e.target.value)}
                              disabled={updatingStatus === member._id}
                              className={`px-2 py-1 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                                isDarkMode 
                                  ? 'bg-gray-700 border-gray-600 text-white' 
                                  : 'bg-white border-gray-300 text-gray-900'
                              } ${updatingStatus === member._id ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              <option value="ACTIVE">Hoạt động</option>
                              <option value="INACTIVE">Không hoạt động</option>
                              <option value="PENDING">Chờ duyệt</option>
                              <option value="REJECTED">Từ chối</option>
                            </select>
                            {updatingStatus === member._id && (
                              <Loader size={14} className="animate-spin text-blue-600" strokeWidth={1.5} />
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Pagination - Bottom */}
              {!loading && totalMembers > 0 && (
                <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700">
                  <PaginationBar
                    totalItems={totalMembers}
                    currentPage={currentPage}
                    itemsPerPage={membersPerPage}
                    onPageChange={(page) => setCurrentPage(page)}
                    onItemsPerPageChange={(newItemsPerPage) => {
                      setMembersPerPage(newItemsPerPage);
                      setCurrentPage(1);
                    }}
                    itemLabel="thành viên"
                    isDarkMode={isDarkMode}
                    itemsPerPageOptions={[5, 10, 20, 50, 100]}
                  />
                </div>
              )}
            </>
            )}
          </div>
        </main>

        <Footer isDarkMode={isDarkMode} />

        {/* Rejection Reason Modal */}
        {showRejectionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 w-full max-w-md mx-4`}>
              <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Nhập lý do từ chối
              </h3>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Nhập lý do từ chối thành viên..."
                className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                rows={4}
                maxLength={500}
              />
              <div className="flex justify-end space-x-3 mt-4">
                <button
                  onClick={() => {
                    setShowRejectionModal(false);
                    setSelectedMembershipId(null);
                    setRejectionReason('');
                  }}
                  className={`px-4 py-2 border rounded-lg transition-colors ${
                    isDarkMode 
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Hủy
                </button>
                <button
                  onClick={handleRejectWithReason}
                  disabled={!rejectionReason.trim()}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    rejectionReason.trim()
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  }`}
                >
                  Từ chối
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
