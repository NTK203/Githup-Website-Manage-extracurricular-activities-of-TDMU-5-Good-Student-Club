'use client';

import { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Filter,
  ChevronDown,
  Crown,
  Shield,
  User,
  Mail,
  Phone,
  GraduationCap,
  Building,
  Calendar,
  Loader,
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import StudentNav from '@/components/student/StudentNav';
import Footer from '@/components/common/Footer';
import PaginationBar from '@/components/common/PaginationBar';
import { useAuth } from '@/hooks/useAuth';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useRouter } from 'next/navigation';

interface ClubMember {
  _id: string;
  userId?: {
    _id: string;
    name: string;
    studentId: string;
    email: string;
    phone?: string;
    class?: string;
    faculty?: string;
    avatarUrl?: string;
    role?: string;
  };
  name: string;
  studentId: string;
  email: string;
  phone?: string;
  class?: string;
  faculty?: string;
  avatarUrl?: string;
  role: 'CLUB_LEADER' | 'CLUB_DEPUTY' | 'CLUB_STUDENT' | 'CLUB_MEMBER';
  status: 'ACTIVE' | 'PENDING' | 'REJECTED' | 'INACTIVE' | 'REMOVED';
  joinedAt: string;
  createdAt: string;
}

export default function StudentMemberPage() {
  const { user, token, isAuthenticated } = useAuth();
  const { isDarkMode } = useDarkMode();
  const router = useRouter();

  const [members, setMembers] = useState<ClubMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'CLUB_LEADER' | 'CLUB_DEPUTY' | 'CLUB_STUDENT'>('ALL');
  const [facultyFilter, setFacultyFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'name' | 'joinedAt' | 'role'>('role');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [membersPerPage, setMembersPerPage] = useState(12);
  const [totalMembers, setTotalMembers] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    leaders: 0,
    deputies: 0,
    members: 0
  });

  useEffect(() => {
    // Bỏ qua kiểm tra phân quyền - cho phép tất cả mọi người xem
    loadMembers();
    loadStats();
  }, [searchQuery, roleFilter, facultyFilter, sortBy, sortOrder, currentPage, membersPerPage]);

  const loadStats = async () => {
    try {
      // Bỏ qua kiểm tra token - cho phép tất cả mọi người xem
      const response = await fetch('/api/memberships?status=ACTIVE&limit=1000');

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.memberships) {
          const allMembers = data.data.memberships;
          const getRole = (m: ClubMember) => m.role || m.userId?.role || '';
          setStats({
            total: allMembers.length,
            leaders: allMembers.filter((m: ClubMember) => getRole(m) === 'CLUB_LEADER').length,
            deputies: allMembers.filter((m: ClubMember) => getRole(m) === 'CLUB_DEPUTY').length,
            members: allMembers.filter((m: ClubMember) => {
              const role = getRole(m);
              return role === 'CLUB_STUDENT' || role === 'CLUB_MEMBER';
            }).length,
          });
        }
      }
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const loadMembers = async () => {
    setLoading(true);
    setError(null);
    try {
      // Bỏ qua kiểm tra token - cho phép tất cả mọi người xem
      const params = new URLSearchParams();
      params.append('status', 'ACTIVE');
      if (searchQuery) params.append('search', searchQuery);
      if (roleFilter !== 'ALL') params.append('role', roleFilter);
      if (facultyFilter !== 'ALL') params.append('faculty', facultyFilter);
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);
      params.append('page', currentPage.toString());
      params.append('limit', membersPerPage.toString());

      const response = await fetch(`/api/memberships?${params}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to load members');
      }

      const data = await response.json();
      
      if (data.success) {
        setMembers(data.data.memberships || []);
        setTotalMembers(data.data.pagination?.totalCount || data.data.memberships?.length || 0);
      } else {
        throw new Error(data.error || 'Failed to load members');
      }
    } catch (err) {
      console.error('Error loading members:', err);
      setError(err instanceof Error ? err.message : 'Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showFilters && !target.closest('.filter-dropdown-container')) {
        setShowFilters(false);
      }
    };

    if (showFilters) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showFilters]);

  const getRoleLabel = (role: string): string => {
    const roleMap: Record<string, string> = {
      'CLUB_LEADER': 'Chủ nhiệm CLB',
      'CLUB_DEPUTY': 'Ủy viên ban chấp hành',
      'CLUB_STUDENT': 'Thành viên CLB',
      'CLUB_MEMBER': 'Thành viên CLB'
    };
    return roleMap[role] || role;
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'CLUB_LEADER':
        return Crown;
      case 'CLUB_DEPUTY':
        return Shield;
      case 'CLUB_STUDENT':
        return User;
      case 'CLUB_MEMBER':
        return User;
      default:
        return User;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'CLUB_LEADER':
        return isDarkMode 
          ? 'bg-gradient-to-r from-yellow-600/20 to-amber-600/20 border-yellow-500/50 text-yellow-300' 
          : 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-300 text-yellow-700';
      case 'CLUB_DEPUTY':
        return isDarkMode 
          ? 'bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border-blue-500/50 text-blue-300' 
          : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300 text-blue-700';
      case 'CLUB_STUDENT':
        return isDarkMode 
          ? 'bg-gradient-to-r from-purple-600/20 to-violet-600/20 border-purple-500/50 text-purple-300' 
          : 'bg-gradient-to-r from-purple-50 to-violet-50 border-purple-300 text-purple-700';
      case 'CLUB_MEMBER':
        return isDarkMode 
          ? 'bg-gradient-to-r from-purple-600/20 to-violet-600/20 border-purple-500/50 text-purple-300' 
          : 'bg-gradient-to-r from-purple-50 to-violet-50 border-purple-300 text-purple-700';
      default:
        return isDarkMode 
          ? 'bg-gray-800 border-gray-700 text-gray-300' 
          : 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  const getRoleIconColor = (role: string) => {
    switch (role) {
      case 'CLUB_LEADER':
        return isDarkMode ? 'text-yellow-400' : 'text-yellow-600';
      case 'CLUB_DEPUTY':
        return isDarkMode ? 'text-blue-400' : 'text-blue-600';
      case 'CLUB_STUDENT':
        return isDarkMode ? 'text-purple-400' : 'text-purple-600';
      case 'CLUB_MEMBER':
        return isDarkMode ? 'text-purple-400' : 'text-purple-600';
      default:
        return isDarkMode ? 'text-gray-400' : 'text-gray-600';
    }
  };

  // Get unique faculties from members
  const facultyOptions = Array.from(new Set(members.map(m => m.faculty || m.userId?.faculty).filter(Boolean)));

  if (loading && members.length === 0) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
        <div className={`flex flex-col items-center justify-center ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          <Loader 
            size={64} 
            className={`animate-spin mb-6 ${
              isDarkMode ? 'text-blue-400' : 'text-blue-600'
            }`}
            strokeWidth={2}
          />
          <p className={`text-sm font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
            Đang tải danh sách thành viên...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-200 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {isAuthenticated && <StudentNav key="student-nav" />}
      
      <main className={`flex-1 max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8 w-full ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
        {/* Header Section */}
        <div className={`mb-6 rounded-2xl p-6 ${
          isDarkMode 
            ? 'bg-gray-800 border border-gray-700/50' 
            : 'bg-white border border-gray-200 shadow-md'
        }`}>
          <div className="flex items-center gap-4">
            <div className={`flex-shrink-0 p-4 rounded-2xl ${
              isDarkMode 
                ? 'bg-gray-700/50' 
                : 'bg-gray-100'
            }`}>
              <Users size={32} className={isDarkMode ? 'text-gray-300' : 'text-gray-700'} strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className={`text-3xl sm:text-4xl font-extrabold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Thành viên Câu lạc bộ
              </h1>
              <p className={`text-sm sm:text-base ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Danh sách tất cả thành viên trong CLB Sinh viên 5 Tốt TDMU
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className={`rounded-xl border p-4 ${
            isDarkMode 
              ? 'bg-gradient-to-br from-blue-600/20 via-blue-500/30 to-cyan-500/20 border-blue-500/40' 
              : 'bg-gradient-to-br from-blue-50 via-blue-100/50 to-cyan-50 border-blue-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <Users size={20} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} />
            </div>
            <p className={`text-xs font-semibold mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Tổng thành viên
            </p>
            <p className={`text-2xl font-extrabold ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>
              {stats.total}
            </p>
          </div>

          <div className={`rounded-xl border p-4 ${
            isDarkMode 
              ? 'bg-gradient-to-br from-yellow-600/20 via-yellow-500/30 to-amber-500/20 border-yellow-500/40' 
              : 'bg-gradient-to-br from-yellow-50 via-yellow-100/50 to-amber-50 border-yellow-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <Crown size={20} className={isDarkMode ? 'text-yellow-400' : 'text-yellow-600'} />
            </div>
            <p className={`text-xs font-semibold mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Chủ nhiệm
            </p>
            <p className={`text-2xl font-extrabold ${isDarkMode ? 'text-yellow-300' : 'text-yellow-600'}`}>
              {stats.leaders}
            </p>
          </div>

          <div className={`rounded-xl border p-4 ${
            isDarkMode 
              ? 'bg-gradient-to-br from-blue-600/20 via-blue-500/30 to-indigo-500/20 border-blue-500/40' 
              : 'bg-gradient-to-br from-blue-50 via-blue-100/50 to-indigo-50 border-blue-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <Shield size={20} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} />
            </div>
            <p className={`text-xs font-semibold mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Ủy viên BCH
            </p>
            <p className={`text-2xl font-extrabold ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>
              {stats.deputies}
            </p>
          </div>

          <div className={`rounded-xl border p-4 ${
            isDarkMode 
              ? 'bg-gradient-to-br from-green-600/20 via-green-500/30 to-emerald-500/20 border-green-500/40' 
              : 'bg-gradient-to-br from-green-50 via-green-100/50 to-emerald-50 border-green-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <User size={20} className={isDarkMode ? 'text-green-400' : 'text-green-600'} />
            </div>
            <p className={`text-xs font-semibold mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Thành viên
            </p>
            <p className={`text-2xl font-extrabold ${isDarkMode ? 'text-green-300' : 'text-green-600'}`}>
              {stats.members}
            </p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className={`w-full mb-6 rounded-lg border px-4 py-3 ${
          isDarkMode 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-gray-200 shadow-sm'
        }`}>
          <div className="flex flex-col lg:flex-row gap-3 items-stretch w-full">
            {/* Search Bar */}
            <div className="relative flex-1 min-w-0">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
                <Search 
                  size={16} 
                  className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} 
                  strokeWidth={2} 
                />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Tìm theo tên, MSSV hoặc email..."
                className={`w-full pl-10 pr-9 py-2.5 text-sm font-medium transition-all duration-200 rounded-lg border ${
                  isDarkMode
                    ? 'bg-gray-700/50 text-white placeholder-gray-400 border-gray-600/50 focus:border-blue-500/50 focus:bg-gray-700'
                    : 'bg-white text-gray-900 placeholder-gray-500 border-gray-300/50 focus:border-blue-400/50 focus:bg-white'
                } shadow-sm focus:shadow-md focus:outline-none`}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  type="button"
                  className={`absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center transition-all duration-200 rounded ${
                    isDarkMode 
                      ? 'text-gray-400 hover:bg-gray-600 hover:text-white' 
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                  }`}
                >
                  <X size={14} strokeWidth={2} />
                </button>
              )}
            </div>

            {/* Filter Button */}
            <div className="relative filter-dropdown-container flex-shrink-0">
              <button
                onClick={() => setShowFilters(!showFilters)}
                type="button"
                className={`flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border transition-all whitespace-nowrap ${
                  isDarkMode
                    ? 'bg-gray-700/50 text-white border-gray-600/50 hover:border-blue-500/50 hover:bg-gray-700'
                    : 'bg-white text-gray-900 border-gray-300/50 hover:border-blue-400/50 hover:bg-white'
                } shadow-sm hover:shadow-md focus:outline-none ${
                  (roleFilter !== 'ALL' || facultyFilter !== 'ALL')
                    ? isDarkMode ? 'border-blue-500/50 bg-blue-500/10' : 'border-blue-500 bg-blue-50'
                    : ''
                }`}
              >
                <Filter size={16} strokeWidth={2} />
                <span className="hidden sm:inline">Bộ lọc</span>
                <ChevronDown 
                  size={14} 
                  className={`transition-transform ${showFilters ? 'rotate-180' : ''}`}
                  strokeWidth={2}
                />
              </button>

              {/* Filter Dropdown */}
              {showFilters && (
                <div className={`absolute right-0 top-full mt-2 w-[320px] sm:w-[400px] rounded-xl border-2 shadow-2xl z-20 ${
                  isDarkMode
                    ? 'bg-gray-800 border-gray-700'
                    : 'bg-white border-gray-200'
                }`}>
                  <div className="p-4 space-y-4">
                    {/* Role Filter */}
                    <div>
                      <label className={`block text-xs font-semibold mb-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Vai trò
                      </label>
                      <select
                        value={roleFilter}
                        onChange={(e) => {
                          setRoleFilter(e.target.value as 'ALL' | 'CLUB_LEADER' | 'CLUB_DEPUTY' | 'CLUB_STUDENT');
                          setCurrentPage(1);
                        }}
                        className={`w-full px-3 py-2 text-sm rounded-lg border-2 transition-all ${
                          isDarkMode
                            ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500'
                            : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                        }`}
                      >
                        <option value="ALL">Tất cả</option>
                        <option value="CLUB_LEADER">Chủ nhiệm CLB</option>
                        <option value="CLUB_DEPUTY">Ủy viên ban chấp hành</option>
                        <option value="CLUB_STUDENT">Thành viên CLB</option>
                      </select>
                    </div>

                    {/* Faculty Filter */}
                    {facultyOptions.length > 0 && (
                      <div>
                        <label className={`block text-xs font-semibold mb-2 ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          Khoa/Viện
                        </label>
                        <select
                          value={facultyFilter}
                          onChange={(e) => {
                            setFacultyFilter(e.target.value);
                            setCurrentPage(1);
                          }}
                          className={`w-full px-3 py-2 text-sm rounded-lg border-2 transition-all ${
                            isDarkMode
                              ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500'
                              : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                          }`}
                        >
                          <option value="ALL">Tất cả</option>
                          {facultyOptions.map((faculty) => (
                            <option key={faculty} value={faculty}>
                              {faculty}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Sort Order */}
                    <div>
                      <label className={`block text-xs font-semibold mb-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Sắp xếp
                      </label>
                      <select
                        value={`${sortBy}-${sortOrder}`}
                        onChange={(e) => {
                          const [newSortBy, newSortOrder] = e.target.value.split('-');
                          setSortBy(newSortBy as 'name' | 'joinedAt' | 'role');
                          setSortOrder(newSortOrder as 'asc' | 'desc');
                          setCurrentPage(1);
                        }}
                        className={`w-full px-3 py-2 text-sm rounded-lg border-2 transition-all ${
                          isDarkMode
                            ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500'
                            : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                        }`}
                      >
                        <option value="role-asc">Vai trò (A-Z)</option>
                        <option value="role-desc">Vai trò (Z-A)</option>
                        <option value="name-asc">Tên (A-Z)</option>
                        <option value="name-desc">Tên (Z-A)</option>
                        <option value="joinedAt-desc">Tham gia (Mới nhất)</option>
                        <option value="joinedAt-asc">Tham gia (Cũ nhất)</option>
                      </select>
                    </div>

                    {/* Clear Filters Button */}
                    {(roleFilter !== 'ALL' || facultyFilter !== 'ALL') && (
                      <button
                        onClick={() => {
                          setRoleFilter('ALL');
                          setFacultyFilter('ALL');
                          setCurrentPage(1);
                        }}
                        className={`w-full px-3 py-2 text-sm font-medium rounded-lg border-2 transition-all ${
                          isDarkMode
                            ? 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600'
                            : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Xóa bộ lọc
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className={`mb-4 p-3 rounded-lg border ${
            isDarkMode ? 'bg-red-900/20 border-red-800 text-red-300' : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className={isDarkMode ? 'text-red-400' : 'text-red-600'} strokeWidth={1.5} />
              <p className="text-sm">{error}</p>
              <button
                onClick={() => setError(null)}
                className={`ml-auto ${isDarkMode ? 'hover:bg-red-900/30' : 'hover:bg-red-100'} p-1 rounded`}
              >
                <X size={14} className={isDarkMode ? 'text-red-400' : 'text-red-600'} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        )}

        {/* Members Grid */}
        <div className={`w-full rounded-lg border overflow-hidden ${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          {/* Header */}
          <div className={`px-4 sm:px-6 py-4 sm:py-5 border-b-2 ${
            isDarkMode 
              ? 'bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 border-gray-600' 
              : 'bg-gradient-to-r from-gray-50 via-white to-gray-50 border-gray-300'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                isDarkMode 
                  ? 'bg-blue-500/20 text-blue-400' 
                  : 'bg-blue-100 text-blue-600'
              }`}>
                <Users size={24} strokeWidth={2.5} />
              </div>
              <h2 className={`text-xl sm:text-2xl lg:text-3xl font-extrabold ${
                isDarkMode 
                  ? 'text-white' 
                  : 'text-gray-900'
              }`}>
                Danh sách thành viên
              </h2>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-6">
            {loading && members.length === 0 ? (
              <div className={`w-full min-h-[400px] flex items-center justify-center ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                <div className="flex flex-col items-center">
                  <Loader size={48} className="animate-spin mb-4" />
                  <p>Đang tải danh sách thành viên...</p>
                </div>
              </div>
            ) : members.length === 0 ? (
              <div className={`w-full min-h-[400px] rounded-lg border-2 border-dashed flex flex-col items-center justify-center py-16 ${
                isDarkMode ? 'border-gray-700 bg-gray-800/30' : 'border-gray-300 bg-gray-50'
              }`}>
                <Users size={56} className={`mb-5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} strokeWidth={1.5} />
                <p className={`text-lg sm:text-xl font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Không tìm thấy thành viên nào
                </p>
                <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                  {searchQuery || roleFilter !== 'ALL' || facultyFilter !== 'ALL' 
                    ? 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm' 
                    : 'Chưa có thành viên nào trong CLB'}
                </p>
              </div>
            ) : (
              <>
                {/* Filtered Results Info */}
                {(searchQuery || roleFilter !== 'ALL' || facultyFilter !== 'ALL') && (
                  <div className={`mb-4 px-3 py-2 rounded-lg border ${
                    isDarkMode 
                      ? 'bg-gray-800/50 border-gray-700 text-gray-300' 
                      : 'bg-gray-50 border-gray-200 text-gray-700'
                  }`}>
                    <p className="text-xs sm:text-sm">
                      Tìm thấy <span className="font-semibold">{totalMembers}</span> thành viên
                      {searchQuery && ` cho "${searchQuery}"`}
                    </p>
                  </div>
                )}

                {/* Pagination - Top */}
                {!loading && members.length > 0 && (
                  <div className={`mb-4 pb-3 border-b ${
                    isDarkMode ? 'border-gray-700' : 'border-gray-200'
                  }`}>
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
                      itemsPerPageOptions={[12, 24, 36, 48]}
                    />
                  </div>
                )}

                {/* Members by Hierarchy */}
                {(() => {
                  // Phân chia members theo cấp bậc
                  // Role có thể nằm trong member.role hoặc member.userId?.role
                  const getMemberRole = (member: ClubMember) => {
                    return member.role || member.userId?.role || '';
                  };
                  
                  const leaders = members.filter(m => {
                    const role = getMemberRole(m);
                    return role === 'CLUB_LEADER';
                  });
                  const deputies = members.filter(m => {
                    const role = getMemberRole(m);
                    return role === 'CLUB_DEPUTY';
                  });
                  const students = members.filter(m => {
                    const role = getMemberRole(m);
                    return role === 'CLUB_STUDENT' || role === 'CLUB_MEMBER';
                  });

                  const renderMemberCard = (member: ClubMember) => {
                    const memberName = member.userId?.name || member.name;
                    const memberStudentId = member.userId?.studentId || member.studentId;
                    const memberEmail = member.userId?.email || member.email;
                    const memberPhone = member.userId?.phone || member.phone;
                    const memberClass = member.userId?.class || member.class;
                    const memberFaculty = member.userId?.faculty || member.faculty;
                    const memberAvatar = member.userId?.avatarUrl || member.avatarUrl;
                    const memberRole = getMemberRole(member);
                    const RoleIcon = getRoleIcon(memberRole);
                    const roleIconColor = getRoleIconColor(memberRole);

                    return (
                      <div
                        key={member._id}
                        className={`group rounded-xl border-2 overflow-hidden shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02] ${
                          isDarkMode 
                            ? 'bg-gray-800 border-gray-700 hover:border-gray-600' 
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {/* Role Badge Header */}
                        <div className={`px-4 py-3 border-b-2 ${getRoleColor(member.role)}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <RoleIcon size={16} className={roleIconColor} strokeWidth={2.5} />
                              <span className="text-xs font-bold uppercase tracking-wide">
                                {getRoleLabel(memberRole)}
                              </span>
                            </div>
                            <CheckCircle2 
                              size={14} 
                              className={isDarkMode ? 'text-green-400' : 'text-green-600'} 
                              strokeWidth={2}
                            />
                          </div>
                        </div>

                        {/* Member Info */}
                        <div className="p-4">
                          {/* Avatar and Name */}
                          <div className="flex items-center gap-3 mb-4">
                            {memberAvatar ? (
                              <div className={`w-16 h-16 rounded-full overflow-hidden border-2 flex-shrink-0 ${
                                isDarkMode ? 'border-gray-600' : 'border-gray-300'
                              }`}>
                                <img
                                  src={memberAvatar}
                                  alt={memberName}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className={`w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center border-2 flex-shrink-0 ${
                                isDarkMode ? 'border-gray-600' : 'border-gray-300'
                              }`}>
                                <span className="text-2xl font-bold text-white">
                                  {memberName.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <h3 className={`text-base font-bold mb-1 truncate ${
                                isDarkMode ? 'text-white' : 'text-gray-900'
                              }`}>
                                {memberName}
                              </h3>
                              <p className={`text-xs font-medium ${
                                isDarkMode ? 'text-gray-400' : 'text-gray-600'
                              }`}>
                                {memberStudentId}
                              </p>
                            </div>
                          </div>

                          {/* Member Details */}
                          <div className="space-y-2">
                            {memberEmail && (
                              <div className={`flex items-center gap-2 px-2 py-1.5 rounded-md border ${
                                isDarkMode 
                                  ? 'bg-gray-700/30 border-gray-600 text-gray-300' 
                                  : 'bg-gray-50 border-gray-200 text-gray-700'
                              }`}>
                                <Mail size={12} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                                <span className="text-xs truncate">{memberEmail}</span>
                              </div>
                            )}

                            {memberPhone && (
                              <div className={`flex items-center gap-2 px-2 py-1.5 rounded-md border ${
                                isDarkMode 
                                  ? 'bg-gray-700/30 border-gray-600 text-gray-300' 
                                  : 'bg-gray-50 border-gray-200 text-gray-700'
                              }`}>
                                <Phone size={12} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                                <span className="text-xs">{memberPhone}</span>
                              </div>
                            )}

                            {memberFaculty && (
                              <div className={`flex items-center gap-2 px-2 py-1.5 rounded-md border ${
                                isDarkMode 
                                  ? 'bg-gray-700/30 border-gray-600 text-gray-300' 
                                  : 'bg-gray-50 border-gray-200 text-gray-700'
                              }`}>
                                <Building size={12} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                                <span className="text-xs truncate">{memberFaculty}</span>
                              </div>
                            )}

                            {memberClass && (
                              <div className={`flex items-center gap-2 px-2 py-1.5 rounded-md border ${
                                isDarkMode 
                                  ? 'bg-gray-700/30 border-gray-600 text-gray-300' 
                                  : 'bg-gray-50 border-gray-200 text-gray-700'
                              }`}>
                                <GraduationCap size={12} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                                <span className="text-xs">{memberClass}</span>
                              </div>
                            )}

                            {member.joinedAt && (
                              <div className={`flex items-center gap-2 px-2 py-1.5 rounded-md border ${
                                isDarkMode 
                                  ? 'bg-gray-700/30 border-gray-600 text-gray-300' 
                                  : 'bg-gray-50 border-gray-200 text-gray-700'
                              }`}>
                                <Calendar size={12} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                                <span className="text-xs">
                                  Tham gia: {new Date(member.joinedAt).toLocaleDateString('vi-VN')}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  };

                  // Kiểm tra nếu không có members nào trong tất cả các cấp
                  if (leaders.length === 0 && deputies.length === 0 && students.length === 0) {
                    return (
                      <div className={`w-full min-h-[400px] rounded-lg border-2 border-dashed flex flex-col items-center justify-center py-16 ${
                        isDarkMode ? 'border-gray-700 bg-gray-800/30' : 'border-gray-300 bg-gray-50'
                      }`}>
                        <Users size={56} className={`mb-5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} strokeWidth={1.5} />
                        <p className={`text-lg sm:text-xl font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Không tìm thấy thành viên nào
                        </p>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                          {searchQuery || roleFilter !== 'ALL' || facultyFilter !== 'ALL' 
                            ? 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm' 
                            : 'Chưa có thành viên nào trong CLB'}
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-12 flex flex-col items-center">
                      {/* Chủ nhiệm CLB - Cấp cao nhất - Căn giữa */}
                      {leaders.length > 0 && (
                        <div className="w-full space-y-6">
                          <div className={`flex items-center justify-center gap-3 px-4 py-3 rounded-xl border-2 max-w-md mx-auto ${
                            isDarkMode
                              ? 'bg-gradient-to-r from-yellow-600/20 via-amber-600/20 to-yellow-600/20 border-yellow-500/50'
                              : 'bg-gradient-to-r from-yellow-50 via-amber-50 to-yellow-50 border-yellow-300'
                          }`}>
                            <Crown size={28} className={isDarkMode ? 'text-yellow-400' : 'text-yellow-600'} strokeWidth={2.5} />
                            <div className="text-center">
                              <h3 className={`text-xl font-extrabold ${isDarkMode ? 'text-yellow-300' : 'text-yellow-700'}`}>
                                Chủ Nhiệm CLB
                              </h3>
                              <p className={`text-xs ${isDarkMode ? 'text-yellow-400/80' : 'text-yellow-600/80'}`}>
                                Cấp lãnh đạo cao nhất
                              </p>
                            </div>
                            <div className={`px-3 py-1 rounded-full ${isDarkMode ? 'bg-yellow-500/20' : 'bg-yellow-200'}`}>
                              <span className={`text-sm font-bold ${isDarkMode ? 'text-yellow-300' : 'text-yellow-700'}`}>
                                {leaders.length}
                              </span>
                            </div>
                          </div>
                          {/* Connector line down */}
                          {deputies.length > 0 && (
                            <div className="flex justify-center">
                              <div className={`w-0.5 h-8 ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
                            </div>
                          )}
                          <div className="flex justify-center items-start gap-4 flex-wrap">
                            {leaders.map(member => (
                              <div key={member._id} className="flex-shrink-0">
                                {renderMemberCard(member)}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Ủy viên ban chấp hành - Cấp trung - Căn giữa */}
                      {deputies.length > 0 && (
                        <div className="w-full space-y-6">
                          {/* Connector line up */}
                          {leaders.length > 0 && (
                            <div className="flex justify-center">
                              <div className={`w-0.5 h-8 ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
                            </div>
                          )}
                          <div className={`flex items-center justify-center gap-3 px-4 py-3 rounded-xl border-2 max-w-md mx-auto ${
                            isDarkMode
                              ? 'bg-gradient-to-r from-blue-600/20 via-indigo-600/20 to-blue-600/20 border-blue-500/50'
                              : 'bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border-blue-300'
                          }`}>
                            <Shield size={28} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} strokeWidth={2.5} />
                            <div className="text-center">
                              <h3 className={`text-xl font-extrabold ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                                Ủy Viên Ban Chấp Hành
                              </h3>
                              <p className={`text-xs ${isDarkMode ? 'text-blue-400/80' : 'text-blue-600/80'}`}>
                                Cấp quản lý và điều hành
                              </p>
                            </div>
                            <div className={`px-3 py-1 rounded-full ${isDarkMode ? 'bg-blue-500/20' : 'bg-blue-200'}`}>
                              <span className={`text-sm font-bold ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                                {deputies.length}
                              </span>
                            </div>
                          </div>
                          {/* Connector line down */}
                          {students.length > 0 && (
                            <div className="flex justify-center">
                              <div className={`w-0.5 h-8 ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
                            </div>
                          )}
                          <div className="flex justify-center items-start gap-4 flex-wrap">
                            {deputies.map(member => (
                              <div key={member._id} className="flex-shrink-0">
                                {renderMemberCard(member)}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Thành viên CLB - Cấp cơ sở - Căn giữa */}
                      {students.length > 0 && (
                        <div className="w-full space-y-6">
                          {/* Connector line up */}
                          {deputies.length > 0 && (
                            <div className="flex justify-center">
                              <div className={`w-0.5 h-8 ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
                            </div>
                          )}
                          <div className={`flex items-center justify-center gap-3 px-4 py-3 rounded-xl border-2 max-w-md mx-auto ${
                            isDarkMode
                              ? 'bg-gradient-to-r from-purple-600/20 via-violet-600/20 to-purple-600/20 border-purple-500/50'
                              : 'bg-gradient-to-r from-purple-50 via-violet-50 to-purple-50 border-purple-300'
                          }`}>
                            <User size={28} className={isDarkMode ? 'text-purple-400' : 'text-purple-600'} strokeWidth={2.5} />
                            <div className="text-center">
                              <h3 className={`text-xl font-extrabold ${isDarkMode ? 'text-purple-300' : 'text-purple-700'}`}>
                                Thành Viên CLB
                              </h3>
                              <p className={`text-xs ${isDarkMode ? 'text-purple-400/80' : 'text-purple-600/80'}`}>
                                Cấp thành viên cơ sở
                              </p>
                            </div>
                            <div className={`px-3 py-1 rounded-full ${isDarkMode ? 'bg-purple-500/20' : 'bg-purple-200'}`}>
                              <span className={`text-sm font-bold ${isDarkMode ? 'text-purple-300' : 'text-purple-700'}`}>
                                {students.length}
                              </span>
                            </div>
                          </div>
                          <div className="flex justify-center items-start gap-4 flex-wrap">
                            {students.map(member => (
                              <div key={member._id} className="flex-shrink-0">
                                {renderMemberCard(member)}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Pagination - Bottom */}
                {!loading && members.length > 0 && (
                  <div className={`mt-4 pt-3 border-t ${
                    isDarkMode ? 'border-gray-700' : 'border-gray-200'
                  }`}>
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
                      itemsPerPageOptions={[12, 24, 36, 48]}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {isAuthenticated && <Footer isDarkMode={isDarkMode} />}
    </div>
  );
}

