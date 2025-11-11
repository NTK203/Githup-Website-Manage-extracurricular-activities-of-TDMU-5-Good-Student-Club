'use client';

import { useState, useEffect } from 'react';

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
  isClubMember?: boolean;
  membershipStatus?: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'REMOVED' | 'INACTIVE';
}

interface UserEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
  isDarkMode: boolean;
  onUserUpdated: () => void;
}

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

export default function UserEditModal({ isOpen, onClose, userId, isDarkMode, onUserUpdated }: UserEditModalProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    studentId: '',
    phone: '',
    class: '',
    faculty: '',
    role: 'STUDENT' as 'SUPER_ADMIN' | 'ADMIN' | 'CLUB_LEADER' | 'CLUB_DEPUTY' | 'CLUB_MEMBER' | 'CLUB_STUDENT' | 'STUDENT',
    avatarUrl: ''
  });

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserDetails();
    }
  }, [isOpen, userId]);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user details');
      }

      const data = await response.json();
             if (data.success) {
         console.log('User data received:', data.data);
         console.log('isClubMember:', data.data.isClubMember);
         console.log('membershipStatus:', data.data.membershipStatus);
         setUser(data.data);
         setFormData({
           name: data.data.name || '',
           email: data.data.email || '',
           studentId: data.data.studentId || '',
           phone: data.data.phone || '',
           class: data.data.class || '',
           faculty: data.data.faculty || '',
           role: data.data.role || 'STUDENT',
           avatarUrl: data.data.avatarUrl || ''
         });
       } else {
         throw new Error(data.error || 'Failed to fetch user details');
       }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error fetching user details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Đặc biệt xử lý cho trường MSSV và số điện thoại - chỉ cho phép số
    if (name === 'studentId' || name === 'phone') {
      const numericValue = value.replace(/[^0-9]/g, ''); // Loại bỏ tất cả ký tự không phải số
      setFormData(prev => ({
        ...prev,
        [name]: numericValue
      }));
    } else if (name === 'faculty') {
      // Xử lý trường faculty - nếu chọn "Khác" thì giữ nguyên, nếu không thì cập nhật giá trị
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setError(null);

      console.log('Submitting form data:', formData);

      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      console.log('Response status:', response.status);

      // Check if response has content
      const responseText = await response.text();
      console.log('Response text:', responseText);
      
      let data;
      
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        console.error('Failed to parse response:', responseText);
        throw new Error('Invalid response from server');
      }

      console.log('Parsed data:', data);

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      if (data.success) {
        onUserUpdated();
        onClose();
      } else {
        throw new Error(data.error || 'Failed to update user');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error updating user:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (newRole: 'SUPER_ADMIN' | 'ADMIN' | 'CLUB_LEADER' | 'CLUB_DEPUTY' | 'CLUB_MEMBER' | 'CLUB_STUDENT' | 'STUDENT') => {
    try {
      setSaving(true);
      setError(null);

      console.log('Attempting to change role:', { userId, newRole });
      
      const token = localStorage.getItem('token');
      console.log('🔑 Token from localStorage:', token ? `${token.substring(0, 20)}...` : 'No token found');

      const response = await fetch(`/api/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      // Check if response has content
      const responseText = await response.text();
      console.log('Response text:', responseText);
      
      let data;
      
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        console.error('Failed to parse response:', responseText);
        throw new Error('Invalid response from server');
      }

      console.log('Parsed data:', data);

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      if (data.success) {
        setFormData(prev => ({ ...prev, role: newRole }));
        onUserUpdated();
      } else {
        throw new Error(data.error || 'Failed to change user role');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error changing user role:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
      <div className={`relative w-full max-w-2xl shadow-2xl rounded-xl ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'} border`}>
        {/* Header */}
        <div className={`flex justify-between items-center p-6 border-b ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div>
              <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Chỉnh sửa User
              </h3>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Cập nhật thông tin user
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors duration-200 ${isDarkMode ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className={`mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Đang tải...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </div>
          ) : user ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* User Avatar Display */}
              <div className="flex justify-center mb-6">
                <div className="relative">
                  {formData.avatarUrl ? (
                    <img
                      src={formData.avatarUrl}
                      alt="User Avatar"
                      className="w-24 h-24 rounded-full border-4 border-blue-500 object-cover"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center border-4 border-blue-500">
                      <span className="text-white text-2xl font-bold">
                        {formData.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Họ và tên *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>

                                 <div>
                   <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                     MSSV *
                   </label>
                   <input
                     type="text"
                     name="studentId"
                     value={formData.studentId}
                     onChange={handleInputChange}
                     onKeyPress={(e) => {
                       // Chỉ cho phép nhập số
                       if (!/[0-9]/.test(e.key)) {
                         e.preventDefault();
                       }
                     }}
                     onPaste={(e) => {
                       // Ngăn paste nếu có ký tự không phải số
                       const pastedText = e.clipboardData.getData('text');
                       if (!/^[0-9]+$/.test(pastedText)) {
                         e.preventDefault();
                       }
                     }}
                     pattern="[0-9]*"
                     inputMode="numeric"
                     placeholder="Chỉ nhập số"
                     required
                     className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                       isDarkMode 
                         ? 'bg-gray-700 border-gray-600 text-white' 
                         : 'bg-white border-gray-300 text-gray-900'
                     }`}
                   />
                   
                 </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>

                                 <div>
                   <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                     Số điện thoại
                   </label>
                   <input
                     type="tel"
                     name="phone"
                     value={formData.phone}
                     onChange={handleInputChange}
                     onKeyPress={(e) => {
                       // Chỉ cho phép nhập số
                       if (!/[0-9]/.test(e.key)) {
                         e.preventDefault();
                       }
                     }}
                     onPaste={(e) => {
                       // Ngăn paste nếu có ký tự không phải số
                       const pastedText = e.clipboardData.getData('text');
                       if (!/^[0-9]+$/.test(pastedText)) {
                         e.preventDefault();
                       }
                     }}
                     pattern="[0-9]*"
                     inputMode="numeric"
                     placeholder="Chỉ nhập số"
                     className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                       isDarkMode 
                         ? 'bg-gray-700 border-gray-600 text-white' 
                         : 'bg-white border-gray-300 text-gray-900'
                     }`}
                   />
                 </div>

                                 {formData.role !== 'ADMIN' && (
                   <>
                     <div>
                       <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                         Lớp
                       </label>
                       <input
                         type="text"
                         name="class"
                         value={formData.class}
                         onChange={handleInputChange}
                         className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                           isDarkMode 
                             ? 'bg-gray-700 border-gray-600 text-white' 
                             : 'bg-white border-gray-300 text-gray-900'
                         }`}
                       />
                     </div>

                                           <div>
                        <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Khoa/Viện
                        </label>
                        <select
                          name="faculty"
                          value={facultyOptions.includes(formData.faculty) ? formData.faculty : (formData.faculty ? 'OTHER' : '')}
                          onChange={handleInputChange}
                          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            isDarkMode 
                              ? 'bg-gray-700 border-gray-600 text-white' 
                              : 'bg-white border-gray-300 text-gray-900'
                          }`}
                        >
                          <option value="">Chọn khoa/viện</option>
                          {facultyOptions.map((faculty) => (
                            <option key={faculty} value={faculty}>
                              {faculty}
                            </option>
                          ))}
                          <option value="OTHER">Khác</option>
                        </select>
                      </div>
                      
                      {/* Hiển thị input tùy chỉnh khi chọn "Khác" hoặc có giá trị tùy chỉnh */}
                      {(formData.faculty === 'OTHER' || (formData.faculty && !facultyOptions.includes(formData.faculty))) && (
                        <div>
                          <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Nhập tên khoa/viện
                          </label>
                          <input
                            type="text"
                            name="customFaculty"
                            value={facultyOptions.includes(formData.faculty) ? '' : formData.faculty}
                            placeholder="Nhập tên khoa/viện của bạn"
                            onChange={(e) => {
                              setFormData(prev => ({
                                ...prev,
                                faculty: e.target.value
                              }));
                            }}
                            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                              isDarkMode 
                                ? 'bg-gray-700 border-gray-600 text-white' 
                                : 'bg-white border-gray-300 text-gray-900'
                            }`}
                          />
                        </div>
                      )}
                   </>
                 )}

                
              </div>

                             {/* Role Management */}
               <div className={`${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'} rounded-lg p-4 border ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                 <h4 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                   Quản lý vai trò
                 </h4>
                 
                 {/* Thông tin vai trò hiện tại */}
                 <div className={`mb-4 p-3 rounded-lg ${isDarkMode ? 'bg-blue-900/20 border-blue-500/20' : 'bg-blue-50 border-blue-200'} border`}>
                   <p className={`text-sm ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                     <strong>Thông tin vai trò:</strong>
                   </p>
                   <ul className={`text-sm mt-2 space-y-1 ${isDarkMode ? 'text-blue-200' : 'text-blue-600'}`}>
                     <li>• <strong>Admin:</strong> Quản trị viên hệ thống - Thành viên CLB</li>
                     <li>• <strong>Ban Chấp Hành:</strong> Thành viên ban chấp hành CLB - Thành viên CLB</li>
                     <li>• <strong>Sinh Viên:</strong> Có thể là thành viên CLB hoặc chưa tham gia</li>
                   </ul>
                 </div>

                 {/* Hiển thị vai trò hiện tại */}
                 <div className={`mb-4 p-3 rounded-lg ${isDarkMode ? 'bg-gray-600/50 border-gray-500/20' : 'bg-gray-100 border-gray-200'} border`}>
                   <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                           Vai trò hiện tại: <span className="font-semibold">
                        {formData.role === 'SUPER_ADMIN' ? 'Quản Trị Hệ Thống (Thành viên CLB)' :
                         formData.role === 'ADMIN' ? 'Admin (Thành viên CLB)' :
                         formData.role === 'CLUB_LEADER' ? 'Chủ Nhiệm CLB (Thành viên CLB)' :
                         formData.role === 'CLUB_DEPUTY' ? 'Phó Chủ Nhiệm (Thành viên CLB)' :
                         formData.role === 'CLUB_MEMBER' ? 'Ủy Viên BCH (Thành viên CLB)' :
                         formData.role === 'CLUB_STUDENT' ? 'Thành Viên CLB' :
                         user?.isClubMember 
                           ? user?.membershipStatus === 'ACTIVE'
                             ? 'Sinh Viên (Thành viên CLB đã duyệt)'
                             : user?.membershipStatus === 'PENDING'
                             ? 'Sinh Viên (Đã đăng ký CLB - chờ duyệt)'
                             : user?.membershipStatus === 'REJECTED'
                             ? 'Sinh Viên (Đã bị từ chối CLB)'
                             : 'Sinh Viên (Thành viên CLB)'
                           : 'Sinh Viên (Chưa tham gia CLB)'}
                      </span>
                   </p>
                 </div>

                                   {/* Kiểm tra quyền thay đổi vai trò */}
                  {(() => {
                    const canChangeRole = (user?.isClubMember && user?.membershipStatus === 'ACTIVE') || formData.role === 'ADMIN';
                    console.log('Role change check:', {
                      isClubMember: user?.isClubMember,
                      membershipStatus: user?.membershipStatus,
                      currentRole: formData.role,
                      canChangeRole
                    });
                    return canChangeRole;
                  })() ? (
                   <>
                     {/* Nút thay đổi vai trò - chỉ hiển thị cho thành viên CLB */}
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                       {(['STUDENT', 'CLUB_STUDENT', 'CLUB_MEMBER', 'CLUB_DEPUTY', 'CLUB_LEADER', 'ADMIN', 'SUPER_ADMIN'] as const).map((role) => (
                         <button
                           key={role}
                           type="button"
                           onClick={() => handleRoleChange(role)}
                           disabled={saving || formData.role === role}
                           className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
                             formData.role === role
                               ? 'bg-blue-600 text-white'
                               : isDarkMode
                                 ? 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                                 : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                           } disabled:opacity-50 disabled:cursor-not-allowed`}
                         >
                           {role === 'SUPER_ADMIN' ? 'Quản Trị Hệ Thống' : 
                            role === 'ADMIN' ? 'Admin' : 
                            role === 'CLUB_LEADER' ? 'Chủ Nhiệm CLB' : 
                            role === 'CLUB_DEPUTY' ? 'Phó Chủ Nhiệm' : 
                            role === 'CLUB_MEMBER' ? 'Ủy Viên BCH' : 
                            role === 'CLUB_STUDENT' ? 'Thành Viên CLB' : 
                            'Sinh Viên'}
                         </button>
                       ))}
                     </div>
                     <p className={`text-xs mt-2 ${isDarkMode ? 'text-blue-200' : 'text-blue-600'}`}>
                                               ✅ <strong>Có thể thay đổi vai trò:</strong> User này là thành viên CLB đã được duyệt
                     </p>
                   </>
                 ) : (
                   <>
                     {/* Thông báo không thể thay đổi vai trò */}
                     <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-yellow-900/20 border-yellow-500/20' : 'bg-yellow-50 border-yellow-200'} border`}>
                       <div className="flex items-center">
                         <svg className={`w-5 h-5 mr-2 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                         </svg>
                         <p className={`text-sm font-medium ${isDarkMode ? 'text-yellow-300' : 'text-yellow-700'}`}>
                           Không thể thay đổi vai trò
                         </p>
                       </div>
                                               <p className={`text-xs mt-1 ${isDarkMode ? 'text-yellow-200' : 'text-yellow-600'}`}>
                          {!user?.isClubMember 
                            ? 'User này chưa tham gia CLB. Để có thể thay đổi vai trò, user cần đăng ký và được duyệt thành viên CLB trước.'
                            : user?.membershipStatus === 'PENDING'
                            ? 'User này đã đăng ký CLB nhưng chưa được duyệt. Để có thể thay đổi vai trò, cần duyệt hồ sơ thành viên trước.'
                            : user?.membershipStatus === 'REJECTED'
                            ? 'User này đã bị từ chối tham gia CLB. Để có thể thay đổi vai trò, cần phê duyệt lại hồ sơ thành viên.'
                            : 'User này không phải thành viên CLB đã được duyệt. Để có thể thay đổi vai trò, cần duyệt hồ sơ thành viên trước.'
                          }
                        </p>
                       <p className={`text-xs mt-2 ${isDarkMode ? 'text-blue-200' : 'text-blue-600'}`}>
                         💡 <strong>Gợi ý:</strong> Xét duyệt hồ sơ thành viên mới tại mục "Quản lý Đăng ký Thành viên CLB"
                       </p>
                     </div>
                   </>
                 )}
              </div>
            </form>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-600 p-6">
          <button
            onClick={onClose}
            className={`px-6 py-2 rounded-lg font-medium transition-colors duration-200 ${
              isDarkMode 
                ? 'bg-gray-600 text-white hover:bg-gray-500' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </div>
    </div>
  );
}
