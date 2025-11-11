interface QuickActionsProps {
  isDarkMode?: boolean;
}

export default function QuickActions({ isDarkMode = false }: QuickActionsProps) {
  const actions = [
    {
      title: 'Tạo hoạt động mới',
      description: 'Thêm hoạt động ngoại khóa',
      icon: '➕',
      color: 'blue',
      href: '/admin/activities/create-single/new'
    },
    {
      title: 'Quản lý sinh viên',
      description: 'Xem và chỉnh sửa thông tin',
      icon: '👥',
      color: 'green',
      href: '/admin/students'
    },
    {
      title: 'Báo cáo thống kê',
      description: 'Xem báo cáo chi tiết',
      icon: '📊',
      color: 'purple',
      href: '/admin/reports'
    },
    {
      title: 'Cài đặt hệ thống',
      description: 'Cấu hình và tùy chỉnh',
      icon: '⚙️',
      color: 'orange',
      href: '/admin/settings'
    }
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: {
        bg: isDarkMode ? 'bg-blue-600' : 'bg-blue-500',
        hover: isDarkMode ? 'hover:bg-blue-500' : 'hover:bg-blue-600',
        text: 'text-white',
        iconBg: 'bg-white/20'
      },
      green: {
        bg: isDarkMode ? 'bg-green-600' : 'bg-green-500',
        hover: isDarkMode ? 'hover:bg-green-500' : 'hover:bg-green-600',
        text: 'text-white',
        iconBg: 'bg-white/20'
      },
      purple: {
        bg: isDarkMode ? 'bg-purple-600' : 'bg-purple-500',
        hover: isDarkMode ? 'hover:bg-purple-500' : 'hover:bg-purple-600',
        text: 'text-white',
        iconBg: 'bg-white/20'
      },
      orange: {
        bg: isDarkMode ? 'bg-orange-600' : 'bg-orange-500',
        hover: isDarkMode ? 'hover:bg-orange-500' : 'hover:bg-orange-600',
        text: 'text-white',
        iconBg: 'bg-white/20'
      }
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className={`rounded-xl p-4 ${
      isDarkMode 
        ? 'bg-gray-800/50 border border-gray-700/30' 
        : 'bg-white border border-gray-200/80'
    }`}>
      <div className="mb-3">
        <h2 className={`text-sm font-semibold mb-0.5 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Thao tác nhanh
        </h2>
        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Các chức năng quản lý chính
        </p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {actions.map((action, index) => {
          const colorClasses = getColorClasses(action.color);
          return (
            <a
              key={index}
              href={action.href}
              className={`group relative rounded-lg ${colorClasses.bg} ${colorClasses.hover} ${colorClasses.text} p-3.5 transition-all duration-200 hover:shadow-md`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colorClasses.iconBg} flex-shrink-0`}>
                  <span className="text-lg">{action.icon}</span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold mb-0.5 leading-tight">
                    {action.title}
                  </h3>
                  <p className="text-xs opacity-85 leading-snug">
                    {action.description}
                  </p>
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
