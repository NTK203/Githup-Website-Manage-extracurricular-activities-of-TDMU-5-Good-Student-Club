interface DashboardStatsProps {
  isDarkMode?: boolean;
}

export default function DashboardStats({ isDarkMode = false }: DashboardStatsProps) {
  const stats = [
    {
      title: 'Tổng số sinh viên',
      value: '1,234',
      change: '+12%',
      changeType: 'increase',
      icon: '👥',
      color: 'bg-blue-500'
    },
    {
      title: 'Hoạt động đang diễn ra',
      value: '8',
      change: '+2',
      changeType: 'increase',
      icon: '🎯',
      color: 'bg-green-500'
    },
    {
      title: 'Điểm trung bình',
      value: '8.5',
      change: '+0.3',
      changeType: 'increase',
      icon: '⭐',
      color: 'bg-yellow-500'
    },
    {
      title: 'Báo cáo chờ duyệt',
      value: '5',
      change: '-2',
      changeType: 'decrease',
      icon: '📋',
      color: 'bg-purple-500'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {stats.map((stat, index) => (
        <div key={index} className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-4 sm:p-6 transition-colors duration-200`}>
          <div className="flex items-center">
            <div className={`${stat.color} p-2 sm:p-3 rounded-full`}>
              <span className="text-xl sm:text-2xl">{stat.icon}</span>
            </div>
            <div className="ml-3 sm:ml-4">
              <p className={`text-xs sm:text-sm font-medium transition-colors duration-200 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{stat.title}</p>
              <p className={`text-xl sm:text-2xl font-bold transition-colors duration-200 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stat.value}</p>
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              stat.changeType === 'increase' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {stat.change}
            </span>
            <span className={`text-xs ml-2 transition-colors duration-200 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>so với tháng trước</span>
          </div>
        </div>
      ))}
    </div>
  );
}
