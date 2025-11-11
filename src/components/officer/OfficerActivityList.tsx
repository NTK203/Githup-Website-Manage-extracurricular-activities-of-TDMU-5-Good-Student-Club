'use client';

import { useState, useEffect } from 'react';

interface Activity {
  _id: string;
  name: string;
  description: string;
  date: string;
  timeSlots: Array<{
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    isActive: boolean;
    activities: string;
    detailedLocation?: string;
  }>;
  location: string;
  detailedLocation?: string;
  maxParticipants: number;
  visibility: 'public' | 'private';
  responsiblePerson?: {
    name: string;
    email: string;
  };
  status: 'draft' | 'published' | 'ongoing' | 'completed' | 'cancelled' | 'postponed';
  type: 'single_day' | 'multiple_days';
  imageUrl?: string;
  overview?: string;
  participants: Array<{
    userId: string;
    name: string;
    email: string;
    role: string;
    joinedAt: string;
  }>;
  createdBy?: {
    name: string;
    email: string;
  };
  createdAt: string;
}

interface OfficerStats {
  totalActivities: number;
  totalParticipants: number;
  activitiesThisMonth: number;
  statusCounts: {
    draft: number;
    published: number;
    ongoing: number;
    completed: number;
    cancelled: number;
    postponed: number;
  };
  activeActivities: number;
  completedActivities: number;
  pendingReports: number;
}

interface OfficerActivityListProps {
  isDarkMode: boolean;
  onViewActivity?: (id: string) => void;
  onAttendance?: (id: string) => void;
}

export default function OfficerActivityList({ 
  isDarkMode, 
  onViewActivity,
  onAttendance 
}: OfficerActivityListProps) {
  // State for activities from API
  const [activities, setActivities] = useState<Activity[]>([]);
  const [stats, setStats] = useState<OfficerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalActivities, setTotalActivities] = useState(0);
  const [itemsPerPage] = useState(6);

  // Fetch activities from API
  const fetchActivities = async (page: number = 1, search: string = '', status: string = 'all') => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString(),
        status: status
      });
      
      if (search) {
        params.append('search', search);
      }
      
      const response = await fetch(`/api/activities/officer-dashboard?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setActivities(data.data.activities);
        setStats(data.data.stats);
        setTotalPages(data.data.pagination.totalPages);
        setTotalActivities(data.data.pagination.total);
        setCurrentPage(page);
      } else {
        console.error('OfficerActivityList - API Error:', data);
        setError('Không thể tải danh sách hoạt động');
      }
    } catch (err) {
      setError('Có lỗi xảy ra khi tải dữ liệu');
      console.error('Error fetching officer activities:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchActivities();
  }, []);

  // Handle search and filter changes
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
    fetchActivities(1, value, statusFilter);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
    fetchActivities(1, searchTerm, value);
  };

  const handlePageChange = (page: number) => {
    fetchActivities(page, searchTerm, statusFilter);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Format time slots for display
  const formatTimeSlots = (timeSlots: Activity['timeSlots']) => {
    const activeSlots = timeSlots.filter(slot => slot.isActive);
    if (activeSlots.length === 0) return 'Chưa có thời gian';
    
    if (activeSlots.length === 1) {
      return `${activeSlots[0].startTime} - ${activeSlots[0].endTime}`;
    }
    
    return `${activeSlots[0].startTime} - ${activeSlots[activeSlots.length - 1].endTime}`;
  };

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'published':
        return 'bg-blue-100 text-blue-800';
      case 'ongoing':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-purple-100 text-purple-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'postponed':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get status text
  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft':
        return 'Bản nháp';
      case 'published':
        return 'Đã xuất bản';
      case 'ongoing':
        return 'Đang diễn ra';
      case 'completed':
        return 'Đã hoàn thành';
      case 'cancelled':
        return 'Đã hủy';
      case 'postponed':
        return 'Đã hoãn';
      default:
        return status;
    }
  };


  if (loading) {
    return (
      <div className={`text-center py-12 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p>Đang tải danh sách hoạt động...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center py-12 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
        <p className="mb-4">❌ {error}</p>
        <button
          onClick={() => fetchActivities()}
          className={`px-4 py-2 rounded-lg ${
            isDarkMode 
              ? 'bg-blue-600 hover:bg-blue-700 text-white' 
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Hoạt động phụ trách
          </h2>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
            Tổng cộng {totalActivities} hoạt động
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className={`p-6 rounded-2xl border ${
        isDarkMode 
          ? 'bg-gray-800/50 border-gray-700/50' 
          : 'bg-white/80 border-gray-200/50'
      }`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              🔍 Tìm kiếm
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Tìm theo tên, mô tả, địa điểm..."
              className={`w-full px-4 py-2 rounded-lg border transition-all duration-200 ${
                isDarkMode
                  ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-400 focus:border-blue-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-400'
              } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              📊 Trạng thái
            </label>
            <select
              value={statusFilter}
              onChange={(e) => handleStatusFilterChange(e.target.value)}
              className={`w-full px-4 py-2 rounded-lg border transition-all duration-200 ${
                isDarkMode
                  ? 'bg-gray-700/50 border-gray-600/50 text-white focus:border-blue-500'
                  : 'bg-white border-gray-300 text-gray-900 focus:border-blue-400'
              } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="draft">Bản nháp</option>
              <option value="published">Đã xuất bản</option>
              <option value="ongoing">Đang diễn ra</option>
              <option value="completed">Đã hoàn thành</option>
              <option value="cancelled">Đã hủy</option>
              <option value="postponed">Đã hoãn</option>
            </select>
          </div>
        </div>
      </div>

      {/* Activities Table */}
      {activities.length > 0 ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hoạt động
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Thời gian
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tham gia
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {activities.map((activity) => (
                  <tr key={activity._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {activity.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {activity.type === 'single_day' ? 'Một ngày' : 'Nhiều ngày'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatDate(activity.date)}</div>
                      <div className="text-sm text-gray-500">{formatTimeSlots(activity.timeSlots)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {activity.participants.length} / {activity.maxParticipants} sinh viên
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(activity.status)}`}>
                        {getStatusText(activity.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {activity.status === 'ongoing' && (
                        <button 
                          onClick={() => onAttendance?.(activity._id)}
                          className="text-green-600 hover:text-green-900 mr-3"
                        >
                          Điểm danh
                        </button>
                      )}
                      <button 
                        onClick={() => onViewActivity?.(activity._id)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className={`text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          <p className="text-lg mb-2">📭 Không tìm thấy hoạt động nào</p>
          <p className="text-sm">Bạn chưa được phân công phụ trách hoạt động nào</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              currentPage === 1
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : isDarkMode
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
          >
            ← Trước
          </button>
          
          <span className={`px-3 py-2 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Trang {currentPage} / {totalPages}
          </span>
          
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              currentPage === totalPages
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : isDarkMode
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
          >
            Sau →
          </button>
        </div>
      )}
    </div>
  );
}
