'use client';

export default function QuickActions() {
  const actions = [
    {
      title: 'Thêm hoạt động mới',
      description: 'Tạo hoạt động ngoại khóa mới',
      icon: '➕',
      color: 'bg-blue-500 hover:bg-blue-600',
      href: '/dashboard/activities/new'
    },
    {
      title: 'Quản lý sinh viên',
      description: 'Xem danh sách và thông tin sinh viên',
      icon: '👥',
      color: 'bg-green-500 hover:bg-green-600',
      href: '/dashboard/students'
    },
    {
      title: 'Báo cáo thống kê',
      description: 'Xem báo cáo chi tiết hoạt động',
      icon: '📊',
      color: 'bg-purple-500 hover:bg-purple-600',
      href: '/dashboard/reports'
    },
    {
      title: 'Cài đặt hệ thống',
      description: 'Cấu hình thông số hệ thống',
      icon: '⚙️',
      color: 'bg-gray-500 hover:bg-gray-600',
      href: '/dashboard/settings'
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Thao tác nhanh</h2>
        <p className="text-sm text-gray-600">Các chức năng quản lý chính</p>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {actions.map((action, index) => (
            <button
              key={index}
              className={`${action.color} text-white p-4 rounded-lg transition-colors duration-200 text-left`}
              onClick={() => window.location.href = action.href}
            >
              <div className="flex items-center">
                <span className="text-2xl mr-3">{action.icon}</span>
                <div>
                  <h3 className="font-medium">{action.title}</h3>
                  <p className="text-sm opacity-90">{action.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
