'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import AdminNav from '@/components/admin/AdminNav';
import Footer from '@/components/common/Footer';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import UserDetailModal from './components/UserDetailModal';
import UserEditModal from './components/UserEditModal';
import UserDeleteModal from './components/UserDeleteModal';

interface User {
  _id: string;
  studentId: string;
  name: string;
  email: string;
  role: 'STUDENT' | 'OFFICER' | 'ADMIN';
  phone?: string;
  class?: string;
  faculty?: string;
  avatarUrl?: string;
  isClubMember: boolean; // This will be calculated dynamically from memberships
  createdAt: string;
  updatedAt: string;
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export default function UsersPage() {
  const { user } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [showExportToast, setShowExportToast] = useState(false);
  
  // Filter states
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string[]>([]);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [clubMemberFilter, setClubMemberFilter] = useState('ALL');
  const [facultyFilter, setFacultyFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10);

  // Stats states (tổng thể, không bị ảnh hưởng bởi filter)
  const [totalStats, setTotalStats] = useState({
    totalUsers: 0,
    totalClubMembers: 0,
    totalNonClubMembers: 0,
    totalManagementStaff: 0
  });

  // Modal states
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

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

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

             const params = new URLSearchParams({
         page: currentPage.toString(),
         limit: usersPerPage.toString(),
         sortBy,
         sortOrder,
         ...(search && { search }),
         ...(clubMemberFilter !== 'ALL' && { isClubMember: clubMemberFilter }),
         ...(facultyFilter !== 'ALL' && facultyFilter !== 'ADMIN' && { faculty: facultyFilter }),
         ...(facultyFilter === 'ADMIN' && { role: 'ADMIN' })
       });

       // Thêm role filter nếu có chọn vai trò
       if (roleFilter.length > 0) {
         roleFilter.forEach(role => {
           params.append('role', role);
         });
       }

       // Nếu lọc "Thành viên CLB", bao gồm cả Admin và Ban Chấp Hành
       if (clubMemberFilter === 'true') {
         params.delete('isClubMember');
         params.append('clubMembers', 'true'); // Custom parameter để backend xử lý
       }
       
       // Nếu lọc "Không phải CLB", chỉ lấy Sinh viên không thành viên
       if (clubMemberFilter === 'false') {
         params.delete('isClubMember');
         params.append('nonClubMembers', 'true'); // Custom parameter để backend xử lý
       }

      const response = await fetch(`/api/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      
      if (data.success) {
        setUsers(data.data.users);
        setPagination(data.data.pagination);
      } else {
        throw new Error(data.error || 'Failed to fetch users');
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch tổng thống kê (không bị ảnh hưởng bởi filter)
  const fetchTotalStats = async () => {
    try {
      const response = await fetch('/api/users/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setTotalStats(data.data);
        }
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [currentPage, search, roleFilter, clubMemberFilter, facultyFilter, sortBy, sortOrder]);

  // Fetch tổng thống kê khi component mount
  useEffect(() => {
    fetchTotalStats();
  }, []);

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

  const handleSearch = () => {
    setCurrentPage(1);
  };

  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  // Modal handlers
  const openDetailModal = (userId: string) => {
    setSelectedUserId(userId);
    setShowDetailModal(true);
  };

  const openEditModal = (userId: string) => {
    setSelectedUserId(userId);
    setShowEditModal(true);
  };

  const openDeleteModal = (userId: string) => {
    setSelectedUserId(userId);
    setShowDeleteModal(true);
  };

  const closeModals = () => {
    setShowDetailModal(false);
    setShowEditModal(false);
    setShowDeleteModal(false);
    setSelectedUserId(null);
  };

  const handleUserUpdated = () => {
    fetchUsers();
    fetchTotalStats(); // Refresh stats khi user được cập nhật
  };

  const handleUserDeleted = () => {
    fetchUsers();
    fetchTotalStats(); // Refresh stats khi user bị xóa
  };

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      
      // Tạo parameters cho API export (bao gồm cả filter hiện tại)
      const params = new URLSearchParams({
        ...(search && { search }),
        ...(clubMemberFilter !== 'ALL' && { isClubMember: clubMemberFilter }),
        ...(facultyFilter !== 'ALL' && facultyFilter !== 'ADMIN' && { faculty: facultyFilter }),
        ...(facultyFilter === 'ADMIN' && { role: 'ADMIN' })
      });

      // Thêm role filter nếu có chọn vai trò
      if (roleFilter.length > 0) {
        roleFilter.forEach(role => {
          params.append('role', role);
        });
      }

      // Nếu lọc "Thành viên CLB", bao gồm cả Admin và Ban Chấp Hành
      if (clubMemberFilter === 'true') {
        params.delete('isClubMember');
        params.append('clubMembers', 'true');
      }
      
      // Nếu lọc "Không phải CLB", chỉ lấy Sinh viên không thành viên
      if (clubMemberFilter === 'false') {
        params.delete('isClubMember');
        params.append('nonClubMembers', 'true');
      }

      const response = await fetch(`/api/users/export?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to export users');
      }

             // Tạo blob từ response
       const blob = await response.blob();
       
       // Tạo URL cho blob
       const url = window.URL.createObjectURL(blob);
       
       // Tạo link để download
       const link = document.createElement('a');
       link.href = url;
       link.download = `users_export_${new Date().toISOString().split('T')[0]}.xlsx`;
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
      console.error('Error exporting users:', err);
      alert('Có lỗi khi xuất file: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'OFFICER': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'STUDENT': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'Admin';
      case 'OFFICER': return 'Ban Chấp Hành';
      case 'STUDENT': return 'Sinh Viên';
      default: return role;
    }
  };

  const getClubMemberBadgeColor = (isClubMember: boolean) => {
    return isClubMember 
      ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  return (
    <ProtectedRoute requiredRole="ADMIN">
      <div className={`min-h-screen flex flex-col transition-colors duration-200 ${isDarkMode ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' : 'bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50'}`}>
        <AdminNav />
        
        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-10">
            <div className="flex items-center space-x-4 mb-4">
              <div className={`p-3 rounded-2xl ${isDarkMode ? 'bg-gray-800/50 backdrop-blur-sm' : 'bg-white/70 backdrop-blur-sm'} shadow-lg`}>
                <svg className={`w-8 h-8 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <div>
                <h1 className={`text-4xl font-bold bg-gradient-to-r ${isDarkMode ? 'from-blue-400 to-purple-400' : 'from-blue-600 to-purple-600'} bg-clip-text text-transparent transition-colors duration-200`}>
                  Quản lý Users
                </h1>
                <p className={`mt-2 text-lg transition-colors duration-200 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Quản lý tất cả users trong hệ thống (bao gồm cả thành viên và không thành viên CLB)
                </p>
              </div>
            </div>
          </div>

                 {/* Stats Cards */}
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
           <div className={`${isDarkMode ? 'bg-gray-800/50 backdrop-blur-sm' : 'bg-white/70 backdrop-blur-sm'} rounded-2xl shadow-xl border ${isDarkMode ? 'border-gray-700/50' : 'border-white/20'} p-6 hover:scale-105 transition-all duration-300`}>
             <div className="flex items-center justify-between">
               <div>
                 <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-1`}>Tổng Users</p>
                 <p className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                   {totalStats.totalUsers}
                 </p>
               </div>
               <div className={`p-3 rounded-xl ${isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'} shadow-lg`}>
                 <svg className={`w-8 h-8 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                 </svg>
               </div>
             </div>
           </div>

           <div className={`${isDarkMode ? 'bg-gray-800/50 backdrop-blur-sm' : 'bg-white/70 backdrop-blur-sm'} rounded-2xl shadow-xl border ${isDarkMode ? 'border-gray-700/50' : 'border-white/20'} p-6 hover:scale-105 transition-all duration-300`}>
             <div className="flex items-center justify-between">
               <div>
                 <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-1`}>Thành viên CLB</p>
                 <p className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                   {totalStats.totalClubMembers}
                 </p>
               </div>
               <div className={`p-3 rounded-xl ${isDarkMode ? 'bg-purple-500/20' : 'bg-purple-100'} shadow-lg`}>
                 <svg className={`w-8 h-8 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                 </svg>
               </div>
             </div>
           </div>

           <div className={`${isDarkMode ? 'bg-gray-800/50 backdrop-blur-sm' : 'bg-white/70 backdrop-blur-sm'} rounded-2xl shadow-xl border ${isDarkMode ? 'border-gray-700/50' : 'border-white/20'} p-6 hover:scale-105 transition-all duration-300`}>
             <div className="flex items-center justify-between">
               <div>
                 <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-1`}>Không phải CLB</p>
                 <p className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                   {totalStats.totalNonClubMembers}
                 </p>
               </div>
               <div className={`p-3 rounded-xl ${isDarkMode ? 'bg-gray-500/20' : 'bg-gray-100'} shadow-lg`}>
                 <svg className={`w-8 h-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                 </svg>
               </div>
             </div>
           </div>

           <div className={`${isDarkMode ? 'bg-gray-800/50 backdrop-blur-sm' : 'bg-white/70 backdrop-blur-sm'} rounded-2xl shadow-xl border ${isDarkMode ? 'border-gray-700/50' : 'border-white/20'} p-6 hover:scale-105 transition-all duration-300`}>
             <div className="flex items-center justify-between">
               <div>
                 <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-1`}>Ban quản lý</p>
                 <p className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                   {totalStats.totalManagementStaff}
                 </p>
               </div>
               <div className={`p-3 rounded-xl ${isDarkMode ? 'bg-green-500/20' : 'bg-green-100'} shadow-lg`}>
                 <svg className={`w-8 h-8 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                 </svg>
               </div>
             </div>
           </div>
        </div>

                                                                       {/* Filters and Search */}
           <div className={`${isDarkMode ? 'bg-gray-800/50 backdrop-blur-sm' : 'bg-white/70 backdrop-blur-sm'} rounded-3xl shadow-2xl mb-8 border ${isDarkMode ? 'border-gray-700/50' : 'border-white/20'}`}>
             <div className="p-8">
               <div className="mb-8">
                 <div className="flex items-center space-x-3 mb-3">
                   <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
                     <svg className={`w-6 h-6 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                     </svg>
                   </div>
                   <h3 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                     🔍 Bộ lọc và Tìm kiếm
                   </h3>
                 </div>
                 <p className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                   Lọc và tìm kiếm users theo các tiêu chí khác nhau
                 </p>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                 {/* Search */}
                 <div className="space-y-2">
                   <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                     <span className="flex items-center">
                       <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                       </svg>
                       Tìm kiếm
                     </span>
                   </label>
                   <div className="relative">
                     <input
                       type="text"
                       value={search}
                       onChange={(e) => setSearch(e.target.value)}
                       placeholder="Tên, MSSV, email..."
                       className={`w-full pl-10 pr-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'}`}
                     />
                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                       <svg className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                       </svg>
                     </div>
                   </div>
                 </div>

                 {/* Role Filter */}
                 <div className="space-y-2">
                   <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                     <span className="flex items-center">
                       <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                       </svg>
                       Vai trò
                     </span>
                   </label>
                   <div className="relative role-dropdown">
                     <button
                       type="button"
                       onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                       className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex justify-between items-center transition-all duration-200 ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white hover:bg-gray-600' : 'border-gray-300 bg-white text-gray-900 hover:bg-gray-50'}`}
                     >
                       <span className="flex items-center">
                         {roleFilter.length === 0 ? (
                           <>
                             <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                             </svg>
                             Tất cả vai trò
                           </>
                         ) : roleFilter.length === 1 ? (
                           <>
                             <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                             </svg>
                             {getRoleDisplayName(roleFilter[0])}
                           </>
                         ) : (
                           <>
                             <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                             </svg>
                             {roleFilter.length} vai trò đã chọn
                           </>
                         )}
                       </span>
                       <svg className={`w-5 h-5 transition-transform duration-200 ${roleDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                       </svg>
                     </button>
                     
                     {roleDropdownOpen && (
                       <div className={`absolute z-10 w-full mt-2 border rounded-lg shadow-xl ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}>
                         <div className="py-2">
                           {['ADMIN', 'OFFICER', 'STUDENT'].map((role) => (
                             <label key={role} className={`flex items-center px-4 py-3 cursor-pointer transition-colors duration-150 ${isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-50'}`}>
                               <input
                                 type="checkbox"
                                 checked={roleFilter.includes(role)}
                                 onChange={(e) => {
                                   if (e.target.checked) {
                                     setRoleFilter(prev => [...prev, role]);
                                   } else {
                                     setRoleFilter(prev => prev.filter(r => r !== role));
                                   }
                                   
                                   // Nếu chọn Admin, tự động set faculty filter
                                   if (role === 'ADMIN' && e.target.checked) {
                                     setFacultyFilter('ADMIN');
                                   } else if (role === 'ADMIN' && !e.target.checked && facultyFilter === 'ADMIN') {
                                     // Nếu bỏ chọn Admin và faculty filter đang là ADMIN, reset về ALL
                                     setFacultyFilter('ALL');
                                   }
                                   
                                   handleFilterChange();
                                 }}
                                 className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
                               />
                               <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                 {role === 'ADMIN' ? 'Admin' : role === 'OFFICER' ? 'Ban Chấp Hành' : 'Sinh Viên'}
                               </span>
                             </label>
                           ))}
                         </div>
                       </div>
                     )}
                   </div>
                 </div>

                 {/* Faculty Filter */}
                 <div className="space-y-2">
                   <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                     <span className="flex items-center">
                       <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                       </svg>
                       Khoa/Viện
                     </span>
                   </label>
                   <select
                     value={facultyFilter}
                     onChange={(e) => {
                       const value = e.target.value;
                       setFacultyFilter(value);
                       
                       // Nếu chọn Admin trong Khoa/Viện, tự động set role filter
                       if (value === 'ADMIN') {
                         setRoleFilter(['ADMIN']);
                       } else if (value !== 'ALL' && roleFilter.includes('ADMIN')) {
                         // Nếu chọn khoa/viện khác và role filter đang có ADMIN, loại bỏ ADMIN
                         setRoleFilter(prev => prev.filter(r => r !== 'ADMIN'));
                       }
                       
                       handleFilterChange();
                     }}
                     className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
                   >
                     <option value="ALL">Tất cả khoa/viện</option>
                     <option value="ADMIN">Admin</option>
                     {facultyOptions.map((faculty) => (
                       <option key={faculty} value={faculty}>
                         {faculty}
                       </option>
                     ))}
                   </select>
                 </div>

                 {/* Club Member Filter */}
                 <div className="space-y-2">
                   <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                     <span className="flex items-center">
                       <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                       </svg>
                       Thành viên CLB
                     </span>
                   </label>
                   <select
                     value={clubMemberFilter}
                     onChange={(e) => {
                       setClubMemberFilter(e.target.value);
                       handleFilterChange();
                     }}
                     className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
                   >
                     <option value="ALL">Tất cả</option>
                     <option value="true">Thành viên CLB</option>
                     <option value="false">Không phải CLB</option>
                   </select>
                 </div>

                 {/* Sort */}
                 <div className="space-y-2">
                   <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
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
                     className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
                   >
                     <option value="name-asc">Tên A-Z</option>
                     <option value="name-desc">Tên Z-A</option>
                     <option value="createdAt-desc">Mới nhất</option>
                     <option value="createdAt-asc">Cũ nhất</option>
                   </select>
                 </div>
               </div>

               {/* Export Button */}
               <div className="mt-8 flex justify-end">
                 <button
                   type="button"
                   onClick={handleExportExcel}
                   disabled={exporting}
                   className="px-8 py-4 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 text-white rounded-2xl hover:from-emerald-600 hover:via-green-600 hover:to-teal-600 focus:outline-none focus:ring-4 focus:ring-green-500/30 focus:ring-offset-2 flex items-center disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-2xl hover:shadow-3xl transform hover:-translate-y-1 hover:scale-105"
                 >
                   {exporting ? (
                     <>
                       <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-4"></div>
                       <span className="text-lg font-semibold">Đang xuất...</span>
                     </>
                   ) : (
                     <>
                       <svg className="w-6 h-6 mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                       </svg>
                       <span className="text-lg font-semibold">Xuất Excel</span>
                     </>
                   )}
                 </button>
               </div>
             </div>
           </div>

                                   {/* Users Table */}
          <div className={`${isDarkMode ? 'bg-gray-800/50 backdrop-blur-sm' : 'bg-white/70 backdrop-blur-sm'} rounded-3xl shadow-2xl overflow-hidden border ${isDarkMode ? 'border-gray-700/50' : 'border-white/20'}`}>
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className={`mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Đang tải...</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center">
                <p className="text-red-600">{error}</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className={`min-w-full divide-y ${isDarkMode ? 'divide-gray-700/50' : 'divide-gray-200/50'}`}>
                                         <thead className={isDarkMode ? 'bg-gray-700/50 backdrop-blur-sm' : 'bg-gray-50/80 backdrop-blur-sm'}>
                                          <tr>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                          User
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                          Vai trò
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                          CLB
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                          Thông tin
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                          Ngày tạo
                        </th>
                        <th className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                          Hành động
                        </th>
                      </tr>
                    </thead>
                    <tbody className={`${isDarkMode ? 'bg-gray-800/30' : 'bg-white/50'} divide-y ${isDarkMode ? 'divide-gray-700/30' : 'divide-gray-200/30'}`}>
                      {users.map((user) => (
                        <tr key={user._id} className={`${isDarkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50/80'} transition-all duration-200`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              {user.avatarUrl ? (
                                <img
                                  className="h-10 w-10 rounded-full"
                                  src={user.avatarUrl}
                                  alt={user.name}
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {user.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                            </div>
                                                         <div className="ml-4">
                                                                <div className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                   {user.name}
                                 </div>
                                 <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                   {user.studentId}
                                 </div>
                                 <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                   {user.email}
                                 </div>
                             </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
                            {getRoleDisplayName(user.role)}
                          </span>
                        </td>
                                                 <td className="px-6 py-4 whitespace-nowrap">
                           {user.role === 'ADMIN' ? (
                             <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                               Admin
                             </span>
                           ) : user.role === 'OFFICER' ? (
                             <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                               Ban Chấp Hành
                             </span>
                           ) : (
                             <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getClubMemberBadgeColor(user.isClubMember)}`}>
                               {user.isClubMember ? 'Thành viên' : 'Không phải'}
                             </span>
                           )}
                         </td>
                                                                                                                            <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                             <div>
                               {user.role === 'ADMIN' ? (
                                 <div>
                                   <div className="text-red-600 font-medium">👑 Quản trị viên hệ thống</div>
                                   {user.phone && <div>📞 {user.phone}</div>}
                                   <div className="text-purple-600 text-xs">Thành viên CLB</div>
                                 </div>
                               ) : user.role === 'OFFICER' ? (
                                 <div>
                                   <div className="text-blue-600 font-medium">🏛️ Ban Chấp Hành CLB</div>
                                   {user.phone && <div>📞 {user.phone}</div>}
                                   {user.class && <div>🏫 {user.class}</div>}
                                   {user.faculty && <div>🎓 {user.faculty}</div>}
                                   <div className="text-purple-600 text-xs">Thành viên CLB</div>
                                 </div>
                               ) : (
                                 <div>
                                   {user.phone && <div>📞 {user.phone}</div>}
                                   {user.class && <div>🏫 {user.class}</div>}
                                   {user.faculty && <div>🎓 {user.faculty}</div>}
                                 </div>
                               )}
                             </div>
                           </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {formatDate(user.createdAt)}
                          </td>
                                                                                                                                                                                                       <td className="px-6 py-4 text-center text-sm font-medium">
                            <div className="flex flex-col space-y-2">
                              <button 
                                onClick={() => openDetailModal(user._id)}
                                className="px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 text-xs font-medium"
                              >
                                Xem
                              </button>
                              <button 
                                onClick={() => openEditModal(user._id)}
                                className="px-3 py-1.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 text-xs font-medium"
                              >
                                Sửa
                              </button>
                              <button 
                                onClick={() => openDeleteModal(user._id)}
                                className="px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 text-xs font-medium"
                              >
                                Xóa
                              </button>
                            </div>
                          </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

                                                           {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                  <div className={`${isDarkMode ? 'bg-gray-700/50 backdrop-blur-sm' : 'bg-gray-50/80 backdrop-blur-sm'} px-6 py-4 flex items-center justify-between border-t ${isDarkMode ? 'border-gray-700/50' : 'border-gray-200/50'} sm:px-8`}>
                    <div className="flex-1 flex justify-between sm:hidden">
                                              <button
                          onClick={() => setCurrentPage(currentPage - 1)}
                          disabled={!pagination.hasPrevPage}
                          className={`relative inline-flex items-center px-6 py-3 border text-sm font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ${isDarkMode ? 'border-gray-600 text-gray-300 bg-gray-700/50 hover:bg-gray-600/50 shadow-lg' : 'border-gray-300 text-gray-700 bg-white/70 hover:bg-gray-50/80 shadow-lg'}`}
                        >
                          Trước
                        </button>
                        <button
                          onClick={() => setCurrentPage(currentPage + 1)}
                          disabled={!pagination.hasNextPage}
                          className={`ml-3 relative inline-flex items-center px-6 py-3 border text-sm font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ${isDarkMode ? 'border-gray-600 text-gray-300 bg-gray-700/50 hover:bg-gray-600/50 shadow-lg' : 'border-gray-300 text-gray-700 bg-white/70 hover:bg-gray-50/80 shadow-lg'}`}
                        >
                          Sau
                        </button>
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                      <div>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Hiển thị{' '}
                          <span className="font-medium">{(currentPage - 1) * usersPerPage + 1}</span>
                          {' '}đến{' '}
                          <span className="font-medium">
                            {Math.min(currentPage * usersPerPage, pagination.totalCount)}
                          </span>
                          {' '}trong tổng số{' '}
                          <span className="font-medium">{pagination.totalCount}</span> users
                        </p>
                      </div>
                      <div>
                                                 <nav className="relative z-0 inline-flex rounded-xl shadow-lg -space-x-px">
                           <button
                             onClick={() => setCurrentPage(currentPage - 1)}
                             disabled={!pagination.hasPrevPage}
                             className={`relative inline-flex items-center px-3 py-2 rounded-l-xl border text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ${isDarkMode ? 'border-gray-600 text-gray-400 bg-gray-700/50 hover:bg-gray-600/50' : 'border-gray-300 text-gray-500 bg-white/70 hover:bg-gray-50/80'}`}
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
                               className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium transition-all duration-200 ${
                                 page === currentPage
                                   ? isDarkMode 
                                     ? 'z-10 bg-blue-600 border-blue-400 text-white shadow-lg'
                                     : 'z-10 bg-blue-500 border-blue-500 text-white shadow-lg'
                                   : isDarkMode
                                     ? 'bg-gray-700/50 border-gray-600 text-gray-300 hover:bg-gray-600/50'
                                     : 'bg-white/70 border-gray-300 text-gray-500 hover:bg-gray-50/80'
                               }`}
                             >
                               {page}
                             </button>
                           ))}
                           
                           <button
                             onClick={() => setCurrentPage(currentPage + 1)}
                             disabled={!pagination.hasNextPage}
                             className={`relative inline-flex items-center px-3 py-2 rounded-r-xl border text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ${isDarkMode ? 'border-gray-600 text-gray-400 bg-gray-700/50 hover:bg-gray-600/50' : 'border-gray-300 text-gray-500 bg-white/70 hover:bg-gray-50/80'}`}
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
      
             <Footer isDarkMode={isDarkMode} />

       {/* Export Toast Notification */}
       {showExportToast && (
         <div className={`fixed bottom-6 right-6 z-50 p-6 rounded-2xl shadow-2xl transition-all duration-500 backdrop-blur-sm ${isDarkMode ? 'bg-green-500/90 text-white border border-green-400/50' : 'bg-green-500/90 text-white border border-green-400/50'}`}>
           <div className="flex items-center">
             <div className="p-2 rounded-xl bg-white/20 mr-4">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
               </svg>
             </div>
             <span className="text-lg font-semibold">File Excel đã được chuẩn bị để download</span>
           </div>
         </div>
       )}

       {/* Modals */}
      <UserDetailModal
        isOpen={showDetailModal}
        onClose={closeModals}
        userId={selectedUserId}
        isDarkMode={isDarkMode}
      />

      <UserEditModal
        isOpen={showEditModal}
        onClose={closeModals}
        userId={selectedUserId}
        isDarkMode={isDarkMode}
        onUserUpdated={handleUserUpdated}
      />

      <UserDeleteModal
        isOpen={showDeleteModal}
        onClose={closeModals}
        userId={selectedUserId}
        isDarkMode={isDarkMode}
        onUserDeleted={handleUserDeleted}
      />
    </div>
    </ProtectedRoute>
  );
}
