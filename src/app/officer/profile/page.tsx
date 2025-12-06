'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import OfficerNav from '@/components/officer/OfficerNav';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import { Lock, Eye, EyeOff, Key, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { validatePassword, getPasswordRequirements } from '@/lib/passwordValidation';

interface ProfileForm {
  name: string;
  email: string;
  phone: string;
  avatarUrl: string;
  class: string;
  faculty: string;
}

export default function OfficerProfile() {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [customFaculty, setCustomFaculty] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);

  const [formData, setFormData] = useState<ProfileForm>({
    name: '',
    email: '',
    phone: '',
    avatarUrl: '',
    class: '',
    faculty: ''
  });

  // Load theme from localStorage on component mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Load user data on component mount
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        avatarUrl: user.avatarUrl || '',
        class: user.class || '',
        faculty: user.faculty || ''
      });
      
      // Set custom faculty if user has a custom faculty value
      if (user.faculty && ![
        'Trường Kinh Tế Tài Chính',
        'Trường Luật Và Quản Lí Phát Triển',
        'Viện Kỹ Thuật Công Nghệ',
        'Viện Đào Tạo Ngoại Ngữ',
        'Viện Đào Tạo CNTT Chuyển Đổi Số',
        'Viện Đào Tạo Kiến Trúc Xây Dựng Và Giao Thông',
        'Khoa Sư Phạm',
        'Khoa Kiến Thức Chung',
        'Khoa Công Nghiệp Văn Hóa Thể Thao Và Du Lịch',
        'Ban Quản Lý Đào Tạo Sau Đại Học'
      ].includes(user.faculty)) {
        setCustomFaculty(user.faculty);
      }
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        // Update user data in auth context with complete data from API
        updateUser(data.user);
        
        // Update localStorage with complete user data
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Update form data with the complete user data
        setFormData({
          name: data.user.name || '',
          email: data.user.email || '',
          phone: data.user.phone || '',
          avatarUrl: data.user.avatarUrl || '',
          class: data.user.class || '',
          faculty: data.user.faculty || ''
        });
        
        setMessage({ type: 'success', text: 'Cập nhật thông tin thành công!' });
        setIsEditing(false);
      } else {
        setMessage({ type: 'error', text: data.error || 'Có lỗi xảy ra khi cập nhật thông tin' });
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: 'Có lỗi xảy ra khi cập nhật thông tin' });
    } finally {
      setIsLoading(false);
    }
  };

  // Check if user has password
  useEffect(() => {
    const checkPassword = async () => {
      try {
        const response = await fetch("/api/users/change-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ currentPassword: "", newPassword: "test" }),
        });
        const data = await response.json();
        setHasPassword(data.error?.includes("mật khẩu hiện tại") || false);
      } catch (error) {
        setHasPassword(false);
      }
    };
    checkPassword();
  }, [user]);

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
    if (passwordMessage) setPasswordMessage(null);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordMessage(null);

    const passwordValidation = validatePassword(passwordForm.newPassword);
    if (!passwordValidation.valid) {
      setPasswordMessage({ type: "error", text: passwordValidation.error || "Mật khẩu không hợp lệ" });
      setPasswordLoading(false);
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage({ type: "error", text: "Mật khẩu xác nhận không khớp" });
      setPasswordLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/users/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword || undefined,
          newPassword: passwordForm.newPassword,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setPasswordMessage({ type: "success", text: hasPassword ? "Đổi mật khẩu thành công!" : "Thêm mật khẩu thành công! Bây giờ bạn có thể đăng nhập bằng email/mật khẩu." });
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
        setHasPassword(true);
        setTimeout(() => {
          setShowChangePassword(false);
          setPasswordMessage(null);
        }, 2000);
      } else {
        setPasswordMessage({ type: "error", text: data.error || "Thất bại" });
      }
    } catch (error) {
      setPasswordMessage({ type: "error", text: "Lỗi kết nối. Vui lòng thử lại." });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const response = await fetch('/api/upload/avatar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        // Update form data with new avatar URL
        setFormData(prev => ({ ...prev, avatarUrl: data.url }));
        
        // Update user data in auth context with new avatar
        const updatedUser = { ...user, avatarUrl: data.url };
        updateUser(updatedUser);
        
        // Update localStorage
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        // Emit custom event for other components to listen
        window.dispatchEvent(new CustomEvent('avatarUploaded'));
        
        setMessage({ type: 'success', text: 'Cập nhật ảnh đại diện thành công!' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Có lỗi xảy ra khi tải ảnh' });
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      setMessage({ type: 'error', text: 'Có lỗi xảy ra khi tải ảnh' });
    } finally {
      setIsUploading(false);
    }
  };

  const getRoleDisplayName = (role: string | undefined) => {
    if (!role) return 'Không xác định';
    
    switch (role) {
      case 'SUPER_ADMIN': return 'Quản Trị Hệ Thống';
      case 'CLUB_LEADER': return 'Chủ Nhiệm CLB';
      case 'CLUB_DEPUTY': return 'Phó Chủ Nhiệm';
      case 'CLUB_MEMBER': return 'Ủy Viên BCH';
      case 'CLUB_STUDENT': return 'Thành Viên CLB';
      case 'STUDENT': return 'Sinh Viên';
      default: return role;
    }
  };

  const getRoleBadgeColor = (role: string | undefined) => {
    if (!role) return 'bg-gray-100 text-gray-800';
    
    switch (role) {
      case 'SUPER_ADMIN': return 'bg-purple-100 text-purple-800';
      case 'CLUB_LEADER': return 'bg-red-100 text-red-800';
      case 'CLUB_DEPUTY': return 'bg-orange-100 text-orange-800';
      case 'CLUB_MEMBER': return 'bg-blue-100 text-blue-800';
      case 'CLUB_STUDENT': return 'bg-green-100 text-green-800';
      case 'STUDENT': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <ProtectedRoute requiredRole="CLUB_MEMBER">
      <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <OfficerNav />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Hồ sơ cá nhân
              </h1>
              <p className={`mt-2 text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Quản lý thông tin cá nhân của {getRoleDisplayName(user?.role)}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Chỉnh sửa
                </button>
              ) : (
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => {
                      setIsEditing(false);
                                             // Reset form data to original user data
                       if (user) {
                         setFormData({
                           name: user.name || '',
                           email: user.email || '',
                           phone: user.phone || '',
                           avatarUrl: user.avatarUrl || '',
                           class: user.class || '',
                           faculty: user.faculty || ''
                         });
                         
                         // Reset custom faculty
                         if (user.faculty && ![
                           'Trường Kinh Tế Tài Chính',
                           'Trường Luật Và Quản Lí Phát Triển',
                           'Viện Kỹ Thuật Công Nghệ',
                           'Viện Đào Tạo Ngoại Ngữ',
                           'Viện Đào Tạo CNTT Chuyển Đổi Số',
                           'Viện Đào Tạo Kiến Trúc Xây Dựng Và Giao Thông',
                           'Khoa Sư Phạm',
                           'Khoa Kiến Thức Chung',
                           'Khoa Công Nghiệp Văn Hóa Thể Thao Và Du Lịch',
                           'Ban Quản Lý Đào Tạo Sau Đại Học'
                         ].includes(user.faculty)) {
                           setCustomFaculty(user.faculty);
                         } else {
                           setCustomFaculty('');
                         }
                       }
                    }}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center"
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Đang lưu...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Lưu thay đổi
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
            {message.text}
          </div>
        )}

        {/* Main Content */}
        <div className="grid lg:grid-cols-5 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-2">
            <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-lg border p-6`}>
              <div className="text-center">
                {/* Avatar Section */}
                <div className="relative inline-block">
                  <div className="relative">
                    {formData.avatarUrl ? (
                      <img
                        src={formData.avatarUrl}
                        alt="Avatar"
                        className="w-32 h-32 rounded-full object-cover mx-auto border-4 border-green-500 shadow-lg"
                      />
                    ) : (
                      <div className="w-32 h-32 bg-gradient-to-r from-green-500 to-green-600 rounded-full mx-auto border-4 border-green-500 shadow-lg flex items-center justify-center">
                        <span className="text-white text-4xl font-bold">
                          {user?.name?.split(' ').pop()?.charAt(0) || 'O'}
                        </span>
                      </div>
                    )}
                    
                    {/* Upload Button */}
                    <label className="absolute bottom-0 right-0 bg-green-500 hover:bg-green-600 text-white p-2 rounded-full cursor-pointer transition-colors duration-200 shadow-lg">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                        disabled={isUploading}
                      />
                      {isUploading ? (
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                    </label>
                  </div>
                </div>

                {/* User Info */}
                <div className="mt-6">
                  <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {formData.name || 'Chưa có tên'}
                  </h2>
                                     <p className={`text-sm mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} break-all`}>
                     {formData.email}
                   </p>
                   {formData.class && (
                     <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                       🏫 {formData.class}
                     </p>
                   )}
                   {formData.faculty && (
                     <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                       🎓 {formData.faculty}
                     </p>
                   )}
                   <div className="mt-2">
                     <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(user?.role)}`}>
                       {getRoleDisplayName(user?.role)}
                     </span>
                   </div>
                </div>

                {/* Status Badge */}
                <div className="mt-4">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${isDarkMode ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'}`}>
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    Đang hoạt động
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Form Section */}
          <div className="lg:col-span-3">
            <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-lg border p-6`}>
              <h3 className={`text-xl font-semibold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Thông tin cá nhân
              </h3>

              <form onSubmit={handleSubmit} className="space-y-6">
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
                    disabled={!isEditing}
                    className={`w-full px-4 py-3 rounded-lg border transition-colors duration-200 ${
                      isEditing
                        ? isDarkMode
                          ? 'bg-gray-700 border-gray-600 text-white focus:border-green-500 focus:ring-green-500'
                          : 'bg-white border-gray-300 text-gray-900 focus:border-green-500 focus:ring-green-500'
                        : isDarkMode
                        ? 'bg-gray-700 border-gray-600 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                    placeholder="Nhập họ và tên"
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
                    disabled={!isEditing}
                    className={`w-full px-4 py-3 rounded-lg border transition-colors duration-200 ${
                      isEditing
                        ? isDarkMode
                          ? 'bg-gray-700 border-gray-600 text-white focus:border-green-500 focus:ring-green-500'
                          : 'bg-white border-gray-300 text-gray-900 focus:border-green-500 focus:ring-green-500'
                        : isDarkMode
                        ? 'bg-gray-700 border-gray-600 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                    placeholder="Nhập email"
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
                     disabled={!isEditing}
                     className={`w-full px-4 py-3 rounded-lg border transition-colors duration-200 ${
                       isEditing
                         ? isDarkMode
                           ? 'bg-gray-700 border-gray-600 text-white focus:border-green-500 focus:ring-green-500'
                           : 'bg-white border-gray-300 text-gray-900 focus:border-green-500 focus:ring-green-500'
                         : isDarkMode
                         ? 'bg-gray-700 border-gray-600 text-gray-400 cursor-not-allowed'
                         : 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed'
                     }`}
                     placeholder="Nhập số điện thoại"
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
                     disabled={!isEditing}
                     className={`w-full px-4 py-3 rounded-lg border transition-colors duration-200 ${
                       isEditing
                         ? isDarkMode
                           ? 'bg-gray-700 border-gray-600 text-white focus:border-green-500 focus:ring-green-500'
                           : 'bg-white border-gray-300 text-gray-900 focus:border-green-500 focus:ring-green-500'
                         : isDarkMode
                         ? 'bg-gray-700 border-gray-600 text-gray-400 cursor-not-allowed'
                         : 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed'
                     }`}
                     placeholder="Nhập tên lớp"
                   />
                 </div>

                 {/* Faculty */}
                 <div>
                   <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                     Khoa/Viện
                   </label>
                   <select
                     name="faculty"
                     value={formData.faculty === "Khác" ? "Khác" : formData.faculty}
                     onChange={(e) => {
                       const value = e.target.value;
                       if (value === "Khác") {
                         setFormData(prev => ({ ...prev, faculty: "Khác" }));
                       } else {
                         setFormData(prev => ({ ...prev, faculty: value }));
                         setCustomFaculty('');
                       }
                     }}
                     disabled={!isEditing}
                     className={`w-full px-4 py-3 rounded-lg border transition-colors duration-200 ${
                       isEditing
                         ? isDarkMode
                           ? 'bg-gray-700 border-gray-600 text-white focus:border-green-500 focus:ring-green-500'
                           : 'bg-white border-gray-300 text-gray-900 focus:border-green-500 focus:ring-green-500'
                         : isDarkMode
                         ? 'bg-gray-700 border-gray-600 text-gray-400 cursor-not-allowed'
                         : 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed'
                     }`}
                   >
                     <option value="">Chọn khoa/viện</option>
                     <option value="Trường Kinh Tế Tài Chính">Trường Kinh Tế Tài Chính</option>
                     <option value="Trường Luật Và Quản Lí Phát Triển">Trường Luật Và Quản Lí Phát Triển</option>
                     <option value="Viện Kỹ Thuật Công Nghệ">Viện Kỹ Thuật Công Nghệ</option>
                     <option value="Viện Đào Tạo Ngoại Ngữ">Viện Đào Tạo Ngoại Ngữ</option>
                     <option value="Viện Đào Tạo CNTT Chuyển Đổi Số">Viện Đào Tạo CNTT Chuyển Đổi Số</option>
                     <option value="Viện Đào Tạo Kiến Trúc Xây Dựng Và Giao Thông">Viện Đào Tạo Kiến Trúc Xây Dựng Và Giao Thông</option>
                     <option value="Khoa Sư Phạm">Khoa Sư Phạm</option>
                     <option value="Khoa Kiến Thức Chung">Khoa Kiến Thức Chung</option>
                     <option value="Khoa Công Nghiệp Văn Hóa Thể Thao Và Du Lịch">Khoa Công Nghiệp Văn Hóa Thể Thao Và Du Lịch</option>
                     <option value="Ban Quản Lý Đào Tạo Sau Đại Học">Ban Quản Lý Đào Tạo Sau Đại Học</option>
                     <option value="Khác">Khác</option>
                   </select>
                   
                   {/* Custom Faculty Input */}
                   {formData.faculty === "Khác" && isEditing && (
                     <div className="mt-3">
                       <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                         Nhập tên khoa/viện khác
                       </label>
                       <input
                         type="text"
                         name="customFaculty"
                         value={customFaculty}
                         onChange={(e) => {
                           setCustomFaculty(e.target.value);
                           setFormData(prev => ({
                             ...prev,
                             faculty: e.target.value
                           }));
                         }}
                         className={`w-full px-4 py-3 rounded-lg border transition-colors duration-200 ${
                           isDarkMode
                             ? 'bg-gray-700 border-gray-600 text-white focus:border-green-500 focus:ring-green-500'
                             : 'bg-white border-gray-300 text-gray-900 focus:border-green-500 focus:ring-green-500'
                         }`}
                         placeholder="Nhập tên khoa/viện tùy chỉnh"
                       />
                     </div>
                   )}
                 </div>

               </form>
            </div>

            {/* Password Change Form */}
            <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-lg border p-6 mt-6`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    🔐 Mật khẩu
                  </h3>
                  <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {hasPassword === false ? "Thêm mật khẩu để có thể đăng nhập bằng email/mật khẩu" : "Cập nhật mật khẩu để bảo mật tài khoản"}
                  </p>
                </div>
                {!showChangePassword && (
                  <button
                    onClick={() => setShowChangePassword(true)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-600 hover:text-green-700 transition-colors"
                  >
                    <Key className="h-4 w-4" />
                    {hasPassword === false ? "Thêm mật khẩu" : "Thay đổi"}
                  </button>
                )}
              </div>

              {!showChangePassword ? (
                <div className="text-center py-4">
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {hasPassword === false 
                      ? "Tài khoản của bạn chưa có mật khẩu. Nhấn 'Thêm mật khẩu' để thiết lập."
                      : "Nhấn 'Thay đổi' để cập nhật mật khẩu của bạn"}
                  </p>
                </div>
              ) : (
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  {passwordMessage && (
                    <div className={`p-3 rounded-lg flex items-center gap-2 ${
                      passwordMessage.type === 'success' 
                        ? 'bg-green-50 border border-green-200 text-green-700' 
                        : 'bg-red-50 border border-red-200 text-red-700'
                    }`}>
                      {passwordMessage.type === 'success' ? (
                        <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      )}
                      <span className="text-sm">{passwordMessage.text}</span>
                    </div>
                  )}

                  {hasPassword !== false && (
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Mật khẩu hiện tại
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <input
                          type={showPasswords.current ? 'text' : 'password'}
                          name="currentPassword"
                          value={passwordForm.currentPassword}
                          onChange={handlePasswordChange}
                          className={`w-full pl-10 pr-10 py-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-green-500 ${
                            isDarkMode 
                              ? 'bg-gray-700 border-gray-600 text-white' 
                              : 'bg-white border-gray-300 text-gray-900'
                          }`}
                          required={hasPassword === true}
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
                      Mật khẩu mới
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <input
                        type={showPasswords.new ? 'text' : 'password'}
                        name="newPassword"
                        value={passwordForm.newPassword}
                        onChange={handlePasswordChange}
                        className={`w-full pl-10 pr-10 py-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-green-500 ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        required
                        placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự, 1 chữ hoa, 1 ký tự đặc biệt)"
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
                      Xác nhận mật khẩu mới
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <input
                        type={showPasswords.confirm ? 'text' : 'password'}
                        name="confirmPassword"
                        value={passwordForm.confirmPassword}
                        onChange={handlePasswordChange}
                        className={`w-full pl-10 pr-10 py-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-green-500 ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        required
                        placeholder="Nhập lại mật khẩu mới"
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
                      className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {passwordLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Đang xử lý...
                        </>
                      ) : (
                        <>
                          <Key className="h-4 w-4" />
                          {hasPassword === false ? "Thêm mật khẩu" : "Đổi mật khẩu"}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
      </div>
    </ProtectedRoute>
  );
}
