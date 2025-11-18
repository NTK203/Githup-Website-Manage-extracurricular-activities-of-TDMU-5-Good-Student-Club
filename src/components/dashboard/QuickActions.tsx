'use client';

import { PlusCircle, Users, BarChart3, Settings } from 'lucide-react';

interface QuickActionsProps {
  isDarkMode?: boolean;
  noBorder?: boolean;
}

export default function QuickActions({ isDarkMode = false, noBorder = false }: QuickActionsProps) {
  const actions = [
    {
      title: 'Tạo hoạt động',
      icon: PlusCircle,
      href: '/admin/activities/create-single/new',
      iconColor: isDarkMode ? 'text-blue-400' : 'text-blue-600',
      hoverBg: isDarkMode ? 'hover:bg-blue-500/10' : 'hover:bg-blue-50/50'
    },
    {
      title: 'Quản lý sinh viên',
      icon: Users,
      href: '/admin/students',
      iconColor: isDarkMode ? 'text-green-400' : 'text-green-600',
      hoverBg: isDarkMode ? 'hover:bg-green-500/10' : 'hover:bg-green-50/50'
    },
    {
      title: 'Báo cáo',
      icon: BarChart3,
      href: '/admin/reports',
      iconColor: isDarkMode ? 'text-purple-400' : 'text-purple-600',
      hoverBg: isDarkMode ? 'hover:bg-purple-500/10' : 'hover:bg-purple-50/50'
    },
    {
      title: 'Cài đặt',
      icon: Settings,
      href: '/admin/settings',
      iconColor: isDarkMode ? 'text-orange-400' : 'text-orange-600',
      hoverBg: isDarkMode ? 'hover:bg-orange-500/10' : 'hover:bg-orange-50/50'
    }
  ];

  return (
    <div 
      className={`rounded-xl p-3 flex flex-col w-full bg-transparent`}
      style={noBorder ? {} : { border: '1px solid #1e40af' }}
    >
      <div className="mb-2.5 text-center">
        <h2 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Thao tác nhanh
        </h2>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        {actions.map((action, index) => {
          const IconComponent = action.icon;
          return (
            <a
              key={index}
              href={action.href}
              className={`group relative flex flex-col items-center justify-center gap-2 rounded-lg px-3 py-3 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
                isDarkMode 
                  ? 'bg-gray-800/30 hover:bg-gray-700/40 border border-gray-700/50 hover:border-gray-600' 
                  : 'bg-white/50 hover:bg-white/70 border border-gray-200/60 hover:border-gray-300'
              } ${action.hoverBg} shadow-sm hover:shadow-md`}
            >
              <IconComponent 
                size={18} 
                strokeWidth={2.5} 
                className={action.iconColor}
              />
              <span className={`text-xs font-medium text-center leading-tight ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                {action.title}
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
