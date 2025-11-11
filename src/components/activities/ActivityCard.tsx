'use client';

import { useState } from 'react';

interface ActivityCardProps {
  activity: {
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
    locationData?: {
      lat: number;
      lng: number;
      address: string;
      radius: number;
    };
    maxParticipants: number;
    visibility: 'public' | 'private';
    responsiblePerson?: {
      name: string;
      email: string;
    };
    status: 'draft' | 'published' | 'cancelled' | 'completed';
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
  };
  isDarkMode: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onView?: (id: string) => void;
}

export default function ActivityCard({ 
  activity, 
  isDarkMode, 
  onEdit, 
  onDelete, 
  onView 
}: ActivityCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      case 'published':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-700 dark:text-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-700 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft':
        return 'Bản nháp';
      case 'published':
        return 'Đã xuất bản';
      case 'completed':
        return 'Đã hoàn thành';
      case 'cancelled':
        return 'Đã hủy';
      default:
        return status;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'single_day':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-700 dark:text-purple-200';
      case 'multiple_days':
        return 'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'single_day':
        return 'Một ngày';
      case 'multiple_days':
        return 'Nhiều ngày';
      default:
        return type;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const activeTimeSlots = activity.timeSlots.filter(slot => slot.isActive);
  const currentParticipants = activity.participants.length;

  return (
    <div className={`group relative overflow-hidden rounded-3xl border transition-all duration-500 hover:shadow-2xl hover:scale-[1.01] ${
      isDarkMode 
        ? 'bg-gradient-to-br from-gray-800/90 via-gray-800/80 to-gray-900/90 border-gray-700/40 hover:border-blue-500/30 shadow-xl' 
        : 'bg-gradient-to-br from-white/95 via-white/90 to-gray-50/95 border-gray-200/40 hover:border-blue-400/30 shadow-lg'
    } backdrop-blur-md`}>
      
      {/* Activity Image */}
      {activity.imageUrl && (
        <div className="relative h-48 overflow-hidden">
          <img
            src={activity.imageUrl}
            alt={activity.name}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
          />
          {/* Gradient overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
          
          {/* Status badges on image */}
          <div className="absolute top-4 right-4 flex flex-col space-y-2">
            <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(activity.status)}`}>
              {getStatusText(activity.status)}
            </span>
            <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getTypeColor(activity.type)}`}>
              {getTypeText(activity.type)}
            </span>
          </div>
          
          {/* Visibility indicator */}
          <div className="absolute top-4 left-4">
            <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
              activity.visibility === 'public' 
                ? 'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-200' 
                : 'bg-orange-100 text-orange-800 dark:bg-orange-700 dark:text-orange-200'
            }`}>
              {activity.visibility === 'public' ? '🔓 Công khai' : '🔒 Riêng tư'}
            </span>
          </div>
        </div>
      )}

      {/* Content Section - Harmonious Layout */}
      <div className="p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row items-start space-y-6 lg:space-y-0 lg:space-x-8">
          {/* Left Side - Main Info */}
          <div className="flex-1 min-w-0 w-full lg:w-auto">
            {/* Title and Description */}
            <div className="mb-6">
              <h3 className={`text-2xl font-bold mb-3 line-clamp-2 leading-tight ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {activity.name}
              </h3>
              <p className={`text-base leading-relaxed line-clamp-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-600'
              }`}>
                {activity.description}
              </p>
            </div>

            {/* Key Information - Elegant Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className={`flex items-center space-x-3 p-4 rounded-2xl border transition-all duration-300 hover:scale-105 ${
                isDarkMode ? 'bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/15' : 'bg-blue-50/80 border-blue-200/50 hover:bg-blue-100/80'
              }`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'
                }`}>
                  <span className="text-xl">📅</span>
                </div>
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-wide ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                    Ngày diễn ra
                  </p>
                  <p className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {formatDate(activity.date)}
                  </p>
                </div>
              </div>
              
              <div className={`flex items-center space-x-3 p-4 rounded-2xl border transition-all duration-300 hover:scale-105 ${
                isDarkMode ? 'bg-green-500/10 border-green-500/20 hover:bg-green-500/15' : 'bg-green-50/80 border-green-200/50 hover:bg-green-100/80'
              }`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  isDarkMode ? 'bg-green-500/20' : 'bg-green-100'
                }`}>
                  <span className="text-xl">📍</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold uppercase tracking-wide ${isDarkMode ? 'text-green-300' : 'text-green-600'}`}>
                    Địa điểm
                  </p>
                  <p className={`text-sm font-bold line-clamp-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {activity.location}
                  </p>
                </div>
              </div>
              
              <div className={`flex items-center space-x-3 p-4 rounded-2xl border transition-all duration-300 hover:scale-105 ${
                isDarkMode ? 'bg-purple-500/10 border-purple-500/20 hover:bg-purple-500/15' : 'bg-purple-50/80 border-purple-200/50 hover:bg-purple-100/80'
              }`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  isDarkMode ? 'bg-purple-500/20' : 'bg-purple-100'
                }`}>
                  <span className="text-xl">👥</span>
                </div>
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-wide ${isDarkMode ? 'text-purple-300' : 'text-purple-600'}`}>
                    Tham gia
                  </p>
                  <p className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {currentParticipants}/{activity.maxParticipants}
                  </p>
                </div>
              </div>
              
              <div className={`flex items-center space-x-3 p-4 rounded-2xl border transition-all duration-300 hover:scale-105 ${
                isDarkMode ? 'bg-orange-500/10 border-orange-500/20 hover:bg-orange-500/15' : 'bg-orange-50/80 border-orange-200/50 hover:bg-orange-100/80'
              }`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  isDarkMode ? 'bg-orange-500/20' : 'bg-orange-100'
                }`}>
                  <span className="text-xl">🕒</span>
                </div>
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-wide ${isDarkMode ? 'text-orange-300' : 'text-orange-600'}`}>
                    Số buổi
                  </p>
                  <p className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {activeTimeSlots.length} buổi
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Time Slots & Actions */}
          <div className="w-full lg:w-96 flex-shrink-0">

            {/* Time Slots - Elegant Design */}
            {activeTimeSlots.length > 0 && (
              <div className="mb-6">
                <h4 className={`text-lg font-bold mb-4 flex items-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  <span className="mr-2">🕒</span>
                  Lịch trình
                </h4>
                <div className="space-y-3">
                  {activeTimeSlots.map((slot, index) => (
                    <div key={index} className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 hover:scale-105 ${
                      isDarkMode 
                        ? 'bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-indigo-500/20 hover:from-indigo-500/15 hover:to-purple-500/15' 
                        : 'bg-gradient-to-r from-indigo-50/80 to-purple-50/80 border-indigo-200/50 hover:from-indigo-100/80 hover:to-purple-100/80'
                    }`}>
                      <div className="flex items-center space-x-3">
                        <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${
                          isDarkMode 
                            ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg' 
                            : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg'
                        }`}>
                          {index + 1}
                        </span>
                        <div>
                          <span className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {slot.name}
                          </span>
                          <p className={`text-xs ${isDarkMode ? 'text-indigo-300' : 'text-indigo-600'}`}>
                            Thời gian hoạt động
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {slot.startTime} - {slot.endTime}
                        </span>
                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {(() => {
                            const start = new Date(`2000-01-01T${slot.startTime}`);
                            const end = new Date(`2000-01-01T${slot.endTime}`);
                            const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                            return `${diff.toFixed(1)} giờ`;
                          })()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons - Balanced Design */}
            <div className="flex items-center justify-end space-x-2">
              {onView && (
                <button
                  onClick={() => onView(activity._id)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-300 ${
                    isDarkMode
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white shadow-md hover:shadow-lg'
                      : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white shadow-md hover:shadow-lg'
                  } hover:scale-105`}
                >
                  👁️ Xem
                </button>
              )}
              
              {onEdit && (
                <button
                  onClick={() => onEdit(activity._id)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-300 ${
                    isDarkMode
                      ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white shadow-md hover:shadow-lg'
                      : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white shadow-md hover:shadow-lg'
                  } hover:scale-105`}
                >
                  ✏️ Sửa
                </button>
              )}
              
              {onDelete && (
                <button
                  onClick={() => onDelete(activity._id)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-300 ${
                    isDarkMode
                      ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white shadow-md hover:shadow-lg'
                      : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white shadow-md hover:shadow-lg'
                  } hover:scale-105`}
                >
                  🗑️ Xóa
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
