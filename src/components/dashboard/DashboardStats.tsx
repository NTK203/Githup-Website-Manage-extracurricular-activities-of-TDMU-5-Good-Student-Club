'use client';

import { useState, useEffect } from 'react';

interface DashboardStatsProps {
  isDarkMode?: boolean;
}

interface StatsData {
  totalStudents: { value: string; change: string; changeType: 'increase' | 'decrease' };
  ongoingActivities: { value: string; change: string; changeType: 'increase' | 'decrease' };
  averageScore: { value: string; change: string; changeType: 'increase' | 'decrease' };
  pendingReports: { value: string; change: string; changeType: 'increase' | 'decrease' };
}

export default function DashboardStats({ isDarkMode = false }: DashboardStatsProps) {
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
      title: 'Tổng số sinh viên',
      value: stats.totalStudents.value,
      change: stats.totalStudents.change,
      changeType: stats.totalStudents.changeType,
      icon: '👥',
      color: 'blue',
      iconColor: isDarkMode ? 'text-blue-400' : 'text-blue-600',
      bgColor: isDarkMode ? 'bg-blue-500/10' : 'bg-blue-50',
      borderColor: isDarkMode ? 'border-blue-500/20' : 'border-blue-100'
    },
    {
      title: 'Hoạt động đang diễn ra',
      value: stats.ongoingActivities.value,
      change: stats.ongoingActivities.change,
      changeType: stats.ongoingActivities.changeType,
      icon: '🎯',
      color: 'green',
      iconColor: isDarkMode ? 'text-green-400' : 'text-green-600',
      bgColor: isDarkMode ? 'bg-green-500/10' : 'bg-green-50',
      borderColor: isDarkMode ? 'border-green-500/20' : 'border-green-100'
    },
    {
      title: 'Điểm trung bình',
      value: stats.averageScore.value,
      change: stats.averageScore.change,
      changeType: stats.averageScore.changeType,
      icon: '⭐',
      color: 'yellow',
      iconColor: isDarkMode ? 'text-yellow-400' : 'text-yellow-600',
      bgColor: isDarkMode ? 'bg-yellow-500/10' : 'bg-yellow-50',
      borderColor: isDarkMode ? 'border-yellow-500/20' : 'border-yellow-100'
    },
    {
      title: 'Báo cáo chờ duyệt',
      value: stats.pendingReports.value,
      change: stats.pendingReports.change,
      changeType: stats.pendingReports.changeType,
      icon: '📋',
      color: 'purple',
      iconColor: isDarkMode ? 'text-purple-400' : 'text-purple-600',
      bgColor: isDarkMode ? 'bg-purple-500/10' : 'bg-purple-50',
      borderColor: isDarkMode ? 'border-purple-500/20' : 'border-purple-100'
    }
  ] : [];

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div 
            key={i} 
            className={`rounded-2xl p-4 animate-pulse ${
              isDarkMode ? 'bg-gray-800/30' : 'bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-12 h-12 rounded-xl ${isDarkMode ? 'bg-gray-700/30' : 'bg-gray-200'}`}></div>
              <div className={`w-14 h-6 rounded-lg ${isDarkMode ? 'bg-gray-700/30' : 'bg-gray-200'}`}></div>
            </div>
            <div className={`h-3 w-24 rounded mb-2 ${isDarkMode ? 'bg-gray-700/30' : 'bg-gray-200'}`}></div>
            <div className={`h-8 w-20 rounded ${isDarkMode ? 'bg-gray-700/30' : 'bg-gray-200'}`}></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {statsConfig.map((stat, index) => (
        <div 
          key={index} 
          className={`group relative rounded-xl border transition-all duration-300 hover:shadow-md ${
            isDarkMode 
              ? `bg-gray-800/50 border-gray-700/30` 
              : `bg-white border-gray-200/80`
          }`}
        >
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center ${stat.iconColor}`}>
                <span className="text-lg">{stat.icon}</span>
              </div>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium ${
                stat.changeType === 'increase' 
                  ? isDarkMode ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
                  : isDarkMode ? 'bg-rose-500/15 text-rose-400' : 'bg-rose-50 text-rose-600'
              }`}>
                {stat.change}
              </span>
            </div>
            
            <div>
              <p className={`text-xs font-medium mb-1.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {stat.title}
              </p>
              <p className={`text-2xl font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {stat.value}
              </p>
              <p className={`text-[10px] ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                so với tháng trước
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
