'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';

// CSS for animated border
const animatedBorderStyle = `
  @keyframes borderRotate {
    0% {
      background-position: 0% 50%;
    }
    50% {
      background-position: 100% 50%;
    }
    100% {
      background-position: 0% 50%;
    }
  }
  .animated-border-ongoing {
    background: linear-gradient(90deg, #10b981, #059669, #047857, #065f46, #047857, #059669, #10b981);
    background-size: 200% 100%;
    animation: borderRotate 3s linear infinite;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    border-image: linear-gradient(90deg, #10b981, #059669, #047857, #065f46, #047857, #059669, #10b981) 1;
    border-image-slice: 1;
    animation: borderRotate 3s linear infinite;
  }
  .animated-border-upcoming {
    background: linear-gradient(90deg, #3b82f6, #2563eb, #1d4ed8, #1e40af, #1d4ed8, #2563eb, #3b82f6);
    background-size: 200% 100%;
    animation: borderRotate 3s linear infinite;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    border-image: linear-gradient(90deg, #3b82f6, #2563eb, #1d4ed8, #1e40af, #1d4ed8, #2563eb, #3b82f6) 1;
    border-image-slice: 1;
    animation: borderRotate 3s linear infinite;
  }
  .temporal-badge-ongoing {
    position: relative;
    border: 2px solid transparent;
    background: linear-gradient(white, white) padding-box,
                linear-gradient(90deg, #10b981, #059669, #047857, #065f46, #047857, #059669, #10b981) border-box;
    background-size: 200% 100%;
    animation: borderRotate 3s linear infinite;
  }
  .dark .temporal-badge-ongoing {
    background: linear-gradient(rgb(31, 41, 55), rgb(31, 41, 55)) padding-box,
                linear-gradient(90deg, #10b981, #059669, #047857, #065f46, #047857, #059669, #10b981) border-box;
    background-size: 200% 100%;
    animation: borderRotate 3s linear infinite;
  }
  .temporal-badge-upcoming {
    position: relative;
    border: 2px solid transparent;
    background: linear-gradient(white, white) padding-box,
                linear-gradient(90deg, #3b82f6, #2563eb, #1d4ed8, #1e40af, #1d4ed8, #2563eb, #3b82f6) border-box;
    background-size: 200% 100%;
    animation: borderRotate 3s linear infinite;
  }
  .dark .temporal-badge-upcoming {
    background: linear-gradient(rgb(31, 41, 55), rgb(31, 41, 55)) padding-box,
                linear-gradient(90deg, #3b82f6, #2563eb, #1d4ed8, #1e40af, #1d4ed8, #2563eb, #3b82f6) border-box;
    background-size: 200% 100%;
    animation: borderRotate 3s linear infinite;
  }
`;
import { 
  RefreshCw, 
  Clock,
  CheckCircle2,
  Calendar,
  CalendarDays,
  MapPin,
  Users,
  Eye,
  Edit,
  Trash2,
  Loader,
  Inbox,
  Zap,
  TrendingUp,
  FileEdit,
  XCircle,
  Pause,
  PartyPopper,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  X,
  UserCheck,
  UserCircle,
  Mail
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
  startDate?: string;
  endDate?: string;
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
  createdAt: string;
}

interface ActivityDashboardLayoutProps {
  isDarkMode: boolean;
  showActions?: boolean;
  onEdit?: (id: string, type?: 'single_day' | 'multiple_days') => void;
  onDelete?: (id: string) => void;
  onView?: (id: string) => void;
}

export default function ActivityDashboardLayout({ 
  isDarkMode, 
  showActions = true,
  onEdit, 
  onDelete, 
  onView 
}: ActivityDashboardLayoutProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePage, setActivePage] = useState(1);
  const [activeItemsPerPage, setActiveItemsPerPage] = useState(6);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [temporalFilter, setTemporalFilter] = useState<string>('all');
  const [attendanceRates, setAttendanceRates] = useState<{ [key: string]: number }>({});
  const [loadingAttendanceRates, setLoadingAttendanceRates] = useState(false);
  const [activeAttendanceRates, setActiveAttendanceRates] = useState<{ [key: string]: number }>({});
  const [loadingActiveAttendanceRates, setLoadingActiveAttendanceRates] = useState(false);
  const leftColumnRef = useRef<HTMLDivElement>(null);
  const leftHeaderRef = useRef<HTMLDivElement>(null);
  const leftContentRef = useRef<HTMLDivElement>(null);
  const searchBarRef = useRef<HTMLDivElement>(null);
  const [leftColumnHeight, setLeftColumnHeight] = useState<number | null>(null);
  const [leftHeaderHeight, setLeftHeaderHeight] = useState<number | null>(null);
  const [searchBarHeight, setSearchBarHeight] = useState<number | null>(null);

  // Fetch activities from API
  const fetchActivities = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/activities?limit=100');
      const data = await response.json();
      
      if (data.success) {
        setActivities(data.data.activities || []);
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

  useEffect(() => {
    fetchActivities();
  }, []);

  // Reset active page when filters change
  useEffect(() => {
    setActivePage(1);
  }, [searchQuery, statusFilter, temporalFilter]);

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

  // Filter activities - Admin view: show ALL activities
  const activeActivities = useMemo(() => {
    return activities.filter(a => {
      const temporal = getTemporalStatus(a);
      const matchesTemporal = temporal === 'ongoing' || temporal === 'upcoming';
      
      // Search filter
      const matchesSearch = searchQuery === '' || 
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.location && a.location.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // Status filter
      const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
      
      // Temporal filter
      const matchesTemporalFilter = temporalFilter === 'all' || temporal === temporalFilter;
      
      return matchesTemporal && matchesSearch && matchesStatus && matchesTemporalFilter;
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
  }, [activities, searchQuery, statusFilter, temporalFilter]);

  const pastActivities = useMemo(() => {
    return activities.filter(a => {
      const temporal = getTemporalStatus(a);
      const matchesTemporal = temporal === 'past';
      
      // Search filter
      const matchesSearch = searchQuery === '' || 
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.location && a.location.toLowerCase().includes(searchQuery.toLowerCase()));
      
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
  }, [activities, searchQuery, statusFilter]);

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
                rates[activity._id] = data.data.statistics.attendanceRate || 0;
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
                rates[activity._id] = data.data.statistics.attendanceRate || 0;
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

  // Calculate overall attendance rate for past activities
  const overallAttendanceRate = useMemo(() => {
    if (pastActivities.length === 0) return null;
    
    // If still loading, return null to show loading state
    if (loadingAttendanceRates) return null;
    
    // Calculate average attendance rate
    const totalRate = pastActivities.reduce((sum, activity) => {
      return sum + (attendanceRates[activity._id] || 0);
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
      return sum + (activeAttendanceRates[activity._id] || 0);
    }, 0);
    
    const average = activeActivities.length > 0 ? Math.round(totalRate / activeActivities.length) : 0;
    return average;
  }, [activeActivities, activeAttendanceRates, loadingActiveAttendanceRates]);

  // Paginated active activities
  const displayedActiveActivities = useMemo(() => {
    const start = (activePage - 1) * activeItemsPerPage;
    const end = start + activeItemsPerPage;
    return activeActivities.slice(start, end);
  }, [activeActivities, activePage, activeItemsPerPage]);

  // Measure left column content area height (after header) and apply to right column
  useEffect(() => {
    const updateHeight = () => {
      if (leftContentRef.current) {
        const height = leftContentRef.current.offsetHeight;
        setLeftColumnHeight(height);
      }
      if (leftHeaderRef.current) {
        const height = leftHeaderRef.current.offsetHeight;
        setLeftHeaderHeight(height);
      }
      if (searchBarRef.current) {
        const height = searchBarRef.current.offsetHeight;
        setSearchBarHeight(height);
      }
    };

    // Use setTimeout to ensure DOM is rendered, especially when filter dropdown opens/closes
    const timer = setTimeout(updateHeight, 150);
    updateHeight();

    window.addEventListener('resize', updateHeight);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateHeight);
    };
  }, [displayedActiveActivities, pastActivities]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatTime = (timeString: string) => {
    return timeString.substring(0, 5);
  };

  const ActivityCard = ({ 
    activity, 
    isPast = false,
    attendanceRate
  }: { 
    activity: Activity; 
    isPast?: boolean;
    attendanceRate?: number | null;
  }) => {
    const [showActionsMenu, setShowActionsMenu] = useState(false);
    const [showParticipantsModal, setShowParticipantsModal] = useState(false);
    const [participantsData, setParticipantsData] = useState<{
      responsiblePerson?: { name: string; email: string; avatarUrl?: string };
      participants: Array<{ 
        userId: string; 
        name: string; 
        email: string; 
        role: string; 
        joinedAt: string; 
        avatarUrl?: string;
        attendances?: Array<{
          timeSlot: string;
          checkInType: 'start' | 'end';
          checkInTime: string;
          status: 'pending' | 'approved' | 'rejected';
        }>;
      }>;
    } | null>(null);
    const [loadingParticipants, setLoadingParticipants] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
          setShowActionsMenu(false);
        }
      };

      if (showActionsMenu) {
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
          document.removeEventListener('mousedown', handleClickOutside);
        };
      }
    }, [showActionsMenu]);

    // Fetch participants data
    const fetchParticipants = async () => {
      // Use responsiblePerson directly from activity prop (already populated from API)
      const responsiblePersonData = activity.responsiblePerson ? {
        name: activity.responsiblePerson.name || 'N/A',
        email: activity.responsiblePerson.email || '',
        avatarUrl: activity.responsiblePerson.avatarUrl,
      } : undefined;

      // If we already have cached data, just show modal
      if (participantsData) {
        setShowParticipantsModal(true);
        return;
      }

      // Show modal immediately with responsiblePerson from activity
      // and fetch participants in the background
      if (responsiblePersonData) {
        setParticipantsData({
          responsiblePerson: responsiblePersonData,
          participants: activity.participants || [],
        });
        setShowParticipantsModal(true);
      }

      // Fetch detailed participants data and attendance from API
      setLoadingParticipants(true);
      try {
        const token = localStorage.getItem('token');
        
        // Fetch activity details
        const activityResponse = await fetch(`/api/activities/${activity._id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        // Fetch attendance data
        const attendanceResponse = await fetch(`/api/activities/${activity._id}/attendance`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (activityResponse.ok) {
          const activityData = await activityResponse.json();
          let attendanceMap: { [userId: string]: Array<{
            timeSlot: string;
            checkInType: 'start' | 'end';
            checkInTime: string;
            status: 'pending' | 'approved' | 'rejected';
          }> } = {};

          // Process attendance data if available
          if (attendanceResponse.ok) {
            const attendanceData = await attendanceResponse.json();
            if (attendanceData.success && attendanceData.data?.attendances) {
              attendanceData.data.attendances.forEach((att: any) => {
                const userId = typeof att.userId === 'object' ? att.userId._id : att.userId;
                if (att.attendances && Array.isArray(att.attendances)) {
                  attendanceMap[userId] = att.attendances.map((a: any) => ({
                    timeSlot: a.timeSlot || '',
                    checkInType: a.checkInType || 'start',
                    checkInTime: a.checkInTime || '',
                    status: a.status || 'pending',
                  }));
                }
              });
            }
          }

          if (activityData.success && activityData.data.activity) {
            const activityDataObj = activityData.data.activity;
            const processedData = {
              // Always use responsiblePerson from activity prop (most up-to-date)
              responsiblePerson: responsiblePersonData || (activityDataObj.responsiblePerson ? {
                name: typeof activityDataObj.responsiblePerson === 'object' 
                  ? activityDataObj.responsiblePerson.name 
                  : activityDataObj.responsiblePerson,
                email: typeof activityDataObj.responsiblePerson === 'object' 
                  ? activityDataObj.responsiblePerson.email 
                  : '',
                avatarUrl: typeof activityDataObj.responsiblePerson === 'object' 
                  ? activityDataObj.responsiblePerson.avatarUrl 
                  : undefined,
              } : undefined),
              participants: (activityDataObj.participants || []).map((p: any) => {
                const userId = typeof p.userId === 'object' ? p.userId._id : p.userId;
                return {
                  userId: userId,
                  name: typeof p.userId === 'object' ? p.userId.name : p.name || 'N/A',
                  email: typeof p.userId === 'object' ? p.userId.email : p.email || '',
                  role: p.role || 'Thành viên',
                  joinedAt: p.joinedAt || activityDataObj.createdAt,
                  avatarUrl: typeof p.userId === 'object' ? p.userId.avatarUrl : p.avatarUrl,
                  attendances: attendanceMap[userId] || [],
                };
              }),
            };
            // Update with detailed participants data
            setParticipantsData(processedData);
          }
        }
      } catch (error) {
        console.error('Error fetching participants:', error);
        // Modal already shown with responsiblePerson, so just keep it open
      } finally {
        setLoadingParticipants(false);
      }
    };

    const getStatusConfig = (status: string) => {
      const statusConfig: { [key: string]: { bg: string; text: string; label: string; icon: React.ReactNode } } = {
        draft: { 
          bg: isDarkMode ? 'bg-transparent border-amber-500' : 'bg-transparent border-amber-500', 
          text: isDarkMode ? 'text-amber-400' : 'text-amber-600', 
          label: 'Nháp', 
          icon: <FileEdit size={10} strokeWidth={2} />
        },
        published: { 
          bg: isDarkMode ? 'bg-transparent border-indigo-500' : 'bg-transparent border-indigo-500', 
          text: isDarkMode ? 'text-indigo-400' : 'text-indigo-600', 
          label: 'Đã xuất bản', 
          icon: <CheckCircle2 size={10} strokeWidth={2} />
        },
        ongoing: { 
          bg: isDarkMode ? 'bg-transparent border-blue-500' : 'bg-transparent border-blue-500', 
          text: isDarkMode ? 'text-blue-400' : 'text-blue-600', 
          label: 'Đang diễn ra', 
          icon: <RefreshCw size={10} strokeWidth={2} />
        },
        completed: { 
          bg: isDarkMode ? 'bg-transparent border-purple-500' : 'bg-transparent border-purple-500', 
          text: isDarkMode ? 'text-purple-400' : 'text-purple-600', 
          label: 'Hoàn thành', 
          icon: <PartyPopper size={10} strokeWidth={2} />
        },
        cancelled: { 
          bg: isDarkMode ? 'bg-transparent border-red-500' : 'bg-transparent border-red-500', 
          text: isDarkMode ? 'text-red-400' : 'text-red-600', 
          label: 'Đã hủy', 
          icon: <XCircle size={10} strokeWidth={2} />
        },
        postponed: { 
          bg: isDarkMode ? 'bg-transparent border-orange-500' : 'bg-transparent border-orange-500', 
          text: isDarkMode ? 'text-orange-400' : 'text-orange-600', 
          label: 'Tạm hoãn', 
          icon: <Pause size={10} strokeWidth={2} />
        },
      };
      return statusConfig[status] || statusConfig.draft;
    };
    const participantCount = activity.participants?.length || 0;
    const maxParticipants = activity.maxParticipants || Infinity;
    const activeTimeSlots = activity.timeSlots?.filter((slot: any) => slot.isActive) || [];
    const temporalStatus = getTemporalStatus(activity);
    const firstTimeSlot = activeTimeSlots[0];

    // Different layout for main column (left) vs right column
    if (!isPast) {
      // New vertical card layout for main column
      return (
        <div 
          className={`group transition-all duration-200 relative overflow-hidden rounded-lg border border-l-4 h-full flex flex-col ${
            isDarkMode 
              ? 'bg-gray-800/60 hover:bg-gray-800/80 border-gray-600' 
              : 'bg-white hover:bg-gray-50 border-gray-300'
          } ${
            temporalStatus === 'ongoing'
              ? 'border-l-green-500'
              : activity.status === 'published'
              ? 'border-l-blue-500'
              : activity.status === 'draft'
              ? 'border-l-amber-500'
              : activity.status === 'cancelled'
              ? 'border-l-red-500'
              : isDarkMode ? 'border-l-gray-500' : 'border-l-gray-400'
          }`}
        >
          {/* Image Header - Fixed Height - Clickable to edit */}
          <div 
            className="relative w-full h-40 overflow-hidden flex-shrink-0 cursor-pointer group"
            onClick={() => onEdit && onEdit(activity._id, activity.type)}
          >
            {activity.imageUrl ? (
              <img 
                src={activity.imageUrl} 
                alt={activity.name}
                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            ) : (
              <div className={`w-full h-full flex items-center justify-center transition-colors duration-200 ${
                activity.type === 'single_day'
                  ? isDarkMode ? 'bg-gray-800 group-hover:bg-gray-700' : 'bg-gray-100 group-hover:bg-gray-200'
                  : isDarkMode ? 'bg-gray-800 group-hover:bg-gray-700' : 'bg-gray-100 group-hover:bg-gray-200'
              }`}>
                {activity.type === 'single_day' ? (
                  <Calendar size={40} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} />
                ) : (
                  <CalendarDays size={40} className={isDarkMode ? 'text-purple-400' : 'text-purple-600'} />
                )}
              </div>
            )}
            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 flex items-center justify-center">
              <Eye size={24} className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-white" />
            </div>

            {/* Actions Button - Top Right Corner */}
            {showActions && (
              <div 
                className="absolute top-2 right-2 flex-shrink-0 z-10" 
                ref={menuRef}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setShowActionsMenu(!showActionsMenu)}
                  className={`p-1.5 rounded-md transition-all duration-200 ${
                    isDarkMode 
                      ? 'text-gray-200 hover:text-white hover:bg-gray-800/80 bg-gray-900/70 backdrop-blur-sm' 
                      : 'text-gray-700 hover:text-gray-900 hover:bg-white/90 bg-white/80 backdrop-blur-sm'
                  } shadow-lg`}
                >
                  <MoreVertical size={16} strokeWidth={2} />
                </button>

                {/* Dropdown Menu */}
                {showActionsMenu && (
                  <div className={`absolute right-0 top-full mt-1 w-36 rounded-md border border-gray-300 dark:border-gray-600 shadow-lg z-20 ${
                    isDarkMode 
                      ? 'bg-gray-800' 
                      : 'bg-white'
                  }`}>
                    <div className="py-1">
                      {onEdit && (
                        <button
                          onClick={() => {
                            onEdit(activity._id, activity.type);
                            setShowActionsMenu(false);
                          }}
                          className={`w-full px-3 py-1.5 text-xs font-medium transition-all duration-200 flex items-center gap-2 ${
                            isDarkMode 
                              ? 'text-green-400 hover:bg-green-500/20' 
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                        >
                          <Edit size={12} strokeWidth={2} />
                          <span>Chỉnh sửa</span>
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => {
                            onDelete(activity._id);
                            setShowActionsMenu(false);
                          }}
                          className={`w-full px-3 py-1.5 text-xs font-medium transition-all duration-200 flex items-center gap-2 ${
                            isDarkMode 
                              ? 'text-red-400 hover:bg-red-500/20' 
                              : 'text-red-600 hover:bg-red-50'
                          }`}
                        >
                          <Trash2 size={12} strokeWidth={2} />
                          <span>Xóa</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-3 sm:p-4 flex-1 flex flex-col min-h-0 relative">
            {/* Title */}
            <div className="flex items-start gap-2 mb-2.5 flex-shrink-0 min-h-[2.5rem]">
              <h3 className={`font-semibold text-sm sm:text-base line-clamp-2 flex-1 leading-tight ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {activity.name}
              </h3>
            </div>
            
            {/* Status Badges - Temporal status on first row, activity status on second row */}
            <div className="flex flex-col gap-1.5 mb-3 flex-shrink-0">
              {/* First Row - Temporal Status Badge with animated border */}
              <div className="flex items-center gap-1.5 min-h-[1.5rem]">
                <span 
                  className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded ${
                    temporalStatus === 'ongoing'
                      ? isDarkMode ? 'temporal-badge-ongoing text-green-400' : 'temporal-badge-ongoing text-green-600'
                      : isDarkMode ? 'temporal-badge-upcoming text-blue-400' : 'temporal-badge-upcoming text-blue-600'
                  }`}
                  style={{
                    border: '2px solid transparent',
                    background: temporalStatus === 'ongoing'
                      ? isDarkMode 
                        ? 'linear-gradient(rgb(31, 41, 55), rgb(31, 41, 55)) padding-box, linear-gradient(90deg, #10b981, #059669, #047857, #065f46, #047857, #059669, #10b981) border-box'
                        : 'linear-gradient(white, white) padding-box, linear-gradient(90deg, #10b981, #059669, #047857, #065f46, #047857, #059669, #10b981) border-box'
                      : isDarkMode
                        ? 'linear-gradient(rgb(31, 41, 55), rgb(31, 41, 55)) padding-box, linear-gradient(90deg, #3b82f6, #2563eb, #1d4ed8, #1e40af, #1d4ed8, #2563eb, #3b82f6) border-box'
                        : 'linear-gradient(white, white) padding-box, linear-gradient(90deg, #3b82f6, #2563eb, #1d4ed8, #1e40af, #1d4ed8, #2563eb, #3b82f6) border-box',
                    backgroundSize: '200% 100%',
                    animation: 'borderRotate 3s linear infinite'
                  }}
                >
                  {temporalStatus === 'ongoing' ? (
                    <>
                      <RefreshCw size={10} strokeWidth={2} />
                      <span>Đang diễn ra</span>
                    </>
                  ) : (
                    <>
                      <Clock size={10} strokeWidth={2} />
                      <span>Sắp diễn ra</span>
                    </>
                  )}
                </span>
              </div>
              
              {/* Second Row - Activity Status Badge */}
              <div className="flex items-center gap-1.5 min-h-[1.5rem]">
                {(() => {
                  const statusConfig = getStatusConfig(activity.status);
                  return (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded border ${statusConfig.bg} ${statusConfig.text}`}>
                      {statusConfig.icon}
                      <span>{statusConfig.label}</span>
                    </span>
                  );
                })()}
              </div>
            </div>

            {/* Info Grid - Pushed to bottom */}
            <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-400 mt-auto flex-shrink-0">
              <div className="flex items-center gap-1.5 min-h-[1.25rem]">
                {activity.type === 'multiple_days' ? (
                  <CalendarDays size={12} strokeWidth={2} className="flex-shrink-0" />
                ) : (
                  <Calendar size={12} strokeWidth={2} className="flex-shrink-0" />
                )}
                <span className="truncate">
                  {activity.type === 'multiple_days' && activity.startDate && activity.endDate
                    ? `${formatDate(activity.startDate)} - ${formatDate(activity.endDate)}`
                    : formatDate(activity.date)}
                </span>
              </div>
              
              {activity.location && (
                <div className="flex items-center gap-1.5 min-h-[1.25rem]">
                  <MapPin size={12} strokeWidth={2} className="flex-shrink-0" />
                  <span className="truncate line-clamp-1">{activity.location}</span>
                </div>
              )}
              
              <div className="flex items-center gap-1.5 min-h-[1.25rem]">
                <Users size={12} strokeWidth={2} className="flex-shrink-0" />
                <span>{participantCount}{maxParticipants !== Infinity ? `/${maxParticipants}` : ''}</span>
              </div>
              
              {/* Attendance Rate */}
              {attendanceRate !== undefined && (
                <div className="flex items-center gap-1.5 min-h-[1.25rem]">
                  <TrendingUp size={12} strokeWidth={2} className="flex-shrink-0" />
                  <span className="flex items-center gap-1">
                    <span>Tỉ lệ điểm danh:</span>
                    <span className={`font-semibold ${
                      attendanceRate === null || attendanceRate === undefined
                        ? isDarkMode ? 'text-gray-400' : 'text-gray-500'
                        : attendanceRate >= 80
                          ? isDarkMode ? 'text-green-400' : 'text-green-600'
                          : attendanceRate >= 60
                            ? isDarkMode ? 'text-yellow-400' : 'text-yellow-600'
                            : isDarkMode ? 'text-red-400' : 'text-red-600'
                    }`}>
                      {attendanceRate !== null && attendanceRate !== undefined ? attendanceRate : 0}%
                    </span>
                  </span>
                </div>
              )}
            </div>

            {/* Participants Button - Navigate to view page */}
            <div className="mt-3 flex-shrink-0">
              <button
                onClick={() => window.location.href = `/admin/activities/view/${activity._id}`}
                className={`w-full px-2 py-1.5 text-xs font-medium rounded-md transition-all duration-200 flex items-center justify-center gap-1.5 ${
                  isDarkMode
                    ? 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30'
                    : 'bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200'
                }`}
              >
                <UserCheck size={12} strokeWidth={2} />
                <span className="truncate">
                  {activity.responsiblePerson?.name || 'Người phụ trách'} & Thành viên
                </span>
              </button>
            </div>
          </div>

          {/* Participants Modal */}
          {showParticipantsModal && participantsData && (
            <div 
              className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
              onClick={() => setShowParticipantsModal(false)}
            >
              <div 
                className={`relative w-full max-w-3xl max-h-[85vh] rounded-xl shadow-2xl overflow-hidden border ${
                  isDarkMode 
                    ? 'bg-gray-800 border-gray-700' 
                    : 'bg-white border-gray-200'
                } animate-in zoom-in-95 duration-200`}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header - Enhanced */}
                <div className={`px-6 py-4 border-b ${
                  isDarkMode 
                    ? 'border-gray-700 bg-gradient-to-r from-gray-800 to-gray-800/95' 
                    : 'border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        isDarkMode ? 'bg-blue-600/20' : 'bg-blue-100'
                      }`}>
                        <Users className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} size={22} strokeWidth={2} />
                      </div>
                      <div>
                        <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          Người phụ trách & Thành viên
                        </h3>
                        <p className={`text-xs mt-0.5 ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          {participantsData.participants.length} thành viên tham gia
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowParticipantsModal(false)}
                      className={`p-2 rounded-lg transition-all duration-200 ${
                        isDarkMode 
                          ? 'text-gray-400 hover:text-white hover:bg-gray-700' 
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <X size={20} strokeWidth={2} />
                    </button>
                  </div>
                </div>

                {/* Modal Content */}
                <div className="overflow-y-auto max-h-[calc(85vh-140px)] p-6">
                  {/* Activity Info Section */}
                  <div className={`mb-6 p-4 rounded-xl border-2 ${
                    isDarkMode 
                      ? 'bg-gray-700/30 border-gray-600' 
                      : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex items-start gap-4">
                      {/* Activity Image */}
                      <div className="flex-shrink-0">
                        {activity.imageUrl ? (
                          <img 
                            src={activity.imageUrl} 
                            alt={activity.name}
                            className="w-24 h-24 rounded-lg object-cover border-2 border-gray-300 dark:border-gray-600 shadow-md"
                          />
                        ) : (
                          <div className={`w-24 h-24 rounded-lg flex items-center justify-center border-2 ${
                            activity.type === 'single_day'
                              ? isDarkMode 
                                ? 'bg-gray-800 border-gray-600' 
                                : 'bg-gray-100 border-gray-300'
                              : isDarkMode 
                                ? 'bg-gray-800 border-gray-600' 
                                : 'bg-gray-100 border-gray-300'
                          }`}>
                            {activity.type === 'single_day' ? (
                              <Calendar size={32} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} />
                            ) : (
                              <CalendarDays size={32} className={isDarkMode ? 'text-purple-400' : 'text-purple-600'} />
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Activity Details */}
                      <div className="flex-1 min-w-0">
                        <h4 className={`text-lg font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {activity.name}
                        </h4>
                        <div className="space-y-1.5">
                          {/* Date */}
                          <div className="flex items-center gap-2">
                            <Calendar size={14} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} strokeWidth={2} />
                            <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              {activity.type === 'single_day' 
                                ? new Date(activity.date).toLocaleDateString('vi-VN', { 
                                    weekday: 'long', 
                                    year: 'numeric', 
                                    month: 'long', 
                                    day: 'numeric' 
                                  })
                                : activity.startDate && activity.endDate
                                  ? `${new Date(activity.startDate).toLocaleDateString('vi-VN')} - ${new Date(activity.endDate).toLocaleDateString('vi-VN')}`
                                  : new Date(activity.date).toLocaleDateString('vi-VN')
                              }
                            </p>
                          </div>
                          
                          {/* Location */}
                          {activity.location && (
                            <div className="flex items-center gap-2">
                              <MapPin size={14} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} strokeWidth={2} />
                              <p className={`text-sm truncate ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                {activity.location}
                              </p>
                            </div>
                          )}
                          
                          {/* Max Participants */}
                          {activity.maxParticipants && (
                            <div className="flex items-center gap-2">
                              <Users size={14} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} strokeWidth={2} />
                              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                Tối đa {activity.maxParticipants} người tham gia
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Responsible Person - Enhanced Card */}
                  {participantsData.responsiblePerson && (
                    <div className="mb-6">
                      <h4 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        <div className={`p-1 rounded ${
                          isDarkMode ? 'bg-blue-600/20' : 'bg-blue-100'
                        }`}>
                          <UserCircle size={14} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} strokeWidth={2} />
                        </div>
                        <span>Người phụ trách</span>
                      </h4>
                      <div className={`p-4 rounded-xl border-2 shadow-lg transition-all duration-200 hover:shadow-xl ${
                        isDarkMode 
                          ? 'bg-gradient-to-br from-blue-900/30 to-indigo-900/20 border-blue-500/50 hover:border-blue-400/70' 
                          : 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-300 hover:border-blue-400'
                      }`}>
                        <div className="flex items-center gap-4">
                          {participantsData.responsiblePerson.avatarUrl ? (
                            <div className="relative">
                              <img 
                                src={participantsData.responsiblePerson.avatarUrl} 
                                alt={participantsData.responsiblePerson.name}
                                className="w-16 h-16 rounded-full object-cover border-2 border-blue-400 shadow-md"
                              />
                              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 border-2 border-white"></div>
                            </div>
                          ) : (
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center border-2 shadow-md ${
                              isDarkMode 
                                ? 'bg-gradient-to-br from-blue-600/30 to-indigo-600/30 border-blue-500/50' 
                                : 'bg-gradient-to-br from-blue-100 to-indigo-100 border-blue-300'
                            }`}>
                              <UserCircle size={32} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} strokeWidth={2} />
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                {participantsData.responsiblePerson.name}
                              </p>
                              <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                                isDarkMode 
                                  ? 'bg-blue-500/30 text-blue-300 border border-blue-400/50' 
                                  : 'bg-blue-100 text-blue-700 border border-blue-300'
                              }`}>
                                Phụ trách
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Mail size={12} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} strokeWidth={2} />
                              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                {participantsData.responsiblePerson.email}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Participants List - Table with Attendance */}
                  <div>
                    <h4 className={`text-sm font-semibold mb-4 flex items-center gap-2 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      <div className={`p-1 rounded ${
                        isDarkMode ? 'bg-purple-600/20' : 'bg-purple-100'
                      }`}>
                        <Users size={14} className={isDarkMode ? 'text-purple-400' : 'text-purple-600'} strokeWidth={2} />
                      </div>
                      <span>Thành viên tham gia ({participantsData.participants.length})</span>
                    </h4>
                    {participantsData.participants.length === 0 ? (
                      <div className={`text-center py-12 rounded-xl border-2 border-dashed ${
                        isDarkMode 
                          ? 'bg-gray-700/30 border-gray-600' 
                          : 'bg-gray-50 border-gray-300'
                      }`}>
                        <Users className={`mx-auto mb-3 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} size={40} strokeWidth={1.5} />
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Chưa có thành viên tham gia
                        </p>
                      </div>
                    ) : (
                      <div className={`rounded-xl border-2 overflow-hidden ${
                        isDarkMode ? 'border-gray-600' : 'border-gray-200'
                      }`}>
                        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800">
                          <table className="w-full min-w-[800px]">
                            <thead className={`sticky top-0 z-10 ${
                              isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                            }`}>
                              <tr>
                                <th className={`px-4 py-3 text-left text-sm font-semibold sticky left-0 z-20 ${
                                  isDarkMode ? 'text-gray-300 bg-gray-700' : 'text-gray-700 bg-gray-100'
                                } min-w-[200px]`}>
                                  Thành viên
                                </th>
                                <th className={`px-4 py-3 text-left text-sm font-semibold sticky left-[200px] z-20 ${
                                  isDarkMode ? 'text-gray-300 bg-gray-700' : 'text-gray-700 bg-gray-100'
                                } min-w-[120px]`}>
                                  Vai trò
                                </th>
                                {activity.type === 'single_day' && activity.timeSlots?.filter((s: any) => s.isActive).map((slot: any) => (
                                  <th key={slot.id || slot.name} className={`px-3 py-3 text-center text-sm font-semibold border-l ${
                                    isDarkMode ? 'text-gray-300 border-gray-600' : 'text-gray-700 border-gray-300'
                                  } min-w-[140px]`} colSpan={2}>
                                    <div className="flex flex-col items-center gap-1">
                                      <span className="text-sm truncate max-w-[120px]">{slot.name}</span>
                                      <div className="flex gap-2 text-xs font-normal">
                                        <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Đầu</span>
                                        <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Cuối</span>
                                      </div>
                                    </div>
                                  </th>
                                ))}
                                {activity.type === 'multiple_days' && activity.schedule && activity.schedule.map((scheduleDay: any) => (
                                  <th key={scheduleDay.day} className={`px-3 py-3 text-center text-sm font-semibold border-l ${
                                    isDarkMode ? 'text-gray-300 border-gray-600' : 'text-gray-700 border-gray-300'
                                  } min-w-[100px]`}>
                                    <div className="flex flex-col items-center gap-1">
                                      <span className="text-sm font-medium">Ngày {scheduleDay.day}</span>
                                      <span className={`text-xs font-normal ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                        {new Date(scheduleDay.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                                      </span>
                                    </div>
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className={`divide-y ${
                              isDarkMode ? 'divide-gray-700' : 'divide-gray-200'
                            }`}>
                              {participantsData.participants.map((participant, index) => {
                                const getAttendanceStatus = (timeSlot: string, checkInType: 'start' | 'end') => {
                                  const attendance = participant.attendances?.find(
                                    (a) => a.timeSlot === timeSlot && a.checkInType === checkInType
                                  );
                                  return attendance;
                                };

                                return (
                                  <tr 
                                    key={participant.userId || index}
                                    className={`transition-colors ${
                                      isDarkMode 
                                        ? 'hover:bg-gray-700/50' 
                                        : 'hover:bg-gray-50'
                                    }`}
                                  >
                                    {/* Member Info - Sticky */}
                                    <td className={`px-4 py-3 sticky left-0 z-10 ${
                                      isDarkMode ? 'bg-gray-800' : 'bg-white'
                                    } min-w-[200px]`}>
                                      <div className="flex items-center gap-3">
                                        {participant.avatarUrl ? (
                                          <img 
                                            src={participant.avatarUrl} 
                                            alt={participant.name}
                                            className="w-10 h-10 rounded-full object-cover border-2 border-gray-300 dark:border-gray-600 flex-shrink-0"
                                          />
                                        ) : (
                                          <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 flex-shrink-0 ${
                                            isDarkMode 
                                              ? 'bg-gray-600 border-gray-500' 
                                              : 'bg-gray-100 border-gray-300'
                                          }`}>
                                            <UserCircle size={20} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} strokeWidth={2} />
                                          </div>
                                        )}
                                        <div className="min-w-0 flex-1">
                                          <p className={`font-semibold text-sm truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                            {participant.name}
                                          </p>
                                          <p className={`text-xs truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                            {participant.email}
                                          </p>
                                        </div>
                                      </div>
                                    </td>
                                    
                                    {/* Role - Sticky */}
                                    <td className={`px-4 py-3 sticky left-[200px] z-10 ${
                                      isDarkMode ? 'bg-gray-800' : 'bg-white'
                                    } min-w-[120px]`}>
                                      <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                                        participant.role === 'Trưởng Nhóm'
                                          ? isDarkMode 
                                            ? 'bg-blue-500/30 text-blue-300 border border-blue-400/50' 
                                            : 'bg-blue-100 text-blue-700 border border-blue-300'
                                          : isDarkMode 
                                            ? 'bg-purple-500/20 text-purple-400 border border-purple-400/30' 
                                            : 'bg-purple-100 text-purple-600 border border-purple-300'
                                      }`}>
                                        {participant.role}
                                      </span>
                                    </td>

                                    {/* Attendance for Single Day */}
                                    {activity.type === 'single_day' && activity.timeSlots?.filter((s: any) => s.isActive).map((slot: any) => (
                                      <React.Fragment key={slot.id || slot.name}>
                                        {/* Start Check-in */}
                                        <td className={`px-2 py-3 text-center border-l min-w-[70px] ${
                                          isDarkMode ? 'border-gray-600' : 'border-gray-300'
                                        }`}>
                                          {(() => {
                                            const attendance = getAttendanceStatus(slot.name, 'start');
                                            return attendance ? (
                                              <div className="flex flex-col items-center gap-1">
                                                <CheckCircle2 
                                                  size={18} 
                                                  className={attendance.status === 'approved' 
                                                    ? 'text-green-500' 
                                                    : attendance.status === 'rejected' 
                                                      ? 'text-red-500' 
                                                      : 'text-yellow-500'
                                                  } 
                                                  strokeWidth={2.5}
                                                />
                                                <span className={`text-xs font-medium ${
                                                  attendance.status === 'approved' 
                                                    ? isDarkMode ? 'text-green-400' : 'text-green-600'
                                                    : attendance.status === 'rejected' 
                                                      ? isDarkMode ? 'text-red-400' : 'text-red-600'
                                                      : isDarkMode ? 'text-yellow-400' : 'text-yellow-600'
                                                }`}>
                                                  {attendance.status === 'approved' ? '✓' : attendance.status === 'rejected' ? '✗' : '⏳'}
                                                </span>
                                              </div>
                                            ) : (
                                              <XCircle size={18} className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} strokeWidth={2.5} />
                                            );
                                          })()}
                                        </td>
                                        
                                        {/* End Check-in */}
                                        <td className={`px-2 py-3 text-center border-l min-w-[70px] ${
                                          isDarkMode ? 'border-gray-600' : 'border-gray-300'
                                        }`}>
                                          {(() => {
                                            const attendance = getAttendanceStatus(slot.name, 'end');
                                            return attendance ? (
                                              <div className="flex flex-col items-center gap-1">
                                                <CheckCircle2 
                                                  size={18} 
                                                  className={attendance.status === 'approved' 
                                                    ? 'text-green-500' 
                                                    : attendance.status === 'rejected' 
                                                      ? 'text-red-500' 
                                                      : 'text-yellow-500'
                                                  } 
                                                  strokeWidth={2.5}
                                                />
                                                <span className={`text-xs font-medium ${
                                                  attendance.status === 'approved' 
                                                    ? isDarkMode ? 'text-green-400' : 'text-green-600'
                                                    : attendance.status === 'rejected' 
                                                      ? isDarkMode ? 'text-red-400' : 'text-red-600'
                                                      : isDarkMode ? 'text-yellow-400' : 'text-yellow-600'
                                                }`}>
                                                  {attendance.status === 'approved' ? '✓' : attendance.status === 'rejected' ? '✗' : '⏳'}
                                                </span>
                                              </div>
                                            ) : (
                                              <XCircle size={18} className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} strokeWidth={2.5} />
                                            );
                                          })()}
                                        </td>
                                      </React.Fragment>
                                    ))}

                                    {/* Attendance for Multiple Days - Compact with Tooltip */}
                                    {activity.type === 'multiple_days' && activity.schedule && activity.schedule.map((scheduleDay: any) => {
                                      const dayNumber = scheduleDay.day;
                                      
                                      // Get time slots for this day
                                      const dayTimeSlots = activity.timeSlots?.filter((s: any) => s.isActive) || [];
                                      const slotsToShow = dayTimeSlots.length > 0 ? dayTimeSlots : [
                                        { name: 'Buổi Sáng', id: 'morning' },
                                        { name: 'Buổi Chiều', id: 'afternoon' },
                                        { name: 'Buổi Tối', id: 'evening' }
                                      ];
                                      
                                      // Count attendance for this day
                                      const getDayAttendances = () => {
                                        const dayAttendances = participant.attendances?.filter(a => {
                                          const timeSlot = a.timeSlot || '';
                                          const dayMatch = timeSlot.match(/Ngày\s*(\d+)/);
                                          return dayMatch && parseInt(dayMatch[1]) === dayNumber;
                                        }) || [];
                                        
                                        // Group by slot and check-in type
                                        const slotAttendances: { [key: string]: { start?: any; end?: any } } = {};
                                        
                                        slotsToShow.forEach((slot: any) => {
                                          const slotName = slot.name.toLowerCase();
                                          const slotKeywords: { [key: string]: string[] } = {
                                            'buổi sáng': ['sáng', 'morning'],
                                            'buổi chiều': ['chiều', 'afternoon'],
                                            'buổi tối': ['tối', 'evening']
                                          };
                                          
                                          let matchedKeywords: string[] = [];
                                          for (const [key, keywords] of Object.entries(slotKeywords)) {
                                            if (slotName.includes(key) || (keywords.length > 0 && slotName.includes(keywords[0]))) {
                                              matchedKeywords = keywords;
                                              break;
                                            }
                                          }
                                          
                                          dayAttendances.forEach(att => {
                                            const timeSlotLower = (att.timeSlot || '').toLowerCase();
                                            const matchesSlot = matchedKeywords.some((kw: string) => timeSlotLower.includes(kw)) || 
                                                              (matchedKeywords.length === 0 && timeSlotLower.includes(`ngày ${dayNumber}`));
                                            
                                            if (matchesSlot) {
                                              if (!slotAttendances[slot.name]) {
                                                slotAttendances[slot.name] = {};
                                              }
                                              if (att.checkInType === 'start') {
                                                slotAttendances[slot.name].start = att;
                                              } else if (att.checkInType === 'end') {
                                                slotAttendances[slot.name].end = att;
                                              }
                                            }
                                          });
                                        });
                                        
                                        return slotAttendances;
                                      };
                                      
                                      const slotAttendances = getDayAttendances();
                                      const totalSlots = slotsToShow.length * 2; // start + end for each slot
                                      const checkedInCount = Object.values(slotAttendances).reduce((sum, slot) => {
                                        return sum + (slot.start ? 1 : 0) + (slot.end ? 1 : 0);
                                      }, 0);
                                      
                                      return (
                                        <td 
                                          key={scheduleDay.day}
                                          className={`px-3 py-3 text-center border-l min-w-[120px] relative group ${
                                            isDarkMode ? 'border-gray-600' : 'border-gray-300'
                                          }`}
                                        >
                                          {/* Summary View - Compact with Better Layout */}
                                          <div className="flex flex-col items-center gap-2">
                                            {/* Count Badge */}
                                            <div className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                              checkedInCount === totalSlots 
                                                ? isDarkMode ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-green-100 text-green-700 border border-green-300'
                                                : checkedInCount > 0
                                                  ? isDarkMode ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' : 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                                                  : isDarkMode ? 'bg-gray-500/20 text-gray-400 border border-gray-500/50' : 'bg-gray-100 text-gray-600 border border-gray-300'
                                            }`}>
                                              {checkedInCount}/{totalSlots}
                                            </div>
                                            
                                            {/* Dots Indicator - Horizontal Layout */}
                                            <div className="flex gap-1.5 justify-center flex-wrap max-w-[100px]">
                                              {slotsToShow.map((slot: any, idx: number) => {
                                                const slotAtt = slotAttendances[slot.name] || {};
                                                const hasStart = !!slotAtt.start;
                                                const hasEnd = !!slotAtt.end;
                                                const startStatus = slotAtt.start?.status;
                                                const endStatus = slotAtt.end?.status;
                                                
                                                return (
                                                  <div key={idx} className="flex items-center gap-1" title={`${slot.name}: Đầu ${hasStart ? (startStatus === 'approved' ? '✓' : startStatus === 'rejected' ? '✗' : '⏳') : '○'}, Cuối ${hasEnd ? (endStatus === 'approved' ? '✓' : endStatus === 'rejected' ? '✗' : '⏳') : '○'}`}>
                                                    {/* Start dot */}
                                                    <div className={`w-3 h-3 rounded-full border-2 ${
                                                      hasStart 
                                                        ? startStatus === 'approved' ? 'bg-green-500 border-green-600' : 
                                                          startStatus === 'rejected' ? 'bg-red-500 border-red-600' : 'bg-yellow-500 border-yellow-600'
                                                        : 'bg-gray-300 border-gray-400'
                                                    }`} />
                                                    {/* End dot */}
                                                    <div className={`w-3 h-3 rounded-full border-2 ${
                                                      hasEnd 
                                                        ? endStatus === 'approved' ? 'bg-green-500 border-green-600' : 
                                                          endStatus === 'rejected' ? 'bg-red-500 border-red-600' : 'bg-yellow-500 border-yellow-600'
                                                        : 'bg-gray-300 border-gray-400'
                                                    }`} />
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                          
                                          {/* Detailed Tooltip on Hover */}
                                          <div className={`absolute left-full top-0 ml-2 z-50 hidden group-hover:block ${
                                            isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'
                                          } border rounded-lg shadow-xl p-3 min-w-[200px]`}>
                                            <div className="text-xs font-semibold mb-2">
                                              Ngày {scheduleDay.day} - {new Date(scheduleDay.date).toLocaleDateString('vi-VN')}
                                            </div>
                                            <div className="space-y-1.5">
                                              {slotsToShow.map((slot: any) => {
                                                const slotAtt = slotAttendances[slot.name] || {};
                                                return (
                                                  <div key={slot.name} className="text-[10px]">
                                                    <div className="font-medium mb-0.5">{slot.name}:</div>
                                                    <div className="flex gap-2 pl-2">
                                                      <span className={slotAtt.start ? 
                                                        slotAtt.start.status === 'approved' ? 'text-green-500' : 
                                                        slotAtt.start.status === 'rejected' ? 'text-red-500' : 'text-yellow-500'
                                                        : 'text-gray-400'
                                                      }>
                                                        Đầu: {slotAtt.start ? 
                                                          slotAtt.start.status === 'approved' ? '✓ Đã duyệt' : 
                                                          slotAtt.start.status === 'rejected' ? '✗ Từ chối' : '⏳ Chờ duyệt'
                                                          : '○ Chưa điểm danh'
                                                        }
                                                      </span>
                                                      <span className={slotAtt.end ? 
                                                        slotAtt.end.status === 'approved' ? 'text-green-500' : 
                                                        slotAtt.end.status === 'rejected' ? 'text-red-500' : 'text-yellow-500'
                                                        : 'text-gray-400'
                                                      }>
                                                        Cuối: {slotAtt.end ? 
                                                          slotAtt.end.status === 'approved' ? '✓ Đã duyệt' : 
                                                          slotAtt.end.status === 'rejected' ? '✗ Từ chối' : '⏳ Chờ duyệt'
                                                          : '○ Chưa điểm danh'
                                                        }
                                                      </span>
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        </td>
                                      );
                                    })}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    // Original horizontal layout for right column (past activities)
    return (
      <div 
        className={`group transition-all duration-200 relative border border-l-4 rounded flex flex-col ${
          isDarkMode 
            ? 'bg-gray-800/60 hover:bg-gray-800/80 border-gray-600' 
            : 'bg-white hover:bg-gray-50 border-gray-300'
        }`}
      >
        <div className="p-3 flex flex-col h-full">
          <div className="flex items-start gap-3 flex-1">
            {/* Image - Clickable to edit */}
            <div 
              className={`relative w-16 h-16 flex-shrink-0 overflow-hidden rounded border cursor-pointer group transition-all duration-200 ${
                isDarkMode ? 'border-gray-600' : 'border-gray-300'
              }`}
              onClick={() => onEdit && onEdit(activity._id, activity.type)}
            >
              {activity.imageUrl ? (
                <img 
                  src={activity.imageUrl} 
                  alt={activity.name}
                  className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-110"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              ) : (
                <div className={`w-full h-full flex items-center justify-center transition-colors duration-200 ${
                  activity.type === 'single_day'
                    ? isDarkMode ? 'bg-gray-800 group-hover:bg-gray-700' : 'bg-gray-50 group-hover:bg-gray-100'
                    : isDarkMode ? 'bg-gray-800 group-hover:bg-gray-700' : 'bg-gray-50 group-hover:bg-gray-100'
                }`}>
                  {activity.type === 'single_day' ? (
                    <Calendar size={20} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} />
                  ) : (
                    <CalendarDays size={20} className={isDarkMode ? 'text-purple-400' : 'text-purple-600'} />
                  )}
                </div>
              )}
              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 flex items-center justify-center">
                <Eye size={16} className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-white" />
              </div>

              {/* Actions Button - Top Right Corner */}
              {showActions && (
                <div 
                  className="absolute top-0.5 right-0.5 flex-shrink-0 z-10" 
                  ref={menuRef}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => setShowActionsMenu(!showActionsMenu)}
                    className={`p-1 rounded transition-all duration-200 ${
                      isDarkMode 
                        ? 'text-gray-200 hover:text-white hover:bg-gray-800/80 bg-gray-900/70 backdrop-blur-sm' 
                        : 'text-gray-700 hover:text-gray-900 hover:bg-white/90 bg-white/80 backdrop-blur-sm'
                    } shadow-lg`}
                  >
                    <MoreVertical size={12} strokeWidth={2} />
                  </button>

                  {showActionsMenu && (
                    <div className={`absolute right-0 top-full mt-1 w-36 rounded-md border border-gray-300 dark:border-gray-600 shadow-lg z-20 ${
                      isDarkMode 
                        ? 'bg-gray-800' 
                        : 'bg-white'
                    }`}>
                      <div className="py-1">
                        {onEdit && (
                          <button
                            onClick={() => {
                              onEdit(activity._id, activity.type);
                              setShowActionsMenu(false);
                            }}
                            className={`w-full px-3 py-1.5 text-xs font-medium transition-all duration-200 flex items-center gap-2 ${
                              isDarkMode 
                                ? 'text-green-400 hover:bg-green-500/20' 
                                : 'text-green-600 hover:bg-green-50'
                            }`}
                          >
                            <Edit size={12} strokeWidth={2} />
                            <span>Chỉnh sửa</span>
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => {
                              onDelete(activity._id);
                              setShowActionsMenu(false);
                            }}
                            className={`w-full px-3 py-1.5 text-xs font-medium transition-all duration-200 flex items-center gap-2 ${
                              isDarkMode 
                                ? 'text-red-400 hover:bg-red-500/20' 
                                : 'text-red-600 hover:bg-red-50'
                            }`}
                          >
                            <Trash2 size={12} strokeWidth={2} />
                            <span>Xóa</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <h3 className={`font-semibold text-xs sm:text-sm line-clamp-1 flex-1 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {activity.name}
                </h3>
              </div>
              
              <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                {(() => {
                  const statusConfig = getStatusConfig(activity.status);
                  return (
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium rounded border ${statusConfig.bg} ${statusConfig.text}`}>
                      {statusConfig.icon}
                      <span>{statusConfig.label}</span>
                    </span>
                  );
                })()}
              </div>

              <div className="space-y-0.5 text-xs text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  {activity.type === 'multiple_days' ? (
                    <CalendarDays size={11} strokeWidth={2} className="flex-shrink-0" />
                  ) : (
                    <Calendar size={11} strokeWidth={2} className="flex-shrink-0" />
                  )}
                  <span className="truncate">
                    {activity.type === 'multiple_days' && activity.startDate && activity.endDate
                      ? `${formatDate(activity.startDate)} - ${formatDate(activity.endDate)}`
                      : formatDate(activity.date)}
                  </span>
                </div>
                {activity.location && (
                  <div className="flex items-center gap-1">
                    <MapPin size={11} strokeWidth={2} className="flex-shrink-0" />
                    <span className="truncate">{activity.location}</span>
                  </div>
                )}
                
                {/* Attendance Rate for Past Activities */}
                {isPast && attendanceRate !== undefined && (
                  <div className="flex items-center gap-1">
                    <TrendingUp size={11} strokeWidth={2} className="flex-shrink-0" />
                    <span className="flex items-center gap-1">
                      <span className="text-[10px]">Tỉ lệ:</span>
                      <span className={`text-[10px] font-semibold ${
                        attendanceRate === null || attendanceRate === undefined
                          ? isDarkMode ? 'text-gray-400' : 'text-gray-500'
                          : attendanceRate >= 80
                            ? isDarkMode ? 'text-green-400' : 'text-green-600'
                            : attendanceRate >= 60
                              ? isDarkMode ? 'text-yellow-400' : 'text-yellow-600'
                              : isDarkMode ? 'text-red-400' : 'text-red-600'
                      }`}>
                        {attendanceRate !== null && attendanceRate !== undefined ? attendanceRate : 0}%
                      </span>
                    </span>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Participants Button - Bottom - Navigate to view page */}
          <div className="mt-auto pt-2">
            <button
              onClick={() => window.location.href = `/admin/activities/view/${activity._id}`}
              className={`w-full px-2 py-1 text-[10px] font-medium rounded transition-all duration-200 flex items-center justify-center gap-1 ${
                isDarkMode
                  ? 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30'
                  : 'bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200'
              }`}
            >
              <UserCheck size={10} strokeWidth={2} />
              <span className="truncate">
                {activity.responsiblePerson?.name || 'Người phụ trách'} & Thành viên
              </span>
            </button>
          </div>
        </div>

        {/* Participants Modal */}
        {showParticipantsModal && participantsData && (
          <div 
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setShowParticipantsModal(false)}
          >
            <div 
              className={`relative w-full max-w-3xl max-h-[85vh] rounded-xl shadow-2xl overflow-hidden border ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-700' 
                  : 'bg-white border-gray-200'
              } animate-in zoom-in-95 duration-200`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header - Enhanced */}
              <div className={`px-6 py-4 border-b ${
                isDarkMode 
                  ? 'border-gray-700 bg-gradient-to-r from-gray-800 to-gray-800/95' 
                  : 'border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      isDarkMode ? 'bg-blue-600/20' : 'bg-blue-100'
                    }`}>
                      <Users className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} size={22} strokeWidth={2} />
                    </div>
                    <div>
                      <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        Người phụ trách & Thành viên
                      </h3>
                      <p className={`text-xs mt-0.5 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {participantsData.participants.length} thành viên tham gia
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowParticipantsModal(false)}
                    className={`p-2 rounded-lg transition-all duration-200 ${
                      isDarkMode 
                        ? 'text-gray-400 hover:text-white hover:bg-gray-700' 
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <X size={20} strokeWidth={2} />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="overflow-y-auto max-h-[calc(85vh-140px)] p-6">
                {/* Activity Info Section */}
                <div className={`mb-6 p-4 rounded-xl border-2 ${
                  isDarkMode 
                    ? 'bg-gray-700/30 border-gray-600' 
                    : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-start gap-4">
                    {/* Activity Image */}
                    <div className="flex-shrink-0">
                      {activity.imageUrl ? (
                        <img 
                          src={activity.imageUrl} 
                          alt={activity.name}
                          className="w-24 h-24 rounded-lg object-cover border-2 border-gray-300 dark:border-gray-600 shadow-md"
                        />
                      ) : (
                        <div className={`w-24 h-24 rounded-lg flex items-center justify-center border-2 ${
                          activity.type === 'single_day'
                            ? isDarkMode 
                              ? 'bg-gray-800 border-gray-600' 
                              : 'bg-gray-100 border-gray-300'
                            : isDarkMode 
                              ? 'bg-gray-800 border-gray-600' 
                              : 'bg-gray-100 border-gray-300'
                        }`}>
                          {activity.type === 'single_day' ? (
                            <Calendar size={32} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} />
                          ) : (
                            <CalendarDays size={32} className={isDarkMode ? 'text-purple-400' : 'text-purple-600'} />
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Activity Details */}
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-lg font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {activity.name}
                      </h4>
                      <div className="space-y-1.5">
                        {/* Date */}
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} strokeWidth={2} />
                          <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            {activity.type === 'single_day' 
                              ? new Date(activity.date).toLocaleDateString('vi-VN', { 
                                  weekday: 'long', 
                                  year: 'numeric', 
                                  month: 'long', 
                                  day: 'numeric' 
                                })
                              : activity.startDate && activity.endDate
                                ? `${new Date(activity.startDate).toLocaleDateString('vi-VN')} - ${new Date(activity.endDate).toLocaleDateString('vi-VN')}`
                                : new Date(activity.date).toLocaleDateString('vi-VN')
                            }
                          </p>
                        </div>
                        
                        {/* Location */}
                        {activity.location && (
                          <div className="flex items-center gap-2">
                            <MapPin size={14} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} strokeWidth={2} />
                            <p className={`text-sm truncate ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              {activity.location}
                            </p>
                          </div>
                        )}
                        
                        {/* Max Participants */}
                        {activity.maxParticipants && (
                          <div className="flex items-center gap-2">
                            <Users size={14} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} strokeWidth={2} />
                            <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              Tối đa {activity.maxParticipants} người tham gia
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Responsible Person - Enhanced Card */}
                {participantsData.responsiblePerson && (
                  <div className="mb-6">
                    <h4 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      <div className={`p-1 rounded ${
                        isDarkMode ? 'bg-blue-600/20' : 'bg-blue-100'
                      }`}>
                        <UserCircle size={14} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} strokeWidth={2} />
                      </div>
                      <span>Người phụ trách</span>
                    </h4>
                    <div className={`p-4 rounded-xl border-2 shadow-lg transition-all duration-200 hover:shadow-xl ${
                      isDarkMode 
                        ? 'bg-gradient-to-br from-blue-900/30 to-indigo-900/20 border-blue-500/50 hover:border-blue-400/70' 
                        : 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-300 hover:border-blue-400'
                    }`}>
                      <div className="flex items-center gap-4">
                        {participantsData.responsiblePerson.avatarUrl ? (
                          <div className="relative">
                            <img 
                              src={participantsData.responsiblePerson.avatarUrl} 
                              alt={participantsData.responsiblePerson.name}
                              className="w-16 h-16 rounded-full object-cover border-2 border-blue-400 shadow-md"
                            />
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 border-2 border-white"></div>
                          </div>
                        ) : (
                          <div className={`w-16 h-16 rounded-full flex items-center justify-center border-2 shadow-md ${
                            isDarkMode 
                              ? 'bg-gradient-to-br from-blue-600/30 to-indigo-600/30 border-blue-500/50' 
                              : 'bg-gradient-to-br from-blue-100 to-indigo-100 border-blue-300'
                          }`}>
                              <UserCircle size={32} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} strokeWidth={2} />
                            </div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              {participantsData.responsiblePerson.name}
                            </p>
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                              isDarkMode 
                                ? 'bg-blue-500/30 text-blue-300 border border-blue-400/50' 
                                : 'bg-blue-100 text-blue-700 border border-blue-300'
                            }`}>
                              Phụ trách
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail size={12} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} strokeWidth={2} />
                            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              {participantsData.responsiblePerson.email}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Participants List - Enhanced */}
                <div>
                  <h4 className={`text-sm font-semibold mb-4 flex items-center gap-2 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    <div className={`p-1 rounded ${
                      isDarkMode ? 'bg-purple-600/20' : 'bg-purple-100'
                    }`}>
                      <Users size={14} className={isDarkMode ? 'text-purple-400' : 'text-purple-600'} strokeWidth={2} />
                    </div>
                    <span>Thành viên tham gia ({participantsData.participants.length})</span>
                  </h4>
                  {participantsData.participants.length === 0 ? (
                    <div className={`text-center py-12 rounded-xl border-2 border-dashed ${
                      isDarkMode 
                        ? 'bg-gray-700/30 border-gray-600' 
                        : 'bg-gray-50 border-gray-300'
                    }`}>
                      <Users className={`mx-auto mb-3 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} size={40} strokeWidth={1.5} />
                      <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Chưa có thành viên tham gia
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {participantsData.participants.map((participant, index) => (
                        <div 
                          key={participant.userId || index}
                          className={`p-4 rounded-xl border transition-all duration-200 hover:scale-[1.02] ${
                            isDarkMode 
                              ? 'bg-gray-700/40 border-gray-600 hover:bg-gray-700/60 hover:border-gray-500 hover:shadow-lg' 
                              : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:shadow-md'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {participant.avatarUrl ? (
                              <div className="relative flex-shrink-0">
                                <img 
                                  src={participant.avatarUrl} 
                                  alt={participant.name}
                                  className="w-12 h-12 rounded-full object-cover border-2 border-gray-300 dark:border-gray-600"
                                />
                              </div>
                            ) : (
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 flex-shrink-0 ${
                                isDarkMode 
                                  ? 'bg-gray-600 border-gray-500' 
                                  : 'bg-gray-100 border-gray-300'
                              }`}>
                                <UserCircle size={24} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} strokeWidth={2} />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className={`font-semibold truncate mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                {participant.name}
                              </p>
                              <div className="flex flex-col gap-1">
                                {participant.email && (
                                  <div className="flex items-center gap-1.5">
                                    <Mail size={10} className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} strokeWidth={2} />
                                    <p className={`text-xs truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                      {participant.email}
                                    </p>
                                  </div>
                                )}
                                {participant.role && (
                                  <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full w-fit ${
                                    participant.role === 'Trưởng Nhóm'
                                      ? isDarkMode 
                                        ? 'bg-blue-500/30 text-blue-300 border border-blue-400/50' 
                                        : 'bg-blue-100 text-blue-700 border border-blue-300'
                                      : isDarkMode 
                                        ? 'bg-purple-500/20 text-purple-400 border border-purple-400/30' 
                                        : 'bg-purple-100 text-purple-600 border border-purple-300'
                                  }`}>
                                    {participant.role}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-20 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
        <Loader 
          size={48} 
          className={`animate-spin mr-3 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}
          strokeWidth={2}
        />
        <span className="text-sm font-semibold">Đang tải dữ liệu...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center py-16 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
        <p className="text-sm font-medium">{error}</p>
      </div>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: animatedBorderStyle }} />
      <div className="w-full">
        <div className="max-w-[1600px] mx-auto px-4 lg:px-6">
        {/* Search and Filter Bar - Compact Design */}
        <div ref={searchBarRef} className={`mb-3 p-3 border rounded-lg ${
          isDarkMode ? 'border-gray-600 bg-gray-800/50' : 'border-gray-300 bg-gray-50'
        }`}>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search 
                size={16} 
                className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}
              />
              <input
                type="text"
                placeholder="Tìm kiếm hoạt động..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-9 pr-8 py-1.5 text-sm rounded-md border ${
                  isDarkMode 
                    ? 'border-gray-600 bg-gray-800 text-white placeholder-gray-400' 
                    : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 ${
                    isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Inline Filters - Always Visible */}
            <div className="flex gap-2">
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={`px-3 py-1.5 text-sm rounded-md border ${
                  isDarkMode 
                    ? 'border-gray-600 bg-gray-800 text-white' 
                    : 'border-gray-300 bg-white text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="draft">Nháp</option>
                <option value="published">Đã xuất bản</option>
                <option value="cancelled">Đã hủy</option>
                <option value="completed">Hoàn thành</option>
                <option value="postponed">Tạm hoãn</option>
              </select>

              {/* Temporal Filter - Only for Active Activities */}
              <select
                value={temporalFilter}
                onChange={(e) => setTemporalFilter(e.target.value)}
                className={`px-3 py-1.5 text-sm rounded-md border ${
                  isDarkMode 
                    ? 'border-gray-600 bg-gray-800 text-white' 
                    : 'border-gray-300 bg-white text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              >
                <option value="all">Tất cả thời gian</option>
                <option value="ongoing">Đang diễn ra</option>
                <option value="upcoming">Sắp diễn ra</option>
              </select>

              {/* Clear Filters Button - Only show when filters are active */}
              {(statusFilter !== 'all' || temporalFilter !== 'all' || searchQuery) && (
                <button
                  onClick={() => {
                    setStatusFilter('all');
                    setTemporalFilter('all');
                    setSearchQuery('');
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-all duration-200 ${
                    isDarkMode
                      ? 'border-gray-600 bg-gray-800 text-gray-300 hover:bg-gray-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                  title="Xóa tất cả bộ lọc"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Main Column - Active Activities */}
          <div ref={leftColumnRef} className="lg:col-span-8 flex flex-col">
            {/* Header */}
            <div ref={leftHeaderRef} className={`mb-3 pb-2 border-b flex-shrink-0 ${
              isDarkMode ? 'border-gray-600' : 'border-gray-300'
            }`}>
              <h2 className={`text-lg font-bold leading-tight ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Hoạt động đang diễn ra & Sắp diễn ra
              </h2>
              <p className={`text-sm mt-1 leading-tight ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {activeActivities.length} hoạt động {activeActivities.length > 6 && `(hiển thị 6)`}
              </p>
              {activeActivities.length > 0 && (
                <div className={`mt-2 pt-2 border-t ${
                  isDarkMode ? 'border-gray-600' : 'border-gray-300'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Tỉ lệ điểm danh:
                    </span>
                    {loadingActiveAttendanceRates ? (
                      <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        Đang tải...
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
                </div>
              )}
            </div>

            {/* Activities Grid with Pagination */}
            <div ref={leftContentRef} className="flex-1 min-h-0 flex flex-col">
              {displayedActiveActivities.length > 0 ? (
                <>
                  <div 
                    className={`flex-1 border rounded-lg ${
                      isDarkMode 
                        ? 'border-blue-500/50 bg-gray-800/50' 
                        : 'border-blue-300 bg-white'
                    }`}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-2 items-stretch" id="active-activities-grid" style={{ gridAutoRows: '1fr' }}>
                      {displayedActiveActivities.map((activity) => (
                        <ActivityCard 
                          key={activity._id} 
                          activity={activity} 
                          isPast={false}
                          attendanceRate={activeAttendanceRates[activity._id] ?? null}
                        />
                      ))}
                    </div>
                  </div>
                  
                  {/* Pagination */}
                  {!loading && activeActivities.length > 0 && (
                    <div className="mt-3 px-2 py-2 border-t border-gray-300 dark:border-gray-700">
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
                <div className={`p-8 text-center border rounded-lg ${
                  isDarkMode 
                    ? 'border-gray-600 bg-gray-800/40 text-gray-400' 
                    : 'border-gray-300 bg-gray-50 text-gray-500'
                }`}>
                  <Inbox size={32} className={`mx-auto mb-3 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                  <p className="text-sm font-semibold">Chưa có hoạt động</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Past Activities */}
          <div className="lg:col-span-4 flex flex-col">
            {/* Header */}
            <div className={`mb-3 pb-2 border-b flex-shrink-0 ${
              isDarkMode ? 'border-gray-600' : 'border-gray-300'
            }`} style={{ 
              height: leftHeaderHeight ? `${leftHeaderHeight}px` : 'auto',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-start'
            }}>
              <h2 className={`text-lg font-bold leading-tight ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Đã kết thúc
              </h2>
              <p className={`text-sm mt-1 leading-tight ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {pastActivities.length} hoạt động
              </p>
              {pastActivities.length > 0 && (
                <div className={`mt-2 pt-2 border-t ${
                  isDarkMode ? 'border-gray-600' : 'border-gray-300'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Tỉ lệ điểm danh:
                    </span>
                    {loadingAttendanceRates ? (
                      <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        Đang tải...
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
                </div>
              )}
            </div>

            {/* Past Activities List - Scrollable, Height matches left side */}
            {pastActivities.length > 0 ? (
              <div 
                className={`border rounded-lg overflow-y-auto flex-1 min-h-0 ${
                  isDarkMode ? 'border-gray-600 bg-gray-800/50' : 'border-gray-300 bg-white'
                }`}
                style={{ 
                  height: leftColumnHeight ? `${leftColumnHeight}px` : 'auto',
                  maxHeight: leftColumnHeight ? `${leftColumnHeight}px` : 'none'
                }}
              >
                <div className="divide-y divide-gray-300 dark:divide-gray-600">
                  {pastActivities.map((activity) => (
                    <ActivityCard 
                      key={activity._id} 
                      activity={activity} 
                      isPast={true}
                      attendanceRate={attendanceRates[activity._id] ?? null}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className={`p-6 text-center border rounded-lg ${
                isDarkMode 
                  ? 'border-gray-600 bg-gray-800/40 text-gray-400' 
                  : 'border-gray-300 bg-gray-50 text-gray-500'
              }`}>
                <CheckCircle2 size={24} className={`mx-auto mb-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                <p className="text-xs font-semibold">Chưa có hoạt động</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

