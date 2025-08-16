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
  status: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'REMOVED';
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

interface Permission {
  name: string;
  description: string;
  roles: string[];
}

export default function MemberPermissionsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [removingMember, setRemovingMember] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPermissions, setShowPermissions] = useState(false);
  const [roleFilter, setRoleFilter] = useState('ALL');
  
  // Remove member modal states
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [selectedMemberForRemoval, setSelectedMemberForRemoval] = useState<ClubMember | null>(null);
  const [removalReason, setRemovalReason] = useState('');

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
  }, [roleFilter]);

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

      // Load admin users from users table (only if roleFilter is ALL or ADMIN)
      let adminUsers: any[] = [];
      if (roleFilter === 'ALL' || roleFilter === 'ADMIN') {
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
                  role: newRole as 'STUDENT' | 'OFFICER' | 'ADMIN' 
                }
              }
            : member
        ));
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
        method: 'PATCH',
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

  const getRoleStats = () => {
    const total = members.length;
    const admins = members.filter(m => m.userId?.role === 'ADMIN').length;
    const officers = members.filter(m => m.userId?.role === 'OFFICER').length;
    const students = members.filter(m => m.userId?.role === 'STUDENT').length;

    return { total, admins, officers, students };
  };

  const permissions: Permission[] = [
    {
      name: 'Quản lý thành viên',
      description: 'Thêm, sửa, xóa thành viên trong câu lạc bộ',
      roles: ['ADMIN']
    },
    {
      name: 'Quản lý hoạt động',
      description: 'Tạo, chỉnh sửa, xóa các hoạt động của câu lạc bộ',
      roles: ['ADMIN', 'OFFICER']
    },
    {
      name: 'Xem báo cáo',
      description: 'Xem các báo cáo và thống kê của câu lạc bộ',
      roles: ['ADMIN', 'OFFICER']
    },
    {
      name: 'Quản lý tiêu chí',
      description: 'Thiết lập và quản lý các tiêu chí đánh giá',
      roles: ['ADMIN']
    },
    {
      name: 'Đăng ký hoạt động',
      description: 'Đăng ký tham gia các hoạt động của câu lạc bộ',
      roles: ['STUDENT', 'OFFICER', 'ADMIN']
    },
    {
      name: 'Xem thông tin cá nhân',
      description: 'Xem và cập nhật thông tin cá nhân',
      roles: ['STUDENT', 'OFFICER', 'ADMIN']
    }
  ];

  const stats = getRoleStats();

  return (
    <ProtectedRoute requiredRole="ADMIN">
      <div className={`min-h-screen flex flex-col transition-colors duration-200 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <AdminNav />
        
        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center justify-between">
              <div>
                                 <h1 className={`text-2xl sm:text-3xl font-bold mb-2 transition-colors duration-200 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                   Quản lý phân quyền thành viên
                 </h1>
                 <p className={`text-sm sm:text-base transition-colors duration-200 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                   Quản lý vai trò và quyền hạn của tất cả thành viên trong câu lạc bộ
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
                   <option value="ALL">Tất cả vai trò</option>
                   <option value="STUDENT">Thành Viên CLB</option>
                                                   <option value="OFFICER">Ban Chấp Hành</option>
                   <option value="ADMIN">Quản trị viên</option>
                 </select>
                 <button
                   onClick={() => setShowPermissions(!showPermissions)}
                   className={`px-4 py-2 border rounded-lg transition-colors duration-200 flex items-center space-x-2 ${
                     isDarkMode 
                       ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                       : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                   }`}
                 >
                   <span>🔐</span>
                   <span>{showPermissions ? 'Ẩn' : 'Xem'} quyền hạn</span>
                 </button>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border p-4 shadow-sm`}>
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <span className="text-blue-600 text-xl">👥</span>
                </div>
                <div className="ml-4">
                  <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Tổng thành viên</p>
                  <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stats.total}</p>
                </div>
              </div>
            </div>
            <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border p-4 shadow-sm`}>
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <span className="text-red-600 text-xl">👑</span>
                </div>
                <div className="ml-4">
                  <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Admin</p>
                  <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stats.admins}</p>
                </div>
              </div>
            </div>
            <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border p-4 shadow-sm`}>
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <span className="text-blue-600 text-xl">👨‍💼</span>
                </div>
                                 <div className="ml-4">
                   <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Ban Chấp Hành</p>
                   <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stats.officers}</p>
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
                  <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stats.students}</p>
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
                             role === 'ADMIN' ? 'bg-red-100 text-red-800' :
                             role === 'OFFICER' ? 'bg-blue-100 text-blue-800' :
                             'bg-gray-100 text-gray-800'
                           }`}>
                             {role === 'ADMIN' ? 'ADMIN' :
                              role === 'OFFICER' ? 'Ban Chấp Hành' :
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
                        Thay đổi vai trò
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                        Trạng thái & Hành động
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
                           <div className="flex items-center space-x-2">
                             <select
                               value={member.userId?.role || 'STUDENT'}
                               onChange={(e) => updateMemberRole(member.userId?._id || '', e.target.value)}
                               disabled={updatingRole === member.userId?._id}
                               className={`px-3 py-1 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                                 isDarkMode 
                                   ? 'bg-gray-700 border-gray-600 text-white' 
                                   : 'bg-white border-gray-300 text-gray-900'
                               } ${updatingRole === member.userId?._id ? 'opacity-50 cursor-not-allowed' : ''}`}
                             >
                               <option value="STUDENT">Thành Viên CLB</option>
                               <option value="OFFICER">Ban Chấp Hành</option>
                               <option value="ADMIN">Quản trị viên</option>
                             </select>
                             {updatingRole === member.userId?._id && (
                               <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                             )}
                           </div>
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap">
                           <div className="flex items-center space-x-2">
                             {member.status === 'ACTIVE' && member.userId?.role !== 'ADMIN' && (
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
                             {member.status === 'ACTIVE' && member.userId?.role === 'ADMIN' && (
                               <span className="px-3 py-1 text-sm rounded-lg bg-green-100 text-green-800">
                                 Tài khoản hệ thống
                               </span>
                             )}
                             {member.status !== 'ACTIVE' && (
                               <span className={`px-3 py-1 text-sm rounded-lg ${
                                 member.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                 member.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                 member.status === 'REMOVED' ? 'bg-gray-100 text-gray-800' :
                                 'bg-gray-100 text-gray-800'
                               }`}>
                                 {member.status === 'PENDING' ? 'Chờ duyệt' :
                                  member.status === 'REJECTED' ? 'Đã từ chối' :
                                  member.status === 'REMOVED' ? 'Đã xóa' :
                                  'Không xác định'}
                               </span>
                             )}
                           </div>
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
