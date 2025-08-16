interface QuickActionsProps {
  isDarkMode?: boolean;
}

export default function QuickActions({ isDarkMode = false }: QuickActionsProps) {
  const actions = [
    {
      title: 'Tạo hoạt động mới',
      description: 'Thêm hoạt động ngoại khóa',
      icon: '➕',
      color: 'bg-blue-600',
      href: '/admin/activities/create'
    },
    {
      title: 'Quản lý sinh viên',
      description: 'Xem và chỉnh sửa thông tin',
      icon: '👥',
      color: 'bg-green-600',
      href: '/admin/students'
    },
    {
      title: 'Báo cáo thống kê',
      description: 'Xem báo cáo chi tiết',
      icon: '📊',
      color: 'bg-purple-600',
      href: '/admin/reports'
    },
    {
      title: 'Cài đặt hệ thống',
      description: 'Cấu hình và tùy chỉnh',
      icon: '⚙️',
      color: 'bg-orange-600',
      href: '/admin/settings'
    }
  ];

  return (
    <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow transition-colors duration-200`}>
      <div className={`px-4 sm:px-6 py-3 sm:py-4 border-b ${isDarkMode ? 'border-gray-600' : 'border-gray-200'} transition-colors duration-200`}>
        <h2 className={`text-base sm:text-lg font-semibold transition-colors duration-200 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Thao tác nhanh</h2>
        <p className={`text-xs sm:text-sm transition-colors duration-200 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Các chức năng quản lý chính</p>
      </div>
      <div className="p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                      {actions.map((action, index) => (
              <a
                key={index}
                href={action.href}
                className={`${action.color} text-white p-3 sm:p-4 rounded-lg hover:opacity-90 transition-opacity text-left`}
              >
                <div className="flex items-center">
                  <span className="text-xl sm:text-2xl mr-2 sm:mr-3">{action.icon}</span>
                  <div>
                    <h3 className="text-sm sm:text-base font-medium">{action.title}</h3>
                    <p className="text-xs sm:text-sm opacity-90">{action.description}</p>
                  </div>
                </div>
              </a>
            ))}
        </div>
      </div>
    </div>
  );
}
