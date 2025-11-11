'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import OfficerNav from '@/components/officer/OfficerNav';
import Footer from '@/components/common/Footer';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';

interface Participant {
  userId: string | { _id: string; name: string; email: string };
  name: string;
  email: string;
  role: string;
  joinedAt: string;
  avatarUrl?: string;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  checkedIn?: boolean;
  checkedInAt?: string;
  checkedInBy?: string;
}

interface Activity {
  _id: string;
  name: string;
  description: string;
  date: string;
  participants: Participant[];
  maxParticipants: number;
  status: string;
  location?: string;
  responsiblePerson?: any;
}

export default function ParticipantsPage() {
  const { activityId } = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [participantToRemove, setParticipantToRemove] = useState<Participant | null>(null);
  const hasFetchedRef = useRef(false);

  // Check if user has required role (CLUB_DEPUTY, OFFICER, or CLUB_MEMBER)
  const hasAccess = useMemo(() => {
    return user && (user.role === 'CLUB_DEPUTY' || user.role === 'OFFICER' || user.role === 'CLUB_MEMBER');
  }, [user?.role]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Reset fetch flag when activityId changes
  useEffect(() => {
    hasFetchedRef.current = false;
  }, [activityId]);

  useEffect(() => {
    // Prevent multiple fetches for the same activityId
    if (hasFetchedRef.current) return;
    
    // Wait for auth to finish loading before checking access
    if (authLoading) return;
    
    if (hasAccess) {
      hasFetchedRef.current = true;
      fetchActivityAndParticipants();
    } else if (user) {
      // User is loaded but doesn't have access
      hasFetchedRef.current = true;
      setLoading(false);
      setError('Bạn không có quyền truy cập trang này. Chỉ CLUB_DEPUTY, OFFICER và CLUB_MEMBER mới có quyền.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityId, hasAccess, authLoading]);

  // Listen for theme changes
  useEffect(() => {
    const handleThemeChange = () => {
      const savedTheme = localStorage.getItem('theme');
      setIsDarkMode(savedTheme === 'dark');
    };
    
    window.addEventListener('themeChange', handleThemeChange);
    return () => window.removeEventListener('themeChange', handleThemeChange);
  }, []);

  const fetchActivityAndParticipants = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/activities/${activityId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Không thể tải thông tin hoạt động');
      }

      const data = await response.json();
      if (data.success && data.data) {
        // API returns { success: true, data: { activity: ... } }
        const activityData = data.data.activity || data.data;
        setActivity(activityData);
        
        // Process participants - handle both populated and unpopulated userId
        const processedParticipants = (activityData.participants || []).map((participant: any) => {
          // Handle userId - can be ObjectId string or populated object
          const userId = typeof participant.userId === 'object' && participant.userId !== null
            ? participant.userId._id || participant.userId
            : participant.userId;
          
          // Get name and email - prefer direct fields, fallback to userId object
          const name = participant.name || 
            (typeof participant.userId === 'object' && participant.userId !== null && 'name' in participant.userId 
              ? String(participant.userId.name) 
              : 'Chưa có tên');
          const email = participant.email || 
            (typeof participant.userId === 'object' && participant.userId !== null && 'email' in participant.userId 
              ? String(participant.userId.email) 
              : '');
          
          // Handle joinedAt - convert to ISO string if it's a Date object or already a string
          const joinedAt = participant.joinedAt 
            ? (typeof participant.joinedAt === 'string' 
                ? participant.joinedAt 
                : new Date(participant.joinedAt).toISOString())
            : new Date().toISOString();
          
          return {
            userId: userId,
            name: name,
            email: email,
            role: participant.role || 'Người Tham Gia',
            joinedAt: joinedAt,
            avatarUrl: participant.avatarUrl,
            approvalStatus: participant.approvalStatus || 'pending',
            checkedIn: participant.checkedIn || false,
            checkedInAt: participant.checkedInAt ? (
              typeof participant.checkedInAt === 'string' 
                ? participant.checkedInAt 
                : new Date(participant.checkedInAt).toISOString()
            ) : undefined,
            checkedInBy: participant.checkedInBy || undefined
          };
        });
        
        setParticipants(processedParticipants);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!participantToRemove) return;
    
    try {
      const participantId = typeof participantToRemove.userId === 'object' && participantToRemove.userId !== null
        ? participantToRemove.userId._id || String(participantToRemove.userId)
        : String(participantToRemove.userId);
      
      setProcessing(participantId);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/activities/${activityId}/participants`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: participantId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Không thể xóa người tham gia');
      }

      // Refresh list
      await fetchActivityAndParticipants();
      setShowRemoveModal(false);
      setParticipantToRemove(null);
      setSuccessMessage('Đã xóa người tham gia thành công');
      setError(null);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
      setSuccessMessage(null);
    } finally {
      setProcessing(null);
    }
  };

  const confirmRemove = (participant: Participant) => {
    setParticipantToRemove(participant);
    setShowRemoveModal(true);
  };

  const handleApproveReject = async (
    participant: Participant,
    action: 'approve' | 'reject',
    rejectionReasonParam?: string
  ) => {
    try {
      const participantId = typeof participant.userId === 'object' && participant.userId !== null
        ? participant.userId._id || String(participant.userId)
        : String(participant.userId);
      const processingKey = `${participantId}-${action}`;
      setProcessing(processingKey);
      
      // Nếu là reject và chưa có lý do, hỏi người dùng
      let finalRejectionReason = rejectionReasonParam || '';
      if (action === 'reject' && !finalRejectionReason) {
        const reason = prompt('Nhập lý do từ chối (nếu có):');
        if (reason === null) {
          // User cancelled
          setProcessing(null);
          return;
        }
        finalRejectionReason = reason || '';
      }
      
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/activities/${activityId}/participants`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          userId: participantId,
          action: action,
          rejectionReason: finalRejectionReason
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Không thể ${action === 'approve' ? 'duyệt' : 'từ chối'} người tham gia`);
      }

      // Refresh list
      await fetchActivityAndParticipants();
      setSuccessMessage(`Đã ${action === 'approve' ? 'duyệt' : 'từ chối'} người tham gia thành công`);
      setError(null);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
      setSuccessMessage(null);
    } finally {
      setProcessing(null);
    }
  };

  // Filter participants
  const filteredParticipants = useMemo(() => {
    return participants.filter(p => {
      const participantName = p.name || 
        (typeof p.userId === 'object' && p.userId !== null && 'name' in p.userId 
          ? String(p.userId.name) 
          : '');
      const participantEmail = p.email || 
        (typeof p.userId === 'object' && p.userId !== null && 'email' in p.userId 
          ? String(p.userId.email) 
          : '');
      
      const searchLower = searchQuery.toLowerCase().trim();
      const matchesSearch = searchLower === '' || 
        participantName.toLowerCase().includes(searchLower) ||
        participantEmail.toLowerCase().includes(searchLower);
      
      const matchesRole = selectedRole === 'all' || (p.role || 'Người Tham Gia') === selectedRole;
      
      return matchesSearch && matchesRole;
    });
  }, [participants, searchQuery, selectedRole]);

  // Get unique roles for filter
  const uniqueRoles = useMemo(() => {
    const roles = new Set(participants.map(p => p.role || 'Người Tham Gia'));
    return Array.from(roles).sort();
  }, [participants]);

  // Calculate participation percentage
  const participationPercent = useMemo(() => {
    if (!activity || !activity.maxParticipants || activity.maxParticipants === Infinity) return 0;
    return Math.round((participants.length / activity.maxParticipants) * 100);
  }, [activity, participants]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const roleConfig: { [key: string]: { icon: string; color: string; bg: string; gradient: string } } = {
    'Trưởng Nhóm': {
      icon: '👑',
      color: isDarkMode ? 'text-red-300' : 'text-red-700',
      bg: isDarkMode ? 'bg-red-500/10' : 'bg-red-50',
      gradient: 'from-red-500 to-red-600'
    },
    'Phó Trưởng Nhóm': {
      icon: '👨‍💼',
      color: isDarkMode ? 'text-orange-300' : 'text-orange-700',
      bg: isDarkMode ? 'bg-orange-500/10' : 'bg-orange-50',
      gradient: 'from-orange-500 to-orange-600'
    },
    'Thành Viên Ban Tổ Chức': {
      icon: '📋',
      color: isDarkMode ? 'text-purple-300' : 'text-purple-700',
      bg: isDarkMode ? 'bg-purple-500/10' : 'bg-purple-50',
      gradient: 'from-purple-500 to-purple-600'
    },
    'Người Giám Sát': {
      icon: '👁️',
      color: isDarkMode ? 'text-blue-300' : 'text-blue-700',
      bg: isDarkMode ? 'bg-blue-500/10' : 'bg-blue-50',
      gradient: 'from-blue-500 to-blue-600'
    },
    'Người Tham Gia': {
      icon: '👥',
      color: isDarkMode ? 'text-gray-300' : 'text-gray-700',
      bg: isDarkMode ? 'bg-gray-500/10' : 'bg-gray-50',
      gradient: 'from-gray-500 to-gray-600'
    }
  };

  // Show loading while auth is loading or data is fetching
  if (authLoading || loading) {
    return (
      <ProtectedRoute requiredRole="CLUB_MEMBER">
        <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </ProtectedRoute>
    );
  }

  // Only show access denied if auth is loaded and user doesn't have access
  if (!authLoading && user && !hasAccess) {
    return (
      <ProtectedRoute requiredRole="CLUB_MEMBER">
        <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
          <div className="text-center">
            <p className={`text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Bạn không có quyền truy cập trang này
            </p>
            <p className={`text-sm mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Chỉ CLUB_DEPUTY, OFFICER và CLUB_MEMBER mới có quyền xem danh sách người tham gia
            </p>
            <button
              onClick={() => router.back()}
              className={`mt-4 px-4 py-2 rounded-lg ${isDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-900'}`}
            >
              Quay lại
            </button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error && !activity) {
    return (
      <ProtectedRoute requiredRole="CLUB_MEMBER">
        <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
          <div className="text-center">
            <p className={`text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {error || 'Không tìm thấy hoạt động'}
            </p>
            <button
              onClick={() => router.back()}
              className={`mt-4 px-4 py-2 rounded-lg ${isDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-900'}`}
            >
              Quay lại
            </button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="CLUB_MEMBER">
      <div className={`min-h-screen flex flex-col transition-colors duration-200 ${isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-gray-50 via-white to-gray-50'}`}>
        <OfficerNav />
        
        <main className="flex-1 w-full">
          {/* Clean Header Section */}
          {activity && (
            <div className={`border-b ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => router.back()}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      isDarkMode 
                        ? 'text-gray-400 hover:text-white hover:bg-gray-800' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    <span>Quay lại</span>
                  </button>
                  
                  <button
                    onClick={() => router.push(`/officer/attendance/${activity._id}`)}
                    className={`px-5 py-2 rounded-lg font-semibold text-sm transition-all ${
                      isDarkMode
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    ✅ Điểm danh
                  </button>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Danh sách người tham gia
                    </h1>
                    <h2 className={`text-lg font-semibold mt-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {activity.name}
                    </h2>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm ${
                      isDarkMode 
                        ? 'bg-gray-800 text-gray-300' 
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      <span>📅</span>
                      <span>
                        {(() => {
                          try {
                            const date = activity.date ? new Date(activity.date) : new Date();
                            if (isNaN(date.getTime())) return 'Chưa có ngày';
                            return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
                          } catch {
                            return 'Chưa có ngày';
                          }
                        })()}
                      </span>
                    </div>
                    {activity.location && (
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm ${
                        isDarkMode 
                          ? 'bg-gray-800 text-gray-300' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        <span>📍</span>
                        <span className="max-w-md truncate">
                          {activity.location.length > 50 ? activity.location.substring(0, 50) + '...' : activity.location}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Left Sidebar - Filters & Stats */}
              <aside className="lg:w-64 flex-shrink-0">
                <div className="sticky top-6 space-y-4">
                  {/* Search & Filter */}
                  <div className={`rounded-lg p-4 border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <h3 className={`text-sm font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      🔍 Tìm kiếm & Lọc
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className={`block text-xs font-medium mb-1.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Tìm kiếm
                        </label>
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Tên hoặc email..."
                          className={`w-full px-3 py-2 rounded-lg border text-sm ${
                            isDarkMode 
                              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500' 
                              : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                          } focus:outline-none`}
                        />
                      </div>
                      <div>
                        <label className={`block text-xs font-medium mb-1.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Vai trò
                        </label>
                        <select
                          value={selectedRole}
                          onChange={(e) => setSelectedRole(e.target.value)}
                          className={`w-full px-3 py-2 rounded-lg border text-sm ${
                            isDarkMode 
                              ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500' 
                              : 'bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                          } focus:outline-none`}
                        >
                          <option value="all">Tất cả vai trò</option>
                          {uniqueRoles.map(role => (
                            <option key={role} value={role}>{role}</option>
                          ))}
                        </select>
                      </div>
                      <div className={`pt-2 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Hiển thị <span className="font-semibold text-blue-600">{filteredParticipants.length}</span> / {participants.length} người
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Stats Summary */}
                  {activity && (
                    <div className={`rounded-lg p-4 border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                      <h3 className={`text-sm font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        📊 Tổng quan
                      </h3>
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Tổng người tham gia</span>
                          <span className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{participants.length}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Số lượng tối đa</span>
                          <span className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{activity.maxParticipants || '∞'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Tỷ lệ tham gia</span>
                          <span className={`text-base font-bold ${
                            participationPercent >= 100
                              ? 'text-red-600'
                              : participationPercent >= 80
                              ? 'text-orange-600'
                              : 'text-green-600'
                          }`}>{participationPercent}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Vai trò</span>
                          <span className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{uniqueRoles.length}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </aside>

              {/* Main Content Area */}
              <div className="flex-1 min-w-0">
                {/* Success Message */}
                {successMessage && activity && (
                  <div className={`mb-4 p-3 rounded-lg border ${isDarkMode ? 'bg-green-500/10 border-green-500/30 text-green-300' : 'bg-green-50 border-green-200 text-green-700'}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-base">✅</span>
                      <p className="text-xs font-medium flex-1">{successMessage}</p>
                      <button
                        onClick={() => setSuccessMessage(null)}
                        className={`w-5 h-5 rounded flex items-center justify-center text-xs transition-all ${
                          isDarkMode ? 'hover:bg-green-500/20' : 'hover:bg-green-100'
                        }`}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {error && activity && (
                  <div className={`mb-4 p-3 rounded-lg border ${isDarkMode ? 'bg-red-500/10 border-red-500/30 text-red-300' : 'bg-red-50 border-red-200 text-red-700'}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-base">⚠️</span>
                      <p className="text-xs font-medium flex-1">{error}</p>
                      <button
                        onClick={() => setError(null)}
                        className={`w-5 h-5 rounded flex items-center justify-center text-xs transition-all ${
                          isDarkMode ? 'hover:bg-red-500/20' : 'hover:bg-red-100'
                        }`}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}

                {/* Participants List */}
                {filteredParticipants.length > 0 ? (
                  <div className="space-y-4">
                    {Object.entries(
                      filteredParticipants.reduce((acc, p) => {
                        const role = p.role || 'Người Tham Gia';
                        if (!acc[role]) {
                          acc[role] = [];
                        }
                        acc[role].push(p);
                        return acc;
                      }, {} as { [key: string]: Participant[] })
                    ).map(([role, roleParticipants]) => {
                      const config = roleConfig[role] || roleConfig['Người Tham Gia'];
                      
                      return (
                        <div key={role} className={`rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                          {/* Section Header */}
                          <div className={`px-5 py-3.5 border-b ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${config.bg}`}>
                                {config.icon}
                              </div>
                              <div className="flex-1">
                                <h2 className={`text-base font-bold ${config.color}`}>
                                  {role}
                                </h2>
                                <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  {roleParticipants.length} {roleParticipants.length === 1 ? 'người' : 'người'}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          {/* Participants Grid */}
                          <div className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                          {roleParticipants.map((participant, idx) => {
                            const participantId = typeof participant.userId === 'object' && participant.userId !== null
                              ? (participant.userId._id || String(participant.userId))
                              : String(participant.userId);
                            
                            const participantName = participant.name || 'Chưa có tên';
                            const participantEmail = participant.email || '';

                            return (
                              <div
                                key={`${participantId}-${idx}`}
                                className={`rounded-lg border transition-all hover:shadow-md ${
                                  isDarkMode 
                                    ? 'bg-gray-800/50 border-gray-700 hover:border-gray-600' 
                                    : 'bg-white border-gray-200 hover:border-gray-300'
                                }`}
                              >
                                <div className="p-4">
                                  {/* Avatar and Info */}
                                  <div className="flex items-start gap-3 mb-4">
                                    {participant.avatarUrl ? (
                                      <img
                                        src={participant.avatarUrl}
                                        alt={participantName}
                                        className="w-12 h-12 rounded-lg object-cover border border-gray-300/50 dark:border-gray-600/50 flex-shrink-0"
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement;
                                          target.style.display = 'none';
                                          const placeholder = target.nextElementSibling as HTMLElement;
                                          if (placeholder) {
                                            placeholder.style.display = 'flex';
                                          }
                                        }}
                                      />
                                    ) : null}
                                    <div
                                      className={`w-12 h-12 rounded-lg flex items-center justify-center text-sm font-bold border border-gray-300/50 dark:border-gray-600/50 flex-shrink-0 bg-gradient-to-br ${config.gradient} text-white`}
                                      style={{ display: participant.avatarUrl ? 'none' : 'flex' }}
                                    >
                                      {getInitials(participantName)}
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                      <h3 className={`font-semibold text-sm mb-1 truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                        {participantName}
                                      </h3>
                                      <p className={`text-xs truncate mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                        {participantEmail}
                                      </p>
                                      <div className="flex items-center text-xs mb-2">
                                        <span className={isDarkMode ? 'text-gray-500' : 'text-gray-500'}>
                                          📅 {(() => {
                                            try {
                                              const date = participant.joinedAt ? new Date(participant.joinedAt) : new Date();
                                              if (isNaN(date.getTime())) return 'Chưa có ngày';
                                              return date.toLocaleDateString('vi-VN');
                                            } catch {
                                              return 'Chưa có ngày';
                                            }
                                          })()}
                                        </span>
                                      </div>
                                      {/* Status Badges */}
                                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                        {/* Approval Status Badge */}
                                        {participant.role === 'Người Tham Gia' && participant.approvalStatus === 'pending' && (
                                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                            isDarkMode ? 'bg-yellow-500/20 text-yellow-300' : 'bg-yellow-50 text-yellow-700'
                                          }`}>
                                            ⏳ Chờ duyệt
                                          </span>
                                        )}
                                        {/* Attendance Status Badge */}
                                        {participant.approvalStatus === 'approved' && (
                                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                            participant.checkedIn
                                              ? isDarkMode ? 'bg-green-500/20 text-green-300' : 'bg-green-50 text-green-700'
                                              : isDarkMode ? 'bg-gray-500/20 text-gray-300' : 'bg-gray-50 text-gray-600'
                                          }`}>
                                            {participant.checkedIn ? '✅ Đã điểm danh' : '⏸️ Chưa điểm danh'}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Action buttons */}
                                  <div className="flex flex-col gap-2">
                                    {/* Chỉ hiển thị nút duyệt/từ chối cho "Người Tham Gia" */}
                                    {participant.role === 'Người Tham Gia' && participant.approvalStatus === 'pending' && (
                                      <>
                                        <button
                                          onClick={() => handleApproveReject(participant, 'approve')}
                                          disabled={!!processing && processing.includes(`${participantId}-`)}
                                          className={`w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                                            isDarkMode 
                                              ? 'bg-green-600 text-white hover:bg-green-700' 
                                              : 'bg-green-600 text-white hover:bg-green-700'
                                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                                          title="Duyệt người tham gia"
                                        >
                                          {processing && processing.includes(`${participantId}-approve`) ? '⏳ Đang xử lý...' : '✅ Duyệt'}
                                        </button>
                                        <button
                                          onClick={() => handleApproveReject(participant, 'reject')}
                                          disabled={!!processing && processing.includes(`${participantId}-`)}
                                          className={`w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                                            isDarkMode 
                                              ? 'bg-red-600 text-white hover:bg-red-700' 
                                              : 'bg-red-600 text-white hover:bg-red-700'
                                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                                          title="Từ chối người tham gia"
                                        >
                                          {processing && processing.includes(`${participantId}-reject`) ? '⏳ Đang xử lý...' : '❌ Từ chối'}
                                        </button>
                                      </>
                                    )}
                                    {/* Hiển thị badge trạng thái cho "Người Tham Gia" đã được duyệt/từ chối */}
                                    {participant.role === 'Người Tham Gia' && participant.approvalStatus && participant.approvalStatus !== 'pending' && (
                                      <div className={`w-full px-3 py-2 rounded-lg text-xs text-center font-medium ${
                                        participant.approvalStatus === 'approved'
                                          ? isDarkMode ? 'bg-green-600 text-white' : 'bg-green-600 text-white'
                                          : isDarkMode ? 'bg-red-600 text-white' : 'bg-red-600 text-white'
                                      }`}>
                                        {participant.approvalStatus === 'approved' ? '✅ Đã được duyệt' : '❌ Đã bị từ chối'}
                                      </div>
                                    )}
                                    {/* Nút xóa */}
                                    {(participant.role === 'Người Tham Gia' || 
                                      participant.role === 'Thành Viên Ban Tổ Chức' || 
                                      participant.role === 'Người Giám Sát') && (
                                      <button
                                        onClick={() => confirmRemove(participant)}
                                        disabled={!!processing && processing.includes(participantId)}
                                        className={`w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                                          isDarkMode 
                                            ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' 
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                                        title="Xóa người tham gia"
                                      >
                                        🗑️ Xóa
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
                ) : (
                  <div className={`text-center py-12 rounded-lg border border-dashed ${isDarkMode ? 'bg-gray-800/30 border-gray-700 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                    <div className={`w-14 h-14 mx-auto rounded-lg flex items-center justify-center mb-3 ${
                      isDarkMode ? 'bg-gray-700/50' : 'bg-gray-100'
                    }`}>
                      <span className="text-2xl">
                        {participants.length === 0 ? '👥' : '🔍'}
                      </span>
                    </div>
                    <h3 className="text-base font-bold mb-1.5">
                      {participants.length === 0 ? 'Chưa có người tham gia' : 'Không tìm thấy kết quả'}
                    </h3>
                    <p className="text-xs">
                      {participants.length === 0 
                        ? 'Chưa có ai đăng ký tham gia hoạt động này'
                        : 'Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* Remove Confirmation Modal */}
        {showRemoveModal && participantToRemove && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`rounded-lg border shadow-xl max-w-md w-full ${
              isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <div className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    isDarkMode ? 'bg-red-500/20' : 'bg-red-100'
                  }`}>
                    <span className="text-xl">🗑️</span>
                  </div>
                  <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Xác nhận xóa
                  </h3>
                </div>
                <p className={`text-sm mb-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Bạn có chắc chắn muốn xóa <span className="font-semibold text-red-600 dark:text-red-400">
                    {participantToRemove.name || (typeof participantToRemove.userId === 'object' && participantToRemove.userId !== null && 'name' in participantToRemove.userId ? String(participantToRemove.userId.name) : 'Người này')}
                  </span> khỏi danh sách người tham gia không?
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setShowRemoveModal(false);
                      setParticipantToRemove(null);
                    }}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isDarkMode 
                        ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleRemove}
                    disabled={processing !== null}
                    className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors disabled:cursor-not-allowed"
                  >
                    {processing ? '⏳ Đang xử lý...' : 'Xác nhận xóa'}
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
