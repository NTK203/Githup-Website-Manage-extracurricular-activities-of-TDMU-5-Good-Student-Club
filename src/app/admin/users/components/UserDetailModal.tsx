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
  createdAt: string;
  updatedAt: string;
  membership?: {
    _id: string;
    status: string;
    joinedAt: string;
    approvedAt?: string;
    approvedBy?: {
      _id: string;
      name: string;
      studentId: string;
    };
  };
  membershipHistory?: Array<{
    _id: string;
    status: string;
    joinedAt: string;
    approvedAt?: string;
    rejectedAt?: string;
    removedAt?: string;
    approvedBy?: {
      _id: string;
      name: string;
      studentId: string;
    };
    rejectedBy?: {
      _id: string;
      name: string;
      studentId: string;
    };
  }>;
}

interface UserDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
  isDarkMode: boolean;
}

export default function UserDetailModal({ isOpen, onClose, userId, isDarkMode }: UserDetailModalProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        setUser(data.data);
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

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'ACTIVE': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'REJECTED': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'REMOVED': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
      <div className={`relative w-full max-w-4xl shadow-2xl rounded-xl ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'} border`}>
        {/* Header */}
        <div className={`flex justify-between items-center p-6 border-b ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Chi tiết User
              </h3>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Thông tin chi tiết về user
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
            <div className="space-y-6">
              {/* User Information */}
              <div className={`${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'} rounded-xl p-6 border ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                <div className="flex items-center space-x-3 mb-4">
                  <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600'}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h4 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Thông tin cá nhân</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0 h-16 w-16">
                      {user.avatarUrl ? (
                        <img
                          className="h-16 w-16 rounded-full"
                          src={user.avatarUrl}
                          alt={user.name}
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                          <span className={`text-lg font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div>
                      <h5 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {user.name}
                      </h5>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {user.studentId}
                      </p>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-1 ${getRoleBadgeColor(user.role)}`}>
                        {user.role === 'SUPER_ADMIN' ? 'Quản Trị Hệ Thống' : user.role === 'ADMIN' ? 'Admin' : user.role === 'CLUB_LEADER' ? 'Chủ Nhiệm CLB' : user.role === 'CLUB_DEPUTY' ? 'Phó Chủ Nhiệm' : user.role === 'CLUB_MEMBER' ? 'Ủy Viên BCH' : user.role === 'CLUB_STUDENT' ? 'Thành Viên CLB' : 'Sinh Viên'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
                      <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Email:</span>
                      <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{user.email}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
                      <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Số điện thoại:</span>
                      <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{user.phone || 'Chưa cập nhật'}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
                      <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Lớp:</span>
                      <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {user.role === 'ADMIN' ? 'Không áp dụng' : (user.class || 'Chưa cập nhật')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Khoa/Viện:</span>
                      <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {user.role === 'ADMIN' ? 'Không áp dụng (Admin)' : (user.faculty || 'Chưa cập nhật')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Membership Information */}
              <div className={`${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'} rounded-xl p-6 border ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                <div className="flex items-center space-x-3 mb-4">
                  <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-600'}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h4 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Thông tin CLB</h4>
                </div>
                
                {user.role === 'ADMIN' ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Vai trò:</span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200`}>
                        Quản trị viên hệ thống
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Quyền hạn:</span>
                      <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Toàn quyền quản lý</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>CLB:</span>
                      <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Không áp dụng</span>
                    </div>
                  </div>
                ) : user.membership ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Trạng thái:</span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(user.membership.status)}`}>
                        {user.membership.status === 'ACTIVE' ? 'Thành viên CLB' : user.membership.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Ngày tham gia:</span>
                      <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{formatDate(user.membership.joinedAt)}</span>
                    </div>
                    {user.membership.approvedAt && (
                      <div className="flex items-center justify-between">
                        <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Ngày duyệt:</span>
                        <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{formatDate(user.membership.approvedAt)}</span>
                      </div>
                    )}
                    {user.membership.approvedBy && (
                      <div className="flex items-center justify-between">
                        <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Người duyệt:</span>
                        <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{user.membership.approvedBy.name}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Chưa tham gia CLB</p>
                )}
              </div>

              {/* Membership History */}
              {user.role !== 'ADMIN' && user.membershipHistory && user.membershipHistory.length > 0 && (
                <div className={`${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'} rounded-xl p-6 border ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                  <div className="flex items-center space-x-3 mb-4">
                    <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-600'}`}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h4 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Lịch sử CLB</h4>
                  </div>
                  
                  <div className="space-y-3">
                    {user.membershipHistory.map((membership, index) => (
                      <div key={membership._id} className={`p-3 rounded-lg border ${isDarkMode ? 'bg-gray-600/50 border-gray-500' : 'bg-white border-gray-200'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(membership.status)}`}>
                            {membership.status === 'PENDING' && 'Chờ duyệt'}
                            {membership.status === 'ACTIVE' && 'Đã duyệt'}
                            {membership.status === 'REJECTED' && 'Đã từ chối'}
                            {membership.status === 'REMOVED' && 'Đã xóa'}
                          </span>
                          <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {formatDate(membership.joinedAt)}
                          </span>
                        </div>
                        {membership.approvedBy && (
                          <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Duyệt bởi: {membership.approvedBy.name}
                          </p>
                        )}
                        {membership.rejectedBy && (
                          <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Từ chối bởi: {membership.rejectedBy.name}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Account Information */}
              <div className={`${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'} rounded-xl p-6 border ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                <div className="flex items-center space-x-3 mb-4">
                  <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h4 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Thông tin tài khoản</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
                    <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Ngày tạo:</span>
                    <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{formatDate(user.createdAt)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
                    <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Cập nhật lần cuối:</span>
                    <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{formatDate(user.updatedAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex justify-end mt-6 pt-6 border-t border-gray-200 dark:border-gray-600 p-6">
          <button
            onClick={onClose}
            className={`px-6 py-2 rounded-lg font-medium transition-colors duration-200 ${
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
  );
}
