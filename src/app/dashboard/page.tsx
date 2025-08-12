import ClientOnly from '@/components/ClientOnly';
import DashboardStats from '@/components/DashboardStats';
import ActivityList from '@/components/ActivityList';
import QuickActions from '@/components/QuickActions';

export default function Dashboard() {
  return (
    <ClientOnly>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Dashboard Admin
                </h1>
                <p className="text-sm text-gray-600">
                  CLB Sinh viên 5 Tốt TDMU - Quản lý hoạt động ngoại khóa
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">Admin</p>
                  <p className="text-xs text-gray-500">admin@tdmu.edu.vn</p>
                </div>
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">A</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats Cards */}
          <DashboardStats />

          {/* Quick Actions */}
          <div className="mt-8">
            <QuickActions />
          </div>

          {/* Recent Activities */}
          <div className="mt-8">
            <ActivityList />
          </div>
        </main>
      </div>
    </ClientOnly>
  );
}
