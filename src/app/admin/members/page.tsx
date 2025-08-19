'use client';

import { useState, useEffect, useRef } from 'react';
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
    role: 'STUDENT' | 'OFFICER' | 'ADMIN';
    phone?: string;
    class?: string;
    faculty?: string;
    avatarUrl?: string;
  };
  status: 'ACTIVE' | 'PENDING' | 'REJECTED';
  joinedAt: string;
  approvedAt?: string;
  approvedBy?: {
    _id: string;
    name: string;
    studentId: string;
  };
  motivation?: string;
  experience?: string;
  expectations?: string;
  commitment?: string;
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
    rejected: 0
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [showExportToast, setShowExportToast] = useState(false);

  // Modal states
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

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

  // Load theme from localStorage on component mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
    }

    // Listen for theme changes from AdminNav
    const handleThemeChange = () => {
      const currentTheme = localStorage.getItem('theme');
      setIsDarkMode(currentTheme === 'dark');
    };

    window.addEventListener('themeChange', handleThemeChange);
    return () => window.removeEventListener('themeChange', handleThemeChange);
  }, []);

  // Load members data
  useEffect(() => {
    loadMembers();
  }, [searchTerm, roleFilter, selectedRoles, facultyFilter, sortBy, sortOrder, currentPage]);

  const loadMembers = async () => {
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
      params.append('status', 'ACTIVE'); // Only load active members
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
  };

  // Load stats
  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // Fetch all active memberships to calculate stats
      const response = await fetch('/api/memberships?status=ACTIVE&limit=1000', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const allMemberships = data.data.memberships;
          setStats({
            total: allMemberships.length,
            active: allMemberships.length,
            pending: 0, // This page only shows active members
            rejected: 0
          });
        }
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  // Pagination
  const totalPages = Math.ceil(totalMembers / membersPerPage);

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      ADMIN: { color: 'bg-red-100 text-red-800', text: 'ADMIN' },
      OFFICER: { color: 'bg-blue-100 text-blue-800', text: 'Ban Chấp Hành' },
      STUDENT: { color: 'bg-gray-100 text-gray-800', text: 'Thành Viên CLB' }
    };
    const config = roleConfig[role as keyof typeof roleConfig];
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Modal handlers
  const openDetailModal = (memberId: string) => {
    console.log('Opening detail modal for member:', memberId);
    setSelectedMemberId(memberId);
    setShowDetailModal(true);
  };

  const openEditModal = (memberId: string) => {
    console.log('Opening edit modal for member:', memberId);
    setSelectedMemberId(memberId);
    setShowEditModal(true);
  };

  const openDeleteModal = (memberId: string) => {
    console.log('Opening delete modal for member:', memberId);
    setSelectedMemberId(memberId);
    setShowDeleteModal(true);
  };

  const closeModals = () => {
    console.log('Closing all modals');
    setShowDetailModal(false);
    setShowEditModal(false);
    setShowDeleteModal(false);
    setSelectedMemberId(null);
  };

  const handleMemberUpdated = () => {
    loadMembers();
    loadStats();
  };

  const handleMemberDeleted = () => {
    loadMembers();
    loadStats();
  };

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      
      // Tạo parameters cho API export (bao gồm cả filter hiện tại)
      const params = new URLSearchParams({
        ...(searchTerm && { search: searchTerm }),
        ...(facultyFilter !== 'ALL' && { faculty: facultyFilter })
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

  // Debug modal states
  useEffect(() => {
    console.log('Modal states:', {
      showDetailModal,
      showEditModal,
      showDeleteModal,
      selectedMemberId
    });
  }, [showDetailModal, showEditModal, showDeleteModal, selectedMemberId]);

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

  return (
    <ProtectedRoute requiredRole="ADMIN">
      <div className={`min-h-screen flex flex-col transition-colors duration-200 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <AdminNav />
        
        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className={`text-2xl sm:text-3xl font-bold mb-2 transition-colors duration-200 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Thành viên CLB Sinh viên 5 Tốt
                </h1>
                <p className={`text-sm sm:text-base transition-colors duration-200 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Danh sách các thành viên đã được duyệt và tham gia câu lạc bộ
                </p>
              </div>
              <div className="mt-4 sm:mt-0 flex space-x-3">
                <button 
                  onClick={() => router.push('/admin/memberships')}
                  className={`px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200 flex items-center space-x-2`}
                >
                  <span>📝</span>
                  <span>Xét duyệt đơn</span>
                </button>
                <button 
                  onClick={() => router.push('/admin/members/add')}
                  className={`px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-2`}
                >
                  <span>➕</span>
                  <span>Thêm thành viên</span>
                </button>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 mb-6">
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
          </div>

          {/* Filters and Search */}
          <div className={`${isDarkMode ? 'bg-gray-800/50 backdrop-blur-sm' : 'bg-white/70 backdrop-blur-sm'} rounded-3xl shadow-2xl mb-8 border ${isDarkMode ? 'border-gray-700/50' : 'border-white/20'}`} style={{ overflow: 'visible' }}>
            <div className="p-8" style={{ overflow: 'visible' }}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {/* Search */}
                <div className="flex flex-col h-full">
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                      className={`w-full h-12 pl-10 pr-4 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'}`}
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
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                      className={`w-full h-12 px-4 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex justify-between items-center transition-all duration-200 ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white hover:bg-gray-600' : 'border-gray-300 bg-white text-gray-900 hover:bg-gray-50'}`}
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
                            {selectedRoles[0] === 'ADMIN' ? 'Admin' : selectedRoles[0] === 'OFFICER' ? 'Ban Chấp Hành' : 'Thành Viên CLB'}
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
                      <div className={`absolute z-[99999] w-full mt-2 border rounded-lg shadow-xl ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}>
                        <div className="py-1">
                          {['ADMIN', 'OFFICER', 'STUDENT'].map((role) => (
                            <label key={role} className={`flex items-center px-2 py-3 cursor-pointer transition-colors duration-150 ${isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-50'}`}>
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
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2 w-3 h-3"
                              />
                              <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                {role === 'ADMIN' ? 'Admin' : role === 'OFFICER' ? 'Ban Chấp Hành' : 'Thành Viên CLB'}
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
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      Khoa/Viện
                    </span>
                  </label>
                  <select
                    value={facultyFilter}
                    onChange={(e) => setFacultyFilter(e.target.value)}
                    className={`w-full h-12 px-4 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
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
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    className={`w-full h-12 px-4 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
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
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Xuất dữ liệu
                    </span>
                  </label>
                  <button
                    onClick={handleExportExcel}
                    disabled={exporting}
                    className={`w-full h-12 px-4 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white hover:bg-gray-600' : 'border-gray-300 bg-white text-gray-900 hover:bg-gray-50'} disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {exporting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        <span className="text-sm font-medium">Đang xuất...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-sm font-medium">Xuất Excel</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Members Table */}
          <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border shadow-sm overflow-hidden`}>
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className={`mt-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Đang tải dữ liệu...</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className={`${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      <tr>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                          Thành viên
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                          Thông tin liên hệ
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                          Vai trò & Ngày tham gia
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                          Người duyệt
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                          Thao tác
                        </th>
                      </tr>
                    </thead>
                    <tbody className={`${isDarkMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'}`}>
                      {members.map((member: ClubMember) => (
                        <tr key={member._id} className={`${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} transition-colors duration-200`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-12 w-12">
                                {member.userId?.avatarUrl ? (
                                  <Image
                                    src={member.userId.avatarUrl}
                                    alt={member.userId.name || 'User'}
                                    width={48}
                                    height={48}
                                    className="h-12 w-12 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="h-12 w-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                                    <span className="text-white text-sm font-bold">
                                      {getInitials(member.userId?.name || 'U')}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="ml-4">
                                <div className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {member.userId?.name || 'Không có tên'}
                                </div>
                                <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  {member.userId?.studentId || 'Không có MSSV'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                              <div>{member.userId?.email || 'Không có email'}</div>
                              {member.userId?.phone && (
                                <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  📞 {member.userId.phone}
                                </div>
                              )}
                              {member.userId?.class && member.userId?.faculty && (
                                <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  🏫 {member.userId.class} - {member.userId.faculty}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="space-y-2">
                              {getRoleBadge(member.userId?.role || 'STUDENT')}
                              <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                📅 {formatDate(member.joinedAt)}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                              {member.approvedBy ? (
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
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-2">
                              <button 
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log('Detail button clicked for member:', member._id);
                                  openDetailModal(member._id);
                                }}
                                className={`p-2 rounded-lg transition-colors duration-200 ${
                                  isDarkMode 
                                    ? 'text-blue-400 hover:bg-blue-900 hover:text-blue-300' 
                                    : 'text-blue-600 hover:bg-blue-50 hover:text-blue-700'
                                }`} 
                                title="Xem chi tiết"
                              >
                                👁️
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log('Edit button clicked for member:', member._id);
                                  openEditModal(member._id);
                                }}
                                className={`p-2 rounded-lg transition-colors duration-200 ${
                                  isDarkMode 
                                    ? 'text-green-400 hover:bg-green-900 hover:text-green-300' 
                                    : 'text-green-600 hover:bg-green-50 hover:text-green-700'
                                }`} 
                                title="Chỉnh sửa"
                              >
                                ✏️
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log('Delete button clicked for member:', member._id);
                                  openDeleteModal(member._id);
                                }}
                                className={`p-2 rounded-lg transition-colors duration-200 ${
                                  isDarkMode 
                                    ? 'text-red-400 hover:bg-red-900 hover:text-red-300' 
                                    : 'text-red-600 hover:bg-red-50 hover:text-red-700'
                                }`} 
                                title="Xóa khỏi CLB"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Empty State */}
                {members.length === 0 && !loading && (
                  <div className="p-8 text-center">
                    <div className="text-6xl mb-4">👥</div>
                    <h3 className={`text-lg font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                      Chưa có thành viên nào
                    </h3>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Hiện tại chưa có thành viên nào được duyệt tham gia CLB
                    </p>
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className={`px-6 py-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                    <div className="flex items-center justify-between">
                      <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Hiển thị {((currentPage - 1) * membersPerPage) + 1} đến {Math.min(currentPage * membersPerPage, totalMembers)} trong tổng số {totalMembers} thành viên
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className={`px-3 py-1 rounded-lg text-sm transition-colors duration-200 ${
                            currentPage === 1
                              ? `${isDarkMode ? 'text-gray-500 bg-gray-700' : 'text-gray-400 bg-gray-100'} cursor-not-allowed`
                              : `${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`
                          }`}
                        >
                          ← Trước
                        </button>
                        
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`px-3 py-1 rounded-lg text-sm transition-colors duration-200 ${
                              currentPage === page
                                ? 'bg-blue-600 text-white'
                                : `${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                        
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className={`px-3 py-1 rounded-lg text-sm transition-colors duration-200 ${
                            currentPage === totalPages
                              ? `${isDarkMode ? 'text-gray-500 bg-gray-700' : 'text-gray-400 bg-gray-100'} cursor-not-allowed`
                              : `${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`
                          }`}
                        >
                          Sau →
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
        </div>
      </div>
    </ProtectedRoute>
  );
}
