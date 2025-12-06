'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useDarkMode } from '@/hooks/useDarkMode';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import StudentNav from '@/components/student/StudentNav';
import Footer from '@/components/common/Footer';
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  User,
  FileText,
  Loader,
  History
} from 'lucide-react';

interface MembershipHistory {
  _id: string;
  status: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'INACTIVE' | 'REMOVED';
  createdAt: string;
  joinedAt: string;
  approvedAt?: string;
  approvedBy?: {
    name: string;
    studentId: string;
  };
  rejectedAt?: string;
  rejectedBy?: {
    name: string;
    studentId: string;
  };
  rejectionReason?: string;
  motivation?: string;
  experience?: string;
  expectations?: string;
  commitment?: string;
  isReapplication?: boolean;
  reapplicationAt?: string;
  reapplicationReason?: string;
}

export default function MembershipHistoryPage() {
  const { user, token, isAuthenticated } = useAuth();
  const { isDarkMode } = useDarkMode();
  const [memberships, setMemberships] = useState<MembershipHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && token) {
      loadMembershipHistory();
    }
  }, [isAuthenticated, token]);

  const loadMembershipHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/memberships/my-history', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Không thể tải lịch sử đăng ký');
      }

      const data = await response.json();
      if (data.success && data.data.memberships) {
        setMemberships(data.data.memberships);
      } else {
        setMemberships([]);
      }
    } catch (err) {
      console.error('Error loading membership history:', err);
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'PENDING':
        return {
          label: 'Chờ duyệt',
          color: isDarkMode ? 'text-yellow-300' : 'text-yellow-700',
          bgColor: isDarkMode ? 'bg-yellow-800/30' : 'bg-yellow-50',
          borderColor: isDarkMode ? 'border-yellow-700' : 'border-yellow-200',
          icon: Clock
        };
      case 'ACTIVE':
        return {
          label: 'Đã duyệt',
          color: isDarkMode ? 'text-green-300' : 'text-green-700',
          bgColor: isDarkMode ? 'bg-green-800/30' : 'bg-green-50',
          borderColor: isDarkMode ? 'border-green-700' : 'border-green-200',
          icon: CheckCircle2
        };
      case 'REJECTED':
        return {
          label: 'Đã từ chối',
          color: isDarkMode ? 'text-red-300' : 'text-red-700',
          bgColor: isDarkMode ? 'bg-red-800/30' : 'bg-red-50',
          borderColor: isDarkMode ? 'border-red-700' : 'border-red-200',
          icon: XCircle
        };
      case 'REMOVED':
        return {
          label: 'Đã xóa',
          color: isDarkMode ? 'text-orange-300' : 'text-orange-700',
          bgColor: isDarkMode ? 'bg-orange-800/30' : 'bg-orange-50',
          borderColor: isDarkMode ? 'border-orange-700' : 'border-orange-200',
          icon: AlertCircle
        };
      case 'INACTIVE':
        return {
          label: 'Không hoạt động',
          color: isDarkMode ? 'text-gray-300' : 'text-gray-700',
          bgColor: isDarkMode ? 'bg-gray-800/30' : 'bg-gray-50',
          borderColor: isDarkMode ? 'border-gray-700' : 'border-gray-200',
          icon: AlertCircle
        };
      default:
        return {
          label: status,
          color: isDarkMode ? 'text-gray-300' : 'text-gray-700',
          bgColor: isDarkMode ? 'bg-gray-800/30' : 'bg-gray-50',
          borderColor: isDarkMode ? 'border-gray-700' : 'border-gray-200',
          icon: AlertCircle
        };
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Chưa có';
    try {
      return new Date(dateString).toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
        <div className={`flex flex-col items-center justify-center ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          <Loader 
            size={48} 
            className={`animate-spin mb-4 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}
            strokeWidth={2}
          />
          <p className={`text-sm font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
            Đang tải lịch sử đăng ký...
          </p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className={`min-h-screen flex flex-col transition-colors duration-200 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <StudentNav key="student-nav" />
        
        <main className={`flex-1 max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8 w-full ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          {/* Header */}
          <div className={`mb-6 rounded-2xl p-5 sm:p-6 ${
            isDarkMode 
              ? 'bg-gray-800 border border-gray-700/50' 
              : 'bg-white border border-gray-200 shadow-md'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                isDarkMode 
                  ? 'bg-blue-500/20 text-blue-400' 
                  : 'bg-blue-100 text-blue-600'
              }`}>
                <History size={20} strokeWidth={2} />
              </div>
              <div>
                <h1 className={`text-2xl sm:text-3xl font-extrabold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Lịch sử đăng ký CLB
                </h1>
                <p className={`text-sm sm:text-base ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Xem lại tất cả các lần đăng ký thành viên CLB của bạn
                </p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className={`mb-4 p-3 rounded-lg border ${isDarkMode ? 'bg-red-900/20 border-red-700 text-red-300' : 'bg-red-50 border-red-200 text-red-800'}`}>
              <div className="flex items-center gap-2">
                <AlertCircle size={16} strokeWidth={2} className={isDarkMode ? 'text-red-400' : 'text-red-600'} />
                <p className="text-sm font-medium">{error}</p>
              </div>
            </div>
          )}

          {/* Membership History List */}
          {memberships.length === 0 ? (
            <div className={`rounded-lg border-2 border-dashed p-8 text-center ${
              isDarkMode ? 'border-gray-700 bg-gray-800/30' : 'border-gray-300 bg-gray-50'
            }`}>
              <History size={40} className={`mx-auto mb-3 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} strokeWidth={1.5} />
              <p className={`text-base font-semibold mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Chưa có lịch sử đăng ký
              </p>
              <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                Bạn chưa có lần đăng ký nào
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {memberships.map((membership, index) => {
                const statusInfo = getStatusInfo(membership.status);
                const StatusIcon = statusInfo.icon;

                return (
                  <div
                    key={membership._id}
                    className={`rounded-xl border-2 overflow-hidden shadow-lg transition-all duration-300 hover:shadow-xl ${
                      isDarkMode 
                        ? 'bg-gray-800 border-gray-700' 
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    {/* Header */}
                    <div className={`px-4 sm:px-6 py-4 border-b-2 ${
                      isDarkMode 
                        ? 'bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 border-gray-600' 
                        : 'bg-gradient-to-r from-gray-50 via-white to-gray-50 border-gray-200'
                    }`}>
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-1.5 rounded-lg ${statusInfo.bgColor} border ${statusInfo.borderColor}`}>
                            <StatusIcon size={16} className={statusInfo.color} strokeWidth={2} />
                          </div>
                          <div>
                            <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              Đăng ký #{memberships.length - index}
                              {membership.isReapplication && (
                                <span className={`ml-2 text-xs px-2 py-1 rounded-full ${
                                  isDarkMode ? 'bg-orange-800/30 text-orange-300' : 'bg-orange-100 text-orange-700'
                                }`}>
                                  Đăng ký lại
                                </span>
                              )}
                            </h3>
                            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              Ngày đăng ký: {formatDate(membership.joinedAt || membership.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className={`px-3 py-1.5 rounded-lg border ${statusInfo.bgColor} ${statusInfo.borderColor}`}>
                          <span className={`text-sm font-bold ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 sm:p-6 space-y-4">
                      {/* Status-specific information */}
                      {membership.status === 'ACTIVE' && membership.approvedAt && (
                        <div className={`p-2.5 rounded-lg border ${
                          isDarkMode ? 'bg-green-900/20 border-green-700/50' : 'bg-green-50 border-green-200'
                        }`}>
                          <div className="flex items-start gap-2">
                            <CheckCircle2 size={16} className={`mt-0.5 flex-shrink-0 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} strokeWidth={2} />
                            <div className="flex-1">
                              <p className={`text-sm font-semibold mb-1 ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>
                                Đã được duyệt
                              </p>
                              <p className={`text-xs ${isDarkMode ? 'text-green-400/80' : 'text-green-600/80'}`}>
                                Ngày duyệt: {formatDate(membership.approvedAt)}
                              </p>
                              {membership.approvedBy && (
                                <p className={`text-xs mt-1 ${isDarkMode ? 'text-green-400/80' : 'text-green-600/80'}`}>
                                  Người duyệt: {membership.approvedBy.name} ({membership.approvedBy.studentId})
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {membership.status === 'REJECTED' && (
                        <div className={`p-2.5 rounded-lg border ${
                          isDarkMode ? 'bg-red-900/20 border-red-700/50' : 'bg-red-50 border-red-200'
                        }`}>
                          <div className="flex items-start gap-2">
                            <XCircle size={16} className={`mt-0.5 flex-shrink-0 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`} strokeWidth={2} />
                            <div className="flex-1">
                              <p className={`text-sm font-semibold mb-1 ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>
                                Đã bị từ chối
                              </p>
                              {membership.rejectedAt && (
                                <p className={`text-xs mb-2 ${isDarkMode ? 'text-red-400/80' : 'text-red-600/80'}`}>
                                  Ngày từ chối: {formatDate(membership.rejectedAt)}
                                </p>
                              )}
                              {membership.rejectionReason && (
                                <div className={`mt-2 p-2 rounded border ${
                                  isDarkMode ? 'bg-red-900/30 border-red-800' : 'bg-red-100 border-red-300'
                                }`}>
                                  <p className={`text-xs font-semibold mb-1 ${isDarkMode ? 'text-red-200' : 'text-red-800'}`}>
                                    Lý do từ chối:
                                  </p>
                                  <p className={`text-xs ${isDarkMode ? 'text-red-300/90' : 'text-red-700'}`}>
                                    {membership.rejectionReason}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Application Details */}
                      {(membership.motivation || membership.experience || membership.expectations || membership.commitment) && (
                        <div className={`p-3 rounded-lg border ${
                          isDarkMode ? 'bg-gray-700/30 border-gray-600' : 'bg-gray-50 border-gray-200'
                        }`}>
                          <h4 className={`text-sm font-bold mb-2.5 flex items-center gap-2 ${
                            isDarkMode ? 'text-gray-200' : 'text-gray-700'
                          }`}>
                            <FileText size={14} strokeWidth={2} className={isDarkMode ? 'text-gray-300' : 'text-gray-600'} />
                            Thông tin đăng ký
                          </h4>
                          <div className="space-y-3">
                            {membership.motivation && (
                              <div>
                                <p className={`text-xs font-semibold mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                  Động lực tham gia:
                                </p>
                                <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-700'}`}>
                                  {membership.motivation}
                                </p>
                              </div>
                            )}
                            {membership.experience && (
                              <div>
                                <p className={`text-xs font-semibold mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                  Kinh nghiệm:
                                </p>
                                <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-700'}`}>
                                  {membership.experience}
                                </p>
                              </div>
                            )}
                            {membership.expectations && (
                              <div>
                                <p className={`text-xs font-semibold mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                  Mong muốn:
                                </p>
                                <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-700'}`}>
                                  {membership.expectations}
                                </p>
                              </div>
                            )}
                            {membership.commitment && (
                              <div>
                                <p className={`text-xs font-semibold mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                  Cam kết:
                                </p>
                                <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-700'}`}>
                                  {membership.commitment}
                                </p>
                              </div>
                            )}
                            {membership.isReapplication && membership.reapplicationReason && (
                              <div>
                                <p className={`text-xs font-semibold mb-1 ${isDarkMode ? 'text-orange-300' : 'text-orange-600'}`}>
                                  Lý do đăng ký lại:
                                </p>
                                <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-orange-400/90' : 'text-orange-700'}`}>
                                  {membership.reapplicationReason}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        <Footer isDarkMode={isDarkMode} />
      </div>
    </ProtectedRoute>
  );
}

