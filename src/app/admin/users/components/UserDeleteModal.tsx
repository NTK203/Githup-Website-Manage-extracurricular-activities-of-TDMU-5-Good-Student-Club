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
}

interface UserDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
  isDarkMode: boolean;
  onUserDeleted: () => void;
}

export default function UserDeleteModal({ isOpen, onClose, userId, isDarkMode, onUserDeleted }: UserDeleteModalProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removalReason, setRemovalReason] = useState('');

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

  const handleDelete = async () => {
    if (!user) return;

    try {
      setDeleting(true);
      setError(null);

      const response = await fetch(`/api/users/${userId}/delete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          removalReason: removalReason.trim() || 'Không có lý do cụ thể'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete user');
      }

      const data = await response.json();
      if (data.success) {
        onUserDeleted();
        onClose();
        setRemovalReason(''); // Reset reason after successful deletion
      } else {
        throw new Error(data.error || 'Failed to delete user');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error deleting user:', err);
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
      <div className={`relative w-full max-w-md shadow-2xl rounded-xl ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'} border`}>
        {/* Header */}
        <div className={`flex justify-between items-center p-6 border-b ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600'}`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div>
              <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Xóa User Hoàn Toàn
              </h3>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Xác nhận xóa user và tất cả dữ liệu liên quan
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
            <div className="space-y-4">
              {/* Warning Icon */}
              <div className="text-center">
                <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full ${isDarkMode ? 'bg-red-500/20' : 'bg-red-100'}`}>
                  <svg className={`h-6 w-6 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>

              {/* Warning Message */}
              <div className="text-center">
                <h4 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Bạn có chắc chắn muốn xóa user này?
                </h4>
                <p className={`mt-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Hành động này sẽ xóa hoàn toàn user và tất cả dữ liệu liên quan khỏi hệ thống.
                </p>
              </div>

              {/* User Information */}
              <div className={`${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'} rounded-lg p-4 border ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 h-10 w-10">
                    {user.avatarUrl ? (
                      <img
                        className="h-10 w-10 rounded-full"
                        src={user.avatarUrl}
                        alt={user.name}
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                        <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <h5 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {user.name}
                    </h5>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {user.studentId}
                    </p>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {user.email}
                    </p>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-1 ${
                                      user.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                user.role === 'ADMIN' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                user.role === 'CLUB_LEADER' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                user.role === 'CLUB_DEPUTY' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                user.role === 'CLUB_MEMBER' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                user.role === 'CLUB_STUDENT' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                    }`}>
                                              {user.role === 'SUPER_ADMIN' ? 'Quản Trị Hệ Thống' : user.role === 'ADMIN' ? 'Admin' : user.role === 'CLUB_LEADER' ? 'Chủ Nhiệm CLB' : user.role === 'CLUB_DEPUTY' ? 'Phó Chủ Nhiệm' : user.role === 'CLUB_MEMBER' ? 'Ủy Viên BCH' : user.role === 'CLUB_STUDENT' ? 'Thành Viên CLB' : 'Sinh Viên'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Removal Reason Input */}
              <div className={`${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'} rounded-lg p-4 border ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Lý do xóa user (tùy chọn)
                </label>
                <textarea
                  value={removalReason}
                  onChange={(e) => setRemovalReason(e.target.value)}
                  placeholder="Nhập lý do xóa user (không bắt buộc)..."
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                    isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                  required
                />
                {removalReason.trim() && (
                  <p className="mt-1 text-sm text-gray-600">Lý do xóa sẽ được lưu lại để theo dõi</p>
                )}
              </div>

              {/* Additional Information */}
              <div className={`${isDarkMode ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-200'} border rounded-lg p-4`}>
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className={`h-5 w-5 ${isDarkMode ? 'text-red-400' : 'text-red-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h4 className={`text-sm font-medium ${isDarkMode ? 'text-red-300' : 'text-red-800'}`}>
                      Lưu ý quan trọng
                    </h4>
                    <div className={`mt-2 text-sm ${isDarkMode ? 'text-red-200' : 'text-red-700'}`}>
                      <ul className="list-disc list-inside space-y-1">
                        <li>User sẽ bị xóa hoàn toàn khỏi hệ thống</li>
                        <li>Tất cả membership records sẽ bị xóa</li>
                        <li>Không thể khôi phục dữ liệu sau khi xóa</li>
                        {user.role === 'ADMIN' && (
                          <li className="font-semibold">Đây là ADMIN - hãy cẩn thận!</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-600 p-6">
          <button
            onClick={() => {
              onClose();
              setRemovalReason(''); // Reset reason when closing
            }}
            disabled={deleting}
            className={`px-6 py-2 rounded-lg font-medium transition-colors duration-200 ${
              isDarkMode 
                ? 'bg-gray-600 text-white hover:bg-gray-500' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Hủy
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting || loading}
            className="px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {deleting ? 'Đang xóa...' : 'Xóa Hoàn Toàn'}
          </button>
        </div>
      </div>
    </div>
  );
}
