'use client';

import { useState, useEffect } from 'react';
import { Users, Target, Calendar, UserCheck, TrendingUp } from 'lucide-react';

// Add CSS animations
const style = `
  @keyframes float {
    0%, 100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-8px);
    }
  }
  @keyframes pulse {
    0%, 100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.05);
    }
  }
  @keyframes rotate {
    0% {
      transform: rotate(0deg);
    }
    25% {
      transform: rotate(3deg);
    }
    50% {
      transform: rotate(0deg);
    }
    75% {
      transform: rotate(-3deg);
    }
    100% {
      transform: rotate(0deg);
    }
  }
  @keyframes blink-cyan {
    0%, 100% {
      background-color: rgba(6, 182, 212, 0.1);
      border-color: rgba(6, 182, 212, 0.3);
    }
    50% {
      background-color: rgba(6, 182, 212, 0.3);
      border-color: rgba(6, 182, 212, 0.6);
    }
  }
  @keyframes blink-orange {
    0%, 100% {
      background-color: rgba(249, 115, 22, 0.1);
      border-color: rgba(249, 115, 22, 0.3);
    }
    50% {
      background-color: rgba(249, 115, 22, 0.3);
      border-color: rgba(249, 115, 22, 0.6);
    }
  }
  @keyframes blink-pink {
    0%, 100% {
      background-color: rgba(236, 72, 153, 0.1);
      border-color: rgba(236, 72, 153, 0.3);
    }
    50% {
      background-color: rgba(236, 72, 153, 0.3);
      border-color: rgba(236, 72, 153, 0.6);
    }
  }
  @keyframes icon-blink-cyan {
    0%, 100% {
      background-color: rgba(6, 182, 212, 0.1);
    }
    50% {
      background-color: rgba(6, 182, 212, 0.25);
    }
  }
  @keyframes icon-blink-orange {
    0%, 100% {
      background-color: rgba(249, 115, 22, 0.1);
    }
    50% {
      background-color: rgba(249, 115, 22, 0.25);
    }
  }
  @keyframes icon-blink-pink {
    0%, 100% {
      background-color: rgba(236, 72, 153, 0.1);
    }
    50% {
      background-color: rgba(236, 72, 153, 0.25);
    }
  }
  .stat-card {
    animation: float 4s ease-in-out infinite;
  }
  .stat-card:nth-child(1) {
    animation-delay: 0s;
  }
  .stat-card:nth-child(2) {
    animation-delay: 0.3s;
  }
  .stat-card:nth-child(3) {
    animation-delay: 0.6s;
  }
  .stat-card-blink-cyan {
    animation: blink-cyan 2s ease-in-out infinite;
  }
  .stat-card-blink-orange {
    animation: blink-orange 2s ease-in-out infinite;
  }
  .stat-card-blink-pink {
    animation: blink-pink 2s ease-in-out infinite;
  }
  .stat-icon {
    animation: rotate 3s ease-in-out infinite;
  }
  .stat-icon:nth-child(1) {
    animation-delay: 0s;
  }
  .stat-icon:nth-child(2) {
    animation-delay: 0.5s;
  }
  .stat-icon:nth-child(3) {
    animation-delay: 1s;
  }
  .stat-icon-blink-cyan {
    animation: icon-blink-cyan 1.5s ease-in-out infinite;
  }
  .stat-icon-blink-orange {
    animation: icon-blink-orange 1.5s ease-in-out infinite;
  }
  .stat-icon-blink-pink {
    animation: icon-blink-pink 1.5s ease-in-out infinite;
  }
  .stat-value {
    animation: pulse 2s ease-in-out infinite;
  }
  .stat-value:nth-child(1) {
    animation-delay: 0s;
  }
  .stat-value:nth-child(2) {
    animation-delay: 0.4s;
  }
  .stat-value:nth-child(3) {
    animation-delay: 0.8s;
  }
  .stat-card:hover {
    animation-play-state: paused;
  }
`;

interface DashboardOverviewProps {
  isDarkMode?: boolean;
}

interface StatsData {
  totalStudents: { value: string; change: string; changeType: 'increase' | 'decrease' };
  ongoingActivities: { value: string; change: string; changeType: 'increase' | 'decrease' };
  totalActivities: { value: string; change: string; changeType: 'increase' | 'decrease' };
  totalMembers: { value: string; change: string; changeType: 'increase' | 'decrease' };
  participationStats?: {
    totalMaxParticipants: number;
    totalCurrentParticipants: number;
    participationPercentage: number;
    averageAttendanceRate: number;
  };
}

export default function DashboardOverview({ isDarkMode = false }: DashboardOverviewProps) {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/dashboard/stats', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setStats(result.data);
          }
        }
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statsConfig = stats ? [
    {
      title: 'Tổng số thành viên',
      value: stats.totalStudents.value,
      change: stats.totalStudents.change,
      changeType: stats.totalStudents.changeType,
      icon: Users,
      color: isDarkMode ? 'text-cyan-400' : 'text-cyan-600',
      bgColor: isDarkMode ? 'bg-cyan-500/10' : 'bg-cyan-50'
    },
    {
      title: 'Hoạt động đang diễn ra',
      value: stats.ongoingActivities.value,
      change: stats.ongoingActivities.change,
      changeType: stats.ongoingActivities.changeType,
      icon: Target,
      color: isDarkMode ? 'text-orange-400' : 'text-orange-600',
      bgColor: isDarkMode ? 'bg-orange-500/10' : 'bg-orange-50'
    },
    {
      title: 'Tổng số hoạt động',
      value: stats.totalActivities.value,
      change: stats.totalActivities.change,
      changeType: stats.totalActivities.changeType,
      icon: Calendar,
      color: isDarkMode ? 'text-pink-400' : 'text-pink-600',
      bgColor: isDarkMode ? 'bg-pink-500/10' : 'bg-pink-50'
    }
  ] : [];


  if (loading) {
    return (
      <div className={`rounded-lg border p-3 ${
        isDarkMode ? 'bg-gray-800/40 border-gray-700/50' : 'bg-white/70 border-gray-200'
      }`}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-32 bg-gray-300 dark:bg-gray-700 rounded"></div>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: style }} />
      <div className={`rounded-lg border transition-all duration-200 ${
        isDarkMode 
          ? 'bg-gray-800/40 border-gray-700/50' 
          : 'bg-white/80 border-gray-200'
      }`}>
        {/* Stats Section */}
        <div className="p-2 space-y-3">
          {/* Original Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {statsConfig.map((stat, index) => {
              const IconComponent = stat.icon;
              return (
              <div 
                key={index} 
                className={`stat-card group relative flex flex-col items-center justify-center text-center px-2.5 py-2.5 rounded-md transition-all duration-300 ${
                  index === 0 ? 'stat-card-blink-cyan' : index === 1 ? 'stat-card-blink-orange' : 'stat-card-blink-pink'
                } ${
                  isDarkMode 
                    ? 'border border-gray-700/50 hover:bg-gray-800/60 hover:border-gray-600 hover:shadow-xl' 
                    : 'border border-gray-200 hover:bg-white hover:border-gray-300 hover:shadow-lg'
                  }`}
              >
                {/* Icon with animation */}
                <div className={`stat-icon mb-1.5 w-8 h-8 rounded-md flex items-center justify-center ${
                  index === 0 ? 'stat-icon-blink-cyan' : index === 1 ? 'stat-icon-blink-orange' : 'stat-icon-blink-pink'
                }`}>
                    <IconComponent 
                      size={16} 
                      strokeWidth={2.5} 
                      className={stat.color}
                    />
                  </div>
                  
                  {/* Title */}
                  <p className={`text-[10px] font-medium mb-1 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {stat.title}
                  </p>
                  
                  {/* Value with animation */}
                  <div className="flex flex-col items-center gap-1">
                    <p className={`stat-value text-lg font-bold ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {stat.value}
                    </p>
                    {stat.change && (
                      <span 
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold animate-pulse ${
                        stat.changeType === 'increase' 
                          ? isDarkMode ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                          : isDarkMode ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-rose-50 text-rose-600 border border-rose-200'
                        }`}
                      >
                        {stat.change}
                      </span>
                    )}
                  </div>
                  
                  {/* Glow effect on hover */}
                  <div 
                    className={`absolute inset-0 rounded-lg transition-all duration-500 pointer-events-none ${
                      stat.changeType === 'increase' 
                        ? isDarkMode ? 'bg-emerald-500/0 group-hover:bg-emerald-500/10' : 'bg-emerald-500/0 group-hover:bg-emerald-500/10'
                        : isDarkMode ? 'bg-blue-500/0 group-hover:bg-blue-500/10' : 'bg-blue-500/0 group-hover:bg-blue-500/10'
                    }`}
                  ></div>
                </div>
              );
            })}
          </div>

          {/* Participation Stats Section */}
          {stats?.participationStats && (
            <div className={`pt-3 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <h3 className={`text-xs font-semibold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Thống kê tham gia hoạt động
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* 1. Tổng số người tối đa tham gia */}
                <div className={`stat-card group relative flex flex-col items-center justify-center text-center px-2.5 py-2.5 rounded-md transition-all duration-300 stat-card-blink-cyan ${
                  isDarkMode 
                    ? 'border border-gray-700/50 hover:bg-gray-800/60 hover:border-gray-600 hover:shadow-xl' 
                    : 'border border-gray-200 hover:bg-white hover:border-gray-300 hover:shadow-lg'
                }`}>
                  <div className="stat-icon mb-1.5 w-8 h-8 rounded-md flex items-center justify-center stat-icon-blink-cyan">
                    <Users 
                      size={16} 
                      strokeWidth={2.5} 
                      className={isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}
                    />
                  </div>
                  <p className={`text-[10px] font-medium mb-1 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Tổng số người tối đa
                  </p>
                  <div className="flex flex-col items-center gap-1">
                    <p className={`stat-value text-lg font-bold ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {stats.participationStats.totalMaxParticipants.toLocaleString('vi-VN')}
                    </p>
                    <span className={`text-[9px] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      người
                    </span>
                  </div>
                </div>

                {/* 2. Số người đang tham gia / Tổng số người tối đa */}
                <div className={`stat-card group relative flex flex-col items-center justify-center text-center px-2.5 py-2.5 rounded-md transition-all duration-300 stat-card-blink-orange ${
                  isDarkMode 
                    ? 'border border-gray-700/50 hover:bg-gray-800/60 hover:border-gray-600 hover:shadow-xl' 
                    : 'border border-gray-200 hover:bg-white hover:border-gray-300 hover:shadow-lg'
                }`}>
                  <div className="stat-icon mb-1.5 w-8 h-8 rounded-md flex items-center justify-center stat-icon-blink-orange">
                    <UserCheck 
                      size={16} 
                      strokeWidth={2.5} 
                      className={isDarkMode ? 'text-orange-400' : 'text-orange-600'}
                    />
                  </div>
                  <p className={`text-[10px] font-medium mb-1 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Đang tham gia
                  </p>
                  <div className="flex flex-col items-center gap-1">
                    <p className={`stat-value text-lg font-bold ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {stats.participationStats.totalCurrentParticipants.toLocaleString('vi-VN')}
                      <span className="text-sm font-normal mx-1">/</span>
                      {stats.participationStats.totalMaxParticipants.toLocaleString('vi-VN')}
                    </p>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                      stats.participationStats.participationPercentage >= 80
                        ? isDarkMode ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-green-50 text-green-600 border border-green-200'
                        : stats.participationStats.participationPercentage >= 50
                          ? isDarkMode ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-yellow-50 text-yellow-600 border border-yellow-200'
                          : isDarkMode ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-orange-50 text-orange-600 border border-orange-200'
                    }`}>
                      {stats.participationStats.participationPercentage}%
                    </span>
                  </div>
                </div>

                {/* 3. Phần trăm điểm danh */}
                <div className={`stat-card group relative flex flex-col items-center justify-center text-center px-2.5 py-2.5 rounded-md transition-all duration-300 stat-card-blink-pink ${
                  isDarkMode 
                    ? 'border border-gray-700/50 hover:bg-gray-800/60 hover:border-gray-600 hover:shadow-xl' 
                    : 'border border-gray-200 hover:bg-white hover:border-gray-300 hover:shadow-lg'
                }`}>
                  <div className="stat-icon mb-1.5 w-8 h-8 rounded-md flex items-center justify-center stat-icon-blink-pink">
                    <TrendingUp 
                      size={16} 
                      strokeWidth={2.5} 
                      className={isDarkMode ? 'text-pink-400' : 'text-pink-600'}
                    />
                  </div>
                  <p className={`text-[10px] font-medium mb-1 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Tỉ lệ điểm danh
                  </p>
                  <div className="flex flex-col items-center gap-1">
                    <p className={`stat-value text-lg font-bold ${
                      stats.participationStats.averageAttendanceRate >= 80
                        ? isDarkMode ? 'text-green-400' : 'text-green-600'
                        : stats.participationStats.averageAttendanceRate >= 60
                          ? isDarkMode ? 'text-yellow-400' : 'text-yellow-600'
                          : isDarkMode ? 'text-red-400' : 'text-red-600'
                    }`}>
                      {stats.participationStats.averageAttendanceRate}%
                    </p>
                    <span className={`text-[9px] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      trên {stats.participationStats.totalCurrentParticipants.toLocaleString('vi-VN')} người
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

