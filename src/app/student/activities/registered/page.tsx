'use client';

import { useState, useEffect } from 'react';
import { 
  Calendar, 
  MapPin,
  Users,
  Search,
  Filter,
  ChevronDown,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  X,
  Loader,
  CheckSquare,
  CalendarDays,
  Award,
  Sunrise,
  Sun,
  Moon
} from 'lucide-react';
import StudentNav from '@/components/student/StudentNav';
import Footer from '@/components/common/Footer';
import PaginationBar from '@/components/common/PaginationBar';
import { useAuth } from '@/hooks/useAuth';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useRouter } from 'next/navigation';

interface RawActivity {
  _id: string;
  name: string;
  description?: string;
  date: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  points?: number;
  status: string;
  type?: string;
  visibility: 'public' | 'private';
  imageUrl?: string;
  overview?: string;
  numberOfSessions?: number;
  registeredParticipantsCount?: number;
  maxParticipants?: number;
  responsiblePerson?: {
    _id: string;
    name: string;
    email?: string;
    avatarUrl?: string;
  };
  createdBy?: {
    _id: string;
    name: string;
    email?: string;
    avatarUrl?: string;
  };
  participants?: Array<{
    userId: string | { _id: string };
    name: string;
    email: string;
    avatarUrl?: string;
    approvalStatus?: 'pending' | 'approved' | 'rejected' | 'removed';
    checkedIn?: boolean;
    rejectionReason?: string;
    rejectedBy?: string | { _id: string; name: string; email: string };
    rejectedAt?: string;
    registeredDaySlots?: Array<{ day: number; slot: 'morning' | 'afternoon' | 'evening' }>;
  }>;
  isMultipleDays?: boolean;
  schedule?: Array<{
    day: number;
    date: string;
    activities: string;
  }>;
  isRegistered?: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected' | 'removed';
  rejectionReason?: string;
  rejectedBy?: string | { _id: string; name: string; email: string };
  rejectedAt?: string;
  registeredDaySlots?: Array<{ day: number; slot: 'morning' | 'afternoon' | 'evening' }>;
}

export default function RegisteredActivitiesPage() {
  const { user, token, isAuthenticated } = useAuth();
  const { isDarkMode } = useDarkMode();
  const router = useRouter();

  const [activities, setActivities] = useState<RawActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'pending' | 'approved' | 'rejected'>('ALL');
  const [timeFilter, setTimeFilter] = useState<'ALL' | 'upcoming' | 'ongoing' | 'past'>('ALL');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'points'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [activitiesPerPage, setActivitiesPerPage] = useState(12);
  const [totalActivities, setTotalActivities] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [unregisteringActivities, setUnregisteringActivities] = useState<Set<string>>(new Set());
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && token) {
      loadActivities();
    }
  }, [isAuthenticated, token, searchQuery, statusFilter, timeFilter, sortBy, sortOrder, currentPage, activitiesPerPage]);

  const loadActivities = async () => {
    if (!isAuthenticated || !token) return;
    
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', activitiesPerPage.toString());
      if (searchQuery) params.append('search', searchQuery);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);

      const response = await fetch(`/api/activities?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load activities');
      }

      const data = await response.json();
      
      if (data.success) {
        // Filter only registered activities
        const allActivities = data.data.activities || [];
        const registeredActivities = allActivities.filter((activity: RawActivity) => {
          if (!activity.participants || activity.participants.length === 0) return false;
          
          // Normalize user ID for comparison
          const currentUserId = user?._id ? String(user._id) : null;
          if (!currentUserId) return false;
          
          const userParticipant = activity.participants.find((p: any) => {
            let participantUserId: string | null = null;
            
            if (p.userId) {
              if (typeof p.userId === 'object' && p.userId !== null) {
                participantUserId = String(p.userId._id || p.userId.$oid || p.userId);
              } else {
                participantUserId = String(p.userId?.$oid || p.userId || '');
              }
            }
            
            // Compare normalized IDs
            if (!participantUserId) return false;
            
            const normalizedParticipantId = participantUserId.trim();
            const normalizedCurrentUserId = currentUserId.trim();
            
            // Debug logging
            if (process.env.NODE_ENV === 'development') {
              console.log('Comparing user IDs:', {
                activityId: activity._id,
                activityName: activity.name,
                participantUserId: normalizedParticipantId,
                currentUserId: normalizedCurrentUserId,
                match: normalizedParticipantId === normalizedCurrentUserId
              });
            }
            
            return normalizedParticipantId === normalizedCurrentUserId;
          });
          
          if (!userParticipant) {
            // Debug: Log why activity was filtered out
            if (process.env.NODE_ENV === 'development') {
              console.log('Activity filtered out (user not in participants):', {
                activityId: activity._id,
                activityName: activity.name,
                participantsCount: activity.participants?.length || 0,
                currentUserId: currentUserId
              });
            }
            return false;
          }
          
          // For multiple days activities, ensure user has selected at least one slot
          if (activity.isMultipleDays && activity.type === 'multiple_days') {
            const registeredSlots = userParticipant.registeredDaySlots || [];
            if (registeredSlots.length === 0) {
              // Debug: Log activities without selected slots
              if (process.env.NODE_ENV === 'development') {
                console.log('Activity filtered out (no slots selected):', {
                  activityId: activity._id,
                  activityName: activity.name,
                  registeredSlots: registeredSlots
                });
              }
              return false; // User hasn't selected any slots yet
            }
          }
          
          // Add registration info to activity
          activity.isRegistered = true;
          activity.approvalStatus = userParticipant.approvalStatus || 'pending';
          activity.rejectionReason = userParticipant.rejectionReason;
          activity.rejectedBy = userParticipant.rejectedBy;
          activity.rejectedAt = userParticipant.rejectedAt;
          activity.registeredDaySlots = userParticipant.registeredDaySlots || [];
          
          // Debug: Log participant approval status
          if (process.env.NODE_ENV === 'development') {
            console.log('Activity included (user registered):', {
              activityId: activity._id,
              activityName: activity.name,
              userParticipantApprovalStatus: userParticipant.approvalStatus,
              activityApprovalStatus: activity.approvalStatus,
              registeredSlots: activity.registeredDaySlots,
              rejectionReason: userParticipant.rejectionReason
            });
          }
          
          return true;
        });

        // Apply time filter
        const now = new Date();
        const filteredByTime = registeredActivities.filter((activity: RawActivity) => {
          if (timeFilter === 'ALL') return true;
          
          const activityDate = activity.isMultipleDays && activity.endDate
            ? new Date(activity.endDate)
            : new Date(activity.date);
          
          if (timeFilter === 'upcoming') {
            return activityDate > now;
          } else if (timeFilter === 'ongoing') {
            const startDate = new Date(activity.date);
            return startDate <= now && activityDate >= now;
          } else if (timeFilter === 'past') {
            return activityDate < now;
          }
          return true;
        });

        // Apply status filter
        const filteredByStatus = filteredByTime.filter((activity: RawActivity) => {
          if (statusFilter === 'ALL') return true;
          return activity.approvalStatus === statusFilter;
        });

        setActivities(filteredByStatus);
        setTotalActivities(filteredByStatus.length);
      } else {
        throw new Error(data.error || 'Failed to load activities');
      }
    } catch (err) {
      console.error('Error loading activities:', err);
      setError(err instanceof Error ? err.message : 'Failed to load activities');
    } finally {
      setLoading(false);
    }
  };

  const handleUnregister = async (activityId: string) => {
    if (!isAuthenticated || !token || !user) {
      setError('Vui lòng đăng nhập để thực hiện thao tác này');
      return;
    }

    const activity = activities.find(a => a._id === activityId);
    if (!activity) {
      setError('Không tìm thấy hoạt động');
      return;
    }

    const isUnregistering = unregisteringActivities.has(activityId);
    if (isUnregistering) return;

    setUnregisteringActivities(prev => new Set(prev).add(activityId));
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/activities/${activityId}/register`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          userId: user._id
        }),
      });

      const contentType = response.headers.get('content-type');
      let result;
      
      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
      } else {
        const text = await response.text();
        try {
          result = JSON.parse(text);
        } catch {
          result = { success: response.ok, message: text || 'Operation completed' };
        }
      }

      if (result.success) {
        setSuccessMessage('Đã hủy đăng ký thành công');
        await loadActivities();
      } else {
        setError(result.message || 'Hủy đăng ký thất bại');
      }
    } catch (err) {
      console.error('Unregister error:', err);
      setError('Lỗi kết nối. Vui lòng thử lại.');
    } finally {
      setUnregisteringActivities(prev => {
        const newSet = new Set(prev);
        newSet.delete(activityId);
        return newSet;
      });
    }
  };

  const getActivityTimeStatus = (activity: RawActivity): 'before' | 'during' | 'after' => {
    const now = new Date();
    const activityDate = activity.isMultipleDays && activity.endDate
      ? new Date(activity.endDate)
      : new Date(activity.date);
    const startDate = new Date(activity.date);
    
    if (startDate > now) return 'before';
    if (activityDate < now) return 'after';
    return 'during';
  };

  const getActivityOverallStatus = (activity: RawActivity) => {
    const timeStatus = getActivityTimeStatus(activity);
    const approvalStatus = activity.approvalStatus || 'pending';
    
    if (timeStatus === 'before') {
      if (approvalStatus === 'approved') return { label: 'Đã phê duyệt', color: 'green' };
      if (approvalStatus === 'rejected') return { label: 'Đã từ chối', color: 'red' };
      return { label: 'Chờ phê duyệt', color: 'yellow' };
    } else if (timeStatus === 'during') {
      if (approvalStatus === 'approved') return { label: 'Đang diễn ra', color: 'red' };
      return { label: 'Đang diễn ra (Chưa phê duyệt)', color: 'orange' };
    } else {
      if (approvalStatus === 'approved') return { label: 'Đã kết thúc', color: 'gray' };
      return { label: 'Đã kết thúc (Chưa phê duyệt)', color: 'gray' };
    }
  };

  const getStatusColor = (color: string) => {
    if (isDarkMode) {
      switch (color) {
        case 'green': return 'bg-green-600/20 border-green-500/50 text-green-300';
        case 'red': return 'bg-red-600/20 border-red-500/50 text-red-300';
        case 'yellow': return 'bg-yellow-600/20 border-yellow-500/50 text-yellow-300';
        case 'orange': return 'bg-orange-600/20 border-orange-500/50 text-orange-300';
        default: return 'bg-gray-600/20 border-gray-500/50 text-gray-300';
      }
    } else {
      switch (color) {
        case 'green': return 'bg-green-50 border-green-300 text-green-700';
        case 'red': return 'bg-red-50 border-red-300 text-red-700';
        case 'yellow': return 'bg-yellow-50 border-yellow-300 text-yellow-700';
        case 'orange': return 'bg-orange-50 border-orange-300 text-orange-700';
        default: return 'bg-gray-50 border-gray-300 text-gray-700';
      }
    }
  };

  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
        <div className={`flex flex-col items-center justify-center ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          <Loader size={64} className={`animate-spin mb-6 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} strokeWidth={2} />
          <p className={`text-sm font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
            Đang kiểm tra quyền truy cập...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-200 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {isAuthenticated && <StudentNav key="student-nav" />}
      
      <main className={`flex-1 max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8 w-full ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
        {/* Header */}
        <div className={`mb-6 rounded-2xl p-6 ${
          isDarkMode 
            ? 'bg-gray-800 border border-gray-700/50' 
            : 'bg-white border border-gray-200 shadow-md'
        }`}>
          <div className="flex items-center gap-4">
            <div className={`flex-shrink-0 p-4 rounded-2xl ${
              isDarkMode 
                ? 'bg-gray-700/50' 
                : 'bg-gray-100'
            }`}>
              <CheckSquare size={32} className={isDarkMode ? 'text-gray-300' : 'text-gray-700'} strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className={`text-3xl sm:text-4xl font-extrabold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Hoạt động đã đăng ký
              </h1>
              <p className={`text-sm sm:text-base ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Xem và quản lý các hoạt động bạn đã đăng ký tham gia
              </p>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className={`w-full mb-6 rounded-lg border px-4 py-3 ${
          isDarkMode 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-gray-200 shadow-sm'
        }`}>
          <div className="flex flex-col lg:flex-row gap-3 items-stretch w-full">
            {/* Search Bar */}
            <div className="relative flex-1 min-w-0">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
                <Search 
                  size={16} 
                  className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} 
                  strokeWidth={2} 
                />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Tìm kiếm hoạt động..."
                className={`w-full pl-10 pr-9 py-2.5 text-sm font-medium transition-all duration-200 rounded-lg border ${
                  isDarkMode
                    ? 'bg-gray-700/50 text-white placeholder-gray-400 border-gray-600/50 focus:border-blue-500/50 focus:bg-gray-700'
                    : 'bg-white text-gray-900 placeholder-gray-500 border-gray-300/50 focus:border-blue-400/50 focus:bg-white'
                } shadow-sm focus:shadow-md focus:outline-none`}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  type="button"
                  className={`absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center transition-all duration-200 rounded ${
                    isDarkMode 
                      ? 'text-gray-400 hover:bg-gray-600 hover:text-white' 
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                  }`}
                >
                  <X size={14} strokeWidth={2} />
                </button>
              )}
            </div>

            {/* Filter Button */}
            <div className="relative filter-dropdown-container flex-shrink-0">
              <button
                onClick={() => setShowFilters(!showFilters)}
                type="button"
                className={`flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border transition-all whitespace-nowrap ${
                  isDarkMode
                    ? 'bg-gray-700/50 text-white border-gray-600/50 hover:border-blue-500/50 hover:bg-gray-700'
                    : 'bg-white text-gray-900 border-gray-300/50 hover:border-blue-400/50 hover:bg-white'
                } shadow-sm hover:shadow-md focus:outline-none ${
                  (statusFilter !== 'ALL' || timeFilter !== 'ALL')
                    ? isDarkMode ? 'border-blue-500/50 bg-blue-500/10' : 'border-blue-500 bg-blue-50'
                    : ''
                }`}
              >
                <Filter size={16} strokeWidth={2} />
                <span className="hidden sm:inline">Bộ lọc</span>
                <ChevronDown 
                  size={14} 
                  className={`transition-transform ${showFilters ? 'rotate-180' : ''}`}
                  strokeWidth={2}
                />
              </button>

              {/* Filter Dropdown */}
              {showFilters && (
                <div className={`absolute right-0 top-full mt-2 w-[320px] sm:w-[400px] rounded-xl border-2 shadow-2xl z-20 ${
                  isDarkMode
                    ? 'bg-gray-800 border-gray-700'
                    : 'bg-white border-gray-200'
                }`}>
                  <div className="p-4 space-y-4">
                    {/* Status Filter */}
                    <div>
                      <label className={`block text-xs font-semibold mb-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Trạng thái phê duyệt
                      </label>
                      <select
                        value={statusFilter}
                        onChange={(e) => {
                          setStatusFilter(e.target.value as 'ALL' | 'pending' | 'approved' | 'rejected');
                          setCurrentPage(1);
                        }}
                        className={`w-full px-3 py-2 text-sm rounded-lg border-2 transition-all ${
                          isDarkMode
                            ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500'
                            : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                        }`}
                      >
                        <option value="ALL">Tất cả</option>
                        <option value="pending">Chờ phê duyệt</option>
                        <option value="approved">Đã phê duyệt</option>
                        <option value="rejected">Đã từ chối</option>
                      </select>
                    </div>

                    {/* Time Filter */}
                    <div>
                      <label className={`block text-xs font-semibold mb-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Thời gian
                      </label>
                      <select
                        value={timeFilter}
                        onChange={(e) => {
                          setTimeFilter(e.target.value as 'ALL' | 'upcoming' | 'ongoing' | 'past');
                          setCurrentPage(1);
                        }}
                        className={`w-full px-3 py-2 text-sm rounded-lg border-2 transition-all ${
                          isDarkMode
                            ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500'
                            : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                        }`}
                      >
                        <option value="ALL">Tất cả</option>
                        <option value="upcoming">Sắp diễn ra</option>
                        <option value="ongoing">Đang diễn ra</option>
                        <option value="past">Đã kết thúc</option>
                      </select>
                    </div>

                    {/* Sort Order */}
                    <div>
                      <label className={`block text-xs font-semibold mb-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Sắp xếp
                      </label>
                      <select
                        value={`${sortBy}-${sortOrder}`}
                        onChange={(e) => {
                          const [newSortBy, newSortOrder] = e.target.value.split('-');
                          setSortBy(newSortBy as 'date' | 'name' | 'points');
                          setSortOrder(newSortOrder as 'asc' | 'desc');
                          setCurrentPage(1);
                        }}
                        className={`w-full px-3 py-2 text-sm rounded-lg border-2 transition-all ${
                          isDarkMode
                            ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500'
                            : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                        }`}
                      >
                        <option value="date-desc">Ngày (Mới nhất)</option>
                        <option value="date-asc">Ngày (Cũ nhất)</option>
                        <option value="name-asc">Tên (A-Z)</option>
                        <option value="name-desc">Tên (Z-A)</option>
                        <option value="points-desc">Điểm (Cao nhất)</option>
                        <option value="points-asc">Điểm (Thấp nhất)</option>
                      </select>
                    </div>

                    {/* Clear Filters Button */}
                    {(statusFilter !== 'ALL' || timeFilter !== 'ALL') && (
                      <button
                        onClick={() => {
                          setStatusFilter('ALL');
                          setTimeFilter('ALL');
                          setCurrentPage(1);
                        }}
                        className={`w-full px-3 py-2 text-sm font-medium rounded-lg border-2 transition-all ${
                          isDarkMode
                            ? 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600'
                            : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Xóa bộ lọc
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className={`mb-4 p-3 rounded-lg border ${
            isDarkMode ? 'bg-red-900/20 border-red-800 text-red-300' : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className={isDarkMode ? 'text-red-400' : 'text-red-600'} strokeWidth={1.5} />
              <p className="text-sm">{error}</p>
              <button
                onClick={() => setError(null)}
                className={`ml-auto ${isDarkMode ? 'hover:bg-red-900/30' : 'hover:bg-red-100'} p-1 rounded`}
              >
                <X size={14} className={isDarkMode ? 'text-red-400' : 'text-red-600'} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className={`mb-4 p-3 rounded-lg border ${
            isDarkMode ? 'bg-green-900/20 border-green-800 text-green-300' : 'bg-green-50 border-green-200 text-green-800'
          }`}>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className={isDarkMode ? 'text-green-400' : 'text-green-600'} strokeWidth={1.5} />
              <p className="text-sm">{successMessage}</p>
              <button
                onClick={() => setSuccessMessage(null)}
                className={`ml-auto ${isDarkMode ? 'hover:bg-green-900/30' : 'hover:bg-green-100'} p-1 rounded`}
              >
                <X size={14} className={isDarkMode ? 'text-green-400' : 'text-green-600'} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        )}

        {/* Activities List */}
        <div className={`w-full rounded-lg border overflow-hidden ${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          {/* Header */}
          <div className={`px-4 sm:px-6 py-4 sm:py-5 border-b-2 ${
            isDarkMode 
              ? 'bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 border-gray-600' 
              : 'bg-gradient-to-r from-gray-50 via-white to-gray-50 border-gray-300'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                isDarkMode 
                  ? 'bg-blue-500/20 text-blue-400' 
                  : 'bg-blue-100 text-blue-600'
              }`}>
                <CheckSquare size={24} strokeWidth={2.5} />
              </div>
              <h2 className={`text-xl sm:text-2xl lg:text-3xl font-extrabold ${
                isDarkMode 
                  ? 'text-white' 
                  : 'text-gray-900'
              }`}>
                Danh sách hoạt động đã đăng ký
              </h2>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-6">
            {loading && activities.length === 0 ? (
              <div className={`w-full min-h-[400px] flex items-center justify-center ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                <div className="flex flex-col items-center">
                  <Loader size={48} className="animate-spin mb-4" />
                  <p>Đang tải danh sách hoạt động...</p>
                </div>
              </div>
            ) : activities.length === 0 ? (
              <div className={`w-full min-h-[400px] rounded-lg border-2 border-dashed flex flex-col items-center justify-center py-16 ${
                isDarkMode ? 'border-gray-700 bg-gray-800/30' : 'border-gray-300 bg-gray-50'
              }`}>
                <CheckSquare size={56} className={`mb-5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} strokeWidth={1.5} />
                <p className={`text-lg sm:text-xl font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Chưa đăng ký hoạt động nào
                </p>
                <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                  {searchQuery || statusFilter !== 'ALL' || timeFilter !== 'ALL' 
                    ? 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm' 
                    : 'Hãy đăng ký tham gia các hoạt động từ trang chủ'}
                </p>
              </div>
            ) : (
              <>
                {/* Filtered Results Info */}
                {(searchQuery || statusFilter !== 'ALL' || timeFilter !== 'ALL') && (
                  <div className={`mb-4 px-3 py-2 rounded-lg border ${
                    isDarkMode 
                      ? 'bg-gray-800/50 border-gray-700 text-gray-300' 
                      : 'bg-gray-50 border-gray-200 text-gray-700'
                  }`}>
                    <p className="text-xs sm:text-sm">
                      Tìm thấy <span className="font-semibold">{totalActivities}</span> hoạt động
                      {searchQuery && ` cho "${searchQuery}"`}
                    </p>
                  </div>
                )}

                {/* Pagination - Top */}
                {!loading && activities.length > 0 && (
                  <div className={`mb-4 pb-3 border-b ${
                    isDarkMode ? 'border-gray-700' : 'border-gray-200'
                  }`}>
                    <PaginationBar
                      totalItems={totalActivities}
                      currentPage={currentPage}
                      itemsPerPage={activitiesPerPage}
                      onPageChange={(page) => setCurrentPage(page)}
                      onItemsPerPageChange={(newItemsPerPage) => {
                        setActivitiesPerPage(newItemsPerPage);
                        setCurrentPage(1);
                      }}
                      itemLabel="hoạt động"
                      isDarkMode={isDarkMode}
                      itemsPerPageOptions={[12, 24, 36, 48]}
                    />
                  </div>
                )}

                {/* Activities Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activities.map((activity) => {
                    const status = getActivityOverallStatus(activity);
                    const timeStatus = getActivityTimeStatus(activity);
                    const activityDate = activity.isMultipleDays && activity.endDate
                      ? new Date(activity.endDate)
                      : new Date(activity.date);
                    const startDate = new Date(activity.date);
                    
                    // Debug: Log approval status
                    if (process.env.NODE_ENV === 'development') {
                      console.log('Activity approval status:', {
                        activityId: activity._id,
                        activityName: activity.name,
                        approvalStatus: activity.approvalStatus,
                        timeStatus,
                        shouldShowUnregister: timeStatus === 'before' && activity.approvalStatus !== 'rejected'
                      });
                    }

                    return (
                      <div
                        key={activity._id}
                        className={`group rounded-xl border-2 overflow-hidden shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02] ${
                          isDarkMode 
                            ? 'bg-gray-800 border-gray-700 hover:border-gray-600' 
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {/* Status Badge Header */}
                        <div className={`px-4 py-3 border-b-2 ${getStatusColor(status.color)}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {status.color === 'green' && <CheckCircle2 size={14} className={isDarkMode ? 'text-green-400' : 'text-green-600'} strokeWidth={2} />}
                              {status.color === 'red' && <AlertCircle size={14} className={isDarkMode ? 'text-red-400' : 'text-red-600'} strokeWidth={2} />}
                              {status.color === 'yellow' && <Clock size={14} className={isDarkMode ? 'text-yellow-400' : 'text-yellow-600'} strokeWidth={2} />}
                              {status.color === 'orange' && <AlertCircle size={14} className={isDarkMode ? 'text-orange-400' : 'text-orange-600'} strokeWidth={2} />}
                              <span className="text-xs font-bold uppercase tracking-wide">
                                {status.label}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Activity Info */}
                        <div className="p-4">
                          {/* Image */}
                          {activity.imageUrl && (
                            <div className="mb-4 rounded-lg overflow-hidden">
                              <img
                                src={activity.imageUrl}
                                alt={activity.name}
                                className="w-full h-40 object-cover"
                              />
                            </div>
                          )}

                          {/* Title */}
                          <h3 className={`text-lg font-bold mb-2 line-clamp-2 ${
                            isDarkMode ? 'text-white' : 'text-gray-900'
                          }`}>
                            {activity.name}
                          </h3>

                          {/* Date and Time */}
                          <div className={`flex items-center gap-2 mb-2 ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            <Calendar size={14} />
                            <span className="text-xs">
                              {activity.isMultipleDays
                                ? `${startDate.toLocaleDateString('vi-VN')} - ${activityDate.toLocaleDateString('vi-VN')}`
                                : activityDate.toLocaleDateString('vi-VN')}
                            </span>
                          </div>

                          {/* Location */}
                          {activity.location && (
                            <div className={`flex items-center gap-2 mb-2 ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              <MapPin size={14} />
                              <span className="text-xs truncate">{activity.location}</span>
                            </div>
                          )}

                          {/* Points */}
                          {activity.points !== undefined && activity.points > 0 && (
                            <div className={`flex items-center gap-2 mb-3 ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              <Award size={14} />
                              <span className="text-xs font-semibold">{activity.points} điểm</span>
                            </div>
                          )}

                          {/* Rejection Details */}
                          {activity.approvalStatus === 'rejected' && (
                            <div className={`mb-3 p-3 rounded-lg border ${
                              isDarkMode 
                                ? 'bg-red-900/20 border-red-500/30' 
                                : 'bg-red-50 border-red-200'
                            }`}>
                              <div className="flex items-start gap-2">
                                <XCircle size={16} className={`mt-0.5 flex-shrink-0 ${
                                  isDarkMode ? 'text-red-400' : 'text-red-600'
                                }`} strokeWidth={2} />
                                <div className="flex-1 min-w-0">
                                  <p className={`text-xs font-semibold mb-1 ${
                                    isDarkMode ? 'text-red-300' : 'text-red-700'
                                  }`}>
                                    Đơn đăng ký đã bị từ chối
                                  </p>
                                  {activity.rejectionReason && (
                                    <p className={`text-xs mb-1 ${
                                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                    }`}>
                                      <span className="font-medium">Lý do: </span>
                                      {activity.rejectionReason}
                                    </p>
                                  )}
                                  {activity.rejectedAt && (
                                    <p className={`text-xs ${
                                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                    }`}>
                                      {new Date(activity.rejectedAt).toLocaleString('vi-VN')}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Registered Day Slots - For Multiple Days Activities */}
                          {activity.isMultipleDays && activity.type === 'multiple_days' && activity.registeredDaySlots && activity.registeredDaySlots.length > 0 && (
                            <div className={`mb-3 p-3 rounded-lg border ${
                              isDarkMode 
                                ? 'bg-[#3A57E8]/10 border-[#3A57E8]/30' 
                                : 'bg-blue-50 border-blue-200'
                            }`}>
                              <div className="flex items-start gap-2">
                                <CalendarDays size={16} className={`mt-0.5 flex-shrink-0 ${
                                  isDarkMode ? 'text-[#3A57E8]' : 'text-blue-600'
                                }`} strokeWidth={2} />
                                <div className="flex-1 min-w-0">
                                  <p className={`text-xs font-semibold mb-2 ${
                                    isDarkMode ? 'text-[#3A57E8]' : 'text-blue-700'
                                  }`}>
                                    Các buổi đã đăng ký
                                  </p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {(() => {
                                      // Group by day
                                      const dayGroups = activity.registeredDaySlots.reduce((acc: { [key: number]: string[] }, slot) => {
                                        if (!acc[slot.day]) {
                                          acc[slot.day] = [];
                                        }
                                        const slotName = slot.slot === 'morning' ? 'Sáng' : slot.slot === 'afternoon' ? 'Chiều' : 'Tối';
                                        acc[slot.day].push(slotName);
                                        return acc;
                                      }, {});

                                      return Object.entries(dayGroups).map(([day, slots]) => (
                                        <div
                                          key={day}
                                          className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium border ${
                                            isDarkMode
                                              ? 'bg-[#3A57E8]/20 border-[#3A57E8]/50 text-[#3A57E8]'
                                              : 'bg-blue-100 border-blue-300 text-blue-700'
                                          }`}
                                        >
                                          <span className="font-bold">Ngày {day}:</span>
                                          <div className="flex items-center gap-1">
                                            {slots.map((slotName, idx) => {
                                              const SlotIcon = slotName === 'Sáng' ? Sunrise : slotName === 'Chiều' ? Sun : Moon;
                                              return (
                                                <span key={idx} className="flex items-center gap-0.5">
                                                  <SlotIcon size={10} strokeWidth={2} />
                                                  {slotName}
                                                </span>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      ));
                                    })()}
                                  </div>
                                  {activity.schedule && activity.schedule.length > 0 && (() => {
                                    const totalAvailableSlots = activity.schedule.length * 3;
                                    const registeredCount = activity.registeredDaySlots.length;
                                    const percentage = totalAvailableSlots > 0 
                                      ? Math.round((registeredCount / totalAvailableSlots) * 100) 
                                      : 0;
                                    
                                    return (
                                      <p className={`text-xs mt-2 ${
                                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                      }`}>
                                        Đã đăng ký: <span className="font-semibold">{registeredCount}/{totalAvailableSlots}</span> buổi ({percentage}%)
                                      </p>
                                    );
                                  })()}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex flex-col gap-2 mt-4">
                            <button
                              onClick={() => router.push(`/student/activities/${activity._id}`)}
                              className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                                isDarkMode
                                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                  : 'bg-blue-600 hover:bg-blue-700 text-white'
                              }`}
                            >
                              <div className="flex items-center justify-center gap-2">
                                <Eye size={14} />
                                <span>Xem chi tiết</span>
                              </div>
                            </button>

                            {/* Check-in button for ongoing approved activities */}
                            {timeStatus === 'during' && activity.approvalStatus === 'approved' && (
                              <button
                                onClick={() => router.push(`/student/attendance/${activity._id}`)}
                                className={`w-full py-2 px-4 rounded-lg text-sm font-bold transition-all border-2 shadow-lg hover:shadow-xl ${
                                  isDarkMode 
                                    ? 'bg-gradient-to-r from-red-600 via-red-500 to-red-600 text-white border-red-400 hover:from-red-500 hover:via-red-400 hover:to-red-500' 
                                    : 'bg-gradient-to-r from-red-500 via-red-600 to-red-500 text-white border-red-400 hover:from-red-600 hover:via-red-700 hover:to-red-600'
                                }`}
                              >
                                <div className="flex items-center justify-center gap-2">
                                  <CheckSquare size={14} />
                                  <span>Điểm danh ngay</span>
                                </div>
                              </button>
                            )}

                            {/* Unregister button - Only show if not rejected or removed */}
                            {(() => {
                              const canUnregister = timeStatus === 'before' && 
                                                   activity.approvalStatus !== 'rejected' && 
                                                   activity.approvalStatus !== 'removed';
                              
                              // Debug: Log unregister button visibility
                              if (process.env.NODE_ENV === 'development') {
                                console.log('Unregister button check:', {
                                  activityId: activity._id,
                                  activityName: activity.name,
                                  timeStatus,
                                  approvalStatus: activity.approvalStatus,
                                  canUnregister
                                });
                              }
                              
                              return canUnregister ? (
                                <button
                                  onClick={() => handleUnregister(activity._id)}
                                  disabled={unregisteringActivities.has(activity._id)}
                                  className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                                    isDarkMode
                                      ? 'bg-gray-700 hover:bg-gray-600 text-white disabled:opacity-50'
                                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700 disabled:opacity-50'
                                  }`}
                                >
                                  {unregisteringActivities.has(activity._id) ? (
                                    <div className="flex items-center justify-center gap-2">
                                      <Loader size={14} className="animate-spin" />
                                      <span>Đang xử lý...</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-center gap-2">
                                      <X size={14} />
                                      <span>Hủy đăng ký</span>
                                    </div>
                                  )}
                                </button>
                              ) : null;
                            })()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination - Bottom */}
                {!loading && activities.length > 0 && (
                  <div className={`mt-4 pt-3 border-t ${
                    isDarkMode ? 'border-gray-700' : 'border-gray-200'
                  }`}>
                    <PaginationBar
                      totalItems={totalActivities}
                      currentPage={currentPage}
                      itemsPerPage={activitiesPerPage}
                      onPageChange={(page) => setCurrentPage(page)}
                      onItemsPerPageChange={(newItemsPerPage) => {
                        setActivitiesPerPage(newItemsPerPage);
                        setCurrentPage(1);
                      }}
                      itemLabel="hoạt động"
                      isDarkMode={isDarkMode}
                      itemsPerPageOptions={[12, 24, 36, 48]}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {isAuthenticated && <Footer isDarkMode={isDarkMode} />}
    </div>
  );
}

