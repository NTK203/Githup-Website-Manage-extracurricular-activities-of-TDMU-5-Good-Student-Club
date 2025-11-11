interface ActivityListProps {
  isDarkMode?: boolean;
}

export default function ActivityList({ isDarkMode = false }: ActivityListProps) {
  const activities = [
    {
      id: 1,
      title: 'Hội thảo "Phát triển kỹ năng lãnh đạo"',
      date: '2024-01-15',
      time: '14:00 - 16:00',
      location: 'Hội trường A - TDMU',
      participants: 45,
      status: 'active',
      type: 'Hội thảo',
      description: 'Chương trình đào tạo kỹ năng lãnh đạo cho sinh viên'
    },
    {
      id: 2,
      title: 'Chương trình tình nguyện "Mùa hè xanh"',
      date: '2024-01-20',
      time: '08:00 - 17:00',
      location: 'Xã Tân Thành, Huyện Tân Châu',
      participants: 32,
      status: 'upcoming',
      type: 'Tình nguyện',
      description: 'Hoạt động tình nguyện hỗ trợ cộng đồng địa phương'
    },
    {
      id: 3,
      title: 'Cuộc thi "Sinh viên 5 tốt" cấp trường',
      date: '2024-01-25',
      time: '19:00 - 21:00',
      location: 'Nhà văn hóa sinh viên',
      participants: 78,
      status: 'upcoming',
      type: 'Cuộc thi',
      description: 'Cuộc thi tìm kiếm sinh viên xuất sắc toàn diện'
    },
    {
      id: 4,
      title: 'Workshop "Kỹ năng thuyết trình"',
      date: '2024-01-10',
      time: '09:00 - 11:00',
      location: 'Phòng học A1.01',
      participants: 28,
      status: 'completed',
      type: 'Workshop',
      description: 'Đào tạo kỹ năng thuyết trình hiệu quả'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return isDarkMode ? 'bg-green-900/30 text-green-300 border-green-500/30' : 'bg-green-50 text-green-700 border-green-200';
      case 'upcoming':
        return isDarkMode ? 'bg-blue-900/30 text-blue-300 border-blue-500/30' : 'bg-blue-50 text-blue-700 border-blue-200';
      case 'completed':
        return isDarkMode ? 'bg-gray-700/50 text-gray-300 border-gray-600/50' : 'bg-gray-50 text-gray-700 border-gray-200';
      default:
        return isDarkMode ? 'bg-gray-700/50 text-gray-300 border-gray-600/50' : 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return '🟢 Đang diễn ra';
      case 'upcoming':
        return '🔵 Sắp diễn ra';
      case 'completed':
        return '✅ Đã hoàn thành';
      default:
        return '❓ Không xác định';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Hội thảo':
        return '🎤';
      case 'Tình nguyện':
        return '❤️';
      case 'Cuộc thi':
        return '🏆';
      case 'Workshop':
        return '💡';
      default:
        return '📅';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className={`${isDarkMode ? 'bg-gray-800/30' : 'bg-white/60'} rounded-xl border ${isDarkMode ? 'border-gray-700/30' : 'border-gray-200/30'} shadow-lg backdrop-blur-sm transition-all duration-300`}>
      {/* Header */}
      <div className={`px-4 py-3 border-b ${isDarkMode ? 'border-gray-700/30' : 'border-gray-200/30'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              📅 Hoạt động gần đây
            </h2>
            <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {activities.length} hoạt động ngoại khóa
            </p>
          </div>
          <button className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
            isDarkMode
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          } hover:scale-105`}>
            Xem tất cả →
          </button>
        </div>
      </div>

      {/* Activities List - Horizontal Layout */}
      <div className="p-4">
        <div className="flex space-x-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
          {activities.map((activity) => (
            <div 
              key={activity.id} 
              className={`group relative flex-shrink-0 w-72 sm:w-80 rounded-lg border transition-all duration-200 hover:shadow-lg hover:scale-105 ${
                isDarkMode 
                  ? 'bg-gray-800/40 border-gray-700/50 hover:border-gray-600/50' 
                  : 'bg-white/60 border-gray-200/50 hover:border-gray-300/50'
              } backdrop-blur-sm`}
            >
              <div className="p-4">
                {/* Header with Icon and Status */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'
                    }`}>
                      <span className="text-sm">{getTypeIcon(activity.type)}</span>
                    </div>
                    <div>
                      <h3 className={`font-semibold text-sm line-clamp-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {activity.title}
                      </h3>
                      <p className={`text-xs ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                        {activity.type}
                      </p>
                    </div>
                  </div>
                  <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(activity.status)}`}>
                    {getStatusText(activity.status)}
                  </span>
                </div>

                {/* Description */}
                <p className={`text-xs leading-relaxed mb-3 line-clamp-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  {activity.description}
                </p>

                {/* Info Grid - Horizontal */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <span className="text-xs">📅</span>
                      <span className={`text-xs font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {formatDate(activity.date)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="text-xs">🕒</span>
                      <span className={`text-xs font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {activity.time}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <span className="text-xs">👥</span>
                      <span className={`text-xs font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {activity.participants} người
                      </span>
                    </div>
                    <div className="flex items-center space-x-1 flex-1 min-w-0 ml-2">
                      <span className="text-xs">📍</span>
                      <span className={`text-xs font-medium line-clamp-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {activity.location}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-2">
                    <button className={`px-2 sm:px-3 py-1.5 rounded text-xs font-medium transition-all duration-200 ${
                      isDarkMode
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                    } hover:scale-105`}>
                      <span className="hidden sm:inline">👁️ Chi tiết</span>
                      <span className="sm:hidden">👁️</span>
                    </button>
                    <button 
                      onClick={() => window.location.href = `/admin/activities/create-single/${activity.id}`}
                      className={`px-2 sm:px-3 py-1.5 rounded text-xs font-medium transition-all duration-200 ${
                        isDarkMode
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-green-500 hover:bg-green-600 text-white'
                      } hover:scale-105`}
                    >
                      <span className="hidden sm:inline">✏️ Sửa</span>
                      <span className="sm:hidden">✏️</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className={`px-4 py-2 border-t ${isDarkMode ? 'border-gray-700/30' : 'border-gray-200/30'}`}>
        <p className={`text-xs text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Hiển thị {activities.length} hoạt động gần đây nhất
        </p>
      </div>
    </div>
  );
}
