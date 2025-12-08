'use client';

import { useState, useEffect, useRef } from 'react';
import { Calendar, ChevronDown, Plus, Edit2, Trash2, X, Save, Image as ImageIcon, Upload, Loader2 } from 'lucide-react';
import AdminNav from '@/components/admin/AdminNav';
import Footer from '@/components/common/Footer';
import ActivityDashboardLayout from '@/components/dashboard/ActivityDashboardLayout';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';

interface Banner {
  id: string;
  title: string;
  imageUrl: string;
  link?: string | null;
  imageFit?: string;
  order: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);
  
  // Banner states
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [isEditingBanner, setIsEditingBanner] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [showBannerForm, setShowBannerForm] = useState(false);
  const [bannerForm, setBannerForm] = useState({
    title: '',
    imageUrl: '',
    link: '',
    imageFit: 'cover' as 'cover' | 'contain' | 'fill' | 'scale-down' | 'none',
    order: 0,
    isActive: true
  });
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerSliderRef = useRef<HTMLDivElement>(null);

  // Handler functions for activities
  const handleEditActivity = (id: string, type?: 'single_day' | 'multiple_days') => {
    if (type === 'multiple_days') {
      window.location.href = `/admin/activities/create-multiple/${id}`;
    } else {
      // Default to single_day or if type is not provided
      window.location.href = `/admin/activities/create-single/${id}`;
    }
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

  // Load banners
  useEffect(() => {
    const loadBanners = async () => {
      try {
        const response = await fetch('/api/banners?activeOnly=false');
        const result = await response.json();
        if (result.success) {
          setBanners(result.data);
        }
      } catch (error) {
        console.error('Error loading banners:', error);
      }
    };
    loadBanners();
  }, []);

  // Banner auto-play effect
  useEffect(() => {
    const activeBanners = banners.filter(b => b.isActive);
    if (activeBanners.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % activeBanners.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [banners]);

  // Banner management functions
  const handleAddBanner = () => {
    setEditingBanner(null);
    setBannerForm({
      title: '',
      imageUrl: '',
      link: '',
      imageFit: 'cover',
      order: banners.length,
      isActive: true
    });
    setImagePreview(null);
    setShowBannerForm(true);
  };

  const handleEditBanner = (banner: Banner) => {
    setEditingBanner(banner);
    setBannerForm({
      title: banner.title,
      imageUrl: banner.imageUrl,
      link: banner.link || '',
      imageFit: (banner.imageFit || 'cover') as 'cover' | 'contain' | 'fill' | 'scale-down' | 'none',
      order: banner.order,
      isActive: banner.isActive
    });
    setImagePreview(banner.imageUrl);
    setShowBannerForm(true);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn file hình ảnh');
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      alert('Kích thước file không được vượt quá 10MB');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to server
    setIsUploadingImage(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        setIsUploadingImage(false);
        return;
      }

      const formData = new FormData();
      formData.append('bannerImage', file);

      const response = await fetch('/api/upload/banner-image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      // Check if response is ok before parsing JSON
      if (!response.ok) {
        let errorMessage = 'Lỗi khi tải ảnh';
        try {
          const errorText = await response.text();
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.error || errorMessage;
          } catch {
            errorMessage = errorText || errorMessage;
          }
        } catch (parseError) {
          console.error('Error parsing error response:', parseError);
          if (response.status === 401) {
            errorMessage = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
          } else if (response.status === 403) {
            errorMessage = 'Bạn không có quyền thực hiện thao tác này.';
          }
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();

      if (result.success && result.url) {
        const newImageUrl = result.url;
        setBannerForm(prev => ({ ...prev, imageUrl: newImageUrl }));
        setImagePreview(newImageUrl);
        alert('Tải ảnh lên thành công!');
      } else {
        throw new Error(result.error || 'Lỗi khi tải ảnh');
      }
    } catch (error: any) {
      console.error('Error uploading image:', error);
      alert('Lỗi khi tải ảnh: ' + (error.message || 'Vui lòng thử lại'));
      setImagePreview(null);
      setBannerForm(prev => ({ ...prev, imageUrl: '' }));
    } finally {
      setIsUploadingImage(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteBanner = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa banner này?')) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        return;
      }

      const response = await fetch(`/api/banners/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();
      if (result.success) {
        setBanners(banners.filter(b => b.id !== id));
        alert('Đã xóa banner thành công!');
      } else {
        alert('Có lỗi xảy ra: ' + result.error);
      }
    } catch (error) {
      console.error('Error deleting banner:', error);
      alert('Có lỗi xảy ra khi xóa banner');
    }
  };

  const handleSaveBanner = async () => {
    if (!bannerForm.title) {
      alert('Vui lòng nhập tiêu đề banner');
      return;
    }
    if (!bannerForm.imageUrl) {
      alert('Vui lòng tải ảnh banner lên');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        return;
      }

      const url = editingBanner ? `/api/banners/${editingBanner.id}` : '/api/banners';
      const method = editingBanner ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(bannerForm)
      });

      const result = await response.json();
      if (result.success) {
        if (editingBanner) {
          setBanners(banners.map(b => b.id === editingBanner.id ? result.data : b));
        } else {
          setBanners([...banners, result.data]);
        }
        setShowBannerForm(false);
        setEditingBanner(null);
        alert('Lưu banner thành công!');
      } else {
        alert('Có lỗi xảy ra: ' + result.error);
      }
    } catch (error) {
      console.error('Error saving banner:', error);
      alert('Có lỗi xảy ra khi lưu banner');
    }
  };

  const activeBanners = banners.filter(b => b.isActive).sort((a, b) => a.order - b.order);

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
          className="flex-1 transition-all duration-300 px-2 sm:px-3 lg:px-4 py-3 sm:py-4 overflow-x-hidden min-w-0"
          style={{
            marginLeft: isDesktop ? (isSidebarOpen ? '288px' : '80px') : '0',
            width: isDesktop ? `calc(100% - ${isSidebarOpen ? '288px' : '80px'})` : '100%',
            maxWidth: isDesktop ? `calc(100% - ${isSidebarOpen ? '288px' : '80px'})` : '100%'
          }}
        >
          {/* Welcome Section */}
          <div className="mb-3">
            <div 
              className={`rounded-lg ${isDarkMode ? 'bg-gray-800/50' : 'bg-white/60'} backdrop-blur-sm shadow-sm p-3 transition-all duration-300`}
              style={{ border: '1px solid #1e40af' }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex-1">
                  <h1 className={`text-lg sm:text-xl font-bold mb-1 transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Chào mừng, <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">{user?.name || 'Admin'}</span>
                  </h1>
                  <p className={`text-[10px] sm:text-xs mb-1.5 transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    Quản lý toàn bộ hệ thống CLB Sinh viên 5 Tốt TDMU
                  </p>
                  <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg ${isDarkMode ? 'bg-blue-500/20 border border-blue-500/30' : 'bg-blue-50/70 border border-blue-200/50'} transition-colors duration-300`}>
                    <Calendar size={10} className={`${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`} strokeWidth={1.5} />
                    <span className={`text-[9px] font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                      {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Banner/Slider Section */}
          {activeBanners.length > 0 && (
            <div className="mb-3 relative flex justify-center">
              <div 
                ref={bannerSliderRef}
                className="relative w-[92%] max-w-6xl h-[240px] sm:h-[260px] md:h-[280px] rounded-lg overflow-hidden shadow-md mx-auto"
              >
                {/* Banner Images */}
                <div className="relative w-full h-full">
                  {activeBanners.map((banner, index) => (
                    <div
                      key={banner.id}
                      className={`absolute inset-0 transition-opacity duration-500 ${
                        index === currentBannerIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
                      }`}
                    >
                      {banner.link ? (
                        <a href={banner.link} className="block w-full h-full" target="_blank" rel="noopener noreferrer">
                          <img
                            src={banner.imageUrl}
                            alt={banner.title}
                            className="w-full h-full"
                            style={{ objectFit: (banner.imageFit || 'cover') as React.CSSProperties['objectFit'] }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/1200x400/6366f1/ffffff?text=Banner+Image';
                            }}
                          />
                        </a>
                      ) : (
                        <img
                          src={banner.imageUrl}
                          alt={banner.title}
                          className="w-full h-full"
                          style={{ objectFit: (banner.imageFit || 'cover') as 'cover' | 'contain' | 'fill' | 'scale-down' | 'none' }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/1200x400/6366f1/ffffff?text=Banner+Image';
                          }}
                        />
                      )}
                      
                      {/* Overlay Gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                      
                      {/* Banner Title */}
                      <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3 z-20">
                        <h3 className={`text-sm sm:text-base font-bold text-white drop-shadow-lg`}>
                          {banner.title}
                        </h3>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Navigation Dots */}
                {activeBanners.length > 1 && (
                  <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 z-30 flex gap-1.5">
                    {activeBanners.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentBannerIndex(index)}
                        className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                          index === currentBannerIndex
                            ? 'bg-white w-6'
                            : 'bg-white/50 hover:bg-white/75'
                        }`}
                        aria-label={`Go to slide ${index + 1}`}
                      />
                    ))}
                  </div>
                )}

                {/* Navigation Arrows */}
                {activeBanners.length > 1 && (
                  <>
                    <button
                      onClick={() => setCurrentBannerIndex((prev) => (prev - 1 + activeBanners.length) % activeBanners.length)}
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 z-30 p-1.5 rounded-full bg-black/30 hover:bg-black/50 text-white transition-all duration-200 backdrop-blur-sm"
                      aria-label="Previous slide"
                    >
                      <ChevronDown size={16} className="rotate-90" strokeWidth={2} />
                    </button>
                    <button
                      onClick={() => setCurrentBannerIndex((prev) => (prev + 1) % activeBanners.length)}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 z-30 p-1.5 rounded-full bg-black/30 hover:bg-black/50 text-white transition-all duration-200 backdrop-blur-sm"
                      aria-label="Next slide"
                    >
                      <ChevronDown size={16} className="-rotate-90" strokeWidth={2} />
                    </button>
                  </>
                )}
              </div>

              {/* Banner Management Button */}
              <div className="absolute top-2 right-2 z-30">
                <button
                  onClick={() => setIsEditingBanner(!isEditingBanner)}
                  className={`p-1.5 rounded-lg backdrop-blur-sm transition-all ${
                    isDarkMode 
                      ? 'bg-black/30 hover:bg-black/50 text-white border border-white/20' 
                      : 'bg-white/30 hover:bg-white/50 text-gray-900 border border-gray-200'
                  }`}
                  title="Quản lý banner"
                >
                  <Edit2 size={14} />
                </button>
              </div>

              {/* Banner Management Panel */}
              {isEditingBanner && (
                <div className={`mt-4 p-4 rounded-xl border-2 ${isDarkMode ? 'bg-gray-800/90 border-gray-700' : 'bg-white border-gray-300'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Quản lý Banner
                    </h3>
                    <button
                      onClick={() => {
                        setIsEditingBanner(false);
                        setShowBannerForm(false);
                        setEditingBanner(null);
                      }}
                      className={`p-1 rounded-lg ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                    >
                      <X size={20} className={isDarkMode ? 'text-gray-300' : 'text-gray-600'} />
                    </button>
                  </div>

                  {/* Banner List */}
                  <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
                    {banners.sort((a, b) => a.order - b.order).map((banner) => (
                      <div
                        key={banner.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border ${
                          isDarkMode 
                            ? 'bg-gray-700/50 border-gray-600' 
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <ImageIcon size={20} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {banner.title}
                          </p>
                          <p className={`text-xs truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {banner.imageUrl}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              banner.isActive 
                                ? (isDarkMode ? 'bg-green-500/20 text-green-300' : 'bg-green-100 text-green-700')
                                : (isDarkMode ? 'bg-gray-600 text-gray-400' : 'bg-gray-200 text-gray-600')
                            }`}>
                              {banner.isActive ? 'Đang hiển thị' : 'Đã tắt'}
                            </span>
                            <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              Thứ tự: {banner.order}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditBanner(banner)}
                            className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-600 text-blue-400' : 'hover:bg-gray-200 text-blue-600'}`}
                            title="Sửa"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteBanner(banner.id)}
                            className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-600 text-red-400' : 'hover:bg-gray-200 text-red-600'}`}
                            title="Xóa"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Banner Button */}
                  <button
                    onClick={handleAddBanner}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                      isDarkMode
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                    }`}
                  >
                    <Plus size={18} />
                    Thêm banner mới
                  </button>

                  {/* Banner Form */}
                  {showBannerForm && (
                    <div className={`mt-4 p-4 rounded-lg border ${isDarkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-300'}`}>
                      <h4 className={`font-bold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {editingBanner ? 'Sửa banner' : 'Thêm banner mới'}
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Tiêu đề *
                          </label>
                          <input
                            type="text"
                            value={bannerForm.title}
                            onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })}
                            className={`w-full px-3 py-2 rounded-lg border ${
                              isDarkMode 
                                ? 'bg-gray-800 border-gray-600 text-white' 
                                : 'bg-white border-gray-300 text-gray-900'
                            }`}
                            placeholder="Nhập tiêu đề banner"
                          />
                        </div>
                        <div>
                          <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Ảnh banner *
                          </label>
                          
                          {/* File Upload Button */}
                          <div className="mb-2">
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="hidden"
                              id="banner-image-upload"
                              disabled={isUploadingImage}
                            />
                            <label
                              htmlFor="banner-image-upload"
                              className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all cursor-pointer ${
                                isUploadingImage
                                  ? (isDarkMode ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-gray-300 text-gray-500 cursor-not-allowed')
                                  : (isDarkMode 
                                      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                                      : 'bg-blue-500 hover:bg-blue-600 text-white')
                              }`}
                            >
                              {isUploadingImage ? (
                                <>
                                  <Loader2 size={18} className="animate-spin" />
                                  Đang tải lên...
                                </>
                              ) : (
                                <>
                                  <Upload size={18} />
                                  Chọn ảnh từ máy tính
                                </>
                              )}
                            </label>
                          </div>


                          {/* Image Preview */}
                          {imagePreview && (
                            <div className="mt-3 relative">
                              <img
                                src={imagePreview}
                                alt="Preview"
                                className="w-full h-48 rounded-lg border-2 border-gray-300 dark:border-gray-600"
                                style={{ objectFit: bannerForm.imageFit }}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/1200x400/6366f1/ffffff?text=Preview';
                                }}
                              />
                              <button
                                onClick={() => {
                                  setImagePreview(null);
                                  setBannerForm({ ...bannerForm, imageUrl: '' });
                                  if (fileInputRef.current) {
                                    fileInputRef.current.value = '';
                                  }
                                }}
                                className={`absolute top-2 right-2 p-2 rounded-full backdrop-blur-sm ${
                                  isDarkMode 
                                    ? 'bg-black/50 hover:bg-black/70 text-white' 
                                    : 'bg-white/80 hover:bg-white text-gray-900'
                                }`}
                                title="Xóa preview"
                              >
                                <X size={18} />
                              </button>
                            </div>
                          )}
                        </div>
                        <div>
                          <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Cách hiển thị ảnh
                          </label>
                          <select
                            value={bannerForm.imageFit}
                            onChange={(e) => setBannerForm({ ...bannerForm, imageFit: e.target.value as any })}
                            className={`w-full px-3 py-2 rounded-lg border ${
                              isDarkMode 
                                ? 'bg-gray-800 border-gray-600 text-white' 
                                : 'bg-white border-gray-300 text-gray-900'
                            }`}
                          >
                            <option value="cover">Cover (Che phủ toàn bộ, có thể cắt ảnh)</option>
                            <option value="contain">Contain (Vừa khung, không cắt ảnh)</option>
                            <option value="fill">Fill (Điền đầy, có thể méo ảnh)</option>
                            <option value="scale-down">Scale-down (Thu nhỏ nếu lớn hơn khung)</option>
                            <option value="none">None (Hiển thị nguyên gốc)</option>
                          </select>
                          <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Chọn cách banner hiển thị trong khung
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              Thứ tự
                            </label>
                            <input
                              type="number"
                              value={bannerForm.order}
                              onChange={(e) => setBannerForm({ ...bannerForm, order: parseInt(e.target.value) || 0 })}
                              className={`w-full px-3 py-2 rounded-lg border ${
                                isDarkMode 
                                  ? 'bg-gray-800 border-gray-600 text-white' 
                                  : 'bg-white border-gray-300 text-gray-900'
                              }`}
                              min="0"
                            />
                          </div>
                          <div className="flex items-center pt-6">
                            <label className={`flex items-center gap-2 cursor-pointer ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              <input
                                type="checkbox"
                                checked={bannerForm.isActive}
                                onChange={(e) => setBannerForm({ ...bannerForm, isActive: e.target.checked })}
                                className="w-4 h-4 rounded"
                              />
                              <span className="text-sm">Đang hiển thị</span>
                            </label>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleSaveBanner}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                              isDarkMode
                                ? 'bg-green-600 hover:bg-green-700 text-white'
                                : 'bg-green-500 hover:bg-green-600 text-white'
                            }`}
                          >
                            <Save size={18} />
                            Lưu
                          </button>
                          <button
                            onClick={() => {
                              setShowBannerForm(false);
                              setEditingBanner(null);
                            }}
                            className={`px-4 py-2 rounded-lg font-medium transition-all ${
                              isDarkMode
                                ? 'bg-gray-600 hover:bg-gray-700 text-white'
                                : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                            }`}
                          >
                            Hủy
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Banner Management when no banners exist */}
          {activeBanners.length === 0 && (
            <div className={`mb-4 p-6 rounded-xl border-2 ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-300'}`}>
              <div className="text-center">
                <ImageIcon size={48} className={`mx-auto mb-3 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                <h3 className={`text-lg font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Chưa có banner nào
                </h3>
                <p className={`text-sm mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Thêm banner đầu tiên để hiển thị trên trang chủ
                </p>
                <button
                  onClick={() => {
                    handleAddBanner();
                    setIsEditingBanner(true);
                  }}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    isDarkMode
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  <Plus size={18} />
                  Thêm banner đầu tiên
                </button>
              </div>
            </div>
          )}

          {/* Show banner form when no banners exist */}
          {showBannerForm && activeBanners.length === 0 && (
            <div className={`mb-4 p-4 rounded-xl border-2 ${isDarkMode ? 'bg-gray-800/90 border-gray-700' : 'bg-white border-gray-300'}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {editingBanner ? 'Sửa banner' : 'Thêm banner mới'}
                </h3>
                <button
                  onClick={() => {
                    setShowBannerForm(false);
                    setEditingBanner(null);
                  }}
                  className={`p-1 rounded-lg ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                >
                  <X size={20} className={isDarkMode ? 'text-gray-300' : 'text-gray-600'} />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Tiêu đề *
                  </label>
                  <input
                    type="text"
                    value={bannerForm.title}
                    onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${
                      isDarkMode 
                        ? 'bg-gray-800 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="Nhập tiêu đề banner"
                  />
                </div>
                        <div>
                          <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Ảnh banner *
                          </label>
                          
                          {/* File Upload Button */}
                          <div className="mb-2">
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="hidden"
                              id="banner-image-upload-empty"
                              disabled={isUploadingImage}
                            />
                            <label
                              htmlFor="banner-image-upload-empty"
                              className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all cursor-pointer ${
                                isUploadingImage
                                  ? (isDarkMode ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-gray-300 text-gray-500 cursor-not-allowed')
                                  : (isDarkMode 
                                      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                                      : 'bg-blue-500 hover:bg-blue-600 text-white')
                              }`}
                            >
                              {isUploadingImage ? (
                                <>
                                  <Loader2 size={18} className="animate-spin" />
                                  Đang tải lên...
                                </>
                              ) : (
                                <>
                                  <Upload size={18} />
                                  Chọn ảnh từ máy tính
                                </>
                              )}
                            </label>
          </div>


                          {/* Image Preview */}
                          {imagePreview && (
                            <div className="mt-3 relative">
                              <img
                                src={imagePreview}
                                alt="Preview"
                                className="w-full h-48 rounded-lg border-2 border-gray-300 dark:border-gray-600"
                                style={{ objectFit: bannerForm.imageFit }}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/1200x400/6366f1/ffffff?text=Preview';
                                }}
                              />
                              <button
                                onClick={() => {
                                  setImagePreview(null);
                                  setBannerForm({ ...bannerForm, imageUrl: '' });
                                  if (fileInputRef.current) {
                                    fileInputRef.current.value = '';
                                  }
                                }}
                                className={`absolute top-2 right-2 p-2 rounded-full backdrop-blur-sm ${
                                  isDarkMode 
                                    ? 'bg-black/50 hover:bg-black/70 text-white' 
                                    : 'bg-white/80 hover:bg-white text-gray-900'
                                }`}
                                title="Xóa preview"
                              >
                                <X size={18} />
                              </button>
                            </div>
                          )}
                        </div>
                        <div>
                          <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Cách hiển thị ảnh
                          </label>
                          <select
                            value={bannerForm.imageFit}
                            onChange={(e) => setBannerForm({ ...bannerForm, imageFit: e.target.value as any })}
                            className={`w-full px-3 py-2 rounded-lg border ${
                              isDarkMode 
                                ? 'bg-gray-800 border-gray-600 text-white' 
                                : 'bg-white border-gray-300 text-gray-900'
                            }`}
                          >
                            <option value="cover">Cover (Che phủ toàn bộ, có thể cắt ảnh)</option>
                            <option value="contain">Contain (Vừa khung, không cắt ảnh)</option>
                            <option value="fill">Fill (Điền đầy, có thể méo ảnh)</option>
                            <option value="scale-down">Scale-down (Thu nhỏ nếu lớn hơn khung)</option>
                            <option value="none">None (Hiển thị nguyên gốc)</option>
                          </select>
                          <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Chọn cách banner hiển thị trong khung
                          </p>
                        </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Thứ tự
                    </label>
                    <input
                      type="number"
                      value={bannerForm.order}
                      onChange={(e) => setBannerForm({ ...bannerForm, order: parseInt(e.target.value) || 0 })}
                      className={`w-full px-3 py-2 rounded-lg border ${
                        isDarkMode 
                          ? 'bg-gray-800 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      min="0"
                    />
                  </div>
                  <div className="flex items-center pt-6">
                    <label className={`flex items-center gap-2 cursor-pointer ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      <input
                        type="checkbox"
                        checked={bannerForm.isActive}
                        onChange={(e) => setBannerForm({ ...bannerForm, isActive: e.target.checked })}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-sm">Đang hiển thị</span>
                    </label>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveBanner}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                      isDarkMode
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-green-500 hover:bg-green-600 text-white'
                    }`}
                  >
                    <Save size={18} />
                    Lưu
                  </button>
                  <button
                    onClick={() => {
                      setShowBannerForm(false);
                      setEditingBanner(null);
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      isDarkMode
                        ? 'bg-gray-600 hover:bg-gray-700 text-white'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                    }`}
                  >
                    Hủy
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Activities Dashboard - 2 Column Layout */}
          <div>
            <ActivityDashboardLayout 
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
