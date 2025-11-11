'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
  rejectionReason?: string;
  rejectedBy?: string | { _id: string; name: string; email: string };
  rejectedAt?: string;
}

interface Activity {
  _id: string;
  name: string;
  description: string;
  date: string;
  participants: Participant[];
  maxParticipants: number;
  status: string;
}

export default function ParticipantsManagementPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [allParticipants, setAllParticipants] = useState<Array<Participant & { activityId: string; activityName: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedActivity, setSelectedActivity] = useState<string>('all');
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [participantToRemove, setParticipantToRemove] = useState<(Participant & { activityId: string; activityName: string }) | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  // Check if user has required role (CLUB_DEPUTY, OFFICER, or CLUB_MEMBER)
  const hasAccess = user && (user.role === 'CLUB_DEPUTY' || user.role === 'OFFICER' || user.role === 'CLUB_MEMBER');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
    }
    
    // Wait for auth to finish loading before checking access
    if (!authLoading) {
      if (hasAccess) {
        fetchActivities();
      } else if (user) {
        // User is loaded but doesn't have access
        setLoading(false);
        setError('Bạn không có quyền truy cập trang này. Chỉ CLUB_DEPUTY, OFFICER và CLUB_MEMBER mới có quyền.');
      }
    }
  }, [hasAccess, authLoading, user]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/activities/officer-dashboard?page=1&limit=100', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Không thể tải danh sách hoạt động');
      }

      const data = await response.json();
      if (data.success && data.data.activities) {
        setActivities(data.data.activities);
        
        // Flatten all participants with activity info
        const flattened: Array<Participant & { activityId: string; activityName: string }> = [];
        data.data.activities.forEach((activity: Activity) => {
          if (activity.participants && Array.isArray(activity.participants)) {
            activity.participants.forEach((participant: any) => {
              // Handle userId - can be ObjectId string or populated object
              const userId = typeof participant.userId === 'object' && participant.userId !== null
                ? participant.userId._id || participant.userId
                : participant.userId;
              
              // Ensure we have name and email
              const name = participant.name || (typeof participant.userId === 'object' && participant.userId?.name) || 'Chưa có tên';
              const email = participant.email || (typeof participant.userId === 'object' && participant.userId?.email) || '';
              
              // Handle joinedAt - convert to ISO string if it's a Date object or already a string
              const joinedAt = participant.joinedAt 
                ? (typeof participant.joinedAt === 'string' 
                    ? participant.joinedAt 
                    : new Date(participant.joinedAt).toISOString())
                : new Date().toISOString();
              
              flattened.push({
                userId: userId,
                name: name,
                email: email,
                role: participant.role || 'Người Tham Gia',
                joinedAt: joinedAt,
                avatarUrl: participant.avatarUrl,
                approvalStatus: participant.approvalStatus || 'pending',
                rejectionReason: participant.rejectionReason,
                rejectedBy: participant.rejectedBy,
                rejectedAt: participant.rejectedAt,
                activityId: activity._id,
                activityName: activity.name
              });
            });
          }
        });
        setAllParticipants(flattened);
      } else {
        setActivities([]);
        setAllParticipants([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
      setActivities([]);
      setAllParticipants([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (participant: Participant & { activityId: string; activityName: string }) => {
    try {
      // Use unique identifier for processing state
      const participantId = typeof participant.userId === 'object' && participant.userId !== null
        ? participant.userId._id || String(participant.userId)
        : String(participant.userId);
      const processingKey = `${participant.activityId}-${participantId}`;
      setProcessing(processingKey);
      
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/activities/${participant.activityId}/participants`, {
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
      await fetchActivities();
      setShowRemoveModal(false);
      setParticipantToRemove(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setProcessing(null);
    }
  };

  const confirmRemove = (participant: Participant & { activityId: string; activityName: string }) => {
    setParticipantToRemove(participant);
    setShowRemoveModal(true);
  };

  const handleApproveReject = async (
    participant: Participant & { activityId: string; activityName: string },
    action: 'approve' | 'reject',
    rejectionReason?: string
  ) => {
    try {
      const participantId = typeof participant.userId === 'object' && participant.userId !== null
        ? participant.userId._id || String(participant.userId)
        : String(participant.userId);
      const processingKey = `${participant.activityId}-${participantId}-${action}`;
      setProcessing(processingKey);
      
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/activities/${participant.activityId}/participants`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          userId: participantId,
          action: action,
          rejectionReason: rejectionReason || ''
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Không thể ${action === 'approve' ? 'duyệt' : 'từ chối'} người tham gia`);
      }

      // Refresh list
      await fetchActivities();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setProcessing(null);
    }
  };

  // Filter participants
  const filteredParticipants = useMemo(() => {
    if (!allParticipants || allParticipants.length === 0) {
      return [];
    }
    
    return allParticipants.filter(p => {
      // Get name and email - prefer direct fields, fallback to userId object
      const name = p.name || (typeof p.userId === 'object' && p.userId !== null && 'name' in p.userId ? String(p.userId.name) : '') || '';
      const email = p.email || (typeof p.userId === 'object' && p.userId !== null && 'email' in p.userId ? String(p.userId.email) : '') || '';
      const activityName = p.activityName || '';
      
      // Search filter
      const searchLower = searchQuery.toLowerCase().trim();
      const matchesSearch = searchLower === '' || 
        name.toLowerCase().includes(searchLower) ||
        email.toLowerCase().includes(searchLower) ||
        activityName.toLowerCase().includes(searchLower);
      
      // Role filter
      const matchesRole = selectedRole === 'all' || (p.role || 'Người Tham Gia') === selectedRole;
      
      // Activity filter
      const matchesActivity = selectedActivity === 'all' || p.activityId === selectedActivity;
      
      return matchesSearch && matchesRole && matchesActivity;
    });
  }, [allParticipants, searchQuery, selectedRole, selectedActivity]);

  // Get unique roles for filter
  const uniqueRoles = useMemo(() => {
    const roles = new Set(allParticipants.map(p => p.role || 'Người Tham Gia'));
    return Array.from(roles).sort();
  }, [allParticipants]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const roleConfig: { [key: string]: { icon: string; color: string; bg: string } } = {
    'Trưởng Nhóm': {
      icon: '👑',
      color: isDarkMode ? 'text-red-300' : 'text-red-700',
      bg: isDarkMode ? 'bg-red-500/10' : 'bg-red-50'
    },
    'Phó Trưởng Nhóm': {
      icon: '👨‍💼',
      color: isDarkMode ? 'text-orange-300' : 'text-orange-700',
      bg: isDarkMode ? 'bg-orange-500/10' : 'bg-orange-50'
    },
    'Thành Viên Ban Tổ Chức': {
      icon: '📋',
      color: isDarkMode ? 'text-purple-300' : 'text-purple-700',
      bg: isDarkMode ? 'bg-purple-500/10' : 'bg-purple-50'
    },
    'Người Giám Sát': {
      icon: '👁️',
      color: isDarkMode ? 'text-blue-300' : 'text-blue-700',
      bg: isDarkMode ? 'bg-blue-500/10' : 'bg-blue-50'
    },
    'Người Tham Gia': {
      icon: '👥',
      color: isDarkMode ? 'text-gray-300' : 'text-gray-700',
      bg: isDarkMode ? 'bg-gray-500/10' : 'bg-gray-50'
    }
  };

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
              Chỉ CLUB_DEPUTY, OFFICER và CLUB_MEMBER mới có quyền quản lý người tham gia
            </p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

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

  return (
    <ProtectedRoute requiredRole="CLUB_MEMBER">
      <div className={`min-h-screen flex flex-col transition-colors duration-200 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <OfficerNav />
        
        <main className="flex-1 max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8 w-full">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <h1 className={`text-2xl sm:text-3xl font-bold mb-2 transition-colors duration-200 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Quản lý người tham gia
            </h1>
            <p className={`text-sm sm:text-base transition-colors duration-200 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Quản lý danh sách người tham gia tất cả các hoạt động bạn phụ trách
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
            <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-gray-800/60 border-gray-700/50' : 'bg-white border-gray-200/80'}`}>
              <p className={`text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Tổng người tham gia</p>
              <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{allParticipants.length}</p>
            </div>
            <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-gray-800/60 border-gray-700/50' : 'bg-white border-gray-200/80'}`}>
              <p className={`text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Số hoạt động</p>
              <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{activities.length}</p>
            </div>
            <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-gray-800/60 border-gray-700/50' : 'bg-white border-gray-200/80'}`}>
              <p className={`text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Vai trò</p>
              <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{uniqueRoles.length}</p>
            </div>
            <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-gray-800/60 border-gray-700/50' : 'bg-white border-gray-200/80'}`}>
              <p className={`text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Kết quả tìm kiếm</p>
              <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{filteredParticipants.length}</p>
            </div>
          </div>

          {/* Search and Filter */}
          <div className={`p-4 rounded-xl border mb-6 ${isDarkMode ? 'bg-gray-800/60 border-gray-700/50' : 'bg-white border-gray-200/80'}`}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="md:col-span-2">
                <label className={`block text-xs font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Tìm kiếm
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo tên, email hoặc tên hoạt động..."
                  className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                    isDarkMode 
                      ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-400 focus:border-blue-500' 
                      : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                />
              </div>
              
              {/* Role Filter */}
              <div>
                <label className={`block text-xs font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Vai trò
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                    isDarkMode 
                      ? 'bg-gray-700/50 border-gray-600/50 text-white focus:border-blue-500' 
                      : 'bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                >
                  <option value="all">Tất cả vai trò</option>
                  {uniqueRoles.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>

              {/* Activity Filter */}
              <div>
                <label className={`block text-xs font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Hoạt động
                </label>
                <select
                  value={selectedActivity}
                  onChange={(e) => setSelectedActivity(e.target.value)}
                  className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                    isDarkMode 
                      ? 'bg-gray-700/50 border-gray-600/50 text-white focus:border-blue-500' 
                      : 'bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                >
                  <option value="all">Tất cả hoạt động</option>
                  {activities.map(activity => (
                    <option key={activity._id} value={activity._id}>{activity.name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Results count */}
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Hiển thị <span className="font-semibold">{filteredParticipants.length}</span> / {allParticipants.length} người
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className={`mb-6 p-4 rounded-xl border ${isDarkMode ? 'bg-red-500/10 border-red-500/30 text-red-300' : 'bg-red-50 border-red-200 text-red-700'}`}>
              <div className="flex items-center gap-2">
                <span>⚠️</span>
                <p className="text-sm font-medium">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className={`ml-auto text-xs px-2 py-1 rounded ${isDarkMode ? 'hover:bg-red-500/20' : 'hover:bg-red-100'}`}
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Participants List */}
          <div className={`rounded-xl border shadow-lg ${isDarkMode ? 'bg-gray-800/60 border-gray-700/50' : 'bg-white border-gray-200/80'}`}>
            <div className={`px-5 sm:px-6 py-4 border-b ${isDarkMode ? 'border-gray-700/50' : 'border-gray-200/80'}`}>
              <h2 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Danh sách người tham gia
              </h2>
            </div>
            
            <div className="p-5 sm:p-6">
              {filteredParticipants.length > 0 ? (
                <div className="space-y-4">
                  {filteredParticipants.map((participant, idx) => {
                    // Handle userId - can be string ObjectId or populated object
                    const participantId = typeof participant.userId === 'object' && participant.userId !== null
                      ? (participant.userId._id || String(participant.userId))
                      : String(participant.userId);
                    
                    // Get name and email
                    const participantName = participant.name || 
                      (typeof participant.userId === 'object' && participant.userId !== null && 'name' in participant.userId 
                        ? String(participant.userId.name) 
                        : 'Chưa có tên');
                    const participantEmail = participant.email || 
                      (typeof participant.userId === 'object' && participant.userId !== null && 'email' in participant.userId 
                        ? String(participant.userId.email) 
                        : '');
                    
                    const config = roleConfig[participant.role || 'Người Tham Gia'] || roleConfig['Người Tham Gia'];

                    return (
                      <div
                        key={`${participant.activityId}-${participantId}-${idx}`}
                        className={`p-4 rounded-lg border transition-all duration-200 hover:shadow-md ${
                          isDarkMode ? 'bg-gray-700/30 border-gray-600/50' : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          {/* Avatar */}
                          {participant.avatarUrl ? (
                            <img
                              src={participant.avatarUrl}
                              alt={participantName}
                              className="w-14 h-14 rounded-full object-cover border-2 border-gray-300/50 dark:border-gray-600/50 flex-shrink-0"
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
                            className={`w-14 h-14 rounded-full flex items-center justify-center text-base font-bold border-2 border-gray-300/50 dark:border-gray-600/50 flex-shrink-0 ${
                              isDarkMode ? 'bg-gradient-to-br from-blue-600 to-blue-500 text-white' : 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                            }`}
                            style={{ display: participant.avatarUrl ? 'none' : 'flex' }}
                          >
                            {getInitials(participantName)}
                          </div>
                          
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className={`font-semibold truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                    {participantName}
                                  </p>
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${config.bg} ${config.color}`}>
                                    {config.icon} {participant.role}
                                  </span>
                                </div>
                                <p className={`text-sm truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  {participantEmail}
                                </p>
                                <div className="mt-2 flex items-center gap-4">
                                  <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                    📅 {(() => {
                                      try {
                                        const date = participant.joinedAt ? new Date(participant.joinedAt) : new Date();
                                        if (isNaN(date.getTime())) return 'Chưa có ngày';
                                        return date.toLocaleDateString('vi-VN');
                                      } catch {
                                        return 'Chưa có ngày';
                                      }
                                    })()}
                                  </p>
                                  <button
                                    onClick={() => router.push(`/officer/activities/${participant.activityId}`)}
                                    className={`text-xs font-medium hover:underline ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}
                                  >
                                    📋 {participant.activityName}
                                  </button>
                                </div>
                                {/* Approval Status - chỉ hiển thị cho "Người Tham Gia" */}
                                {participant.role === 'Người Tham Gia' && participant.approvalStatus && (
                                  <div className="mt-2">
                                    {participant.approvalStatus === 'rejected' ? (
                                      // Show prominent rejection box
                                      <div className={`p-3 rounded-lg border-2 ${
                                        isDarkMode ? 'bg-red-500/10 border-red-500/50' : 'bg-red-50 border-red-300'
                                      }`}>
                                        <div className="flex items-center gap-2 mb-2">
                                          <span className="text-xl">⚠️</span>
                                          <p className={`text-sm font-bold ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>
                                            Đã bị từ chối tham gia
                                          </p>
                                        </div>
                                        {participant.rejectionReason ? (
                                          <>
                                            <p className={`text-xs font-semibold mb-1 ${isDarkMode ? 'text-red-200' : 'text-red-600'}`}>
                                              Lý do từ chối:
                                            </p>
                                            <p className={`text-xs ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                              {participant.rejectionReason}
                                            </p>
                                          </>
                                        ) : (
                                          <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                            Đơn đăng ký tham gia đã bị từ chối.
                                          </p>
                                        )}
                                        {participant.rejectedBy && (
                                          <p className={`text-xs mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                            Từ chối bởi: {typeof participant.rejectedBy === 'object' ? participant.rejectedBy.name : participant.rejectedBy}
                                            {participant.rejectedAt && ` • ${new Date(participant.rejectedAt).toLocaleString('vi-VN')}`}
                                          </p>
                                        )}
                                      </div>
                                    ) : (
                                      // Show simple badge for other statuses
                                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                                        participant.approvalStatus === 'approved'
                                          ? isDarkMode ? 'bg-green-500/20 text-green-300 border border-green-500/40' : 'bg-green-50 text-green-700 border border-green-300'
                                          : isDarkMode ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40' : 'bg-yellow-50 text-yellow-700 border border-yellow-300'
                                      }`}>
                                        {participant.approvalStatus === 'approved' ? '✅ Đã duyệt' : '⏳ Chờ duyệt'}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                              
                              {/* Action buttons */}
                              <div className="flex flex-col gap-2">
                                {/* Chỉ hiển thị nút duyệt/từ chối cho "Người Tham Gia" */}
                                {participant.role === 'Người Tham Gia' && participant.approvalStatus === 'pending' && (
                                  <>
                                    <button
                                      onClick={() => handleApproveReject(participant, 'approve')}
                                      disabled={!!processing && processing.includes(`${participant.activityId}-${participantId}`)}
                                      className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                                        isDarkMode 
                                          ? 'bg-green-500/20 text-green-300 border border-green-500/40 hover:bg-green-500/30' 
                                          : 'bg-green-50 text-green-700 border border-green-300 hover:bg-green-100'
                                      } disabled:opacity-50`}
                                      title="Duyệt người tham gia"
                                    >
                                      ✅ Duyệt
                                    </button>
                                    <button
                                      onClick={() => {
                                        const reason = prompt('Nhập lý do từ chối (nếu có):');
                                        if (reason !== null) {
                                          handleApproveReject(participant, 'reject', reason);
                                        }
                                      }}
                                      disabled={!!processing && processing.includes(`${participant.activityId}-${participantId}`)}
                                      className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                                        isDarkMode 
                                          ? 'bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30' 
                                          : 'bg-red-50 text-red-700 border border-red-300 hover:bg-red-100'
                                      } disabled:opacity-50`}
                                      title="Từ chối người tham gia"
                                    >
                                      ❌ Từ chối
                                    </button>
                                  </>
                                )}
                                {/* Hiển thị badge trạng thái cho "Người Tham Gia" đã được duyệt (không hiển thị nếu rejected vì đã có box ở trên) */}
                                {participant.role === 'Người Tham Gia' && participant.approvalStatus === 'approved' && (
                                  <div className={`px-4 py-2 rounded-lg text-xs text-center font-semibold ${
                                    isDarkMode ? 'bg-green-500/20 text-green-300 border border-green-500/40' : 'bg-green-50 text-green-700 border border-green-300'
                                  }`}>
                                    ✅ Đã được duyệt
                                  </div>
                                )}
                                {/* Nút xóa - chỉ cho phép xóa "Người Tham Gia" hoặc các role khác (nhưng không xóa trưởng nhóm/phó trưởng nhóm do admin thêm) */}
                                {(participant.role === 'Người Tham Gia' || 
                                  participant.role === 'Thành Viên Ban Tổ Chức' || 
                                  participant.role === 'Người Giám Sát') && (
                                  <button
                                    onClick={() => confirmRemove(participant)}
                                    disabled={!!processing && processing.includes(`${participant.activityId}-${participantId}`)}
                                    className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                                      isDarkMode 
                                        ? 'bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30' 
                                        : 'bg-red-50 text-red-700 border border-red-300 hover:bg-red-100'
                                    } disabled:opacity-50`}
                                    title="Xóa người tham gia"
                                  >
                                    🗑️ Xóa
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className={`text-center py-12 rounded-lg border-2 border-dashed ${
                  isDarkMode ? 'bg-gray-800/30 border-gray-700/50 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500'
                }`}>
                  <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${
                    isDarkMode ? 'bg-gray-700/50' : 'bg-gray-100'
                  }`}>
                    <span className="text-3xl">🔍</span>
                  </div>
                  <p className="text-base font-semibold mb-2">
                    {allParticipants.length === 0 ? 'Chưa có người tham gia' : 'Không tìm thấy kết quả'}
                  </p>
                  <p className="text-sm">
                    {allParticipants.length === 0 
                      ? 'Chưa có ai đăng ký tham gia các hoạt động bạn phụ trách'
                      : 'Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Remove Confirmation Modal */}
        {showRemoveModal && participantToRemove && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className={`rounded-xl border shadow-2xl max-w-md w-full ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="p-6">
                <h3 className={`text-lg font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Xác nhận xóa người tham gia
                </h3>
                <p className={`text-sm mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Bạn có chắc chắn muốn xóa <span className="font-semibold">
                    {participantToRemove.name || (typeof participantToRemove.userId === 'object' && participantToRemove.userId !== null && 'name' in participantToRemove.userId ? String(participantToRemove.userId.name) : 'Người này')}
                  </span> khỏi hoạt động <span className="font-semibold">{participantToRemove.activityName}</span> không?
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setShowRemoveModal(false);
                      setParticipantToRemove(null);
                    }}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      isDarkMode 
                        ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Hủy
                  </button>
                  <button
                    onClick={() => handleRemove(participantToRemove)}
                    disabled={processing !== null}
                    className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition-all"
                  >
                    {processing ? 'Đang xử lý...' : 'Xác nhận xóa'}
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

