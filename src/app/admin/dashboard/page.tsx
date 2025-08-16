'use client';

import { useState, useEffect } from 'react';
import ClientOnly from '@/components/common/ClientOnly';
import AdminNav from '@/components/admin/AdminNav';
import Footer from '@/components/common/Footer';
import DashboardStats from '@/components/dashboard/DashboardStats';
import ActivityList from '@/components/dashboard/ActivityList';
import QuickActions from '@/components/dashboard/QuickActions';
import ProtectedRoute from '@/components/common/ProtectedRoute';

export default function AdminDashboard() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Load theme from localStorage on component mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
    }

    // Listen for theme changes from AdminNav
    const handleStorageChange = () => {
      const currentTheme = localStorage.getItem('theme');
      setIsDarkMode(currentTheme === 'dark');
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Custom event listener for theme changes within the same window
    const handleThemeChange = () => {
      const currentTheme = localStorage.getItem('theme');
      setIsDarkMode(currentTheme === 'dark');
    };

    window.addEventListener('themeChange', handleThemeChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('themeChange', handleThemeChange);
    };
  }, []);

  return (
    <ProtectedRoute requiredRole="ADMIN">
      <ClientOnly>
        <div className={`min-h-screen flex flex-col transition-colors duration-200 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <AdminNav />
        
        <main className="flex-1 max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
          {/* Welcome Section */}
          <div className="mb-6 sm:mb-8">
            <h1 className={`text-2xl sm:text-3xl font-bold mb-2 transition-colors duration-200 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Chào mừng, Admin!
            </h1>
            <p className={`text-sm sm:text-base transition-colors duration-200 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Quản lý toàn bộ hệ thống CLB Sinh viên 5 Tốt TDMU
            </p>
          </div>

          {/* Stats Cards */}
          <DashboardStats isDarkMode={isDarkMode} />

          {/* Quick Actions */}
          <div className="mt-6 sm:mt-8">
            <QuickActions isDarkMode={isDarkMode} />
          </div>

          {/* Recent Activities */}
          <div className="mt-6 sm:mt-8">
            <ActivityList isDarkMode={isDarkMode} />
          </div>
        </main>

        <Footer isDarkMode={isDarkMode} />
        </div>
      </ClientOnly>
    </ProtectedRoute>
  );
}
