  'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import AdminNav from '@/components/admin/AdminNav';
import Footer from '@/components/common/Footer';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import Image from 'next/image';
import Link from 'next/link';
import { 
  User, Mail, Phone, GraduationCap, Building2, Lock, 
  Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, 
  Edit2, Save, X, Calendar, Shield, Camera, Key
} from 'lucide-react';
import { validatePassword, getPasswordRequirements } from '@/lib/passwordValidation';

interface ProfileForm {
  name: string;
  email: string;
  phone: string;
  avatarUrl: string;
  faculty?: string;
  class?: string;
  position?: string;
  department?: string;
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function AdminProfile() {
  const { user, updateUser } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const [formData, setFormData] = useState<ProfileForm>({
    name: '',
    email: '',
    phone: '',
    avatarUrl: '',
    faculty: '',
    class: '',
    position: '',
    department: ''
  });

  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);

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
      window.removeEventListener('themeChange', handleThemeChange);
      window.removeEventListener('sidebarStateChange', handleSidebarChange);
      clearInterval(intervalId);
    };
  }, []);

  // Load user data
  // Check if user has password
  useEffect(() => {
    const checkPassword = async () => {
      if (!user) return;
      
      try {
        console.log('Checking if user has password...');
        const response = await fetch('/api/users/has-password', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        const data = await response.json();
        console.log('Has password response:', data);
        
        if (data.success) {
          setHasPassword(data.hasPassword);
          console.log('User has password:', data.hasPassword);
        } else {
          console.warn('Failed to check password, defaulting to true');
          // Fallback: assume user has password if they logged in with email/password
          setHasPassword(true);
        }
      } catch (error) {
        console.error('Error checking password:', error);
        // If error, check if user logged in with Google (no password) or email/password (has password)
        // For now, default to true for safety
        setHasPassword(true);
      }
    };
    
    if (user) {
      checkPassword();
    }
  }, [user]);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const response = await fetch('/api/users/profile', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user) {
            setFormData({
              name: data.user.name || '',
              email: data.user.email || '',
              phone: data.user.phone || '',
              avatarUrl: data.user.avatarUrl || '',
              faculty: data.user.faculty || '',
              class: data.user.class || '',
              position: data.user.position || '',
              department: data.user.department || ''
            });
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };

    if (user) {
      loadUserData();
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        updateUser(data.user);
        setMessage({ type: 'success', text: 'Cập nhật thông tin thành công!' });
        setIsEditing(false);
      } else {
        setMessage({ type: 'error', text: data.error || 'Cập nhật thất bại' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Lỗi kết nối. Vui lòng thử lại.' });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordMessage(null);

    // Validation
    const passwordValidation = validatePassword(passwordForm.newPassword);
    if (!passwordValidation.valid) {
      setPasswordMessage({ type: 'error', text: passwordValidation.error || 'Mật khẩu không hợp lệ' });
      setPasswordLoading(false);
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Mật khẩu xác nhận không khớp' });
      setPasswordLoading(false);
      return;
    }

    // If user has password, validate current password is provided
    if (hasPassword === true && !passwordForm.currentPassword) {
      setPasswordMessage({ type: 'error', text: 'Vui lòng nhập mật khẩu hiện tại' });
      setPasswordLoading(false);
      return;
    }

    try {
      // Prepare request body - only include currentPassword if user has password
      const requestBody: { newPassword: string; currentPassword?: string } = {
        newPassword: passwordForm.newPassword
      };
      
      // Only add currentPassword if user has password
      if (hasPassword === true) {
        requestBody.currentPassword = passwordForm.currentPassword;
      }

      const response = await fetch('/api/users/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.success) {
        setPasswordMessage({ type: 'success', text: hasPassword ? 'Đổi mật khẩu thành công!' : 'Thêm mật khẩu thành công! Bây giờ bạn có thể đăng nhập bằng email/mật khẩu.' });
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setHasPassword(true);
        setTimeout(() => {
          setShowChangePassword(false);
          setPasswordMessage(null);
        }, 2000);
      } else {
        // Show error message
        const errorText = data.error || 'Đổi mật khẩu thất bại';
        setPasswordMessage({ type: 'error', text: errorText });
      }
    } catch (error) {
      setPasswordMessage({ type: 'error', text: 'Lỗi kết nối. Vui lòng thử lại.' });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setMessage(null);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('avatar', file);

      const response = await fetch('/api/upload/avatar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: uploadFormData,
      });

      const data = await response.json();

      if (data.success) {
        setFormData(prev => ({ ...prev, avatarUrl: data.url }));
        updateUser({ ...formData, avatarUrl: data.url });
        
        window.dispatchEvent(new CustomEvent('avatarUploaded', { 
          detail: { avatarUrl: data.url } 
        }));
        
        setMessage({ type: 'success', text: 'Tải ảnh đại diện thành công!' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Tải ảnh thất bại' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Lỗi tải ảnh. Vui lòng thử lại.' });
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadge = (role: string) => {
    const roleConfig: { [key: string]: { label: string; color: string; bgColor: string } } = {
      'SUPER_ADMIN': { label: 'SUPER ADMIN', color: 'text-red-700', bgColor: 'bg-red-100' },
      'ADMIN': { label: 'ADMIN', color: 'text-red-700', bgColor: 'bg-red-100' },
      'CLUB_LEADER': { label: 'CHỦ NHIỆM CLB', color: 'text-purple-700', bgColor: 'bg-purple-100' },
      'CLUB_DEPUTY': { label: 'PHÓ CHỦ NHIỆM', color: 'text-blue-700', bgColor: 'bg-blue-100' },
      'CLUB_MEMBER': { label: 'THÀNH VIÊN CLB', color: 'text-green-700', bgColor: 'bg-green-100' },
      'CLUB_STUDENT': { label: 'SINH VIÊN CLB', color: 'text-indigo-700', bgColor: 'bg-indigo-100' },
      'STUDENT': { label: 'SINH VIÊN', color: 'text-gray-700', bgColor: 'bg-gray-100' }
    };

    const config = roleConfig[role] || roleConfig['STUDENT'];
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${config.bgColor} ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const formatDate = (date: string | Date) => {
    if (!date) return 'Chưa cập nhật';
    const d = new Date(date);
    return d.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <ProtectedRoute requiredRole="CLUB_LEADER">
      <div 
        className={`min-h-screen flex flex-col transition-colors duration-200 overflow-x-hidden ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}
        style={{
          '--sidebar-width': isSidebarOpen ? '288px' : '80px'
        } as React.CSSProperties}
      >
        <AdminNav />
        
        <main 
          className="flex-1 transition-all duration-300 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 overflow-x-hidden min-w-0"
          style={{
            marginLeft: isDesktop ? (isSidebarOpen ? '288px' : '80px') : '0',
            width: isDesktop ? `calc(100% - ${isSidebarOpen ? '288px' : '80px'})` : '100%',
            maxWidth: isDesktop ? `calc(100% - ${isSidebarOpen ? '288px' : '80px'})` : '100%'
          }}
        >
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <h1 className={`text-2xl sm:text-3xl font-bold mb-2 transition-colors duration-200 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Hồ sơ cá nhân
            </h1>
            <p className={`text-sm sm:text-base transition-colors duration-200 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Quản lý thông tin cá nhân và cài đặt tài khoản
            </p>
          </div>

          {/* Messages */}
          {message && (
            <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
              message.type === 'success' 
                ? 'bg-green-50 border border-green-200 text-green-700' 
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
              )}
              <span className="text-sm">{message.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile Card */}
            <div className="lg:col-span-1">
              <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-lg border overflow-hidden`}>
                <div className="p-6 text-center">
                  {/* Avatar */}
                  <div className="relative inline-block mb-4">
                    {formData.avatarUrl ? (
                      <div className="relative">
                        <Image
                          src={formData.avatarUrl}
                          alt="Avatar"
                          width={120}
                          height={120}
                          className="rounded-full border-4 border-purple-500 object-cover"
                        />
                        <label className="absolute bottom-0 right-0 bg-purple-600 text-white p-2.5 rounded-full cursor-pointer hover:bg-purple-700 transition-colors shadow-lg">
                          <Camera className="h-4 w-4" />
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarUpload}
                            className="hidden"
                            disabled={loading}
                          />
                        </label>
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="w-30 h-30 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center border-4 border-purple-500 shadow-lg">
                          <span className="text-white text-3xl font-bold">
                            {getInitials(formData.name || user?.name || '')}
                          </span>
                        </div>
                        <label className="absolute bottom-0 right-0 bg-purple-600 text-white p-2.5 rounded-full cursor-pointer hover:bg-purple-700 transition-colors shadow-lg">
                          <Camera className="h-4 w-4" />
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarUpload}
                            className="hidden"
                            disabled={loading}
                          />
                        </label>
                      </div>
                    )}
                  </div>

                  {/* User Info */}
                  <h2 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {formData.name || user?.name || 'Chưa có thông tin'}
                  </h2>
                  <div className="space-y-2 mb-4">
                    <p className={`text-sm flex items-center justify-center gap-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      <Mail className="h-4 w-4" />
                      {formData.email || user?.email || 'Chưa có thông tin'}
                    </p>
                    <p className={`text-sm flex items-center justify-center gap-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      <Phone className="h-4 w-4" />
                      {formData.phone || 'Chưa có thông tin'}
                    </p>
                    <p className={`text-sm flex items-center justify-center gap-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      <User className="h-4 w-4" />
                      {user?.studentId || 'Chưa có thông tin'}
                    </p>
                    <p className={`text-sm flex items-center justify-center gap-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      <Building2 className="h-4 w-4" />
                      {formData.faculty || 'Chưa có thông tin'}
                    </p>
                    <p className={`text-sm flex items-center justify-center gap-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      <GraduationCap className="h-4 w-4" />
                      {formData.class || 'Chưa có thông tin'}
                    </p>
                  </div>

                  {/* Role Badge */}
                  <div className="mb-4">
                    {getRoleBadge(user?.role || 'STUDENT')}
                  </div>

                  {/* Account Info */}
                  <div className={`mt-6 pt-6 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                    <div className="space-y-3 text-left">
                      <div className="flex items-center justify-between text-sm">
                        <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Ngày tạo:</span>
                        <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700 font-medium'}>
                          {user?.createdAt ? formatDate(user.createdAt) : 'Chưa có thông tin'}
                        </span>
                      </div>
                      {(user as any)?.googleId && (
                        <div className="flex items-center gap-2 text-sm">
                          <Shield className="h-4 w-4 text-green-500" />
                          <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                            Đăng nhập bằng Google
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Form & Settings */}
            <div className="lg:col-span-2 space-y-6">
              {/* Profile Information */}
              <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-lg border`}>
                <div className={`px-6 py-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-between items-center`}>
                  <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Thông tin cá nhân
                  </h3>
                  <button
                    onClick={() => {
                      setIsEditing(!isEditing);
                      setMessage(null);
                    }}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      isEditing
                        ? 'bg-gray-600 text-white hover:bg-gray-700'
                        : 'bg-purple-600 text-white hover:bg-purple-700'
                    }`}
                  >
                    {isEditing ? (
                      <>
                        <X className="h-4 w-4" />
                        Hủy
                      </>
                    ) : (
                      <>
                        <Edit2 className="h-4 w-4" />
                        Chỉnh sửa
                      </>
                    )}
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Name */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Họ và tên <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        disabled={!isEditing || loading}
                        className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white disabled:bg-gray-800 disabled:text-gray-400' 
                            : 'bg-white border-gray-300 text-gray-900 disabled:bg-gray-50 disabled:text-gray-500'
                        }`}
                        required
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        disabled={!isEditing || loading}
                        className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white disabled:bg-gray-800 disabled:text-gray-400' 
                            : 'bg-white border-gray-300 text-gray-900 disabled:bg-gray-50 disabled:text-gray-500'
                        }`}
                        required
                      />
                    </div>

                    {/* Phone */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Số điện thoại
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        disabled={!isEditing || loading}
                        className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white disabled:bg-gray-800 disabled:text-gray-400' 
                            : 'bg-white border-gray-300 text-gray-900 disabled:bg-gray-50 disabled:text-gray-500'
                        }`}
                        placeholder="Chưa có thông tin"
                      />
                    </div>

                    {/* Student ID */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Mã số sinh viên
                      </label>
                      <input
                        type="text"
                        value={user?.studentId || 'Chưa có thông tin'}
                        disabled
                        className={`w-full px-4 py-2.5 border rounded-lg ${
                          isDarkMode 
                            ? 'bg-gray-800 border-gray-600 text-gray-400' 
                            : 'bg-gray-50 border-gray-300 text-gray-500'
                        }`}
                      />
                    </div>

                    {/* Faculty */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Khoa/Viện
                      </label>
                      <input
                        type="text"
                        name="faculty"
                        value={formData.faculty}
                        onChange={handleInputChange}
                        disabled={!isEditing || loading}
                        className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white disabled:bg-gray-800 disabled:text-gray-400' 
                            : 'bg-white border-gray-300 text-gray-900 disabled:bg-gray-50 disabled:text-gray-500'
                        }`}
                        placeholder="Chưa có thông tin"
                      />
                    </div>

                    {/* Class */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Lớp
                      </label>
                      <input
                        type="text"
                        name="class"
                        value={formData.class}
                        onChange={handleInputChange}
                        disabled={!isEditing || loading}
                        className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white disabled:bg-gray-800 disabled:text-gray-400' 
                            : 'bg-white border-gray-300 text-gray-900 disabled:bg-gray-50 disabled:text-gray-500'
                        }`}
                        placeholder="Chưa có thông tin"
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  {isEditing && (
                    <div className="mt-6 flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditing(false);
                          setMessage(null);
                        }}
                        className={`px-5 py-2.5 text-sm font-medium rounded-lg border transition-colors ${
                          isDarkMode 
                            ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                        disabled={loading}
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Đang cập nhật...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            Lưu thay đổi
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </form>
              </div>

              {/* Security Settings */}
              <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-lg border`}>
                <div className={`px-6 py-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Bảo mật tài khoản
                  </h3>
                </div>
                <div className="p-6">
                  {!showChangePassword ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className={`font-medium mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          Đổi mật khẩu
                        </h4>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {hasPassword === false 
                            ? 'Thêm mật khẩu để có thể đăng nhập bằng email/mật khẩu'
                            : 'Cập nhật mật khẩu để bảo mật tài khoản'}
                        </p>
                      </div>
                      <button
                        onClick={() => setShowChangePassword(true)}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-purple-600 hover:text-purple-700 transition-colors"
                      >
                        <Key className="h-4 w-4" />
                        {hasPassword === false ? "Thêm mật khẩu" : "Thay đổi"}
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handlePasswordSubmit} className="space-y-4">
                      <div>
                        <h4 className={`font-medium mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {hasPassword === false ? 'Thêm mật khẩu' : 'Đổi mật khẩu'}
                        </h4>
                        
                        {passwordMessage && (
                          <div className={`mb-4 p-3 rounded-lg ${
                            passwordMessage.type === 'success' 
                              ? 'bg-green-50 border border-green-200 text-green-700' 
                              : 'bg-red-50 border border-red-200 text-red-700'
                          }`}>
                            <div className="flex items-start gap-2">
                              {passwordMessage.type === 'success' ? (
                                <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" />
                              ) : (
                                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                              )}
                              <div className="flex-1">
                                <p className="text-sm whitespace-pre-line">{passwordMessage.text}</p>
                                {passwordMessage.type === 'error' && 
                                 passwordMessage.text.includes('Mật khẩu hiện tại không đúng') && 
                                 hasPassword === true && (
                                  <div className="mt-3 space-y-2">
                                    <p className="text-xs font-medium">Gợi ý:</p>
                                    <ul className="text-xs space-y-1 list-disc list-inside">
                                      <li>Đảm bảo Caps Lock không bật</li>
                                      <li>Kiểm tra bạn đang nhập đúng mật khẩu dùng để đăng nhập</li>
                                      <li>Nếu quên mật khẩu, hãy sử dụng chức năng bên dưới</li>
                                    </ul>
                                    <div className="pt-2">
                                      <Link
                                        href="/auth/forgot-password"
                                        className="text-sm text-purple-600 hover:text-purple-700 underline font-medium"
                                      >
                                        Quên mật khẩu? Đặt lại mật khẩu →
                                      </Link>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Info message for adding password */}
                        {hasPassword === false && (
                          <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
                            isDarkMode 
                              ? 'bg-blue-900/30 border border-blue-700 text-blue-300' 
                              : 'bg-blue-50 border border-blue-200 text-blue-700'
                          }`}>
                            <AlertCircle className="h-4 w-4 flex-shrink-0" />
                            <span className="text-sm">
                              Bạn chưa có mật khẩu. Thêm mật khẩu để có thể đăng nhập bằng email/mật khẩu ngoài Google.
                            </span>
                          </div>
                        )}

                        <div className="space-y-4">
                          {/* Only show current password field if user has password */}
                          {hasPassword === true && (
                            <div>
                              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                Mật khẩu hiện tại <span className="text-red-500">*</span>
                              </label>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                              <input
                                type={showPasswords.current ? 'text' : 'password'}
                                name="currentPassword"
                                value={passwordForm.currentPassword}
                                onChange={handlePasswordChange}
                                className={`w-full pl-10 pr-10 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                                  isDarkMode 
                                    ? 'bg-gray-700 border-gray-600 text-white' 
                                    : 'bg-white border-gray-300 text-gray-900'
                                }`}
                                required
                                placeholder="Nhập mật khẩu hiện tại"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                              >
                                {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                            </div>
                          )}

                          <div>
                            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              {hasPassword === false ? 'Mật khẩu' : 'Mật khẩu mới'} <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                              <input
                                type={showPasswords.new ? 'text' : 'password'}
                                name="newPassword"
                                value={passwordForm.newPassword}
                                onChange={handlePasswordChange}
                                className={`w-full pl-10 pr-10 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                                  isDarkMode 
                                    ? 'bg-gray-700 border-gray-600 text-white' 
                                    : 'bg-white border-gray-300 text-gray-900'
                                }`}
                                placeholder={hasPassword === false ? 'Nhập mật khẩu mới' : 'Nhập mật khẩu mới'}
                                required
                              />
                              <button
                                type="button"
                                onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                              >
                                {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              Xác nhận mật khẩu {hasPassword === false ? '' : 'mới'} <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                              <input
                                type={showPasswords.confirm ? 'text' : 'password'}
                                name="confirmPassword"
                                value={passwordForm.confirmPassword}
                                onChange={handlePasswordChange}
                                className={`w-full pl-10 pr-10 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                                  isDarkMode 
                                    ? 'bg-gray-700 border-gray-600 text-white' 
                                    : 'bg-white border-gray-300 text-gray-900'
                                }`}
                                placeholder="Nhập lại mật khẩu"
                                required
                              />
                              <button
                                type="button"
                                onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                              >
                                {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>

                          {/* Password Requirements */}
                          <div className={`mt-4 p-3 rounded-lg ${
                            isDarkMode 
                              ? 'bg-gray-700 border border-gray-600' 
                              : 'bg-gray-50 border border-gray-200'
                          }`}>
                            <p className={`text-xs font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              Yêu cầu mật khẩu:
                            </p>
                            <ul className={`text-xs space-y-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              <li>• Tối thiểu 8 ký tự</li>
                              <li>• Có ít nhất 1 chữ hoa</li>
                              <li>• Có ít nhất 1 chữ thường</li>
                              <li>• Có ít nhất 1 số</li>
                            </ul>
                          </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setShowChangePassword(false);
                              setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                              setPasswordMessage(null);
                            }}
                            className={`px-5 py-2.5 text-sm font-medium rounded-lg border transition-colors ${
                              isDarkMode 
                                ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            Hủy
                          </button>
                          <button
                            type="submit"
                            disabled={passwordLoading}
                            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {passwordLoading ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Đang xử lý...
                              </>
                            ) : (
                              <>
                                <Save className="h-4 w-4" />
                                Đổi mật khẩu
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>

        <Footer isDarkMode={isDarkMode} />
      </div>
    </ProtectedRoute>
  );
}
