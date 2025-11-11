'use client';

import { useState, useEffect } from 'react';

interface ClubMember {
  _id: string;
  userId?: {
    _id: string;
    studentId: string;
    name: string;
    email: string;
    role: 'SUPER_ADMIN' | 'CLUB_LEADER' | 'CLUB_DEPUTY' | 'CLUB_MEMBER' | 'CLUB_STUDENT';
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

interface MemberEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberId: string | null;
  isDarkMode: boolean;
  onMemberUpdated: () => void;
}

export default function MemberEditModal({ isOpen, onClose, memberId, isDarkMode, onMemberUpdated }: MemberEditModalProps) {
  const [member, setMember] = useState<ClubMember | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form data
  const [formData, setFormData] = useState({
    role: 'CLUB_STUDENT' as 'SUPER_ADMIN' | 'CLUB_LEADER' | 'CLUB_DEPUTY' | 'CLUB_MEMBER' | 'CLUB_STUDENT',
    phone: '',
    class: '',
    faculty: ''
  });

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

  useEffect(() => {
    if (isOpen && memberId) {
      fetchMemberDetails();
    }
  }, [isOpen, memberId]);

  const fetchMemberDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/memberships/${memberId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch member details');
      }

      const data = await response.json();
      if (data.success) {
        setMember(data.data);
        setFormData({
          role: data.data.userId?.role || 'CLUB_STUDENT',
          phone: data.data.userId?.phone || '',
          class: data.data.userId?.class || '',
          faculty: data.data.userId?.faculty || ''
        });
      } else {
        throw new Error(data.error || 'Failed to fetch member details');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error fetching member details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Update user information
      const userResponse = await fetch(`/api/users/${member?.userId?._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: member?.userId?.name || '',
          email: member?.userId?.email || '',
          studentId: member?.userId?.studentId || '',
          role: formData.role,
          phone: formData.phone || '',
          class: formData.class || '',
          faculty: formData.faculty || ''
        })
      });

      if (!userResponse.ok) {
        const errorData = await userResponse.json();
        throw new Error(errorData.error || 'Failed to update user');
      }

      setSuccess('Cập nhật thông tin thành viên thành công!');
      onMemberUpdated();
      
      // Close modal after 2 seconds
      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error updating member:', err);
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadgeColor = (role: string | undefined | null) => {
    if (!role || role.trim() === '') {
      return 'bg-gradient-to-r from-gray-500 to-gray-600 text-white';
    }
    
    switch (role) {
      case 'SUPER_ADMIN': return 'bg-gradient-to-r from-purple-500 to-purple-600 text-white';
      case 'CLUB_LEADER': return 'bg-gradient-to-r from-red-500 to-red-600 text-white';
      case 'CLUB_DEPUTY': return 'bg-gradient-to-r from-orange-500 to-orange-600 text-white';
      case 'CLUB_MEMBER': return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white';
      case 'CLUB_STUDENT': return 'bg-gradient-to-r from-green-500 to-green-600 text-white';
      case 'STUDENT': return 'bg-gradient-to-r from-gray-500 to-gray-600 text-white';
      default: return 'bg-gradient-to-r from-gray-500 to-gray-600 text-white';
    }
  };

  const getRoleDisplayName = (role: string | undefined | null) => {
    if (!role || role.trim() === '') {
      return 'Không xác định';
    }
    
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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getInputClassName = (fieldName: string) => {
    const baseClasses = 'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 text-sm';
    const errorClasses = 'border-red-500 focus:ring-red-500/20 focus:border-red-500';
    const normalClasses = isDarkMode 
      ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500/20 focus:border-blue-500' 
      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-blue-500/20 focus:border-blue-500';
    
    return `${baseClasses} ${errorClasses} ${normalClasses}`;
  };



  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        ></div>

        {/* Modal panel */}
        <div className={`inline-block align-bottom rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all duration-300 sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full relative z-[100000] ${isDarkMode ? 'bg-gray-900/95' : 'bg-white/95'} backdrop-blur-md border border-gray-200/20`}>
          {/* Header */}
          <div className={`px-6 py-4 border-b ${isDarkMode ? 'border-gray-700 bg-gradient-to-r from-gray-800 to-gray-900' : 'border-gray-200 bg-gradient-to-r from-gray-50 to-white'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <div>
                  <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Chỉnh sửa thông tin thành viên
                  </h3>
                  <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Cập nhật thông tin cá nhân và vai trò
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className={`p-2 rounded-xl transition-all duration-200 hover:scale-110 ${isDarkMode ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className={`text-lg font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Đang tải thông tin thành viên...</p>
                <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-500'} mt-2`}>Vui lòng chờ trong giây lát</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-red-500/20' : 'bg-red-100'}`}>
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-red-600 text-lg font-medium">{error}</p>
              </div>
            ) : member ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Member Info Display */}
                <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'}`}>
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      {member.userId?.avatarUrl ? (
                        <img
                          className="h-12 w-12 rounded-xl object-cover ring-2 ring-white shadow-md"
                          src={member.userId.avatarUrl}
                          alt={member.userId.name || 'User'}
                        />
                      ) : (
                        <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center ring-2 ring-white shadow-md">
                          <span className="text-white text-lg font-bold">
                            {getInitials(member.userId?.name || 'U')}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {member.userId?.name || 'Không có tên'}
                        </h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(member.userId?.role)}`}>
                          {getRoleDisplayName(member.userId?.role)}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-1 text-xs">
                        <p className={`flex items-center space-x-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span>{member.userId?.studentId || 'Không có MSSV'}</span>
                        </p>
                        <p className={`flex items-center space-x-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span>{member.userId?.email || 'Không có email'}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Success/Error Messages */}
                {success && (
                  <div className={`p-4 rounded-xl border bg-green-50 border-green-200`}>
                    <div className="flex items-center space-x-2">
                      <div className="p-1 rounded-full bg-green-100">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <p className="text-green-800 font-medium text-sm">{success}</p>
                    </div>
                  </div>
                )}

                {error && (
                  <div className={`p-4 rounded-xl border bg-red-50 border-red-200`}>
                    <div className="flex items-center space-x-2">
                      <div className="p-1 rounded-full bg-red-100">
                        <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-red-800 font-medium text-sm">{error}</p>
                    </div>
                  </div>
                )}

                {/* Form Fields */}
                <div className="space-y-4">
                  {/* Role Section */}
                  <div>
                    <div className="flex items-center space-x-2 mb-3">
                      <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-600'}`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                      <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        Vai trò và quyền hạn
                      </h3>
                    </div>
                    <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                      <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Vai trò trong câu lạc bộ
                      </label>
                      <select
                        name="role"
                        value={formData.role}
                        onChange={handleInputChange}
                        className={getInputClassName('role')}
                      >
                        <option value="CLUB_STUDENT">Thành Viên CLB</option>
                        <option value="CLUB_MEMBER">Ủy Viên BCH</option>
                        <option value="CLUB_DEPUTY">Phó Chủ Nhiệm</option>
                        <option value="CLUB_LEADER">Chủ Nhiệm CLB</option>
                        <option value="SUPER_ADMIN">Quản Trị Hệ Thống</option>
                      </select>
                      <div className="mt-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
                        <p className="text-xs text-blue-800">
                          <strong>Lưu ý:</strong> Thay đổi vai trò sẽ ảnh hưởng đến quyền truy cập và chức năng của thành viên trong hệ thống.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div>
                    <div className="flex items-center space-x-2 mb-3">
                      <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </div>
                      <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        Thông tin liên hệ
                      </h3>
                    </div>
                    <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                                              <div className="grid grid-cols-1 gap-4">
                          <div>
                            <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              Số điện thoại
                            </label>
                          <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                            placeholder="0901234567"
                            className={getInputClassName('phone')}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Academic Information */}
                  <div>
                    <div className="flex items-center space-x-2 mb-3">
                      <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600'}`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                        </svg>
                      </div>
                      <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        Thông tin học tập
                      </h3>
                    </div>
                    <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                                  <div>
                            <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              Lớp
                            </label>
                            <input
                              type="text"
                              name="class"
                              value={formData.class}
                              onChange={handleInputChange}
                              placeholder="D2XCNTT0X"
                              className={getInputClassName('class')}
                            />
                          </div>

                          <div>
                            <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              Khoa/Viện
                            </label>
                          <select
                            name="faculty"
                            value={formData.faculty}
                            onChange={handleInputChange}
                            className={getInputClassName('faculty')}
                          >
                            <option value="">Chọn khoa/viện</option>
                            {facultyOptions.map((faculty) => (
                              <option key={faculty} value={faculty}>
                                {faculty}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            ) : (
              <div className="text-center py-12">
                <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
                  <svg className="w-8 h-8 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className={`text-lg font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Không tìm thấy thông tin thành viên</p>
                <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-500'} mt-2`}>Vui lòng thử lại hoặc liên hệ quản trị viên</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={`px-6 py-4 border-t ${isDarkMode ? 'border-gray-700 bg-gradient-to-r from-gray-800 to-gray-900' : 'border-gray-200 bg-gradient-to-r from-gray-50 to-white'}`}>
            <div className="flex justify-end space-x-3">
              <button
                onClick={onClose}
                className={`px-6 py-2 rounded-lg border transition-all duration-200 font-semibold text-base hover:scale-105 ${
                  isDarkMode 
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700 hover:border-gray-500' 
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                }`}
              >
                Hủy
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving || loading}
                className={`px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2 font-semibold text-base shadow-md hover:shadow-lg transform hover:scale-105`}
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Lưu thay đổi</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
