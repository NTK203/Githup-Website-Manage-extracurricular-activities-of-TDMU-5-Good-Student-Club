'use client';

import { useState, useEffect } from 'react';
import AdminNav from '@/components/admin/AdminNav';
import Footer from '@/components/common/Footer';
import DashboardStats from '@/components/dashboard/DashboardStats';
import ActivityList from '@/components/activities/ActivityList';
import QuickActions from '@/components/dashboard/QuickActions';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);

  // Handler functions for activities
  const handleEditActivity = (id: string) => {
    window.location.href = `/admin/activities/create-single/${id}`;
  };

  const handleDeleteActivity = async (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa hoạt động này?')) {
      try {
        const response = await fetch(`/api/activities/${id}`, {
          method: 'DELETE',
        });
        
        if (response.ok) {
          alert('✅ Đã xóa hoạt động thành công!');
          // Refresh the page to update the list
          window.location.reload();
        } else {
          alert('❌ Có lỗi xảy ra khi xóa hoạt động');
        }
      } catch (error) {
        console.error('Error deleting activity:', error);
        alert('❌ Có lỗi xảy ra khi xóa hoạt động');
      }
    }
  };

  const handleViewActivity = (id: string) => {
    window.location.href = `/admin/activities/view/${id}`;
  };

  // Check if desktop
  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  // Load theme and sidebar state from localStorage on component mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
    }

    const savedSidebarState = localStorage.getItem('sidebarOpen');
    if (savedSidebarState !== null) {
      setIsSidebarOpen(savedSidebarState === 'true');
    }

    // Listen for theme changes from AdminNav
    const handleStorageChange = () => {
      const currentTheme = localStorage.getItem('theme');
      setIsDarkMode(currentTheme === 'dark');
      
      const currentSidebarState = localStorage.getItem('sidebarOpen');
      if (currentSidebarState !== null) {
        setIsSidebarOpen(currentSidebarState === 'true');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Custom event listener for theme changes within the same window
    const handleThemeChange = () => {
      const currentTheme = localStorage.getItem('theme');
      setIsDarkMode(currentTheme === 'dark');
    };

    window.addEventListener('themeChange', handleThemeChange);

    // Listen for sidebar state changes via custom event
    const handleSidebarChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ isOpen: boolean }>;
      if (customEvent.detail) {
        setIsSidebarOpen(customEvent.detail.isOpen);
      }
    };

    window.addEventListener('sidebarStateChange', handleSidebarChange);
    
    // Also check localStorage periodically as fallback (in case event doesn't fire)
    const checkSidebarState = () => {
      const currentSidebarState = localStorage.getItem('sidebarOpen');
      if (currentSidebarState !== null) {
        const newState = currentSidebarState === 'true';
        setIsSidebarOpen(prev => {
          if (prev !== newState) {
            return newState;
          }
          return prev;
        });
      }
    };
    
    // Check immediately and then periodically (faster check for better sync)
    checkSidebarState();
    const intervalId = setInterval(checkSidebarState, 100);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('themeChange', handleThemeChange);
      window.removeEventListener('sidebarStateChange', handleSidebarChange);
      clearInterval(intervalId);
    };
  }, []);

  return (
    <ProtectedRoute requiredRole="CLUB_LEADER">
      <div 
        className={`min-h-screen flex flex-col transition-colors duration-300 overflow-x-hidden ${isDarkMode ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' : 'bg-gradient-to-br from-gray-50 via-blue-50/20 to-purple-50/20'}`}
        style={{
          '--sidebar-width': isSidebarOpen ? '288px' : '80px'
        } as React.CSSProperties}
      >
        <AdminNav />
        
        <main 
          className="flex-1 transition-all duration-300 px-4 sm:px-5 lg:px-6 xl:px-8 py-6 sm:py-8 lg:py-10 overflow-x-hidden min-w-0"
          style={{
            marginLeft: isDesktop ? (isSidebarOpen ? '288px' : '80px') : '0',
            width: isDesktop ? `calc(100% - ${isSidebarOpen ? '288px' : '80px'})` : '100%',
            maxWidth: isDesktop ? `calc(100% - ${isSidebarOpen ? '288px' : '80px'})` : '100%'
          }}
        >
          {/* Welcome Section */}
          <div className="mb-6 sm:mb-8">
            <div className={`rounded-xl ${isDarkMode ? 'bg-gray-800/50 border border-gray-700/50' : 'bg-white/60 border border-gray-200/50'} backdrop-blur-sm shadow-md p-5 sm:p-6 transition-all duration-300`}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className={`text-2xl sm:text-3xl font-bold mb-2 transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Chào mừng, <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">{user?.name || 'Admin'}</span>! 👋
                  </h1>
                  <p className={`text-sm sm:text-base transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    Quản lý toàn bộ hệ thống CLB Sinh viên 5 Tốt TDMU
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <div className={`px-3 py-1.5 rounded-lg ${isDarkMode ? 'bg-blue-500/20 border border-blue-500/30' : 'bg-blue-50/70 border border-blue-200/50'} transition-colors duration-300`}>
                      <p className={`text-xs font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                        📅 {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-3 sm:mt-0 hidden md:block">
                  <div className={`w-16 h-16 rounded-xl ${isDarkMode ? 'bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20' : 'bg-gradient-to-br from-blue-100/70 via-purple-100/70 to-pink-100/70'} border ${isDarkMode ? 'border-blue-400/30' : 'border-blue-200/50'} flex items-center justify-center text-3xl shadow-md`}>
                    🎯
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="mb-6 sm:mb-8">
            <DashboardStats isDarkMode={isDarkMode} />
          </div>

          {/* Quick Actions */}
          <div className="mb-6 sm:mb-8">
            <QuickActions isDarkMode={isDarkMode} />
          </div>

          {/* Recent Activities */}
          <div>
            <ActivityList 
              isDarkMode={isDarkMode} 
              showActions={true}
              onEdit={handleEditActivity}
              onDelete={handleDeleteActivity}
              onView={handleViewActivity}
            />
          </div>
        </main>

        <Footer isDarkMode={isDarkMode} />
      </div>
    </ProtectedRoute>
  );
}
