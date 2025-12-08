'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useDarkMode } from '@/hooks/useDarkMode';
import AdminNav from '@/components/admin/AdminNav';
import Footer from '@/components/common/Footer';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { BarChart3, Users, Activity, Star, FileText, TrendingUp, GraduationCap, BookOpen, Calendar, Target, Download, Clock, CheckCircle2 } from 'lucide-react';

interface DashboardStats {
  totalStudents: {
    value: string;
    change: string;
    changeType: 'increase' | 'decrease';
  };
  ongoingActivities: {
    value: string;
    change: string;
    changeType: 'increase' | 'decrease';
  };
  averageScore: {
    value: string;
    change: string;
    changeType: 'increase' | 'decrease';
  };
  pendingReports: {
    value: string;
    change: string;
    changeType: 'increase' | 'decrease';
  };
}

interface UserStats {
  totalUsers: number;
  totalClubMembers: number;
  totalNonClubMembers: number;
  totalManagementStaff: number;
  byClass: Array<{
    className: string;
    count: number;
  }>;
  byFaculty: Array<{
    facultyName: string;
    count: number;
  }>;
}

interface ActivityStats {
  total: number;
  byStatus: {
    draft: number;
    published: number;
    ongoing: number;
    completed: number;
    cancelled: number;
    postponed: number;
  };
  byType: {
    single_day: number;
    multi_day: number;
  };
  byMonth: Array<{
    month: string;
    count: number;
  }>;
  participantsByType: {
    single_day: number;
    multi_day: number;
  };
  byCreatedMonth: Array<{
    month: string;
    count: number;
  }>;
}

export default function ReportsPage() {
  const { user } = useAuth();
  const { isDarkMode } = useDarkMode();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stats data
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [activityStats, setActivityStats] = useState<ActivityStats | null>(null);
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter' | 'year' | 'all'>('month');

  // Check if desktop
  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  // Load sidebar state from localStorage on component mount
  useEffect(() => {
    const savedSidebarState = localStorage.getItem('sidebarOpen');
    if (savedSidebarState !== null) {
      setIsSidebarOpen(savedSidebarState === 'true');
    }

    // Listen for sidebar state changes via custom event
    const handleSidebarChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ isOpen: boolean }>;
      if (customEvent.detail) {
        setIsSidebarOpen(customEvent.detail.isOpen);
      }
    };

    window.addEventListener('sidebarStateChange', handleSidebarChange);
    
    // Also check localStorage periodically as fallback
    const checkSidebarState = () => {
      const currentSidebarState = localStorage.getItem('sidebarOpen');
      if (currentSidebarState !== null) {
        const newState = currentSidebarState === 'true';
        setIsSidebarOpen(prev => {
          if (prev !== newState) {
            return newState;
          }
          return prev;
        });
      }
    };
    
    checkSidebarState();
    const intervalId = setInterval(checkSidebarState, 100);

    return () => {
      window.removeEventListener('sidebarStateChange', handleSidebarChange);
      clearInterval(intervalId);
    };
  }, []);

  // Fetch dashboard stats
  const fetchDashboardStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setDashboardStats(data.data);
        }
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    }
  };

  // Fetch user stats
  const fetchUserStats = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch basic stats
      const statsResponse = await fetch('/api/users/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        if (statsData.success) {
          // Fetch all users to calculate by class and faculty
          const usersResponse = await fetch('/api/users?limit=1000', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (usersResponse.ok) {
            const usersData = await usersResponse.json();
            if (usersData.success && usersData.data.users) {
              const users = usersData.data.users;
              
              // Group by class
              const classMap = new Map<string, number>();
              users.forEach((user: any) => {
                if (user.class) {
                  classMap.set(user.class, (classMap.get(user.class) || 0) + 1);
                }
              });
              
              const byClass = Array.from(classMap.entries())
                .map(([className, count]) => ({ className, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 10); // Top 10 classes
              
              // Group by faculty
              const facultyMap = new Map<string, number>();
              users.forEach((user: any) => {
                if (user.faculty) {
                  facultyMap.set(user.faculty, (facultyMap.get(user.faculty) || 0) + 1);
                }
              });
              
              const byFaculty = Array.from(facultyMap.entries())
                .map(([facultyName, count]) => ({ facultyName, count }))
                .sort((a, b) => b.count - a.count);

              setUserStats({
                ...statsData.data,
                byClass: byClass || [],
                byFaculty: byFaculty || []
              });
            } else {
              setUserStats({
                ...statsData.data,
                byClass: [],
                byFaculty: []
              });
            }
          } else {
            setUserStats({
              ...statsData.data,
              byClass: [],
              byFaculty: []
            });
          }
        }
      }
    } catch (err) {
      console.error('Error fetching user stats:', err);
    }
  };

  // Fetch activity stats
  const fetchActivityStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/activities?limit=1000', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.activities) {
          const activities = data.data.activities;
          
          // Calculate stats
          const byStatus = {
            draft: activities.filter((a: any) => a.status === 'draft').length,
            published: activities.filter((a: any) => a.status === 'published').length,
            ongoing: activities.filter((a: any) => a.status === 'ongoing').length,
            completed: activities.filter((a: any) => a.status === 'completed').length,
            cancelled: activities.filter((a: any) => a.status === 'cancelled').length,
            postponed: activities.filter((a: any) => a.status === 'postponed').length,
          };

          const byType = {
            single_day: activities.filter((a: any) => a.type === 'single_day').length,
            multi_day: activities.filter((a: any) => a.type === 'multi_day').length,
          };

          // Group by month
          const monthMap = new Map<string, number>();
          activities.forEach((activity: any) => {
            if (activity.date) {
              const date = new Date(activity.date);
              const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
              monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + 1);
            }
          });

          const byMonth = Array.from(monthMap.entries())
            .map(([month, count]) => ({ month, count }))
            .sort((a, b) => a.month.localeCompare(b.month))
            .slice(-12); // Last 12 months

          // Calculate participants by type
          let singleDayParticipants = 0;
          let multiDayParticipants = 0;
          
          activities.forEach((activity: any) => {
            const participantCount = activity.participants?.length || 0;
            if (activity.type === 'single_day') {
              singleDayParticipants += participantCount;
            } else if (activity.type === 'multi_day') {
              multiDayParticipants += participantCount;
            }
          });

          // Group by created month (thời gian tạo hoạt động)
          const createdMonthMap = new Map<string, number>();
          activities.forEach((activity: any) => {
            if (activity.createdAt) {
              const date = new Date(activity.createdAt);
              const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
              createdMonthMap.set(monthKey, (createdMonthMap.get(monthKey) || 0) + 1);
            }
          });

          const byCreatedMonth = Array.from(createdMonthMap.entries())
            .map(([month, count]) => ({ month, count }))
            .sort((a, b) => a.month.localeCompare(b.month))
            .slice(-12); // Last 12 months

          setActivityStats({
            total: activities.length,
            byStatus,
            byType,
            byMonth,
            participantsByType: {
              single_day: singleDayParticipants,
              multi_day: multiDayParticipants
            },
            byCreatedMonth
          });
        }
      }
    } catch (err) {
      console.error('Error fetching activity stats:', err);
    }
  };

  // Load all stats
  useEffect(() => {
    const loadStats = async () => {
      setLoading(true);
      setError(null);
      try {
        await Promise.all([
          fetchDashboardStats(),
          fetchUserStats(),
          fetchActivityStats()
        ]);
      } catch (err) {
        setError('Có lỗi xảy ra khi tải dữ liệu thống kê');
        console.error('Error loading stats:', err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadStats();
    }
  }, [user, dateRange]);

  // Export report function
  const handleExportReport = () => {
    const reportData = {
      generatedAt: new Date().toLocaleString('vi-VN'),
      dateRange,
      dashboardStats,
      userStats,
      activityStats
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bao-cao-thong-ke-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Calculate percentage
  const calculatePercentage = (value: number, total: number): number => {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  };

  // Format date range label
  const getDateRangeLabel = () => {
    switch (dateRange) {
      case 'week': return 'Tuần này';
      case 'month': return 'Tháng này';
      case 'quarter': return 'Quý này';
      case 'year': return 'Năm này';
      case 'all': return 'Tất cả';
      default: return 'Tháng này';
    }
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRole="CLUB_LEADER">
        <div 
          className={`min-h-screen flex flex-col overflow-x-hidden ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}
          style={{
            '--sidebar-width': isSidebarOpen ? '288px' : '80px'
          } as React.CSSProperties}
        >
          <AdminNav />
          <main 
            className="flex-1 flex items-center justify-center transition-all duration-300 overflow-x-hidden min-w-0"
            style={{
              marginLeft: isDesktop ? (isSidebarOpen ? '288px' : '80px') : '0',
              width: isDesktop ? `calc(100% - ${isSidebarOpen ? '288px' : '80px'})` : '100%',
              maxWidth: isDesktop ? `calc(100% - ${isSidebarOpen ? '288px' : '80px'})` : '100%'
            }}
          >
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className={`mt-4 text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Đang tải dữ liệu thống kê...
              </p>
            </div>
          </main>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="CLUB_LEADER">
      <div 
        className={`min-h-screen flex flex-col transition-colors duration-200 overflow-x-hidden ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}
        style={{
          '--sidebar-width': isSidebarOpen ? '288px' : '80px'
        } as React.CSSProperties}
      >
        <AdminNav />
        
        <main 
          className="flex-1 transition-all duration-300 px-3 sm:px-4 py-3 sm:py-4 overflow-x-hidden min-w-0"
          style={{
            marginLeft: isDesktop ? (isSidebarOpen ? '288px' : '80px') : '0',
            width: isDesktop ? `calc(100% - ${isSidebarOpen ? '288px' : '80px'})` : '100%',
            maxWidth: isDesktop ? `calc(100% - ${isSidebarOpen ? '288px' : '80px'})` : '100%'
          }}
        >
          {/* Hero Header with Gradient */}
          <div className={`mb-5 rounded-xl p-5 shadow-lg ${
            isDarkMode 
              ? 'bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 border border-purple-700/30' 
              : 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 border border-purple-300'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-2 rounded-lg ${
                    isDarkMode ? 'bg-white/10 backdrop-blur-sm' : 'bg-white/20 backdrop-blur-sm'
                  }`}>
                    <BarChart3 size={24} className="text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-white mb-0.5">
                      Báo Cáo Tổng Hợp Hệ Thống
                </h1>
                    <p className="text-xs text-white/80">
                      Phân tích toàn diện dữ liệu sinh viên và hoạt động
                </p>
                  </div>
                </div>
              </div>
              
              {/* Controls */}
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all duration-200 ${
                    isDarkMode 
                      ? 'bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm' 
                      : 'bg-white/90 border-white/30 text-gray-800 hover:bg-white'
                  } focus:outline-none focus:ring-2 focus:ring-white/30`}
                >
                  <option value="week">Tuần này</option>
                  <option value="month">Tháng này</option>
                  <option value="quarter">Quý này</option>
                  <option value="year">Năm này</option>
                  <option value="all">Tất cả</option>
                </select>
                
                <button
                  onClick={handleExportReport}
                  className="px-4 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center justify-center space-x-1.5 bg-white text-indigo-600 hover:bg-white/90 shadow-md hover:shadow-lg"
                >
                  <Download size={14} />
                  <span>Xuất Báo Cáo</span>
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className={`mb-6 p-5 rounded-xl border-2 shadow-lg ${
              isDarkMode ? 'bg-red-900/30 border-red-600/50' : 'bg-red-50 border-red-300'
            }`}>
              <p className={`text-sm font-semibold ${isDarkMode ? 'text-red-200' : 'text-red-800'}`}>{error}</p>
            </div>
          )}

          {/* Dashboard Stats Overview - Compact Cards */}
          {dashboardStats && (
            <section className={`mb-5 p-4 rounded-lg shadow-md ${
              isDarkMode ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'
            }`}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`p-1.5 rounded-lg ${
                  isDarkMode ? 'bg-indigo-500/20' : 'bg-indigo-100'
                }`}>
                  <TrendingUp size={16} className={isDarkMode ? 'text-indigo-400' : 'text-indigo-600'} />
                </div>
                <h2 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Tổng Quan Hệ Thống
              </h2>
              </div>
              
              {/* Compact Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Total Students */}
                <div className={`p-3 rounded-lg shadow-sm border transition-all duration-200 ${
                  isDarkMode 
                    ? 'bg-gray-800/50 border-gray-700 hover:bg-gray-800' 
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'
                    }`}>
                      <Users size={16} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} />
                    </div>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      dashboardStats?.totalStudents?.changeType === 'increase'
                        ? isDarkMode ? 'bg-green-600/30 text-green-300' : 'bg-green-100 text-green-700'
                        : isDarkMode ? 'bg-red-600/30 text-red-300' : 'bg-red-100 text-red-700'
                    }`}>
                      {dashboardStats?.totalStudents?.change || '0'}
                    </span>
                  </div>
                  <h3 className={`text-[11px] font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Tổng Sinh Viên
                  </h3>
                  <p className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {dashboardStats?.totalStudents?.value || '0'}
                  </p>
                </div>

                {/* Ongoing Activities */}
                <div className={`p-3 rounded-lg shadow-sm border transition-all duration-200 ${
                  isDarkMode 
                    ? 'bg-gray-800/50 border-gray-700 hover:bg-gray-800' 
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isDarkMode ? 'bg-purple-500/20' : 'bg-purple-100'
                    }`}>
                      <Activity size={16} className={isDarkMode ? 'text-purple-400' : 'text-purple-600'} />
                    </div>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      dashboardStats?.ongoingActivities?.changeType === 'increase'
                        ? isDarkMode ? 'bg-green-600/30 text-green-300' : 'bg-green-100 text-green-700'
                        : isDarkMode ? 'bg-red-600/30 text-red-300' : 'bg-red-100 text-red-700'
                    }`}>
                      {dashboardStats?.ongoingActivities?.change || '0'}
                    </span>
                  </div>
                  <h3 className={`text-[11px] font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Hoạt Động Đang Diễn Ra
                  </h3>
                  <p className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {dashboardStats?.ongoingActivities?.value || '0'}
                  </p>
                </div>

                {/* Average Score */}
                <div className={`p-3 rounded-lg shadow-sm border transition-all duration-200 ${
                  isDarkMode 
                    ? 'bg-gray-800/50 border-gray-700 hover:bg-gray-800' 
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isDarkMode ? 'bg-emerald-500/20' : 'bg-emerald-100'
                    }`}>
                      <Star size={16} className={isDarkMode ? 'text-emerald-400' : 'text-emerald-600'} />
                    </div>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      dashboardStats?.averageScore?.changeType === 'increase'
                        ? isDarkMode ? 'bg-green-600/30 text-green-300' : 'bg-green-100 text-green-700'
                        : isDarkMode ? 'bg-red-600/30 text-red-300' : 'bg-red-100 text-red-700'
                    }`}>
                      {dashboardStats?.averageScore?.change || '0'}
                    </span>
                  </div>
                  <h3 className={`text-[11px] font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Điểm Trung Bình
                  </h3>
                  <p className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {dashboardStats?.averageScore?.value || '0'}
                  </p>
                </div>

                {/* Pending Reports */}
                <div className={`p-3 rounded-lg shadow-sm border transition-all duration-200 ${
                  isDarkMode 
                    ? 'bg-gray-800/50 border-gray-700 hover:bg-gray-800' 
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isDarkMode ? 'bg-amber-500/20' : 'bg-amber-100'
                    }`}>
                      <FileText size={16} className={isDarkMode ? 'text-amber-400' : 'text-amber-600'} />
                    </div>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      dashboardStats?.pendingReports?.changeType === 'increase'
                        ? isDarkMode ? 'bg-green-600/30 text-green-300' : 'bg-green-100 text-green-700'
                        : isDarkMode ? 'bg-red-600/30 text-red-300' : 'bg-red-100 text-red-700'
                    }`}>
                      {dashboardStats?.pendingReports?.change || '0'}
                    </span>
                  </div>
                  <h3 className={`text-[11px] font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Báo Cáo Chờ Xử Lý
                  </h3>
                  <p className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {dashboardStats?.pendingReports?.value || '0'}
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* User Statistics - Compact Section */}
          {userStats && (
            <section className={`mb-5 p-4 rounded-lg shadow-md ${
              isDarkMode ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'
            }`}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`p-1.5 rounded-lg ${
                  isDarkMode ? 'bg-teal-500/20' : 'bg-teal-100'
                }`}>
                  <Users size={16} className={isDarkMode ? 'text-teal-400' : 'text-teal-600'} />
                </div>
                <div>
                  <h2 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Thống Kê Thành Viên
              </h2>
                </div>
              </div>
              <div className={`p-3 rounded-lg shadow-sm ${isDarkMode ? 'bg-gray-800/50 border border-gray-700' : 'bg-gray-50 border border-gray-200'}`}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                  {/* Total Users */}
                  <div className={`text-center p-3 rounded-lg ${
                    isDarkMode ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'
                  }`}>
                    <div className={`w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center ${
                      isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'
                    }`}>
                      <Users size={18} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} />
                    </div>
                    <p className={`text-xl font-bold mb-0.5 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {userStats.totalUsers.toLocaleString('vi-VN')}
                    </p>
                    <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Tổng Người Dùng
                    </p>
                  </div>

                  {/* Club Members */}
                  <div className={`text-center p-3 rounded-lg ${
                    isDarkMode ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'
                  }`}>
                    <div className={`w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center ${
                      isDarkMode ? 'bg-purple-500/20' : 'bg-purple-100'
                    }`}>
                      <Target size={18} className={isDarkMode ? 'text-purple-400' : 'text-purple-600'} />
                    </div>
                    <p className={`text-xl font-bold mb-0.5 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {userStats.totalClubMembers.toLocaleString('vi-VN')}
                    </p>
                    <p className={`text-xs mb-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Thành Viên CLB
                    </p>
                    <p className={`text-[10px] ${isDarkMode ? 'text-purple-300' : 'text-purple-600'}`}>
                      {calculatePercentage(userStats.totalClubMembers, userStats.totalUsers)}% tổng số
                    </p>
                  </div>

                  {/* Non-Club Members */}
                  <div className={`text-center p-3 rounded-lg ${
                    isDarkMode ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'
                  }`}>
                    <div className={`w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center ${
                      isDarkMode ? 'bg-gray-500/20' : 'bg-gray-100'
                    }`}>
                      <GraduationCap size={18} className={isDarkMode ? 'text-gray-300' : 'text-gray-600'} />
                    </div>
                    <p className={`text-xl font-bold mb-0.5 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {userStats.totalNonClubMembers.toLocaleString('vi-VN')}
                    </p>
                    <p className={`text-xs mb-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Sinh Viên Thường
                    </p>
                    <p className={`text-[10px] ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {calculatePercentage(userStats.totalNonClubMembers, userStats.totalUsers)}% tổng số
                    </p>
                  </div>

                  {/* Management Staff */}
                  <div className={`text-center p-3 rounded-lg ${
                    isDarkMode ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'
                    }`}>
                    <div className={`w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center ${
                      isDarkMode ? 'bg-emerald-500/20' : 'bg-emerald-100'
                    }`}>
                      <CheckCircle2 size={18} className={isDarkMode ? 'text-emerald-400' : 'text-emerald-600'} />
                    </div>
                    <p className={`text-xl font-bold mb-0.5 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {userStats.totalManagementStaff.toLocaleString('vi-VN')}
                    </p>
                    <p className={`text-xs mb-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Ban Quản Lý
                    </p>
                    <p className={`text-[10px] ${isDarkMode ? 'text-emerald-300' : 'text-emerald-600'}`}>
                      {calculatePercentage(userStats.totalManagementStaff, userStats.totalUsers)}% tổng số
                    </p>
                  </div>
                </div>

                {/* User Distribution Chart - Pie Chart using Recharts */}
                <div className="mt-3">
                  <h3 className={`text-sm font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Phân Bố Thành Viên
                  </h3>
                  <div className="w-full h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Thành Viên CLB', value: userStats.totalClubMembers },
                            { name: 'Sinh Viên Thường', value: userStats.totalNonClubMembers }
                          ].filter(item => item.value > 0)}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry: any) => {
                            const percent = (Number(entry.value) / Number(userStats.totalUsers)) * 100;
                            return percent >= 5 ? `${percent.toFixed(1)}%` : '';
                          }}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          <Cell fill="#9333ea" />
                          <Cell fill="#6b7280" />
                        </Pie>
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                            border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                            borderRadius: '8px',
                            color: isDarkMode ? '#ffffff' : '#111827'
                          }}
                          formatter={(value: number, name: string, props: any) => {
                            const percentage = ((Number(value) / Number(userStats.totalUsers)) * 100).toFixed(1);
                            return [`${value} (${percentage}%)`, name];
                          }}
                        />
                        <Legend 
                          wrapperStyle={{ color: isDarkMode ? '#ffffff' : '#111827', fontSize: '11px' }}
                          formatter={(value: string) => {
                            const entry = [
                              { name: 'Thành Viên CLB', value: userStats.totalClubMembers },
                              { name: 'Sinh Viên Thường', value: userStats.totalNonClubMembers }
                            ].find(e => e.name === value);
                            const percentage = entry ? ((entry.value / userStats.totalUsers) * 100).toFixed(1) : '0';
                            return `${value} (${entry?.value || 0} - ${percentage}%)`;
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Statistics by Class and Faculty */}
                {(userStats.byClass && userStats.byClass.length > 0) || (userStats.byFaculty && userStats.byFaculty.length > 0) ? (
                  <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {/* By Class - Bar Chart using Recharts */}
                    {userStats.byClass && userStats.byClass.length > 0 && (
                      <div className={`p-3 rounded-lg shadow-sm border ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}>
                        <div className="flex items-center gap-2 mb-3">
                          <BookOpen size={14} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} />
                          <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            Phân Bố Theo Lớp (Top 10)
                        </h3>
                                    </div>
                        <div className="w-full h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart 
                              data={userStats.byClass.map(item => ({
                                name: item.className || 'Chưa có',
                                value: item.count
                              }))}
                              margin={{ top: 5, right: 5, left: 5, bottom: 40 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
                              <XAxis 
                                dataKey="name" 
                                angle={-45}
                                textAnchor="end"
                                height={50}
                                interval={0}
                                tick={{ fill: isDarkMode ? '#9ca3af' : '#6b7280', fontSize: 10 }}
                                dx={-5}
                                dy={5}
                              />
                              <YAxis 
                                tick={{ fill: isDarkMode ? '#9ca3af' : '#6b7280', fontSize: 10 }}
                                width={40}
                              />
                              <Tooltip 
                                contentStyle={{
                                  backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                                  border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                                  borderRadius: '8px',
                                  color: isDarkMode ? '#ffffff' : '#111827'
                                }}
                                formatter={(value: number) => [`${value} sinh viên`, 'Số lượng']}
                              />
                              <Bar dataKey="value" fill="#8884d8" radius={[4, 4, 0, 0]}>
                                {userStats.byClass.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={`hsl(${(index * 137.5) % 360}, 70%, 50%)`} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}

                    {/* By Faculty - Bar Chart using Recharts */}
                    {userStats.byFaculty && userStats.byFaculty.length > 0 && (
                      <div className={`p-3 rounded-lg shadow-sm border ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}>
                        <div className="flex items-center gap-2 mb-3">
                          <GraduationCap size={14} className={isDarkMode ? 'text-teal-400' : 'text-teal-600'} />
                          <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            Phân Bố Theo Khoa/Viện
                          </h3>
                        </div>
                        <div className="w-full h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart 
                              data={userStats.byFaculty.map(item => ({
                                name: item.facultyName || 'Chưa có',
                                value: item.count,
                                percentage: calculatePercentage(item.count, userStats.totalUsers)
                              }))}
                              margin={{ top: 5, right: 5, left: 5, bottom: 40 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
                              <XAxis 
                                dataKey="name" 
                                angle={-45}
                                textAnchor="end"
                                height={50}
                                interval={0}
                                tick={{ fill: isDarkMode ? '#9ca3af' : '#6b7280', fontSize: 10 }}
                                dx={-5}
                                dy={5}
                              />
                              <YAxis 
                                tick={{ fill: isDarkMode ? '#9ca3af' : '#6b7280', fontSize: 10 }}
                                width={40}
                              />
                              <Tooltip 
                                contentStyle={{
                                  backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                                  border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                                  borderRadius: '8px',
                                  color: isDarkMode ? '#ffffff' : '#111827'
                                }}
                                formatter={(value: number, name: string, props: any) => [
                                  `${value} sinh viên (${props.payload.percentage}%)`,
                                  'Số lượng'
                                ]}
                              />
                              <Bar dataKey="value" fill="#8884d8" radius={[4, 4, 0, 0]}>
                                {userStats.byFaculty.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={`hsl(${(index * 60) % 360}, 70%, 50%)`} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </section>
          )}

          {/* Activity Statistics - Compact Section */}
          {activityStats && (
            <section className={`mb-5 p-4 rounded-lg shadow-md ${
              isDarkMode ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'
            }`}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`p-1.5 rounded-lg ${
                  isDarkMode ? 'bg-violet-500/20' : 'bg-violet-100'
                }`}>
                  <Calendar size={16} className={isDarkMode ? 'text-violet-400' : 'text-violet-600'} />
                </div>
                <h2 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Thống Kê Hoạt Động
              </h2>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
                {/* Activity Status Distribution - Pie Chart using Recharts */}
                <div className={`p-3 rounded-lg shadow-sm border ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}>
                  <h3 className={`text-sm font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Phân Bố Theo Trạng Thái
                  </h3>
                  <div className="w-full h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={Object.entries(activityStats.byStatus)
                            .filter(([_, count]) => count > 0)
                            .map(([status, count]) => {
                            const statusLabels: { [key: string]: string } = {
                              draft: 'Nháp',
                              published: 'Đã xuất bản',
                              ongoing: 'Đang diễn ra',
                              completed: 'Đã hoàn thành',
                              cancelled: 'Đã hủy',
                              postponed: 'Tạm hoãn'
                            };
                              return {
                                name: statusLabels[status] || status,
                                value: count,
                                status: status,
                                percentage: calculatePercentage(count, activityStats.total)
                              };
                            })}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry: any) => {
                            const percent = typeof entry.percentage === 'number' ? entry.percentage : parseFloat(entry.percentage) || 0;
                            return percent >= 5 ? `${percent.toFixed(1)}%` : '';
                          }}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {Object.entries(activityStats.byStatus)
                              .filter(([_, count]) => count > 0)
                            .map(([status]) => {
                        const statusColors: { [key: string]: string } = {
                          draft: '#eab308',
                          published: '#22c55e',
                          ongoing: '#3b82f6',
                          completed: '#a855f7',
                          cancelled: '#ef4444',
                          postponed: '#f97316'
                        };
                              return <Cell key={`cell-${status}`} fill={statusColors[status] || '#8884d8'} />;
                            })}
                        </Pie>
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                            border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                            borderRadius: '8px',
                            color: isDarkMode ? '#ffffff' : '#111827'
                          }}
                          formatter={(value: number, name: string, props: any) => [
                            `${value} hoạt động (${props.payload.percentage}%)`,
                            props.payload.name
                          ]}
                        />
                        <Legend 
                          wrapperStyle={{ color: isDarkMode ? '#ffffff' : '#111827', fontSize: '11px' }}
                          formatter={(value: string, entry: any) => {
                            const percentage = entry.payload?.percentage || 0;
                            return `${value} (${entry.payload?.value || 0} - ${percentage}%)`;
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Activity Type Distribution - Pie Chart using Recharts */}
                <div className={`p-3 rounded-lg shadow-sm border ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}>
                  <h3 className={`text-sm font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Phân Bố Theo Loại
                  </h3>
                  <div className="w-full h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Hoạt Động 1 Ngày', value: activityStats.byType.single_day },
                            { name: 'Hoạt Động Nhiều Ngày', value: activityStats.byType.multi_day }
                          ].filter(item => item.value > 0)}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry: any) => {
                            const percent = (Number(entry.value) / Number(activityStats.total)) * 100;
                            return percent >= 5 ? `${percent.toFixed(1)}%` : '';
                          }}
                          outerRadius={70}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          <Cell fill="#3b82f6" />
                          <Cell fill="#a855f7" />
                        </Pie>
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                            border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                            borderRadius: '8px',
                            color: isDarkMode ? '#ffffff' : '#111827'
                          }}
                          formatter={(value: number, name: string) => {
                            const percentage = ((Number(value) / Number(activityStats.total)) * 100).toFixed(1);
                            return [`${value} (${percentage}%)`, name];
                          }}
                        />
                        <Legend 
                          wrapperStyle={{ color: isDarkMode ? '#ffffff' : '#111827', fontSize: '11px' }}
                          formatter={(value: string, entry: any) => {
                            const percentage = entry.payload ? ((entry.payload.value / activityStats.total) * 100).toFixed(1) : '0';
                            return `${value} (${entry.payload?.value || 0} - ${percentage}%)`;
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

              {/* Activity Timeline Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
                {/* Activities Created by Month - Bar Chart */}
                {activityStats.byCreatedMonth && activityStats.byCreatedMonth.length > 0 && (
                  <div className={`p-3 rounded-lg shadow-sm border ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar size={14} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} />
                      <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        Hoạt Động Được Tạo Theo Tháng
                      </h3>
                          </div>
                    <div className="w-full h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={activityStats.byCreatedMonth.map(item => {
                          const [year, month] = item.month.split('-');
                          const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('vi-VN', { month: 'short' });
                          const yearShort = year.slice(-2);
                          return {
                            name: `${monthName}/${yearShort}`,
                            value: item.count,
                            fullName: item.month
                          };
                        })}>
                          <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
                          <XAxis 
                            dataKey="name" 
                            tick={{ fill: isDarkMode ? '#9ca3af' : '#6b7280', fontSize: 10 }}
                          />
                          <YAxis 
                            tick={{ fill: isDarkMode ? '#9ca3af' : '#6b7280', fontSize: 10 }}
                          />
                          <Tooltip 
                            contentStyle={{
                              backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                              border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                              borderRadius: '8px',
                              color: isDarkMode ? '#ffffff' : '#111827'
                            }}
                            formatter={(value: number) => [`${value} hoạt động`, 'Số lượng']}
                          />
                          <Bar dataKey="value" fill="#8884d8" radius={[4, 4, 0, 0]}>
                            {activityStats.byCreatedMonth.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={`hsl(${(index * 30) % 360}, 70%, 50%)`} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                        </div>
                      </div>
                )}

                {/* Activity Trend Line Chart */}
                {activityStats.byCreatedMonth && activityStats.byCreatedMonth.length > 0 && (
                  <div className={`p-3 rounded-lg shadow-sm border ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp size={14} className={isDarkMode ? 'text-green-400' : 'text-green-600'} />
                      <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        Xu Hướng Hoạt Động Được Tạo
                  </h3>
                            </div>
                    <div className="w-full h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={activityStats.byCreatedMonth.map(item => {
                        const [year, month] = item.month.split('-');
                        const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('vi-VN', { month: 'short' });
                        const yearShort = year.slice(-2);
                          return {
                            name: `${monthName}/${yearShort}`,
                            value: item.count,
                            fullName: item.month
                          };
                        })}>
                          <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
                          <XAxis 
                            dataKey="name" 
                            tick={{ fill: isDarkMode ? '#9ca3af' : '#6b7280', fontSize: 10 }}
                          />
                          <YAxis 
                            tick={{ fill: isDarkMode ? '#9ca3af' : '#6b7280', fontSize: 10 }}
                          />
                          <Tooltip 
                            contentStyle={{
                              backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                              border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                              borderRadius: '8px',
                              color: isDarkMode ? '#ffffff' : '#111827'
                            }}
                            formatter={(value: number) => [`${value} hoạt động`, 'Số lượng']}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="value" 
                            stroke="#3b82f6" 
                            strokeWidth={2}
                            dot={{ fill: '#3b82f6', r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                                </div>
                              </div>
                )}
                            </div>

              {/* Participants by Activity Type */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {/* Participants by Type - Bar Chart */}
                <div className={`p-3 rounded-lg shadow-sm border ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Users size={14} className={isDarkMode ? 'text-purple-400' : 'text-purple-600'} />
                    <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Số Người Tham Gia Theo Loại
                    </h3>
                            </div>
                  <div className="w-full h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { name: 'Hoạt Động 1 Ngày', value: activityStats.participantsByType.single_day },
                        { name: 'Hoạt Động Nhiều Ngày', value: activityStats.participantsByType.multi_day }
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
                        <XAxis 
                          dataKey="name" 
                          tick={{ fill: isDarkMode ? '#9ca3af' : '#6b7280', fontSize: 11 }}
                        />
                        <YAxis 
                          tick={{ fill: isDarkMode ? '#9ca3af' : '#6b7280', fontSize: 10 }}
                        />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                            border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                            borderRadius: '8px',
                            color: isDarkMode ? '#ffffff' : '#111827'
                          }}
                          formatter={(value: number) => [`${value} người`, 'Số người tham gia']}
                        />
                        <Bar dataKey="value" fill="#8884d8" radius={[4, 4, 0, 0]}>
                          <Cell fill="#3b82f6" />
                          <Cell fill="#a855f7" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                            </div>
                    </div>
                    
                {/* Participants by Type - Pie Chart */}
                <div className={`p-3 rounded-lg shadow-sm border ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Target size={14} className={isDarkMode ? 'text-orange-400' : 'text-orange-600'} />
                    <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Tỷ Lệ Người Tham Gia Theo Loại
                    </h3>
                    </div>
                  <div className="w-full h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Hoạt Động 1 Ngày', value: activityStats.participantsByType.single_day },
                            { name: 'Hoạt Động Nhiều Ngày', value: activityStats.participantsByType.multi_day }
                          ].filter(item => item.value > 0)}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry: any) => {
                            const total = activityStats.participantsByType.single_day + activityStats.participantsByType.multi_day;
                            const percent = total > 0 ? (Number(entry.value) / Number(total)) * 100 : 0;
                            return percent >= 5 ? `${percent.toFixed(1)}%` : '';
                          }}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          <Cell fill="#3b82f6" />
                          <Cell fill="#a855f7" />
                        </Pie>
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                            border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                            borderRadius: '8px',
                            color: isDarkMode ? '#ffffff' : '#111827'
                          }}
                          formatter={(value: number, name: string) => {
                            const total = activityStats.participantsByType.single_day + activityStats.participantsByType.multi_day;
                            const percentage = total > 0 ? ((Number(value) / Number(total)) * 100).toFixed(1) : '0';
                            return [`${value} người (${percentage}%)`, name];
                          }}
                        />
                        <Legend 
                          wrapperStyle={{ color: isDarkMode ? '#ffffff' : '#111827', fontSize: '11px' }}
                          formatter={(value: string, entry: any) => {
                            const total = activityStats.participantsByType.single_day + activityStats.participantsByType.multi_day;
                            const percentage = entry.payload ? ((entry.payload.value / total) * 100).toFixed(1) : '0';
                            return `${value} (${entry.payload?.value || 0} - ${percentage}%)`;
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
            </div>
            </section>
          )}

          {/* Summary Section - Compact Footer */}
          <section className={`p-4 rounded-lg shadow-md ${
            isDarkMode ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'
          }`}>
            <div className="flex items-center gap-2 mb-3">
              <FileText size={16} className={isDarkMode ? 'text-indigo-400' : 'text-indigo-600'} />
              <h3 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Tóm Tắt Báo Cáo
            </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700/30 border border-gray-700' : 'bg-gray-50 border border-gray-200'}`}>
                <div className="flex items-center gap-2 mb-1.5">
                  <Clock size={14} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                  <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Thời Gian Báo Cáo
                </p>
                </div>
                <p className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {getDateRangeLabel()}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700/30 border border-gray-700' : 'bg-gray-50 border border-gray-200'}`}>
                <div className="flex items-center gap-2 mb-1.5">
                  <Calendar size={14} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                  <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Ngày Tạo Báo Cáo
                </p>
                </div>
                <p className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {new Date().toLocaleDateString('vi-VN')}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700/30 border border-gray-700' : 'bg-gray-50 border border-gray-200'}`}>
                <div className="flex items-center gap-2 mb-1.5">
                  <BarChart3 size={14} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                  <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Tổng Số Dữ Liệu
                </p>
                </div>
                <p className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {((userStats?.totalUsers || 0) + (activityStats?.total || 0)).toLocaleString('vi-VN')} mục
                </p>
              </div>
            </div>
          </section>
        </main>

        <Footer isDarkMode={isDarkMode} />
      </div>
    </ProtectedRoute>
  );
}

