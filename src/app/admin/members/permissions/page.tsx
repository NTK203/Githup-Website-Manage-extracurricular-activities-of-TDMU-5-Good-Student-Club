'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import AdminNav from '@/components/admin/AdminNav';
import Footer from '@/components/common/Footer';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import Image from 'next/image';

interface ClubMember {
  _id: string;
  status: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'REMOVED' | 'INACTIVE';
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
    role: 'SUPER_ADMIN' | 'CLUB_LEADER' | 'CLUB_DEPUTY' | 'CLUB_MEMBER' | 'CLUB_STUDENT' | 'ADMIN' | 'OFFICER' | 'STUDENT';
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

interface Permission {
  name: string;
  description: string;
  roles: string[];
}

export default function MemberPermissionsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [removingMember, setRemovingMember] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPermissions, setShowPermissions] = useState(false);
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [showRemovedMembers, setShowRemovedMembers] = useState(false);
  
  // Stats states - separate from filtered data
  const [totalStats, setTotalStats] = useState({
    total: 0,
    admins: 0,
    leaders: 0,
    deputies: 0,
    members: 0,
    students: 0,
    removed: 0
  });
  
  // Remove member modal states
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [selectedMemberForRemoval, setSelectedMemberForRemoval] = useState<ClubMember | null>(null);
  const [removalReason, setRemovalReason] = useState('');

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
  }, [roleFilter, showRemovedMembers]);

  // Load total stats on component mount
  useEffect(() => {
    loadTotalStats();
  }, []);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Build query parameters for memberships
      const params = new URLSearchParams();
      if (roleFilter !== 'ALL') {
        params.append('role', roleFilter);
      }
      
      // Add status filter for removed members
      if (showRemovedMembers) {
        params.append('status', 'REMOVED');
      }

      // Load admin users from users table (only if roleFilter is ALL or ADMIN and not showing removed members)
      let adminUsers: any[] = [];
      if ((roleFilter === 'ALL' || roleFilter === 'SUPER_ADMIN' || roleFilter === 'ADMIN') && !showRemovedMembers) {
        const usersResponse = await fetch(`/api/users/all?${params}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          if (usersData.success) {
            adminUsers = usersData.data.users;
          }
        }
      }

      // Load memberships data (all club members)
      const membershipsResponse = await fetch(`/api/memberships?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!membershipsResponse.ok) {
        const errorData = await membershipsResponse.json();
        throw new Error(errorData.error || 'Failed to load memberships');
      }

      const membershipsData = await membershipsResponse.json();
      
      if (!membershipsData.success) {
        throw new Error(membershipsData.error || 'Failed to load memberships');
      }

      // Combine admin users and memberships data
      const allMembers = [...adminUsers, ...membershipsData.data.memberships];
      
      // Remove duplicates (if a user exists in both tables, prefer the membership data)
      const uniqueMembers = allMembers.filter((member, index, self) => 
        index === self.findIndex(m => m.userId?._id === member.userId?._id)
      );

      setMembers(uniqueMembers);
    } catch (error) {
      console.error('Error loading members:', error);
      setMessage({ type: 'error', text: 'Không thể tải danh sách thành viên' });
    } finally {
      setLoading(false);
    }
  };

  const loadTotalStats = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Load all admin users from users table
      const usersResponse = await fetch('/api/users/all', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      let adminUsers: any[] = [];
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        if (usersData.success) {
          adminUsers = usersData.data.users;
        }
      }

      // Load all memberships data (excluding REMOVED for active members)
      const membershipsResponse = await fetch('/api/memberships?limit=1000', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      let allMemberships: any[] = [];
      if (membershipsResponse.ok) {
        const membershipsData = await membershipsResponse.json();
        if (membershipsData.success) {
          allMemberships = membershipsData.data.memberships;
        }
      }

      // Load REMOVED memberships separately for stats
      const removedMembershipsResponse = await fetch('/api/memberships?limit=1000&status=REMOVED', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      let removedMemberships: any[] = [];
      if (removedMembershipsResponse.ok) {
        const removedData = await removedMembershipsResponse.json();
        if (removedData.success) {
          removedMemberships = removedData.data.memberships;
        }
      }

      // Combine all data for stats calculation
      const allMembers = [...adminUsers, ...allMemberships];
      
      // Remove duplicates (if a user exists in both tables, prefer the membership data)
      const uniqueMembers = allMembers.filter((member, index, self) => 
        index === self.findIndex(m => m.userId?._id === member.userId?._id)
      );

      // Filter out rejected memberships for stats calculation
      const filteredMembers = uniqueMembers.filter(member => {
        // Keep admin users (they don't have status field)
        if (!member.status) {
          return true;
        }
        // Filter out REJECTED status
        return member.status !== 'REJECTED';
      });

      // Calculate stats
      const total = filteredMembers.length;
      const admins = filteredMembers.filter(m => m.userId?.role === 'SUPER_ADMIN' || m.userId?.role === 'ADMIN').length;
      const leaders = filteredMembers.filter(m => m.userId?.role === 'CLUB_LEADER').length;
      const deputies = filteredMembers.filter(m => m.userId?.role === 'CLUB_DEPUTY').length;
      const members = filteredMembers.filter(m => m.userId?.role === 'CLUB_MEMBER').length;
      const students = filteredMembers.filter(m => m.userId?.role === 'CLUB_STUDENT' || m.userId?.role === 'STUDENT').length;
      
      // Count removed members from separate API call
      const removed = removedMemberships.length;
      
      console.log('Removed memberships:', removedMemberships);
      console.log('Removed count:', removed);

      setTotalStats({ total, admins, leaders, deputies, members, students, removed });
    } catch (error) {
      console.error('Error loading total stats:', error);
    }
  };

  const updateMemberRole = async (userId: string, newRole: string) => {
    setUpdatingRole(userId);
    setMessage(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`/api/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: newRole })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage({ type: 'success', text: 'Cập nhật vai trò thành công!' });
        // Update local state
        setMembers(prev => prev.map(member => 
          member.userId?._id === userId 
            ? { 
                ...member, 
                userId: { 
                  ...member.userId!, 
                  role: newRole as 'SUPER_ADMIN' | 'CLUB_LEADER' | 'CLUB_DEPUTY' | 'CLUB_MEMBER' | 'CLUB_STUDENT' | 'ADMIN' | 'OFFICER' | 'STUDENT' 
                }
              }
            : member
        ));
        // Refresh total stats
        await loadTotalStats();
      } else {
        setMessage({ type: 'error', text: data.error || 'Cập nhật vai trò thất bại' });
      }
    } catch (error: any) {
      console.error('Error updating member role:', error);
      setMessage({ type: 'error', text: error.message || 'Có lỗi xảy ra' });
    } finally {
      setUpdatingRole(null);
    }
  };

  const openRemoveModal = (member: ClubMember) => {
    setSelectedMemberForRemoval(member);
    setRemovalReason('');
    setShowRemoveModal(true);
  };

  const handleRemoveMember = async () => {
    if (!selectedMemberForRemoval || !removalReason.trim()) {
      return;
    }

    setRemovingMember(selectedMemberForRemoval._id);
    setMessage(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Check if this is a user from users table (admin) or membership
      const isFromUsersTable = selectedMemberForRemoval.status === 'ACTIVE' && 
                              !selectedMemberForRemoval.approvedAt && 
                              !selectedMemberForRemoval.joinedAt;

      if (isFromUsersTable) {
        // For users from users table, we can't remove them via membership API
        setMessage({ type: 'error', text: 'Không thể xóa tài khoản admin từ giao diện này. Vui lòng sử dụng quản lý tài khoản.' });
        return;
      }

      const requestBody = { 
        removalReason: removalReason.trim(),
        removedBy: user?._id
      };
      
      console.log('Sending remove request with body:', requestBody);
      
      const response = await fetch(`/api/memberships/${selectedMemberForRemoval._id}/remove`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage({ type: 'success', text: 'Đã xóa thành viên khỏi câu lạc bộ thành công!' });
        
        // Update local state - remove the member from the list
        setMembers(prev => prev.filter(member => member._id !== selectedMemberForRemoval._id));
        
        // Refresh total stats
        await loadTotalStats();
        
        // Close modal
        setShowRemoveModal(false);
        setSelectedMemberForRemoval(null);
        setRemovalReason('');
      } else {
        setMessage({ type: 'error', text: data.error || 'Xóa thành viên thất bại' });
      }
    } catch (error: any) {
      console.error('Error removing member:', error);
      setMessage({ type: 'error', text: error.message || 'Có lỗi xảy ra' });
    } finally {
      setRemovingMember(null);
    }
  };

     const getRoleBadge = (role: string) => {
     const roleConfig = {
       // Vai trò mới
       SUPER_ADMIN: { color: 'bg-purple-100 text-purple-800', text: 'Quản Trị Hệ Thống' },
       CLUB_LEADER: { color: 'bg-red-100 text-red-800', text: 'Chủ Nhiệm CLB' },
       CLUB_DEPUTY: { color: 'bg-orange-100 text-orange-800', text: 'Phó Chủ Nhiệm' },
       CLUB_MEMBER: { color: 'bg-blue-100 text-blue-800', text: 'Ủy Viên BCH' },
       CLUB_STUDENT: { color: 'bg-gray-100 text-gray-800', text: 'Thành Viên CLB' },
       // Vai trò cũ (để tương thích ngược)
       ADMIN: { color: 'bg-purple-100 text-purple-800', text: 'Quản Trị Hệ Thống' },
       OFFICER: { color: 'bg-blue-100 text-blue-800', text: 'Ban Chấp Hành' },
       STUDENT: { color: 'bg-gray-100 text-gray-800', text: 'Thành Viên CLB' }
     };
     const config = roleConfig[role as keyof typeof roleConfig];
     
     // Fallback nếu không tìm thấy config
     if (!config) {
       return (
         <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
           {role || 'Không xác định'}
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



  const permissions: Permission[] = [
    {
      name: 'Quản lý thành viên',
      description: 'Thêm, sửa, xóa thành viên trong câu lạc bộ',
      roles: ['SUPER_ADMIN', 'CLUB_LEADER']
    },
    {
      name: 'Quản lý hoạt động',
      description: 'Tạo, chỉnh sửa, xóa các hoạt động của câu lạc bộ',
      roles: ['SUPER_ADMIN', 'CLUB_LEADER', 'CLUB_DEPUTY', 'CLUB_MEMBER']
    },
    {
      name: 'Xem báo cáo',
      description: 'Xem các báo cáo và thống kê của câu lạc bộ',
      roles: ['SUPER_ADMIN', 'CLUB_LEADER', 'CLUB_DEPUTY', 'CLUB_MEMBER']
    },
    {
      name: 'Quản lý tiêu chí',
      description: 'Thiết lập và quản lý các tiêu chí đánh giá',
      roles: ['SUPER_ADMIN', 'CLUB_LEADER']
    },
    {
      name: 'Đăng ký hoạt động',
      description: 'Đăng ký tham gia các hoạt động của câu lạc bộ',
      roles: ['CLUB_STUDENT', 'CLUB_MEMBER', 'CLUB_DEPUTY', 'CLUB_LEADER', 'SUPER_ADMIN']
    },
    {
      name: 'Xem thông tin cá nhân',
      description: 'Xem và cập nhật thông tin cá nhân',
      roles: ['CLUB_STUDENT', 'CLUB_MEMBER', 'CLUB_DEPUTY', 'CLUB_LEADER', 'SUPER_ADMIN']
    }
  ];



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
            <div className="flex items-center justify-between">
              <div>
                                                 <h1 className={`text-2xl sm:text-3xl font-bold mb-2 transition-colors duration-200 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {showRemovedMembers ? 'Thành viên đã bị xóa' : 'Quản lý phân quyền thành viên'}
                </h1>
                <p className={`text-sm sm:text-base transition-colors duration-200 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  {showRemovedMembers 
                    ? 'Danh sách các thành viên đã bị xóa khỏi câu lạc bộ'
                    : 'Quản lý vai trò và quyền hạn của tất cả thành viên trong câu lạc bộ'
                  }
                </p>
              </div>
                             <div className="flex items-center space-x-4">
                 <select
                   value={roleFilter}
                   onChange={(e) => setRoleFilter(e.target.value)}
                   className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                     isDarkMode 
                       ? 'bg-gray-700 border-gray-600 text-white' 
                       : 'bg-white border-gray-300 text-gray-900'
                   }`}
                 >
                   <option value="ALL">Tất Cả Vai Trò</option>
                   <option value="CLUB_STUDENT">Thành Viên CLB</option>
                   <option value="CLUB_MEMBER">Ủy Viên BCH</option>
                   <option value="CLUB_DEPUTY">Phó Chủ Nhiệm</option>
                   <option value="CLUB_LEADER">Chủ Nhiệm CLB</option>
                   <option value="SUPER_ADMIN">Quản Trị Hệ Thống</option>
                 </select>
                                 <button
                  onClick={() => setShowPermissions(!showPermissions)}
                  className={`px-4 py-2 border rounded-lg transition-colors duration-200 flex items-center space-x-2 min-w-[150px] justify-center whitespace-nowrap ${
                    isDarkMode 
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span>🔐</span>
                  <span>{showPermissions ? 'Ẩn' : 'Xem'} quyền hạn</span>
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
                                 <button
                  onClick={() => router.push('/admin/members')}
                  className={`px-4 py-2 border rounded-lg transition-colors duration-200 flex items-center space-x-2 min-w-[120px] justify-center ${
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
            <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border p-4 shadow-sm`}>
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <span className="text-blue-600 text-xl">👥</span>
                </div>
                <div className="ml-4">
                  <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Tổng thành viên</p>
                  <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{totalStats.total}</p>
                </div>
              </div>
            </div>
            <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border p-4 shadow-sm`}>
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <span className="text-purple-600 text-xl">⚡</span>
                </div>
                <div className="ml-4">
                  <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Quản Trị Hệ Thống</p>
                  <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{totalStats.admins}</p>
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
                  <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{totalStats.leaders}</p>
                </div>
              </div>
            </div>
            <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border p-4 shadow-sm`}>
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <span className="text-orange-600 text-xl">👨‍💼</span>
                </div>
                <div className="ml-4">
                  <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Phó Chủ Nhiệm</p>
                  <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{totalStats.deputies}</p>
                </div>
              </div>
            </div>
            <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border p-4 shadow-sm`}>
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <span className="text-blue-600 text-xl">👥</span>
                </div>
                <div className="ml-4">
                  <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Ủy Viên BCH</p>
                  <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{totalStats.members}</p>
                </div>
              </div>
            </div>
            <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border p-4 shadow-sm`}>
              <div className="flex items-center">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <span className="text-gray-600 text-xl">🎓</span>
                </div>
                <div className="ml-4">
                  <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Thành Viên CLB</p>
                  <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{totalStats.students}</p>
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
                  <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{totalStats.removed}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Permissions Overview */}
          {showPermissions && (
            <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border shadow-sm mb-6`}>
              <div className="p-6">
                <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Tổng quan quyền hạn
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {permissions.map((permission, index) => (
                    <div key={index} className={`p-4 rounded-lg border ${
                      isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                    }`}>
                      <h4 className={`font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {permission.name}
                      </h4>
                      <p className={`text-sm mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {permission.description}
                      </p>
                      <div className="flex flex-wrap gap-2">
                                                 {permission.roles.map((role) => (
                           <span key={role} className={`px-2 py-1 text-xs font-medium rounded-full ${
                             role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-800' :
                             role === 'CLUB_LEADER' ? 'bg-red-100 text-red-800' :
                             role === 'CLUB_DEPUTY' ? 'bg-orange-100 text-orange-800' :
                             role === 'CLUB_MEMBER' ? 'bg-blue-100 text-blue-800' :
                             'bg-gray-100 text-gray-800'
                           }`}>
                             {role === 'SUPER_ADMIN' ? 'Quản Trị Hệ Thống' :
                              role === 'CLUB_LEADER' ? 'Chủ Nhiệm CLB' :
                              role === 'CLUB_DEPUTY' ? 'Phó Chủ Nhiệm' :
                              role === 'CLUB_MEMBER' ? 'Ủy Viên BCH' :
                              'Thành Viên CLB'}
                           </span>
                         ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Members Table */}
          <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border shadow-sm overflow-hidden`}>
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className={`mt-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Đang tải dữ liệu...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className={`${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <tr>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                        Thành viên
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                        Thông tin
                      </th>
                                              <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                          Vai trò hiện tại
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                          {showRemovedMembers ? 'Vai trò' : 'Thay đổi vai trò'}
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                          {showRemovedMembers ? 'Thông tin xóa' : 'Trạng thái & Hành động'}
                        </th>
                    </tr>
                  </thead>
                  <tbody className={`${isDarkMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'}`}>
                    {members.map((member) => (
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
                             <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                               {member.userId?.phone || 'Không có số điện thoại'}
                             </div>
                             <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                               {member.userId?.class || 'Chưa cập nhật'} - {member.userId?.faculty || 'Chưa cập nhật'}
                             </div>
                           </div>
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap">
                           {getRoleBadge(member.userId?.role || 'STUDENT')}
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap">
                           {showRemovedMembers ? (
                             // Show role info for removed members (read-only)
                             <div>
                               {getRoleBadge(member.userId?.role || 'STUDENT')}
                             </div>
                           ) : (
                             // Show role selector for active members
                             <div className="flex items-center space-x-2">
                               <select
                                 value={member.userId?.role || 'CLUB_STUDENT'}
                                 onChange={(e) => updateMemberRole(member.userId?._id || '', e.target.value)}
                                 disabled={updatingRole === member.userId?._id}
                                 className={`px-3 py-1 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                                   isDarkMode 
                                     ? 'bg-gray-700 border-gray-600 text-white' 
                                     : 'bg-white border-gray-300 text-gray-900'
                                 } ${updatingRole === member.userId?._id ? 'opacity-50 cursor-not-allowed' : ''}`}
                               >
                                 <option value="CLUB_STUDENT">Thành Viên CLB</option>
                                 <option value="CLUB_MEMBER">Ủy Viên BCH</option>
                                 <option value="CLUB_DEPUTY">Phó Chủ Nhiệm</option>
                                 <option value="CLUB_LEADER">Chủ Nhiệm CLB</option>
                                 <option value="SUPER_ADMIN">Quản Trị Hệ Thống</option>
                               </select>
                               {updatingRole === member.userId?._id && (
                                 <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                               )}
                             </div>
                           )}
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap">
                           {showRemovedMembers ? (
                             // Show removal information for removed members
                             <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                               <div className="mb-2">
                                 <span className={`px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800`}>
                                   Đã xóa
                                 </span>
                               </div>
                               <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                 <div>Xóa lúc: {new Date(member.removedAt || '').toLocaleString('vi-VN')}</div>
                                 <div>Lý do: {member.removalReason || 'Không có'}</div>
                                 {member.removedBy && (
                                   <div>Xóa bởi: {member.removedBy.name || 'Không xác định'}</div>
                                 )}
                               </div>
                             </div>
                           ) : (
                             // Show normal status and actions for active members
                             <div className="flex items-center space-x-2">
                               {member.status === 'ACTIVE' && member.userId?.role !== 'SUPER_ADMIN' && (
                                 <button
                                   onClick={() => openRemoveModal(member)}
                                   disabled={removingMember === member._id}
                                   className={`px-3 py-1 text-sm border rounded-lg transition-colors duration-200 ${
                                     isDarkMode 
                                       ? 'border-red-600 text-red-400 hover:bg-red-900 hover:text-red-300' 
                                       : 'border-red-300 text-red-600 hover:bg-red-50'
                                   }`}
                                   title="Xóa khỏi câu lạc bộ"
                                 >
                                   {removingMember === member._id ? (
                                     <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                                   ) : (
                                     '🗑️ Xóa'
                                   )}
                                 </button>
                               )}
                               {member.status === 'ACTIVE' && member.userId?.role === 'SUPER_ADMIN' && (
                                 <span className="px-3 py-1 text-sm rounded-lg bg-green-100 text-green-800">
                                   Tài khoản hệ thống
                                 </span>
                               )}
                               {member.status !== 'ACTIVE' && (
                                 <span className={`px-3 py-1 text-sm rounded-lg ${
                                                                  member.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                 member.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                 member.status === 'REMOVED' ? 'bg-gray-100 text-gray-800' :
                                 member.status === 'INACTIVE' ? 'bg-gray-100 text-gray-800' :
                                 'bg-gray-100 text-gray-800'
                                 }`}>
                                                                  {member.status === 'PENDING' ? 'Chờ duyệt' :
                                 member.status === 'REJECTED' ? 'Đã từ chối' :
                                 member.status === 'REMOVED' ? 'Đã xóa' :
                                 member.status === 'INACTIVE' ? 'Không hoạt động' :
                                 'Không xác định'}
                                 </span>
                               )}
                             </div>
                           )}
                         </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>

        {/* Remove Member Modal */}
        {showRemoveModal && selectedMemberForRemoval && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className={`relative top-20 mx-auto p-6 border w-full max-w-md shadow-lg rounded-md ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}`}>
              <div className="mt-3">
                <div className="flex items-center mb-4">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900">
                    <span className="text-red-600 dark:text-red-400 text-xl">⚠️</span>
                  </div>
                </div>
                
                <h3 className={`text-lg font-medium text-center mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Xóa thành viên khỏi câu lạc bộ
                </h3>
                
                <div className="mb-4">
                  <p className={`text-sm text-center mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    Bạn sắp xóa <strong>{selectedMemberForRemoval.userId?.name || 'Không có tên'}</strong> khỏi câu lạc bộ.
                    <br />
                    <span className="text-red-600 dark:text-red-400">Hành động này không thể hoàn tác!</span>
                  </p>
                  
                  <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <p className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Thông tin thành viên:
                    </p>
                    <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      <div>• MSSV: {selectedMemberForRemoval.userId?.studentId}</div>
                      <div>• Email: {selectedMemberForRemoval.userId?.email}</div>
                      <div>• Khoa: {selectedMemberForRemoval.userId?.faculty || 'Chưa cập nhật'}</div>
                    </div>
                  </div>
                </div>
                
                <div className="mb-6">
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Lý do xóa *
                  </label>
                  <textarea
                    value={removalReason}
                    onChange={(e) => setRemovalReason(e.target.value)}
                    placeholder="Nhập lý do xóa thành viên khỏi câu lạc bộ..."
                    rows={3}
                    className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                    required
                  />
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowRemoveModal(false);
                      setSelectedMemberForRemoval(null);
                      setRemovalReason('');
                    }}
                    className={`px-4 py-2 border rounded-lg transition-colors duration-200 ${
                      isDarkMode 
                        ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleRemoveMember}
                    disabled={!removalReason.trim() || removingMember === selectedMemberForRemoval._id}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  >
                    {removingMember === selectedMemberForRemoval._id ? 'Đang xử lý...' : 'Xóa khỏi CLB'}
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
