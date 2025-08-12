'use client';

export default function ActivityList() {
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
      participants: 28,
      status: 'upcoming',
      type: 'Cuộc thi'
    },
    {
      id: 4,
      title: 'Workshop "Kỹ năng thuyết trình"',
      date: '2024-01-10',
      time: '15:00 - 17:00',
      location: 'Phòng 101 - Khoa CNTT',
      participants: 38,
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
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Hoạt động gần đây</h2>
        <p className="text-sm text-gray-600">Danh sách các hoạt động ngoại khóa</p>
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
                Địa điểm
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
            {activities.map((activity) => (
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
                  {activity.location}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {activity.participants} sinh viên
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(activity.status)}`}>
                    {getStatusText(activity.status)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button className="text-blue-600 hover:text-blue-900 mr-3">
                    Xem chi tiết
                  </button>
                  <button className="text-green-600 hover:text-green-900">
                    Chỉnh sửa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-6 py-4 border-t border-gray-200">
        <button className="text-blue-600 hover:text-blue-900 text-sm font-medium">
          Xem tất cả hoạt động →
        </button>
      </div>
    </div>
  );
}
