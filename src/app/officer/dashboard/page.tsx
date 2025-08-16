import ClientOnly from '@/components/common/ClientOnly';
import OfficerNav from '@/components/officer/OfficerNav';
import Footer from '@/components/common/Footer';

export default function OfficerDashboard() {
  const officerStats = [
    {
      title: 'Hoạt động phụ trách',
      value: '8',
      change: '+2',
      changeType: 'increase',
      icon: '🎯',
      color: 'bg-green-500'
    },
    {
      title: 'Sinh viên tham gia',
      value: '89',
      change: '+12',
      changeType: 'increase',
      icon: '👥',
      color: 'bg-blue-500'
    },
    {
      title: 'Điểm danh hôm nay',
      value: '67',
      change: '85%',
      changeType: 'increase',
      icon: '✅',
      color: 'bg-orange-500'
    },
    {
      title: 'Báo cáo chờ duyệt',
      value: '3',
      change: '-1',
      changeType: 'decrease',
      icon: '📋',
      color: 'bg-purple-500'
    }
  ];

  const recentActivities = [
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
    }
  ];

  return (
    <ClientOnly>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <OfficerNav />
        
        <main className="flex-1 max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
          {/* Welcome Section */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              Chào mừng, Officer!
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              Quản lý hoạt động và điểm danh sinh viên
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
            {officerStats.map((stat, index) => (
                              <div key={index} className="bg-white rounded-lg shadow p-4 sm:p-6">
                  <div className="flex items-center">
                    <div className={`${stat.color} p-2 sm:p-3 rounded-full`}>
                      <span className="text-xl sm:text-2xl">{stat.icon}</span>
                    </div>
                    <div className="ml-3 sm:ml-4">
                      <p className="text-xs sm:text-sm font-medium text-gray-600">{stat.title}</p>
                      <p className="text-xl sm:text-2xl font-bold text-gray-900">{stat.value}</p>
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
                    <span className="text-xs text-gray-500 ml-2">so với tuần trước</span>
                  </div>
                </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow mb-6 sm:mb-8">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">Thao tác nhanh</h2>
              <p className="text-xs sm:text-sm text-gray-600">Các chức năng quản lý chính</p>
            </div>
            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <button className="bg-green-600 text-white p-3 sm:p-4 rounded-lg hover:bg-green-700 transition-colors text-left">
                  <div className="flex items-center">
                    <span className="text-xl sm:text-2xl mr-2 sm:mr-3">✅</span>
                    <div>
                      <h3 className="text-sm sm:text-base font-medium">Điểm danh</h3>
                      <p className="text-xs sm:text-sm opacity-90">Ghi nhận tham gia</p>
                    </div>
                  </div>
                </button>
                <button className="bg-blue-600 text-white p-3 sm:p-4 rounded-lg hover:bg-blue-700 transition-colors text-left">
                  <div className="flex items-center">
                    <span className="text-xl sm:text-2xl mr-2 sm:mr-3">📊</span>
                    <div>
                      <h3 className="text-sm sm:text-base font-medium">Báo cáo</h3>
                      <p className="text-xs sm:text-sm opacity-90">Tạo báo cáo hoạt động</p>
                    </div>
                  </div>
                </button>
                <button className="bg-purple-600 text-white p-3 sm:p-4 rounded-lg hover:bg-purple-700 transition-colors text-left">
                  <div className="flex items-center">
                    <span className="text-xl sm:text-2xl mr-2 sm:mr-3">📢</span>
                    <div>
                      <h3 className="text-sm sm:text-base font-medium">Thông báo</h3>
                      <p className="text-xs sm:text-sm opacity-90">Gửi thông báo</p>
                    </div>
                  </div>
                </button>
                <button className="bg-orange-600 text-white p-3 sm:p-4 rounded-lg hover:bg-orange-700 transition-colors text-left">
                  <div className="flex items-center">
                    <span className="text-xl sm:text-2xl mr-2 sm:mr-3">👥</span>
                    <div>
                      <h3 className="text-sm sm:text-base font-medium">Danh sách</h3>
                      <p className="text-xs sm:text-sm opacity-90">Xem danh sách SV</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Recent Activities */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Hoạt động phụ trách</h2>
              <p className="text-sm text-gray-600">Danh sách các hoạt động bạn phụ trách</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hoạt động
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Thời gian
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tham gia
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trạng thái
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentActivities.map((activity) => (
                    <tr key={activity.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {activity.title}
                          </div>
                          <div className="text-sm text-gray-500">
                            {activity.type}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{activity.date}</div>
                        <div className="text-sm text-gray-500">{activity.time}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {activity.participants} sinh viên
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          activity.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {activity.status === 'active' ? 'Đang diễn ra' : 'Sắp diễn ra'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button className="text-blue-600 hover:text-blue-900 mr-3">
                          Điểm danh
                        </button>
                        <button className="text-green-600 hover:text-green-900">
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </ClientOnly>
  );
}
