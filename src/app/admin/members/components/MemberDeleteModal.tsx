'use client';

import { useState, useEffect } from 'react';

interface ClubMember {
  _id: string;
  userId?: {
    _id: string;
    studentId: string;
    name: string;
    email: string;
    role: 'SUPER_ADMIN' | 'CLUB_LEADER' | 'CLUB_DEPUTY' | 'CLUB_MEMBER' | 'CLUB_STUDENT';
    phone?: string;
    class?: string;
    faculty?: string;
    avatarUrl?: string;
  };
  status: 'ACTIVE' | 'PENDING' | 'REJECTED' | 'REMOVED';
  joinedAt: string;
  approvedAt?: string;
  approvedBy?: {
    _id: string;
    name: string;
    studentId: string;
  };
  removedAt?: string;
  removedBy?: {
    _id: string;
    name: string;
    studentId: string;
  };
  removalReason?: string;
  removalReasonTrue?: string;
  restoredAt?: string;
  restoredBy?: {
    _id: string;
    name: string;
    studentId: string;
  };
  restorationReason?: string;
  removalHistory?: Array<{
    removedAt: string;
    removedBy: {
      _id: string;
      name: string;
      studentId: string;
    };
    removalReason: string;
    restoredAt?: string;
    restoredBy?: string;
    restorationReason?: string;
  }>;
  motivation?: string;
  experience?: string;
  expectations?: string;
  commitment?: string;
  createdAt: string;
  updatedAt: string;
}

interface MemberDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberId: string | null;
  isDarkMode: boolean;
  onMemberDeleted: () => void;
}

export default function MemberDeleteModal({ isOpen, onClose, memberId, isDarkMode, onMemberDeleted }: MemberDeleteModalProps) {
  const [member, setMember] = useState<ClubMember | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removalReason, setRemovalReason] = useState('');

  useEffect(() => {
    if (isOpen && memberId) {
      fetchMemberDetails();
    }
  }, [isOpen, memberId]);

  const fetchMemberDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/memberships/${memberId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch member details');
      }

      const data = await response.json();
      if (data.success) {
        setMember(data.data);
      } else {
        throw new Error(data.error || 'Failed to fetch member details');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error fetching member details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!member || !removalReason.trim()) return;

    setDeleting(true);
    setError(null);

    try {
      // Remove member from club (soft delete)
      const response = await fetch(`/api/memberships/${memberId}/remove`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          removalReason: removalReason.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove member');
      }

      onMemberDeleted();
      onClose();
      setRemovalReason(''); // Reset reason after successful deletion

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error removing member:', err);
    } finally {
      setDeleting(false);
    }
  };

  const getRoleBadgeColor = (role: string | undefined | null) => {
    if (!role || role.trim() === '') {
      return 'bg-gradient-to-r from-gray-500 to-gray-600 text-white';
    }
    
    switch (role) {
      case 'SUPER_ADMIN': return 'bg-gradient-to-r from-purple-500 to-purple-600 text-white';
      case 'CLUB_LEADER': return 'bg-gradient-to-r from-red-500 to-red-600 text-white';
      case 'CLUB_DEPUTY': return 'bg-gradient-to-r from-orange-500 to-orange-600 text-white';
      case 'CLUB_MEMBER': return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white';
      case 'CLUB_STUDENT': return 'bg-gradient-to-r from-green-500 to-green-600 text-white';
      case 'STUDENT': return 'bg-gradient-to-r from-gray-500 to-gray-600 text-white';
      default: return 'bg-gradient-to-r from-gray-500 to-gray-600 text-white';
    }
  };

  const getRoleDisplayName = (role: string | undefined | null) => {
    if (!role || role.trim() === '') {
      return 'Không xác định';
    }
    
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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Hàm tính toán số lần xóa chính xác
  const getRemovalCount = () => {
    if (!member) return { removalCount: 1, previousRemovals: 0 };
    
    // Loại bỏ các entries trùng lặp dựa trên removedAt (trong vòng 1 giây)
    // Ưu tiên giữ lại entry có thông tin duyệt lại
    const uniqueHistory = member.removalHistory ? member.removalHistory.reduce((acc, history) => {
      const existingIndex = acc.findIndex(h => 
        Math.abs(new Date(h.removedAt).getTime() - new Date(history.removedAt).getTime()) < 1000
      );
      
      if (existingIndex === -1) {
        // Không tìm thấy entry trùng lặp, thêm vào
        acc.push(history);
      } else {
        // Tìm thấy entry trùng lặp, kiểm tra xem có thông tin duyệt lại không
        const existing = acc[existingIndex];
        const hasRestorationInfo = history.restoredAt && history.restorationReason;
        const existingHasRestorationInfo = existing.restoredAt && existing.restorationReason;
        
        // Nếu entry mới có thông tin duyệt lại mà entry cũ không có, thay thế
        if (hasRestorationInfo && !existingHasRestorationInfo) {
          acc[existingIndex] = history;
        }
        // Nếu cả hai đều có hoặc đều không có thông tin duyệt lại, giữ lại entry đầu tiên
      }
      return acc;
    }, [] as typeof member.removalHistory) : [];

    // Tính toán lần xóa thứ mấy
    let removalCount = 1; // Mặc định là lần đầu
    
    if (uniqueHistory.length > 0) {
      // Nếu có lịch sử xóa, lần tiếp theo sẽ là số lượng lịch sử + 1
      removalCount = uniqueHistory.length + 1;
    } else if (member.removedAt && member.removalReason) {
      // Nếu không có lịch sử nhưng đã từng bị xóa, thì đây là lần xóa thứ 2
      removalCount = 2;
    }
    
    return { removalCount, previousRemovals: uniqueHistory.length };
  };



  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        ></div>

        {/* Modal panel */}
        <div className={`inline-block align-bottom rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all duration-300 sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full relative z-[100000] ${isDarkMode ? 'bg-gray-900/95' : 'bg-white/95'} backdrop-blur-md border border-gray-200/20`}>
          {/* Header */}
          <div className={`px-6 py-4 border-b ${isDarkMode ? 'border-gray-700 bg-gradient-to-r from-red-800 to-red-900' : 'border-gray-200 bg-gradient-to-r from-red-50 to-red-100'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600'}`}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <div>
                  <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-red-900'}`}>
                    Xóa thành viên khỏi CLB
                  </h3>
                  <p className={`text-xs ${isDarkMode ? 'text-red-300' : 'text-red-700'} mt-1`}>
                    Hành động này không thể hoàn tác
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className={`p-2 rounded-lg transition-all duration-200 hover:scale-110 ${isDarkMode ? 'text-red-300 hover:text-white hover:bg-red-500/20' : 'text-red-600 hover:text-red-800 hover:bg-red-200'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600 mx-auto mb-3"></div>
                <p className={`text-base font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Đang tải thông tin thành viên...</p>
                <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'} mt-2`}>Vui lòng chờ trong giây lát</p>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <div className={`w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-red-500/20' : 'bg-red-100'}`}>
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-red-600 text-base font-medium">{error}</p>
              </div>
            ) : member ? (
              <div className="space-y-6">
                {/* Warning Section */}
                <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-red-500/20' : 'bg-red-100'}`}>
                      <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className={`text-lg font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-red-900'}`}>
                        Xác nhận xóa thành viên
                      </h4>
                      <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>
                        Bạn có chắc chắn muốn xóa thành viên này khỏi CLB? Hành động này sẽ chuyển trạng thái thành viên sang "Đã xóa" và họ vẫn có thể đăng ký lại sau này.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Member Info */}
                <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border border-gray-200'}`}>
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      {member.userId?.avatarUrl ? (
                        <img
                          className="h-12 w-12 rounded-lg object-cover border border-gray-200"
                          src={member.userId.avatarUrl}
                          alt={member.userId.name || 'User'}
                        />
                      ) : (
                        <div className="h-12 w-12 bg-blue-600 rounded-lg flex items-center justify-center border border-gray-200">
                          <span className="text-white text-lg font-bold">
                            {getInitials(member.userId?.name || 'U')}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h5 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {member.userId?.name || 'Không có tên'}
                        </h5>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(member.userId?.role)}`}>
                          {getRoleDisplayName(member.userId?.role)}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-1 text-xs">
                        <p className={`flex items-center space-x-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span>{member.userId?.studentId || 'Không có MSSV'}</span>
                        </p>
                        <p className={`flex items-center space-x-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span>{member.userId?.email || 'Không có email'}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Info */}
                <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border border-gray-200'}`}>
                  <div className="flex items-center space-x-2 mb-3">
                    <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-gray-500/20 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h6 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Thông tin bổ sung
                    </h6>
                  </div>
                  <div className="grid grid-cols-1 gap-3 text-xs">
                    <div className={`flex items-center space-x-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>Ngày tham gia: {new Date(member.joinedAt).toLocaleDateString('vi-VN')}</span>
                    </div>
                    {member.userId?.class && (
                      <div className={`flex items-center space-x-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <span>Lớp: {member.userId.class}</span>
                      </div>
                    )}
                    {member.userId?.faculty && (
                      <div className={`flex items-center space-x-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                        </svg>
                        <span>Khoa/Viện: {member.userId.faculty}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Removal History Info */}
                {(member.removalHistory && member.removalHistory.length > 0) && (
                  <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-orange-500/10 border-orange-500/20' : 'bg-orange-50 border-orange-200'}`}>
                    <div className="flex items-center space-x-2 mb-3">
                      <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-orange-500/20' : 'bg-orange-100'}`}>
                        <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h6 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        Lịch sử xóa thành viên
                      </h6>
                    </div>
                    <div className="space-y-3">
                      {(() => {
                        // Loại bỏ các entries trùng lặp dựa trên removedAt (trong vòng 1 giây)
                        // Ưu tiên giữ lại entry có thông tin duyệt lại
                        const uniqueHistory = member.removalHistory!.reduce((acc, history) => {
                          const existingIndex = acc.findIndex(h => 
                            Math.abs(new Date(h.removedAt).getTime() - new Date(history.removedAt).getTime()) < 1000
                          );
                          
                          if (existingIndex === -1) {
                            // Không tìm thấy entry trùng lặp, thêm vào
                            acc.push(history);
                          } else {
                            // Tìm thấy entry trùng lặp, kiểm tra xem có thông tin duyệt lại không
                            const existing = acc[existingIndex];
                            const hasRestorationInfo = history.restoredAt && history.restorationReason;
                            const existingHasRestorationInfo = existing.restoredAt && existing.restorationReason;
                            
                            // Nếu entry mới có thông tin duyệt lại mà entry cũ không có, thay thế
                            if (hasRestorationInfo && !existingHasRestorationInfo) {
                              acc[existingIndex] = history;
                            }
                            // Nếu cả hai đều có hoặc đều không có thông tin duyệt lại, giữ lại entry đầu tiên
                          }
                          return acc;
                        }, [] as typeof member.removalHistory);

                        return uniqueHistory.map((history, index) => (
                          <div key={index} className="removal-history-light p-3 rounded-lg border">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-header text-sm font-medium">
                                Lần xóa thứ {index + 1}
                              </span>
                              <span className="text-content text-xs">
                                {new Date(history.removedAt).toLocaleDateString('vi-VN')}
                              </span>
                            </div>
                            <p className="text-content text-sm">
                              <strong>Lý do:</strong> {history.removalReason}
                            </p>
                            <p className="text-content text-xs">
                              <strong>Xóa bởi:</strong> {history.removedBy.name} ({history.removedBy.studentId})
                            </p>
                            {history.restoredAt && history.restorationReason && (
                              <div className="mt-2 pt-2 border-t border-orange-300/30">
                                <p className="text-green text-sm">
                                  <strong>Đã duyệt lại:</strong> {new Date(history.restoredAt).toLocaleDateString('vi-VN')}
                                </p>
                                <p className="text-green text-sm">
                                  <strong>Lý do duyệt lại:</strong> {history.restorationReason}
                                </p>
                              </div>
                            )}
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}

                {/* Removal Reason Input */}
                <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border border-gray-200'}`}>
                  <div className="flex items-center space-x-2 mb-3">
                    <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600'}`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h6 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Lý do xóa
                    </h6>
                  </div>
                  <div>
                    <div className="mb-3">
                      <span className={`text-sm font-medium ${isDarkMode ? 'text-red-300' : 'text-red-600'}`}>
                        Lần xóa thứ {getRemovalCount().removalCount}
                      </span>
                    </div>
                    <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Lý do xóa thành viên khỏi câu lạc bộ <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={removalReason}
                      onChange={(e) => setRemovalReason(e.target.value)}
                      placeholder={`Nhập lý do xóa thành viên khỏi câu lạc bộ (lần thứ ${getRemovalCount().removalCount})...`}
                      rows={3}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 text-sm ${
                        isDarkMode 
                          ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:ring-red-500/20 focus:border-red-500' 
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-red-500/20 focus:border-red-500'
                      }`}
                      required
                    />
                    {!removalReason.trim() && (
                      <p className="mt-2 text-sm text-red-600 font-medium flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Vui lòng nhập lý do xóa
                      </p>
                    )}
                  </div>
                </div>

                {/* Final Warning */}
                <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-orange-500/10 border-orange-500/20' : 'bg-orange-50 border-orange-200'}`}>
                  <div className="flex items-start space-x-2">
                    <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-orange-500/20' : 'bg-orange-100'}`}>
                      <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${isDarkMode ? 'text-orange-300' : 'text-orange-800'}`}>
                        <strong>Lưu ý quan trọng:</strong> Hành động này sẽ chuyển trạng thái thành viên sang "Đã xóa" nhưng không xóa hoàn toàn dữ liệu. Thành viên vẫn có thể đăng ký lại CLB trong tương lai.
                      </p>
                      {(() => {
                        const { removalCount, previousRemovals } = getRemovalCount();
                        
                        if (previousRemovals > 0) {
                          return (
                            <p className={`text-sm mt-2 ${isDarkMode ? 'text-orange-200' : 'text-orange-700'}`}>
                              <strong>Lịch sử:</strong> Thành viên này đã bị xóa {previousRemovals} lần trước đó. Lần này sẽ là lần thứ {removalCount}.
                            </p>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className={`w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
                  <svg className="w-6 h-6 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className={`text-base font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Không tìm thấy thông tin thành viên</p>
                <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'} mt-2`}>Vui lòng thử lại hoặc liên hệ quản trị viên</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={`px-6 py-4 border-t ${isDarkMode ? 'border-gray-700 bg-gradient-to-r from-gray-800 to-gray-900' : 'border-gray-200 bg-gradient-to-r from-gray-50 to-white'}`}>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  onClose();
                  setRemovalReason(''); // Reset reason when closing
                }}
                disabled={deleting}
                className={`px-6 py-2 rounded-lg border transition-all duration-200 font-semibold text-base hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${
                  isDarkMode 
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700 hover:border-gray-500' 
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                }`}
              >
                Hủy
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting || loading || !removalReason.trim()}
                className={`px-6 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2 font-semibold text-base shadow-md hover:shadow-lg transform hover:scale-105`}
              >
                {deleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Đang xóa...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>
                      Xóa thành viên 
                      {(() => {
                        const { removalCount } = getRemovalCount();
                        
                        if (removalCount > 1) {
                          return <span className="ml-1">(lần thứ {removalCount})</span>;
                        }
                        return null;
                      })()}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
