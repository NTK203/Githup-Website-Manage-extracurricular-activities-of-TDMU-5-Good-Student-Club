'use client';
import { useState, useEffect } from 'react';
import OfficerNav from '@/components/officer/OfficerNav';
import Footer from '@/components/common/Footer';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import OfficerActivityList from '@/components/officer/OfficerActivityList';
import { useAuth } from '@/hooks/useAuth';

export default function OfficerDashboard() {
  const { user } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [responsibleActivities, setResponsibleActivities] = useState<any[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [officerStats, setOfficerStats] = useState([
    {
      title: 'Hoạt động phụ trách',
      value: '8',
      change: '+2',
      changeType: 'increase',
      icon: '🎯',
      color: 'bg-green-500'
    },
    {
      title: 'Sinh viên tham gia',
      value: '89',
      change: '+12',
      changeType: 'increase',
      icon: '👥',
      color: 'bg-blue-500'
    },
    {
      title: 'Điểm danh hôm nay',
      value: '67',
      change: '85%',
      changeType: 'increase',
      icon: '✅',
      color: 'bg-orange-500'
    },
    {
      title: 'Báo cáo chờ duyệt',
      value: '3',
      change: '-1',
      changeType: 'decrease',
      icon: '📋',
      color: 'bg-purple-500'
    }
  ]);

  // Fetch activities that officer is responsible for
  const fetchResponsibleActivities = async () => {
    try {
      setLoadingActivities(true);
      
      const response = await fetch('/api/activities/officer-dashboard?page=1&limit=6', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success && data.data.activities) {
        setResponsibleActivities(data.data.activities);
      }
    } catch (error) {
      console.error('Error fetching responsible activities:', error);
    } finally {
      setLoadingActivities(false);
    }
  };

  // Fetch officer statistics
  const fetchOfficerStats = async () => {
    try {
      const response = await fetch('/api/activities/officer-dashboard?page=1&limit=1', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success && data.data.stats) {
        const stats = data.data.stats;
        setOfficerStats([
          {
            title: 'Hoạt động phụ trách',
            value: stats.totalActivities.toString(),
            change: `+${stats.activitiesThisMonth}`,
            changeType: 'increase',
            icon: '🎯',
            color: 'bg-green-500'
          },
          {
            title: 'Sinh viên tham gia',
            value: stats.totalParticipants.toString(),
            change: '0',
            changeType: 'increase',
            icon: '👥',
            color: 'bg-blue-500'
          },
          {
            title: 'Hoạt động đang diễn ra',
            value: stats.activeActivities.toString(),
            change: '0',
            changeType: 'increase',
            icon: '✅',
            color: 'bg-orange-500'
          },
          {
            title: 'Hoạt động đã hoàn thành',
            value: stats.completedActivities.toString(),
            change: '0',
            changeType: 'increase',
            icon: '📋',
            color: 'bg-purple-500'
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching officer stats:', error);
    }
  };

  // Load theme and fetch stats on component mount
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

    // Fetch officer stats and activities after a short delay to ensure user is loaded
    const timer = setTimeout(() => {
      fetchOfficerStats();
      fetchResponsibleActivities();
    }, 100);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('themeChange', handleStorageChange);
      clearTimeout(timer);
    };
  }, [user]);


  return (
    <ProtectedRoute requiredRole="CLUB_MEMBER">
      <div className={`min-h-screen flex flex-col transition-colors duration-200 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <OfficerNav />
        
        <main className="flex-1 max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
          {/* Welcome Section */}
          <div className="mb-6 sm:mb-8">
            <h1 className={`text-2xl sm:text-3xl font-bold mb-2 transition-colors duration-200 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Chào mừng, {user?.name || 'Officer'}!
            </h1>
            <p className={`text-sm sm:text-base transition-colors duration-200 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Quản lý hoạt động và điểm danh sinh viên
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
            {officerStats.map((stat, index) => (
              <div key={index} className={`rounded-xl border shadow-lg p-5 sm:p-6 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] ${
                isDarkMode ? 'bg-gray-800/60 border-gray-700/50' : 'bg-white border-gray-200/80'
              }`}>
                <div className="flex items-start justify-between mb-4">
                  <div className={`${stat.color} p-3 rounded-xl shadow-md`}>
                    <span className="text-xl sm:text-2xl">{stat.icon}</span>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                    stat.changeType === 'increase' 
                      ? isDarkMode ? 'bg-green-500/20 text-green-300' : 'bg-green-100 text-green-700'
                      : isDarkMode ? 'bg-red-500/20 text-red-300' : 'bg-red-100 text-red-700'
                  }`}>
                    {stat.change}
                  </span>
                </div>
                <div>
                  <p className={`text-xs sm:text-sm font-medium mb-1 transition-colors duration-200 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {stat.title}
                  </p>
                  <p className={`text-2xl sm:text-3xl font-extrabold transition-colors duration-200 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {stat.value}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className={`rounded-xl border shadow-lg mb-6 sm:mb-8 transition-colors duration-200 ${
            isDarkMode ? 'bg-gray-800/60 border-gray-700/50' : 'bg-white border-gray-200/80'
          }`}>
            <div className={`px-5 sm:px-6 py-4 border-b transition-colors duration-200 ${
              isDarkMode ? 'border-gray-700/50' : 'border-gray-200/80'
            }`}>
              <h2 className={`text-lg sm:text-xl font-bold mb-1 transition-colors duration-200 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Thao tác nhanh
              </h2>
              <p className={`text-xs sm:text-sm transition-colors duration-200 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Các chức năng quản lý chính
              </p>
            </div>
            <div className="p-5 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <button className={`p-4 sm:p-5 rounded-xl border transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] text-left ${
                  isDarkMode 
                    ? 'bg-gray-700/50 text-gray-200 border-gray-600/50 hover:bg-gray-700 hover:border-gray-500' 
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                }`}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl sm:text-3xl opacity-80">✅</span>
                    <div>
                      <h3 className="text-sm sm:text-base font-semibold mb-0.5">Điểm danh</h3>
                      <p className={`text-xs sm:text-sm ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        Ghi nhận tham gia
                      </p>
                    </div>
                  </div>
                </button>
                <button className={`p-4 sm:p-5 rounded-xl border transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] text-left ${
                  isDarkMode 
                    ? 'bg-gray-700/50 text-gray-200 border-gray-600/50 hover:bg-gray-700 hover:border-gray-500' 
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                }`}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl sm:text-3xl opacity-80">📊</span>
                    <div>
                      <h3 className="text-sm sm:text-base font-semibold mb-0.5">Báo cáo</h3>
                      <p className={`text-xs sm:text-sm ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        Tạo báo cáo hoạt động
                      </p>
                    </div>
                  </div>
                </button>
                <button className={`p-4 sm:p-5 rounded-xl border transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] text-left ${
                  isDarkMode 
                    ? 'bg-gray-700/50 text-gray-200 border-gray-600/50 hover:bg-gray-700 hover:border-gray-500' 
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                }`}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl sm:text-3xl opacity-80">📢</span>
                    <div>
                      <h3 className="text-sm sm:text-base font-semibold mb-0.5">Thông báo</h3>
                      <p className={`text-xs sm:text-sm ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        Gửi thông báo
                      </p>
                    </div>
                  </div>
                </button>
                <button className={`p-4 sm:p-5 rounded-xl border transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] text-left ${
                  isDarkMode 
                    ? 'bg-gray-700/50 text-gray-200 border-gray-600/50 hover:bg-gray-700 hover:border-gray-500' 
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                }`}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl sm:text-3xl opacity-80">👥</span>
                    <div>
                      <h3 className="text-sm sm:text-base font-semibold mb-0.5">Danh sách</h3>
                      <p className={`text-xs sm:text-sm ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        Xem danh sách SV
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Hoạt động phụ trách */}
          <div className={`rounded-xl border shadow-lg mb-6 sm:mb-8 transition-colors duration-200 ${
            isDarkMode ? 'bg-gray-800/60 border-gray-700/50' : 'bg-white border-gray-200/80'
          }`}>
            <div className={`px-5 sm:px-6 py-4 border-b transition-colors duration-200 ${
              isDarkMode ? 'border-gray-700/50' : 'border-gray-200/80'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className={`text-lg sm:text-xl font-bold mb-1 transition-colors duration-200 ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    🎯 Hoạt động phụ trách
                  </h2>
                  <p className={`text-xs sm:text-sm transition-colors duration-200 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Các hoạt động bạn đã được phân công phụ trách
                  </p>
                </div>
                {responsibleActivities.length > 0 && (
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    isDarkMode ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {responsibleActivities.length} hoạt động
                  </span>
                )}
              </div>
            </div>
            
            <div className="p-5 sm:p-6">
              {loadingActivities ? (
                <div className={`text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <p className="text-sm">Đang tải hoạt động...</p>
                </div>
              ) : responsibleActivities.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {responsibleActivities.map((activity) => (
                    <div
                      key={activity._id}
                      className={`group rounded-xl border overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02] cursor-pointer ${
                        isDarkMode 
                          ? 'bg-gray-800/40 border-gray-700/50' 
                          : 'bg-white border-gray-200/80'
                      }`}
                      onClick={() => window.location.href = `/officer/activities/${activity._id}`}
                    >
                      {/* Activity Image */}
                      <div className="relative w-full h-40 overflow-hidden">
                        {activity.imageUrl ? (
                          <>
                            <img 
                              src={activity.imageUrl} 
                              alt={activity.name}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const placeholder = target.nextElementSibling as HTMLElement;
                                if (placeholder) {
                                  placeholder.style.display = 'flex';
                                }
                              }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                          </>
                        ) : (
                          <div className={`w-full h-full flex items-center justify-center ${
                            isDarkMode ? 'bg-gradient-to-br from-blue-600/30 via-purple-600/30 to-pink-600/30' : 'bg-gradient-to-br from-blue-400/20 via-purple-400/20 to-pink-400/20'
                          }`}>
                            <span className="text-5xl">🎯</span>
                          </div>
                        )}
                        
                        {/* Status Badge */}
                        <div className="absolute top-3 right-3">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border backdrop-blur-sm ${
                            activity.status === 'published' 
                              ? isDarkMode ? 'bg-green-500/20 text-green-300 border-green-500/30' : 'bg-green-50 text-green-700 border-green-200'
                              : activity.status === 'ongoing'
                              ? isDarkMode ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 'bg-blue-50 text-blue-700 border-blue-200'
                              : activity.status === 'completed'
                              ? isDarkMode ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 'bg-purple-50 text-purple-700 border-purple-200'
                              : isDarkMode ? 'bg-gray-500/20 text-gray-300 border-gray-500/30' : 'bg-gray-50 text-gray-700 border-gray-200'
                          }`}>
                            {activity.status === 'published' ? '✅' : activity.status === 'ongoing' ? '🔄' : activity.status === 'completed' ? '🎉' : '📝'}
                          </span>
                        </div>

                        {/* Title */}
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <h3 className={`font-bold text-lg leading-tight drop-shadow-lg ${isDarkMode ? 'text-white' : 'text-white'}`}>
                            {activity.name}
                          </h3>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4 space-y-3">
                        {/* Người phụ trách */}
                        {activity.responsiblePerson && (
                          <div className={`p-2.5 rounded-lg border ${
                            isDarkMode ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200'
                          }`}>
                            <div className="flex items-center gap-2">
                              <span className="text-sm">🎯</span>
                              <div className="flex-1 min-w-0">
                                <p className={`text-[10px] font-semibold mb-0.5 ${isDarkMode ? 'text-amber-300' : 'text-amber-700'}`}>
                                  Người phụ trách
                                </p>
                                <p className={`text-xs font-medium truncate ${isDarkMode ? 'text-amber-200' : 'text-amber-900'}`}>
                                  {typeof activity.responsiblePerson === 'object' && activity.responsiblePerson.name 
                                    ? activity.responsiblePerson.name 
                                    : 'Người phụ trách'}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Date & Location */}
                        <div className={`p-3 rounded-lg border ${
                          isDarkMode ? 'bg-gray-700/30 border-gray-600/50' : 'bg-blue-50/50 border-blue-200/50'
                        }`}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-base">📅</span>
                            <p className={`text-xs font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              {new Date(activity.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            </p>
                          </div>
                          {activity.location && (
                            <div className="flex items-start gap-2">
                              <span className="text-sm mt-0.5">📍</span>
                              <p className={`text-xs leading-relaxed line-clamp-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                {activity.location}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Participants Count & Progress */}
                        <div className={`p-3 rounded-lg border ${
                          isDarkMode ? 'bg-gray-700/30 border-gray-600/50' : 'bg-purple-50/50 border-purple-200/50'
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-base">👥</span>
                              <span className={`text-xs font-semibold uppercase tracking-wide ${isDarkMode ? 'text-purple-300' : 'text-purple-600'}`}>
                                Tham gia
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.location.href = `/officer/activities/${activity._id}/participants`;
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                                  isDarkMode 
                                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 hover:bg-blue-500/30' 
                                    : 'bg-blue-50 text-blue-700 border border-blue-300 hover:bg-blue-100'
                                }`}
                                title="Xem danh sách người tham gia hoạt động này"
                              >
                                <span>📋</span>
                                <span className="hidden sm:inline">Danh sách</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.location.href = `/officer/attendance/${activity._id}`;
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                                  isDarkMode 
                                    ? 'bg-gray-700/50 text-gray-200 border border-gray-600/50 hover:bg-gray-700 hover:border-gray-500' 
                                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                                }`}
                              >
                                Điểm danh
                              </button>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              isDarkMode ? 'bg-purple-500/20' : 'bg-purple-100'
                            }`}>
                              <span className="text-lg">👥</span>
                            </div>
                            <div className="flex-1">
                              <p className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                {activity.participants?.length || 0} / {activity.maxParticipants || '∞'}
                              </p>
                              {activity.maxParticipants && activity.maxParticipants !== Infinity && (() => {
                                const participantCount = activity.participants?.length || 0;
                                const maxParticipants = activity.maxParticipants || Infinity;
                                const participationPercent = maxParticipants !== Infinity 
                                  ? Math.round((participantCount / maxParticipants) * 100) 
                                  : 0;
                                
                                return (
                                  <div className="mt-2">
                                    <div className="flex items-center gap-2">
                                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                                        <div 
                                          className={`h-full rounded-full transition-all duration-500 ${
                                            participationPercent >= 100 
                                              ? 'bg-red-500' 
                                              : participationPercent >= 80
                                              ? 'bg-orange-500'
                                              : 'bg-green-500'
                                          }`}
                                          style={{ width: `${Math.min(participationPercent, 100)}%` }}
                                        ></div>
                                      </div>
                                      <span className={`text-xs font-bold ${
                                        participationPercent >= 100 
                                          ? isDarkMode ? 'text-red-400' : 'text-red-600'
                                          : participationPercent >= 80
                                          ? isDarkMode ? 'text-orange-400' : 'text-orange-600'
                                          : isDarkMode ? 'text-green-400' : 'text-green-600'
                                      }`}>
                                        {participationPercent}%
                                      </span>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        </div>

                        {/* Danh sách người tham gia theo vai trò */}
                        {activity.participants && activity.participants.length > 0 && (() => {
                          // Lấy ID của người phụ trách để so sánh
                          const responsiblePersonId = typeof activity.responsiblePerson === 'object' 
                            ? activity.responsiblePerson._id?.toString() || activity.responsiblePerson.toString()
                            : activity.responsiblePerson?.toString();
                          
                          const roleGroups: { [key: string]: Array<{ userId: string; name: string; email: string; role: string; joinedAt: string; avatarUrl?: string; isResponsiblePerson?: boolean }> } = {
                            'Trưởng Nhóm': [],
                            'Phó Trưởng Nhóm': [],
                            'Thành Viên Ban Tổ Chức': [],
                            'Người Giám Sát': [],
                            'Người Tham Gia': []
                          };
                          
                          activity.participants.forEach((p: any) => {
                            // Kiểm tra xem participant này có phải là responsiblePerson không
                            const participantId = p.userId?._id?.toString() || p.userId?.toString() || p.userId;
                            const isResponsible = responsiblePersonId && participantId && participantId === responsiblePersonId;
                            
                            const participantWithFlag = {
                              ...p,
                              isResponsiblePerson: isResponsible
                            };
                            
                            if (roleGroups[p.role]) {
                              roleGroups[p.role].push(participantWithFlag);
                            } else {
                              roleGroups['Người Tham Gia'].push(participantWithFlag);
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

                          const activeRoles = Object.entries(roleGroups).filter(([_, participants]) => participants.length > 0);
                          
                          if (activeRoles.length === 0) return null;
                          
                          return (
                            <div className={`pt-3 border-t ${isDarkMode ? 'border-gray-700/50' : 'border-gray-200/80'}`}>
                              <p className={`text-xs font-semibold mb-2 flex items-center gap-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                <span>⚡</span>
                                <span>Phân quyền</span>
                              </p>
                              <div className="space-y-2">
                                {activeRoles.slice(0, 3).map(([role, participants]) => {
                                  const config = roleConfig[role] || roleConfig['Người Tham Gia'];
                                  const maxShow = 2;
                                  const toShow = participants.slice(0, maxShow);
                                  const remaining = participants.length - maxShow;
                                  
                                  return (
                                    <div key={role} className={`p-2 rounded-lg border ${config.bg} ${config.borderColor}`}>
                                      <div className="flex items-center gap-1.5 mb-1.5">
                                        <span className="text-xs">{config.icon}</span>
                                        <span className={`text-[10px] font-semibold flex-1 ${config.color}`}>
                                          {role}
                                        </span>
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${config.color} ${
                                          isDarkMode ? 'bg-white/10' : 'bg-white'
                                        }`}>
                                          {participants.length}
                                        </span>
                                      </div>
                                      <div className="space-y-1">
                                        {toShow.map((participant: any, idx: number) => (
                                          <div 
                                            key={participant.userId || idx} 
                                            className={`flex items-center gap-1.5 px-1.5 py-1 rounded transition-all duration-200 ${
                                              participant.isResponsiblePerson
                                                ? isDarkMode 
                                                  ? 'bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40' 
                                                  : 'bg-amber-50 hover:bg-amber-100 border border-amber-200'
                                                : isDarkMode 
                                                  ? 'bg-gray-700/30 hover:bg-gray-700/50' 
                                                  : 'bg-white hover:bg-gray-50'
                                            }`}
                                            title={`${participant.name}${participant.isResponsiblePerson ? ' (Người phụ trách)' : ''}`}
                                          >
                                            {participant.avatarUrl ? (
                                              <img 
                                                src={participant.avatarUrl} 
                                                alt={participant.name}
                                                className={`w-5 h-5 rounded-full object-cover border flex-shrink-0 ${
                                                  participant.isResponsiblePerson
                                                    ? 'border-amber-400 dark:border-amber-500'
                                                    : 'border-gray-300/50 dark:border-gray-600/50'
                                                }`}
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
                                              className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold border flex-shrink-0 ${
                                                participant.isResponsiblePerson
                                                  ? isDarkMode 
                                                    ? 'bg-gradient-to-br from-amber-600 to-amber-500 text-white border-amber-400' 
                                                    : 'bg-gradient-to-br from-amber-500 to-amber-600 text-white border-amber-300'
                                                  : isDarkMode 
                                                    ? 'bg-gradient-to-br from-blue-600 to-blue-500 text-white border-gray-600/50' 
                                                    : 'bg-gradient-to-br from-blue-500 to-blue-600 text-white border-gray-300/50'
                                              }`}
                                              style={{ display: participant.avatarUrl ? 'none' : 'flex' }}
                                            >
                                              {getInitials(participant.name || 'U')}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-center gap-1">
                                                <p className={`text-[10px] font-medium truncate ${
                                                  participant.isResponsiblePerson
                                                    ? isDarkMode ? 'text-amber-200' : 'text-amber-900'
                                                    : isDarkMode ? 'text-gray-200' : 'text-gray-800'
                                                }`}>
                                                  {participant.name}
                                                </p>
                                                {participant.isResponsiblePerson && (
                                                  <span className="text-[8px]">🎯</span>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                        {remaining > 0 && (
                                          <div className={`text-center py-0.5 text-[9px] font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                            +{remaining} người khác
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                                {activeRoles.length > 3 && (
                                  <div className={`text-center py-1 text-[10px] font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    +{activeRoles.length - 3} vai trò khác
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`text-center py-12 rounded-lg border-2 border-dashed ${
                  isDarkMode 
                    ? 'bg-gray-800/30 border-gray-700/50 text-gray-400' 
                    : 'bg-gray-50 border-gray-200 text-gray-500'
                }`}>
                  <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${
                    isDarkMode ? 'bg-gray-700/50' : 'bg-gray-100'
                  }`}>
                    <span className="text-3xl">🎯</span>
                  </div>
                  <p className="text-base font-semibold mb-2">Chưa có hoạt động phụ trách</p>
                  <p className="text-sm">Bạn chưa được phân công phụ trách hoạt động nào</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Activities */}
          <div className="mt-6 sm:mt-8">
            <OfficerActivityList 
              isDarkMode={isDarkMode}
              onViewActivity={(id) => {
                // Navigate to activity details
                window.location.href = `/officer/activities/${id}`;
              }}
              onAttendance={(id) => {
                // Navigate to attendance page
                window.location.href = `/officer/attendance/${id}`;
              }}
            />
          </div>
        </main>

        <Footer isDarkMode={isDarkMode} />
      </div>
    </ProtectedRoute>
  );
}
