'use client';

import { useState, useEffect } from 'react';
import { useDarkMode } from '@/hooks/useDarkMode';
import { usePathname } from 'next/navigation';
import { Shield, UserCog, Users, GraduationCap, MapPin, Mail, Phone } from 'lucide-react';

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
  const [displayedStats, setDisplayedStats] = useState<AccessStatistics>({
    admin: 0,
    officer: 0,
    clubStudent: 0,
    student: 0
  });
  const [isVisible, setIsVisible] = useState(false);
  const currentYear = new Date().getFullYear();
  const isAuthPage = pathname?.startsWith('/auth/') || false;
  const isAdminPage = pathname?.startsWith('/admin/') || false;

  useEffect(() => {
    if (propIsDarkMode !== undefined) {
      return;
    }

    const handleThemeChange = () => {
      const currentTheme = localStorage.getItem('theme');
      setLocalDarkMode(currentTheme === 'dark');
    };

    const savedTheme = localStorage.getItem('theme');
    setLocalDarkMode(savedTheme === 'dark');

    window.addEventListener('themeChange', handleThemeChange);
    window.addEventListener('darkModeToggle', handleThemeChange);

    return () => {
      window.removeEventListener('themeChange', handleThemeChange);
      window.removeEventListener('darkModeToggle', handleThemeChange);
    };
  }, [propIsDarkMode]);

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

    const fetchAccessStats = async () => {
      try {
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
      }
    };

    const token = localStorage.getItem('token');
    if (token) {
      const initPing = () => {
        if (document.visibilityState === 'visible') {
          pingSession();
          setTimeout(() => {
            fetchAccessStats();
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
    
    statsInterval = setInterval(() => fetchAccessStats(), 15000);
      
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

  // Animate stats counter
  useEffect(() => {
    const duration = 1000;
    const steps = 60;
    const stepDuration = duration / steps;

    const animateStat = (key: keyof AccessStatistics, target: number, start: number) => {
      let current = start;
      const increment = (target - start) / steps;
      let step = 0;

      const timer = setInterval(() => {
        step++;
        current += increment;
        
        if (step >= steps) {
          setDisplayedStats(prev => ({ ...prev, [key]: target }));
          clearInterval(timer);
        } else {
          setDisplayedStats(prev => ({ ...prev, [key]: Math.round(current) }));
        }
      }, stepDuration);

      return timer;
    };

    const timers: NodeJS.Timeout[] = [];
    
    timers.push(animateStat('admin', accessStats.admin, displayedStats.admin));
    timers.push(animateStat('officer', accessStats.officer, displayedStats.officer));
    timers.push(animateStat('clubStudent', accessStats.clubStudent, displayedStats.clubStudent));
    timers.push(animateStat('student', accessStats.student, displayedStats.student));

    return () => {
      timers.forEach(timer => clearInterval(timer));
    };
  }, [accessStats]);

  // Fade in animation
  useEffect(() => {
    setIsVisible(true);
  }, []);

  useEffect(() => {
    if (!isAdminPage) {
      return;
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

  // Animate stats counter
  useEffect(() => {
    const duration = 1000;
    const steps = 60;
    const stepDuration = duration / steps;

    const animateStat = (key: keyof AccessStatistics, target: number, start: number) => {
      let current = start;
      const increment = (target - start) / steps;
      let step = 0;

      const timer = setInterval(() => {
        step++;
        current += increment;
        
        if (step >= steps) {
          setDisplayedStats(prev => ({ ...prev, [key]: target }));
          clearInterval(timer);
        } else {
          setDisplayedStats(prev => ({ ...prev, [key]: Math.round(current) }));
        }
      }, stepDuration);

      return timer;
    };

    const timers: NodeJS.Timeout[] = [];
    
    timers.push(animateStat('admin', accessStats.admin, displayedStats.admin));
    timers.push(animateStat('officer', accessStats.officer, displayedStats.officer));
    timers.push(animateStat('clubStudent', accessStats.clubStudent, displayedStats.clubStudent));
    timers.push(animateStat('student', accessStats.student, displayedStats.student));

    return () => {
      timers.forEach(timer => clearInterval(timer));
    };
  }, [accessStats]);

  // Fade in animation on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

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

  return (
    <footer 
      className={`relative transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} ${isDarkMode ? 'bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-slate-300' : 'bg-gradient-to-b from-white via-slate-50 to-white text-slate-600'} border-t ${isDarkMode ? 'border-slate-700/50' : 'border-slate-200'}`}
      style={{
        marginLeft: isAdminPage && isDesktop ? (isSidebarOpen ? '288px' : '80px') : '0',
        width: isAdminPage && isDesktop ? `calc(100% - ${isSidebarOpen ? '288px' : '80px'})` : '100%'
      }}
    >
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 mb-6">
          <div className="group animate-fade-in">
            <div className="flex items-center mb-4 transition-transform duration-300 group-hover:scale-105">
              <div className="relative">
                <img 
                  src="/logo_clb_sv_5T.jpg" 
                  alt="CLB Sinh viên 5 Tốt TDMU" 
                  className={`w-12 h-12 rounded-xl mr-3 ring-2 shadow-lg transition-all duration-300 animate-pulse-slow ${isDarkMode ? 'ring-indigo-700/50 group-hover:ring-indigo-500' : 'ring-indigo-200 group-hover:ring-indigo-400'} group-hover:shadow-xl group-hover:rotate-3`}
                />
              </div>
              <div>
                <h3 className={`text-sm font-bold bg-gradient-to-r ${isDarkMode ? 'from-blue-400 via-purple-400 to-pink-400' : 'from-blue-600 via-purple-600 to-pink-600'} bg-clip-text text-transparent transition-all duration-300 animate-gradient bg-[length:200%_200%]`}>
                  CLB Sinh viên 5 Tốt TDMU
                </h3>
                <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} transition-colors duration-300`}>
                  Hệ thống Quản lý Hoạt động
                </p>
              </div>
            </div>
            <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'} transition-colors duration-300`}>
              Nền tảng quản lý hiện đại cho câu lạc bộ sinh viên tại Đại học Thủ Dầu Một.
            </p>
          </div>

          <div>
            <h4 className={`text-xs font-semibold mb-4 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'} transition-colors duration-300`}>
              <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${isDarkMode ? 'bg-indigo-500' : 'bg-indigo-600'}`}></div>
              Liên hệ
            </h4>
            <div className={`space-y-3 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              <div className="flex items-center gap-2 group/contact transition-all duration-300 hover:translate-x-1">
                <MapPin size={14} className={`${isDarkMode ? 'text-blue-400' : 'text-blue-600'} transition-all duration-300 group-hover/contact:scale-110 animate-bounce-slow`} strokeWidth={2} />
                <span className="transition-colors duration-300 group-hover/contact:text-blue-500">Đại học Thủ Dầu Một, Bình Dương</span>
              </div>
              <div className="flex items-center gap-2 group/contact transition-all duration-300 hover:translate-x-1">
                <Mail size={14} className={`${isDarkMode ? 'text-purple-400' : 'text-purple-600'} transition-all duration-300 group-hover/contact:scale-110 animate-bounce-slow`} strokeWidth={2} style={{ animationDelay: '0.5s' }} />
                <span className="transition-colors duration-300 group-hover/contact:text-purple-500">clb5tot@tdmu.edu.vn</span>
              </div>
              <div className="flex items-center gap-2 group/contact transition-all duration-300 hover:translate-x-1">
                <Phone size={14} className={`${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'} transition-all duration-300 group-hover/contact:scale-110 animate-bounce-slow`} strokeWidth={2} style={{ animationDelay: '1s' }} />
                <span className="transition-colors duration-300 group-hover/contact:text-emerald-500">0369025756</span>
              </div>
            </div>
          </div>

          <div className="animate-slide-up" style={{ animationDelay: '200ms' }}>
            <h4 className={`text-xs font-semibold mb-4 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'} transition-colors duration-300`}>
              <div className={`w-1.5 h-1.5 rounded-full animate-pulse-slow ${isDarkMode ? 'bg-purple-500' : 'bg-purple-600'}`}></div>
              Thông tin
            </h4>
            <p className={`text-xs mb-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'} transition-colors duration-300`}>
              Nhận thông tin mới nhất về các hoạt động của CLB.
            </p>
            <div className={`flex rounded-lg overflow-hidden border transition-all duration-300 hover:shadow-lg ${isDarkMode ? 'border-slate-600' : 'border-slate-300'}`}>
              <input 
                type="email" 
                placeholder="Email của bạn" 
                className={`flex-1 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-300 ${
                  isDarkMode 
                    ? 'bg-slate-800 text-slate-300 placeholder-slate-500' 
                    : 'bg-white text-gray-900 placeholder-slate-400'
                }`}
              />
              <button className={`px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white text-xs font-medium transition-all duration-300 ${isDarkMode ? 'shadow-lg' : 'shadow-md'} hover:shadow-xl hover:scale-105 active:scale-95`}>
                →
              </button>
            </div>
          </div>

          <div className="animate-slide-up" style={{ animationDelay: '300ms' }}>
            <h4 className={`text-xs font-semibold mb-4 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'} transition-colors duration-300`}>
              <div className={`w-1.5 h-1.5 rounded-full animate-pulse-slow ${isDarkMode ? 'bg-emerald-500' : 'bg-emerald-600'}`}></div>
              Thống kê truy cập
            </h4>
            <div className="grid grid-cols-2 gap-2.5">
              {statsConfig.map((stat, index) => {
                const IconComponent = stat.icon;
                return (
                  <div 
                    key={stat.key} 
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-lg ${isDarkMode ? 'bg-slate-800/60 border border-slate-700/50 hover:border-slate-600' : 'bg-slate-50 border border-slate-200 hover:border-slate-300'}`}
                    style={{ 
                      animation: `slide-up 0.5s ease-out ${index * 100}ms both`
                    }}
                  >
                    <IconComponent 
                      size={13} 
                      className={`${stat.color.icon} transition-all duration-300 group-hover:scale-110 animate-bounce-slow`} 
                      strokeWidth={2}
                      style={{ animationDelay: `${index * 300}ms` }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className={`text-[10px] font-medium leading-tight ${stat.color.label} mb-1 transition-colors duration-300`}>
                        {stat.label}
                      </div>
                      <span className={`text-base font-bold leading-tight ${stat.color.value} transition-all duration-300 tabular-nums`}>
                        {displayedStats[stat.key]}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className={`pt-5 mt-5 border-t ${isDarkMode ? 'border-slate-700/50' : 'border-slate-200'}`}>
          <div className="flex flex-col md:flex-row justify-between items-center gap-3">
            <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} transition-colors duration-300`}>
              © {currentYear} CLB Sinh viên 5 Tốt TDMU. Tất cả quyền được bảo lưu.
            </p>
            <div className="flex items-center gap-5 text-xs">
              <a 
                href="#" 
                className={`${isDarkMode ? 'text-slate-400 hover:text-indigo-400' : 'text-slate-500 hover:text-indigo-600'} transition-all duration-300 hover:scale-110 relative group`}
              >
                Chính sách
                <span className={`absolute bottom-0 left-0 w-0 h-0.5 ${isDarkMode ? 'bg-indigo-400' : 'bg-indigo-600'} transition-all duration-300 group-hover:w-full`}></span>
              </a>
              <a 
                href="#" 
                className={`${isDarkMode ? 'text-slate-400 hover:text-purple-400' : 'text-slate-500 hover:text-purple-600'} transition-all duration-300 hover:scale-110 relative group`}
              >
                Hỗ trợ
                <span className={`absolute bottom-0 left-0 w-0 h-0.5 ${isDarkMode ? 'bg-purple-400' : 'bg-purple-600'} transition-all duration-300 group-hover:w-full`}></span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
