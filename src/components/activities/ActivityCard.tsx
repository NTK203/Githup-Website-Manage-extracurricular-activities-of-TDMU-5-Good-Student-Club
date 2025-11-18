'use client';

import { useState } from 'react';
import { Calendar, MapPin, Users, Clock, Eye, Edit, Trash2, Lock, Unlock } from 'lucide-react';

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
    <div className={`group relative overflow-hidden rounded-xl border transition-all duration-300 hover:shadow-lg ${
      isDarkMode 
        ? 'bg-gray-800/90 border-gray-700/40 hover:border-blue-500/30 shadow-md' 
        : 'bg-white border-gray-200/40 hover:border-blue-400/30 shadow-sm'
    }`}>
      
      {/* Activity Image */}
      {activity.imageUrl && (
        <div className="relative h-32 overflow-hidden">
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
            <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${
              activity.visibility === 'public' 
                ? 'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-200' 
                : 'bg-orange-100 text-orange-800 dark:bg-orange-700 dark:text-orange-200'
            }`}>
              {activity.visibility === 'public' ? (
                <>
                  <Unlock size={12} />
                  Công khai
                </>
              ) : (
                <>
                  <Lock size={12} />
                  Riêng tư
                </>
              )}
            </span>
          </div>
        </div>
      )}

      {/* Content Section - Compact Layout */}
      <div className="p-4">
        <div className="flex flex-col lg:flex-row items-start space-y-4 lg:space-y-0 lg:space-x-4">
          {/* Left Side - Main Info */}
          <div className="flex-1 min-w-0 w-full lg:w-auto">
            {/* Title and Description */}
          <div className="mb-3">
            <h3 className={`text-lg font-bold mb-1.5 line-clamp-2 leading-tight ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              {activity.name}
            </h3>
            <p className={`text-sm leading-relaxed line-clamp-2 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            }`}>
              {activity.description}
            </p>
          </div>

            {/* Key Information - Compact Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              <div className={`flex items-center space-x-2 p-2 rounded-lg border transition-all duration-300 ${
                isDarkMode ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50/80 border-blue-200/50'
              }`}>
                <Calendar size={16} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} />
                <div className="flex-1 min-w-0">
                  <p className={`text-[10px] font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                    Ngày
                  </p>
                  <p className={`text-xs font-bold truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {formatDate(activity.date)}
                  </p>
                </div>
              </div>
              
              <div className={`flex items-center space-x-2 p-2 rounded-lg border transition-all duration-300 ${
                isDarkMode ? 'bg-green-500/10 border-green-500/20' : 'bg-green-50/80 border-green-200/50'
              }`}>
                <MapPin size={16} className={isDarkMode ? 'text-green-400' : 'text-green-600'} />
                <div className="flex-1 min-w-0">
                  <p className={`text-[10px] font-medium ${isDarkMode ? 'text-green-300' : 'text-green-600'}`}>
                    Địa điểm
                  </p>
                  <p className={`text-xs font-bold truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {activity.location}
                  </p>
                </div>
              </div>
              
              <div className={`flex items-center space-x-2 p-2 rounded-lg border transition-all duration-300 ${
                isDarkMode ? 'bg-purple-500/10 border-purple-500/20' : 'bg-purple-50/80 border-purple-200/50'
              }`}>
                <Users size={16} className={isDarkMode ? 'text-purple-400' : 'text-purple-600'} />
                <div className="flex-1 min-w-0">
                  <p className={`text-[10px] font-medium ${isDarkMode ? 'text-purple-300' : 'text-purple-600'}`}>
                    Tham gia
                  </p>
                  <p className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {currentParticipants}/{activity.maxParticipants}
                  </p>
                </div>
              </div>
              
              <div className={`flex items-center space-x-2 p-2 rounded-lg border transition-all duration-300 ${
                isDarkMode ? 'bg-orange-500/10 border-orange-500/20' : 'bg-orange-50/80 border-orange-200/50'
              }`}>
                <Clock size={16} className={isDarkMode ? 'text-orange-400' : 'text-orange-600'} />
                <div className="flex-1 min-w-0">
                  <p className={`text-[10px] font-medium ${isDarkMode ? 'text-orange-300' : 'text-orange-600'}`}>
                    Số buổi
                  </p>
                  <p className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {activeTimeSlots.length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Time Slots & Actions */}
          <div className="w-full lg:w-96 flex-shrink-0">

            {/* Time Slots - Compact Design */}
            {activeTimeSlots.length > 0 && (
              <div className="mb-4">
                <h4 className={`text-sm font-bold mb-2 flex items-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  <Clock size={14} className="mr-1.5" />
                  Lịch trình
                </h4>
                <div className="space-y-3">
                  {activeTimeSlots.map((slot, index) => (
                    <div key={index} className={`flex items-center justify-between p-2 rounded-lg border ${
                      isDarkMode 
                        ? 'bg-indigo-500/10 border-indigo-500/20' 
                        : 'bg-indigo-50/80 border-indigo-200/50'
                    }`}>
                      <div className="flex items-center space-x-2">
                        <span className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${
                          isDarkMode 
                            ? 'bg-indigo-500 text-white' 
                            : 'bg-indigo-500 text-white'
                        }`}>
                          {index + 1}
                        </span>
                        <div>
                          <span className={`text-xs font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {slot.name}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {slot.startTime} - {slot.endTime}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons - Compact Design */}
            <div className="flex items-center justify-end space-x-1.5">
              {onView && (
                <button
                  onClick={() => onView(activity._id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 flex items-center gap-1 ${
                    isDarkMode
                      ? 'bg-blue-600 hover:bg-blue-500 text-white'
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  <Eye size={12} />
                  Xem
                </button>
              )}
              
              {onEdit && (
                <button
                  onClick={() => onEdit(activity._id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 flex items-center gap-1 ${
                    isDarkMode
                      ? 'bg-green-600 hover:bg-green-500 text-white'
                      : 'bg-green-500 hover:bg-green-600 text-white'
                  }`}
                >
                  <Edit size={12} />
                  Sửa
                </button>
              )}
              
              {onDelete && (
                <button
                  onClick={() => onDelete(activity._id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 flex items-center gap-1 ${
                    isDarkMode
                      ? 'bg-red-600 hover:bg-red-500 text-white'
                      : 'bg-red-500 hover:bg-red-600 text-white'
                  }`}
                >
                  <Trash2 size={12} />
                  Xóa
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
