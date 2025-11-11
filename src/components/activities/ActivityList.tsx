'use client';

import { useState, useEffect } from 'react';

interface Activity {
  _id: string;
  name: string;
  description: string;
  date: string;
  timeSlots: Array<{
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    isActive: boolean;
    activities: string;
  }>;
  location: string;
  locationData?: {
    lat: number;
    lng: number;
    address: string;
    radius: number;
  };
  multiTimeLocations?: Array<{
    id: string;
    timeSlot: 'morning' | 'afternoon' | 'evening';
    location: {
      lat: number;
      lng: number;
      address?: string;
    };
    radius: number;
  }>;
  maxParticipants: number;
  visibility: 'public' | 'private';
  responsiblePerson?: {
    name: string;
    email: string;
  };
  status: 'draft' | 'published' | 'cancelled' | 'completed' | 'ongoing' | 'postponed';
  type: 'single_day' | 'multiple_days';
  imageUrl?: string;
  overview?: string;
  participants: Array<{
    userId: string;
    name: string;
    email: string;
    role: string;
    joinedAt: string;
    avatarUrl?: string;
  }>;
  createdBy?: {
    name: string;
    email: string;
  };
  createdAt: string;
}

interface ActivityListProps {
  isDarkMode: boolean;
  showActions?: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onView?: (id: string) => void;
}

export default function ActivityList({ 
  isDarkMode, 
  showActions = true,
  onEdit, 
  onDelete, 
  onView 
}: ActivityListProps) {
  // State for activities from API
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalActivities, setTotalActivities] = useState(0);
  const [itemsPerPage] = useState(6);

	// Temporal grouping: upcoming | ongoing | past | all
	const [temporalFilter, setTemporalFilter] = useState<'all' | 'upcoming' | 'ongoing' | 'past'>('all');
	// Client-side sort
	const [sortBy, setSortBy] = useState<'date_asc' | 'date_desc'>('date_asc');

  // Fetch activities from API
  const fetchActivities = async (page: number = 1, search: string = '', status: string = 'all', type: string = 'all') => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString(),
        search: search,
        status: status,
        type: type
      });
      
      const response = await fetch(`/api/activities?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setActivities(data.data.activities);
        setTotalPages(data.data.pagination.totalPages);
        setTotalActivities(data.data.pagination.total);
        setCurrentPage(page);
      } else {
        setError('Không thể tải danh sách hoạt động');
      }
    } catch (err) {
      setError('Có lỗi xảy ra khi tải dữ liệu');
      console.error('Error fetching activities:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchActivities();
  }, []);

  // Handle search and filter changes
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
    fetchActivities(1, value, statusFilter, typeFilter);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
    fetchActivities(1, searchTerm, value, typeFilter);
  };

  const handleTypeFilterChange = (value: string) => {
    setTypeFilter(value);
    setCurrentPage(1);
    fetchActivities(1, searchTerm, statusFilter, value);
  };

  const handlePageChange = (page: number) => {
    fetchActivities(page, searchTerm, statusFilter, typeFilter);
  };

	const clearAllFilters = () => {
		setSearchTerm('');
		setStatusFilter('all');
		setTypeFilter('all');
		setTemporalFilter('all');
		setCurrentPage(1);
		fetchActivities(1, '', 'all', 'all');
	};

	// Compute temporal status from date + timeSlots
	const getTemporalStatus = (activity: Activity): 'upcoming' | 'ongoing' | 'past' => {
		try {
			const activityDate = new Date(activity.date);
			// If no active time slots, fallback to status field
			const activeSlots = (activity.timeSlots || []).filter((s) => s.isActive);

			// Normalize to today of activity date using slot times (HH:mm)
			let start: Date | null = null;
			let end: Date | null = null;

			if (activeSlots.length > 0) {
				activeSlots.forEach((slot) => {
					// slot.startTime like "08:00", "18:30" -> combine with activity date
					const [sh, sm] = (slot.startTime || '00:00').split(':').map((v) => parseInt(v, 10));
					const [eh, em] = (slot.endTime || '00:00').split(':').map((v) => parseInt(v, 10));
					const s = new Date(activityDate);
					s.setHours(sh || 0, sm || 0, 0, 0);
					const e = new Date(activityDate);
					e.setHours(eh || 0, em || 0, 0, 0);
					if (start == null) {
						start = s;
					} else if (s.getTime() < start.getTime()) {
						start = s;
					}
					if (end == null) {
						end = e;
					} else if (e.getTime() > end.getTime()) {
						end = e;
					}
				});
			}

			const now = new Date();

			// If status field already marks completion/cancel, treat as past for clarity
			if (activity.status === 'completed' || activity.status === 'cancelled') {
				return 'past';
			}

			// If we have concrete times
			if (start && end) {
				const nowMs = now.getTime();
				const startMs = (start as Date).getTime();
				const endMs = (end as Date).getTime();
				if (nowMs < startMs) return 'upcoming';
				if (nowMs >= startMs && nowMs <= endMs) return 'ongoing';
				return 'past';
			}

			// Fallbacks by status
			if (activity.status === 'ongoing') return 'ongoing';
			if (activity.status === 'published') {
				// Without times, consider future by default when published
				if (now <= activityDate) return 'upcoming';
				return 'past';
			}

			// Default
			return 'upcoming';
		} catch {
			return 'upcoming';
		}
	};

	// Ongoing progress percentage (0..100) based on now between start..end
	const getOngoingProgressPercent = (activity: Activity): number | null => {
		try {
			const activityDate = new Date(activity.date);
			const activeSlots = (activity.timeSlots || []).filter((s) => s.isActive);
			if (activeSlots.length === 0) return null;

			let start: Date | null = null;
			let end: Date | null = null;
			activeSlots.forEach((slot) => {
				const [sh, sm] = (slot.startTime || '00:00').split(':').map((v) => parseInt(v, 10));
			 const [eh, em] = (slot.endTime || '00:00').split(':').map((v) => parseInt(v, 10));
				const s = new Date(activityDate);
				s.setHours(sh || 0, sm || 0, 0, 0);
				const e = new Date(activityDate);
				e.setHours(eh || 0, em || 0, 0, 0);
				if (start == null) {
					start = s;
				} else if (s.getTime() < start.getTime()) {
					start = s;
				}
				if (end == null) {
					end = e;
				} else if (e.getTime() > end.getTime()) {
					end = e;
				}
			});

			if (start == null || end == null) return null;
			const now = new Date().getTime();
			const startMs = (start as Date).getTime();
			const endMs = (end as Date).getTime();
			const total = endMs - startMs;
			const elapsed = now - startMs;
			if (total <= 0) return null;
			const pct = Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)));
			return pct;
		} catch {
		 return null;
		}
	};

	// Derived: counts per temporal bucket (for tabs)
	const temporalCounts = (() => {
		const base = { all: activities.length, upcoming: 0, ongoing: 0, past: 0 };
		for (const a of activities) {
			const ts = getTemporalStatus(a);
			if (ts === 'upcoming') base.upcoming++;
			else if (ts === 'ongoing') base.ongoing++;
			else base.past++;
		}
		return base;
	})();

  const getStatusConfig = (status: string) => {
    const statusConfig: { [key: string]: { bg: string; text: string; label: string; icon: string } } = {
      draft: { bg: isDarkMode ? 'bg-yellow-900/20 border-yellow-500/30' : 'bg-yellow-50 border-yellow-200', text: isDarkMode ? 'text-yellow-300' : 'text-yellow-700', label: 'Nháp', icon: '📝' },
      published: { bg: isDarkMode ? 'bg-green-900/20 border-green-500/30' : 'bg-green-50 border-green-200', text: isDarkMode ? 'text-green-300' : 'text-green-700', label: 'Đã xuất bản', icon: '✅' },
      ongoing: { bg: isDarkMode ? 'bg-blue-900/20 border-blue-500/30' : 'bg-blue-50 border-blue-200', text: isDarkMode ? 'text-blue-300' : 'text-blue-700', label: 'Đang diễn ra', icon: '🔄' },
      completed: { bg: isDarkMode ? 'bg-purple-900/20 border-purple-500/30' : 'bg-purple-50 border-purple-200', text: isDarkMode ? 'text-purple-300' : 'text-purple-700', label: 'Hoàn thành', icon: '🎉' },
      cancelled: { bg: isDarkMode ? 'bg-red-900/20 border-red-500/30' : 'bg-red-50 border-red-200', text: isDarkMode ? 'text-red-300' : 'text-red-700', label: 'Đã hủy', icon: '❌' },
      postponed: { bg: isDarkMode ? 'bg-orange-900/20 border-orange-500/30' : 'bg-orange-50 border-orange-200', text: isDarkMode ? 'text-orange-300' : 'text-orange-700', label: 'Tạm hoãn', icon: '⏸️' },
    };
    return statusConfig[status] || statusConfig.draft;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatTime = (timeString: string) => {
    return timeString.substring(0, 5);
  };

  if (loading) {
    return (
      <div className={`text-center py-12 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p>Đang tải danh sách hoạt động...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center py-12 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
        <p className="mb-4">❌ {error}</p>
        <button
          onClick={() => fetchActivities()}
          className={`px-4 py-2 rounded-lg ${
            isDarkMode 
              ? 'bg-blue-600 hover:bg-blue-700 text-white' 
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toolbar hiện đại (sticky) */}
      <div className="sticky top-0 z-20 -mx-1 px-1">
        <div className={`relative rounded-2xl p-4 sm:p-5 mb-2 shadow-xl backdrop-blur-xl transition-all duration-300 ${
          isDarkMode 
            ? 'bg-gradient-to-br from-gray-900/95 via-gray-800/95 to-gray-900/95 ring-1 ring-gray-700/50 shadow-gray-900/20' 
            : 'bg-gradient-to-br from-white/95 via-blue-50/30 to-purple-50/30 ring-1 ring-gray-200/50 shadow-gray-200/20'
        }`}>
          {/* Decorative gradient overlay */}
          <div className={`absolute inset-0 rounded-2xl opacity-30 pointer-events-none ${
            isDarkMode 
              ? 'bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10' 
              : 'bg-gradient-to-br from-blue-400/5 via-purple-400/5 to-pink-400/5'
          }`}></div>
          
          <div className="relative flex flex-col gap-3">
            {/* Hàng 1: Header + Search + 3 Filters + Button - Cân đối hoàn hảo */}
            <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr_auto] items-center gap-3">
              {/* Header bên trái */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-md flex-shrink-0 ${
                  isDarkMode 
                    ? 'bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 ring-1 ring-blue-500/30' 
                    : 'bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 ring-1 ring-blue-200/50'
                }`}>
                  🎯
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className={`text-lg sm:text-xl font-extrabold bg-gradient-to-r ${
                      isDarkMode 
                        ? 'from-white via-gray-100 to-gray-300 bg-clip-text text-transparent' 
                        : 'from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent'
                    }`}>
                      Hoạt động
                    </h2>
                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap ${
                      isDarkMode 
                        ? 'bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/30' 
                        : 'bg-blue-100 text-blue-700 ring-1 ring-blue-200'
                    }`}>
                      {totalActivities}
                    </span>
                  </div>
                </div>
              </div>

              {/* Search Bar + 3 Filters - Cùng hàng, phân bố đều, không có khoảng trống */}
              <div className="flex items-center gap-2 min-w-0">
                {/* Search Bar */}
                <div className="relative group flex-1 min-w-[200px]">
                  <div className={`absolute inset-0 rounded-lg blur-md opacity-30 group-hover:opacity-50 transition-opacity duration-300 ${
                    isDarkMode ? 'bg-blue-500/20' : 'bg-blue-400/20'
                  }`}></div>
                  <div className="relative">
                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
                      <svg className={`w-3.5 h-3.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      placeholder="Tìm kiếm..."
                      className={`w-full pl-9 pr-7 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-300 ${
                        isDarkMode
                          ? 'bg-gray-800/80 text-white placeholder-gray-500 ring-1 ring-gray-700/50 focus:ring-2 focus:ring-blue-500/50 focus:bg-gray-800'
                          : 'bg-white/90 text-gray-900 placeholder-gray-500 ring-1 ring-gray-200/50 focus:ring-2 focus:ring-blue-400/50 focus:bg-white'
                      } shadow-sm focus:shadow-md`}
                    />
                    {searchTerm && (
                      <button
                        onClick={() => handleSearchChange('')}
                        className={`absolute right-1.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 rounded flex items-center justify-center transition-all duration-200 ${
                          isDarkMode 
                            ? 'text-gray-400 hover:bg-gray-700/50 hover:text-white' 
                            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                        }`}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {/* 3 Filters - Kích thước đều nhau */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Sort Select */}
                  <div className="relative w-[110px]">
                    <div className={`absolute left-2.5 top-1/2 -translate-y-1/2 z-10 pointer-events-none ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                      </svg>
                    </div>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as 'date_asc' | 'date_desc')}
                      className={`w-full pl-8 pr-2 py-2 rounded-lg text-xs font-medium appearance-none transition-all duration-200 ${
                        isDarkMode 
                          ? 'bg-gray-800/80 text-gray-200 ring-1 ring-gray-700/50 focus:ring-2 focus:ring-blue-500/50' 
                          : 'bg-white/90 text-gray-800 ring-1 ring-gray-300/50 focus:ring-2 focus:ring-blue-400/50'
                      } shadow-sm hover:shadow-md focus:shadow-lg`}
                    >
                      <option value="date_asc">📅 Tăng dần</option>
                      <option value="date_desc">📅 Giảm dần</option>
                    </select>
                  </div>

                  {/* Type Filter */}
                  <div className="relative w-[110px]">
                    <div className={`absolute left-2.5 top-1/2 -translate-y-1/2 z-10 pointer-events-none ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    </div>
                    <select
                      value={typeFilter}
                      onChange={(e) => handleTypeFilterChange(e.target.value)}
                      className={`w-full pl-8 pr-2 py-2 rounded-lg text-xs font-medium appearance-none transition-all duration-200 ${
                        isDarkMode 
                          ? 'bg-gray-800/80 text-gray-200 ring-1 ring-gray-700/50 focus:ring-2 focus:ring-blue-500/50' 
                          : 'bg-white/90 text-gray-800 ring-1 ring-gray-300/50 focus:ring-2 focus:ring-blue-400/50'
                      } shadow-sm hover:shadow-md focus:shadow-lg`}
                    >
                      <option value="all">Tất cả loại</option>
                      <option value="single_day">📅 Một ngày</option>
                      <option value="multiple_days">📆 Nhiều ngày</option>
                    </select>
                  </div>

                  {/* Status Filter */}
                  <div className="relative w-[110px]">
                    <div className={`absolute left-2.5 top-1/2 -translate-y-1/2 z-10 pointer-events-none ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <select
                      value={statusFilter}
                      onChange={(e) => handleStatusFilterChange(e.target.value)}
                      className={`w-full pl-8 pr-2 py-2 rounded-lg text-xs font-medium appearance-none transition-all duration-200 ${
                        isDarkMode 
                          ? 'bg-gray-800/80 text-gray-200 ring-1 ring-gray-700/50 focus:ring-2 focus:ring-blue-500/50' 
                          : 'bg-white/90 text-gray-800 ring-1 ring-gray-300/50 focus:ring-2 focus:ring-blue-400/50'
                      } shadow-sm hover:shadow-md focus:shadow-lg`}
                    >
                      <option value="all">Tất cả trạng thái</option>
                      <option value="draft">📝 Nháp</option>
                      <option value="published">✅ Xuất bản</option>
                      <option value="cancelled">❌ Hủy</option>
                      <option value="postponed">⏸️ Hoãn</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Button Tạo hoạt động */}
              {showActions && (
                <button
                  onClick={() => window.location.href = '/admin/activities/create-single'}
                  className={`group relative inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-bold shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex-shrink-0 ${
                    isDarkMode 
                      ? 'bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white hover:from-blue-500 hover:via-purple-500 hover:to-pink-500' 
                      : 'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white hover:from-blue-400 hover:via-purple-400 hover:to-pink-400'
                  }`}
                >
                  <span className="relative z-10 flex items-center gap-1.5">
                    <span className="text-xs group-hover:scale-110 transition-transform duration-300">✨</span>
                    <span className="hidden sm:inline">Tạo hoạt động</span>
                    <span className="sm:hidden">Tạo mới</span>
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                </button>
              )}
            </div>

            {/* Hàng 2: Temporal Tabs - Căn giữa */}
            <div className="flex items-center justify-center gap-3 flex-wrap">
              {/* Temporal Filter Tabs - Kích thước đều nhau */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <div className={`inline-flex gap-1 p-1 rounded-lg transition-all duration-300 ${
                  isDarkMode 
                    ? 'bg-gray-800/60 ring-1 ring-gray-700/50 shadow-sm' 
                    : 'bg-white/70 ring-1 ring-gray-200/50 shadow-sm'
                }`}>
                  {([
                    { key: 'all', label: 'Tất cả', icon: '📋', count: temporalCounts.all, color: isDarkMode ? 'from-gray-600 to-gray-700' : 'from-gray-700 to-gray-800' },
                    { key: 'upcoming', label: 'Sắp diễn ra', icon: '⏰', count: temporalCounts.upcoming, color: isDarkMode ? 'from-blue-600 to-blue-700' : 'from-blue-500 to-blue-600' },
                    { key: 'ongoing', label: 'Đang diễn ra', icon: '🔄', count: temporalCounts.ongoing, color: isDarkMode ? 'from-green-600 to-green-700' : 'from-green-500 to-green-600' },
                    { key: 'past', label: 'Đã kết thúc', icon: '✅', count: temporalCounts.past, color: isDarkMode ? 'from-purple-600 to-purple-700' : 'from-purple-500 to-purple-600' },
                  ] as Array<{ key: 'all' | 'upcoming' | 'ongoing' | 'past'; label: string; icon: string; count: number; color: string }>).map((tab) => {
                    const active = temporalFilter === tab.key;
                    return (
                      <button
                        key={tab.key}
                        onClick={() => setTemporalFilter(tab.key)}
                        className={`group relative px-2.5 py-1.5 rounded-md text-xs font-bold transition-all duration-300 overflow-hidden whitespace-nowrap ${
                          active
                            ? `bg-gradient-to-r ${tab.color} text-white shadow-sm scale-105`
                            : isDarkMode 
                              ? 'text-gray-300 hover:bg-gray-700/50 hover:text-white' 
                              : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                        }`}
                      >
                        <span className="relative z-10 flex items-center gap-1">
                          <span className="text-xs flex-shrink-0">{tab.icon}</span>
                          <span className="hidden sm:inline">{tab.label}</span>
                          <span className={`px-1 py-0.5 rounded text-[9px] font-extrabold whitespace-nowrap ${
                            active 
                              ? 'bg-white/20 text-white' 
                              : isDarkMode 
                                ? 'bg-gray-700/50 text-gray-300' 
                                : 'bg-gray-200 text-gray-700'
                          }`}>
                            {tab.count}
                          </span>
                        </span>
                        {active && (
                          <div className="absolute inset-0 animate-shimmer"></div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer Info - Gọn hơn */}
            {(searchTerm || statusFilter !== 'all' || typeFilter !== 'all' || temporalFilter !== 'all') && (
              <div className="flex items-center justify-end pt-1.5 border-t border-gray-200/50 dark:border-gray-700/50">
                <button
                  onClick={clearAllFilters}
                  className={`group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ${
                    isDarkMode 
                      ? 'bg-gray-800/80 text-gray-200 ring-1 ring-gray-700/50 hover:bg-gray-700/80 hover:ring-gray-600/50' 
                      : 'bg-white/90 text-gray-700 ring-1 ring-gray-300/50 hover:bg-gray-50 hover:ring-gray-400/50'
                  } shadow-sm hover:shadow-md`}
                  title="Xóa tất cả bộ lọc"
                >
                  <svg className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>Xóa bộ lọc</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Activities Grid */}
			{activities.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 lg:gap-6">
					{[...activities]
						.sort((a, b) => {
							const ad = new Date(a.date).getTime();
							const bd = new Date(b.date).getTime();
							return sortBy === 'date_asc' ? ad - bd : bd - ad;
						})
						.filter((a) => {
							if (temporalFilter === 'all') return true;
							return getTemporalStatus(a) === temporalFilter;
						})
						.map((activity) => {
                  const participantCount = activity.participants?.length || 0;
            const maxParticipants = activity.maxParticipants || Infinity;
            const participationPercent = maxParticipants !== Infinity 
              ? Math.round((participantCount / maxParticipants) * 100) 
              : 0;
            const activeTimeSlots = activity.timeSlots?.filter((slot: any) => slot.isActive) || [];
            const statusConfig = getStatusConfig(activity.status);
						const temporalStatus = getTemporalStatus(activity);
						const ongoingPct = temporalStatus === 'ongoing' ? getOngoingProgressPercent(activity) : null;
						const neutralBorder = isDarkMode ? 'border-gray-700/60' : 'border-gray-200/80';

            return (
              <div
                key={activity._id} 
                className={`group relative overflow-hidden rounded-xl sm:rounded-2xl transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${isDarkMode ? 'bg-gray-900/60 ring-1 ring-gray-700/60' : 'bg-white/90 ring-1 ring-gray-200/70'}`}
              >
                {/* Activity Image */}
                <div className="relative w-full h-48 sm:h-52 md:h-44 lg:h-48 overflow-hidden">
                            {activity.imageUrl ? (
                              <>
                                <img 
                                  src={activity.imageUrl} 
                                  alt={activity.name}
                                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 brightness-100"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    const placeholder = target.nextElementSibling as HTMLElement;
                                    if (placeholder) {
                                      placeholder.style.display = 'flex';
                                    }
                                  }}
                                />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent"></div>
                                <div 
                                  className={`w-full h-full flex items-center justify-center ${isDarkMode ? 'bg-gradient-to-br from-blue-600/30 via-purple-600/30 to-pink-600/30' : 'bg-gradient-to-br from-blue-400/20 via-purple-400/20 to-pink-400/20'}`}
                                  style={{ display: 'none', position: 'absolute', top: 0, left: 0 }}
                                >
                        <span className="text-6xl">🎯</span>
                                </div>
                              </>
                            ) : (
                              <div 
                                className={`w-full h-full flex items-center justify-center ${isDarkMode ? 'bg-gradient-to-br from-blue-600/30 via-purple-600/30 to-pink-600/30' : 'bg-gradient-to-br from-blue-400/20 via-purple-400/20 to-pink-400/20'}`}
                              >
                      <span className="text-6xl">🎯</span>
                              </div>
                            )}
                  
                  {/* Status Badge - Top Right */}
                  <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
                    <span className={`inline-flex items-center px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold shadow-lg backdrop-blur-sm ${statusConfig.bg} ${statusConfig.text}`}>
                      <span className="mr-1 text-xs sm:text-sm">{statusConfig.icon}</span>
                      <span className="hidden sm:inline">{statusConfig.label}</span>
                      <span className="sm:hidden">{statusConfig.label.split(' ')[0]}</span>
                    </span>
                  </div>
                          
                  {/* Type & Visibility Badges - Top Left */}
                  <div className="absolute top-3 left-3 sm:top-4 sm:left-4 flex flex-col gap-1.5 sm:gap-2">
                    <span className={`inline-flex items-center px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold shadow-lg backdrop-blur-sm ${isDarkMode ? 'bg-gray-900/50 text-gray-100' : 'bg-white/90 text-gray-800'}`}>
                      <span className="hidden sm:inline">{activity.type === 'single_day' ? '📅 1 ngày' : '📆 Nhiều ngày'}</span>
                      <span className="sm:hidden">{activity.type === 'single_day' ? '📅' : '📆'}</span>
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold shadow-lg backdrop-blur-sm ${isDarkMode ? 'bg-gray-900/50 text-gray-100' : 'bg-white/90 text-gray-800'}`}>
                      <span className="hidden sm:inline">{activity.visibility === 'public' ? '🌐 Cộng đồng' : '🔒 Riêng tư'}</span>
                      <span className="sm:hidden">{activity.visibility === 'public' ? '🌐' : '🔒'}</span>
                    </span>
                  </div>

                  {/* Title Overlay */}
									<div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-t from-black/60 via-black/30 to-transparent">
										<h3 className={`font-extrabold text-lg sm:text-xl leading-tight mb-1 drop-shadow-2xl truncate text-white`}>
                      {activity.name}
                    </h3>
                    {activity.description && (
											<p className={`text-[11px] sm:text-xs leading-relaxed line-clamp-2 break-words text-white/90 drop-shadow-lg`}>
                        {activity.description}
                      </p>
                    )}
                  </div>
                        </div>
                      
                {/* Content Section */}
                <div className="p-4 sm:p-5 space-y-4">
                  {/* Thông tin ngày tháng - Rõ ràng hơn */}
                  <div className={`p-3 sm:p-4 rounded-xl border ${
                    isDarkMode ? 'bg-gray-800/50 border-gray-700/50' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex-shrink-0 flex flex-col items-center justify-center font-extrabold border-2 ${
                        isDarkMode ? 'bg-gradient-to-br from-blue-600/20 to-purple-600/20 border-blue-500/30 text-blue-300' : 'bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200 text-blue-700'
                      }`}>
                        <span className="text-lg sm:text-xl">{new Date(activity.date).getDate()}</span>
                        <span className="text-[8px] sm:text-[9px] font-medium opacity-80">
                          {new Date(activity.date).toLocaleDateString('vi-VN', { month: 'short' })}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${
                            temporalStatus === 'upcoming' 
                              ? isDarkMode ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-blue-100 text-blue-700 border border-blue-200'
                              : temporalStatus === 'ongoing'
                              ? isDarkMode ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-green-100 text-green-700 border border-green-200'
                              : isDarkMode ? 'bg-gray-500/20 text-gray-300 border border-gray-500/30' : 'bg-gray-100 text-gray-700 border border-gray-200'
                          }`}>
                            {temporalStatus === 'upcoming' ? '⏰' : temporalStatus === 'ongoing' ? '🔄' : '✅'}
                            <span className="ml-1.5">{temporalStatus === 'upcoming' ? 'Sắp diễn ra' : temporalStatus === 'ongoing' ? 'Đang diễn ra' : 'Đã kết thúc'}</span>
                          </span>
                        </div>
                        <p className={`text-sm font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                          {formatDate(activity.date)}
                        </p>
                        {ongoingPct !== null && (
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1 h-2 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                              <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${ongoingPct}%` }} />
                            </div>
                            <span className={`text-xs font-bold ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>{ongoingPct}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Thời gian và địa điểm - Nhóm lại rõ ràng */}
                  {(activeTimeSlots.length > 0 || (activity.location && activity.location !== 'Nhiều địa điểm')) && (
                    <div className={`p-3 sm:p-4 rounded-xl border ${
                      isDarkMode ? 'bg-gray-800/50 border-gray-700/50' : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-base">📅</span>
                        <h4 className={`text-sm font-bold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                          Lịch trình
                        </h4>
                      </div>
                      {activeTimeSlots.length > 0 ? (
                        <div className="space-y-2.5">
                          {activeTimeSlots.map((slot: any, index: number) => {
                            const timeSlotMap: { [key: string]: 'morning' | 'afternoon' | 'evening' } = {
                              'Buổi Sáng': 'morning',
                              'Buổi Chiều': 'afternoon',
                              'Buổi Tối': 'evening'
                            };
                            const timeSlotKey = timeSlotMap[slot.name] || (index === 0 ? 'morning' : index === 1 ? 'afternoon' : 'evening');
                            const locationForSlot = activity.multiTimeLocations?.find((loc: any) => loc.timeSlot === timeSlotKey);
                            return (
                              <div key={slot.id || index} className={`p-2.5 rounded-lg border ${
                                isDarkMode ? 'bg-gray-900/40 border-gray-700/50' : 'bg-white border-gray-200'
                              }`}>
                                <div className="flex items-center justify-between gap-2 mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm">🕐</span>
                                    <p className={`text-xs font-bold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                      {slot.name || `Buổi ${index + 1}`}
                                    </p>
                                  </div>
                                  <span className={`text-xs font-bold px-2 py-1 rounded ${
                                    isDarkMode ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-700'
                                  }`}>
                                    {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                                  </span>
                                </div>
                                {locationForSlot && locationForSlot.location?.address && (
                                  <div className="flex items-start gap-2 pl-6">
                                    <span className="text-xs flex-shrink-0 mt-0.5">📍</span>
                                    <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} line-clamp-2 break-words flex-1`}>
                                      {locationForSlot.location.address}
                                    </p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex items-start gap-2">
                          <span className="text-sm flex-shrink-0 mt-0.5">📍</span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} line-clamp-2 break-words`}>
                              {activity.location}
                            </p>
                            {activity.locationData?.radius && (
                              <span className={`inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded ${
                                isDarkMode ? 'text-blue-300 bg-gray-900/40' : 'text-blue-700 bg-white'
                              }`}>{activity.locationData.radius}m</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                      
                  {/* Thống kê tham gia */}
                  <div className={`p-4 sm:p-5 rounded-xl border ${
                    isDarkMode ? 'bg-gray-800/50 border-gray-700/50' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex items-center gap-2 mb-4">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'
                      }`}>
                        <span className="text-lg">👥</span>
                      </div>
                      <h4 className={`text-sm font-bold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                        Tham gia
                      </h4>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <div className={`relative p-3 sm:p-4 rounded-xl border overflow-hidden group ${
                        isDarkMode ? 'bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/20' : 'bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200'
                      }`}>
                        <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-full -mr-8 -mt-8"></div>
                        <div className="relative">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">📊</span>
                            <p className={`text-[10px] sm:text-xs font-semibold uppercase tracking-wide ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              Số lượng
                            </p>
                          </div>
                          <p className={`text-2xl sm:text-3xl font-extrabold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {participantCount}
                          </p>
                          <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            / {maxParticipants !== Infinity ? maxParticipants : '∞'} người
                          </p>
                        </div>
                      </div>
                      {maxParticipants !== Infinity && (
                        <div className={`relative p-3 sm:p-4 rounded-xl border overflow-hidden group ${
                          isDarkMode ? 'bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20' : 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200'
                        }`}>
                          <div className="absolute top-0 right-0 w-16 h-16 bg-green-500/5 rounded-full -mr-8 -mt-8"></div>
                          <div className="relative">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-lg">📈</span>
                              <p className={`text-[10px] sm:text-xs font-semibold uppercase tracking-wide ${
                                participationPercent >= 100 
                                  ? isDarkMode ? 'text-red-400' : 'text-red-600'
                                  : participationPercent >= 80
                                  ? isDarkMode ? 'text-orange-400' : 'text-orange-600'
                                  : isDarkMode ? 'text-green-400' : 'text-green-600'
                              }`}>
                                Tỷ lệ
                              </p>
                            </div>
                            <p className={`text-2xl sm:text-3xl font-extrabold mb-2 ${
                              participationPercent >= 100 
                                ? isDarkMode ? 'text-red-400' : 'text-red-600'
                                : participationPercent >= 80
                                ? isDarkMode ? 'text-orange-400' : 'text-orange-600'
                                : isDarkMode ? 'text-green-400' : 'text-green-600'
                            }`}>
                              {participationPercent}%
                            </p>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden shadow-inner">
                                <div 
                                  className={`h-full rounded-full transition-all duration-700 shadow-sm ${
                                    participationPercent >= 100 
                                      ? 'bg-gradient-to-r from-red-500 to-red-600' 
                                      : participationPercent >= 80
                                      ? 'bg-gradient-to-r from-orange-500 to-orange-600'
                                      : 'bg-gradient-to-r from-green-500 to-green-600'
                                  }`}
                                  style={{ width: `${Math.min(participationPercent, 100)}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Phân quyền */}
                    {activity.participants && activity.participants.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-base">⚡</span>
                            <h4 className={`text-sm font-bold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                              Phân quyền
                            </h4>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                            {(() => {
                              const roleGroups: { [key: string]: Array<{ userId: string; name: string; email: string; role: string; joinedAt: string; avatarUrl?: string }> } = {
                                'Trưởng Nhóm': [],
                                'Phó Trưởng Nhóm': [],
                                'Thành Viên Ban Tổ Chức': [],
                                'Người Giám Sát': [],
                                'Người Tham Gia': []
                              };
                              
                              activity.participants.forEach((p: any) => {
                                if (roleGroups[p.role]) {
                                  roleGroups[p.role].push(p);
                                } else {
                                  roleGroups['Người Tham Gia'].push(p);
                                }
                              });
                              
                              const getInitials = (name: string) => {
                                return name
                                  .split(' ')
                                  .map(n => n[0])
                                  .join('')
                                  .toUpperCase()
                                  .slice(0, 2);
                              };
                              
                              return Object.entries(roleGroups)
                                .filter(([_, participants]) => participants.length > 0)
                                .map(([role, participants]) => {
                                  const roleConfig: { [key: string]: { icon: string; color: string; bg: string; borderColor: string } } = {
                                    'Trưởng Nhóm': { 
                                      icon: '👑', 
                                      color: isDarkMode ? 'text-red-300' : 'text-red-700',
                                      bg: isDarkMode ? 'bg-red-500/10' : 'bg-red-50',
                                      borderColor: isDarkMode ? 'border-red-500/30' : 'border-red-200'
                                    },
                                    'Phó Trưởng Nhóm': { 
                                      icon: '👨‍💼', 
                                      color: isDarkMode ? 'text-orange-300' : 'text-orange-700',
                                      bg: isDarkMode ? 'bg-orange-500/10' : 'bg-orange-50',
                                      borderColor: isDarkMode ? 'border-orange-500/30' : 'border-orange-200'
                                    },
                                    'Thành Viên Ban Tổ Chức': { 
                                      icon: '📋', 
                                      color: isDarkMode ? 'text-purple-300' : 'text-purple-700',
                                      bg: isDarkMode ? 'bg-purple-500/10' : 'bg-purple-50',
                                      borderColor: isDarkMode ? 'border-purple-500/30' : 'border-purple-200'
                                    },
                                    'Người Giám Sát': { 
                                      icon: '👁️', 
                                      color: isDarkMode ? 'text-blue-300' : 'text-blue-700',
                                      bg: isDarkMode ? 'bg-blue-500/10' : 'bg-blue-50',
                                      borderColor: isDarkMode ? 'border-blue-500/30' : 'border-blue-200'
                                    },
                                    'Người Tham Gia': { 
                                      icon: '👥', 
                                      color: isDarkMode ? 'text-gray-300' : 'text-gray-700',
                                      bg: isDarkMode ? 'bg-gray-500/10' : 'bg-gray-50',
                                      borderColor: isDarkMode ? 'border-gray-500/30' : 'border-gray-200'
                                    }
                                  };
                                  
                                  const config = roleConfig[role] || roleConfig['Người Tham Gia'];
                                  const maxShow = 2;
                                  const toShow = participants.slice(0, maxShow);
                                  const remaining = participants.length - maxShow;
                                  
                                  return (
                                    <div key={role} className={`p-2.5 sm:p-3 rounded-lg sm:rounded-xl border ${
                                      isDarkMode ? 'bg-gray-800/40 border-gray-700/50' : 'bg-gray-50 border-gray-200/80'
                                    }`}>
                                      <div className="flex items-center gap-1.5 mb-2">
                                        <span className="text-xs sm:text-sm flex-shrink-0">{config.icon}</span>
                                        <span className={`text-[10px] sm:text-[11px] font-semibold flex-1 min-w-0 truncate ${config.color}`}>
                                          {role}
                                        </span>
                                        <span className={`text-[10px] sm:text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${config.color} ${
                                          isDarkMode ? 'bg-white/10' : 'bg-white'
                                        }`}>
                                          {participants.length}
                                        </span>
                                      </div>
                                      <div className="space-y-1.5">
                                        {toShow.map((participant: any, idx: number) => (
                                          <div 
                                            key={participant.userId || idx} 
                                            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg ${
                                              isDarkMode ? 'bg-gray-700/30 hover:bg-gray-700/50' : 'bg-white hover:bg-gray-50'
                                            } transition-all duration-200 cursor-pointer`}
                                            title={participant.name}
                                          >
                                            {participant.avatarUrl ? (
                                              <img 
                                                src={participant.avatarUrl} 
                                                alt={participant.name}
                                                className="w-6 h-6 rounded-full object-cover border-2 border-gray-300/50 dark:border-gray-600/50 flex-shrink-0"
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
                                              className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold border-2 border-gray-300/50 dark:border-gray-600/50 flex-shrink-0 ${
                                                isDarkMode ? 'bg-gradient-to-br from-blue-600 to-blue-500 text-white' : 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                                              }`}
                                              style={{ display: participant.avatarUrl ? 'none' : 'flex' }}
                                            >
                                              {getInitials(participant.name || 'U')}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <p className={`text-[11px] sm:text-xs font-medium truncate ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`} title={participant.name}>
                                                {participant.name}
                                              </p>
                                            </div>
                                          </div>
                                        ))}
                                        {remaining > 0 && (
                                          <div className={`text-center py-1 text-[10px] font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                            +{remaining} người khác
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                });
                            })()}
                          </div>
                        </div>
                      )}
                      
                    {/* Action Buttons - Thao tác nhanh */}
                    {showActions && (
                      <div className={`p-4 sm:p-5 rounded-xl border ${
                        isDarkMode ? 'bg-gray-800/50 border-gray-700/50' : 'bg-gray-50 border-gray-200'
                      }`}>
                        <div className="flex items-center gap-2 mb-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            isDarkMode ? 'bg-purple-500/20' : 'bg-purple-100'
                          }`}>
                            <span className="text-lg">⚡</span>
                          </div>
                          <h4 className={`text-sm font-bold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                            Thao tác nhanh
                          </h4>
                        </div>
                        <div className="grid grid-cols-3 gap-2 sm:gap-3">
                          {onView && (
                            <button
                              onClick={() => onView(activity._id)}
                              className={`group relative px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl transition-all duration-300 flex flex-col items-center justify-center gap-1.5 overflow-hidden ${
                                isDarkMode 
                                  ? 'bg-gradient-to-br from-blue-600/20 to-blue-500/10 border border-blue-500/30 text-blue-300 hover:from-blue-600/30 hover:to-blue-500/20 hover:border-blue-400/50' 
                                  : 'bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200 text-blue-700 hover:from-blue-100 hover:to-blue-50 hover:border-blue-300'
                              } shadow-sm hover:shadow-md hover:scale-105`}
                              title="Xem chi tiết"
                            >
                              <span className="text-lg sm:text-xl group-hover:scale-110 transition-transform duration-300">👁️</span>
                              <span className="text-[10px] sm:text-xs font-semibold">Xem</span>
                              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                            </button>
                          )}
                          {onEdit && (
                            <button
                              onClick={() => onEdit(activity._id)}
                              className={`group relative px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl transition-all duration-300 flex flex-col items-center justify-center gap-1.5 overflow-hidden ${
                                isDarkMode 
                                  ? 'bg-gradient-to-br from-green-600/20 to-green-500/10 border border-green-500/30 text-green-300 hover:from-green-600/30 hover:to-green-500/20 hover:border-green-400/50' 
                                  : 'bg-gradient-to-br from-green-50 to-green-100/50 border border-green-200 text-green-700 hover:from-green-100 hover:to-green-50 hover:border-green-300'
                              } shadow-sm hover:shadow-md hover:scale-105`}
                              title="Chỉnh sửa"
                            >
                              <span className="text-lg sm:text-xl group-hover:scale-110 transition-transform duration-300">✏️</span>
                              <span className="text-[10px] sm:text-xs font-semibold">Sửa</span>
                              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                            </button>
                          )}
                          {onDelete && (
                            <button
                              onClick={() => onDelete(activity._id)}
                              className={`group relative px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl transition-all duration-300 flex flex-col items-center justify-center gap-1.5 overflow-hidden ${
                                isDarkMode 
                                  ? 'bg-gradient-to-br from-red-600/20 to-red-500/10 border border-red-500/30 text-red-300 hover:from-red-600/30 hover:to-red-500/20 hover:border-red-400/50' 
                                  : 'bg-gradient-to-br from-red-50 to-red-100/50 border border-red-200 text-red-700 hover:from-red-100 hover:to-red-50 hover:border-red-300'
                              } shadow-sm hover:shadow-md hover:scale-105`}
                              title="Xóa"
                            >
                              <span className="text-lg sm:text-xl group-hover:scale-110 transition-transform duration-300">🗑️</span>
                              <span className="text-[10px] sm:text-xs font-semibold">Xóa</span>
                              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={`text-center py-16 rounded-2xl border-2 border-dashed shadow-lg ${
          isDarkMode 
            ? 'bg-gray-800/50 border-gray-700/50 text-gray-400' 
            : 'bg-white/60 border-gray-200/50 text-gray-500'
        }`}>
          <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${
            isDarkMode ? 'bg-gray-700/50' : 'bg-gray-100'
          }`}>
            <span className="text-4xl">📭</span>
          </div>
          <p className="text-xl font-semibold mb-2">Không tìm thấy hoạt động nào</p>
          <p className="text-sm">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={`flex items-center justify-center gap-3 pt-4`}>
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 shadow-md hover:shadow-lg ${
              currentPage === 1
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400'
                : isDarkMode
                  ? 'bg-gray-700 hover:bg-gray-600 text-white hover:scale-105'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700 hover:scale-105'
            }`}
          >
            ← Trước
          </button>
          
          <div className={`px-5 py-2.5 rounded-xl text-sm font-semibold ${
            isDarkMode ? 'bg-gray-700/50 text-gray-200' : 'bg-gray-100 text-gray-700'
          }`}>
            Trang {currentPage} / {totalPages}
          </div>
          
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 shadow-md hover:shadow-lg ${
              currentPage === totalPages
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400'
                : isDarkMode
                  ? 'bg-gray-700 hover:bg-gray-600 text-white hover:scale-105'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700 hover:scale-105'
            }`}
          >
            Sau →
          </button>
        </div>
      )}
    </div>
  );
}
