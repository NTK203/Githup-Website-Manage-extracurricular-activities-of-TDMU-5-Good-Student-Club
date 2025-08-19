import ClientOnly from '@/components/common/ClientOnly';
import StudentNav from '@/components/student/StudentNav';
import Footer from '@/components/common/Footer';
import ProtectedRoute from '@/components/common/ProtectedRoute';

export default function StudentDashboard() {
  const studentStats = [
    {
      title: 'Hoạt động đã tham gia',
      value: '12',
      change: '+3',
      changeType: 'increase',
      icon: '🎯',
      color: 'bg-purple-500'
    },
    {
      title: 'Điểm tích lũy',
      value: '8.5',
      change: '+0.5',
      changeType: 'increase',
      icon: '⭐',
      color: 'bg-yellow-500'
    },
    {
      title: 'Hoạt động đang đăng ký',
      value: '2',
      change: '+1',
      changeType: 'increase',
      icon: '📝',
      color: 'bg-blue-500'
    },
    {
      title: 'Thông báo mới',
      value: '5',
      change: '+2',
      changeType: 'increase',
      icon: '📢',
      color: 'bg-red-500'
    }
  ];

  const availableActivities = [
    {
      id: 1,
      title: 'Hội thảo "Phát triển kỹ năng lãnh đạo"',
      date: '2024-01-15',
      time: '14:00 - 16:00',
      location: 'Hội trường A - TDMU',
      points: 2.0,
      status: 'open',
      type: 'Hội thảo'
    },
    {
      id: 2,
      title: 'Chương trình tình nguyện "Mùa hè xanh"',
      date: '2024-01-20',
      time: '08:00 - 17:00',
      location: 'Xã Tân Thành, Huyện Tân Châu',
      points: 3.0,
      status: 'open',
      type: 'Tình nguyện'
    },
    {
      id: 3,
      title: 'Cuộc thi "Sinh viên 5 tốt" cấp trường',
      date: '2024-01-25',
      time: '19:00 - 21:00',
      location: 'Nhà văn hóa sinh viên',
      points: 5.0,
      status: 'open',
      type: 'Cuộc thi'
    }
  ];

  const recentParticipations = [
    {
      id: 1,
      title: 'Workshop "Kỹ năng thuyết trình"',
      date: '2024-01-10',
      points: 1.5,
      status: 'completed'
    },
    {
      id: 2,
      title: 'Chương trình "Hiến máu nhân đạo"',
      date: '2024-01-05',
      points: 2.0,
      status: 'completed'
    }
  ];

  return (
    <ClientOnly>
      <ProtectedRoute requiredRole="STUDENT">
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <StudentNav />
          
          <main className="flex-1 max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
          {/* Welcome Section */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              Chào mừng, Nguyễn Văn A!
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              Khám phá và tham gia các hoạt động ngoại khóa thú vị
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
            {studentStats.map((stat, index) => (
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
                    <span className="text-xs text-gray-500 ml-2">so với tháng trước</span>
                  </div>
                </div>
            ))}
          </div>

          {/* Available Activities */}
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Hoạt động đang mở đăng ký</h2>
              <p className="text-sm text-gray-600">Đăng ký tham gia để tích lũy điểm</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableActivities.map((activity) => (
                  <div key={activity.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {activity.type}
                      </span>
                      <span className="text-sm font-medium text-purple-600">
                        ⭐ {activity.points} điểm
                      </span>
                    </div>
                    <h3 className="font-medium text-gray-900 mb-2">{activity.title}</h3>
                    <div className="space-y-1 text-sm text-gray-600 mb-4">
                      <p>📅 {activity.date}</p>
                      <p>🕒 {activity.time}</p>
                      <p>📍 {activity.location}</p>
                    </div>
                    <button className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 transition-colors">
                      Đăng ký tham gia
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Participations */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Hoạt động đã tham gia</h2>
              <p className="text-sm text-gray-600">Lịch sử tham gia hoạt động</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hoạt động
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ngày tham gia
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Điểm nhận được
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trạng thái
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentParticipations.map((participation) => (
                    <tr key={participation.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {participation.title}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {participation.date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          ⭐ {participation.points} điểm
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          Hoàn thành
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-gray-200">
              <button className="text-purple-600 hover:text-purple-900 text-sm font-medium">
                Xem tất cả hoạt động đã tham gia →
              </button>
            </div>
          </div>
        </main>

        <Footer />
      </div>
      </ProtectedRoute>
    </ClientOnly>
  );
}
