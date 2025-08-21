'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import StudentNav from '@/components/student/StudentNav';
import Footer from '@/components/common/Footer';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import Image from 'next/image';

interface ProfileForm {
  name: string;
  email: string;
  phone: string;
  avatarUrl: string;
  faculty: string;
  class: string;
}

export default function StudentProfile() {
  const { user, updateUser } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const [formData, setFormData] = useState<ProfileForm>({
    name: '',
    email: '',
    phone: '',
    avatarUrl: '',
    faculty: '',
    class: ''
  });

  const [membershipData, setMembershipData] = useState<{
    status: string;
    createdAt: string;
  } | null>(null);

  // Load theme from localStorage on component mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
    }

    // Listen for theme changes from StudentNav
    const handleThemeChange = () => {
      const currentTheme = localStorage.getItem('theme');
      setIsDarkMode(currentTheme === 'dark');
    };

    window.addEventListener('themeChange', handleThemeChange);
    return () => window.removeEventListener('themeChange', handleThemeChange);
  }, []);

  // Load user data into form
  useEffect(() => {
    if (user) {
      console.log('Loading user data into form:', user);
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        avatarUrl: user.avatarUrl || '',
        faculty: user.faculty || '',
        class: user.class || ''
      });
    }
  }, [user]);

  // Refresh user data on component mount
  useEffect(() => {
    refreshUserData();
    loadMembershipData();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    console.log('Submitting form data:', formData);

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
      console.log('API response:', data);

      if (data.success) {
        // Update user data in auth context
        updateUser(formData);
        
        // Update localStorage with new user data
        const updatedUser = { ...user, ...formData };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch('/api/upload/avatar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        // Update form data with new avatar URL
        setFormData(prev => ({ ...prev, avatarUrl: data.url }));
        
        // Update user data in auth context
        updateUser({ ...formData, avatarUrl: data.url });
        
        // Emit event to notify StudentNav about avatar change
        window.dispatchEvent(new CustomEvent('avatarUploaded', { 
          detail: { avatarUrl: data.url } 
        }));
        
        setMessage({ type: 'success', text: 'Tải ảnh đại diện thành công!' });

        // Check if avatar URL was saved to database
        setTimeout(async () => {
          try {
            const checkResponse = await fetch('/api/users/check', {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            });
            
            if (checkResponse.ok) {
              const checkData = await checkResponse.json();
              console.log('User data from database:', checkData.user);
              if (checkData.user.avatarUrl === data.url) {
                console.log('✅ Avatar URL successfully saved to database!');
              } else {
                console.log('❌ Avatar URL not saved to database');
              }
            }
          } catch (error) {
            console.error('Error checking database:', error);
          }
        }, 1000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Tải ảnh thất bại' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Lỗi tải ảnh. Vui lòng thử lại.' });
    } finally {
      setLoading(false);
    }
  };

  // Danh sách khoa/viện
  const facultyOptions = [
    'Trường Kinh Tế Tài Chính',
    'Trường Luật Và Quản Lí Phát Triển',
    'Viện Kỹ Thuật Công Nghệ',
    'Viện Đào Tạo Ngoại Ngữ',
    'Viện Đào Tạo CNTT Chuyển Đổi Số',
    'Viện Đào Tạo Kiến Trúc Xây Dựng Và Giao Thông',
    'Khoa Sư Phạm',
    'Khoa Kiến Thức Chung',
    'Khoa Công Nghiệp Văn Hóa Thể Thao Và Du Lịch',
    'Ban Quản Lý Đào Tạo Sau Đại Học',
    'Khác'
  ];

  // Refresh user data from database
  const refreshUserData = async () => {
    try {
      const response = await fetch('/api/users/check', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Fresh user data from database:', data.user);
        
        // Update localStorage and auth context
        localStorage.setItem('user', JSON.stringify(data.user));
        updateUser(data.user);
        
        // Reload form data
        setFormData({
          name: data.user.name || '',
          email: data.user.email || '',
          phone: data.user.phone || '',
          avatarUrl: data.user.avatarUrl || '',
          faculty: data.user.faculty || '',
          class: data.user.class || ''
        });
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  // Load membership data from database
  const loadMembershipData = async () => {
    try {
      const response = await fetch('/api/memberships/my-status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Membership data:', data);
        setMembershipData(data.membership);
      }
    } catch (error) {
      console.error('Error loading membership data:', error);
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

  // Get status display info
  const getStatusDisplay = (status: string | null) => {
    if (!status) {
      return { color: 'bg-gray-100 text-gray-800', text: 'Chưa đăng ký' };
    }
    
    const statusMap = {
      ACTIVE: { color: 'bg-green-100 text-green-800', text: 'Hoạt động' },
      INACTIVE: { color: 'bg-red-100 text-red-800', text: 'Không hoạt động' },
      PENDING: { color: 'bg-yellow-100 text-yellow-800', text: 'Chờ duyệt' },
      REJECTED: { color: 'bg-orange-100 text-orange-800', text: 'Đã từ chối' },
      REMOVED: { color: 'bg-red-100 text-red-800', text: 'Đã xóa' }
    };
    return statusMap[status as keyof typeof statusMap] || { color: 'bg-gray-100 text-gray-800', text: 'Không xác định' };
  };

  return (
    <ProtectedRoute requiredRole="STUDENT">
      <div className={`min-h-screen flex flex-col transition-colors duration-200 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <StudentNav />
        
        <main className="flex-1 max-w-4xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex justify-between items-start">
              <div>
                <h1 className={`text-2xl sm:text-3xl font-bold mb-2 transition-colors duration-200 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Hồ sơ cá nhân
                </h1>
                <p className={`text-sm sm:text-base transition-colors duration-200 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Quản lý thông tin cá nhân và cài đặt tài khoản
                </p>
              </div>
              <button
                onClick={refreshUserData}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  isDarkMode 
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                title="Làm mới dữ liệu"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>

          {/* Message */}
          {message && (
            <div className={`mb-6 p-4 rounded-lg ${
              message.type === 'success' 
                ? 'bg-green-50 border border-green-200 text-green-700' 
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              <div className="flex items-center">
                {message.type === 'success' ? (
                  <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                {message.text}
              </div>
            </div>
          )}

                     <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 sm:gap-8">
             {/* Profile Card */}
             <div className="lg:col-span-2">
              <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg shadow-md border p-6`}>
                <div className="text-center">
                  {/* Avatar */}
                  <div className="relative inline-block mb-4">
                    {formData.avatarUrl ? (
                      <Image
                        src={formData.avatarUrl}
                        alt="Avatar"
                        width={120}
                        height={120}
                        className="rounded-full border-4 border-green-500"
                      />
                    ) : (
                      <div className="w-30 h-30 rounded-full bg-green-600 flex items-center justify-center border-4 border-green-500">
                        <span className="text-white text-3xl font-bold">
                          {getInitials(formData.name)}
                        </span>
                      </div>
                    )}
                    
                    {/* Upload Button */}
                    <label className="absolute bottom-0 right-0 bg-green-600 text-white p-2 rounded-full cursor-pointer hover:bg-green-700 transition-colors">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                        disabled={loading}
                      />
                    </label>
                  </div>

                  {/* User Info */}
                  <h2 className={`text-xl font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {formData.name}
                  </h2>
                                     <p className={`text-sm mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} break-all`}>
                     {formData.email}
                   </p>
                  <p className={`text-sm mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    {formData.phone || 'Chưa cập nhật số điện thoại'}
                  </p>

                  {/* Role Badge */}
                  <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    <span className="mr-2">👨‍🎓</span>
                    THÀNH VIÊN CLB
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className={`text-2xl font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                        5
                      </div>
                      <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Hoạt động tham gia
                      </div>
                    </div>
                    <div>
                      <div className={`text-2xl font-bold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                        127
                      </div>
                      <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Ngày tham gia
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

                         {/* Profile Form */}
             <div className="lg:col-span-3">
              <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg shadow-md border`}>
                <div className={`px-6 py-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <div className="flex justify-between items-center">
                    <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Thông tin cá nhân
                    </h3>
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                        isEditing
                          ? 'bg-gray-600 text-white hover:bg-gray-700'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      {isEditing ? 'Hủy' : 'Chỉnh sửa'}
                    </button>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Name */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Họ và tên
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        disabled={!isEditing || loading}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors ${
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
                        Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        disabled={!isEditing || loading}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors ${
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
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white disabled:bg-gray-800 disabled:text-gray-400' 
                            : 'bg-white border-gray-300 text-gray-900 disabled:bg-gray-50 disabled:text-gray-500'
                        }`}
                        placeholder="0934567890"
                      />
                    </div>

                    {/* Student ID */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Mã số sinh viên
                      </label>
                      <input
                        type="text"
                        value={user?.studentId || ''}
                        disabled
                        className={`w-full px-3 py-2 border rounded-md ${
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
                      <select
                        name="faculty"
                        value={formData.faculty}
                        onChange={handleInputChange}
                        disabled={!isEditing || loading}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white disabled:bg-gray-800 disabled:text-gray-400' 
                            : 'bg-white border-gray-300 text-gray-900 disabled:bg-gray-50 disabled:text-gray-500'
                        }`}
                      >
                        <option value="">Chọn khoa/viện</option>
                        {facultyOptions.map((faculty) => (
                          <option key={faculty} value={faculty}>
                            {faculty}
                          </option>
                        ))}
                      </select>
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
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white disabled:bg-gray-800 disabled:text-gray-400' 
                            : 'bg-white border-gray-300 text-gray-900 disabled:bg-gray-50 disabled:text-gray-500'
                        }`}
                        placeholder="VD: CNTT-K45"
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  {isEditing && (
                    <div className="mt-6 flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className={`px-4 py-2 text-sm font-medium rounded-md border transition-colors ${
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
                        className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {loading ? (
                          <div className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Đang cập nhật...
                          </div>
                        ) : (
                          'Lưu thay đổi'
                        )}
                      </button>
                    </div>
                  )}
                </form>
              </div>

              {/* Membership Status */}
              <div className={`mt-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg shadow-md border`}>
                <div className={`px-6 py-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Trạng thái thành viên
                  </h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                                         <div className="flex items-center justify-between">
                       <div>
                         <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                           Trạng thái CLB
                         </h4>
                         <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                           Thông tin về tư cách thành viên
                         </p>
                       </div>
                       {membershipData ? (
                         <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusDisplay(membershipData.status).color}`}>
                           {getStatusDisplay(membershipData.status).text}
                         </span>
                       ) : (
                         <a 
                           href="/student/register"
                           className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusDisplay(null).color} hover:opacity-80 transition-opacity cursor-pointer`}
                         >
                           {getStatusDisplay(null).text}
                         </a>
                       )}
                     </div>
                    
                                         <div className="flex items-center justify-between">
                       <div>
                         <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                           Ngày tham gia
                         </h4>
                         <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                           Thời gian chính thức trở thành thành viên
                         </p>
                       </div>
                       <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                         {membershipData?.createdAt ? new Date(membershipData.createdAt).toLocaleDateString('vi-VN') : 'Chưa đăng ký'}
                       </span>
                     </div>
                  </div>
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
