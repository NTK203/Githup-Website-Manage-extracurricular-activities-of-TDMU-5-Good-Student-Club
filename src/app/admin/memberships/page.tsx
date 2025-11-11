'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import AdminNav from '@/components/admin/AdminNav';
import Footer from '@/components/common/Footer';
import { useDarkMode } from '@/hooks/useDarkMode';

interface Membership {
  _id: string;
  status: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'REMOVED' | 'INACTIVE';
  joinedAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  removedAt?: string;
  removalReason?: string;
  removalReasonTrue?: string;
  removedBy?: {
    _id: string;
    name: string;
    studentId: string;
  };
  restoredAt?: string;
  restoredBy?: {
    _id: string;
    name: string;
    studentId: string;
  };
  restorationReason?: string;
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
  motivation?: string;
  experience?: string;
  expectations?: string;
  commitment?: string;
  createdAt: string;
  updatedAt: string;
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
  approvedBy?: {
    _id: string;
    name: string;
    studentId: string;
  };
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export default function MembershipsPage() {
  const { user, refetchUser } = useAuth();
  const { isDarkMode } = useDarkMode();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Stats states - separate from filtered data
  const [totalStats, setTotalStats] = useState({
    totalCount: 0,
    pendingCount: 0,
    activeCount: 0,
    rejectedCount: 0,
    inactiveCount: 0
  });
  

  
  // Filter states
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [facultyFilter, setFacultyFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('joinedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [membershipsPerPage] = useState(10);

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

  // Modal states
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedMembership, setSelectedMembership] = useState<Membership | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingAction, setProcessingAction] = useState(false);

  // Check if desktop
  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  // Load sidebar state from localStorage on component mount
  useEffect(() => {
    const savedSidebarState = localStorage.getItem('sidebarOpen');
    if (savedSidebarState !== null) {
      setIsSidebarOpen(savedSidebarState === 'true');
    }

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
      window.removeEventListener('sidebarStateChange', handleSidebarChange);
      clearInterval(intervalId);
    };
  }, []);

  const fetchMemberships = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: membershipsPerPage.toString(),
        sortBy,
        sortOrder,
        ...(search && { search }),
        ...(statusFilter !== 'ALL' && { status: statusFilter }),
        ...(facultyFilter !== 'ALL' && { faculty: facultyFilter })
      });

      const response = await fetch(`/api/memberships?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch memberships');
      }

      const data = await response.json();
      
      if (data.success) {
        setMemberships(data.data.memberships);
        setPagination(data.data.pagination);
      } else {
        throw new Error(data.error || 'Failed to fetch memberships');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error fetching memberships:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTotalStats = async () => {
    try {
      const response = await fetch('/api/memberships?limit=1000', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const allMemberships = data.data.memberships;
          setTotalStats({
            totalCount: allMemberships.length,
            pendingCount: allMemberships.filter((m: Membership) => m.status === 'PENDING').length,
            activeCount: allMemberships.filter((m: Membership) => m.status === 'ACTIVE').length,
            rejectedCount: allMemberships.filter((m: Membership) => m.status === 'REJECTED').length,
            inactiveCount: allMemberships.filter((m: Membership) => m.status === 'INACTIVE').length
          });
        }
      }
    } catch (err) {
      console.error('Error fetching total stats:', err);
    }
  };



  useEffect(() => {
    fetchMemberships();
  }, [currentPage, search, statusFilter, facultyFilter, sortBy, sortOrder]);

  // Fetch total stats on component mount
  useEffect(() => {
    fetchTotalStats();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  const handleApprove = async (membershipId: string) => {
    try {
      setProcessingAction(true);
      
      const response = await fetch('/api/memberships', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          membershipId,
          action: 'approve'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to approve membership');
      }

      // Refresh the list and stats
      await Promise.all([fetchMemberships(), fetchTotalStats()]);
      
      // Refetch user data to update isClubMember status in frontend
      refetchUser();
      
      // Show success message
      setError(null);
      
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error approving membership:', err);
    } finally {
      setProcessingAction(false);
    }
  };

  const handleReject = async () => {
    if (!selectedMembership || !rejectionReason.trim()) {
      return;
    }

    try {
      setProcessingAction(true);
      
      const response = await fetch('/api/memberships', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          membershipId: selectedMembership._id,
          action: 'reject',
          rejectionReason: rejectionReason.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reject membership');
      }

      // Close modal and refresh
      setShowRejectModal(false);
      setSelectedMembership(null);
      setRejectionReason('');
      await Promise.all([fetchMemberships(), fetchTotalStats()]);

      // Refetch user data to update isClubMember status in frontend, in case of re-approval after rejection
      refetchUser();
      
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error rejecting membership:', err);
    } finally {
      setProcessingAction(false);
    }
  };



  const openRejectModal = (membership: Membership) => {
    setSelectedMembership(membership);
    setRejectionReason('');
    setShowRejectModal(true);
  };



  const openDetailsModal = (membership: Membership) => {
    setSelectedMembership(membership);
    setShowDetailsModal(true);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'ACTIVE': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'REJECTED': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'REMOVED': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'INACTIVE': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN');
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'Quản Trị Hệ Thống';
      case 'CLUB_LEADER': return 'Chủ Nhiệm CLB';
      case 'CLUB_DEPUTY': return 'Phó Chủ Nhiệm';
      case 'CLUB_MEMBER': return 'Ủy Viên BCH';
      case 'CLUB_STUDENT': return 'Thành Viên CLB';
      case 'STUDENT': return 'Sinh Viên';
      default: return role;
    }
  };

  if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'CLUB_LEADER' && user.role !== 'CLUB_DEPUTY' && user.role !== 'CLUB_MEMBER')) {
    return (
      <ProtectedRoute requiredRole="CLUB_LEADER">
        <div>Loading...</div>
      </ProtectedRoute>
    );
  }

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
          <div className="mb-8">
            <h1 className={`text-3xl font-bold mb-2 transition-colors duration-200 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Quản lý Đăng ký Thành viên CLB
            </h1>
            <p className={`mt-2 transition-colors duration-200 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Quản lý các đơn đăng ký tham gia CLB Sinh viên 5 Tốt TDMU
            </p>
          </div>

                    {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-4`}>
              <div className="flex items-center">
                <div className="p-1.5 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Tổng đơn đăng ký</p>
                  <p className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {totalStats.totalCount}
                  </p>
                </div>
              </div>
            </div>

            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-4`}>
              <div className="flex items-center">
                <div className="p-1.5 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                  <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Chờ duyệt</p>
                  <p className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {totalStats.pendingCount}
                  </p>
                </div>
              </div>
            </div>

            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-4`}>
              <div className="flex items-center">
                <div className="p-1.5 bg-green-100 dark:bg-green-900 rounded-lg">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Đã duyệt</p>
                  <p className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {totalStats.activeCount}
                  </p>
                </div>
              </div>
            </div>

            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-4`}>
              <div className="flex items-center">
                <div className="p-1.5 bg-red-100 dark:bg-red-900 rounded-lg">
                  <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Đã từ chối</p>
                  <p className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {totalStats.rejectedCount}
                  </p>
                </div>
              </div>
            </div>

            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-4`}>
              <div className="flex items-center">
                <div className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Không hoạt động</p>
                  <p className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {totalStats.inactiveCount}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters and Search */}
          <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow mb-6`}>
            <div className="p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                  {/* Search */}
                  <div className="flex flex-col">
                    <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Tìm kiếm
                    </label>
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Tên, MSSV, email..."
                      className={`w-full px-3 py-2.5 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                    />
                  </div>

                  {/* Status Filter */}
                  <div className="flex flex-col">
                    <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Trạng thái
                    </label>
                    <select
                      value={statusFilter}
                      onChange={(e) => {
                        setStatusFilter(e.target.value);
                        handleFilterChange();
                      }}
                      className={`w-full px-3 py-2.5 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      <option value="ALL">Tất cả trạng thái</option>
                      <option value="PENDING">Chờ duyệt</option>
                      <option value="ACTIVE">Đã duyệt</option>
                      <option value="REJECTED">Đã từ chối</option>
                      <option value="INACTIVE">Không hoạt động</option>
                    </select>
                  </div>

                  {/* Faculty Filter */}
                  <div className="flex flex-col">
                    <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Khoa/Viện
                    </label>
                    <select
                      value={facultyFilter}
                      onChange={(e) => {
                        setFacultyFilter(e.target.value);
                        handleFilterChange();
                      }}
                      className={`w-full px-3 py-2.5 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
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
                  <div className="flex flex-col">
                    <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Sắp xếp
                    </label>
                    <select
                      value={`${sortBy}-${sortOrder}`}
                      onChange={(e) => {
                        const [field, order] = e.target.value.split('-');
                        setSortBy(field);
                        setSortOrder(order as 'asc' | 'desc');
                      }}
                      className={`w-full px-3 py-2.5 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      <option value="joinedAt-desc">Mới nhất</option>
                      <option value="joinedAt-asc">Cũ nhất</option>
                      <option value="user.name-asc">Tên A-Z</option>
                      <option value="user.name-desc">Tên Z-A</option>
                    </select>
                  </div>


                                  </div>
                </div>
            </div>
          </div>

          {/* Memberships Table */}
          <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow overflow-hidden`}>
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className={`mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Đang tải...</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center">
                <p className="text-red-600 dark:text-red-400">{error}</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className={`${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      <tr>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                          Người đăng ký
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                          Trạng thái
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                          Ngày đăng ký
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                          Người duyệt
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                          Thông tin
                        </th>
                        <th className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                          Hành động
                        </th>
                      </tr>
                    </thead>
                    <tbody className={`${isDarkMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'}`}>
                      {memberships.map((membership) => (
                        <tr key={membership._id} className={`${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                {membership.userId?.avatarUrl ? (
                                  <img
                                    className="h-10 w-10 rounded-full"
                                    src={membership.userId.avatarUrl}
                                    alt={membership.userId.name || 'User'}
                                  />
                                ) : (
                                  <div className="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                                    <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                      {membership.userId?.name?.charAt(0).toUpperCase() || 'U'}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="ml-4">
                                <div className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {membership.userId?.name || 'Không có tên'}
                                </div>
                                <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  {membership.userId?.studentId || 'Không có MSSV'}
                                </div>
                                <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  {membership.userId?.email || 'Không có email'}
                                </div>
                                <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  {membership.userId?.role ? getRoleDisplayName(membership.userId.role) : 'Không có vai trò'}
                                </div>
                              </div>
                            </div>
                          </td>
                                                     <td className="px-6 py-4 whitespace-nowrap">
                             <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(membership.status)}`}>
                               {membership.status === 'PENDING' && 'Chờ duyệt'}
                               {membership.status === 'ACTIVE' && 'Đã duyệt'}
                               {membership.status === 'REJECTED' && 'Đã từ chối'}
                               {membership.status === 'REMOVED' && 'Đã xóa'}
                               {membership.status === 'INACTIVE' && 'Không hoạt động'}
                             </span>
                           </td>
                          <td className={`px-6 py-4 text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {formatDateTime(membership.joinedAt)}
                          </td>
                                                     <td className={`px-6 py-4 text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                             {membership.approvedBy ? (
                               <div className="space-y-1">
                                 <div className="font-medium">{membership.approvedBy.name}</div>
                                 <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                   {formatDateTime(membership.approvedAt!)}
                                 </div>
                               </div>
                             ) : membership.status === 'REJECTED' ? (
                               <div className="space-y-1">
                                 <div className="text-red-600 dark:text-red-400 font-medium">Từ chối</div>
                                 <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                   {formatDateTime(membership.rejectedAt!)}
                                 </div>
                               </div>
                             ) : membership.status === 'REMOVED' ? (
                               <div className="space-y-1">
                                 <div className="text-red-600 dark:text-red-400 font-medium">Đã xóa</div>
                                 <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                   {membership.removedBy?.name || 'Hệ thống'}
                                 </div>
                                 <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                   {formatDateTime(membership.removedAt!)}
                                 </div>
                               </div>
                             ) : (
                               <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>-</span>
                             )}
                           </td>
                          <td className={`px-6 py-4 text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            <div className="space-y-1">
                              {membership.userId?.phone && <div className="flex items-center"><span className="mr-2">📞</span>{membership.userId.phone}</div>}
                              {membership.userId?.class && <div className="flex items-center"><span className="mr-2">🏫</span>{membership.userId.class}</div>}
                              {membership.userId?.faculty && <div className="flex items-center"><span className="mr-2">🎓</span>{membership.userId.faculty}</div>}
                              {membership.rejectionReason && (
                                <div className="text-red-600 dark:text-red-400 flex items-start">
                                  <span className="mr-2 mt-0.5">💬</span>
                                  <span className="text-xs">{membership.rejectionReason}</span>
                                </div>
                              )}
                              {(membership.removalReasonTrue || membership.removalReason) && (
                                <div className="text-red-600 dark:text-red-400 flex items-start">
                                  <span className="mr-2 mt-0.5">🗑️</span>
                                  <span className="text-xs">{membership.removalReasonTrue || membership.removalReason}</span>
                                </div>
                              )}
                              {/* Hiển thị lịch sử xóa/duyệt lại */}
                              {membership.removalHistory && membership.removalHistory.length > 0 && (
                                <div className={`removal-history-light mt-2 p-2 rounded border`}>
                                  <div className="text-header text-xs font-medium mb-1">
                                    📋 Lịch sử xóa/duyệt lại ({(() => {
                                      // Loại bỏ các entries trùng lặp dựa trên removedAt (trong vòng 1 giây)
                                      const uniqueHistory = membership.removalHistory!.reduce((acc, history) => {
                                        const existing = acc.find(h => 
                                          Math.abs(new Date(h.removedAt).getTime() - new Date(history.removedAt).getTime()) < 1000
                                        );
                                        if (!existing) {
                                          acc.push(history);
                                        }
                                        return acc;
                                      }, [] as typeof membership.removalHistory);
                                      return uniqueHistory.length;
                                    })()} lần)
                                  </div>
                                  {(() => {
                                    // Loại bỏ các entries trùng lặp dựa trên removedAt (trong vòng 1 giây)
                                    // Ưu tiên giữ lại entry có thông tin duyệt lại
                                    const uniqueHistory = membership.removalHistory!.reduce((acc, history) => {
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
                                    }, [] as typeof membership.removalHistory);

                                    return (
                                      <>
                                        {uniqueHistory.slice(0, 2).map((history, index) => {
                                          return (
                                            <div key={index} className="text-content text-xs mb-1">
                                              <div>• Lần {index + 1}: {history.removalReason}</div>
                                              {history.restoredAt && (
                                                <div className="text-green ml-2">
                                                  ↳ Duyệt lại: {history.restorationReason}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                        {uniqueHistory.length > 2 && (
                                          <div className="text-content text-xs">
                                            ... và {uniqueHistory.length - 2} lần khác
                                          </div>
                                        )}
                                      </>
                                    );
                                  })()}
                                </div>
                              )}
                              <button
                                onClick={() => openDetailsModal(membership)}
                                className="mt-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
                              >
                                Xem chi tiết
                              </button>
                            </div>
                          </td>
                                                     <td className="px-6 py-4 text-right text-sm font-medium">
                             {membership.status === 'PENDING' && (
                               <div className="flex items-center justify-end space-x-2">
                                 <button
                                   onClick={() => handleApprove(membership._id)}
                                   disabled={processingAction}
                                   className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-200 bg-green-600 text-white hover:bg-green-700 dark:bg-green-600 dark:text-white dark:hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                                 >
                                   <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                   </svg>
                                   Duyệt
                                 </button>
                                 <button
                                   onClick={() => openRejectModal(membership)}
                                   disabled={processingAction}
                                   className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-200 bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:text-white dark:hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                                 >
                                   <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                   </svg>
                                   Từ chối
                                 </button>
                               </div>
                             )}

                             {membership.status === 'REJECTED' && (
                               <div className="flex items-center justify-end space-x-2">
                                 <button
                                   onClick={() => handleApprove(membership._id)}
                                   disabled={processingAction}
                                   className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-200 bg-green-600 text-white hover:bg-green-700 dark:bg-green-600 dark:text-white dark:hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                                 >
                                   <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                   </svg>
                                   Phê duyệt lại
                                 </button>
                               </div>
                             )}

                             {membership.status === 'REMOVED' && (
                               <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>-</span>
                             )}
                           </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                  <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} px-4 py-3 flex items-center justify-between border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} sm:px-6`}>
                    <div className="flex-1 flex justify-between sm:hidden">
                      <button
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={!pagination.hasPrevPage}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed ${
                          isDarkMode 
                            ? 'border-gray-600 text-gray-300 bg-gray-700 hover:bg-gray-600' 
                            : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                        }`}
                      >
                        Trước
                      </button>
                      <button
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={!pagination.hasNextPage}
                        className={`ml-3 relative inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed ${
                          isDarkMode 
                            ? 'border-gray-600 text-gray-300 bg-gray-700 hover:bg-gray-600' 
                            : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                        }`}
                      >
                        Sau
                      </button>
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                      <div>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Hiển thị{' '}
                          <span className="font-medium">{(currentPage - 1) * membershipsPerPage + 1}</span>
                          {' '}đến{' '}
                          <span className="font-medium">
                            {Math.min(currentPage * membershipsPerPage, pagination.totalCount)}
                          </span>
                          {' '}trong tổng số{' '}
                          <span className="font-medium">{pagination.totalCount}</span> đơn đăng ký
                        </p>
                      </div>
                      <div>
                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                          <button
                            onClick={() => setCurrentPage(currentPage - 1)}
                            disabled={!pagination.hasPrevPage}
                            className={`relative inline-flex items-center px-2 py-2 rounded-l-md border text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                              isDarkMode 
                                ? 'border-gray-600 text-gray-500 bg-gray-700 hover:bg-gray-600' 
                                : 'border-gray-300 text-gray-500 bg-white hover:bg-gray-50'
                            }`}
                          >
                            <span className="sr-only">Trước</span>
                            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </button>
                          
                          {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                            <button
                              key={page}
                              onClick={() => setCurrentPage(page)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                page === currentPage
                                  ? 'z-10 bg-blue-50 border-blue-500 text-blue-600 dark:bg-blue-900 dark:border-blue-400 dark:text-blue-300'
                                  : isDarkMode 
                                    ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600' 
                                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              {page}
                            </button>
                          ))}
                          
                          <button
                            onClick={() => setCurrentPage(currentPage + 1)}
                            disabled={!pagination.hasNextPage}
                            className={`relative inline-flex items-center px-2 py-2 rounded-r-md border text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                              isDarkMode 
                                ? 'border-gray-600 text-gray-500 bg-gray-700 hover:bg-gray-600' 
                                : 'border-gray-300 text-gray-500 bg-white hover:bg-gray-50'
                            }`}
                          >
                            <span className="sr-only">Sau</span>
                            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </main>

        {/* Reject Modal */}
        {showRejectModal && selectedMembership && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className={`relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}`}>
              <div className="mt-3">
                <h3 className={`text-lg font-medium mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Từ chối đơn đăng ký
                </h3>
                <p className={`text-sm mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Bạn sắp từ chối đơn đăng ký của <strong>{selectedMembership.userId?.name || 'Không có tên'}</strong>
                </p>
                <div className="mb-4">
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Lý do từ chối *
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Nhập lý do từ chối..."
                    rows={3}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    required
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowRejectModal(false);
                      setSelectedMembership(null);
                      setRejectionReason('');
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={!rejectionReason.trim() || processingAction}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    {processingAction ? 'Đang xử lý...' : 'Từ chối'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}



                 {/* Details Modal */}
         {showDetailsModal && selectedMembership && (
           <div className="fixed inset-0 bg-black/60 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
             <div className={`relative w-full max-w-6xl max-h-[90vh] shadow-2xl rounded-2xl ${isDarkMode ? 'bg-gray-900/95 border-gray-700' : 'bg-white/95 border-gray-200'} border backdrop-blur-md flex flex-col`}>
               {/* Header */}
               <div className={`relative p-6 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                 <div className={`absolute inset-0 ${isDarkMode ? 'bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10' : 'bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50'}`}></div>
                 <div className="relative flex justify-between items-center">
                   <div className="flex items-center space-x-3">
                     <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                       </svg>
                     </div>
                     <div>
                       <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                         Chi tiết đơn đăng ký
                       </h3>
                       <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                         {selectedMembership.userId?.name || 'Không có tên'} - {selectedMembership.userId?.studentId || 'Không có MSSV'}
                       </p>
                     </div>
                   </div>
                   <button
                     onClick={() => {
                       setShowDetailsModal(false);
                       setSelectedMembership(null);
                     }}
                     className={`p-2 rounded-lg transition-all duration-200 ${isDarkMode ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
                   >
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                     </svg>
                   </button>
                 </div>
               </div>

               {/* Content */}
               <div className="p-6 overflow-y-auto flex-1">
                 <div className="space-y-6">
                   {/* User Information Card */}
                   <div className={`${isDarkMode ? 'bg-gray-800/50' : 'bg-white'} rounded-xl p-5 border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} shadow-sm`}>
                     <div className="flex items-center space-x-3 mb-4">
                       <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600'}`}>
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                         </svg>
                       </div>
                       <h4 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Thông tin sinh viên</h4>
                     </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className={`flex items-center p-3 rounded-lg ${isDarkMode ? 'bg-gray-700/30' : 'bg-gray-50'}`}>
                           <div className={`p-1.5 rounded-md ${isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'} mr-3`}>
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                             </svg>
                           </div>
                           <div className="flex-1">
                             <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Họ và tên</p>
                             <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedMembership.userId?.name || 'Không có tên'}</p>
                           </div>
                         </div>
                         
                         <div className={`flex items-center p-3 rounded-lg ${isDarkMode ? 'bg-gray-700/30' : 'bg-gray-50'}`}>
                           <div className={`p-1.5 rounded-md ${isDarkMode ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-600'} mr-3`}>
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                             </svg>
                           </div>
                           <div className="flex-1">
                             <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>MSSV</p>
                             <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedMembership.userId?.studentId || 'Không có MSSV'}</p>
                           </div>
                         </div>
                         
                         <div className={`flex items-center p-3 rounded-lg ${isDarkMode ? 'bg-gray-700/30' : 'bg-gray-50'}`}>
                           <div className={`p-1.5 rounded-md ${isDarkMode ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600'} mr-3`}>
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                             </svg>
                           </div>
                           <div className="flex-1">
                             <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Email</p>
                             <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedMembership.userId?.email || 'Không có email'}</p>
                           </div>
                         </div>
                         
                         <div className={`flex items-center p-3 rounded-lg ${isDarkMode ? 'bg-gray-700/30' : 'bg-gray-50'}`}>
                           <div className={`p-1.5 rounded-md ${isDarkMode ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-600'} mr-3`}>
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                             </svg>
                           </div>
                           <div className="flex-1">
                             <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Khoa</p>
                             <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedMembership.userId?.faculty || 'Chưa cập nhật'}</p>
                           </div>
                         </div>
                         
                         <div className={`flex items-center p-3 rounded-lg ${isDarkMode ? 'bg-gray-700/30' : 'bg-gray-50'}`}>
                           <div className={`p-1.5 rounded-md ${isDarkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'} mr-3`}>
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                             </svg>
                           </div>
                           <div className="flex-1">
                             <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Lớp</p>
                             <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedMembership.userId?.class || 'Chưa cập nhật'}</p>
                           </div>
                         </div>
                         
                         <div className={`flex items-center p-3 rounded-lg ${isDarkMode ? 'bg-gray-700/30' : 'bg-gray-50'}`}>
                           <div className={`p-1.5 rounded-md ${isDarkMode ? 'bg-pink-500/20 text-pink-400' : 'bg-pink-100 text-pink-600'} mr-3`}>
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                             </svg>
                           </div>
                           <div className="flex-1">
                             <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Số điện thoại</p>
                             <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedMembership.userId?.phone || 'Chưa cập nhật'}</p>
                           </div>
                         </div>
                         
                         <div className={`flex items-center p-3 rounded-lg ${isDarkMode ? 'bg-gray-700/30' : 'bg-gray-50'}`}>
                           <div className={`p-1.5 rounded-md ${isDarkMode ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-600'} mr-3`}>
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                             </svg>
                           </div>
                           <div className="flex-1">
                             <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Vai trò</p>
                             <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                               {selectedMembership.userId?.role ? getRoleDisplayName(selectedMembership.userId.role) : 'Chưa cập nhật'}
                             </p>
                           </div>
                         </div>
                       </div>
                     </div>

                   {/* Application Status Card */}
                   <div className={`${isDarkMode ? 'bg-gray-800/50' : 'bg-white'} rounded-xl p-5 border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} shadow-sm`}>
                     <div className="flex items-center space-x-3 mb-4">
                       <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                         </svg>
                       </div>
                       <h4 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Trạng thái đơn</h4>
                     </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className={`flex items-center p-3 rounded-lg ${isDarkMode ? 'bg-gray-700/30' : 'bg-gray-50'}`}>
                           <div className={`p-1.5 rounded-md ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'} mr-3`}>
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                             </svg>
                           </div>
                           <div className="flex-1">
                             <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Trạng thái</p>
                             <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(selectedMembership.status)}`}>
                               {selectedMembership.status === 'PENDING' && 'Chờ duyệt'}
                               {selectedMembership.status === 'ACTIVE' && 'Đã duyệt'}
                               {selectedMembership.status === 'REJECTED' && 'Đã từ chối'}
                               {selectedMembership.status === 'REMOVED' && 'Đã xóa'}
                               {selectedMembership.status === 'INACTIVE' && 'Không hoạt động'}
                             </span>
                           </div>
                         </div>
                       <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
                         <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Ngày đăng ký:</span>
                         <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{formatDateTime(selectedMembership.joinedAt)}</span>
                       </div>
                       {selectedMembership.approvedAt && (
                         <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
                           <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Ngày duyệt:</span>
                           <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{formatDateTime(selectedMembership.approvedAt)}</span>
                         </div>
                       )}
                       {selectedMembership.rejectedAt && (
                         <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
                           <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Ngày từ chối:</span>
                           <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{formatDateTime(selectedMembership.rejectedAt)}</span>
                         </div>
                       )}
                       {selectedMembership.removedAt && (
                         <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
                           <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Ngày xóa:</span>
                           <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{formatDateTime(selectedMembership.removedAt)}</span>
                         </div>
                       )}
                       {selectedMembership.approvedBy && (
                         <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
                           <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Người duyệt:</span>
                           <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedMembership.approvedBy.name}</span>
                         </div>
                       )}
                       {selectedMembership.removedBy && (
                         <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
                           <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Người xóa:</span>
                           <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedMembership.removedBy.name}</span>
                         </div>
                       )}
                       {selectedMembership.rejectionReason && (
                         <div className="py-2">
                           <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Lý do từ chối:</span>
                           <p className={`mt-1 text-sm ${isDarkMode ? 'text-red-300' : 'text-red-600'}`}>{selectedMembership.rejectionReason}</p>
                         </div>
                       )}
                       {(selectedMembership.removalReasonTrue || selectedMembership.removalReason) && (
                         <div className="py-2">
                           <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Lý do xóa hiện tại:</span>
                           <p className={`mt-1 text-sm ${isDarkMode ? 'text-red-300' : 'text-red-600'}`}>{selectedMembership.removalReasonTrue || selectedMembership.removalReason}</p>
                         </div>
                       )}
                       

                     </div>
                   </div>
                 </div>

                 {/* Registration Details */}
                 <div className={`${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'} rounded-xl p-6 border ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                   <div className="flex items-center space-x-3 mb-6">
                     <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-600'}`}>
                       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                       </svg>
                     </div>
                     <h4 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Thông tin đăng ký</h4>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     {selectedMembership.motivation && (
                       <div className={`${isDarkMode ? 'bg-gray-600/50' : 'bg-white'} rounded-lg p-4 border ${isDarkMode ? 'border-gray-500' : 'border-gray-200'}`}>
                         <h5 className={`font-semibold mb-3 flex items-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                           <span className="mr-2">💭</span>Động lực tham gia CLB
                         </h5>
                         <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                           {selectedMembership.motivation}
                         </p>
                       </div>
                     )}
                     {selectedMembership.experience && (
                       <div className={`${isDarkMode ? 'bg-gray-600/50' : 'bg-white'} rounded-lg p-4 border ${isDarkMode ? 'border-gray-500' : 'border-gray-200'}`}>
                         <h5 className={`font-semibold mb-3 flex items-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                           <span className="mr-2">🏆</span>Kinh nghiệm và thành tích
                         </h5>
                         <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                           {selectedMembership.experience}
                         </p>
                       </div>
                     )}
                     {selectedMembership.expectations && (
                       <div className={`${isDarkMode ? 'bg-gray-600/50' : 'bg-white'} rounded-lg p-4 border ${isDarkMode ? 'border-gray-500' : 'border-gray-200'}`}>
                         <h5 className={`font-semibold mb-3 flex items-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                           <span className="mr-2">🎯</span>Mong muốn và kỳ vọng
                         </h5>
                         <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                           {selectedMembership.expectations}
                         </p>
                       </div>
                     )}
                     {selectedMembership.commitment && (
                       <div className={`${isDarkMode ? 'bg-gray-600/50' : 'bg-white'} rounded-lg p-4 border ${isDarkMode ? 'border-gray-500' : 'border-gray-200'}`}>
                         <h5 className={`font-semibold mb-3 flex items-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                           <span className="mr-2">🤝</span>Cam kết tham gia
                         </h5>
                         <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                           {selectedMembership.commitment}
                         </p>
                       </div>
                     )}
                   </div>
                 </div>

                 {/* History Table */}
                 {selectedMembership.removalHistory && selectedMembership.removalHistory.length > 0 && (
                   <div className={`${isDarkMode ? 'bg-gray-800/50' : 'bg-white'} rounded-2xl p-6 border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} shadow-lg hover:shadow-xl transition-all duration-300`}>
                     <div className="flex items-center space-x-4 mb-6">
                       <div className={`p-3 rounded-xl ${isDarkMode ? 'bg-gradient-to-br from-orange-500 to-red-600 text-white' : 'bg-gradient-to-br from-orange-500 to-red-600 text-white'} shadow-lg`}>
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                         </svg>
                       </div>
                       <h4 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Lịch sử xóa/duyệt lại</h4>
                     </div>
                     
                     <div className="overflow-x-auto">
                       <table className="w-full">
                         <thead>
                           <tr className={`border-b ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                             <th className={`text-left py-3 px-4 font-semibold text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                               <div className="flex items-center">
                                 <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                 </svg>
                                 Lần
                               </div>
                             </th>
                             <th className={`text-left py-3 px-4 font-semibold text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                               <div className="flex items-center">
                                 <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                 </svg>
                                 Ngày xóa
                               </div>
                             </th>
                             <th className={`text-left py-3 px-4 font-semibold text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                               <div className="flex items-center">
                                 <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                 </svg>
                                 Lý do xóa
                               </div>
                             </th>
                             <th className={`text-left py-3 px-4 font-semibold text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                               <div className="flex items-center">
                                 <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                 </svg>
                                 Người xóa
                               </div>
                             </th>
                             <th className={`text-center py-3 px-4 font-semibold text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                               <div className="flex items-center justify-center">
                                 <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                 </svg>
                                 Trạng thái
                               </div>
                             </th>
                             <th className={`text-left py-3 px-4 font-semibold text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                               <div className="flex items-center">
                                 <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                 </svg>
                                 Ngày duyệt lại
                               </div>
                             </th>
                             <th className={`text-left py-3 px-4 font-semibold text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                               <div className="flex items-center">
                                 <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                 </svg>
                                 Lý do duyệt lại
                               </div>
                             </th>
                           </tr>
                         </thead>
                         <tbody>
                           {(() => {
                             // Loại bỏ các entries trùng lặp dựa trên removedAt (trong vòng 1 giây)
                             // Ưu tiên giữ lại entry có thông tin duyệt lại
                             const uniqueHistory = selectedMembership.removalHistory!.reduce((acc, history) => {
                               const existingIndex = acc.findIndex(h => 
                                 Math.abs(new Date(h.removedAt).getTime() - new Date(history.removedAt).getTime()) < 1000
                               );
                               
                               if (existingIndex === -1) {
                                 acc.push(history);
                               } else {
                                 const existing = acc[existingIndex];
                                 const hasRestorationInfo = history.restoredAt && history.restorationReason;
                                 const existingHasRestorationInfo = existing.restoredAt && existing.restorationReason;
                                 
                                 if (hasRestorationInfo && !existingHasRestorationInfo) {
                                   acc[existingIndex] = history;
                                 }
                               }
                               return acc;
                             }, [] as typeof selectedMembership.removalHistory);

                             return uniqueHistory.map((history, index) => (
                               <tr key={index} className={`border-b ${isDarkMode ? 'border-gray-700 hover:bg-gray-700/30' : 'border-gray-200 hover:bg-gray-50'} transition-colors duration-200`}>
                                 <td className="py-4 px-4">
                                   <div className="flex items-center">
                                     <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                                       isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'
                                     }`}>
                                       {index + 1}
                                     </div>
                                   </div>
                                 </td>
                                 <td className="py-4 px-4">
                                   <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                     {new Date(history.removedAt).toLocaleDateString('vi-VN')}
                                   </div>
                                   <div className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                                     {new Date(history.removedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                   </div>
                                 </td>
                                 <td className="py-4 px-4">
                                   <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} max-w-xs truncate`} title={history.removalReason}>
                                     {history.removalReason}
                                   </div>
                                 </td>
                                 <td className="py-4 px-4">
                                   <div className="flex items-center">
                                     <div className={`w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center mr-2`}>
                                       <span className="text-xs font-medium text-gray-600">
                                         {history.removedBy.name.charAt(0).toUpperCase()}
                                       </span>
                                     </div>
                                     <div>
                                       <div className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                         {history.removedBy.name}
                                       </div>
                                       <div className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                                         {history.removedBy.studentId}
                                       </div>
                                     </div>
                                   </div>
                                 </td>
                                 <td className="py-4 px-4 text-center">
                                   <div className="flex items-center justify-center">
                                     {history.restoredAt ? (
                                       <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                         isDarkMode ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-800'
                                       }`}>
                                         <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                         </svg>
                                         Đã duyệt lại
                                       </span>
                                     ) : (
                                       <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                         isDarkMode ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-800'
                                       }`}>
                                         <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                         </svg>
                                         Đã xóa
                                       </span>
                                     )}
                                   </div>
                                 </td>
                                 <td className="py-4 px-4">
                                   {history.restoredAt ? (
                                     <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                       {new Date(history.restoredAt).toLocaleDateString('vi-VN')}
                                       <div className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                                         {new Date(history.restoredAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                       </div>
                                     </div>
                                   ) : (
                                     <span className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>-</span>
                                   )}
                                 </td>
                                 <td className="py-4 px-4">
                                   {history.restorationReason ? (
                                     <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} max-w-xs truncate`} title={history.restorationReason}>
                                       {history.restorationReason}
                                     </div>
                                   ) : (
                                     <span className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>-</span>
                                   )}
                                 </td>
                               </tr>
                             ));
                           })()}
                         </tbody>
                       </table>
                     </div>
                   </div>
                 )}

                 {/* Footer */}
                 <div className="flex justify-end mt-6 pt-6 border-t border-gray-200 dark:border-gray-600 flex-shrink-0">
                   <button
                     onClick={() => {
                       setShowDetailsModal(false);
                       setSelectedMembership(null);
                     }}
                     className={`px-6 py-2 rounded-lg font-medium transition-colors duration-200 ${
                       isDarkMode 
                         ? 'bg-gray-600 text-white hover:bg-gray-500' 
                         : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                     }`}
                   >
                     Đóng
                   </button>
                 </div>
               </div>
             </div>
           </div>
         )}

        <Footer isDarkMode={isDarkMode} />
      </div>
    </ProtectedRoute>
  );
}
