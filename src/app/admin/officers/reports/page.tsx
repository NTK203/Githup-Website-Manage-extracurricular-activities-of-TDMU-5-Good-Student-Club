'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useDarkMode } from '@/hooks/useDarkMode';
import AdminNav from '@/components/admin/AdminNav';
import Footer from '@/components/common/Footer';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, CheckCircle, Calendar, Pause, Crown, Star, Briefcase, GraduationCap, BookOpen, Trophy, FileText, TrendingUp, Target } from 'lucide-react';

interface OfficerStats {
  totalOfficers: number;
  activeOfficers: number;
  byRole: {
    CLUB_LEADER: number;
    CLUB_DEPUTY: number;
    CLUB_MEMBER: number;
    CLUB_STUDENT: number;
    STUDENT: number;
  };
  byFaculty: Array<{
    facultyName: string;
    count: number;
  }>;
  byClass: Array<{
    className: string;
    count: number;
  }>;
  totalActivitiesByOfficers: number;
  byActivityStatus: {
    draft: number;
    published: number;
    ongoing: number;
    completed: number;
    cancelled: number;
    postponed: number;
  };
  byMonth: Array<{
    month: string;
    count: number;
  }>;
  topOfficersByActivities: Array<{
    officerId: string;
    officerName: string;
    officerRole: string;
    activitiesCount: number;
  }>;
}

export default function OfficerReportsPage() {
  const authResult = useAuth();
  const user = authResult?.user ?? null;
  const darkModeHook = useDarkMode();
  const isDarkMode = darkModeHook?.isDarkMode ?? false;
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [officerStats, setOfficerStats] = useState<OfficerStats | null>(null);
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

  // Fetch officer stats
  const fetchOfficerStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/officers/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setOfficerStats(data.data);
        } else {
          setError(data.error || 'Có lỗi xảy ra khi tải dữ liệu thống kê');
        }
      } else {
        setError('Có lỗi xảy ra khi tải dữ liệu thống kê');
      }
    } catch (err) {
      console.error('Error fetching officer stats:', err);
      setError('Có lỗi xảy ra khi tải dữ liệu thống kê');
    }
  };

  // Load stats
  useEffect(() => {
    const loadStats = async () => {
      setLoading(true);
      setError(null);
      try {
        await fetchOfficerStats();
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
      officerStats
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bao-cao-thong-ke-officer-${new Date().toISOString().split('T')[0]}.json`;
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

  // Get role display name
  const getRoleDisplayName = (role: string) => {
    const roleNames: { [key: string]: string } = {
      CLUB_LEADER: 'Chủ Nhiệm CLB',
      CLUB_DEPUTY: 'Phó Chủ Nhiệm',
      CLUB_MEMBER: 'Ủy Viên BCH'
    };
    return roleNames[role] || role;
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRole="ADMIN">
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
    <ProtectedRoute requiredRole="ADMIN">
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
          {/* Header */}
          <div className="mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Users size={20} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} />
                  <h1 className={`text-lg sm:text-xl font-bold transition-colors duration-200 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Báo Cáo Thống Kê Cán Bộ
                  </h1>
                </div>
                <p className={`text-xs transition-colors duration-200 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Xem và phân tích dữ liệu về cán bộ CLB
                </p>
              </div>
              
              {/* Date Range Selector & Export Button */}
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
                  className={`px-3 py-1.5 rounded-md border text-xs font-medium transition-all duration-200 ${
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
                  className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all duration-200 flex items-center justify-center space-x-1.5 ${
                    isDarkMode
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  } shadow-sm hover:shadow`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

          {/* Overview Stats */}
          {officerStats && (
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={18} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} />
                <h2 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Tổng Quan Cán Bộ
                </h2>
              </div>
              
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Total Officers */}
                <div className={`p-3 rounded-lg shadow-sm border transition-all duration-200 ${
                  isDarkMode ? 'bg-gray-800/50 border-gray-700 hover:bg-gray-800' : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'
                    }`}>
                      <Users size={14} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} />
                    </div>
                  </div>
                  <h3 className={`text-[11px] font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Tổng Số Cán Bộ
                  </h3>
                  <p className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {officerStats.totalOfficers || 0}
                  </p>
                </div>

                {/* Active Officers */}
                <div className={`p-3 rounded-lg shadow-sm border transition-all duration-200 ${
                  isDarkMode ? 'bg-gray-800/50 border-gray-700 hover:bg-gray-800' : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isDarkMode ? 'bg-green-500/20' : 'bg-green-100'
                    }`}>
                      <CheckCircle size={14} className={isDarkMode ? 'text-green-400' : 'text-green-600'} />
                    </div>
                  </div>
                  <h3 className={`text-[11px] font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Đang Hoạt Động
                  </h3>
                  <p className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {officerStats.activeOfficers || 0}
                  </p>
                  {officerStats.totalOfficers > 0 && (
                    <p className={`text-[10px] mt-0.5 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                      {calculatePercentage(officerStats.activeOfficers || 0, officerStats.totalOfficers)}% tổng số
                    </p>
                  )}
                </div>

                {/* Total Activities */}
                <div className={`p-3 rounded-lg shadow-sm border transition-all duration-200 ${
                  isDarkMode ? 'bg-gray-800/50 border-gray-700 hover:bg-gray-800' : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isDarkMode ? 'bg-purple-500/20' : 'bg-purple-100'
                    }`}>
                      <Calendar size={14} className={isDarkMode ? 'text-purple-400' : 'text-purple-600'} />
                    </div>
                  </div>
                  <h3 className={`text-[11px] font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Hoạt Động Đã Tạo
                  </h3>
                  <p className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {officerStats.totalActivitiesByOfficers || 0}
                  </p>
                </div>

                {/* Inactive Officers */}
                <div className={`p-3 rounded-lg shadow-sm border transition-all duration-200 ${
                  isDarkMode ? 'bg-gray-800/50 border-gray-700 hover:bg-gray-800' : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isDarkMode ? 'bg-orange-500/20' : 'bg-orange-100'
                    }`}>
                      <Pause size={14} className={isDarkMode ? 'text-orange-400' : 'text-orange-600'} />
                    </div>
                  </div>
                  <h3 className={`text-[11px] font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Không Hoạt Động
                  </h3>
                  <p className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {Math.max(0, (officerStats.totalOfficers || 0) - (officerStats.activeOfficers || 0))}
                  </p>
                  {officerStats.totalOfficers > 0 && (
                    <p className={`text-[10px] mt-0.5 ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                      {calculatePercentage(Math.max(0, (officerStats.totalOfficers || 0) - (officerStats.activeOfficers || 0)), officerStats.totalOfficers)}% tổng số
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Officer Statistics by Role */}
          {officerStats && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Target size={16} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} />
                <h2 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Phân Bố Theo Vai Trò
                </h2>
              </div>
              <div className={`p-3 rounded-lg shadow-sm border ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}>
                {/* Calculate total users for percentage calculation */}
                {(() => {
                  const totalUsers = officerStats.byRole.CLUB_LEADER + 
                                    officerStats.byRole.CLUB_DEPUTY + 
                                    officerStats.byRole.CLUB_MEMBER + 
                                    officerStats.byRole.CLUB_STUDENT + 
                                    officerStats.byRole.STUDENT;
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-2.5 mb-3">
                      {/* CLUB_LEADER */}
                      <div className="text-center">
                        <div className={`w-8 h-8 rounded-full mx-auto mb-1.5 flex items-center justify-center ${
                          isDarkMode ? 'bg-red-500/20' : 'bg-red-100'
                        }`}>
                          <Crown size={12} className={isDarkMode ? 'text-red-400' : 'text-red-600'} />
                        </div>
                        <p className={`text-lg font-bold mb-0.5 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {officerStats.byRole.CLUB_LEADER}
                        </p>
                        <p className={`text-[10px] ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Chủ Nhiệm CLB
                        </p>
                        <p className={`text-[9px] mt-0.5 ${isDarkMode ? 'text-red-300' : 'text-red-600'}`}>
                          {calculatePercentage(officerStats.byRole.CLUB_LEADER, totalUsers)}%
                        </p>
                      </div>

                      {/* CLUB_DEPUTY */}
                      <div className="text-center">
                        <div className={`w-8 h-8 rounded-full mx-auto mb-1.5 flex items-center justify-center ${
                          isDarkMode ? 'bg-orange-500/20' : 'bg-orange-100'
                        }`}>
                          <Star size={12} className={isDarkMode ? 'text-orange-400' : 'text-orange-600'} />
                        </div>
                        <p className={`text-lg font-bold mb-0.5 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {officerStats.byRole.CLUB_DEPUTY}
                        </p>
                        <p className={`text-[10px] ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Phó Chủ Nhiệm
                        </p>
                        <p className={`text-[9px] mt-0.5 ${isDarkMode ? 'text-orange-300' : 'text-orange-600'}`}>
                          {calculatePercentage(officerStats.byRole.CLUB_DEPUTY, totalUsers)}%
                        </p>
                      </div>

                      {/* CLUB_MEMBER */}
                      <div className="text-center">
                        <div className={`w-8 h-8 rounded-full mx-auto mb-1.5 flex items-center justify-center ${
                          isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'
                        }`}>
                          <Briefcase size={12} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} />
                        </div>
                        <p className={`text-lg font-bold mb-0.5 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {officerStats.byRole.CLUB_MEMBER}
                        </p>
                        <p className={`text-[10px] ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Ủy Viên BCH
                        </p>
                        <p className={`text-[9px] mt-0.5 ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                          {calculatePercentage(officerStats.byRole.CLUB_MEMBER, totalUsers)}%
                        </p>
                      </div>

                      {/* CLUB_STUDENT */}
                      <div className="text-center">
                        <div className={`w-8 h-8 rounded-full mx-auto mb-1.5 flex items-center justify-center ${
                          isDarkMode ? 'bg-green-500/20' : 'bg-green-100'
                        }`}>
                          <Users size={12} className={isDarkMode ? 'text-green-400' : 'text-green-600'} />
                        </div>
                        <p className={`text-lg font-bold mb-0.5 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {officerStats.byRole.CLUB_STUDENT}
                        </p>
                        <p className={`text-[10px] ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Thành viên CLB
                        </p>
                        <p className={`text-[9px] mt-0.5 ${isDarkMode ? 'text-green-300' : 'text-green-600'}`}>
                          {calculatePercentage(officerStats.byRole.CLUB_STUDENT, totalUsers)}%
                        </p>
                      </div>

                      {/* STUDENT */}
                      <div className="text-center">
                        <div className={`w-8 h-8 rounded-full mx-auto mb-1.5 flex items-center justify-center ${
                          isDarkMode ? 'bg-purple-500/20' : 'bg-purple-100'
                        }`}>
                          <GraduationCap size={12} className={isDarkMode ? 'text-purple-400' : 'text-purple-600'} />
                        </div>
                        <p className={`text-lg font-bold mb-0.5 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {officerStats.byRole.STUDENT}
                        </p>
                        <p className={`text-[10px] ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Sinh viên
                        </p>
                        <p className={`text-[9px] mt-0.5 ${isDarkMode ? 'text-purple-300' : 'text-purple-600'}`}>
                          {calculatePercentage(officerStats.byRole.STUDENT, totalUsers)}%
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {/* Pie Chart for Role Distribution */}
                <div className="mt-3">
                  {(() => {
                    const totalUsers = officerStats.byRole.CLUB_LEADER + 
                                      officerStats.byRole.CLUB_DEPUTY + 
                                      officerStats.byRole.CLUB_MEMBER + 
                                      officerStats.byRole.CLUB_STUDENT + 
                                      officerStats.byRole.STUDENT;
                    const pieData = [
                      { name: 'Chủ Nhiệm CLB', value: officerStats.byRole.CLUB_LEADER },
                      { name: 'Phó Chủ Nhiệm', value: officerStats.byRole.CLUB_DEPUTY },
                      { name: 'Ủy Viên BCH', value: officerStats.byRole.CLUB_MEMBER },
                      { name: 'Thành viên CLB', value: officerStats.byRole.CLUB_STUDENT },
                      { name: 'Sinh viên', value: officerStats.byRole.STUDENT }
                    ].filter(item => item.value > 0);
                    
                    const colors = ['#ef4444', '#f97316', '#3b82f6', '#22c55e', '#a855f7'];
                    
                    return (
                      <div className="w-full h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={pieData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={(entry: any) => {
                                const percent = Number(entry.value) / Number(totalUsers) * 100;
                                return percent >= 5 ? `${percent.toFixed(1)}%` : '';
                              }}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{
                                backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                                border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                                borderRadius: '8px',
                                color: isDarkMode ? '#ffffff' : '#111827'
                              }}
                              formatter={(value: number, name: string, props: any) => {
                                const percentage = ((Number(value) / Number(totalUsers)) * 100).toFixed(1);
                                return [`${value} (${percentage}%)`, name];
                              }}
                            />
                            <Legend 
                              wrapperStyle={{ color: isDarkMode ? '#ffffff' : '#111827', fontSize: '12px' }}
                              formatter={(value: string) => {
                                const entry = pieData.find(e => e.name === value);
                                const percentage = entry ? ((entry.value / totalUsers) * 100).toFixed(1) : '0';
                                return `${value} (${entry?.value || 0} - ${percentage}%)`;
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* Statistics by Faculty and Class */}
          {officerStats && (officerStats.byFaculty.length > 0 || officerStats.byClass.length > 0) && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen size={16} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} />
                <h2 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Phân Bố Theo Khoa/Viện và Lớp
                </h2>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* By Faculty - Bar Chart */}
                {officerStats.byFaculty.length > 0 && (
                  <div className={`p-3 rounded-lg shadow-sm border ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <GraduationCap size={14} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} />
                      <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        Phân Bố Theo Khoa/Viện
                      </h3>
                    </div>
                    <div className="w-full h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart 
                          data={officerStats.byFaculty.map(item => ({
                            name: item.facultyName || 'Chưa có',
                            value: item.count,
                            percentage: calculatePercentage(item.count, officerStats.totalOfficers)
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
                              `${value} cán bộ (${props.payload.percentage}%)`,
                              'Số lượng'
                            ]}
                          />
                          <Bar dataKey="value" fill="#8884d8" radius={[4, 4, 0, 0]}>
                            {officerStats.byFaculty.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={`hsl(${(index * 137.5) % 360}, 70%, 50%)`} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* By Class - Bar Chart */}
                {officerStats.byClass.length > 0 && (
                  <div className={`p-3 rounded-lg shadow-sm border ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <BookOpen size={14} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} />
                      <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        Phân Bố Theo Lớp (Top 10)
                      </h3>
                    </div>
                    <div className="w-full h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart 
                          data={officerStats.byClass.map(item => ({
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
                            formatter={(value: number) => [`${value} cán bộ`, 'Số lượng']}
                          />
                          <Bar dataKey="value" fill="#8884d8" radius={[4, 4, 0, 0]}>
                            {officerStats.byClass.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={`hsl(${(index * 60) % 360}, 70%, 50%)`} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Activity Statistics */}
          {officerStats && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={16} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} />
                <h2 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Thống Kê Hoạt Động Của Cán Bộ
                </h2>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
                {/* Activity Status Distribution - Pie Chart */}
                <div className={`p-3 rounded-lg shadow-sm border ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}>
                  <h3 className={`text-sm font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Phân Bố Theo Trạng Thái
                  </h3>
                  <div className="w-full h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={Object.entries(officerStats.byActivityStatus)
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
                                percentage: calculatePercentage(count, officerStats.totalActivitiesByOfficers)
                              };
                            })}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry: any) => {
                            const percent = typeof entry.percentage === 'number' ? entry.percentage : parseFloat(entry.percentage) || 0;
                            return percent >= 5 ? `${percent.toFixed(1)}%` : '';
                          }}
                          outerRadius={60}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {Object.entries(officerStats.byActivityStatus)
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
                          wrapperStyle={{ color: isDarkMode ? '#ffffff' : '#111827' }}
                          formatter={(value: string, entry: any) => {
                            const percentage = entry.payload?.percentage || 0;
                            return `${value} (${entry.payload?.value || 0} - ${percentage}%)`;
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Top Officers by Activities */}
                <div className={`p-3 rounded-lg shadow-sm border ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy size={14} className={isDarkMode ? 'text-yellow-400' : 'text-yellow-600'} />
                    <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Top 10 Cán Bộ Tạo Nhiều Hoạt Động Nhất
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {officerStats.topOfficersByActivities.length > 0 ? (
                      officerStats.topOfficersByActivities.map((officer, index) => (
                        <div
                          key={officer.officerId}
                          className={`p-2 rounded-md transition-all duration-200 ${
                            isDarkMode ? 'bg-gray-700/30 hover:bg-gray-700/50' : 'bg-gray-50 hover:bg-gray-100'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${
                                index === 0 ? (isDarkMode ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700') :
                                index === 1 ? (isDarkMode ? 'bg-gray-400/20 text-gray-300' : 'bg-gray-200 text-gray-600') :
                                index === 2 ? (isDarkMode ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-700') :
                                (isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700')
                              }`}>
                                {index + 1}
                              </div>
                              <div>
                                <p className={`text-xs font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {officer.officerName}
                                </p>
                                <p className={`text-[10px] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  {getRoleDisplayName(officer.officerRole)}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                {officer.activitiesCount}
                              </p>
                              <p className={`text-[9px] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                hoạt động
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className={`text-xs text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Chưa có dữ liệu
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Officers by Month */}
          {officerStats && officerStats.byMonth.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={16} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} />
                <h2 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Biểu Đồ Cán Bộ Theo Tháng (12 Tháng Gần Nhất)
                </h2>
              </div>
              <div className={`p-3 rounded-lg shadow-sm border ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className="w-full h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={officerStats.byMonth.map(item => {
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
                        tick={{ fill: isDarkMode ? '#9ca3af' : '#6b7280', fontSize: 11 }}
                      />
                      <YAxis 
                        tick={{ fill: isDarkMode ? '#9ca3af' : '#6b7280', fontSize: 11 }}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                          border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                          borderRadius: '8px',
                          color: isDarkMode ? '#ffffff' : '#111827'
                        }}
                        formatter={(value: number) => [`${value} cán bộ`, 'Số lượng']}
                      />
                      <Bar dataKey="value" fill="#8884d8" radius={[4, 4, 0, 0]}>
                        {officerStats.byMonth.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={`hsl(${(index * 30) % 360}, 70%, 50%)`} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Summary Section */}
          <div className={`p-3 rounded-lg shadow-sm border ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-2 mb-2">
              <FileText size={14} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} />
              <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Tóm Tắt Báo Cáo
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              <div className={`p-2.5 rounded-md ${isDarkMode ? 'bg-gray-700/30' : 'bg-gray-50'}`}>
                <p className={`text-[10px] font-medium mb-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Thời Gian Báo Cáo
                </p>
                <p className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {getDateRangeLabel()}
                </p>
              </div>
              <div className={`p-2.5 rounded-md ${isDarkMode ? 'bg-gray-700/30' : 'bg-gray-50'}`}>
                <p className={`text-[10px] font-medium mb-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Ngày Tạo Báo Cáo
                </p>
                <p className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {new Date().toLocaleDateString('vi-VN')}
                </p>
              </div>
              <div className={`p-2.5 rounded-md ${isDarkMode ? 'bg-gray-700/30' : 'bg-gray-50'}`}>
                <p className={`text-[10px] font-medium mb-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Tổng Số Cán Bộ
                </p>
                <p className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {officerStats?.totalOfficers || 0} cán bộ
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

