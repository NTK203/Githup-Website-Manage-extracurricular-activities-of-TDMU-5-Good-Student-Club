'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import AdminNav from '@/components/admin/AdminNav';
import Footer from '@/components/common/Footer';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import UserDetailModal from './components/UserDetailModal';
import UserEditModal from './components/UserEditModal';
import UserDeleteModal from './components/UserDeleteModal';
import PaginationBar from '@/components/common/PaginationBar';
import {
  Users,
  Search,
  Filter,
  Building,
  UserCheck,
  CheckCircle2,
  ChevronDown,
  Plus,
  Download,
  Eye,
  Edit,
  Trash2,
  UserCog,
  GraduationCap,
  ArrowUpDown,
  Crown,
  Phone,
  School,
  Calendar
} from 'lucide-react';

interface User {
  _id: string;
  studentId: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'CLUB_LEADER' | 'CLUB_DEPUTY' | 'CLUB_MEMBER' | 'CLUB_STUDENT' | 'STUDENT';
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
  const router = useRouter();
  const { user } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [showExportToast, setShowExportToast] = useState(false);
  const [showAddUserDropdown, setShowAddUserDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const addUserButtonRef = useRef<HTMLButtonElement>(null);
  const [roleDropdownPosition, setRoleDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const roleButtonRef = useRef<HTMLButtonElement>(null);

  
  // Filter states
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string[]>([]);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [clubMemberFilter, setClubMemberFilter] = useState('ALL');
  const [facultyFilter, setFacultyFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage, setUsersPerPage] = useState(10);

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
  }, [currentPage, search, roleFilter, clubMemberFilter, facultyFilter, sortBy, sortOrder, usersPerPage]);



  // Fetch tổng thống kê khi component mount
  useEffect(() => {
    fetchTotalStats();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.add-user-dropdown')) {
        setShowAddUserDropdown(false);
      }
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
      case 'SUPER_ADMIN': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'ADMIN': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'CLUB_LEADER': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'CLUB_DEPUTY': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'CLUB_MEMBER': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'CLUB_STUDENT': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'STUDENT': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'Quản Trị Hệ Thống';
      case 'ADMIN': return 'Admin';
      case 'CLUB_LEADER': return 'Chủ Nhiệm CLB';
      case 'CLUB_DEPUTY': return 'Phó Chủ Nhiệm';
      case 'CLUB_MEMBER': return 'Ủy Viên BCH';
      case 'CLUB_STUDENT': return 'Thành Viên CLB';
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

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const words = name.trim().split(/\s+/);
    if (words.length === 0) return 'U';
    // Lấy chữ cái đầu của từ cuối cùng
    const lastWord = words[words.length - 1];
    return lastWord.charAt(0).toUpperCase();
  };

  return (
    <ProtectedRoute requiredRole="CLUB_LEADER">
      <div 
        className={`min-h-screen flex flex-col transition-colors duration-200 overflow-x-hidden ${isDarkMode ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' : 'bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50'}`}
        style={{
          '--sidebar-width': isSidebarOpen ? '288px' : '80px'
        } as React.CSSProperties}
      >
        <AdminNav />
        
        <main 
          className="flex-1 transition-all duration-300 px-4 sm:px-6 lg:px-8 py-8 relative overflow-x-hidden min-w-0"
          style={{
            marginLeft: isDesktop ? (isSidebarOpen ? '288px' : '80px') : '0',
            width: isDesktop ? `calc(100% - ${isSidebarOpen ? '288px' : '80px'})` : '100%',
            maxWidth: isDesktop ? `calc(100% - ${isSidebarOpen ? '288px' : '80px'})` : '100%'
          }}
        >
          {/* Header */}
          <div className="mb-4">
            <div className="flex items-center space-x-2">
              <div className={`p-1.5 rounded-md ${isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
                <Users className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} strokeWidth={2} />
              </div>
              <div>
                <h1 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Quản lý Users
                </h1>
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Quản lý tất cả users trong hệ thống
                </p>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
         <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
           <div className={`${isDarkMode ? 'bg-gray-800/50 backdrop-blur-sm' : 'bg-white/70 backdrop-blur-sm'} rounded-lg shadow-sm border ${isDarkMode ? 'border-gray-700/50' : 'border-white/20'} p-3 transition-all duration-200`}>
             <div className="flex items-center justify-between">
               <div className="flex-1 min-w-0">
                 <p className={`text-[10px] font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-0.5 truncate`}>Tổng Users</p>
                 <p className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                   {totalStats.totalUsers}
                 </p>
               </div>
               <div className={`p-1.5 rounded-md ${isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'} flex-shrink-0 ml-2`}>
                 <Users className={`w-4 h-4 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} strokeWidth={2} />
               </div>
             </div>
           </div>

           <div className={`${isDarkMode ? 'bg-gray-800/50 backdrop-blur-sm' : 'bg-white/70 backdrop-blur-sm'} rounded-lg shadow-sm border ${isDarkMode ? 'border-gray-700/50' : 'border-white/20'} p-3 transition-all duration-200`}>
             <div className="flex items-center justify-between">
               <div className="flex-1 min-w-0">
                 <p className={`text-[10px] font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-0.5 truncate`}>Thành viên CLB</p>
                 <p className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                   {totalStats.totalClubMembers}
                 </p>
               </div>
               <div className={`p-1.5 rounded-md ${isDarkMode ? 'bg-purple-500/20' : 'bg-purple-100'} flex-shrink-0 ml-2`}>
                 <UserCheck className={`w-4 h-4 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`} strokeWidth={2} />
               </div>
             </div>
           </div>

           <div className={`${isDarkMode ? 'bg-gray-800/50 backdrop-blur-sm' : 'bg-white/70 backdrop-blur-sm'} rounded-lg shadow-sm border ${isDarkMode ? 'border-gray-700/50' : 'border-white/20'} p-3 transition-all duration-200`}>
             <div className="flex items-center justify-between">
               <div className="flex-1 min-w-0">
                 <p className={`text-[10px] font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-0.5 truncate`}>Không phải CLB</p>
                 <p className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                   {totalStats.totalNonClubMembers}
                 </p>
               </div>
               <div className={`p-1.5 rounded-md ${isDarkMode ? 'bg-gray-500/20' : 'bg-gray-100'} flex-shrink-0 ml-2`}>
                 <Users className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} strokeWidth={2} />
               </div>
             </div>
           </div>

           <div className={`${isDarkMode ? 'bg-gray-800/50 backdrop-blur-sm' : 'bg-white/70 backdrop-blur-sm'} rounded-lg shadow-sm border ${isDarkMode ? 'border-gray-700/50' : 'border-white/20'} p-3 transition-all duration-200`}>
             <div className="flex items-center justify-between">
               <div className="flex-1 min-w-0">
                 <p className={`text-[10px] font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-0.5 truncate`}>Ban quản lý</p>
                 <p className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                   {totalStats.totalManagementStaff}
                 </p>
               </div>
               <div className={`p-1.5 rounded-md ${isDarkMode ? 'bg-green-500/20' : 'bg-green-100'} flex-shrink-0 ml-2`}>
                 <UserCog className={`w-4 h-4 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} strokeWidth={2} />
               </div>
             </div>
           </div>
        </div>

                                                                       {/* Filters and Search */}
           <div className={`${isDarkMode ? 'bg-gray-800/50 backdrop-blur-sm' : 'bg-white/70 backdrop-blur-sm'} rounded-lg shadow-sm mb-3 border ${isDarkMode ? 'border-gray-700/50' : 'border-white/20'}`} style={{ overflow: 'visible' }}>
             <div className="p-3" style={{ overflow: 'visible' }}>
               {/* Compact Header */}
               <div className="mb-3 flex items-center justify-between">
                 <div className="flex items-center space-x-1.5">
                   <div className={`p-1 rounded ${isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
                     <Search className={`w-3.5 h-3.5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} strokeWidth={2} />
                   </div>
                   <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                     Bộ lọc và Tìm kiếm
                   </h3>
                 </div>
                 {/* Action Buttons - Moved to header */}
                 <div className="flex items-center gap-2">
                   <Link
                      href="/admin/members/add?from=users"
                      className="px-2.5 py-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-white rounded text-[11px] font-medium flex items-center transition-all duration-200 hover:opacity-90"
                    >
                     <Plus className="w-3 h-3 mr-1" strokeWidth={2} />
                     <span className="hidden sm:inline">Thêm</span>
                   </Link>
                   <button
                     type="button"
                     onClick={handleExportExcel}
                     disabled={exporting}
                     className="px-2.5 py-1 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 text-white rounded text-[11px] font-medium flex items-center disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:opacity-90"
                   >
                     {exporting ? (
                       <>
                         <div className="animate-spin rounded-full h-2.5 w-2.5 border-b-2 border-white mr-1"></div>
                         <span className="hidden sm:inline">Đang xuất...</span>
                       </>
                     ) : (
                       <>
                         <Download className="w-3 h-3 mr-1" strokeWidth={2} />
                         <span className="hidden sm:inline">Xuất Excel</span>
                       </>
                     )}
                   </button>
                 </div>
               </div>

               {/* Search and Filters Grid - All in one row */}
               <div className="flex flex-wrap items-end gap-2">
                 {/* Search */}
                 <div className="flex-1 min-w-[200px] space-y-1">
                   <label className={`block text-[10px] font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                     Tìm kiếm
                   </label>
                   <div className="relative">
                     <input
                       type="text"
                       value={search}
                       onChange={(e) => setSearch(e.target.value)}
                       placeholder="Tên, MSSV, email..."
                       className={`w-full pl-7 pr-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200 ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'}`}
                     />
                     <div className="absolute inset-y-0 left-0 pl-1.5 flex items-center pointer-events-none">
                       <Search className={`w-3 h-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-400'}`} strokeWidth={2} />
                     </div>
                     {search && (
                       <button
                         onClick={() => setSearch('')}
                         className="absolute inset-y-0 right-0 pr-1.5 flex items-center hover:opacity-70 transition-opacity"
                       >
                         <span className={`text-[10px] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>✕</span>
                       </button>
                     )}
                   </div>
                 </div>

                 {/* Role Filter */}
                 <div className="w-[140px] space-y-1">
                   <label className={`block text-[10px] font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                     Vai trò
                   </label>
                   <div className="relative role-dropdown">
                     <button
                       ref={roleButtonRef}
                       type="button"
                       onClick={() => {
                         console.log('Role button clicked, current state:', roleDropdownOpen);
                         if (roleButtonRef.current) {
                           const rect = roleButtonRef.current.getBoundingClientRect();
                           console.log('Button rect:', rect);
                           setRoleDropdownPosition({
                             top: rect.bottom + 8,
                             left: rect.left,
                             width: rect.width
                           });
                         }
                         setRoleDropdownOpen(!roleDropdownOpen);
                         console.log('New state will be:', !roleDropdownOpen);
                       }}
                       className={`w-full px-2 py-1 text-[11px] border rounded focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 flex justify-between items-center transition-all duration-200 ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white hover:bg-gray-600' : 'border-gray-300 bg-white text-gray-900 hover:bg-gray-50'}`}
                     >
                       <span className="flex items-center truncate">
                         {roleFilter.length === 0 ? (
                           <>
                             <CheckCircle2 className="w-2.5 h-2.5 mr-0.5 text-gray-400 flex-shrink-0" strokeWidth={2} />
                             <span className="text-[11px] truncate">Tất cả</span>
                           </>
                         ) : roleFilter.length === 1 ? (
                           <>
                             <CheckCircle2 className="w-2.5 h-2.5 mr-0.5 text-blue-500 flex-shrink-0" strokeWidth={2} />
                             <span className="text-[11px] truncate">{getRoleDisplayName(roleFilter[0])}</span>
                           </>
                         ) : (
                           <>
                             <CheckCircle2 className="w-2.5 h-2.5 mr-0.5 text-blue-500 flex-shrink-0" strokeWidth={2} />
                             <span className="text-[11px] truncate">{roleFilter.length} vai trò</span>
                           </>
                         )}
                       </span>
                       <ChevronDown className={`w-2.5 h-2.5 transition-transform duration-200 flex-shrink-0 ml-1 ${roleDropdownOpen ? 'rotate-180' : ''}`} strokeWidth={2} />
                     </button>
                     
                     {/* Inline dropdown for testing */}
                     {roleDropdownOpen && (
                       <div className={`absolute z-[99999] w-full mt-2 border rounded-lg shadow-xl ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}>
                         <div className="py-1">
                                                {['SUPER_ADMIN', 'ADMIN', 'CLUB_LEADER', 'CLUB_DEPUTY', 'CLUB_MEMBER', 'CLUB_STUDENT', 'STUDENT'].map((role) => (
                       <label key={role} className={`flex items-center px-2 py-3 cursor-pointer transition-colors duration-150 ${isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-50'}`}>
                         <input
                           type="checkbox"
                           checked={roleFilter.includes(role)}
                           onChange={(e) => {
                             if (e.target.checked) {
                               setRoleFilter(prev => [...prev, role]);
                             } else {
                               setRoleFilter(prev => prev.filter(r => r !== role));
                             }
                             
                             // Nếu chọn Admin hoặc SUPER_ADMIN, tự động set faculty filter
                             if ((role === 'ADMIN' || role === 'SUPER_ADMIN') && e.target.checked) {
                               setFacultyFilter('ADMIN');
                             } else if ((role === 'ADMIN' || role === 'SUPER_ADMIN') && !e.target.checked && facultyFilter === 'ADMIN') {
                               // Nếu bỏ chọn Admin và faculty filter đang là ADMIN, reset về ALL
                               setFacultyFilter('ALL');
                             }
                             
                             handleFilterChange();
                           }}
                           className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2 w-3 h-3"
                         />
                         <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                           {getRoleDisplayName(role)}
                         </span>
                       </label>
                     ))}
                         </div>
                       </div>
                     )}
                   </div>
                 </div>

                 {/* Faculty Filter */}
                 <div className="w-[130px] space-y-1">
                   <label className={`block text-[10px] font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                     Khoa/Viện
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
                     className={`w-full px-2 py-1 text-[11px] border rounded focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200 ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
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
                 <div className="w-[120px] space-y-1">
                   <label className={`block text-[10px] font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                     CLB
                   </label>
                   <select
                     value={clubMemberFilter}
                     onChange={(e) => {
                       setClubMemberFilter(e.target.value);
                       handleFilterChange();
                     }}
                     className={`w-full px-2 py-1 text-[11px] border rounded focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200 ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
                   >
                     <option value="ALL">Tất cả</option>
                     <option value="true">Thành viên CLB</option>
                     <option value="false">Không phải CLB</option>
                   </select>
                 </div>

                 {/* Sort */}
                 <div className="w-[120px] space-y-1">
                   <label className={`block text-[10px] font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                     Sắp xếp
                   </label>
                   <select
                     value={`${sortBy}-${sortOrder}`}
                     onChange={(e) => {
                       const [field, order] = e.target.value.split('-');
                       setSortBy(field);
                       setSortOrder(order as 'asc' | 'desc');
                     }}
                     className={`w-full px-2 py-1 text-[11px] border rounded focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200 ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
                   >
                     <option value="name-asc">Tên A-Z</option>
                     <option value="name-desc">Tên Z-A</option>
                     <option value="createdAt-desc">Mới nhất</option>
                     <option value="createdAt-asc">Cũ nhất</option>
                   </select>
                 </div>
               </div>

             </div>
           </div>

                                   {/* Users Table */}
          <div className={`${isDarkMode ? 'bg-gray-800/50 backdrop-blur-sm' : 'bg-white/70 backdrop-blur-sm'} rounded-lg shadow-sm overflow-hidden border ${isDarkMode ? 'border-gray-700/50' : 'border-white/20'}`}>
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
                {/* Pagination - Top */}
                {!loading && !error && pagination && pagination.totalCount > 0 && (
                  <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700">
                    <PaginationBar
                      totalItems={pagination.totalCount}
                      currentPage={currentPage}
                      itemsPerPage={usersPerPage}
                      onPageChange={(page) => setCurrentPage(page)}
                      onItemsPerPageChange={(newItemsPerPage) => {
                        setUsersPerPage(newItemsPerPage);
                        setCurrentPage(1);
                      }}
                      itemLabel="người dùng"
                      isDarkMode={isDarkMode}
                      itemsPerPageOptions={[5, 10, 20, 50, 100]}
                    />
                  </div>
                )}
                <div className="overflow-x-auto">
                  <table className={`min-w-full border-collapse ${isDarkMode ? 'border-gray-600' : 'border-gray-300'} border-2`}>
                                         <thead className={isDarkMode ? 'bg-blue-600/80 backdrop-blur-sm' : 'bg-blue-600 backdrop-blur-sm'}>
                                          <tr>
                        <th className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wider border-r ${isDarkMode ? 'border-gray-500 text-white' : 'border-gray-300 text-white'}`}>
                          User
                        </th>
                        <th className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wider border-r ${isDarkMode ? 'border-gray-500 text-white' : 'border-gray-300 text-white'}`}>
                          Vai trò
                        </th>
                        <th className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wider border-r ${isDarkMode ? 'border-gray-500 text-white' : 'border-gray-300 text-white'}`}>
                          CLB
                        </th>
                        <th className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wider border-r ${isDarkMode ? 'border-gray-500 text-white' : 'border-gray-300 text-white'}`}>
                          Thông tin
                        </th>
                        <th className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wider border-r ${isDarkMode ? 'border-gray-500 text-white' : 'border-gray-300 text-white'}`}>
                          Ngày tạo
                        </th>
                        <th className={`px-4 py-2 text-right text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-white'}`}>
                          Hành động
                        </th>
                      </tr>
                    </thead>
                    <tbody className={`${isDarkMode ? 'bg-gray-800/30' : 'bg-white/50'}`}>
                      {users.map((user) => (
                        <tr key={user._id} className={`${isDarkMode ? 'hover:bg-gray-700/50 border-b border-gray-600' : 'hover:bg-gray-50/80 border-b border-gray-300'} transition-all duration-200`}>
                        <td className={`px-4 py-3 whitespace-nowrap border-r ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8 relative">
                              {user.avatarUrl ? (
                                <>
                                  <Image
                                    src={user.avatarUrl}
                                    alt={user.name || 'User'}
                                    width={32}
                                    height={32}
                                    className="h-8 w-8 rounded-full object-cover"
                                    unoptimized
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                      const fallback = target.nextElementSibling as HTMLElement;
                                      if (fallback) fallback.style.display = 'flex';
                                    }}
                                  />
                                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center avatar-fallback hidden">
                                    <span className="text-white text-xs font-bold">
                                      {getInitials(user.name)}
                                    </span>
                                  </div>
                                </>
                              ) : (
                                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                  <span className="text-white text-xs font-bold">
                                    {getInitials(user.name)}
                                  </span>
                                </div>
                              )}
                            </div>
                                                         <div className="ml-3">
                                                                <div className={`text-xs font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                   {user.name || 'Không có tên'}
                                 </div>
                                 <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                   {user.studentId || 'Không có MSSV'}
                                 </div>
                                 <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                   {user.email || 'Không có email'}
                                 </div>
                             </div>
                          </div>
                        </td>
                        <td className={`px-4 py-3 whitespace-nowrap border-r ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                          <span className={`inline-flex px-1.5 py-0.5 text-xs font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
                            {getRoleDisplayName(user.role)}
                          </span>
                        </td>
                                                 <td className={`px-4 py-3 whitespace-nowrap border-r ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                           {user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' ? (
                             <span className="inline-flex px-1.5 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                               Admin
                             </span>
                           ) : ['CLUB_LEADER', 'CLUB_DEPUTY', 'CLUB_MEMBER'].includes(user.role) ? (
                             <span className="inline-flex px-1.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                               Ban Chấp Hành
                             </span>
                           ) : (
                             <span className={`inline-flex px-1.5 py-0.5 text-xs font-semibold rounded-full ${getClubMemberBadgeColor(user.isClubMember)}`}>
                               {user.isClubMember ? 'Thành viên' : 'Không phải'}
                             </span>
                           )}
                         </td>
                                                                                                                            <td className={`px-4 py-3 whitespace-nowrap text-xs border-r ${isDarkMode ? 'border-gray-600 text-white' : 'border-gray-300 text-gray-900'}`}>
                             <div className="space-y-1">
                               {user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' ? (
                                 <div className="space-y-1">
                                   <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-medium">
                                     <Crown className="w-3 h-3" strokeWidth={2} />
                                     <span>Quản trị viên hệ thống</span>
                                   </div>
                                   {user.phone && (
                                     <div className="flex items-center gap-1.5">
                                       <Phone className="w-3 h-3" strokeWidth={2} />
                                       <span>{user.phone}</span>
                                     </div>
                                   )}
                                   <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
                                     <UserCheck className="w-3 h-3" strokeWidth={2} />
                                     <span className="text-xs">Thành viên CLB</span>
                                   </div>
                                 </div>
                               ) : ['CLUB_LEADER', 'CLUB_DEPUTY', 'CLUB_MEMBER'].includes(user.role) ? (
                                 <div className="space-y-1">
                                   <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-medium">
                                     <Building className="w-3 h-3" strokeWidth={2} />
                                     <span>Ban Chấp Hành CLB</span>
                                   </div>
                                   {user.phone && (
                                     <div className="flex items-center gap-1.5">
                                       <Phone className="w-3 h-3" strokeWidth={2} />
                                       <span>{user.phone}</span>
                                     </div>
                                   )}
                                   {user.class && (
                                     <div className="flex items-center gap-1.5">
                                       <School className="w-3 h-3" strokeWidth={2} />
                                       <span>{user.class}</span>
                                     </div>
                                   )}
                                   {user.faculty && (
                                     <div className="flex items-center gap-1.5">
                                       <GraduationCap className="w-3 h-3" strokeWidth={2} />
                                       <span>{user.faculty}</span>
                                     </div>
                                   )}
                                   <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
                                     <UserCheck className="w-3 h-3" strokeWidth={2} />
                                     <span className="text-xs">Thành viên CLB</span>
                                   </div>
                                 </div>
                               ) : (
                                 <div className="space-y-1">
                                   {user.phone && (
                                     <div className="flex items-center gap-1.5">
                                       <Phone className="w-3 h-3" strokeWidth={2} />
                                       <span>{user.phone}</span>
                                     </div>
                                   )}
                                   {user.class && (
                                     <div className="flex items-center gap-1.5">
                                       <School className="w-3 h-3" strokeWidth={2} />
                                       <span>{user.class}</span>
                                     </div>
                                   )}
                                   {user.faculty && (
                                     <div className="flex items-center gap-1.5">
                                       <GraduationCap className="w-3 h-3" strokeWidth={2} />
                                       <span>{user.faculty}</span>
                                     </div>
                                   )}
                                 </div>
                               )}
                             </div>
                           </td>
                          <td className={`px-4 py-3 whitespace-nowrap text-xs border-r ${isDarkMode ? 'border-gray-600 text-gray-400' : 'border-gray-300 text-gray-500'}`}>
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3 h-3" strokeWidth={2} />
                              <span>{formatDate(user.createdAt)}</span>
                            </div>
                          </td>
                                                                                                                                                                                                       <td className={`px-4 py-3 text-center text-xs font-medium ${isDarkMode ? '' : ''}`}>
                            <div className="flex flex-col items-center space-y-1.5">
                              <button 
                                onClick={() => openDetailModal(user._id)}
                                className="w-20 px-2.5 py-1 bg-transparent text-blue-600 dark:text-blue-400 rounded-md hover:bg-blue-50 dark:hover:bg-blue-500/20 transition-all duration-200 flex items-center justify-center text-xs font-medium"
                              >
                                <Eye className="w-3 h-3 mr-1" strokeWidth={2} />
                                Chi tiết
                              </button>
                              <button 
                                onClick={() => openEditModal(user._id)}
                                className="w-20 px-2.5 py-1 bg-transparent text-green-600 dark:text-green-400 rounded-md hover:bg-green-50 dark:hover:bg-green-500/20 transition-all duration-200 flex items-center justify-center text-xs font-medium"
                              >
                                <Edit className="w-3 h-3 mr-1" strokeWidth={2} />
                                Sửa
                              </button>
                              <button 
                                onClick={() => openDeleteModal(user._id)}
                                className="w-20 px-2.5 py-1 bg-transparent text-red-600 dark:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-500/20 transition-all duration-200 flex items-center justify-center text-xs font-medium"
                              >
                                <Trash2 className="w-3 h-3 mr-1" strokeWidth={2} />
                                Xóa
                              </button>
                            </div>
                          </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

                {/* Pagination - Bottom */}
                {!loading && !error && pagination && pagination.totalCount > 0 && (
                  <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700">
                    <PaginationBar
                      totalItems={pagination.totalCount}
                      currentPage={currentPage}
                      itemsPerPage={usersPerPage}
                      onPageChange={(page) => setCurrentPage(page)}
                      onItemsPerPageChange={(newItemsPerPage) => {
                        setUsersPerPage(newItemsPerPage);
                        setCurrentPage(1);
                      }}
                      itemLabel="người dùng"
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

      {/* Export Toast Notification */}
       {showExportToast && (
         <div className={`fixed bottom-4 right-4 z-50 p-3 rounded-lg shadow-lg transition-all duration-300 backdrop-blur-sm ${isDarkMode ? 'bg-green-500/90 text-white border border-green-400/50' : 'bg-green-500/90 text-white border border-green-400/50'}`}>
           <div className="flex items-center">
             <div className="p-1 rounded-md bg-white/20 mr-2">
               <CheckCircle2 className="w-4 h-4" strokeWidth={2} />
             </div>
             <span className="text-sm font-medium">File Excel đã sẵn sàng download</span>
           </div>
         </div>
       )}



       {/* Modals */}
      <div className="relative z-50">
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
    </div>
    </ProtectedRoute>
  );
}
