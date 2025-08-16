'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import StudentNav from '@/components/student/StudentNav';
import Footer from '@/components/common/Footer';

interface RegistrationForm {
  motivation: string;
  experience: string;
  expectations: string;
  commitment: string;
}

export default function StudentRegisterPage() {
  const { user } = useAuth();
  const [formData, setFormData] = useState<RegistrationForm>({
    motivation: '',
    experience: '',
    expectations: '',
    commitment: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removalInfo, setRemovalInfo] = useState<any>(null);
  const [existingMembership, setExistingMembership] = useState<any>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);

  // Check removal status and existing membership
  useEffect(() => {
    if (user) {
      checkRemovalStatus();
      checkExistingMembership();
    }
  }, [user]);

  const checkRemovalStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/memberships/removal-status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Removal status response:', data);
        if (data.success && data.data.removalInfo) {
          setRemovalInfo(data.data.removalInfo);
        }
      }
    } catch (error) {
      console.error('Error checking removal status:', error);
    }
  };

  const checkExistingMembership = async () => {
    try {
      setCheckingStatus(true);
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/memberships/status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Membership status response:', data);
        if (data.success && data.data.membership) {
          setExistingMembership(data.data.membership);
        }
      }
    } catch (error) {
      console.error('Error checking membership status:', error);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('Bạn cần đăng nhập để đăng ký');
      return;
    }

    // Check if already has a membership
    if (existingMembership) {
      setError('Bạn đã có đơn đăng ký trong hệ thống');
      return;
    }

    // Validate form
    if (!formData.motivation.trim() || !formData.experience.trim() || 
        !formData.expectations.trim() || !formData.commitment.trim()) {
      setError('Vui lòng điền đầy đủ thông tin');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/memberships', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          userId: user._id,
          motivation: formData.motivation,
          experience: formData.experience,
          expectations: formData.expectations,
          commitment: formData.commitment
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(true);
        setFormData({
          motivation: '',
          experience: '',
          expectations: '',
          commitment: ''
        });
        // Clear removal info and refresh membership status
        setRemovalInfo(null);
        await checkExistingMembership();
      } else {
        setError(data.error || 'Có lỗi xảy ra khi đăng ký');
      }
    } catch (err: any) {
      setError('Có lỗi xảy ra khi đăng ký');
      console.error('Error submitting registration:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | Date) => {
    try {
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
      if (isNaN(date.getTime())) {
        return 'Không xác định';
      }
      return date.toLocaleString('vi-VN');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Không xác định';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-yellow-100 text-yellow-800">Chờ duyệt</span>;
      case 'ACTIVE':
        return <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-green-100 text-green-800">Đã duyệt</span>;
      case 'INACTIVE':
        return <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-orange-100 text-orange-800">Không hoạt động</span>;
      case 'REJECTED':
        return <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-red-100 text-red-800">Đã từ chối</span>;
      case 'REMOVED':
        return <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-red-100 text-red-800">Đã xóa</span>;
      default:
        return <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-gray-100 text-gray-800">Không xác định</span>;
    }
  };

  if (!user || user.role !== 'STUDENT') {
    return (
      <ProtectedRoute requiredRole="STUDENT">
        <div>Loading...</div>
      </ProtectedRoute>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <StudentNav />
      <main className="flex-1 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Đăng ký Thành viên CLB Sinh viên 5 Tốt TDMU
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Tham gia CLB để phát triển bản thân, kết nối với cộng đồng và đóng góp cho xã hội
            </p>
          </div>

          {/* Removal Notification */}
          {removalInfo && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <span className="text-red-600 text-xl">⚠️</span>
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-semibold text-red-900 mb-3">
                    Thông báo quan trọng
                  </h3>
                  <div className="text-sm text-red-800">
                    <p className="font-medium mb-3 text-base">
                      Bạn đã bị xóa khỏi CLB Sinh viên 5 Tốt TDMU
                    </p>
                    
                    <div className="bg-white rounded-lg p-4 border border-red-200 mb-3">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="font-semibold text-gray-700">Thời gian:</span>
                          <span className="text-gray-900">{removalInfo.removedAt ? formatDate(removalInfo.removedAt) : 'Không xác định'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-semibold text-gray-700">Người thực hiện:</span>
                          <span className="text-gray-900">{removalInfo.removedBy?.name || 'Không xác định'} ({removalInfo.removedBy?.studentId || 'N/A'})</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-semibold text-gray-700">Lý do:</span>
                          <span className="text-gray-900">{removalInfo.removalReason || 'Không có lý do'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                      <p className="text-sm text-blue-800">
                        💡 <strong>Lưu ý:</strong> Bạn có thể đăng ký lại tham gia câu lạc bộ sau khi đã khắc phục các vấn đề được nêu trong lý do xóa.
                      </p>
                    </div>
                    
                    <div className="flex justify-end">
                      <button
                        onClick={() => setRemovalInfo(null)}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
                      >
                        🔄 Đăng ký lại
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {checkingStatus && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
                <p className="text-sm text-blue-800">Đang kiểm tra trạng thái đăng ký...</p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">
                    Đăng ký thành công!
                  </h3>
                  <p className="mt-1 text-sm text-green-700">
                    Đơn đăng ký của bạn đã được gửi và đang chờ duyệt. Chúng tôi sẽ thông báo kết quả sớm nhất.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Existing Membership Status */}
          {!checkingStatus && existingMembership && !removalInfo && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-600 text-xl">📋</span>
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-semibold text-blue-900 mb-3">
                    Trạng thái đơn đăng ký
                  </h3>
                  <div className="bg-white rounded-lg p-4 border border-blue-200 mb-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-700">Trạng thái:</span>
                        {getStatusBadge(existingMembership.status)}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-700">Ngày đăng ký:</span>
                        <span className="text-gray-900">{formatDate(existingMembership.joinedAt)}</span>
                      </div>
                      {existingMembership.approvedAt && (
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-gray-700">Ngày duyệt:</span>
                          <span className="text-gray-900">{formatDate(existingMembership.approvedAt)}</span>
                        </div>
                      )}
                      {existingMembership.rejectedAt && (
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-gray-700">Ngày từ chối:</span>
                          <span className="text-gray-900">{formatDate(existingMembership.rejectedAt)}</span>
                        </div>
                      )}
                      {existingMembership.rejectionReason && (
                        <div>
                          <span className="font-semibold text-gray-700">Lý do từ chối:</span>
                          <p className="mt-1 text-sm text-red-600">{existingMembership.rejectionReason}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {existingMembership.status === 'PENDING' && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="text-sm text-yellow-800">
                        ⏳ <strong>Đơn đăng ký của bạn đang chờ admin xét duyệt.</strong> Vui lòng chờ thông báo kết quả.
                      </p>
                    </div>
                  )}
                  
                  {existingMembership.status === 'ACTIVE' && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-sm text-green-800">
                        ✅ <strong>Chúc mừng!</strong> Bạn đã được chấp nhận làm thành viên CLB Sinh viên 5 Tốt TDMU.
                      </p>
                    </div>
                  )}
                  
                  {existingMembership.status === 'REJECTED' && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-sm text-red-800">
                        ❌ <strong>Đơn đăng ký của bạn đã bị từ chối.</strong> Bạn có thể đăng ký lại sau khi khắc phục các vấn đề được nêu.
                      </p>
                    </div>
                  )}
                  
                  {existingMembership.status === 'INACTIVE' && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <p className="text-sm text-orange-800">
                        ⚠️ <strong>Tài khoản của bạn đã bị tạm ngưng hoạt động.</strong> Vui lòng liên hệ admin để biết thêm chi tiết.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Registration Form */}
          <div className={`bg-white shadow-lg rounded-lg overflow-hidden border border-gray-200 ${!checkingStatus && existingMembership && !removalInfo ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
              <h2 className="text-xl font-semibold text-gray-900">
                📝 Thông tin đăng ký
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Vui lòng điền đầy đủ thông tin để đăng ký tham gia CLB
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* Student Information */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="mr-2">👤</span>
                  Thông tin sinh viên
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
                    <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-1">MSSV</label>
                    <p className="text-sm font-semibold text-gray-900">{user.studentId}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <p className="text-sm font-semibold text-gray-900">{user.email}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Khoa</label>
                    <p className="text-sm font-semibold text-gray-900">{user.faculty || 'Chưa cập nhật'}</p>
                  </div>
                </div>
              </div>

              {/* Registration Questions */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <span className="mr-2">📋</span>
                  Thông tin đăng ký
                </h3>
                
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <label htmlFor="motivation" className="block text-sm font-semibold text-gray-900 mb-3 flex items-center">
                    <span className="mr-2">🎯</span>
                    Động lực tham gia CLB *
                  </label>
                  <textarea
                    id="motivation"
                    name="motivation"
                    value={formData.motivation}
                    onChange={handleInputChange}
                    rows={4}
                    placeholder="Vui lòng chia sẻ lý do bạn muốn tham gia CLB Sinh viên 5 Tốt..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 placeholder-gray-500 resize-none"
                    required
                  />
                </div>

                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <label htmlFor="experience" className="block text-sm font-semibold text-gray-900 mb-3 flex items-center">
                    <span className="mr-2">🏆</span>
                    Kinh nghiệm và thành tích *
                  </label>
                  <textarea
                    id="experience"
                    name="experience"
                    value={formData.experience}
                    onChange={handleInputChange}
                    rows={4}
                    placeholder="Hãy chia sẻ về kinh nghiệm hoạt động, thành tích học tập, hoạt động tình nguyện..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 placeholder-gray-500 resize-none"
                    required
                  />
                </div>

                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <label htmlFor="expectations" className="block text-sm font-semibold text-gray-900 mb-3 flex items-center">
                    <span className="mr-2">🌟</span>
                    Mong muốn và kỳ vọng *
                  </label>
                  <textarea
                    id="expectations"
                    name="expectations"
                    value={formData.expectations}
                    onChange={handleInputChange}
                    rows={4}
                    placeholder="Bạn mong muốn đạt được gì khi tham gia CLB? Kỳ vọng gì về CLB?"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 placeholder-gray-500 resize-none"
                    required
                  />
                </div>

                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <label htmlFor="commitment" className="block text-sm font-semibold text-gray-900 mb-3 flex items-center">
                    <span className="mr-2">🤝</span>
                    Cam kết tham gia *
                  </label>
                  <textarea
                    id="commitment"
                    name="commitment"
                    value={formData.commitment}
                    onChange={handleInputChange}
                    rows={4}
                    placeholder="Bạn cam kết tham gia CLB như thế nào? Thời gian và nỗ lực bạn sẵn sàng dành cho CLB?"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 placeholder-gray-500 resize-none"
                    required
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 bg-gray-50 -mx-6 -mb-6 px-6 py-4">
                <button
                  type="button"
                  onClick={() => window.history.back()}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-200"
                >
                  ❌ Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 border border-transparent rounded-lg text-sm font-semibold text-white hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md"
                >
                  {loading ? '⏳ Đang gửi...' : '📤 Gửi đơn đăng ký'}
                </button>
              </div>
            </form>
          </div>

          {/* Information Section */}
          <div className="mt-8 bg-white shadow-lg rounded-lg overflow-hidden border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-blue-50">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <span className="mr-2">ℹ️</span>
                Thông tin về CLB Sinh viên 5 Tốt TDMU
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="mr-2">✅</span>
                    Tiêu chí 5 Tốt
                  </h3>
                  <ul className="space-y-3 text-sm text-gray-700">
                    <li className="flex items-start bg-white rounded-lg p-3 border border-green-100">
                      <span className="text-green-500 mr-3 text-lg">✓</span>
                      <div>
                        <span className="font-semibold text-gray-900">Đạo đức tốt:</span>
                        <span className="block text-gray-600">Có phẩm chất đạo đức tốt, lối sống lành mạnh</span>
                      </div>
                    </li>
                    <li className="flex items-start bg-white rounded-lg p-3 border border-green-100">
                      <span className="text-green-500 mr-3 text-lg">✓</span>
                      <div>
                        <span className="font-semibold text-gray-900">Học tập tốt:</span>
                        <span className="block text-gray-600">Đạt điểm trung bình từ 7.0 trở lên</span>
                      </div>
                    </li>
                    <li className="flex items-start bg-white rounded-lg p-3 border border-green-100">
                      <span className="text-green-500 mr-3 text-lg">✓</span>
                      <div>
                        <span className="font-semibold text-gray-900">Thể lực tốt:</span>
                        <span className="block text-gray-600">Có sức khỏe tốt, tham gia hoạt động thể thao</span>
                      </div>
                    </li>
                    <li className="flex items-start bg-white rounded-lg p-3 border border-green-100">
                      <span className="text-green-500 mr-3 text-lg">✓</span>
                      <div>
                        <span className="font-semibold text-gray-900">Tình nguyện tốt:</span>
                        <span className="block text-gray-600">Tích cực tham gia hoạt động tình nguyện</span>
                      </div>
                    </li>
                    <li className="flex items-start bg-white rounded-lg p-3 border border-green-100">
                      <span className="text-green-500 mr-3 text-lg">✓</span>
                      <div>
                        <span className="font-semibold text-gray-900">Hội nhập tốt:</span>
                        <span className="block text-gray-600">Có khả năng hội nhập quốc tế</span>
                      </div>
                    </li>
                  </ul>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-6 border border-purple-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="mr-2">🎁</span>
                    Lợi ích khi tham gia
                  </h3>
                  <ul className="space-y-3 text-sm text-gray-700">
                    <li className="flex items-start bg-white rounded-lg p-3 border border-purple-100">
                      <span className="text-purple-500 mr-3 text-lg">🎯</span>
                      <span className="font-semibold text-gray-900">Phát triển kỹ năng lãnh đạo và làm việc nhóm</span>
                    </li>
                    <li className="flex items-start bg-white rounded-lg p-3 border border-purple-100">
                      <span className="text-purple-500 mr-3 text-lg">🌍</span>
                      <span className="font-semibold text-gray-900">Mở rộng mạng lưới quan hệ và cơ hội nghề nghiệp</span>
                    </li>
                    <li className="flex items-start bg-white rounded-lg p-3 border border-purple-100">
                      <span className="text-purple-500 mr-3 text-lg">📚</span>
                      <span className="font-semibold text-gray-900">Tham gia các khóa đào tạo và workshop chuyên môn</span>
                    </li>
                    <li className="flex items-start bg-white rounded-lg p-3 border border-purple-100">
                      <span className="text-purple-500 mr-3 text-lg">🏆</span>
                      <span className="font-semibold text-gray-900">Được công nhận và khen thưởng cho thành tích</span>
                    </li>
                    <li className="flex items-start bg-white rounded-lg p-3 border border-purple-100">
                      <span className="text-purple-500 mr-3 text-lg">💼</span>
                      <span className="font-semibold text-gray-900">Hỗ trợ thực tập và việc làm tại các doanh nghiệp</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
