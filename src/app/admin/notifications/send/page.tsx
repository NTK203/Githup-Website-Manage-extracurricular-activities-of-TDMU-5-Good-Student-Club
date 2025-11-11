'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import AdminNav from '@/components/admin/AdminNav';
import Footer from '@/components/common/Footer';
import { useDarkMode } from '@/hooks/useDarkMode';

interface User {
  _id: string;
  name: string;
  studentId: string;
  email: string;
  role: string;
  isClubMember?: boolean;
}

export default function SendNotificationPage() {
  const { user } = useAuth();
  const { isDarkMode } = useDarkMode();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);
  
  // Form states
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'info' | 'success' | 'warning' | 'error'>('info');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [userSelectionMode, setUserSelectionMode] = useState<'all' | 'members' | 'custom'>('all');
  
  // Data states
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load sidebar state
  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  useEffect(() => {
    const savedState = localStorage.getItem('sidebarOpen');
    if (savedState !== null) {
      setIsSidebarOpen(savedState === 'true');
    }

    const handleSidebarChange = (event: CustomEvent<{ isOpen: boolean }>) => {
      setIsSidebarOpen(event.detail.isOpen);
    };

    window.addEventListener('sidebarStateChange', handleSidebarChange as EventListener);
    
    const interval = setInterval(() => {
      const currentState = localStorage.getItem('sidebarOpen');
      if (currentState !== null) {
        const isOpen = currentState === 'true';
        if (isOpen !== isSidebarOpen) {
          setIsSidebarOpen(isOpen);
        }
      }
    }, 100);

    return () => {
      window.removeEventListener('sidebarStateChange', handleSidebarChange as EventListener);
      clearInterval(interval);
    };
  }, [isSidebarOpen]);

  // Load users
  useEffect(() => {
    if (userSelectionMode === 'custom') {
      loadUsers();
    }
  }, [userSelectionMode]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/users?limit=1000', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setUsers(data.data.users || []);
        }
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelectionModeChange = (mode: 'all' | 'members' | 'custom') => {
    setUserSelectionMode(mode);
    setSelectedUsers([]);
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !message.trim()) {
      setError('Vui lòng điền đầy đủ tiêu đề và nội dung');
      return;
    }

    let userIds: string[] = [];

    if (userSelectionMode === 'all') {
      // Get all user IDs
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Không tìm thấy token đăng nhập');
          return;
        }

        const response = await fetch('/api/users?limit=1000', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            // Filter out current user
            const allUserIds = (data.data.users || []).map((u: User) => u._id);
            const currentUserId = user?._id;
            userIds = allUserIds.filter((id: string) => id !== currentUserId);
          }
        }
      } catch (error) {
        console.error('Error loading all users:', error);
        setError('Không thể tải danh sách người dùng');
        return;
      }
    } else if (userSelectionMode === 'members') {
      // Get only club members
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Không tìm thấy token đăng nhập');
          return;
        }

        const response = await fetch('/api/members?status=ACTIVE', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            // Filter out current user
            const allMemberIds = (data.data.members || []).map((m: any) => m.userId?._id || m.userId).filter(Boolean);
            const currentUserId = user?._id;
            userIds = allMemberIds.filter((id: string) => id !== currentUserId);
          }
        }
      } catch (error) {
        console.error('Error loading members:', error);
        setError('Không thể tải danh sách thành viên');
        return;
      }
    } else {
      // Custom selection
      if (selectedUsers.length === 0) {
        setError('Vui lòng chọn ít nhất một người nhận');
        return;
      }
      userIds = selectedUsers;
    }

    if (userIds.length === 0) {
      setError('Không có người nhận nào được chọn');
      return;
    }

    try {
      setSending(true);
      setError(null);
      setSuccess(false);

      const token = localStorage.getItem('token');
      if (!token) {
        setError('Không tìm thấy token đăng nhập');
        return;
      }

      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userIds,
          title: title.trim(),
          message: message.trim(),
          type
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSuccess(true);
          setTitle('');
          setMessage('');
          setType('info');
          setSelectedUsers([]);
          setUserSelectionMode('all');
          
          // Hide success message after 3 seconds
          setTimeout(() => setSuccess(false), 3000);
        } else {
          setError(data.error || 'Không thể gửi thông báo');
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Không thể gửi thông báo');
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      setError('Đã xảy ra lỗi khi gửi thông báo');
    } finally {
      setSending(false);
    }
  };

  // Check if user has permission
  const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'CLUB_LEADER', 'CLUB_DEPUTY', 'CLUB_MEMBER'];
  const hasPermission = user && allowedRoles.includes(user.role || '');

  if (!hasPermission && user) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className={`text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          <h1 className="text-2xl font-bold mb-2">Không có quyền truy cập</h1>
          <p className="text-gray-500">Bạn không có quyền xem trang này.</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute requiredRole="CLUB_LEADER">
      <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} overflow-x-hidden`}>
        <AdminNav />
        
        <main 
          className={`transition-all duration-300 ${isDesktop ? (isSidebarOpen ? 'ml-64' : 'ml-20') : 'ml-0'}`}
          style={{
            marginLeft: isDesktop ? (isSidebarOpen ? '16rem' : '5rem') : '0',
            width: isDesktop ? (isSidebarOpen ? 'calc(100% - 16rem)' : 'calc(100% - 5rem)') : '100%',
            maxWidth: isDesktop ? (isSidebarOpen ? 'calc(100% - 16rem)' : 'calc(100% - 5rem)') : '100%',
            minWidth: 0
          }}
        >
          <div className="p-6">
            <div className={`max-w-4xl mx-auto ${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
              <h1 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                📢 Gửi Thông Báo
              </h1>

              {success && (
                <div className={`mb-6 p-4 rounded-lg bg-green-50 border border-green-200 ${isDarkMode ? 'bg-green-900/20 border-green-700' : ''}`}>
                  <p className={`text-green-800 ${isDarkMode ? 'text-green-300' : ''}`}>
                    ✅ Đã gửi thông báo thành công!
                  </p>
                </div>
              )}

              {error && (
                <div className={`mb-6 p-4 rounded-lg bg-red-50 border border-red-200 ${isDarkMode ? 'bg-red-900/20 border-red-700' : ''}`}>
                  <p className={`text-red-800 ${isDarkMode ? 'text-red-300' : ''}`}>
                    ❌ {error}
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Title */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Tiêu đề <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={`w-full px-4 py-2 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="Nhập tiêu đề thông báo"
                    required
                  />
                </div>

                {/* Message */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Nội dung <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={5}
                    className={`w-full px-4 py-2 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="Nhập nội dung thông báo"
                    required
                  />
                </div>

                {/* Type */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Loại thông báo
                  </label>
                  <div className="grid grid-cols-4 gap-3">
                    {(['info', 'success', 'warning', 'error'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setType(t)}
                        className={`px-4 py-2 rounded-lg border transition-all ${
                          type === t
                            ? t === 'info' ? 'bg-blue-500 text-white border-blue-500' :
                              t === 'success' ? 'bg-green-500 text-white border-green-500' :
                              t === 'warning' ? 'bg-yellow-500 text-white border-yellow-500' :
                              'bg-red-500 text-white border-red-500'
                            : isDarkMode
                            ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {t === 'info' ? 'ℹ️ Thông tin' :
                         t === 'success' ? '✅ Thành công' :
                         t === 'warning' ? '⚠️ Cảnh báo' :
                         '❌ Lỗi'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* User Selection Mode */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Người nhận
                  </label>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {(['all', 'members', 'custom'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => handleUserSelectionModeChange(mode)}
                        className={`px-4 py-2 rounded-lg border transition-all ${
                          userSelectionMode === mode
                            ? 'bg-blue-500 text-white border-blue-500'
                            : isDarkMode
                            ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {mode === 'all' ? '👥 Tất cả' :
                         mode === 'members' ? '⭐ Thành viên CLB' :
                         '🎯 Tùy chọn'}
                      </button>
                    ))}
                  </div>

                  {/* Custom User Selection */}
                  {userSelectionMode === 'custom' && (
                    <div className={`mt-4 p-4 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'} max-h-64 overflow-y-auto`}>
                      {loading ? (
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Đang tải...</p>
                      ) : (
                        <div className="space-y-2">
                          {users.map((u) => (
                            <label
                              key={u._id}
                              className={`flex items-center space-x-2 p-2 rounded cursor-pointer hover:bg-gray-100 ${isDarkMode ? 'hover:bg-gray-600' : ''} ${
                                selectedUsers.includes(u._id) ? (isDarkMode ? 'bg-blue-900/30' : 'bg-blue-50') : ''
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={selectedUsers.includes(u._id)}
                                onChange={() => toggleUserSelection(u._id)}
                                className="w-4 h-4 text-blue-600 rounded"
                              />
                              <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                {u.name} ({u.studentId})
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {userSelectionMode === 'custom' && selectedUsers.length > 0 && (
                    <p className={`mt-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Đã chọn: {selectedUsers.length} người
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setTitle('');
                      setMessage('');
                      setType('info');
                      setSelectedUsers([]);
                      setUserSelectionMode('all');
                      setError(null);
                      setSuccess(false);
                    }}
                    className={`px-6 py-2 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={sending}
                    className={`px-6 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all`}
                  >
                    {sending ? 'Đang gửi...' : '📤 Gửi Thông Báo'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </ProtectedRoute>
  );
}

