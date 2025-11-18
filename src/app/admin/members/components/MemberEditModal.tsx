'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FileEdit, X, AlertCircle, User, Mail, Phone, Building, Calendar, GraduationCap, Shield, Users, Crown, CheckCircle2, XCircle, Save, Loader } from 'lucide-react';

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

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



  if (!isOpen || !mounted) return null;

  const modalContent = (
    <>
      {/* Background overlay - phủ toàn màn hình bao gồm cả sidebar */}
      <div 
        className="fixed inset-0 bg-black/60 transition-opacity"
        onClick={onClose}
        style={{ 
          left: 0, 
          top: 0, 
          right: 0, 
          bottom: 0,
          zIndex: 99999
        }}
      ></div>

      {/* Modal panel */}
      <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none" style={{ zIndex: 100000 }}>
        <div className={`inline-block rounded-lg text-left overflow-hidden shadow-2xl transform transition-all duration-300 w-full max-w-lg pointer-events-auto ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}
          onClick={(e) => e.stopPropagation()}
          style={{ zIndex: 100000 }}
        >
          {/* Header */}
          <div className={`px-3 py-2 border-b ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileEdit size={16} className={`${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} strokeWidth={1.5} />
                <h3 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Chỉnh sửa thông tin thành viên
                </h3>
              </div>
              <button
                onClick={onClose}
                className={`p-1 rounded-md transition-all duration-200 hover:scale-110 ${isDarkMode ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-3 py-3">
            {loading ? (
              <div className="text-center py-12">
                <Loader size={48} className="animate-spin text-blue-600 mx-auto mb-4" strokeWidth={1.5} />
                <p className={`text-base font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Đang tải thông tin thành viên...</p>
                <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-500'} mt-2`}>Vui lòng chờ trong giây lát</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-red-500/20' : 'bg-red-100'}`}>
                  <AlertCircle size={32} className="text-red-600" strokeWidth={1.5} />
                </div>
                <p className="text-red-600 text-base font-medium">{error}</p>
              </div>
            ) : member ? (
              <form onSubmit={handleSubmit} className="space-y-3">
                {/* Member Info Display */}
                <div className={`p-3 rounded-lg border ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'}`}>
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      {member.userId?.avatarUrl ? (
                        <img
                          className="h-10 w-10 rounded-lg object-cover ring-2 ring-white shadow-md"
                          src={member.userId.avatarUrl}
                          alt={member.userId.name || 'User'}
                        />
                      ) : (
                        <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center ring-2 ring-white shadow-md">
                          <span className="text-white text-sm font-bold">
                            {getInitials(member.userId?.name || 'U')}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {member.userId?.name || 'Không có tên'}
                        </h4>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getRoleBadgeColor(member.userId?.role)}`}>
                          {getRoleDisplayName(member.userId?.role)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-xs">
                        <p className={`flex items-center space-x-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          <User size={10} strokeWidth={1.5} />
                          <span className="truncate">{member.userId?.studentId || 'Không có MSSV'}</span>
                        </p>
                        <p className={`flex items-center space-x-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          <Mail size={10} strokeWidth={1.5} />
                          <span className="truncate">{member.userId?.email || 'Không có email'}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Success/Error Messages */}
                {success && (
                  <div className={`p-2 rounded-lg border bg-green-50 border-green-200`}>
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 size={14} className="text-green-600 flex-shrink-0" strokeWidth={1.5} />
                      <p className="text-green-800 font-medium text-xs">{success}</p>
                    </div>
                  </div>
                )}

                {error && (
                  <div className={`p-2 rounded-lg border bg-red-50 border-red-200`}>
                    <div className="flex items-center space-x-2">
                      <AlertCircle size={14} className="text-red-600 flex-shrink-0" strokeWidth={1.5} />
                      <p className="text-red-800 font-medium text-xs">{error}</p>
                    </div>
                  </div>
                )}

                {/* Form Fields */}
                <div className="space-y-3">
                  {/* Role Section */}
                  <div className={`p-3 rounded-lg border ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center space-x-2 mb-2">
                      <Shield size={14} className={`${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`} strokeWidth={1.5} />
                      <label className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Vai trò trong câu lạc bộ
                      </label>
                    </div>
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
                    <div className="mt-2 p-2 rounded bg-blue-50 border border-blue-200">
                      <p className="text-xs text-blue-800">
                        <strong>Lưu ý:</strong> Thay đổi vai trò sẽ ảnh hưởng đến quyền truy cập và chức năng của thành viên trong hệ thống.
                      </p>
                    </div>
                  </div>

                  {/* Contact & Academic Information - Gộp lại */}
                  <div className={`p-3 rounded-lg border ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center space-x-2 mb-2">
                      <Phone size={14} className={`${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} strokeWidth={1.5} />
                      <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        Thông tin liên hệ & Học tập
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
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
                      <div>
                        <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
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
                      <div className="md:col-span-2">
                        <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
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
              </form>
            ) : (
              <div className="text-center py-12">
                <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
                  <AlertCircle size={32} className="opacity-50" strokeWidth={1.5} />
                </div>
                <p className={`text-base font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Không tìm thấy thông tin thành viên</p>
                <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-500'} mt-2`}>Vui lòng thử lại hoặc liên hệ quản trị viên</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={`px-3 py-2 border-t ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
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
                    <Loader size={16} className="animate-spin" strokeWidth={1.5} />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} strokeWidth={1.5} />
                    <span>Lưu thay đổi</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
}
