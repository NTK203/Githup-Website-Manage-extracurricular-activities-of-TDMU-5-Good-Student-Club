'use client';

import { useState, useEffect } from 'react';
import { useDarkMode } from '@/hooks/useDarkMode';

interface FooterProps {
  isDarkMode?: boolean;
}

export default function Footer({ isDarkMode: propIsDarkMode }: FooterProps) {
  const { isDarkMode } = useDarkMode();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);
  const currentYear = new Date().getFullYear();

  // Check if desktop
  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  // Load sidebar state from localStorage on component mount
  useEffect(() => {
    const savedSidebarState = localStorage.getItem('sidebarOpen');
    if (savedSidebarState !== null) {
      setIsSidebarOpen(savedSidebarState === 'true');
    }

    // Listen for sidebar state changes via custom event
    const handleSidebarChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ isOpen: boolean }>;
      if (customEvent.detail) {
        setIsSidebarOpen(customEvent.detail.isOpen);
      }
    };

    window.addEventListener('sidebarStateChange', handleSidebarChange);
    
    // Also check localStorage periodically as fallback
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
    
    checkSidebarState();
    const intervalId = setInterval(checkSidebarState, 100);

    return () => {
      window.removeEventListener('sidebarStateChange', handleSidebarChange);
      clearInterval(intervalId);
    };
  }, []);

  return (
    <footer 
      className={`relative transition-all duration-300 ${isDarkMode ? 'bg-slate-900 text-slate-300' : 'bg-white text-slate-600'} border-t ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}
      style={{
        marginLeft: isDesktop ? (isSidebarOpen ? '288px' : '80px') : '0',
        width: isDesktop ? `calc(100% - ${isSidebarOpen ? '288px' : '80px'})` : '100%'
      }}
    >
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 dark:from-slate-800 dark:via-slate-800 dark:to-slate-800"></div>
      </div>
      
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-8">
        {/* Main content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          
          {/* Brand Section */}
          <div className="md:col-span-2 lg:col-span-1">
            <div className="flex items-center mb-3">
              <div className="relative mr-3">
                <img 
                  src="/logo_clb_sv_5T.jpg" 
                  alt="CLB Sinh viên 5 Tốt TDMU" 
                  className="w-12 h-12 rounded-xl shadow-lg"
                />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'} mb-0.5`}>
                  CLB Sinh viên 5 Tốt TDMU
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Hệ thống Quản lý Hoạt động Ngoại khóa
                </p>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400 mb-4">
              Nền tảng quản lý hiện đại cho câu lạc bộ sinh viên, kết nối và phát triển cộng đồng học tập tích cực tại Đại học Thủ Dầu Một.
            </p>
            {/* Social links */}
            <div className="flex space-x-2">
              <a href="#" className="group p-2.5 rounded-lg transition-all duration-300 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                </svg>
              </a>
              <a href="#" className="group p-2.5 rounded-lg transition-all duration-300 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"/>
                </svg>
              </a>
              <a href="#" className="group p-2.5 rounded-lg transition-all duration-300 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.746-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24.009c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001 12.017.001z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className={`text-base font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'} flex items-center`}>
              <div className="w-6 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full mr-2"></div>
              Liên kết nhanh
            </h4>
            <ul className="space-y-2">
              <li>
                <a href="/admin/dashboard" className="group flex items-center text-sm hover:text-indigo-500 transition-all duration-200">
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mr-2 group-hover:scale-150 transition-transform duration-200"></div>
                  <span className="group-hover:translate-x-1 transition-transform duration-200">Dashboard Admin</span>
                </a>
              </li>
              <li>
                <a href="/admin/members" className="group flex items-center text-sm hover:text-indigo-500 transition-all duration-200">
                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mr-2 group-hover:scale-150 transition-transform duration-200"></div>
                  <span className="group-hover:translate-x-1 transition-transform duration-200">Quản lý Thành viên</span>
                </a>
              </li>
              <li>
                <a href="/admin/memberships" className="group flex items-center text-sm hover:text-indigo-500 transition-all duration-200">
                  <div className="w-1.5 h-1.5 bg-pink-500 rounded-full mr-2 group-hover:scale-150 transition-transform duration-200"></div>
                  <span className="group-hover:translate-x-1 transition-transform duration-200">Xét duyệt Đăng ký</span>
                </a>
              </li>
              <li>
                <a href="/auth/login" className="group flex items-center text-sm hover:text-indigo-500 transition-all duration-200">
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mr-2 group-hover:scale-150 transition-transform duration-200"></div>
                  <span className="group-hover:translate-x-1 transition-transform duration-200">Đăng nhập</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className={`text-base font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'} flex items-center`}>
              <div className="w-6 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mr-2"></div>
              Liên hệ
            </h4>
            <div className="space-y-2">
              <div className="flex items-start group">
                <div className="p-1.5 rounded-md bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-slate-800 dark:to-slate-700 mr-2 group-hover:scale-110 transition-transform duration-200">
                  <svg className="w-3 h-3 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <span className="text-xs text-slate-600 dark:text-slate-400">Đại học Thủ Dầu Một, Bình Dương</span>
              </div>
              <div className="flex items-start group">
                <div className="p-1.5 rounded-md bg-gradient-to-r from-purple-100 to-pink-100 dark:from-slate-800 dark:to-slate-700 mr-2 group-hover:scale-110 transition-transform duration-200">
                  <svg className="w-3 h-3 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="text-xs text-slate-600 dark:text-slate-400">clb5tot@tdmu.edu.vn</span>
              </div>
              <div className="flex items-start group">
                <div className="p-1.5 rounded-md bg-gradient-to-r from-pink-100 to-rose-100 dark:from-slate-800 dark:to-slate-700 mr-2 group-hover:scale-110 transition-transform duration-200">
                  <svg className="w-3 h-3 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <span className="text-xs text-slate-600 dark:text-slate-400">+84 274 3 822 058</span>
              </div>
            </div>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className={`text-base font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'} flex items-center`}>
              <div className="w-6 h-0.5 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full mr-2"></div>
              Thông tin
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
              Đăng ký nhận thông tin mới nhất về hoạt động của CLB
            </p>
            <div className="flex">
              <input 
                type="email" 
                placeholder="Email của bạn" 
                className="flex-1 px-2 py-1.5 text-xs border border-slate-300 dark:border-slate-600 rounded-l-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:text-slate-300"
              />
              <button className="px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white text-xs font-medium rounded-r-md transition-all duration-200 transform hover:scale-105">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom section */}
        <div className={`pt-4 border-t ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          <div className="flex flex-col md:flex-row justify-between items-center space-y-2 md:space-y-0">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              © {currentYear} CLB Sinh viên 5 Tốt TDMU. Tất cả quyền được bảo lưu.
            </p>
            <div className="flex items-center space-x-4 text-xs">
              <a href="#" className="text-slate-500 hover:text-indigo-500 transition-colors duration-200">
                Chính sách Bảo mật
              </a>
              <a href="#" className="text-slate-500 hover:text-indigo-500 transition-colors duration-200">
                Điều khoản Sử dụng
              </a>
              <a href="#" className="text-slate-500 hover:text-indigo-500 transition-colors duration-200">
                Hỗ trợ
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
