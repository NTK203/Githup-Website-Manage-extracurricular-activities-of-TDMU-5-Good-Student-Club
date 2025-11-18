'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import AdminNav from '@/components/admin/AdminNav';
import Footer from '@/components/common/Footer';
import { useDarkMode } from '@/hooks/useDarkMode';
import PaginationBar from '@/components/common/PaginationBar';
import {
  FileText,
  Clock,
  CheckCircle2,
  X,
  XCircle,
  Phone,
  Building,
  GraduationCap,
  MessageSquare,
  Trash2,
  ClipboardList,
  User,
  Mail,
  BookOpen,
  Shield,
  Calendar,
  Tag,
  RotateCw,
  Target,
  Loader,
  Eye
} from 'lucide-react';

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
  const [membershipsPerPage, setMembershipsPerPage] = useState(10);

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
  const [mounted, setMounted] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);

  // Set mounted for portal
  useEffect(() => {
    setMounted(true);
  }, []);

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
  }, [currentPage, search, statusFilter, facultyFilter, sortBy, sortOrder, membershipsPerPage]);

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
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
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

  // Details Modal Content
  const detailsModalContent = showDetailsModal && selectedMembership && mounted ? (
    <div>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity z-[99999]"
        onClick={() => {
          setShowDetailsModal(false);
          setSelectedMembership(null);
        }}
      />
      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none z-[100000]">
        <div 
          className={`relative w-full max-w-5xl max-h-[95vh] shadow-2xl rounded-xl ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'} border flex flex-col pointer-events-auto`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`relative p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
           <div className="relative flex justify-between items-center">
             <div className="flex items-center space-x-2">
               <FileText size={18} className={`${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} strokeWidth={1.5} />
               <div>
                 <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                   Chi tiết đơn đăng ký
                 </h3>
                 <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                   {selectedMembership.userId?.name || 'Không có tên'} - {selectedMembership.userId?.studentId || 'Không có MSSV'}
                 </p>
               </div>
             </div>
             <button
               onClick={() => {
                 setShowDetailsModal(false);
                 setSelectedMembership(null);
               }}
               className={`p-1 rounded-md transition-all duration-200 ${isDarkMode ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
             >
               <X size={16} strokeWidth={1.5} />
             </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 overflow-y-auto flex-1">
            <div className="space-y-4">
              {/* User Information Card */}
              <div className={`${isDarkMode ? 'bg-gray-800/50' : 'bg-white'} rounded-xl p-4 border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} shadow-sm`}>
                <div className="flex items-center space-x-2 mb-3">
                  <User size={16} className={`${isDarkMode ? 'text-green-400' : 'text-green-600'}`} strokeWidth={1.5} />
                  <h4 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Thông tin sinh viên</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className={`flex items-center p-3 rounded-lg ${isDarkMode ? 'bg-gray-700/30' : 'bg-gray-50'}`}>
                    <User size={16} className={`${isDarkMode ? 'text-blue-400' : 'text-blue-600'} mr-2`} strokeWidth={1.5} />
                    <div className="flex-1">
                      <p className={`text-xs font-medium mb-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Họ và tên</p>
                      <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedMembership.userId?.name || 'Không có tên'}</p>
                    </div>
                  </div>
                  
                  <div className={`flex items-center p-3 rounded-lg ${isDarkMode ? 'bg-gray-700/30' : 'bg-gray-50'}`}>
                    <FileText size={16} className={`${isDarkMode ? 'text-purple-400' : 'text-purple-600'} mr-2`} strokeWidth={1.5} />
                    <div className="flex-1">
                      <p className={`text-xs font-medium mb-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>MSSV</p>
                      <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedMembership.userId?.studentId || 'Không có MSSV'}</p>
                    </div>
                  </div>
                  
                  <div className={`flex items-center p-3 rounded-lg ${isDarkMode ? 'bg-gray-700/30' : 'bg-gray-50'}`}>
                    <Mail size={16} className={`${isDarkMode ? 'text-green-400' : 'text-green-600'} mr-2`} strokeWidth={1.5} />
                    <div className="flex-1">
                      <p className={`text-xs font-medium mb-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Email</p>
                      <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedMembership.userId?.email || 'Không có email'}</p>
                    </div>
                  </div>
                  
                  <div className={`flex items-center p-3 rounded-lg ${isDarkMode ? 'bg-gray-700/30' : 'bg-gray-50'}`}>
                    <Building size={16} className={`${isDarkMode ? 'text-orange-400' : 'text-orange-600'} mr-2`} strokeWidth={1.5} />
                    <div className="flex-1">
                      <p className={`text-xs font-medium mb-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Khoa</p>
                      <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedMembership.userId?.faculty || 'Chưa cập nhật'}</p>
                    </div>
                  </div>
                  
                  <div className={`flex items-center p-3 rounded-lg ${isDarkMode ? 'bg-gray-700/30' : 'bg-gray-50'}`}>
                    <BookOpen size={16} className={`${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'} mr-2`} strokeWidth={1.5} />
                    <div className="flex-1">
                      <p className={`text-xs font-medium mb-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Lớp</p>
                      <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedMembership.userId?.class || 'Chưa cập nhật'}</p>
                    </div>
                  </div>
                  
                  <div className={`flex items-center p-3 rounded-lg ${isDarkMode ? 'bg-gray-700/30' : 'bg-gray-50'}`}>
                    <Phone size={16} className={`${isDarkMode ? 'text-pink-400' : 'text-pink-600'} mr-2`} strokeWidth={1.5} />
                    <div className="flex-1">
                      <p className={`text-xs font-medium mb-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Số điện thoại</p>
                      <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedMembership.userId?.phone || 'Chưa cập nhật'}</p>
                    </div>
                  </div>
                  
                  <div className={`flex items-center p-3 rounded-lg ${isDarkMode ? 'bg-gray-700/30' : 'bg-gray-50'}`}>
                    <Shield size={16} className={`${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'} mr-2`} strokeWidth={1.5} />
                    <div className="flex-1">
                      <p className={`text-xs font-medium mb-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Vai trò</p>
                      <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {selectedMembership.userId?.role ? getRoleDisplayName(selectedMembership.userId.role) : 'Chưa cập nhật'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Application Status Card */}
              <div className={`${isDarkMode ? 'bg-gray-800/50' : 'bg-white'} rounded-xl p-4 border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} shadow-sm`}>
                <div className="flex items-center space-x-2 mb-3">
                  <CheckCircle2 size={16} className={`${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} strokeWidth={1.5} />
                  <h4 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Trạng thái đơn</h4>
                </div>
                <div className="space-y-3">
                  <div className={`flex items-center p-3 rounded-lg ${isDarkMode ? 'bg-gray-700/30' : 'bg-gray-50'}`}>
                    <CheckCircle2 size={16} className={`${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'} mr-2`} strokeWidth={1.5} />
                    <div className="flex-1">
                      <p className={`text-xs font-medium mb-1.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Trạng thái</p>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(selectedMembership.status)}`}>
                        {selectedMembership.status === 'PENDING' && 'Chờ duyệt'}
                        {selectedMembership.status === 'ACTIVE' && 'Đã duyệt'}
                        {selectedMembership.status === 'REJECTED' && 'Đã từ chối'}
                        {selectedMembership.status === 'REMOVED' && 'Đã xóa'}
                        {selectedMembership.status === 'INACTIVE' && 'Không hoạt động'}
                      </span>
                    </div>
                  </div>
                  <div className={`flex justify-between items-center py-2 px-3 rounded-lg ${isDarkMode ? 'bg-gray-700/30' : 'bg-gray-50'}`}>
                    <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Ngày đăng ký:</span>
                    <span className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{formatDateTime(selectedMembership.joinedAt)}</span>
                  </div>
                  {selectedMembership.approvedAt && (
                    <div className={`flex justify-between items-center py-2 px-3 rounded-lg ${isDarkMode ? 'bg-gray-700/30' : 'bg-gray-50'}`}>
                      <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Ngày duyệt:</span>
                      <span className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{formatDateTime(selectedMembership.approvedAt)}</span>
                    </div>
                  )}
                  {selectedMembership.rejectedAt && (
                    <div className={`flex justify-between items-center py-2 px-3 rounded-lg ${isDarkMode ? 'bg-gray-700/30' : 'bg-gray-50'}`}>
                      <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Ngày từ chối:</span>
                      <span className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{formatDateTime(selectedMembership.rejectedAt)}</span>
                    </div>
                  )}
                  {selectedMembership.removedAt && (
                    <div className={`flex justify-between items-center py-2 px-3 rounded-lg ${isDarkMode ? 'bg-gray-700/30' : 'bg-gray-50'}`}>
                      <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Ngày xóa:</span>
                      <span className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{formatDateTime(selectedMembership.removedAt)}</span>
                    </div>
                  )}
                  {selectedMembership.approvedBy && (
                    <div className={`flex justify-between items-center py-2 px-3 rounded-lg ${isDarkMode ? 'bg-gray-700/30' : 'bg-gray-50'}`}>
                      <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Người duyệt:</span>
                      <span className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedMembership.approvedBy.name}</span>
                    </div>
                  )}
                  {selectedMembership.removedBy && (
                    <div className={`flex justify-between items-center py-2 px-3 rounded-lg ${isDarkMode ? 'bg-gray-700/30' : 'bg-gray-50'}`}>
                      <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Người xóa:</span>
                      <span className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedMembership.removedBy.name}</span>
                    </div>
                  )}
                  {selectedMembership.rejectionReason && (
                    <div className={`py-3 px-3 rounded-lg ${isDarkMode ? 'bg-red-900/20 border border-red-800/50' : 'bg-red-50 border border-red-200'}`}>
                      <span className={`text-xs font-medium ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>Lý do từ chối:</span>
                      <p className={`mt-1.5 text-sm ${isDarkMode ? 'text-red-200' : 'text-red-800'}`}>{selectedMembership.rejectionReason}</p>
                    </div>
                  )}
                  {(selectedMembership.removalReasonTrue || selectedMembership.removalReason) && (
                    <div className={`py-3 px-3 rounded-lg ${isDarkMode ? 'bg-red-900/20 border border-red-800/50' : 'bg-red-50 border border-red-200'}`}>
                      <span className={`text-xs font-medium ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>Lý do xóa hiện tại:</span>
                      <p className={`mt-1.5 text-sm ${isDarkMode ? 'text-red-200' : 'text-red-800'}`}>{selectedMembership.removalReasonTrue || selectedMembership.removalReason}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Registration Details */}
              <div className={`${isDarkMode ? 'bg-gray-800/50' : 'bg-white'} rounded-xl p-4 border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} shadow-sm`}>
                <div className="flex items-center space-x-2 mb-3">
                  <FileText size={16} className={`${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`} strokeWidth={1.5} />
                  <h4 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Thông tin đăng ký</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedMembership.motivation && (
                    <div className={`${isDarkMode ? 'bg-gray-700/30' : 'bg-gray-50'} rounded-lg p-3 border ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                      <h5 className={`text-sm font-semibold mb-2 flex items-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        <MessageSquare size={16} className="mr-2" strokeWidth={1.5} />
                        Động lực tham gia CLB
                      </h5>
                      <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {selectedMembership.motivation}
                      </p>
                    </div>
                  )}
                  {selectedMembership.experience && (
                    <div className={`${isDarkMode ? 'bg-gray-700/30' : 'bg-gray-50'} rounded-lg p-3 border ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                      <h5 className={`text-sm font-semibold mb-2 flex items-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        <Target size={16} className="mr-2" strokeWidth={1.5} />
                        Kinh nghiệm và thành tích
                      </h5>
                      <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {selectedMembership.experience}
                      </p>
                    </div>
                  )}
                  {selectedMembership.expectations && (
                    <div className={`${isDarkMode ? 'bg-gray-700/30' : 'bg-gray-50'} rounded-lg p-3 border ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                      <h5 className={`text-sm font-semibold mb-2 flex items-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        <Target size={16} className="mr-2" strokeWidth={1.5} />
                        Mong muốn và kỳ vọng
                      </h5>
                      <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {selectedMembership.expectations}
                      </p>
                    </div>
                  )}
                  {selectedMembership.commitment && (
                    <div className={`${isDarkMode ? 'bg-gray-700/30' : 'bg-gray-50'} rounded-lg p-3 border ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                      <h5 className={`text-sm font-semibold mb-2 flex items-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        <CheckCircle2 size={16} className="mr-2" strokeWidth={1.5} />
                        Cam kết tham gia
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
                <div className={`${isDarkMode ? 'bg-gray-800/50' : 'bg-white'} rounded-xl p-4 border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} shadow-sm`}>
                  <div className="flex items-center space-x-2 mb-3">
                    <Clock size={16} className={`${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} strokeWidth={1.5} />
                    <h4 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Lịch sử xóa/duyệt lại</h4>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className={`w-full border-collapse border ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                      <thead>
                        <tr className="bg-blue-600">
                          <th className={`text-left py-2 px-3 font-semibold text-xs border border-blue-700 text-white`}>
                            <div className="flex items-center">
                              <Tag size={14} className="mr-1.5 text-white" strokeWidth={1.5} />
                              Lần
                            </div>
                          </th>
                          <th className={`text-left py-2 px-3 font-semibold text-xs border border-blue-700 text-white`}>
                            <div className="flex items-center">
                              <Calendar size={14} className="mr-1.5 text-white" strokeWidth={1.5} />
                              Ngày xóa
                            </div>
                          </th>
                          <th className={`text-left py-2 px-3 font-semibold text-xs border border-blue-700 text-white`}>
                            <div className="flex items-center">
                              <FileText size={14} className="mr-1.5 text-white" strokeWidth={1.5} />
                              Lý do xóa
                            </div>
                          </th>
                          <th className={`text-left py-2 px-3 font-semibold text-xs border border-blue-700 text-white`}>
                            <div className="flex items-center">
                              <User size={14} className="mr-1.5 text-white" strokeWidth={1.5} />
                              Người xóa
                            </div>
                          </th>
                          <th className={`text-center py-2 px-3 font-semibold text-xs border border-blue-700 text-white`}>
                            <div className="flex items-center justify-center">
                              <CheckCircle2 size={14} className="mr-1.5 text-white" strokeWidth={1.5} />
                              Trạng thái
                            </div>
                          </th>
                          <th className={`text-left py-2 px-3 font-semibold text-xs border border-blue-700 text-white`}>
                            <div className="flex items-center">
                              <Calendar size={14} className="mr-1.5 text-white" strokeWidth={1.5} />
                              Ngày duyệt lại
                            </div>
                          </th>
                          <th className={`text-left py-2 px-3 font-semibold text-xs border border-blue-700 text-white`}>
                            <div className="flex items-center">
                              <FileText size={14} className="mr-1.5 text-white" strokeWidth={1.5} />
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
                            <tr key={index} className={`${isDarkMode ? 'hover:bg-gray-700/30' : 'hover:bg-gray-50'} transition-colors duration-200`}>
                              <td className={`py-2 px-3 border ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                                <div className="flex items-center justify-center">
                                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                                    isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'
                                  }`}>
                                    {index + 1}
                                  </div>
                                </div>
                              </td>
                              <td className={`py-2 px-3 border ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                                <div className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                  {new Date(history.removedAt).toLocaleDateString('vi-VN')}
                                </div>
                                <div className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                                  {new Date(history.removedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </td>
                              <td className={`py-2 px-3 border ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                                <div className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} max-w-xs truncate`} title={history.removalReason}>
                                  {history.removalReason}
                                </div>
                              </td>
                              <td className={`py-2 px-3 border ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                                <div className="flex items-center">
                                  <div className={`w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center mr-2`}>
                                    <span className="text-xs font-medium text-gray-600">
                                      {history.removedBy.name.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <div>
                                    <div className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                      {history.removedBy.name}
                                    </div>
                                    <div className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                                      {history.removedBy.studentId}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className={`py-2 px-3 text-center border ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                                <div className="flex items-center justify-center">
                                  {history.restoredAt ? (
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                      isDarkMode ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-800'
                                    }`}>
                                      <CheckCircle2 size={12} className="mr-1" strokeWidth={1.5} />
                                      Đã duyệt lại
                                    </span>
                                  ) : (
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                      isDarkMode ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-800'
                                    }`}>
                                      <X size={12} className="mr-1" strokeWidth={1.5} />
                                      Đã xóa
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className={`py-2 px-3 border ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                                {history.restoredAt ? (
                                  <div className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                    {new Date(history.restoredAt).toLocaleDateString('vi-VN')}
                                    <div className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                                      {new Date(history.restoredAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                  </div>
                                ) : (
                                  <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>-</span>
                                )}
                              </td>
                              <td className={`py-2 px-3 border ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                                {history.restorationReason ? (
                                  <div className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} max-w-xs truncate`} title={history.restorationReason}>
                                    {history.restorationReason}
                                  </div>
                                ) : (
                                  <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>-</span>
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
            </div>
          </div>

          {/* Footer */}
          <div className={`flex justify-end p-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} flex-shrink-0`}>
            <button
              onClick={() => {
                setShowDetailsModal(false);
                setSelectedMembership(null);
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 text-sm ${
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
  ) : null;

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
                <FileText size={20} className="text-blue-600 dark:text-blue-400" strokeWidth={1.5} />
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
                <Clock size={20} className="text-yellow-600 dark:text-yellow-400" strokeWidth={1.5} />
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
                <CheckCircle2 size={20} className="text-green-600 dark:text-green-400" strokeWidth={1.5} />
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
                <X size={20} className="text-red-600 dark:text-red-400" strokeWidth={1.5} />
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
                <XCircle size={20} className="text-gray-600 dark:text-gray-400" strokeWidth={1.5} />
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
              <div className={`flex flex-col items-center justify-center py-20 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <Loader 
                  size={64} 
                  className={`animate-spin mb-6 ${
                    isDarkMode ? 'text-blue-400' : 'text-blue-600'
                  }`}
                  strokeWidth={2}
                />
                
                <p className={`text-sm font-semibold mb-2 ${
                  isDarkMode ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  Đang tải dữ liệu
                </p>
                
                <div className="flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    isDarkMode ? 'bg-blue-400' : 'bg-blue-500'
                  } animate-pulse`} style={{ animationDelay: '0s' }}></span>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    isDarkMode ? 'bg-blue-400' : 'bg-blue-500'
                  } animate-pulse`} style={{ animationDelay: '0.2s' }}></span>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    isDarkMode ? 'bg-blue-400' : 'bg-blue-500'
                  } animate-pulse`} style={{ animationDelay: '0.4s' }}></span>
                </div>
              </div>
            ) : error ? (
              <div className="p-8 text-center">
                <p className="text-red-600 dark:text-red-400">{error}</p>
              </div>
            ) : (
              <>
                {/* Pagination - Top */}
                {!loading && !error && pagination && pagination.totalCount > 0 && (
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <PaginationBar
                      totalItems={pagination.totalCount}
                      currentPage={currentPage}
                      itemsPerPage={membershipsPerPage}
                      onPageChange={(page) => setCurrentPage(page)}
                      onItemsPerPageChange={(newItemsPerPage) => {
                        setMembershipsPerPage(newItemsPerPage);
                        setCurrentPage(1);
                      }}
                      itemLabel="đơn đăng ký"
                      isDarkMode={isDarkMode}
                      itemsPerPageOptions={[5, 10, 20, 50, 100]}
                    />
                  </div>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead className="bg-blue-600">
                      <tr>
                        <th className="px-4 py-2 text-center text-xs font-medium uppercase tracking-wider text-white border border-white whitespace-nowrap">
                          Người đăng ký
                        </th>
                        <th className="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider text-white border border-white w-[120px] whitespace-nowrap">
                          Trạng thái
                        </th>
                        <th className="px-4 py-2 text-center text-xs font-medium uppercase tracking-wider text-white border border-white whitespace-nowrap">
                          Ngày đăng ký
                        </th>
                        <th className="px-4 py-2 text-center text-xs font-medium uppercase tracking-wider text-white border border-white whitespace-nowrap">
                          Người duyệt
                        </th>
                        <th className="px-4 py-2 text-center text-xs font-medium uppercase tracking-wider text-white border border-white whitespace-nowrap">
                          Thông tin
                        </th>
                        <th className="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider text-white border border-white w-[140px] whitespace-nowrap">
                          Hành động
                        </th>
                      </tr>
                    </thead>
                    <tbody className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                      {memberships.map((membership) => (
                        <tr key={membership._id} className={`${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                          <td className="px-4 py-3 border border-white">
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
                                                     <td className="px-3 py-3 whitespace-nowrap border border-white w-[120px] text-center">
                             <div className="flex justify-center">
                               <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${getStatusBadgeColor(membership.status)}`}>
                                 {membership.status === 'PENDING' && 'Chờ duyệt'}
                                 {membership.status === 'ACTIVE' && 'Đã duyệt'}
                                 {membership.status === 'REJECTED' && 'Đã từ chối'}
                                 {membership.status === 'REMOVED' && 'Đã xóa'}
                                 {membership.status === 'INACTIVE' && 'Không hoạt động'}
                               </span>
                             </div>
                           </td>
                          <td className={`px-4 py-3 text-sm border border-white ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            <div className="flex flex-col items-center justify-center min-h-[60px] space-y-1">
                              <div className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                                {formatDate(membership.joinedAt)}
                              </div>
                              <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                {formatTime(membership.joinedAt)}
                              </div>
                            </div>
                          </td>
                                                     <td className={`px-4 py-3 text-sm border border-white ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                             <div className="flex flex-col items-center justify-center min-h-[60px] space-y-1">
                               {membership.approvedBy && membership.approvedAt && new Date(membership.approvedAt).getTime() > 0 ? (
                                 <>
                                   <div className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                                     {membership.approvedBy.name}
                                   </div>
                                   <div className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                     {formatDate(membership.approvedAt)}
                                   </div>
                                   <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                     {formatTime(membership.approvedAt)}
                                   </div>
                                 </>
                               ) : membership.status === 'REJECTED' ? (
                                 <>
                                   <div className="text-red-600 dark:text-red-400 font-medium text-sm">Từ chối</div>
                                   {membership.rejectedAt && new Date(membership.rejectedAt).getTime() > 0 ? (
                                     <>
                                       <div className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                         {formatDate(membership.rejectedAt)}
                                       </div>
                                       <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                         {formatTime(membership.rejectedAt)}
                                       </div>
                                     </>
                                   ) : null}
                                 </>
                               ) : membership.status === 'REMOVED' ? (
                                 <>
                                   <div className="text-red-600 dark:text-red-400 font-medium text-sm">Đã xóa</div>
                                   <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                     {membership.removedBy?.name || 'Hệ thống'}
                                   </div>
                                   {membership.removedAt && new Date(membership.removedAt).getTime() > 0 ? (
                                     <>
                                       <div className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                         {formatDate(membership.removedAt)}
                                       </div>
                                       <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                         {formatTime(membership.removedAt)}
                                       </div>
                                     </>
                                   ) : null}
                                 </>
                               ) : (
                                 <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Chưa duyệt</span>
                               )}
                             </div>
                           </td>
                          <td className={`px-4 py-3 text-sm border border-white ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            <div className="space-y-1">
                              {membership.userId?.phone && (
                                <div className="flex items-center">
                                  <Phone size={14} className="mr-2 text-blue-500" strokeWidth={1.5} />
                                  <span>{membership.userId.phone}</span>
                                </div>
                              )}
                              {membership.userId?.class && (
                                <div className="flex items-center">
                                  <Building size={14} className="mr-2 text-orange-500" strokeWidth={1.5} />
                                  <span>{membership.userId.class}</span>
                                </div>
                              )}
                              {membership.userId?.faculty && (
                                <div className="flex items-center">
                                  <GraduationCap size={14} className="mr-2 text-purple-500" strokeWidth={1.5} />
                                  <span>{membership.userId.faculty}</span>
                                </div>
                              )}
                              {membership.rejectionReason && (
                                <div className="text-red-600 dark:text-red-400 flex items-start">
                                  <MessageSquare size={14} className="mr-2 mt-0.5 flex-shrink-0" strokeWidth={1.5} />
                                  <span className="text-xs">{membership.rejectionReason}</span>
                                </div>
                              )}
                              {(membership.removalReasonTrue || membership.removalReason) && (
                                <div className="text-red-600 dark:text-red-400 flex items-start">
                                  <Trash2 size={14} className="mr-2 mt-0.5 flex-shrink-0" strokeWidth={1.5} />
                                  <span className="text-xs">{membership.removalReasonTrue || membership.removalReason}</span>
                                </div>
                              )}
                              {/* Hiển thị lịch sử xóa/duyệt lại */}
                              {membership.removalHistory && membership.removalHistory.length > 0 && (
                                <div className={`removal-history-light mt-2 p-2 rounded border`}>
                                  <div className="text-header text-xs font-medium mb-1 flex items-center">
                                    <ClipboardList size={14} className="mr-1" strokeWidth={1.5} />
                                    Lịch sử xóa/duyệt lại ({(() => {
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
                              {membership.status !== 'ACTIVE' && (
                                <button
                                  onClick={() => openDetailsModal(membership)}
                                  className="mt-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
                                >
                                  Xem chi tiết
                                </button>
                              )}
                            </div>
                          </td>
                                                     <td className="px-3 py-3 text-center text-sm font-medium border border-white w-[140px]">
                             {membership.status === 'PENDING' && (
                               <div className="flex flex-col items-center justify-center space-y-1.5">
                                 <button
                                   onClick={() => handleApprove(membership._id)}
                                   disabled={processingAction}
                                   className="inline-flex items-center px-2 py-1 text-[10px] font-medium rounded-md transition-colors duration-200 bg-green-600 text-white hover:bg-green-700 dark:bg-green-600 dark:text-white dark:hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm w-full justify-center"
                                 >
                                   <CheckCircle2 size={12} className="mr-1" strokeWidth={1.5} />
                                   Duyệt
                                 </button>
                                 <button
                                   onClick={() => openRejectModal(membership)}
                                   disabled={processingAction}
                                   className="inline-flex items-center px-2 py-1 text-[10px] font-medium rounded-md transition-colors duration-200 bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:text-white dark:hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm w-full justify-center"
                                 >
                                   <X size={12} className="mr-1" strokeWidth={1.5} />
                                   Từ chối
                                 </button>
                               </div>
                             )}

                             {membership.status === 'REJECTED' && (
                               <div className="flex items-center justify-center">
                                 <button
                                   onClick={() => handleApprove(membership._id)}
                                   disabled={processingAction}
                                   className="inline-flex items-center px-2 py-1 text-[10px] font-medium rounded-md transition-colors duration-200 bg-green-600 text-white hover:bg-green-700 dark:bg-green-600 dark:text-white dark:hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm w-full justify-center"
                                 >
                                   <CheckCircle2 size={12} className="mr-1" strokeWidth={1.5} />
                                   Phê duyệt lại
                                 </button>
                               </div>
                             )}

                             {membership.status === 'REMOVED' && (
                               <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>-</span>
                             )}

                             {membership.status === 'ACTIVE' && (
                               <div className="flex items-center justify-center">
                                 <button
                                   onClick={() => openDetailsModal(membership)}
                                   className="inline-flex items-center px-2 py-1 text-[10px] font-medium rounded-md transition-colors duration-200 bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm w-full justify-center"
                                 >
                                   <Eye size={12} className="mr-1" strokeWidth={1.5} />
                                   Xem chi tiết
                                 </button>
                               </div>
                             )}

                             {membership.status === 'INACTIVE' && (
                               <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                 Không hoạt động
                               </span>
                             )}
                           </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination - Bottom */}
                {!loading && !error && pagination && pagination.totalCount > 0 && (
                  <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                    <PaginationBar
                      totalItems={pagination.totalCount}
                      currentPage={currentPage}
                      itemsPerPage={membershipsPerPage}
                      onPageChange={(page) => setCurrentPage(page)}
                      onItemsPerPageChange={(newItemsPerPage) => {
                        setMembershipsPerPage(newItemsPerPage);
                        setCurrentPage(1);
                      }}
                      itemLabel="đơn đăng ký"
                      isDarkMode={isDarkMode}
                      itemsPerPageOptions={[5, 10, 20, 50, 100]}
                    />
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
        {detailsModalContent && createPortal(
          detailsModalContent, document.body)}
        <Footer isDarkMode={isDarkMode} />
      </div>
    </ProtectedRoute>
  );
}
