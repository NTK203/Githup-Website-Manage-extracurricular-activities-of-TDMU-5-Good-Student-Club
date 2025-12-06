'use client';

import { useState, useEffect, useCallback } from 'react';
import OfficerNav from '@/components/officer/OfficerNav';
import Footer from '@/components/common/Footer';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import {
  Search,
  Filter,
  Calendar,
  MapPin,
  Users,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Target,
  UserCheck,
  ClipboardList,
  Zap,
  Briefcase,
  X,
  ChevronDown,
  List,
  Play,
  CalendarDays,
  CalendarRange
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
  ongoing: { label: 'Đang diễn ra', color: 'bg-green-100 text-green-700 border-green-300', icon: CheckCircle },
  completed: { label: 'Hoàn thành', color: 'bg-emerald-100 text-emerald-700 border-emerald-300', icon: CheckCircle },
  cancelled: { label: 'Đã hủy', color: 'bg-red-100 text-red-700 border-red-300', icon: XCircle },
  postponed: { label: 'Hoãn lại', color: 'bg-yellow-100 text-yellow-700 border-yellow-300', icon: Clock }
};

export default function ActivitiesManagementPage() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDarkMode, setIsDarkMode] = useState(false);

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

  const loadActivities = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) return;

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
      setLoading(false);
    }
  }, []);

  // Fetch activities when component mounts
  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  const filteredActivities = activities.filter(activity => {
    const matchesSearch = activity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         activity.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         activity.location.toLowerCase().includes(searchTerm.toLowerCase());

    let matchesStatus = statusFilter === 'all' || activity.status === statusFilter;

    // Handle upcoming filter
    if (statusFilter === 'upcoming') {
      const now = new Date();
      const activityDate = new Date(activity.date);
      matchesStatus = !isNaN(activityDate.getTime()) && activityDate > now && (activity.status === 'published' || activity.status === 'draft');
    }

    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };


  return (
    <ProtectedRoute>
      <div className={`min-h-screen transition-all duration-500 ${
        isDarkMode
          ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900'
          : 'bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30'
      }`}>
        {/* Subtle background pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(59,130,246,0.15)_1px,transparent_0)] bg-[length:20px_20px] opacity-40"></div>
        <div className="relative z-10">
          <OfficerNav />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Modern Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-baseline gap-3">
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                    Hoạt động được phân công
                  </h1>
                  <div className="px-3 py-1 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full border border-blue-200/50">
                    <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                      {activities.length} hoạt động
                    </span>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>{activities.filter(a => a.status === 'ongoing').length} đang diễn ra</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>{activities.filter(a => a.status === 'published').length} sắp diễn ra</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span>{activities.reduce((sum, activity) => sum + activity.participants.length, 0)} người tham gia</span>
                  </div>
                </div>
              </div>

              {/* Modern Refresh Button */}
              <button
                onClick={loadActivities}
                disabled={loading}
                className="group relative px-4 py-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative flex items-center gap-2">
                  <div className={`w-4 h-4 border-2 border-gray-400/50 border-t-blue-500 rounded-full transition-all duration-300 ${
                    loading ? 'animate-spin' : 'group-hover:rotate-180'
                  }`} />
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
                    {loading ? 'Đang tải...' : 'Làm mới'}
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4 mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm hoạt động..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Status Filter */}
              <div className="lg:w-48">
                <div className="relative">
                  <Filter className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white appearance-none"
                  >
                    <option value="all">Tất cả trạng thái</option>
                    <option value="draft">Bản nháp</option>
                    <option value="published">Đã xuất bản</option>
                    <option value="ongoing">Đang diễn ra</option>
                    <option value="completed">Hoàn thành</option>
                    <option value="cancelled">Đã hủy</option>
                    <option value="postponed">Hoãn lại</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 pointer-events-none" />
                </div>
              </div>

              {/* Quick Filters */}
              <div className="flex gap-2">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-2 rounded-md font-medium transition-colors ${
                    statusFilter === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200'
                  }`}
                >
                  <List size={14} />
                </button>

                <button
                  onClick={() => setStatusFilter('ongoing')}
                  className={`px-3 py-2 rounded-md font-medium transition-colors ${
                    statusFilter === 'ongoing'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200'
                  }`}
                >
                  <Play size={14} />
                </button>

                <button
                  onClick={() => setStatusFilter('upcoming')}
                  className={`px-3 py-2 rounded-md font-medium transition-colors ${
                    statusFilter === 'upcoming'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200'
                  }`}
                >
                  <Clock size={14} />
                </button>

                <button
                  onClick={() => setStatusFilter('completed')}
                  className={`px-3 py-2 rounded-md font-medium transition-colors ${
                    statusFilter === 'completed'
                      ? 'bg-gray-600 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200'
                  }`}
                >
                  <CheckCircle size={14} />
                </button>
              </div>
            </div>

            {/* Filter Summary */}
            {(searchTerm || statusFilter !== 'all') && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    Hiển thị {filteredActivities.length} hoạt động
                  </span>
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('all');
                    }}
                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                  >
                    Xóa bộ lọc
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Activities List */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="relative">
                <div className="w-12 h-12 border-3 border-blue-200 dark:border-blue-800 rounded-full animate-pulse"></div>
                <div className="absolute inset-0 w-12 h-12 border-3 border-transparent border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin"></div>
              </div>
              <p className={`mt-3 text-base font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Đang tải...
              </p>
            </div>
          ) : filteredActivities.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {filteredActivities.map((activity, index) => {
                const StatusIcon = statusConfig[activity.status].icon;
                const isCompleted = activity.status === 'completed';
                const isOngoing = activity.status === 'ongoing';
                const isPublished = activity.status === 'published';
                const activityDate = new Date(activity.date);
                const isToday = !isNaN(activityDate.getTime()) && activityDate.toDateString() === new Date().toDateString();
                const isPast = !isNaN(activityDate.getTime()) && activityDate < new Date();
                const participationRate = activity.maxParticipants
                  ? Math.round((activity.participants.length / activity.maxParticipants) * 100)
                  : 0;

                return (
                <div
                    key={activity._id}
                    className={`group relative flex flex-col h-full overflow-hidden rounded-2xl transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/10 dark:hover:shadow-purple-500/20 cursor-pointer backdrop-blur-sm transform hover:-translate-y-2 hover:scale-[1.02] ${
                        isDarkMode
                            ? `bg-gray-800/90 shadow-xl shadow-gray-900/20 ${
                                activity.type === 'multiple_days'
                                  ? 'border-2 border-purple-500/30 ring-1 ring-purple-500/10'
                                  : 'border border-gray-700/50'
                              }`
                            : `bg-white/90 shadow-xl shadow-gray-900/10 ${
                                activity.type === 'multiple_days'
                                  ? 'border-2 border-purple-400/30 ring-1 ring-purple-400/10'
                                  : 'border border-gray-200/50'
                              }`
                    }`}
                    onClick={() => window.location.href = `/officer/activities/${activity._id}`}
                >


                    <div className="flex flex-col h-full">
                      {/* Ultra Compact Status Header */}
                      <div className={`relative px-3 py-2.5 rounded-t-2xl overflow-hidden ${
                        isPast
                          ? 'bg-gradient-to-r from-slate-600 via-gray-600 to-slate-700 text-white'
                          : isOngoing
                          ? 'bg-gradient-to-r from-red-500 via-rose-500 to-red-600 text-white'
                          : 'bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 text-white'
                      }`}>
                        {/* Subtle overlay pattern */}
                        <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-transparent to-white/5" />
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(255,255,255,0.1),transparent_50%)]" />

                        <div className="relative flex items-center justify-between gap-1.5">
                          {/* Left side: Activity Type Indicator + Status */}
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            {/* Activity Type Indicator */}
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
                            
                            {/* Status Icon + Label */}
                            <div className={`p-0.5 rounded-full flex-shrink-0 ${
                              isPast
                                ? 'bg-slate-700/50'
                                : isOngoing
                                ? 'bg-red-700/50'
                                : 'bg-green-700/50'
                            }`}>
                              <StatusIcon size={11} strokeWidth={2.5} />
                            </div>
                            <span className="text-[11px] font-bold truncate flex-1">{statusConfig[activity.status].label}</span>
                          </div>

                          {/* Right side: Time indicator */}
                          <div className={`px-2 py-0.5 rounded-full text-[9px] font-semibold backdrop-blur-sm border flex-shrink-0 whitespace-nowrap ${
                            isPast
                              ? 'bg-slate-700/60 border-slate-600/50'
                              : isOngoing
                              ? 'bg-red-700/60 border-red-600/50'
                              : 'bg-green-700/60 border-green-600/50'
                          }`}>
                            {isPast ? 'Kết thúc' : isToday ? 'Hôm nay' : 'Sắp tới'}
                          </div>
                        </div>
                      </div>

                      {/* Activity Image */}
                      <div className="h-24 overflow-hidden relative bg-gray-200 dark:bg-gray-700">
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
                            <Target size={24} strokeWidth={2} className="text-gray-400 dark:text-gray-500" />
                          </div>
                        )}
                      </div>

                        {/* Modern Title Section */}
                        <div className="px-5 py-4 border-b border-gray-100/50 dark:border-gray-700/50 bg-gradient-to-r from-transparent via-gray-50/30 to-transparent dark:from-transparent dark:via-gray-800/30 dark:to-transparent">
                            <h3 className={`text-lg font-bold leading-tight line-clamp-2 transition-all duration-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:scale-105 ${
                                isDarkMode ? 'text-white' : 'text-gray-900'
                            }`}>
                                {activity.name}
                            </h3>
                        </div>

                      {/* Content - Compact height */}
                      <div className="flex-1 px-4 pb-3">
                        <p className={`text-xs leading-relaxed mb-3 line-clamp-2 ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-600'
                        }`}>
                          {activity.description}
                        </p>

                        {/* Modern Information Grid */}
                        <div className="space-y-3">
                          {/* Date & Time */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <Calendar size={14} strokeWidth={2} className={
                                isToday ? 'text-blue-500' : isPast ? 'text-red-500' : 'text-gray-400'
                              } />
                              <div className="min-w-0 flex-1">
                                <div className={`text-xs font-medium truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {(() => {
                                    const date = new Date(activity.date);
                                    return isNaN(date.getTime())
                                      ? 'Chưa cập nhật ngày'
                                      : date.toLocaleDateString('vi-VN', {
                                          day: 'numeric',
                                          month: 'short'
                                        });
                                  })()}
                                </div>
                                <div className={`text-[10px] truncate group/time relative ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  {(() => {
                                    // Nếu có timeSlots, hiển thị theo timeSlots
                                    if (activity.timeSlots && activity.timeSlots.length > 0) {
                                      const activeSlots = activity.timeSlots.filter(slot => slot.isActive);
                                      if (activeSlots.length === 1) {
                                        return `${activeSlots[0].startTime} - ${activeSlots[0].endTime}`;
                                      } else if (activeSlots.length > 1) {
                                        return `${activeSlots.length} khung giờ`;
                                      }
                                    }

                                    // Fallback: hiển thị từ activity.date
                                    const date = new Date(activity.date);
                                    return isNaN(date.getTime())
                                      ? 'Chưa cập nhật giờ'
                                      : 'Cả ngày';
                                  })()}

                                  {/* Tooltip cho nhiều timeSlots */}
                                  {(() => {
                                    if (activity.timeSlots && activity.timeSlots.length > 0) {
                                      const activeSlots = activity.timeSlots.filter(slot => slot.isActive);
                                      if (activeSlots.length > 1) {
                                        return (
                                          <div className="absolute left-0 top-full mt-1 z-50 opacity-0 invisible group-hover/time:opacity-100 group-hover/time:visible transition-all duration-200">
                                            <div className={`bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-lg max-w-xs ${isDarkMode ? 'bg-gray-800' : 'bg-gray-900'}`}>
                                              <div className="font-medium mb-2 text-blue-300">Chi tiết khung giờ:</div>
                                              <div className="space-y-1">
                                                {activeSlots.map((slot, index) => (
                                                  <div key={slot.id} className="flex justify-between items-center">
                                                    <span className="font-medium">{slot.name}:</span>
                                                    <span className="text-blue-300 ml-2">{slot.startTime} - {slot.endTime}</span>
                                                  </div>
                                                ))}
                                              </div>
                                              {activeSlots.some(slot => slot.detailedLocation) && (
                                                <div className="mt-2 pt-2 border-t border-gray-600">
                                                  <div className="text-blue-300 text-[10px]">
                                                    {activeSlots.find(slot => slot.detailedLocation)?.detailedLocation}
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      }
                                    }
                                    return null;
                                  })()}
                                </div>
                                {/* Time Slots Detail (nếu có nhiều khung giờ) */}
                                {(() => {
                                  if (activity.timeSlots && activity.timeSlots.length > 0) {
                                    const activeSlots = activity.timeSlots.filter(slot => slot.isActive);
                                    if (activeSlots.length > 1) {
                                      return (
                                        <div className="mt-1 space-y-1">
                                          {activeSlots.slice(0, 2).map((slot, index) => (
                                            <div key={slot.id} className={`text-[9px] truncate ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                              • {slot.name}: {slot.startTime} - {slot.endTime}
                                            </div>
                                          ))}
                                          {activeSlots.length > 2 && (
                                            <div className={`text-[9px] ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                              +{activeSlots.length - 2} khung giờ khác
                                            </div>
                                          )}
                                        </div>
                                      );
                                    }
                                  }
                                  return null;
                                })()}
                              </div>
                            </div>
                            <div className={`px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap ml-2 ${
                              isPast
                                ? 'bg-red-100 text-red-700'
                                : isToday
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {isPast ? 'Quá hạn' : isToday ? 'Hôm nay' : 'Sắp tới'}
                            </div>
                          </div>

                          {/* Location */}
                          <div className="flex items-center gap-2">
                            <MapPin size={14} strokeWidth={2} className="text-green-500 flex-shrink-0" />
                            <div className={`text-xs font-medium truncate flex-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              {activity.location || 'Chưa cập nhật địa điểm'}
                            </div>
                          </div>

                          {/* Responsible Person */}
                          {activity.responsiblePerson && (
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300">
                                  👤
                                </span>
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className={`text-[10px] font-medium text-amber-700 dark:text-amber-300`}>
                                  Người phụ trách
                                </div>
                                <div className={`text-xs font-semibold truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {typeof activity.responsiblePerson === 'object' && activity.responsiblePerson.name
                                    ? activity.responsiblePerson.name
                                    : 'Người phụ trách'}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Participants */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <Users size={14} strokeWidth={2} className="text-purple-500 flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <div className={`text-xs font-semibold truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {activity.participants.length}
                                  {activity.maxParticipants && (
                                    <span className={`text-xs font-normal ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                      /{activity.maxParticipants}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            {activity.maxParticipants && (
                              <div className="flex items-center gap-1.5 ml-2">
                                <div className="w-10 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
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
                        </div>
                      </div>

                      {/* Compact Action Buttons */}
                      <div className="px-3 py-2.5 border-t border-gray-100/50 dark:border-gray-700/50 bg-gradient-to-r from-gray-50/40 via-white/30 to-gray-50/40 dark:from-gray-800/40 dark:via-gray-800/20 dark:to-gray-800/40 rounded-b-2xl">
                        <div className="flex gap-2">
                          {/* View Details - Always available */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        window.location.href = `/officer/activities/${activity._id}`;
                                    }}
                                    className="group flex-1 relative py-2 px-3 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200/60 dark:border-gray-600/60 text-gray-700 dark:text-gray-200 font-semibold rounded-lg shadow-sm hover:shadow-lg hover:shadow-blue-500/20 dark:hover:shadow-blue-500/30 transition-all duration-300 hover:-translate-y-1 hover:scale-105 overflow-hidden"
                                    title="Xem chi tiết hoạt động"
                                >
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                            <div className="relative flex items-center justify-center gap-1">
                              <Eye size={12} strokeWidth={2} className="text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform duration-200" />
                              <span className="text-[10px] font-semibold hidden sm:inline">Chi tiết</span>
                            </div>
                          </button>

                          {/* Participants Management - Available for ongoing and upcoming */}
                          {(isOngoing || !isPast) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                window.location.href = `/officer/activities/${activity._id}/participants`;
                              }}
                                        className="group flex-1 relative py-2 px-3 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200/60 dark:border-gray-600/60 text-gray-700 dark:text-gray-200 font-semibold rounded-lg shadow-sm hover:shadow-lg hover:shadow-purple-500/20 dark:hover:shadow-purple-500/30 transition-all duration-300 hover:-translate-y-1 hover:scale-105 overflow-hidden"
                              title="Quản lý người tham gia"
                            >
                              <div className="absolute inset-0 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                              <div className="relative flex items-center justify-center gap-1">
                                <Users size={12} strokeWidth={2} className="text-purple-600 dark:text-purple-400 group-hover:scale-105 transition-transform duration-200" />
                                <span className="text-[10px] font-semibold hidden sm:inline">Người tham gia</span>
                              </div>
                            </button>
                          )}

                          {/* Attendance Actions - Context dependent */}
                          {isPast ? (
                            // Past activities - View attendance results
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                window.location.href = `/officer/attendance/${activity._id}`;
                              }}
                              className="group flex-1 relative py-2 px-3 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-green-200/60 dark:border-green-600/60 text-green-700 dark:text-green-400 font-semibold rounded-lg shadow-sm hover:shadow-lg hover:shadow-green-500/20 dark:hover:shadow-green-500/30 transition-all duration-300 hover:-translate-y-1 hover:scale-105 overflow-hidden"
                              title="Xem kết quả điểm danh"
                            >
                              <div className="absolute inset-0 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                              <div className="relative flex items-center justify-center gap-1">
                                <UserCheck size={12} strokeWidth={2} className="text-green-600 dark:text-green-400 group-hover:scale-105 transition-transform duration-200" />
                                <span className="text-[10px] font-semibold hidden sm:inline">Kết quả</span>
                              </div>
                            </button>
                          ) : isOngoing ? (
                            // Ongoing activities - Take attendance now
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                window.location.href = `/officer/attendance/${activity._id}`;
                              }}
                              className="group flex-1 relative py-2 px-3 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-orange-200/60 dark:border-orange-600/60 text-orange-700 dark:text-orange-400 font-semibold rounded-lg shadow-sm hover:shadow-lg hover:shadow-orange-500/20 dark:hover:shadow-orange-500/30 transition-all duration-300 hover:-translate-y-1 hover:scale-105 overflow-hidden animate-pulse"
                              title="Điểm danh ngay - Đang diễn ra"
                            >
                              <div className="absolute inset-0 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                              <div className="relative flex items-center justify-center gap-1">
                                <UserCheck size={12} strokeWidth={2} className="text-orange-600 dark:text-orange-400 group-hover:scale-105 transition-transform duration-200" />
                                <span className="text-[10px] font-semibold hidden sm:inline">Điểm danh</span>
                              </div>
                            </button>
                          ) : (
                            // Upcoming activities - Prepare attendance system
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                window.location.href = `/officer/attendance/${activity._id}`;
                              }}
                              className="group flex-1 relative py-2 px-3 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200/60 dark:border-gray-600/60 text-gray-700 dark:text-gray-200 font-semibold rounded-lg shadow-sm hover:shadow-lg hover:shadow-gray-500/20 dark:hover:shadow-gray-500/30 transition-all duration-300 hover:-translate-y-1 hover:scale-105 overflow-hidden"
                              title="Chuẩn bị hệ thống điểm danh"
                            >
                              <div className="absolute inset-0 bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                              <div className="relative flex items-center justify-center gap-1">
                                <UserCheck size={12} strokeWidth={2} className="text-gray-600 dark:text-gray-400 group-hover:scale-105 transition-transform duration-200" />
                                <span className="text-[10px] font-semibold hidden sm:inline">Chuẩn bị</span>
                              </div>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={`text-center py-8 rounded-lg border-2 border-dashed ${
              isDarkMode
                ? 'bg-gray-800/50 border-gray-700/50'
                : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="mb-4">
                <Target size={24} strokeWidth={1.5} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
              </div>
              <h3 className={`text-base font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Chưa có hoạt động được phân công
              </h3>
              <p className={`text-sm mb-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Bạn chưa được phân công phụ trách hoạt động nào.
              </p>
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredActivities.length === 0 && (
            <div className="text-center py-16">
              <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <ClipboardList className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {searchTerm || statusFilter !== 'all' ? 'Không tìm thấy hoạt động nào' : 'Chưa có hoạt động được phân công'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {searchTerm || statusFilter !== 'all' ? 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm' : 'Bạn chưa được phân công quản lý hoạt động nào'}
              </p>
            </div>
          )}
        </main>

        <Footer />

        </div>
      </div>
    </ProtectedRoute>
  );
}
