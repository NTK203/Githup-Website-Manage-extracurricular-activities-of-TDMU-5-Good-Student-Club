'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Target, 
  FileEdit, 
  CheckCircle2, 
  RefreshCw, 
  PartyPopper, 
  XCircle, 
  Pause, 
  Calendar, 
  CalendarDays,
  Clock,
  MapPin,
  Users,
  BarChart3,
  TrendingUp,
  Zap,
  Crown,
  UserCog,
  ClipboardList,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  Search,
  Filter,
  X,
  Inbox,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Loader,
  Minus
} from 'lucide-react';
import PaginationBar from '@/components/common/PaginationBar';

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
    avatarUrl?: string;
  };
  status: 'draft' | 'published' | 'cancelled' | 'completed' | 'ongoing' | 'postponed';
  type: 'single_day' | 'multiple_days';
  imageUrl?: string;
  overview?: string;
  startDate?: string; // For multiple_days
  endDate?: string; // For multiple_days
  schedule?: Array<{
    day: number;
    date: string;
    activities: string;
  }>;
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
  onEdit?: (id: string, type?: 'single_day' | 'multiple_days') => void;
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
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalActivities, setTotalActivities] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(5);

	// Temporal grouping: upcoming | ongoing | past | all
	const [temporalFilter, setTemporalFilter] = useState<'all' | 'upcoming' | 'ongoing' | 'past'>('all');

  // Expanded time slots state
  const [expandedTimeSlots, setExpandedTimeSlots] = useState<Record<string, boolean>>({});

  // Ref for search debounce
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch activities from API
  const fetchActivities = async (page: number = 1, search: string = '', status: string = 'all', type: string = 'all', fromDate: string = '', toDate: string = '', limit?: number) => {
    try {
      setLoading(true);
      setError(null);
      
      const limitToUse = limit ?? itemsPerPage;
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limitToUse.toString(),
        search: search,
        status: status,
        type: type
      });
      
      if (fromDate) {
        params.append('dateFrom', fromDate);
      }
      if (toDate) {
        params.append('dateTo', toDate);
      }
      
      const response = await fetch(`/api/activities?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setActivities(data.data.activities);
        setTotalPages(data.data.pagination?.totalPages || 1);
        setTotalActivities(data.data.pagination?.total || data.data.activities.length);
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

  // Cleanup search timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Reset to page 1 when temporal filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [temporalFilter]);

  // Handle search and filter changes with debounce
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Debounce: only fetch after user stops typing for 500ms
    searchTimeoutRef.current = setTimeout(() => {
      fetchActivities(1, value, statusFilter, typeFilter, dateFrom, dateTo);
    }, 500);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
    fetchActivities(1, searchTerm, value, typeFilter, dateFrom, dateTo);
  };

  const handleTypeFilterChange = (value: string) => {
    setTypeFilter(value);
    setCurrentPage(1);
    fetchActivities(1, searchTerm, statusFilter, value, dateFrom, dateTo);
  };

  const handleDateFromChange = (value: string) => {
    setDateFrom(value);
    setCurrentPage(1);
    fetchActivities(1, searchTerm, statusFilter, typeFilter, value, dateTo);
  };

  const handleDateToChange = (value: string) => {
    setDateTo(value);
    setCurrentPage(1);
    fetchActivities(1, searchTerm, statusFilter, typeFilter, dateFrom, value);
  };

  const handlePageChange = (page: number) => {
    fetchActivities(page, searchTerm, statusFilter, typeFilter, dateFrom, dateTo);
  };

	const clearAllFilters = () => {
		// Clear search timeout if exists
		if (searchTimeoutRef.current) {
			clearTimeout(searchTimeoutRef.current);
		}
		
		setSearchTerm('');
		setStatusFilter('all');
		setTypeFilter('all');
		setTemporalFilter('all');
		setDateFrom('');
		setDateTo('');
		setCurrentPage(1);
		fetchActivities(1, '', 'all', 'all', '', '');
	};

	// Compute temporal status from date + timeSlots (CHỈ SO SÁNH THỜI GIAN, KHÔNG PHỤ THUỘC STATUS)
	const getTemporalStatus = (activity: Activity): 'upcoming' | 'ongoing' | 'past' => {
		try {
			const now = new Date();
			const activityDate = new Date(activity.date);
			// Reset time to start of day for date comparison
			const activityDateOnly = new Date(activityDate.getFullYear(), activityDate.getMonth(), activityDate.getDate());
			const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
			
			// STEP 1: Check if activity date is in the past (so sánh theo ngày)
			if (activityDateOnly.getTime() < todayOnly.getTime()) {
				// Ngày đã qua → đã kết thúc (dù status là gì)
				return 'past';
			}

			// STEP 2: If activity date is in the future (so sánh theo ngày)
			if (activityDateOnly.getTime() > todayOnly.getTime()) {
				// Ngày chưa đến → sắp diễn ra
				return 'upcoming';
			}

			// STEP 3: Activity date is TODAY - check time slots for precise status (so sánh theo giờ)
			const activeSlots = (activity.timeSlots || []).filter((s) => s.isActive);

			if (activeSlots.length > 0) {
				let startTime: Date | null = null;
				let endTime: Date | null = null;

				activeSlots.forEach((slot) => {
					// slot.startTime like "08:00", "18:30" -> combine with activity date
					const [sh, sm] = (slot.startTime || '00:00').split(':').map((v) => parseInt(v, 10));
					const [eh, em] = (slot.endTime || '00:00').split(':').map((v) => parseInt(v, 10));
					const s = new Date(activityDate);
					s.setHours(sh || 0, sm || 0, 0, 0);
					const e = new Date(activityDate);
					e.setHours(eh || 0, em || 0, 0, 0);
					if (startTime == null) {
						startTime = s;
					} else if (s.getTime() < startTime.getTime()) {
						startTime = s;
					}
					if (endTime == null) {
						endTime = e;
					} else if (e.getTime() > endTime.getTime()) {
						endTime = e;
					}
				});

				if (startTime !== null && endTime !== null) {
					const nowMs = now.getTime();
					const startMs = (startTime as Date).getTime();
					const endMs = (endTime as Date).getTime();
					
					// So sánh thời gian hiện tại với thời gian hoạt động
					if (nowMs < startMs) {
						// Chưa đến giờ bắt đầu → sắp diễn ra
						return 'upcoming';
					}
					if (nowMs >= startMs && nowMs <= endMs) {
						// Trong khoảng thời gian → đang diễn ra
						return 'ongoing';
					}
					// Đã qua giờ kết thúc → đã kết thúc
					return 'past';
				}
			}

			// No time slots for today - không có thông tin giờ, mặc định là sắp diễn ra
			// (Vì không có thông tin giờ nên không thể xác định chính xác)
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
    const statusConfig: { [key: string]: { bg: string; text: string; label: string; icon: React.ReactNode } } = {
      draft: { 
        bg: '', 
        text: isDarkMode ? 'text-yellow-300' : 'text-yellow-700', 
        label: 'Nháp', 
        icon: <FileEdit size={11} strokeWidth={2} />
      },
      published: { 
        bg: '', 
        text: isDarkMode ? 'text-green-300' : 'text-green-700', 
        label: 'Đã xuất bản', 
        icon: <CheckCircle2 size={11} strokeWidth={2} />
      },
      ongoing: { 
        bg: '', 
        text: isDarkMode ? 'text-blue-300' : 'text-blue-700', 
        label: 'Đang diễn ra', 
        icon: <RefreshCw size={11} strokeWidth={2} />
      },
      completed: { 
        bg: '', 
        text: isDarkMode ? 'text-purple-300' : 'text-purple-700', 
        label: 'Hoàn thành', 
        icon: <PartyPopper size={11} strokeWidth={2} />
      },
      cancelled: { 
        bg: '', 
        text: isDarkMode ? 'text-red-300' : 'text-red-700', 
        label: 'Đã hủy', 
        icon: <XCircle size={11} strokeWidth={2} />
      },
      postponed: { 
        bg: '', 
        text: isDarkMode ? 'text-orange-300' : 'text-orange-700', 
        label: 'Tạm hoãn', 
        icon: <Pause size={11} strokeWidth={2} />
      },
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

  // Calculate filtered activities for pagination (after getTemporalStatus is defined)
  const filteredActivities = useMemo(() => {
    return [...activities]
      .sort((a, b) => {
        const ad = new Date(a.date).getTime();
        const bd = new Date(b.date).getTime();
        return bd - ad; // Sort mặc định: mới nhất trước
      })
      .filter((a) => {
        if (temporalFilter === 'all') return true;
        return getTemporalStatus(a) === temporalFilter;
      });
  }, [activities, temporalFilter]);

  // Calculate pagination based on filtered activities
  const filteredTotalActivities = filteredActivities.length;
  const filteredTotalPages = Math.ceil(filteredTotalActivities / itemsPerPage);

  // Ensure currentPage doesn't exceed filteredTotalPages
  useEffect(() => {
    if (filteredTotalPages > 0 && currentPage > filteredTotalPages) {
      setCurrentPage(filteredTotalPages);
    }
  }, [filteredTotalPages, currentPage]);

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showFilters && !target.closest('.filter-dropdown-container')) {
        setShowFilters(false);
      }
    };

    if (showFilters) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showFilters]);

  return (
    <div className={`border p-4 ${
      isDarkMode 
        ? 'bg-gray-800/30 border-gray-700/50' 
        : 'bg-gray-50 border-gray-200/50'
    } shadow-lg`}>
      <div className="space-y-4">
        {/* Toolbar hiện đại (sticky) - Luôn hiển thị */}
        <div className="sticky top-0 z-20 -mx-1 px-1">
        <div className={`relative p-4 mb-3 shadow-lg backdrop-blur-md transition-all duration-300 ${
          isDarkMode 
            ? 'bg-gray-800/70 ring-1 ring-gray-700/50' 
            : 'bg-white/80 ring-1 ring-gray-200/50'
        }`}>
          <div className="relative flex flex-col gap-3">
            {/* Hàng 1: Header + Search + Filters */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3">
              {/* Header bên trái */}
              <div className="flex items-center gap-2.5 min-w-0 flex-shrink-0">
                <div className={`w-9 h-9 flex items-center justify-center flex-shrink-0 ${
                  isDarkMode 
                    ? 'bg-blue-500/20 ring-1 ring-blue-500/30' 
                    : 'bg-blue-100 ring-1 ring-blue-200/50'
                }`}>
                  <Target size={18} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className={`text-base sm:text-lg font-bold ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      Hoạt động
                    </h2>
                    <span className={`px-2 py-0.5 text-xs font-bold whitespace-nowrap ${
                      isDarkMode 
                        ? 'bg-blue-500/20 text-blue-300' 
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {totalActivities}
                    </span>
                  </div>
                </div>
              </div>

              {/* Search Bar + Filter Button */}
              <div className="flex-1 w-full lg:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2 min-w-0">
                {/* Search Bar */}
                <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
                    <Search size={16} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} strokeWidth={2} />
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="Tìm theo tên, mô tả hoặc địa điểm..."
                    className={`w-full pl-10 pr-9 py-2.5 text-sm font-medium transition-all duration-200 rounded-lg ${
                      isDarkMode
                        ? 'bg-gray-700/50 text-white placeholder-gray-400 border border-gray-600/50 focus:border-blue-500/50 focus:bg-gray-700'
                        : 'bg-white text-gray-900 placeholder-gray-500 border border-gray-300/50 focus:border-blue-400/50 focus:bg-white'
                    } shadow-sm focus:shadow-md focus:outline-none`}
                    title="Tìm kiếm theo: Tên hoạt động, Mô tả, hoặc Địa điểm"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => handleSearchChange('')}
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
                      (dateFrom || dateTo || typeFilter !== 'all' || statusFilter !== 'all')
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
                        {/* Date Range */}
                        <div>
                          <label className={`block text-xs font-semibold mb-2 ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>
                            <CalendarDays size={14} className="inline mr-1" />
                            Khoảng thời gian
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => {
                                  setDateFrom(e.target.value);
                                  setCurrentPage(1);
                                  fetchActivities(1, searchTerm, statusFilter, typeFilter, e.target.value, dateTo);
                                }}
                                className={`w-full px-3 py-2 text-sm rounded-lg border-2 transition-all ${
                                  isDarkMode
                                    ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500'
                                    : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                                }`}
                              />
                              <p className={`text-[10px] mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Từ ngày</p>
                            </div>
                            <div>
                              <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => {
                                  setDateTo(e.target.value);
                                  setCurrentPage(1);
                                  fetchActivities(1, searchTerm, statusFilter, typeFilter, dateFrom, e.target.value);
                                }}
                                className={`w-full px-3 py-2 text-sm rounded-lg border-2 transition-all ${
                                  isDarkMode
                                    ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500'
                                    : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                                }`}
                              />
                              <p className={`text-[10px] mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Đến ngày</p>
                            </div>
                          </div>
                        </div>

                        {/* Activity Type */}
                        <div>
                          <label className={`block text-xs font-semibold mb-2 ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>
                            Loại hoạt động
                          </label>
                          <select
                            value={typeFilter}
                            onChange={(e) => {
                              handleTypeFilterChange(e.target.value);
                              setCurrentPage(1);
                            }}
                            className={`w-full px-3 py-2 text-sm rounded-lg border-2 transition-all ${
                              isDarkMode
                                ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500'
                                : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                            }`}
                          >
                            <option value="all">Tất cả</option>
                            <option value="single_day">Một ngày</option>
                            <option value="multiple_days">Nhiều ngày</option>
                          </select>
                        </div>

                        {/* Status Filter */}
                        <div>
                          <label className={`block text-xs font-semibold mb-2 ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>
                            Trạng thái
                          </label>
                          <select
                            value={statusFilter}
                            onChange={(e) => {
                              handleStatusFilterChange(e.target.value);
                              setCurrentPage(1);
                            }}
                            className={`w-full px-3 py-2 text-sm rounded-lg border-2 transition-all ${
                              isDarkMode
                                ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500'
                                : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                            }`}
                          >
                            <option value="all">Tất cả trạng thái</option>
                            <option value="draft">Nháp</option>
                            <option value="published">Xuất bản</option>
                            <option value="cancelled">Hủy</option>
                            <option value="postponed">Hoãn</option>
                          </select>
                        </div>

                        {/* Clear Filters Button */}
                        {(dateFrom || dateTo || typeFilter !== 'all' || statusFilter !== 'all') && (
                          <button
                            onClick={() => {
                              setDateFrom('');
                              setDateTo('');
                              setTypeFilter('all');
                              setStatusFilter('all');
                              setCurrentPage(1);
                              fetchActivities(1, searchTerm, 'all', 'all', '', '');
                            }}
                            type="button"
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

            {/* Hàng 2: Temporal Tabs */}
            <div className="flex items-center justify-center">
              <div className={`inline-flex gap-1 p-1 ${
                isDarkMode 
                  ? 'bg-gray-700/50' 
                  : 'bg-gray-100'
              }`}>
                {([
                  { key: 'all', label: 'Tất cả', icon: ClipboardList, count: temporalCounts.all, color: isDarkMode ? 'bg-gray-600 text-white' : 'bg-gray-700 text-white' },
                  { key: 'upcoming', label: 'Sắp diễn ra', icon: Clock, count: temporalCounts.upcoming, color: isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white' },
                  { key: 'ongoing', label: 'Đang diễn ra', icon: RefreshCw, count: temporalCounts.ongoing, color: isDarkMode ? 'bg-green-600 text-white' : 'bg-green-500 text-white' },
                  { key: 'past', label: 'Đã kết thúc', icon: CheckCircle2, count: temporalCounts.past, color: isDarkMode ? 'bg-purple-600 text-white' : 'bg-purple-500 text-white' },
                ] as Array<{ key: 'all' | 'upcoming' | 'ongoing' | 'past'; label: string; icon: any; count: number; color: string }>).map((tab) => {
                  const active = temporalFilter === tab.key;
                  const IconComponent = tab.icon;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setTemporalFilter(tab.key)}
                      className={`group relative px-3 py-2 text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                        active
                          ? `${tab.color} shadow-md scale-105`
                          : isDarkMode 
                            ? 'text-gray-300 hover:bg-gray-600/50' 
                            : 'text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <IconComponent size={14} strokeWidth={2} />
                      <span className="hidden sm:inline">{tab.label}</span>
                      <span className={`px-1.5 py-0.5 text-[10px] font-bold ${
                        active 
                          ? 'bg-white/20 text-white' 
                          : isDarkMode 
                            ? 'bg-gray-700/50 text-gray-300' 
                            : 'bg-gray-200 text-gray-700'
                      }`}>
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer Info */}
            {(searchTerm || statusFilter !== 'all' || typeFilter !== 'all' || temporalFilter !== 'all' || dateFrom || dateTo) && (
              <div className="flex items-center justify-end pt-2 border-t border-gray-200/50 dark:border-gray-700/50">
                <button
                  onClick={clearAllFilters}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
                    isDarkMode 
                      ? 'bg-gray-700/50 text-gray-200 hover:bg-gray-600/50' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  title="Xóa tất cả bộ lọc"
                >
                  <X size={14} strokeWidth={2} />
                  <span>Xóa bộ lọc</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Activities List View - Modern Admin Design */}
      {loading ? (
        <div className={`border overflow-hidden ${
          isDarkMode 
            ? 'bg-gray-800/50 border-gray-700/50' 
            : 'bg-white border-gray-200/50'
        } shadow-lg`}>
          <div className={`flex flex-col items-center justify-center py-20 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            <Loader 
              size={64} 
              className={`animate-spin mb-6 ${
                isDarkMode ? 'text-blue-400' : 'text-blue-600'
              }`}
              strokeWidth={2}
            />
            
            <p className={`text-sm font-semibold mb-2 ${
              isDarkMode ? 'text-gray-200' : 'text-gray-700'
            }`}>
              Đang tải dữ liệu
            </p>
            
            <div className="flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${
                isDarkMode ? 'bg-blue-400' : 'bg-blue-500'
              } animate-pulse`} style={{ animationDelay: '0s' }}></span>
              <span className={`w-1.5 h-1.5 rounded-full ${
                isDarkMode ? 'bg-blue-400' : 'bg-blue-500'
              } animate-pulse`} style={{ animationDelay: '0.2s' }}></span>
              <span className={`w-1.5 h-1.5 rounded-full ${
                isDarkMode ? 'bg-blue-400' : 'bg-blue-500'
              } animate-pulse`} style={{ animationDelay: '0.4s' }}></span>
            </div>
          </div>
        </div>
      ) : error ? (
        <div className={`border overflow-hidden ${
          isDarkMode 
            ? 'bg-gray-800/50 border-gray-700/50' 
            : 'bg-white border-gray-200/50'
        } shadow-lg`}>
          <div className={`text-center py-16 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
            <div className="flex items-center justify-center gap-2 mb-4">
              <XCircle size={20} strokeWidth={2} />
              <p className="text-sm font-medium">{error}</p>
            </div>
            <button
              onClick={() => fetchActivities(currentPage, searchTerm, statusFilter, typeFilter)}
              className={`px-4 py-2 flex items-center gap-2 mx-auto text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-md ${
                isDarkMode 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              Thử lại
            </button>
          </div>
        </div>
      ) : activities.length > 0 ? (
        <div className="space-y-4">
          {(() => {
            // Calculate pagination based on filtered activities (already computed in useMemo)
            const validCurrentPage = filteredTotalPages > 0 
              ? Math.min(currentPage, filteredTotalPages) 
              : 1;
            
            const startIndex = (validCurrentPage - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            const paginatedActivities = filteredActivities.slice(startIndex, endIndex);

            return (
              <>
                {/* Pagination - Top */}
                {!loading && !error && filteredTotalActivities > 0 && (
                  <PaginationBar
                    totalItems={filteredTotalActivities}
                    currentPage={validCurrentPage}
                    itemsPerPage={itemsPerPage}
                    onPageChange={(page) => {
                      setCurrentPage(page);
                      // Scroll to top when page changes
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    onItemsPerPageChange={(newItemsPerPage) => {
                      setItemsPerPage(newItemsPerPage);
                      setCurrentPage(1);
                      fetchActivities(1, searchTerm, statusFilter, typeFilter, dateFrom, dateTo, newItemsPerPage);
                    }}
                    itemLabel="hoạt động"
                    isDarkMode={isDarkMode}
                    itemsPerPageOptions={[5, 10, 20, 50]}
                    className="mb-3"
                  />
                )}

                {/* Activities List */}
                {paginatedActivities.length > 0 ? (
                  paginatedActivities.map((activity) => {
                        const participantCount = activity.participants?.length || 0;
                        const maxParticipants = activity.maxParticipants || Infinity;
                        const participationPercent = maxParticipants !== Infinity 
                          ? Math.round((participantCount / maxParticipants) * 100) 
                          : 0;
                        const activeTimeSlots = activity.timeSlots?.filter((slot: any) => slot.isActive) || [];
                        const statusConfig = getStatusConfig(activity.status);
                        const temporalStatus = getTemporalStatus(activity);
                        const firstTimeSlot = activeTimeSlots[0];
                        
                        // Check if multiple locations
                        const hasMultipleLocations = activity.multiTimeLocations && activity.multiTimeLocations.length > 0;
                        const isMultipleLocations = activity.location === 'Nhiều địa điểm' || hasMultipleLocations;
                        
                        // Check if time slots are expanded
                        const isExpanded = expandedTimeSlots[activity._id] || false;
                        const toggleTimeSlots = () => {
                          setExpandedTimeSlots(prev => ({
                            ...prev,
                            [activity._id]: !prev[activity._id]
                          }));
                        };
                    
                    return (
                      <div 
                        key={activity._id}
                        className={`group p-3.5 transition-all duration-200 border-l-4 ${
                          activity.type === 'single_day'
                            ? isDarkMode 
                              ? 'bg-gray-800/50 hover:bg-gray-700/50 border-gray-700/50 border-l-blue-500' 
                              : 'bg-white hover:bg-gray-50 border-gray-200/50 border-l-blue-500'
                            : isDarkMode 
                              ? 'bg-gray-800/50 hover:bg-gray-700/50 border-gray-700/50 border-l-purple-500' 
                              : 'bg-white hover:bg-gray-50 border-gray-200/50 border-l-purple-500'
                        } shadow-md`}
                      >
                        <div className="flex gap-3 items-center">
                          {/* Left: Image - Square */}
                          <div className="relative w-32 h-32 sm:w-36 sm:h-36 overflow-hidden flex-shrink-0 shadow-sm">
                            {/* Type Indicator Badge - Top Right Corner */}
                            <div className={`absolute top-1 right-1 z-10 px-1.5 py-0.5 rounded-md text-[9px] font-bold shadow-lg ${
                              activity.type === 'single_day'
                                ? isDarkMode 
                                  ? 'bg-blue-500 text-white' 
                                  : 'bg-blue-500 text-white'
                                : isDarkMode 
                                  ? 'bg-purple-500 text-white' 
                                  : 'bg-purple-500 text-white'
                            }`}>
                              {activity.type === 'single_day' ? (
                                <Calendar size={10} strokeWidth={2.5} />
                              ) : (
                                <CalendarDays size={10} strokeWidth={2.5} />
                              )}
                            </div>
                            {activity.imageUrl ? (
                              <img 
                                src={activity.imageUrl} 
                                alt={activity.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className={`w-full h-full flex items-center justify-center ${
                                activity.type === 'single_day'
                                  ? isDarkMode 
                                    ? 'bg-gradient-to-br from-blue-600/20 to-blue-500/20' 
                                    : 'bg-gradient-to-br from-blue-100 to-blue-50'
                                  : isDarkMode 
                                    ? 'bg-gradient-to-br from-purple-600/20 to-purple-500/20' 
                                    : 'bg-gradient-to-br from-purple-100 to-purple-50'
                              }`}>
                                {activity.type === 'single_day' ? (
                                  <Calendar size={32} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} />
                                ) : (
                                  <CalendarDays size={32} className={isDarkMode ? 'text-purple-400' : 'text-purple-600'} />
                                )}
                              </div>
                            )}
                          </div>
                          
                          {/* Middle: Main Content - Compact */}
                          <div className="flex-1 min-w-0 flex flex-col gap-2">
                            {/* Top: Title + Badges */}
                            <div className="space-y-1.5">
                              <div className="flex items-start gap-2 flex-wrap">
                                <h3 className={`font-bold text-base flex-1 min-w-0 ${
                                  isDarkMode ? 'text-white' : 'text-gray-900'
                                }`} title={activity.name}>
                                  {activity.name}
                                </h3>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  {/* Type Badge - Lớn hơn và rõ ràng hơn */}
                                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-md border-2 ${
                                    activity.type === 'single_day'
                                      ? isDarkMode 
                                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/50' 
                                        : 'bg-blue-50 text-blue-700 border-blue-300'
                                      : isDarkMode 
                                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/50' 
                                        : 'bg-purple-50 text-purple-700 border-purple-300'
                                  }`}>
                                    {activity.type === 'single_day' ? (
                                      <>
                                        <Calendar size={12} strokeWidth={2.5} />
                                        <span>1 NGÀY</span>
                                      </>
                                    ) : (
                                      <>
                                        <CalendarDays size={12} strokeWidth={2.5} />
                                        <span>NHIỀU NGÀY</span>
                                      </>
                                    )}
                                  </span>
                                  {activity.visibility === 'private' ? (
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium ${
                                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                    }`} title="Hoạt động riêng tư">
                                      <EyeOff size={10} strokeWidth={2} />
                                      <span>Riêng tư</span>
                                    </span>
                                  ) : (
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium ${
                                      isDarkMode ? 'text-green-300' : 'text-green-700'
                                    }`} title="Hoạt động công khai">
                                      <Eye size={10} strokeWidth={2} />
                                      <span>Công khai</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              {/* Status Badges */}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {/* 1. Status Badge - Luôn hiển thị */}
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold ${statusConfig.bg} ${statusConfig.text}`}>
                                  {statusConfig.icon}
                                  <span>{statusConfig.label}</span>
                                </span>
                                {/* 2. Temporal Status Badge - Luôn hiển thị */}
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium ${
                                  temporalStatus === 'upcoming' 
                                    ? isDarkMode ? 'text-blue-300' : 'text-blue-700'
                                    : temporalStatus === 'ongoing'
                                    ? isDarkMode ? 'text-green-300' : 'text-green-700'
                                    : isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                }`}>
                                  {temporalStatus === 'upcoming' ? (
                                    <>
                                      <Clock size={10} strokeWidth={2} />
                                      <span>Sắp diễn ra</span>
                                    </>
                                  ) : temporalStatus === 'ongoing' ? (
                                    <>
                                      <RefreshCw size={10} strokeWidth={2} />
                                      <span>Đang diễn ra</span>
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2 size={10} strokeWidth={2} />
                                      <span>Đã kết thúc</span>
                                    </>
                                  )}
                                </span>
                              </div>
                            </div>

                            {/* Description */}
                            {(activity.description || activity.overview) && (
                              <div className={`text-xs line-clamp-1 pl-2 mb-1 ${
                                isDarkMode ? 'text-gray-300' : 'text-gray-600'
                              }`} title={activity.description || activity.overview}>
                                {activity.description || activity.overview}
                              </div>
                            )}

                            {/* Info Grid: Sắp xếp theo thứ tự - Người phụ trách → Ngày diễn ra → Thời gian diễn ra từng buổi → Phần trăm người tham gia → Địa điểm */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1 items-start">
                              {/* 1. Responsible Person - Người phụ trách */}
                              {activity.responsiblePerson ? (
                                <div className={`flex items-start gap-1.5 px-1 py-1 transition-all duration-200 ${
                                  isDarkMode ? '' : ''
                                }`}>
                                  <div className="flex-shrink-0 relative w-8 h-8">
                                    {activity.responsiblePerson.avatarUrl ? (
                                      <>
                                        <img 
                                          src={activity.responsiblePerson.avatarUrl} 
                                          alt={activity.responsiblePerson.name}
                                          className="w-full h-full object-cover rounded-full"
                                          onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.style.display = 'none';
                                            const fallback = target.nextElementSibling as HTMLElement;
                                            if (fallback) {
                                              fallback.classList.remove('hidden');
                                              fallback.classList.add('flex');
                                            }
                                          }}
                                        />
                                        <div className="hidden absolute inset-0 items-center justify-center rounded-full">
                                          <UserCog size={14} className={isDarkMode ? 'text-purple-400' : 'text-purple-600'} strokeWidth={1.5} />
                                        </div>
                                      </>
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center rounded-full">
                                        <UserCog size={14} className={isDarkMode ? 'text-purple-400' : 'text-purple-600'} strokeWidth={1.5} />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className={`text-[10px] font-semibold mb-0.5 ${
                                      isDarkMode ? 'text-purple-300' : 'text-purple-600'
                                    }`}>
                                      Người phụ trách
                                    </div>
                                    <div className={`text-xs font-bold truncate ${
                                      isDarkMode ? 'text-white' : 'text-gray-900'
                                    }`} title={activity.responsiblePerson.name}>
                                      {activity.responsiblePerson.name}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className={`flex items-start gap-1.5 px-1 py-1 transition-all duration-200 ${
                                  isDarkMode ? '' : ''
                                }`}>
                                  <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
                                    <UserCog size={14} className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} strokeWidth={1.5} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className={`text-[10px] font-semibold mb-0.5 ${
                                      isDarkMode ? 'text-gray-500' : 'text-gray-400'
                                    }`}>
                                      Người phụ trách
                                    </div>
                                    <div className={`text-xs font-medium ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                      Chưa có
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* 2. Date & Time - Ngày diễn ra */}
                              <div className={`flex items-start gap-1.5 px-1 py-1 transition-all duration-200 ${
                                isDarkMode ? '' : ''
                              }`}>
                                  <div className="flex-shrink-0">
                                    {activity.type === 'single_day' ? (
                                      <Calendar size={14} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} strokeWidth={1.5} />
                                    ) : (
                                      <CalendarDays size={14} className={isDarkMode ? 'text-purple-400' : 'text-purple-600'} strokeWidth={1.5} />
                                    )}
                                  </div>
                                <div className="flex-1 min-w-0">
                                  <div className={`text-[10px] font-semibold mb-0.5 ${
                                    activity.type === 'single_day'
                                      ? isDarkMode ? 'text-blue-300' : 'text-blue-600'
                                      : isDarkMode ? 'text-purple-300' : 'text-purple-600'
                                  }`}>
                                    {activity.type === 'single_day' ? 'Ngày diễn ra' : 'Khoảng thời gian'}
                                  </div>
                                  {activity.type === 'single_day' ? (
                                    <div className={`text-xs font-bold ${
                                      isDarkMode ? 'text-white' : 'text-gray-900'
                                    }`}>
                                      {formatDate(activity.date)}
                                    </div>
                                  ) : (
                                    <div className="space-y-0.5">
                                      {activity.startDate && activity.endDate ? (
                                        <>
                                          <div className={`text-xs font-bold ${
                                            isDarkMode ? 'text-white' : 'text-gray-900'
                                          }`}>
                                            {formatDate(activity.startDate)} - {formatDate(activity.endDate)}
                                          </div>
                                          {activity.schedule && activity.schedule.length > 0 && (
                                            <div className={`text-[10px] font-medium ${
                                              isDarkMode ? 'text-purple-400' : 'text-purple-600'
                                            }`}>
                                              ({activity.schedule.length} ngày)
                                            </div>
                                          )}
                                        </>
                                      ) : (
                                        <div className={`text-xs font-bold ${
                                          isDarkMode ? 'text-white' : 'text-gray-900'
                                        }`}>
                                          {formatDate(activity.date)}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* 3. Time Slots / Schedule - Thời gian diễn ra từng buổi hoặc lịch trình */}
                              {activity.type === 'single_day' ? (
                                activeTimeSlots.length > 0 ? (
                                  <div className={`flex items-start gap-1.5 px-1 py-1 transition-all duration-200 ${
                                    isDarkMode ? '' : ''
                                  }`}>
                                    <div className="flex-shrink-0">
                                      <Clock size={14} className={isDarkMode ? 'text-cyan-400' : 'text-cyan-600'} strokeWidth={1.5} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1 mb-0.5">
                                        <div className={`text-[10px] font-bold flex items-center gap-1 ${
                                          isDarkMode ? 'text-cyan-300' : 'text-cyan-600'
                                        }`}>
                                          Thời gian buổi
                                          <span className={`px-1 py-0.5 text-[9px] font-bold rounded ${
                                            isDarkMode 
                                              ? 'bg-cyan-500/20 text-cyan-300' 
                                              : 'bg-cyan-100 text-cyan-700'
                                          }`}>
                                            {activeTimeSlots.length}
                                          </span>
                                        </div>
                                      </div>
                                      <div className="space-y-0.5">
                                        {(isExpanded ? activeTimeSlots : activeTimeSlots.slice(0, 1)).map((slot, index) => {
                                          return (
                                            <div 
                                              key={slot.id || index}
                                              className="flex items-start gap-1.5"
                                            >
                                              <div className={`w-1 h-1 mt-1.5 flex-shrink-0 rounded-full ${isDarkMode ? 'bg-gray-400' : 'bg-gray-500'}`}></div>
                                              <div className={`text-[10px] font-bold flex-1 min-w-0 leading-snug ${
                                                isDarkMode ? 'text-white' : 'text-black'
                                              }`}>
                                                {slot.name ? (
                                                  <div className="flex items-center gap-0.5 whitespace-nowrap" title={slot.name}>
                                                    <span className="font-semibold min-w-[55px] text-left">{slot.name}</span>
                                                    <span>:</span>
                                                    <span>{formatTime(slot.startTime)} - {formatTime(slot.endTime)}</span>
                                                  </div>
                                                ) : (
                                                  <div>
                                                    {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                      {activeTimeSlots.length > 1 && (
                                        <button
                                          onClick={toggleTimeSlots}
                                          className={`mt-1.5 px-1.5 py-0.5 text-[9px] font-semibold flex items-center gap-1 transition-all duration-200 ${
                                            isDarkMode 
                                              ? 'text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10' 
                                              : 'text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50'
                                          }`}
                                          title={isExpanded ? 'Thu gọn' : 'Xem thêm'}
                                        >
                                          <span>{isExpanded ? 'Thu gọn' : 'Xem thêm'}</span>
                                          {isExpanded ? (
                                            <ChevronUp size={10} strokeWidth={2.5} />
                                          ) : (
                                            <ChevronDown size={10} strokeWidth={2.5} />
                                          )}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <div className={`flex items-start gap-1.5 px-1 py-1 transition-all duration-200 ${
                                    isDarkMode ? '' : ''
                                  }`}>
                                    <div className="flex-shrink-0">
                                      <Clock size={14} className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} strokeWidth={1.5} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className={`text-[10px] font-semibold mb-0.5 ${
                                        isDarkMode ? 'text-gray-500' : 'text-gray-400'
                                      }`}>
                                        Thời gian buổi
                                      </div>
                                      <div className={`text-xs font-medium ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                        Chưa có
                                      </div>
                                    </div>
                                  </div>
                                )
                              ) : (
                                /* Multiple Days - Hiển thị thông tin schedule */
                                <div className={`flex items-start gap-1.5 px-1 py-1 transition-all duration-200 ${
                                  isDarkMode ? '' : ''
                                }`}>
                                  <div className="flex-shrink-0">
                                    <CalendarDays size={14} className={isDarkMode ? 'text-purple-400' : 'text-purple-600'} strokeWidth={1.5} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className={`text-[10px] font-semibold mb-0.5 ${
                                      isDarkMode ? 'text-purple-300' : 'text-purple-600'
                                    }`}>
                                      Lịch trình
                                    </div>
                                    {activity.schedule && activity.schedule.length > 0 ? (
                                      <div className="space-y-0.5">
                                        <div className={`text-xs font-bold ${
                                          isDarkMode ? 'text-white' : 'text-gray-900'
                                        }`}>
                                          {activity.schedule.length} ngày
                                        </div>
                                        <div className={`text-[10px] font-medium ${
                                          isDarkMode ? 'text-purple-400' : 'text-purple-600'
                                        }`}>
                                          Theo lịch tuần
                                        </div>
                                      </div>
                                    ) : (
                                      <div className={`text-xs font-medium ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                        Chưa có lịch
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* 4. Participants - Phần trăm người tham gia */}
                              <div className={`flex items-start gap-1.5 px-1 py-1 transition-all duration-200 ${
                                isDarkMode ? '' : ''
                              }`}>
                                  <div className="flex-shrink-0">
                                    <Users size={14} className={isDarkMode ? 'text-emerald-400' : 'text-emerald-600'} strokeWidth={1.5} />
                                  </div>
                                <div className="flex-1 min-w-0">
                                  <div className={`text-[10px] font-semibold mb-0.5 ${
                                    isDarkMode ? 'text-emerald-300' : 'text-emerald-600'
                                  }`}>
                                    Tham gia
                                  </div>
                                  <div className="flex items-baseline gap-1">
                                    <span className={`text-sm font-bold ${
                                      isDarkMode ? 'text-white' : 'text-gray-900'
                                    }`}>
                                      {participantCount}
                                    </span>
                                    <span className={`text-[10px] ${
                                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                    }`}>
                                      /{maxParticipants !== Infinity ? maxParticipants : '∞'}
                                    </span>
                                    {maxParticipants !== Infinity && (
                                      <span className={`text-[10px] font-bold ${
                                        participationPercent >= 100 
                                          ? isDarkMode ? 'text-red-400' : 'text-red-600'
                                          : participationPercent >= 80
                                          ? isDarkMode ? 'text-orange-400' : 'text-orange-600'
                                          : isDarkMode ? 'text-emerald-400' : 'text-emerald-600'
                                      }`}>
                                        ({participationPercent}%)
                                      </span>
                                    )}
                                  </div>
                                  {maxParticipants !== Infinity && (
                                    <div className={`h-2 overflow-hidden w-full mt-1.5 ${
                                      isDarkMode ? 'bg-gray-700/50' : 'bg-gray-200/50'
                                    }`}>
                                      <div 
                                        className={`h-full transition-all duration-500 ${
                                          participationPercent >= 100 
                                            ? 'bg-red-500' 
                                            : participationPercent >= 80
                                            ? 'bg-orange-500'
                                            : 'bg-emerald-500'
                                        }`}
                                        style={{ width: `${Math.min(participationPercent, 100)}%` }}
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* 5. Location - Địa điểm */}
                              <div className={`flex items-start gap-1.5 px-1 py-1 transition-all duration-200 ${
                                isDarkMode ? '' : ''
                              }`}>
                                <div className="flex-shrink-0">
                                  <MapPin size={14} className={isDarkMode ? 'text-orange-400' : 'text-orange-600'} strokeWidth={1.5} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className={`text-[10px] font-semibold mb-0.5 ${
                                    isDarkMode ? 'text-orange-300' : 'text-orange-600'
                                  }`}>
                                    Địa điểm
                                  </div>
                                  {isMultipleLocations ? (
                                    <div className="flex items-center gap-1 flex-wrap">
                                      <span className={`text-xs font-bold ${
                                        isDarkMode ? 'text-orange-300' : 'text-orange-700'
                                      }`}>
                                        Nhiều địa điểm
                                      </span>
                                      {hasMultipleLocations && (
                                        <span className={`text-[10px] px-1 py-0.5 font-bold ${
                                          isDarkMode ? 'text-orange-300' : 'text-orange-700'
                                        }`}>
                                          {activity.multiTimeLocations?.length}
                                        </span>
                                      )}
                                    </div>
                                  ) : activity.location ? (
                                    <div className={`text-xs font-bold line-clamp-2 leading-tight ${
                                      isDarkMode ? 'text-white' : 'text-gray-900'
                                    }`} title={activity.location}>
                                      {activity.location}
                                    </div>
                                  ) : (
                                    <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                      Chưa có
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Right: Actions Only - Vertical */}
                          {showActions && (
                            <div className="flex flex-col gap-2 flex-shrink-0">
                              {onView && (
                                <button
                                  onClick={() => onView(activity._id)}
                                  className={`w-full min-w-[80px] px-3 py-2.5 transition-all duration-200 flex items-center justify-center gap-1.5 ${
                                    isDarkMode 
                                      ? 'text-blue-400 hover:bg-blue-500/20 border border-blue-500/30' 
                                      : 'text-blue-600 hover:bg-blue-50 border border-blue-200'
                                  }`}
                                  title="Xem"
                                >
                                  <Eye size={16} strokeWidth={2} />
                                  <span className="text-xs font-semibold hidden sm:inline">Xem</span>
                                </button>
                              )}
                              {onEdit && (
                                <button
                                  onClick={() => onEdit(activity._id, activity.type)}
                                  className={`w-full min-w-[80px] px-3 py-2.5 transition-all duration-200 flex items-center justify-center gap-1.5 ${
                                    isDarkMode 
                                      ? 'text-green-400 hover:bg-green-500/20 border border-green-500/30' 
                                      : 'text-green-600 hover:bg-green-50 border border-green-200'
                                  }`}
                                  title="Sửa"
                                >
                                  <Edit size={16} strokeWidth={2} />
                                  <span className="text-xs font-semibold hidden sm:inline">Sửa</span>
                                </button>
                              )}
                              {onDelete && (
                                <button
                                  onClick={() => onDelete(activity._id)}
                                  className={`w-full min-w-[80px] px-3 py-2.5 transition-all duration-200 flex items-center justify-center gap-1.5 ${
                                    isDarkMode 
                                      ? 'text-red-400 hover:bg-red-500/20 border border-red-500/30' 
                                      : 'text-red-600 hover:bg-red-50 border border-red-200'
                                  }`}
                                  title="Xóa"
                                >
                                  <Trash2 size={16} strokeWidth={2} />
                                  <span className="text-xs font-semibold hidden sm:inline">Xóa</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })) : (
                    <div className={`border overflow-hidden ${
                      isDarkMode 
                        ? 'bg-gray-800/50 border-gray-700/50' 
                        : 'bg-white border-gray-200/50'
                    } shadow-lg`}>
                      <div className={`text-center py-12 border-2 border-dashed ${
                        isDarkMode 
                          ? 'border-gray-700/50 text-gray-400' 
                          : 'border-gray-200/50 text-gray-500'
                      }`}>
                        <div className={`w-16 h-16 mx-auto flex items-center justify-center mb-3 ${
                          isDarkMode ? 'bg-gray-700/50' : 'bg-gray-100'
                        }`}>
                          <Inbox size={32} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} strokeWidth={2} />
                        </div>
                        <p className="text-lg font-semibold mb-1">Không tìm thấy hoạt động nào</p>
                        <p className="text-sm">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
                      </div>
                    </div>
                  )}

                {/* Pagination - Bottom */}
                {!loading && !error && filteredTotalActivities > 0 && (
                  <div className={`pt-4 ${isDarkMode ? 'border-t border-gray-700/50' : 'border-t border-gray-200/50'}`}>
                    <PaginationBar
                      totalItems={filteredTotalActivities}
                      currentPage={validCurrentPage}
                      itemsPerPage={itemsPerPage}
                      onPageChange={(page) => {
                        setCurrentPage(page);
                        // Scroll to top when page changes
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      onItemsPerPageChange={(newItemsPerPage) => {
                        setItemsPerPage(newItemsPerPage);
                        setCurrentPage(1);
                        fetchActivities(1, searchTerm, statusFilter, typeFilter, dateFrom, dateTo, newItemsPerPage);
                      }}
                      itemLabel="hoạt động"
                      isDarkMode={isDarkMode}
                      itemsPerPageOptions={[5, 10, 20, 50]}
                    />
                  </div>
                )}
              </>
            );
          })()}
        </div>
      ) : (
        <div className={`border overflow-hidden ${
          isDarkMode 
            ? 'bg-gray-800/50 border-gray-700/50' 
            : 'bg-white border-gray-200/50'
        } shadow-lg`}>
          <div className={`text-center py-12 border-2 border-dashed ${
            isDarkMode 
              ? 'border-gray-700/50 text-gray-400' 
              : 'border-gray-200/50 text-gray-500'
          }`}>
            <div className={`w-16 h-16 mx-auto flex items-center justify-center mb-3 ${
              isDarkMode ? 'bg-gray-700/50' : 'bg-gray-100'
            }`}>
              <Inbox size={32} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} strokeWidth={2} />
            </div>
            <p className="text-lg font-semibold mb-1">Không tìm thấy hoạt động nào</p>
            <p className="text-sm">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
