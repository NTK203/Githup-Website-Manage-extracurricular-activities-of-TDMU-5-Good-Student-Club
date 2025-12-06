'use client';

import { useState, useEffect } from 'react';
import { Users, Target, Calendar, Activity } from 'lucide-react';

interface DashboardStatsProps {
  isDarkMode?: boolean;
  noBorder?: boolean;
}

interface StatsData {
  totalStudents: { value: string; change: string; changeType: 'increase' | 'decrease' };
  ongoingActivities: { value: string; change: string; changeType: 'increase' | 'decrease' };
  totalActivities: { value: string; change: string; changeType: 'increase' | 'decrease' };
  totalMembers: { value: string; change: string; changeType: 'increase' | 'decrease' };
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
      title: 'Tổng số thành viên',
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
      title: 'Tổng số hoạt động',
      value: stats.totalActivities.value,
      change: stats.totalActivities.change,
      changeType: stats.totalActivities.changeType,
      icon: Calendar,
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
    <div className="w-full">
      <div className="mb-2">
        <h2 className={`text-xs font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          Thống kê tổng quan
        </h2>
      </div>
      
      <div className={`flex items-center gap-3 flex-wrap ${
        isDarkMode ? 'bg-gray-800/30' : 'bg-gray-50'
      } rounded-lg p-2 border ${isDarkMode ? 'border-gray-700/50' : 'border-gray-200'}`}>
        {statsConfig.map((stat, index) => {
          const IconComponent = stat.icon;
          const isLast = index === statsConfig.length - 1;
          return (
            <div key={index} className="flex items-center gap-2 flex-1 min-w-0">
              {/* Icon */}
              <div className={`flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center ${
                isDarkMode 
                  ? 'bg-gray-700/60' 
                  : 'bg-white'
              }`}>
                <IconComponent 
                  size={16} 
                  strokeWidth={2} 
                  className={stat.iconColor}
                />
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className={`text-[11px] font-medium mb-0.5 truncate ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {stat.title}
                </p>
                <div className="flex items-baseline gap-1.5">
                  <p className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {stat.value}
                  </p>
                  {stat.change && (
                    <span 
                      className={`inline-flex items-center px-1 py-0.5 rounded text-[9px] font-semibold ${
                      stat.changeType === 'increase' 
                        ? isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
                        : isDarkMode ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-50 text-rose-600'
                    }`}
                    >
                      {stat.change}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Divider */}
              {!isLast && (
                <div className={`w-px h-10 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
