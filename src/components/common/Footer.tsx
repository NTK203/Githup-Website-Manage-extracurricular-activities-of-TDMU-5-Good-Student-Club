'use client';

import { useState, useEffect } from 'react';
import { useDarkMode } from '@/hooks/useDarkMode';
import { usePathname } from 'next/navigation';
import { Shield, UserCog, Users, GraduationCap, RefreshCw, Loader, MapPin, Mail, Phone } from 'lucide-react';

interface FooterProps {
  isDarkMode?: boolean;
}

interface AccessStatistics {
  admin: number;
  officer: number;
  clubStudent: number;
  student: number;
}

export default function Footer({ isDarkMode: propIsDarkMode }: FooterProps) {
  const { isDarkMode: hookIsDarkMode } = useDarkMode();
  const [localDarkMode, setLocalDarkMode] = useState(hookIsDarkMode);
  const isDarkMode = propIsDarkMode !== undefined ? propIsDarkMode : localDarkMode;
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);
  const [accessStats, setAccessStats] = useState<AccessStatistics>({
    admin: 0,
    officer: 0,
    clubStudent: 0,
    student: 0
  });
  const [refreshingStats, setRefreshingStats] = useState(false);
  const currentYear = new Date().getFullYear();
  const isAuthPage = pathname?.startsWith('/auth/') || false;
  // Check if this is an admin page (has sidebar on the left)
  const isAdminPage = pathname?.startsWith('/admin/') || false;

  // Listen for theme changes
  useEffect(() => {
    if (propIsDarkMode !== undefined) {
      return; // Don't listen if prop is provided
    }

    const handleThemeChange = () => {
      const currentTheme = localStorage.getItem('theme');
      setLocalDarkMode(currentTheme === 'dark');
    };

    // Set initial value
    const savedTheme = localStorage.getItem('theme');
    setLocalDarkMode(savedTheme === 'dark');

    window.addEventListener('themeChange', handleThemeChange);
    window.addEventListener('darkModeToggle', handleThemeChange);

    return () => {
      window.removeEventListener('themeChange', handleThemeChange);
      window.removeEventListener('darkModeToggle', handleThemeChange);
    };
  }, [propIsDarkMode]);

  // Ping session and fetch access statistics
  useEffect(() => {
    if (isAuthPage) {
      return;
    }

    let pingInterval: NodeJS.Timeout | null = null;
    let statsInterval: NodeJS.Timeout | null = null;
    let isActive = true;
    let initDelayTimer: NodeJS.Timeout | null = null;

    const pingSession = async () => {
      if (!isActive || document.visibilityState !== 'visible') {
        return;
      }

      try {
        const token = localStorage.getItem('token');
        if (!token) {
          if (pingInterval) {
            clearInterval(pingInterval);
            pingInterval = null;
          }
          return;
        }

        fetch('/api/session/ping', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }).catch(() => {});
      } catch (error) {
        // Silent fail
      }
    };

    const deleteSession = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          fetch('/api/session/ping', {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }).catch(() => {});
        }
      } catch (error) {
        // Silent fail
      }
    };

    const fetchAccessStats = async (isManualRefresh = false) => {
      try {
        if (isManualRefresh) {
          setRefreshingStats(true);
        }
        
        const response = await fetch('/api/statistics/access');
        const data = await response.json();
        
        if (data.success && data.data) {
          setAccessStats({
            admin: data.data.admin || 0,
            officer: data.data.officer || 0,
            clubStudent: data.data.clubStudent || 0,
            student: data.data.student || 0
          });
        }
      } catch (error) {
        // Silent fail
      } finally {
        if (isManualRefresh) {
          setRefreshingStats(false);
        }
      }
    };

    const token = localStorage.getItem('token');
    if (token) {
      const initPing = () => {
        if (document.visibilityState === 'visible') {
          pingSession();
          setTimeout(() => {
            fetchAccessStats(false);
          }, 1500);
        }
      };

      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        initDelayTimer = window.requestIdleCallback(initPing, { timeout: 2000 }) as any;
      } else {
        initDelayTimer = setTimeout(initPing, 500) as any;
      }
      
      pingInterval = setInterval(() => {
        if (document.visibilityState === 'visible' && isActive) {
          pingSession();
        }
      }, 45 * 1000);
    }
    
    statsInterval = setInterval(() => fetchAccessStats(false), 15000);
      
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setTimeout(() => {
          if (document.visibilityState === 'hidden') {
            deleteSession();
          }
        }, 30000);
      } else if (document.visibilityState === 'visible') {
        isActive = true;
        pingSession();
      }
    };

    const handleBeforeUnload = () => {
      isActive = false;
      deleteSession();
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token' && !e.newValue) {
        isActive = false;
        deleteSession();
        if (pingInterval) {
          clearInterval(pingInterval);
          pingInterval = null;
        }
      }
    };

    const handlePageHide = () => {
      isActive = false;
      deleteSession();
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      isActive = false;
      if (initDelayTimer) {
        if (typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
          window.cancelIdleCallback(initDelayTimer as any);
        } else {
          clearTimeout(initDelayTimer);
        }
      }
      if (pingInterval) {
        clearInterval(pingInterval);
      }
      if (statsInterval) {
        clearInterval(statsInterval);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('storage', handleStorageChange);
      deleteSession();
    };
  }, [isAuthPage]);

  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  // Only listen to sidebar state if this is an admin page
  useEffect(() => {
    if (!isAdminPage) {
      return; // Don't listen to sidebar changes if not admin page
    }

    const savedSidebarState = localStorage.getItem('sidebarOpen');
    if (savedSidebarState !== null) {
      setIsSidebarOpen(savedSidebarState === 'true');
    }

    const handleSidebarChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ isOpen: boolean }>;
      if (customEvent.detail) {
        setIsSidebarOpen(customEvent.detail.isOpen);
      }
    };

    window.addEventListener('sidebarStateChange', handleSidebarChange);
    
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
  }, [isAdminPage]);

  // Statistics data configuration
  const statsConfig = [
    { 
      key: 'admin' as const, 
      icon: Shield, 
      label: 'Quản trị', 
      color: isDarkMode ? { icon: 'text-blue-400', label: 'text-blue-300', value: 'text-white' } : { icon: 'text-blue-600', label: 'text-blue-600', value: 'text-blue-900' }
    },
    { 
      key: 'officer' as const, 
      icon: UserCog, 
      label: 'Cán bộ', 
      color: isDarkMode ? { icon: 'text-purple-400', label: 'text-purple-300', value: 'text-white' } : { icon: 'text-purple-600', label: 'text-purple-600', value: 'text-purple-900' }
    },
    { 
      key: 'clubStudent' as const, 
      icon: Users, 
      label: 'Thành viên CLB', 
      color: isDarkMode ? { icon: 'text-orange-400', label: 'text-orange-300', value: 'text-white' } : { icon: 'text-orange-600', label: 'text-orange-600', value: 'text-orange-900' }
    },
    { 
      key: 'student' as const, 
      icon: GraduationCap, 
      label: 'Sinh viên', 
      color: isDarkMode ? { icon: 'text-emerald-400', label: 'text-emerald-300', value: 'text-white' } : { icon: 'text-emerald-600', label: 'text-emerald-600', value: 'text-emerald-900' }
    }
  ];

  const handleRefresh = async () => {
    try {
      setRefreshingStats(true);
      const response = await fetch('/api/statistics/access');
      const data = await response.json();
      
      if (data.success && data.data) {
        setAccessStats({
          admin: data.data.admin || 0,
          officer: data.data.officer || 0,
          clubStudent: data.data.clubStudent || 0,
          student: data.data.student || 0
        });
      }
    } catch (error) {
      // Silent fail
    } finally {
      setRefreshingStats(false);
    }
  };

  return (
    <footer 
      className={`relative transition-all duration-300 ${isDarkMode ? 'bg-slate-900 text-slate-300' : 'bg-white text-slate-600'} border-t ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}
      style={{
        // Only apply sidebar margin for admin pages, otherwise full width
        marginLeft: isAdminPage && isDesktop ? (isSidebarOpen ? '288px' : '80px') : '0',
        width: isAdminPage && isDesktop ? `calc(100% - ${isSidebarOpen ? '288px' : '80px'})` : '100%'
      }}
    >
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-4">
        {/* Main content - Simplified */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-4">
          
          {/* Brand Section - Simplified */}
          <div>
            <div className="flex items-center mb-3">
              <div className="relative">
                <img 
                  src="/logo_clb_sv_5T.jpg" 
                  alt="CLB Sinh viên 5 Tốt TDMU" 
                  className={`w-9 h-9 rounded-lg mr-2 ring-2 ${isDarkMode ? 'ring-indigo-800' : 'ring-indigo-200'}`}
                />
              </div>
              <div>
                <h3 className={`text-sm font-bold bg-gradient-to-r ${isDarkMode ? 'from-blue-400 to-purple-400' : 'from-blue-600 to-purple-600'} bg-clip-text text-transparent`}>
                  CLB Sinh viên 5 Tốt TDMU
                </h3>
                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Hệ thống Quản lý Hoạt động
                </p>
              </div>
            </div>
            <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Nền tảng quản lý hiện đại cho câu lạc bộ sinh viên tại Đại học Thủ Dầu Một.
            </p>
          </div>

          {/* Contact - Simplified */}
          <div>
            <h4 className={`text-xs font-semibold mb-3 flex items-center gap-1.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              <div className="w-1 h-1 bg-indigo-500 rounded-full"></div>
              Liên hệ
            </h4>
            <div className={`space-y-1.5 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              <div className="flex items-center gap-2">
                <MapPin size={14} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} strokeWidth={1.5} />
                <p>Đại học Thủ Dầu Một, Bình Dương</p>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={14} className={isDarkMode ? 'text-purple-400' : 'text-purple-600'} strokeWidth={1.5} />
                <p>clb5tot@tdmu.edu.vn</p>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={14} className={isDarkMode ? 'text-emerald-400' : 'text-emerald-600'} strokeWidth={1.5} />
                <p>0369025756</p>
              </div>
            </div>
          </div>

          {/* Info - Simplified */}
          <div>
            <h4 className={`text-xs font-semibold mb-3 flex items-center gap-1.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              <div className="w-1 h-1 bg-purple-500 rounded-full"></div>
              Thông tin
            </h4>
            <p className={`text-xs mb-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Nhận thông tin mới nhất về các hoạt động của CLB.
            </p>
            <div className="flex">
              <input 
                type="email" 
                placeholder="Email của bạn" 
                className={`flex-1 px-2 py-1.5 text-xs border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isDarkMode 
                    ? 'border-slate-600 bg-slate-800 text-slate-300' 
                    : 'border-slate-300 bg-white text-gray-900'
                }`}
              />
              <button className="px-2.5 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white text-xs font-medium transition-all duration-200 shadow-sm hover:shadow-md">
                →
              </button>
            </div>
          </div>

          {/* Access Statistics - Separate Item */}
          <div>
            <h4 className={`text-xs font-semibold mb-3 flex items-center gap-1.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              <div className="w-1 h-1 bg-emerald-500 rounded-full"></div>
              Thống kê truy cập
            </h4>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleRefresh}
                className={`flex items-center justify-center w-full px-2 py-1.5 transition-all duration-200 rounded ${
                  isDarkMode 
                    ? 'text-gray-400 hover:text-gray-200 hover:bg-slate-800' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-slate-50'
                }`}
                title="Làm mới số lượng truy cập"
                disabled={refreshingStats}
              >
                <RefreshCw 
                  size={12} 
                  strokeWidth={1.5} 
                  className={`mr-1 ${refreshingStats ? 'animate-spin' : ''}`}
                />
                <span className="text-xs">Làm mới</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                {statsConfig.map((stat) => {
                  const IconComponent = stat.icon;
                  return (
                    <div key={stat.key} className={`flex items-center gap-2 px-2 py-1.5 rounded ${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                      <IconComponent size={14} className={stat.color.icon} strokeWidth={1.5} />
                      <div className="flex-1 min-w-0">
                        <div className={`text-[10px] font-semibold leading-tight ${stat.color.label} mb-0.5`}>
                          {stat.label}
                        </div>
                        <div className="flex items-center gap-1">
                          {refreshingStats ? (
                            <Loader 
                              size={12} 
                              className={`animate-spin ${stat.color.icon}`} 
                              strokeWidth={1.5} 
                            />
                          ) : (
                            <span className={`text-sm font-bold leading-tight ${stat.color.value}`}>
                              {accessStats[stat.key]}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom section - Simplified */}
        <div className={`pt-3 border-t ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          <div className="flex flex-col md:flex-row justify-between items-center gap-3">
            <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              © {currentYear} nguyenkimthinh.it@gmail.com. Tất cả quyền được bảo lưu.
            </p>

            <div className="flex items-center gap-4 text-xs">
              <a href="#" className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} hover:text-indigo-500 transition-colors duration-200`}>
                Chính sách
              </a>
              <a href="#" className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} hover:text-purple-500 transition-colors duration-200`}>
                Hỗ trợ
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
