'use client';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import OfficerNav from '@/components/officer/OfficerNav';
import Footer from '@/components/common/Footer';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import PaginationBar from '@/components/common/PaginationBar';
import {
  Target,
  Users,
  CheckCircle2,
  ClipboardList,
  LucideIcon,
  CheckSquare,
  BarChart3,
  Bell,
  Search,
  Filter,
  X,
  ChevronDown,
  List,
  Play,
  Calendar,
  MapPin,
  Eye,
  UserCheck,
  Loader2,
  CalendarDays,
  CalendarRange,
  AlertCircle,
  XCircle,
  Clock,
  Crown,
  Briefcase,
  Zap,
  RefreshCw,
  TrendingUp,
  Inbox
} from 'lucide-react';

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
    detailedLocation?: string;
  }>;
  location: string;
  detailedLocation?: string;
  maxParticipants: number;
  visibility: 'public' | 'private';
  responsiblePerson?: {
    name: string;
    email: string;
  };
  status: 'draft' | 'published' | 'ongoing' | 'completed' | 'cancelled' | 'postponed';
  type: 'single_day' | 'multiple_days';
  imageUrl?: string;
  overview?: string;
  startDate?: string;
  endDate?: string;
  participants: Array<{
    userId: string;
    name: string;
    email: string;
    role: string;
    joinedAt: string;
  }>;
  createdBy?: {
    name: string;
    email: string;
  };
  createdAt: string;
}

const statusConfig = {
  draft: { label: 'Bản nháp', color: 'bg-gray-100 text-gray-700 border-gray-300', icon: AlertCircle },
  published: { label: 'Đã xuất bản', color: 'bg-blue-100 text-blue-700 border-blue-300', icon: Eye },
  ongoing: { label: 'Đang diễn ra', color: 'bg-green-100 text-green-700 border-green-300', icon: CheckCircle2 },
  completed: { label: 'Hoàn thành', color: 'bg-emerald-100 text-emerald-700 border-emerald-300', icon: CheckCircle2 },
  cancelled: { label: 'Đã hủy', color: 'bg-red-100 text-red-700 border-red-300', icon: XCircle },
  postponed: { label: 'Hoãn lại', color: 'bg-yellow-100 text-yellow-700 border-yellow-300', icon: Clock }
};

export default function OfficerDashboard() {
  const { user } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activePage, setActivePage] = useState(1);
  const [activeItemsPerPage, setActiveItemsPerPage] = useState(6);
  const [attendanceRates, setAttendanceRates] = useState<{ [key: string]: number }>({});
  const [loadingAttendanceRates, setLoadingAttendanceRates] = useState(false);
  const [activeAttendanceRates, setActiveAttendanceRates] = useState<{ [key: string]: number }>({});
  const [loadingActiveAttendanceRates, setLoadingActiveAttendanceRates] = useState(false);
  const [pendingParticipantsCount, setPendingParticipantsCount] = useState<{ [key: string]: number }>({});
  const leftColumnRef = useRef<HTMLDivElement>(null);
  const leftHeaderRef = useRef<HTMLDivElement>(null);
  const leftContentRef = useRef<HTMLDivElement>(null);
  const searchBarRef = useRef<HTMLDivElement>(null);
  const [leftColumnHeight, setLeftColumnHeight] = useState<number | null>(null);
  const [leftHeaderHeight, setLeftHeaderHeight] = useState<number | null>(null);
  const [searchBarHeight, setSearchBarHeight] = useState<number | null>(null);

  // Fetch all activities that officer is responsible for
  const fetchActivities = useCallback(async () => {
    try {
      setLoadingActivities(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setLoadingActivities(false);
        return;
      }

      const response = await fetch('/api/activities?limit=1000&myActivities=true', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setActivities(data.data.activities || []);
        }
      }
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoadingActivities(false);
    }
  }, []);

  // Compute temporal status
  const getTemporalStatus = (activity: Activity): 'upcoming' | 'ongoing' | 'past' => {
    try {
      const now = new Date();
      
      // Handle multiple days activities
      if (activity.type === 'multiple_days' && activity.startDate && activity.endDate) {
        const startDate = new Date(activity.startDate);
        const endDate = new Date(activity.endDate);
        // Set end date to end of day
        endDate.setHours(23, 59, 59, 999);
        
        if (now.getTime() < startDate.getTime()) {
          return 'upcoming';
        }
        if (now.getTime() >= startDate.getTime() && now.getTime() <= endDate.getTime()) {
          return 'ongoing';
        }
        return 'past';
      }
      
      // Handle single day activities
      const activityDate = new Date(activity.date);
      const activityDateOnly = new Date(activityDate.getFullYear(), activityDate.getMonth(), activityDate.getDate());
      const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      if (activityDateOnly.getTime() < todayOnly.getTime()) {
        return 'past';
      }

      if (activityDateOnly.getTime() > todayOnly.getTime()) {
        return 'upcoming';
      }

      // Today - check time slots
      const activeSlots = (activity.timeSlots || []).filter((s) => s.isActive);

      if (activeSlots.length > 0) {
        let startTime: Date | null = null;
        let endTime: Date | null = null;

        activeSlots.forEach((slot) => {
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
          
          if (nowMs < startMs) {
            return 'upcoming';
          }
          if (nowMs >= startMs && nowMs <= endMs) {
            return 'ongoing';
          }
          return 'past';
        }
      }

      return 'upcoming';
    } catch {
      return 'upcoming';
    }
  };

  // Filter activities - Active (ongoing + upcoming)
  const activeActivities = useMemo(() => {
    return activities.filter(a => {
      const temporal = getTemporalStatus(a);
      const matchesTemporal = temporal === 'ongoing' || temporal === 'upcoming';
      
      // Search filter
      const matchesSearch = searchTerm === '' || 
        a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.description && a.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (a.location && a.location.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Status filter
      const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
      
      return matchesTemporal && matchesSearch && matchesStatus;
    }).sort((a, b) => {
      // Sort by status first (published > ongoing > draft > others)
      const statusPriority: { [key: string]: number } = {
        'published': 1,
        'ongoing': 2,
        'draft': 3,
        'postponed': 4,
        'cancelled': 5,
        'completed': 6
      };
      const aPriority = statusPriority[a.status] || 99;
      const bPriority = statusPriority[b.status] || 99;
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      // Then sort by temporal status (ongoing before upcoming)
      const aTemporal = getTemporalStatus(a);
      const bTemporal = getTemporalStatus(b);
      if (aTemporal !== bTemporal) {
        if (aTemporal === 'ongoing') return -1;
        if (bTemporal === 'ongoing') return 1;
      }
      // Finally sort by date
      const aDate = a.type === 'multiple_days' && a.startDate 
        ? new Date(a.startDate).getTime() 
        : new Date(a.date).getTime();
      const bDate = b.type === 'multiple_days' && b.startDate 
        ? new Date(b.startDate).getTime() 
        : new Date(b.date).getTime();
      return aDate - bDate; // Sắp xếp tăng dần (sớm nhất trước)
    });
  }, [activities, searchTerm, statusFilter]);

  // Filter activities - Past
  const pastActivities = useMemo(() => {
    return activities.filter(a => {
      const temporal = getTemporalStatus(a);
      const matchesTemporal = temporal === 'past';
      
      // Search filter
      const matchesSearch = searchTerm === '' || 
        a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.description && a.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (a.location && a.location.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Status filter
      const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
      
      return matchesTemporal && matchesSearch && matchesStatus;
    }).sort((a, b) => {
      // Sort by end date for multiple days, or date for single day
      const aDate = a.type === 'multiple_days' && a.endDate 
        ? new Date(a.endDate).getTime() 
        : new Date(a.date).getTime();
      const bDate = b.type === 'multiple_days' && b.endDate 
        ? new Date(b.endDate).getTime() 
        : new Date(b.date).getTime();
      return bDate - aDate; // Sắp xếp giảm dần (mới nhất trước)
    });
  }, [activities, searchTerm, statusFilter]);

  // Paginated active activities
  const displayedActiveActivities = useMemo(() => {
    const start = (activePage - 1) * activeItemsPerPage;
    const end = start + activeItemsPerPage;
    return activeActivities.slice(start, end);
  }, [activeActivities, activePage, activeItemsPerPage]);

  // Reset active page when filters change
  useEffect(() => {
    setActivePage(1);
  }, [searchTerm, statusFilter]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };


  // Load theme only once on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
    }

    // Listen for theme changes
    const handleStorageChange = () => {
      const currentTheme = localStorage.getItem('theme');
      setIsDarkMode(currentTheme === 'dark');
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('themeChange', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('themeChange', handleStorageChange);
    };
  }, []);

  // Fetch attendance rates for past activities
  useEffect(() => {
    const fetchAttendanceRates = async () => {
      if (pastActivities.length === 0) return;
      
      setLoadingAttendanceRates(true);
      const rates: { [key: string]: number } = {};
      
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        // Fetch attendance data for all past activities in parallel
        const promises = pastActivities.map(async (activity) => {
          try {
            const response = await fetch(`/api/activities/${activity._id}/attendance`, {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            });
            
            if (response.ok) {
              const data = await response.json();
              if (data.success && data.data?.statistics) {
                rates[String(activity._id)] = data.data.statistics.attendanceRate || 0;
              }
            }
          } catch (error) {
            console.error(`Error fetching attendance for activity ${activity._id}:`, error);
          }
        });
        
        await Promise.all(promises);
        setAttendanceRates(rates);
      } catch (error) {
        console.error('Error fetching attendance rates:', error);
      } finally {
        setLoadingAttendanceRates(false);
      }
    };
    
    fetchAttendanceRates();
  }, [pastActivities]);

  // Fetch attendance rates for active activities
  useEffect(() => {
    const fetchActiveAttendanceRates = async () => {
      if (activeActivities.length === 0) return;
      
      setLoadingActiveAttendanceRates(true);
      const rates: { [key: string]: number } = {};
      
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        // Fetch attendance data for all active activities in parallel
        const promises = activeActivities.map(async (activity) => {
          try {
            const response = await fetch(`/api/activities/${activity._id}/attendance`, {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            });
            
            if (response.ok) {
              const data = await response.json();
              if (data.success && data.data?.statistics) {
                rates[String(activity._id)] = data.data.statistics.attendanceRate || 0;
              }
            }
          } catch (error) {
            console.error(`Error fetching attendance for activity ${activity._id}:`, error);
          }
        });
        
        await Promise.all(promises);
        setActiveAttendanceRates(rates);
      } catch (error) {
        console.error('Error fetching active attendance rates:', error);
      } finally {
        setLoadingActiveAttendanceRates(false);
      }
    };
    
    fetchActiveAttendanceRates();
  }, [activeActivities]);

  // Fetch pending participants count for all activities
  useEffect(() => {
    const fetchPendingParticipants = async () => {
      if (activities.length === 0) return;
      
      const counts: { [key: string]: number } = {};
      
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        // Fetch pending count for all activities in parallel
        const promises = activities.map(async (activity) => {
          try {
            const response = await fetch(`/api/activities/${activity._id}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            });
            
            if (response.ok) {
              const data = await response.json();
              if (data.success && data.data?.activity) {
                const participants = data.data.activity.participants || [];
                const pendingCount = participants.filter((p: any) => 
                  p.approvalStatus === 'pending' || (!p.approvalStatus && p.role === 'Người Tham Gia')
                ).length;
                counts[String(activity._id)] = pendingCount;
              }
            }
          } catch (error) {
            console.error(`Error fetching participants for activity ${activity._id}:`, error);
          }
        });
        
        await Promise.all(promises);
        setPendingParticipantsCount(counts);
      } catch (error) {
        console.error('Error fetching pending participants:', error);
      }
    };
    
    fetchPendingParticipants();
  }, [activities]);

  // Calculate overall attendance rate for past activities
  const overallAttendanceRate = useMemo(() => {
    if (pastActivities.length === 0) return null;
    
    // If still loading, return null to show loading state
    if (loadingAttendanceRates) return null;
    
    // Calculate average attendance rate
    const totalRate = pastActivities.reduce((sum, activity) => {
      return sum + (attendanceRates[String(activity._id)] || 0);
    }, 0);
    
    const average = pastActivities.length > 0 ? Math.round(totalRate / pastActivities.length) : 0;
    return average;
  }, [pastActivities, attendanceRates, loadingAttendanceRates]);

  // Calculate overall attendance rate for active activities
  const overallActiveAttendanceRate = useMemo(() => {
    if (activeActivities.length === 0) return null;
    
    // If still loading, return null to show loading state
    if (loadingActiveAttendanceRates) return null;
    
    // Calculate average attendance rate
    const totalRate = activeActivities.reduce((sum, activity) => {
      return sum + (activeAttendanceRates[String(activity._id)] || 0);
    }, 0);
    
    const average = activeActivities.length > 0 ? Math.round(totalRate / activeActivities.length) : 0;
    return average;
  }, [activeActivities, activeAttendanceRates, loadingActiveAttendanceRates]);

  // Measure left column content area height and apply to right column
  useEffect(() => {
    const measureHeight = () => {
      if (leftContentRef.current) {
        const height = leftContentRef.current.offsetHeight;
        if (height > 0) {
          setLeftColumnHeight(height);
        }
      }
      if (leftHeaderRef.current) {
        const height = leftHeaderRef.current.offsetHeight;
        if (height > 0) {
          setLeftHeaderHeight(height);
        }
      }
      if (searchBarRef.current) {
        const height = searchBarRef.current.offsetHeight;
        if (height > 0) {
          setSearchBarHeight(height);
        }
      }
    };

    if (loadingActivities) {
      // Set a reasonable min-height while loading
      setLeftColumnHeight(400);
      return;
    }

    // Measure immediately when loading finishes
    const updateHeight = () => {
      // First measurement - immediate
      requestAnimationFrame(() => {
        measureHeight();
        
        // Second measurement after images load
        requestAnimationFrame(() => {
          const images = document.querySelectorAll('img');
          if (images.length === 0) {
            measureHeight();
            return;
          }

          let loadedCount = 0;
          const totalImages = images.length;
          
          if (totalImages === 0) {
            measureHeight();
            return;
          }

          const checkAllLoaded = () => {
            loadedCount++;
            if (loadedCount >= totalImages) {
              requestAnimationFrame(() => {
                measureHeight();
              });
            }
          };

          Array.from(images).forEach((img) => {
            if (img.complete) {
              checkAllLoaded();
            } else {
              img.onload = checkAllLoaded;
              img.onerror = checkAllLoaded;
              // Timeout after 500ms
              setTimeout(checkAllLoaded, 500);
            }
          });
        });
      });
    };

    // Measure immediately when data loads
    updateHeight();
    
    // Use ResizeObserver for automatic updates
    let resizeObserver: ResizeObserver | null = null;
    if (leftContentRef.current && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        measureHeight();
      });
      resizeObserver.observe(leftContentRef.current);
    }

    // Also measure when window resizes
    window.addEventListener('resize', measureHeight);
    
    return () => {
      if (resizeObserver && leftContentRef.current) {
        resizeObserver.unobserve(leftContentRef.current);
      }
      window.removeEventListener('resize', measureHeight);
    };
  }, [displayedActiveActivities, pastActivities, loadingActivities]);

  // Measure height immediately when loading finishes
  useEffect(() => {
    if (!loadingActivities && leftContentRef.current) {
      // Measure immediately when loading finishes
      const measureImmediately = () => {
        if (leftContentRef.current) {
          const height = leftContentRef.current.offsetHeight;
          if (height > 0) {
            setLeftColumnHeight(height);
          }
        }
        if (leftHeaderRef.current) {
          const height = leftHeaderRef.current.offsetHeight;
          if (height > 0) {
            setLeftHeaderHeight(height);
          }
        }
      };

      // Measure multiple times to catch layout changes
      requestAnimationFrame(() => {
        measureImmediately();
        requestAnimationFrame(() => {
          measureImmediately();
          setTimeout(measureImmediately, 100);
        });
      });
    }
  }, [loadingActivities]);

  // Fetch activities when component mounts
  useEffect(() => {
    // Fetch data after a short delay to ensure user is loaded
    const timer = setTimeout(() => {
      fetchActivities();
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, [fetchActivities]);


  return (
    <ProtectedRoute>
      <div className={`min-h-screen flex flex-col transition-colors duration-200 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <OfficerNav />
        
        <main className="flex-1 max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
          {/* Welcome Section - Compact */}
          <div className="mb-4">
            <h1 className={`text-xl sm:text-2xl font-bold mb-1 transition-colors duration-200 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Chào mừng, {user?.name || 'Officer'}!
            </h1>
            <p className={`text-xs sm:text-sm transition-colors duration-200 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Quản lý hoạt động và điểm danh sinh viên
            </p>
          </div>

          {/* Activities Overview - 2 Column Layout */}
          <div className="w-full mb-4">
            {/* Search and Filter Bar - Compact */}
            <div ref={searchBarRef} className={`mb-3 p-2 border rounded-lg ${
              isDarkMode ? 'border-gray-600 bg-gray-800/50' : 'border-gray-300 bg-gray-50'
            }`}>
              <div className="flex flex-col sm:flex-row gap-2">
                {/* Search Input */}
                <div className="flex-1 relative">
                  <Search 
                    size={14} 
                    className={`absolute left-2 top-1/2 -translate-y-1/2 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}
                  />
                  <input
                    type="text"
                    placeholder="Tìm kiếm hoạt động..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`w-full pl-8 pr-7 py-1.5 text-xs rounded-md border ${
                      isDarkMode 
                        ? 'border-gray-600 bg-gray-800 text-white placeholder-gray-400' 
                        : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                    } focus:outline-none focus:ring-1 focus:ring-blue-500`}
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className={`absolute right-2 top-1/2 -translate-y-1/2 ${
                        isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={`px-2.5 py-1.5 text-xs rounded-md border ${
                    isDarkMode 
                      ? 'border-gray-600 bg-gray-800 text-white' 
                      : 'border-gray-300 bg-white text-gray-900'
                  } focus:outline-none focus:ring-1 focus:ring-blue-500`}
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="draft">Bản nháp</option>
                  <option value="published">Đã xuất bản</option>
                  <option value="ongoing">Đang diễn ra</option>
                  <option value="completed">Hoàn thành</option>
                  <option value="cancelled">Đã hủy</option>
                </select>

                {/* Clear Filters Button */}
                {(statusFilter !== 'all' || searchTerm) && (
                  <button
                    onClick={() => {
                      setStatusFilter('all');
                      setSearchTerm('');
                    }}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded-md border transition-all duration-200 ${
                      isDarkMode
                        ? 'border-gray-600 bg-gray-800 text-gray-300 hover:bg-gray-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                    title="Xóa tất cả bộ lọc"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
              {/* Main Column - Active Activities */}
              <div ref={leftColumnRef} className="lg:col-span-8 flex flex-col">
                {/* Header - Compact */}
                <div ref={leftHeaderRef} className={`mb-2 pb-2 border-b flex-shrink-0 ${
                  isDarkMode ? 'border-gray-600' : 'border-gray-300'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className={`text-base font-bold leading-tight ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        Hoạt động - Đang diễn ra & Sắp diễn ra
                      </h2>
                      <p className={`text-xs mt-0.5 leading-tight ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {activeActivities.length} hoạt động {activeActivities.length > activeItemsPerPage && `(hiển thị ${activeItemsPerPage})`}
                      </p>
                    </div>
                    {activeActivities.length > 0 && (
                      <div className="text-right">
                        <span className={`text-[10px] font-medium block ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          Tỉ lệ điểm danh
                        </span>
                        {loadingActiveAttendanceRates ? (
                          <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            ...
                          </span>
                        ) : overallActiveAttendanceRate !== null ? (
                          <span className={`text-sm font-bold ${
                            overallActiveAttendanceRate >= 80
                              ? isDarkMode ? 'text-green-400' : 'text-green-600'
                              : overallActiveAttendanceRate >= 60
                                ? isDarkMode ? 'text-yellow-400' : 'text-yellow-600'
                                : isDarkMode ? 'text-red-400' : 'text-red-600'
                          }`}>
                            {overallActiveAttendanceRate}%
                          </span>
                        ) : (
                          <span className={`text-sm font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            0%
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Activities Grid with Pagination */}
                <div ref={leftContentRef} className="flex-1 min-h-0 flex flex-col" style={{
                  minHeight: loadingActivities ? '400px' : (leftColumnHeight ? `${leftColumnHeight}px` : '0')
                }}>
                  {loadingActivities ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <Loader2 size={32} strokeWidth={2} className="animate-spin text-blue-500 mb-3" />
                      <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        Đang tải hoạt động...
                      </p>
                    </div>
                  ) : displayedActiveActivities.length > 0 ? (
                    <>
                      <div 
                        className={`flex-1 border rounded-lg ${
                          isDarkMode 
                            ? 'border-blue-500/50 bg-gray-800/50' 
                            : 'border-blue-300 bg-white'
                        }`}
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-3 items-stretch" style={{ gridAutoRows: '1fr' }}>
                          {displayedActiveActivities.map((activity) => {
                            const StatusIcon = statusConfig[activity.status].icon;
                            const isCompleted = activity.status === 'completed';
                            const isOngoing = activity.status === 'ongoing';
                            const isPublished = activity.status === 'published';
                            const temporalStatus = getTemporalStatus(activity);
                            const activityDate = new Date(activity.date);
                            const isToday = !isNaN(activityDate.getTime()) && activityDate.toDateString() === new Date().toDateString();
                            const participationRate = activity.maxParticipants
                              ? Math.round((activity.participants.length / activity.maxParticipants) * 100)
                              : 0;
                            const attendanceRate = activeAttendanceRates[String(activity._id)] ?? null;

                    return (
                      <div
                        key={String(activity._id)}
                        className={`group relative flex flex-col h-full overflow-hidden rounded-lg transition-all duration-200 hover:shadow-lg cursor-pointer hover:-translate-y-1 ${
                          isDarkMode
                            ? `bg-gray-800/90 shadow-md ${
                                activity.type === 'multiple_days'
                                  ? 'border border-purple-500/30'
                                  : 'border border-gray-700/50'
                              }`
                            : `bg-white shadow-md ${
                                activity.type === 'multiple_days'
                                  ? 'border border-purple-400/30'
                                  : 'border border-gray-200/50'
                              }`
                        }`}
                        onClick={() => window.location.href = `/officer/activities/${activity._id}`}
                      >
                        {/* Status Header */}
                        <div className={`relative px-3 py-2 rounded-t-lg overflow-hidden ${
                          temporalStatus === 'ongoing'
                            ? 'bg-gradient-to-r from-red-500 to-red-600 text-white'
                            : 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white'
                        }`}>
                          <div className="relative flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${
                                activity.type === 'multiple_days'
                                  ? 'bg-purple-600/80'
                                  : 'bg-blue-600/80'
                              }`}>
                                {activity.type === 'multiple_days' ? (
                                  <CalendarRange size={10} strokeWidth={2.5} className="text-white" />
                                ) : (
                                  <CalendarDays size={10} strokeWidth={2.5} className="text-white" />
                                )}
                              </div>
                              <div className={`p-0.5 rounded-full flex-shrink-0 ${
                                temporalStatus === 'ongoing'
                                  ? 'bg-red-700/50'
                                  : 'bg-green-700/50'
                              }`}>
                                <StatusIcon size={11} strokeWidth={2} />
                              </div>
                              <span className="text-xs font-bold truncate flex-1">{statusConfig[activity.status].label}</span>
                            </div>
                            <div className={`px-2 py-0.5 rounded text-[10px] font-semibold backdrop-blur-sm border flex-shrink-0 whitespace-nowrap ${
                              temporalStatus === 'ongoing'
                                ? 'bg-red-700/60 border-red-600/50'
                                : 'bg-green-700/60 border-green-600/50'
                            }`}>
                              {temporalStatus === 'ongoing' ? 'Đang diễn ra' : isToday ? 'Hôm nay' : 'Sắp tới'}
                            </div>
                          </div>
                        </div>

                        {/* Activity Image */}
                        <div className="h-32 overflow-hidden relative bg-gray-200 dark:bg-gray-700">
                          {activity.imageUrl ? (
                            <img
                              src={activity.imageUrl}
                              alt={activity.name}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const placeholder = target.nextElementSibling as HTMLElement;
                                if (placeholder) placeholder.style.display = 'flex';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Target size={32} strokeWidth={2} className="text-gray-400 dark:text-gray-500" />
                            </div>
                          )}
                        </div>

                        {/* Title Section */}
                        <div className="px-4 py-3 border-b border-gray-100/50 dark:border-gray-700/50">
                          <h3 className={`text-sm font-bold leading-tight line-clamp-2 transition-all duration-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 ${
                            isDarkMode ? 'text-white' : 'text-gray-900'
                          }`}>
                            {activity.name}
                          </h3>
                        </div>

                        {/* Content */}
                        <div className="flex-1 px-4 py-3 space-y-3">
                          {/* Date */}
                          <div className="flex items-center gap-2">
                            <Calendar size={14} strokeWidth={2} className={
                              isToday ? 'text-blue-500' : temporalStatus === 'ongoing' ? 'text-red-500' : 'text-gray-400'
                            } />
                            <div className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              {(() => {
                                const date = new Date(activity.date);
                                return isNaN(date.getTime())
                                  ? 'Chưa cập nhật'
                                  : date.toLocaleDateString('vi-VN', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric'
                                    });
                              })()}
                            </div>
                          </div>

                          {/* Location */}
                          <div className="flex items-center gap-2">
                            <MapPin size={14} strokeWidth={2} className="text-green-500 flex-shrink-0" />
                            <div className={`text-xs font-medium truncate flex-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              {activity.location || 'Chưa cập nhật địa điểm'}
                            </div>
                          </div>

                          {/* Responsible Person */}
                          {activity.responsiblePerson && (
                            <div className="flex items-center gap-2">
                              <Briefcase size={14} strokeWidth={2} className="text-amber-500 flex-shrink-0" />
                              <div className={`text-xs font-medium truncate flex-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                Phụ trách: {activity.responsiblePerson.name}
                              </div>
                            </div>
                          )}

                          {/* Participants */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <Users size={14} strokeWidth={2} className="text-purple-500 flex-shrink-0" />
                              <div className={`text-xs font-semibold truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                {activity.participants.length}
                                {activity.maxParticipants && (
                                  <span className={`text-xs font-normal ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                    /{activity.maxParticipants}
                                  </span>
                                )}
                              </div>
                            </div>
                            {activity.maxParticipants && (
                              <div className="flex items-center gap-1.5">
                                <div className="w-12 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      participationRate >= 100
                                        ? 'bg-red-500'
                                        : participationRate >= 80
                                        ? 'bg-orange-500'
                                        : 'bg-green-500'
                                    }`}
                                    style={{ width: `${Math.min(participationRate, 100)}%` }}
                                  />
                                </div>
                                <span className={`text-[10px] font-medium whitespace-nowrap ${
                                  participationRate >= 100
                                    ? 'text-red-600'
                                    : participationRate >= 80
                                    ? 'text-orange-600'
                                    : 'text-green-600'
                                }`}>
                                  {participationRate}%
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Attendance Rate */}
                          {attendanceRate !== null && attendanceRate !== undefined && (
                            <div className="flex items-center gap-2">
                              <TrendingUp size={14} strokeWidth={2} className="text-blue-500 flex-shrink-0" />
                              <div className={`text-xs font-medium flex-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                <span>Tỉ lệ điểm danh: </span>
                                <span className={`font-semibold ${
                                  attendanceRate >= 80
                                    ? isDarkMode ? 'text-green-400' : 'text-green-600'
                                    : attendanceRate >= 60
                                      ? isDarkMode ? 'text-yellow-400' : 'text-yellow-600'
                                      : isDarkMode ? 'text-red-400' : 'text-red-600'
                                }`}>
                                  {attendanceRate}%
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="px-3 py-2 border-t border-gray-100/50 dark:border-gray-700/50 rounded-b-lg">
                          <div className="flex gap-1.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                window.location.href = `/officer/activities/${activity._id}`;
                              }}
                              className={`group flex-1 py-2 px-2 bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-200 font-medium rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-blue-400 transition-all duration-200 flex items-center gap-1.5`}
                              title="Xem chi tiết"
                            >
                              <Eye size={14} strokeWidth={2.5} className="text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 flex-shrink-0" />
                              <div className="flex-1 text-left min-w-0">
                                <div className="text-[10px] font-semibold leading-tight">Chi</div>
                                <div className="text-[10px] font-semibold leading-tight">tiết</div>
                              </div>
                            </button>

                            {/* Participants Management */}
                            {(temporalStatus === 'ongoing' || temporalStatus === 'upcoming') && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.location.href = `/officer/activities/${activity._id}/participants`;
                                }}
                                className={`group relative flex-1 py-2 px-2 bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-200 font-medium rounded-md hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-700 dark:hover:text-purple-400 transition-all duration-200 flex items-center gap-1.5`}
                                title="Người tham gia"
                              >
                                <div className="relative">
                                  <Users size={14} strokeWidth={2.5} className="text-gray-500 dark:text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 flex-shrink-0" />
                                  {(pendingParticipantsCount[String(activity._id)] ?? 0) > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold rounded-full h-4 w-4 flex items-center justify-center border border-white dark:border-gray-800">
                                      {(pendingParticipantsCount[String(activity._id)] ?? 0) > 9 ? '9+' : (pendingParticipantsCount[String(activity._id)] ?? 0)}
                                    </span>
                                  )}
                                </div>
                                <div className="flex-1 text-left min-w-0">
                                  <div className="text-[10px] font-semibold leading-tight">Thành</div>
                                  <div className="text-[10px] font-semibold leading-tight">viên</div>
                                </div>
                              </button>
                            )}

                            {/* Attendance Actions */}
                            {temporalStatus === 'ongoing' ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.location.href = `/officer/attendance/${activity._id}`;
                                }}
                                className={`group flex-1 py-2 px-2 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 font-medium rounded-md hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-all duration-200 flex items-center gap-1.5 animate-pulse`}
                                title="Điểm danh"
                              >
                                <UserCheck size={14} strokeWidth={2.5} className="text-orange-600 dark:text-orange-400 flex-shrink-0" />
                                <div className="flex-1 text-left min-w-0">
                                  <div className="text-[10px] font-semibold leading-tight">Điểm</div>
                                  <div className="text-[10px] font-semibold leading-tight">danh</div>
                                </div>
                              </button>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.location.href = `/officer/attendance/${activity._id}`;
                                }}
                                className={`group flex-1 py-2 px-2 bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-200 font-medium rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 flex items-center gap-1.5`}
                                title="Chuẩn bị"
                              >
                                <UserCheck size={14} strokeWidth={2.5} className="text-gray-500 dark:text-gray-400 flex-shrink-0" />
                                <div className="flex-1 text-left min-w-0">
                                  <div className="text-[10px] font-semibold leading-tight">Chuẩn</div>
                                  <div className="text-[10px] font-semibold leading-tight">bị</div>
                                </div>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                          })}
                        </div>
                      </div>
                      
                      {/* Pagination - Compact */}
                      {!loadingActivities && activeActivities.length > 0 && (
                        <div className="mt-2 px-2 py-1.5 border-t border-gray-300 dark:border-gray-700">
                          <PaginationBar
                            totalItems={activeActivities.length}
                            currentPage={activePage}
                            itemsPerPage={activeItemsPerPage}
                            onPageChange={(page) => setActivePage(page)}
                            onItemsPerPageChange={(newItemsPerPage) => {
                              setActiveItemsPerPage(newItemsPerPage);
                              setActivePage(1);
                            }}
                            itemLabel="hoạt động"
                            isDarkMode={isDarkMode}
                            itemsPerPageOptions={[3, 6, 9, 12, 18]}
                          />
                        </div>
                      )}
                    </>
                  ) : (
                    <div className={`text-center py-8 rounded-lg border border-dashed ${
                      isDarkMode 
                        ? 'bg-gray-800/30 border-gray-700/50 text-gray-400' 
                        : 'bg-gray-50 border-gray-200 text-gray-500'
                    }`}>
                      <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-2 ${
                        isDarkMode ? 'bg-gray-700/50' : 'bg-gray-100'
                      }`}>
                        <Inbox size={24} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} strokeWidth={1.5} />
                      </div>
                      <p className="text-sm font-semibold mb-1">Chưa có hoạt động</p>
                      <p className="text-xs">Không có hoạt động đang diễn ra hoặc sắp diễn ra</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column - Past Activities */}
              <div className="lg:col-span-4 flex flex-col">
                {/* Header - Compact */}
                <div className={`mb-2 pb-2 border-b flex-shrink-0 ${
                  isDarkMode ? 'border-gray-600' : 'border-gray-300'
                }`} style={{ 
                  height: leftHeaderHeight ? `${leftHeaderHeight}px` : 'auto',
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-start'
                }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className={`text-base font-bold leading-tight ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        Đã kết thúc
                      </h2>
                      <p className={`text-xs mt-0.5 leading-tight ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {pastActivities.length} hoạt động
                      </p>
                    </div>
                    {pastActivities.length > 0 && (
                      <div className="text-right">
                        <span className={`text-[10px] font-medium block ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          Tỉ lệ điểm danh
                        </span>
                        {loadingAttendanceRates ? (
                          <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            ...
                          </span>
                        ) : overallAttendanceRate !== null ? (
                          <span className={`text-sm font-bold ${
                            overallAttendanceRate >= 80
                              ? isDarkMode ? 'text-green-400' : 'text-green-600'
                              : overallAttendanceRate >= 60
                                ? isDarkMode ? 'text-yellow-400' : 'text-yellow-600'
                                : isDarkMode ? 'text-red-400' : 'text-red-600'
                          }`}>
                            {overallAttendanceRate}%
                          </span>
                        ) : (
                          <span className={`text-sm font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            0%
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Past Activities List - Scrollable, Height matches left side */}
                {pastActivities.length > 0 ? (
                  <div 
                    className={`border rounded-lg overflow-y-auto flex-1 min-h-0 ${
                      isDarkMode ? 'border-gray-600 bg-gray-800/50' : 'border-gray-300 bg-white'
                    }`}
                    style={{ 
                      height: leftColumnHeight ? `${leftColumnHeight}px` : (loadingActivities ? '400px' : 'auto'),
                      maxHeight: leftColumnHeight ? `${leftColumnHeight}px` : 'none',
                      minHeight: loadingActivities ? '400px' : (leftColumnHeight ? `${leftColumnHeight}px` : '0'),
                      transition: leftColumnHeight ? 'height 0.2s ease-out' : 'none'
                    }}
                  >
                    <div className="divide-y divide-gray-300 dark:divide-gray-600">
                      {pastActivities.map((activity) => {
                        const StatusIcon = statusConfig[activity.status].icon;
                        const activityDate = new Date(activity.date);
                        const participationRate = activity.maxParticipants
                          ? Math.round((activity.participants.length / activity.maxParticipants) * 100)
                          : 0;
                        const attendanceRate = attendanceRates[String(activity._id)] ?? null;

                        return (
                          <div
                            key={String(activity._id)}
                            className={`p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer ${
                              isDarkMode ? 'bg-gray-800/30' : 'bg-white'
                            }`}
                            onClick={() => window.location.href = `/officer/activities/${activity._id}`}
                          >
                            <div className="flex items-start gap-2">
                              {/* Image - Smaller */}
                              <div className="w-12 h-12 flex-shrink-0 rounded overflow-hidden bg-gray-200 dark:bg-gray-700">
                                {activity.imageUrl ? (
                                  <img
                                    src={activity.imageUrl}
                                    alt={activity.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Target size={16} className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} />
                                  </div>
                                )}
                              </div>

                              {/* Content - Compact */}
                              <div className="flex-1 min-w-0">
                                <h4 className={`text-xs font-semibold line-clamp-2 mb-1 ${
                                  isDarkMode ? 'text-white' : 'text-gray-900'
                                }`}>
                                  {activity.name}
                                </h4>
                                
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1.5">
                                    <Calendar size={10} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                                    <span className={`text-[10px] ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                      {formatDate(activity.date)}
                                    </span>
                                  </div>

                                  {activity.responsiblePerson && (
                                    <div className="flex items-center gap-1.5">
                                      <Briefcase size={10} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                                      <span className={`text-[10px] truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                        {activity.responsiblePerson.name}
                                      </span>
                                    </div>
                                  )}

                                  <div className="flex items-center gap-1.5">
                                    <Users size={10} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                                    <span className={`text-[10px] ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                      {activity.participants.length}
                                      {activity.maxParticipants && `/${activity.maxParticipants}`}
                                    </span>
                                    {attendanceRate !== null && attendanceRate !== undefined && (
                                      <>
                                        <span className="text-[10px] text-gray-400">•</span>
                                        <TrendingUp size={10} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                                        <span className={`text-[10px] font-semibold ${
                                          attendanceRate >= 80
                                            ? isDarkMode ? 'text-green-400' : 'text-green-600'
                                            : attendanceRate >= 60
                                              ? isDarkMode ? 'text-yellow-400' : 'text-yellow-600'
                                              : isDarkMode ? 'text-red-400' : 'text-red-600'
                                        }`}>
                                          {attendanceRate}%
                                        </span>
                                      </>
                                    )}
                                  </div>

                                  <div>
                                    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium border ${
                                      activity.status === 'completed'
                                        ? isDarkMode ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-emerald-100 text-emerald-700 border-emerald-300'
                                        : activity.status === 'cancelled'
                                          ? isDarkMode ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-red-100 text-red-700 border-red-300'
                                          : isDarkMode ? 'bg-gray-500/20 text-gray-300 border-gray-500/30' : 'bg-gray-100 text-gray-700 border-gray-300'
                                    }`}>
                                      <StatusIcon size={8} />
                                      {statusConfig[activity.status].label}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className={`p-4 text-center border rounded-lg ${
                    isDarkMode 
                      ? 'border-gray-600 bg-gray-800/40 text-gray-400' 
                      : 'border-gray-300 bg-gray-50 text-gray-500'
                  }`}>
                    <CheckCircle2 size={20} className={`mx-auto mb-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                    <p className="text-xs font-semibold">Chưa có hoạt động</p>
                  </div>
                )}
              </div>
            </div>
          </div>

        </main>

        <Footer isDarkMode={isDarkMode} />
      </div>
    </ProtectedRoute>
  );
}
