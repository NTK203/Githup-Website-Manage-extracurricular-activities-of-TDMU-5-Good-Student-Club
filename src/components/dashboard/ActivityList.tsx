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
      type: 'Hội thảo'
    },
    {
      id: 2,
      title: 'Chương trình tình nguyện "Mùa hè xanh"',
      date: '2024-01-20',
      time: '08:00 - 17:00',
      location: 'Xã Tân Thành, Huyện Tân Châu',
      participants: 32,
      status: 'upcoming',
      type: 'Tình nguyện'
    },
    {
      id: 3,
      title: 'Cuộc thi "Sinh viên 5 tốt" cấp trường',
      date: '2024-01-25',
      time: '19:00 - 21:00',
      location: 'Nhà văn hóa sinh viên',
      participants: 78,
      status: 'upcoming',
      type: 'Cuộc thi'
    },
    {
      id: 4,
      title: 'Workshop "Kỹ năng thuyết trình"',
      date: '2024-01-10',
      time: '09:00 - 11:00',
      location: 'Phòng học A1.01',
      participants: 28,
      status: 'completed',
      type: 'Workshop'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'upcoming':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Đang diễn ra';
      case 'upcoming':
        return 'Sắp diễn ra';
      case 'completed':
        return 'Đã hoàn thành';
      default:
        return 'Không xác định';
    }
  };

  return (
    <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow transition-colors duration-200`}>
      <div className={`px-4 sm:px-6 py-3 sm:py-4 border-b ${isDarkMode ? 'border-gray-600' : 'border-gray-200'} transition-colors duration-200`}>
        <h2 className={`text-base sm:text-lg font-semibold transition-colors duration-200 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Hoạt động gần đây</h2>
        <p className={`text-xs sm:text-sm transition-colors duration-200 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Danh sách các hoạt động ngoại khóa</p>
      </div>
      <div className="overflow-x-auto">
        <table className={`min-w-full divide-y ${isDarkMode ? 'divide-gray-600' : 'divide-gray-200'} transition-colors duration-200`}>
          <thead className={isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}>
            <tr>
              <th className={`px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-200 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                Hoạt động
              </th>
              <th className={`hidden sm:table-cell px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-200 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                Thời gian
              </th>
              <th className={`hidden md:table-cell px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-200 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                Tham gia
              </th>
              <th className={`px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-200 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                Trạng thái
              </th>
              <th className={`px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-200 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className={`${isDarkMode ? 'bg-gray-800 divide-gray-600' : 'bg-white divide-gray-200'} transition-colors duration-200`}>
            {activities.map((activity) => (
              <tr key={activity.id} className={`transition-colors duration-200 ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                  <div>
                    <div className={`text-sm font-medium transition-colors duration-200 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {activity.title}
                    </div>
                    <div className={`text-xs sm:text-sm transition-colors duration-200 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                      {activity.type}
                    </div>
                    {/* Mobile: Show time and participants inline */}
                    <div className="sm:hidden mt-1">
                      <div className={`text-xs transition-colors duration-200 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                        📅 {activity.date} | 👥 {activity.participants} sinh viên
                      </div>
                    </div>
                  </div>
                </td>
                <td className="hidden sm:table-cell px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                  <div className={`text-sm transition-colors duration-200 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{activity.date}</div>
                  <div className={`text-sm transition-colors duration-200 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>{activity.time}</div>
                </td>
                <td className={`hidden md:table-cell px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm transition-colors duration-200 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {activity.participants} sinh viên
                </td>
                <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(activity.status)}`}>
                    {getStatusText(activity.status)}
                  </span>
                </td>
                <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex flex-col sm:flex-row gap-1 sm:gap-3">
                    <button className={`${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-900'} transition-colors duration-200 text-xs sm:text-sm`}>
                      Chi tiết
                    </button>
                    <button className={`${isDarkMode ? 'text-green-400 hover:text-green-300' : 'text-green-600 hover:text-green-900'} transition-colors duration-200 text-xs sm:text-sm`}>
                      Chỉnh sửa
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={`px-4 sm:px-6 py-3 sm:py-4 border-t ${isDarkMode ? 'border-gray-600' : 'border-gray-200'} transition-colors duration-200`}>
        <button className={`${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-900'} text-xs sm:text-sm font-medium transition-colors duration-200`}>
          Xem tất cả hoạt động →
        </button>
      </div>
    </div>
  );
}
