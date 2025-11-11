'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useDarkMode } from '@/hooks/useDarkMode';
import AdminNav from '@/components/admin/AdminNav';
import Footer from '@/components/common/Footer';
import ProtectedRoute from '@/components/common/ProtectedRoute';

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

          setActivityStats({
            total: activities.length,
            byStatus,
            byType,
            byMonth
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
          className="flex-1 transition-all duration-300 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 overflow-x-hidden min-w-0"
          style={{
            marginLeft: isDesktop ? (isSidebarOpen ? '288px' : '80px') : '0',
            width: isDesktop ? `calc(100% - ${isSidebarOpen ? '288px' : '80px'})` : '100%',
            maxWidth: isDesktop ? `calc(100% - ${isSidebarOpen ? '288px' : '80px'})` : '100%'
          }}
        >
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className={`text-2xl sm:text-3xl font-bold mb-2 transition-colors duration-200 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  📊 Báo Cáo Thống Kê
                </h1>
                <p className={`text-sm sm:text-base transition-colors duration-200 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Xem và phân tích dữ liệu tổng hợp của hệ thống
                </p>
              </div>
              
              {/* Date Range Selector & Export Button */}
              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all duration-200 ${
                    isDarkMode 
                      ? 'bg-gray-800 border-gray-600 text-white hover:bg-gray-700' 
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                >
                  <option value="week">Tuần này</option>
                  <option value="month">Tháng này</option>
                  <option value="quarter">Quý này</option>
                  <option value="year">Năm này</option>
                  <option value="all">Tất cả</option>
                </select>
                
                <button
                  onClick={handleExportReport}
                  className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center space-x-2 ${
                    isDarkMode
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white'
                      : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white'
                  } hover:scale-105 shadow-lg hover:shadow-xl`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Xuất báo cáo</span>
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-800 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Dashboard Stats Overview */}
          {dashboardStats && (
            <div className="mb-8">
              <h2 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                📈 Tổng Quan Hệ Thống
              </h2>
              
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Total Students */}
                <div className={`p-6 rounded-xl shadow-lg transition-all duration-300 hover:scale-105 ${
                  isDarkMode ? 'bg-gradient-to-br from-blue-900/50 to-blue-800/50 border border-blue-700/50' : 'bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200'
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'
                    }`}>
                      <span className="text-2xl">👥</span>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      dashboardStats.totalStudents.changeType === 'increase'
                        ? isDarkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-700'
                        : isDarkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-700'
                    }`}>
                      {dashboardStats.totalStudents.change}
                    </span>
                  </div>
                  <h3 className={`text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    Tổng Sinh Viên
                  </h3>
                  <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {dashboardStats.totalStudents.value}
                  </p>
                </div>

                {/* Ongoing Activities */}
                <div className={`p-6 rounded-xl shadow-lg transition-all duration-300 hover:scale-105 ${
                  isDarkMode ? 'bg-gradient-to-br from-purple-900/50 to-purple-800/50 border border-purple-700/50' : 'bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200'
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      isDarkMode ? 'bg-purple-500/20' : 'bg-purple-100'
                    }`}>
                      <span className="text-2xl">🔄</span>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      dashboardStats.ongoingActivities.changeType === 'increase'
                        ? isDarkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-700'
                        : isDarkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-700'
                    }`}>
                      {dashboardStats.ongoingActivities.change}
                    </span>
                  </div>
                  <h3 className={`text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    Hoạt Động Đang Diễn Ra
                  </h3>
                  <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {dashboardStats.ongoingActivities.value}
                  </p>
                </div>

                {/* Average Score */}
                <div className={`p-6 rounded-xl shadow-lg transition-all duration-300 hover:scale-105 ${
                  isDarkMode ? 'bg-gradient-to-br from-green-900/50 to-green-800/50 border border-green-700/50' : 'bg-gradient-to-br from-green-50 to-green-100 border border-green-200'
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      isDarkMode ? 'bg-green-500/20' : 'bg-green-100'
                    }`}>
                      <span className="text-2xl">⭐</span>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      dashboardStats.averageScore.changeType === 'increase'
                        ? isDarkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-700'
                        : isDarkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-700'
                    }`}>
                      {dashboardStats.averageScore.change}
                    </span>
                  </div>
                  <h3 className={`text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    Điểm Trung Bình
                  </h3>
                  <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {dashboardStats.averageScore.value}
                  </p>
                </div>

                {/* Pending Reports */}
                <div className={`p-6 rounded-xl shadow-lg transition-all duration-300 hover:scale-105 ${
                  isDarkMode ? 'bg-gradient-to-br from-orange-900/50 to-orange-800/50 border border-orange-700/50' : 'bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200'
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      isDarkMode ? 'bg-orange-500/20' : 'bg-orange-100'
                    }`}>
                      <span className="text-2xl">📋</span>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      dashboardStats.pendingReports.changeType === 'increase'
                        ? isDarkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-700'
                        : isDarkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-700'
                    }`}>
                      {dashboardStats.pendingReports.change}
                    </span>
                  </div>
                  <h3 className={`text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    Báo Cáo Chờ Xử Lý
                  </h3>
                  <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {dashboardStats.pendingReports.value}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* User Statistics */}
          {userStats && (
            <div className="mb-8">
              <h2 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                👥 Thống Kê Thành Viên
              </h2>
              <div className={`p-6 rounded-xl shadow-lg ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Total Users */}
                  <div className="text-center">
                    <div className={`w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center ${
                      isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'
                    }`}>
                      <span className="text-2xl">👤</span>
                    </div>
                    <p className={`text-3xl font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {userStats.totalUsers.toLocaleString('vi-VN')}
                    </p>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Tổng Người Dùng
                    </p>
                  </div>

                  {/* Club Members */}
                  <div className="text-center">
                    <div className={`w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center ${
                      isDarkMode ? 'bg-purple-500/20' : 'bg-purple-100'
                    }`}>
                      <span className="text-2xl">🎯</span>
                    </div>
                    <p className={`text-3xl font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {userStats.totalClubMembers.toLocaleString('vi-VN')}
                    </p>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Thành Viên CLB
                    </p>
                    <p className={`text-xs mt-1 ${isDarkMode ? 'text-purple-300' : 'text-purple-600'}`}>
                      {calculatePercentage(userStats.totalClubMembers, userStats.totalUsers)}% tổng số
                    </p>
                  </div>

                  {/* Non-Club Members */}
                  <div className="text-center">
                    <div className={`w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center ${
                      isDarkMode ? 'bg-gray-500/20' : 'bg-gray-100'
                    }`}>
                      <span className="text-2xl">👥</span>
                    </div>
                    <p className={`text-3xl font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {userStats.totalNonClubMembers.toLocaleString('vi-VN')}
                    </p>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Sinh Viên Thường
                    </p>
                    <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {calculatePercentage(userStats.totalNonClubMembers, userStats.totalUsers)}% tổng số
                    </p>
                  </div>

                  {/* Management Staff */}
                  <div className="text-center">
                    <div className={`w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center ${
                      isDarkMode ? 'bg-green-500/20' : 'bg-green-100'
                    }`}>
                      <span className="text-2xl">👔</span>
                    </div>
                    <p className={`text-3xl font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {userStats.totalManagementStaff.toLocaleString('vi-VN')}
                    </p>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Ban Quản Lý
                    </p>
                    <p className={`text-xs mt-1 ${isDarkMode ? 'text-green-300' : 'text-green-600'}`}>
                      {calculatePercentage(userStats.totalManagementStaff, userStats.totalUsers)}% tổng số
                    </p>
                  </div>
                </div>

                {/* User Distribution Chart - Pie Chart */}
                <div className="mt-8">
                  <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Phân Bố Thành Viên (Biểu Đồ Tròn)
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Pie Chart */}
                    <div className="flex items-center justify-center">
                      <div className="relative w-64 h-64">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                          <circle
                            cx="100"
                            cy="100"
                            r="80"
                            fill="none"
                            stroke={isDarkMode ? '#374151' : '#e5e7eb'}
                            strokeWidth="40"
                          />
                          {/* Club Members */}
                          {userStats.totalClubMembers > 0 && (
                            <circle
                              cx="100"
                              cy="100"
                              r="80"
                              fill="none"
                              stroke="#9333ea"
                              strokeWidth="40"
                              strokeDasharray={`${2 * Math.PI * 80 * calculatePercentage(userStats.totalClubMembers, userStats.totalUsers) / 100} ${2 * Math.PI * 80}`}
                              strokeDashoffset="0"
                              className="transition-all duration-1000"
                            />
                          )}
                          {/* Non-Club Members */}
                          {userStats.totalNonClubMembers > 0 && (
                            <circle
                              cx="100"
                              cy="100"
                              r="80"
                              fill="none"
                              stroke="#6b7280"
                              strokeWidth="40"
                              strokeDasharray={`${2 * Math.PI * 80 * calculatePercentage(userStats.totalNonClubMembers, userStats.totalUsers) / 100} ${2 * Math.PI * 80}`}
                              strokeDashoffset={`-${2 * Math.PI * 80 * calculatePercentage(userStats.totalClubMembers, userStats.totalUsers) / 100}`}
                              className="transition-all duration-1000"
                            />
                          )}
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              {userStats.totalUsers.toLocaleString('vi-VN')}
                            </p>
                            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              Tổng số
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Legend */}
                    <div className="flex flex-col justify-center space-y-4">
                      {/* Club Members */}
                      <div className="flex items-center space-x-3">
                        <div className="w-4 h-4 rounded-full bg-gradient-to-r from-purple-500 to-purple-600"></div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              Thành Viên CLB
                            </span>
                            <span className={`text-sm font-bold ${isDarkMode ? 'text-purple-300' : 'text-purple-600'}`}>
                              {userStats.totalClubMembers} ({calculatePercentage(userStats.totalClubMembers, userStats.totalUsers)}%)
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Non-Club Members */}
                      <div className="flex items-center space-x-3">
                        <div className="w-4 h-4 rounded-full bg-gradient-to-r from-gray-400 to-gray-500"></div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              Sinh Viên Thường
                            </span>
                            <span className={`text-sm font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                              {userStats.totalNonClubMembers} ({calculatePercentage(userStats.totalNonClubMembers, userStats.totalUsers)}%)
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Management Staff - Info only (not in pie chart) */}
                      <div className={`mt-4 p-3 rounded-lg ${isDarkMode ? 'bg-gray-700/50 border border-gray-600' : 'bg-gray-50 border border-gray-200'}`}>
                        <div className="flex items-center space-x-3">
                          <div className="w-4 h-4 rounded-full bg-gradient-to-r from-green-500 to-green-600"></div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                Ban Quản Lý
                                <span className={`ml-2 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  (trong Thành Viên CLB)
                                </span>
                              </span>
                              <span className={`text-sm font-bold ${isDarkMode ? 'text-green-300' : 'text-green-600'}`}>
                                {userStats.totalManagementStaff}
                              </span>
                            </div>
                            <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {calculatePercentage(userStats.totalManagementStaff, userStats.totalClubMembers)}% trong Thành Viên CLB
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Statistics by Class and Faculty */}
                {(userStats.byClass && userStats.byClass.length > 0) || (userStats.byFaculty && userStats.byFaculty.length > 0) ? (
                  <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* By Class - Bar Chart */}
                    {userStats.byClass && userStats.byClass.length > 0 && (
                      <div className={`p-6 rounded-xl shadow-lg ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} overflow-hidden`}>
                        <h3 className={`text-lg font-semibold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          📚 Phân Bố Theo Lớp (Top 10) - Biểu Đồ Cột
                        </h3>
                        <div className="w-full overflow-x-auto">
                          <div className="relative pl-8 min-w-[400px]">
                            {/* Y-axis labels */}
                            <div className="absolute left-0 top-0 h-80 flex flex-col justify-between text-xs pr-2">
                              {(() => {
                                const maxCount = Math.max(...userStats.byClass.map(c => c.count), 1);
                                const steps = 5;
                                const stepValue = Math.ceil(maxCount / steps);
                                return Array.from({ length: steps + 1 }, (_, i) => {
                                  const value = (steps - i) * stepValue;
                                  return (
                                    <div key={i} className={`text-right ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                      {value}
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                            
                            {/* Chart Container */}
                            <div className="relative h-80 flex items-end gap-2">
                              {userStats.byClass.map((item, index) => {
                                const maxCount = Math.max(...userStats.byClass.map(c => c.count), 1);
                                const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                                
                                return (
                                  <div key={item.className || index} className="flex-1 min-w-[40px] flex flex-col items-center group">
                                    {/* Bar */}
                                    <div 
                                      className={`w-full rounded-t-lg bg-gradient-to-t from-blue-600 via-purple-500 to-pink-500 transition-all duration-500 hover:from-blue-500 hover:via-purple-400 hover:to-pink-400 cursor-pointer relative group/bar shadow-md hover:shadow-lg`}
                                      style={{ height: `${height}%`, minHeight: item.count > 0 ? '8px' : '0' }}
                                      title={`${item.className || 'Chưa có lớp'}: ${item.count} sinh viên`}
                                    >
                                      {/* Value Label on Hover */}
                                      <div className={`absolute -top-10 left-1/2 transform -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 transition-opacity duration-200 ${isDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-900 text-white'} px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shadow-lg z-10`}>
                                        <div className="text-center">
                                          <div className="font-bold">{item.count}</div>
                                          <div className="text-[10px] opacity-90">sinh viên</div>
                                        </div>
                                        {/* Arrow */}
                                        <div className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full ${isDarkMode ? 'border-t-gray-700' : 'border-t-gray-900'} border-4 border-transparent`}></div>
                                      </div>
                                    </div>
                                    {/* Class Label */}
                                    <div className={`mt-3 text-xs font-medium text-center ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} truncate w-full px-1`} title={item.className || 'Chưa có lớp'}>
                                      {item.className || 'Chưa có lớp'}
                                    </div>
                                    {/* Count Label */}
                                    <div className={`mt-1 text-xs font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                      {item.count}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            
                            {/* X-axis label */}
                            <div className={`mt-4 text-center text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              Lớp
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* By Faculty - Bar Chart */}
                    {userStats.byFaculty && userStats.byFaculty.length > 0 && (
                      <div className={`p-6 rounded-xl shadow-lg ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} overflow-hidden`}>
                        <h3 className={`text-lg font-semibold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          🎓 Phân Bố Theo Khoa/Viện - Biểu Đồ Cột
                        </h3>
                        <div className="w-full overflow-x-auto">
                          <div className="relative pl-8 min-w-[400px]">
                            {/* Y-axis labels */}
                            <div className="absolute left-0 top-0 h-80 flex flex-col justify-between text-xs pr-2">
                              {(() => {
                                const maxCount = Math.max(...userStats.byFaculty.map(f => f.count), 1);
                                const steps = 5;
                                const stepValue = Math.ceil(maxCount / steps);
                                return Array.from({ length: steps + 1 }, (_, i) => {
                                  const value = (steps - i) * stepValue;
                                  return (
                                    <div key={i} className={`text-right ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                      {value}
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                            
                            {/* Chart Container */}
                            <div className="relative h-80 flex items-end gap-2">
                              {userStats.byFaculty.map((item, index) => {
                                const maxCount = Math.max(...userStats.byFaculty.map(f => f.count), 1);
                                const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                                const totalPercentage = calculatePercentage(item.count, userStats.totalUsers);
                                
                                return (
                                  <div key={item.facultyName || index} className="flex-1 min-w-[40px] flex flex-col items-center group">
                                    {/* Bar */}
                                    <div 
                                      className={`w-full rounded-t-lg bg-gradient-to-t from-purple-600 via-pink-500 to-red-500 transition-all duration-500 hover:from-purple-500 hover:via-pink-400 hover:to-red-400 cursor-pointer relative group/bar shadow-md hover:shadow-lg`}
                                      style={{ height: `${height}%`, minHeight: item.count > 0 ? '8px' : '0' }}
                                      title={`${item.facultyName || 'Chưa có khoa/viện'}: ${item.count} sinh viên (${totalPercentage}%)`}
                                    >
                                      {/* Value Label on Hover */}
                                      <div className={`absolute -top-12 left-1/2 transform -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 transition-opacity duration-200 ${isDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-900 text-white'} px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shadow-lg z-10`}>
                                        <div className="text-center">
                                          <div className="font-bold">{item.count}</div>
                                          <div className="text-[10px] opacity-90">{totalPercentage}% tổng số</div>
                                        </div>
                                        {/* Arrow */}
                                        <div className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full ${isDarkMode ? 'border-t-gray-700' : 'border-t-gray-900'} border-4 border-transparent`}></div>
                                      </div>
                                    </div>
                                    {/* Faculty Label */}
                                    <div className={`mt-3 text-xs font-medium text-center ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} truncate w-full px-1`} title={item.facultyName || 'Chưa có khoa/viện'}>
                                      {item.facultyName ? (item.facultyName.length > 12 ? item.facultyName.substring(0, 12) + '...' : item.facultyName) : 'Chưa có khoa/viện'}
                                    </div>
                                    {/* Count Label */}
                                    <div className={`mt-1 text-xs font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                      {item.count}
                                    </div>
                                    {/* Percentage Label */}
                                    <div className={`text-[10px] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                      {totalPercentage}%
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            
                            {/* X-axis label */}
                            <div className={`mt-4 text-center text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              Khoa/Viện
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {/* Activity Statistics */}
          {activityStats && (
            <div className="mb-8">
              <h2 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                📅 Thống Kê Hoạt Động
              </h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Activity Status Distribution - Doughnut Chart */}
                <div className={`p-6 rounded-xl shadow-lg ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                  <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Phân Bố Theo Trạng Thái (Biểu Đồ Doughnut)
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Doughnut Chart */}
                    <div className="flex items-center justify-center">
                      <div className="relative w-56 h-56">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                          <circle
                            cx="100"
                            cy="100"
                            r="70"
                            fill="none"
                            stroke={isDarkMode ? '#374151' : '#e5e7eb'}
                            strokeWidth="30"
                          />
                          {(() => {
                            const statusLabels: { [key: string]: string } = {
                              draft: 'Nháp',
                              published: 'Đã xuất bản',
                              ongoing: 'Đang diễn ra',
                              completed: 'Đã hoàn thành',
                              cancelled: 'Đã hủy',
                              postponed: 'Tạm hoãn'
                            };
                            const statusColors: { [key: string]: string } = {
                              draft: '#eab308',
                              published: '#22c55e',
                              ongoing: '#3b82f6',
                              completed: '#a855f7',
                              cancelled: '#ef4444',
                              postponed: '#f97316'
                            };
                            
                            let offset = 0;
                            const circumference = 2 * Math.PI * 70;
                            
                            return Object.entries(activityStats.byStatus)
                              .filter(([_, count]) => count > 0)
                              .map(([status, count], index) => {
                                const percentage = calculatePercentage(count, activityStats.total);
                                const dashLength = (circumference * percentage) / 100;
                                const currentOffset = offset;
                                offset -= dashLength;
                                
                                return (
                                  <circle
                                    key={status}
                                    cx="100"
                                    cy="100"
                                    r="70"
                                    fill="none"
                                    stroke={statusColors[status]}
                                    strokeWidth="30"
                                    strokeDasharray={`${dashLength} ${circumference}`}
                                    strokeDashoffset={currentOffset}
                                    className="transition-all duration-1000"
                                  />
                                );
                              });
                          })()}
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              {activityStats.total}
                            </p>
                            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              Tổng số
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Legend */}
                    <div className="flex flex-col justify-center space-y-3">
                      {Object.entries(activityStats.byStatus).map(([status, count]) => {
                        const statusLabels: { [key: string]: string } = {
                          draft: 'Nháp',
                          published: 'Đã xuất bản',
                          ongoing: 'Đang diễn ra',
                          completed: 'Đã hoàn thành',
                          cancelled: 'Đã hủy',
                          postponed: 'Tạm hoãn'
                        };
                        const statusColors: { [key: string]: string } = {
                          draft: '#eab308',
                          published: '#22c55e',
                          ongoing: '#3b82f6',
                          completed: '#a855f7',
                          cancelled: '#ef4444',
                          postponed: '#f97316'
                        };
                        const percentage = calculatePercentage(count, activityStats.total);
                        
                        return (
                          <div key={status} className="flex items-center space-x-3">
                            <div 
                              className="w-4 h-4 rounded-full" 
                              style={{ backgroundColor: statusColors[status] }}
                            ></div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                  {statusLabels[status]}
                                </span>
                                <span className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {count} ({percentage}%)
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Activity Type Distribution - Pie Chart */}
                <div className={`p-6 rounded-xl shadow-lg ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                  <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Phân Bố Theo Loại (Biểu Đồ Tròn)
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Pie Chart */}
                    <div className="flex items-center justify-center">
                      <div className="relative w-56 h-56">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                          <circle
                            cx="100"
                            cy="100"
                            r="70"
                            fill="none"
                            stroke={isDarkMode ? '#374151' : '#e5e7eb'}
                            strokeWidth="30"
                          />
                          {/* Single Day */}
                          <circle
                            cx="100"
                            cy="100"
                            r="70"
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth="30"
                            strokeDasharray={`${2 * Math.PI * 70 * calculatePercentage(activityStats.byType.single_day, activityStats.total) / 100} ${2 * Math.PI * 70}`}
                            strokeDashoffset="0"
                            className="transition-all duration-1000"
                          />
                          {/* Multi Day */}
                          <circle
                            cx="100"
                            cy="100"
                            r="70"
                            fill="none"
                            stroke="#a855f7"
                            strokeWidth="30"
                            strokeDasharray={`${2 * Math.PI * 70 * calculatePercentage(activityStats.byType.multi_day, activityStats.total) / 100} ${2 * Math.PI * 70}`}
                            strokeDashoffset={`-${2 * Math.PI * 70 * calculatePercentage(activityStats.byType.single_day, activityStats.total) / 100}`}
                            className="transition-all duration-1000"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              {activityStats.total}
                            </p>
                            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              Tổng số
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Legend & Info */}
                    <div className="flex flex-col justify-center space-y-4">
                      {/* Single Day */}
                      <div className="flex items-center space-x-3">
                        <div className="w-4 h-4 rounded-full bg-gradient-to-r from-blue-500 to-blue-600"></div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              Hoạt Động 1 Ngày
                            </span>
                            <span className={`text-sm font-bold ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                              {activityStats.byType.single_day} ({calculatePercentage(activityStats.byType.single_day, activityStats.total)}%)
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Multi Day */}
                      <div className="flex items-center space-x-3">
                        <div className="w-4 h-4 rounded-full bg-gradient-to-r from-purple-500 to-purple-600"></div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              Hoạt Động Nhiều Ngày
                            </span>
                            <span className={`text-sm font-bold ${isDarkMode ? 'text-purple-300' : 'text-purple-600'}`}>
                              {activityStats.byType.multi_day} ({calculatePercentage(activityStats.byType.multi_day, activityStats.total)}%)
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Total Activities */}
                      <div className={`mt-4 p-4 rounded-lg ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                        <div className="flex items-center justify-between">
                          <span className={`text-base font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Tổng Số Hoạt Động
                          </span>
                          <span className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {activityStats.total}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Activity Timeline Chart - Bar Chart */}
              {activityStats.byMonth.length > 0 && (
                <div className={`p-6 rounded-xl shadow-lg ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                  <h3 className={`text-lg font-semibold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Biểu Đồ Hoạt Động Theo Tháng (12 Tháng Gần Nhất)
                  </h3>
                  <div className="relative pl-8">
                    {/* Y-axis labels */}
                    <div className="absolute left-0 top-0 h-64 flex flex-col justify-between text-xs pr-2">
                      {(() => {
                        const maxCount = Math.max(...activityStats.byMonth.map(m => m.count), 1);
                        const steps = 5;
                        const stepValue = Math.ceil(maxCount / steps);
                        return Array.from({ length: steps + 1 }, (_, i) => {
                          const value = (steps - i) * stepValue;
                          return (
                            <div key={i} className={`text-right ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {value}
                            </div>
                          );
                        });
                      })()}
                    </div>
                    
                    {/* Chart Container */}
                    <div className="relative h-64 flex items-end justify-between gap-2">
                      {activityStats.byMonth.map((item, index) => {
                        const maxCount = Math.max(...activityStats.byMonth.map(m => m.count), 1);
                        const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                        const [year, month] = item.month.split('-');
                        const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('vi-VN', { month: 'short' });
                        const yearShort = year.slice(-2);
                        
                        return (
                          <div key={item.month} className="flex-1 flex flex-col items-center group">
                            {/* Bar */}
                            <div 
                              className={`w-full rounded-t-lg bg-gradient-to-t from-blue-600 via-purple-500 to-pink-500 transition-all duration-500 hover:from-blue-500 hover:via-purple-400 hover:to-pink-400 cursor-pointer relative group/bar shadow-md hover:shadow-lg`}
                              style={{ height: `${height}%`, minHeight: item.count > 0 ? '8px' : '0' }}
                              title={`${monthName}/${yearShort}: ${item.count} hoạt động`}
                            >
                              {/* Value Label on Hover */}
                              <div className={`absolute -top-10 left-1/2 transform -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 transition-opacity duration-200 ${isDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-900 text-white'} px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shadow-lg z-10`}>
                                <div className="text-center">
                                  <div className="font-bold">{item.count}</div>
                                  <div className="text-[10px] opacity-90">hoạt động</div>
                                </div>
                                {/* Arrow */}
                                <div className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full ${isDarkMode ? 'border-t-gray-700' : 'border-t-gray-900'} border-4 border-transparent`}></div>
                              </div>
                            </div>
                            {/* Month Label */}
                            <div className={`mt-3 text-xs font-medium text-center ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              {monthName}
                            </div>
                            {/* Year Label */}
                            <div className={`text-[10px] ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                              {yearShort}
                            </div>
                            {/* Count Label */}
                            <div className={`mt-1 text-xs font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              {item.count}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* X-axis label */}
                    <div className={`mt-4 text-center text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Tháng
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Summary Section */}
          <div className={`p-6 rounded-xl shadow-lg ${isDarkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700' : 'bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200'}`}>
            <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              📋 Tóm Tắt Báo Cáo
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700/50' : 'bg-white/80'}`}>
                <p className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Thời Gian Báo Cáo
                </p>
                <p className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {getDateRangeLabel()}
                </p>
              </div>
              <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700/50' : 'bg-white/80'}`}>
                <p className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Ngày Tạo Báo Cáo
                </p>
                <p className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {new Date().toLocaleDateString('vi-VN')}
                </p>
              </div>
              <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700/50' : 'bg-white/80'}`}>
                <p className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Tổng Số Dữ Liệu
                </p>
                <p className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {((userStats?.totalUsers || 0) + (activityStats?.total || 0)).toLocaleString('vi-VN')} mục
                </p>
              </div>
            </div>
          </div>
        </main>

        <Footer isDarkMode={isDarkMode} />
      </div>
    </ProtectedRoute>
  );
}

