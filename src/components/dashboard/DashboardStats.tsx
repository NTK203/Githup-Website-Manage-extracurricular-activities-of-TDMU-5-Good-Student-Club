'use client';

import { useState, useEffect } from 'react';
import { Users, Target, Star, ClipboardList } from 'lucide-react';

interface DashboardStatsProps {
  isDarkMode?: boolean;
  noBorder?: boolean;
}

interface StatsData {
  totalStudents: { value: string; change: string; changeType: 'increase' | 'decrease' };
  ongoingActivities: { value: string; change: string; changeType: 'increase' | 'decrease' };
  averageScore: { value: string; change: string; changeType: 'increase' | 'decrease' };
  pendingReports: { value: string; change: string; changeType: 'increase' | 'decrease' };
}

export default function DashboardStats({ isDarkMode = false, noBorder = false }: DashboardStatsProps) {
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
      icon: Users,
      iconColor: isDarkMode ? 'text-blue-400' : 'text-blue-600',
      hoverBg: isDarkMode ? 'hover:bg-blue-500/10' : 'hover:bg-blue-50/50'
    },
    {
      title: 'Hoạt động đang diễn ra',
      value: stats.ongoingActivities.value,
      change: stats.ongoingActivities.change,
      changeType: stats.ongoingActivities.changeType,
      icon: Target,
      iconColor: isDarkMode ? 'text-green-400' : 'text-green-600',
      hoverBg: isDarkMode ? 'hover:bg-green-500/10' : 'hover:bg-green-50/50'
    },
    {
      title: 'Điểm trung bình',
      value: stats.averageScore.value,
      change: stats.averageScore.change,
      changeType: stats.averageScore.changeType,
      icon: Star,
      iconColor: isDarkMode ? 'text-yellow-400' : 'text-yellow-600',
      hoverBg: isDarkMode ? 'hover:bg-yellow-500/10' : 'hover:bg-yellow-50/50'
    },
    {
      title: 'Báo cáo chờ duyệt',
      value: stats.pendingReports.value,
      change: stats.pendingReports.change,
      changeType: stats.pendingReports.changeType,
      icon: ClipboardList,
      iconColor: isDarkMode ? 'text-purple-400' : 'text-purple-600',
      hoverBg: isDarkMode ? 'hover:bg-purple-500/10' : 'hover:bg-purple-50/50'
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
    <div 
      className={`rounded-xl p-3 flex flex-col w-full bg-transparent`}
      style={noBorder ? {} : { border: '1px solid #1e40af' }}
    >
      <div className="mb-2.5 text-center">
        <h2 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Thống kê tổng quan
        </h2>
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {statsConfig.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
          <div 
            key={index} 
            className={`group relative rounded-lg transition-all duration-200 flex flex-col ${
              isDarkMode 
                ? 'bg-gray-800/30 hover:bg-gray-700/40 border border-gray-700/50 hover:border-gray-600' 
                : 'bg-white/50 hover:bg-white/70 border border-gray-200/60 hover:border-gray-300'
            } ${stat.hoverBg} shadow-sm hover:shadow-md`}
          >
            <div className="p-3 flex flex-col flex-1 justify-center">
              <div className="flex items-center justify-center mb-2">
                <IconComponent 
                  size={20} 
                  strokeWidth={2.5} 
                  className={stat.iconColor}
                />
              </div>
              
              <div className="text-center space-y-1">
                <p className={`text-[10px] font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  {stat.title}
                </p>
                <p className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {stat.value}
                </p>
                <div className="flex flex-col items-center justify-center gap-0.5">
                  <span className={`text-[9px] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    so với tháng trước
                  </span>
                  <span 
                    className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-semibold ${
                    stat.changeType === 'increase' 
                      ? isDarkMode ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : isDarkMode ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                  >
                    {stat.change}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )})}
      </div>
    </div>
  );
}
