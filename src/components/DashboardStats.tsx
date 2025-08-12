'use client';

export default function DashboardStats() {
  const stats = [
    {
      title: 'Tổng hoạt động',
      value: '24',
      change: '+12%',
      changeType: 'increase',
      icon: '🎯',
      color: 'bg-blue-500'
    },
    {
      title: 'Sinh viên tham gia',
      value: '156',
      change: '+8%',
      changeType: 'increase',
      icon: '👥',
      color: 'bg-green-500'
    },
    {
      title: 'Hoạt động đang diễn ra',
      value: '5',
      change: '-2',
      changeType: 'decrease',
      icon: '🔥',
      color: 'bg-orange-500'
    },
    {
      title: 'Điểm tích lũy TB',
      value: '8.5',
      change: '+0.3',
      changeType: 'increase',
      icon: '⭐',
      color: 'bg-purple-500'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <div key={index} className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className={`${stat.color} p-3 rounded-full`}>
              <span className="text-2xl">{stat.icon}</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{stat.title}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          </div>
          <div className="mt-4">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
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
  );
}
