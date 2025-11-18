'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, X, AlertTriangle, User, Mail, XCircle, Calendar, FileEdit, RotateCw, AlertCircle, Loader, Building, GraduationCap } from 'lucide-react';

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

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



  if (!isOpen || !mounted) return null;

  const modalContent = (
    <>
      {/* Background overlay - phủ toàn màn hình bao gồm cả sidebar */}
      <div 
        className="fixed inset-0 bg-black/60 transition-opacity"
        onClick={onClose}
        style={{ 
          left: 0, 
          top: 0, 
          right: 0, 
          bottom: 0,
          zIndex: 99999
        }}
      ></div>

      {/* Modal panel */}
      <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none" style={{ zIndex: 100000 }}>
        <div className={`inline-block rounded-lg text-left overflow-hidden shadow-2xl transform transition-all duration-300 w-full max-w-lg pointer-events-auto ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}
          onClick={(e) => e.stopPropagation()}
          style={{ zIndex: 100000 }}
        >
          {/* Header */}
          <div className={`px-3 py-2 border-b ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Trash2 size={16} className={`${isDarkMode ? 'text-red-400' : 'text-red-600'}`} strokeWidth={1.5} />
                <h3 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Xóa thành viên khỏi CLB
                </h3>
              </div>
              <button
                onClick={onClose}
                className={`p-1 rounded-md transition-all duration-200 hover:scale-110 ${isDarkMode ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-3 py-3">
            {loading ? (
              <div className="text-center py-8">
                <Loader size={40} className="animate-spin text-red-600 mx-auto mb-3" strokeWidth={1.5} />
                <p className={`text-base font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Đang tải thông tin thành viên...</p>
                <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'} mt-2`}>Vui lòng chờ trong giây lát</p>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <div className={`w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-red-500/20' : 'bg-red-100'}`}>
                  <AlertCircle size={24} className="text-red-600" strokeWidth={1.5} />
                </div>
                <p className="text-red-600 text-base font-medium">{error}</p>
              </div>
            ) : member ? (
              <div className="space-y-3">
                {/* Warning Section */}
                <div className={`p-3 rounded-lg border ${isDarkMode ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-start space-x-2">
                    <AlertTriangle size={18} className="text-red-600 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                    <div>
                      <h4 className={`text-sm font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-red-900'}`}>
                        Xác nhận xóa thành viên
                      </h4>
                      <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>
                        Bạn có chắc chắn muốn xóa thành viên này khỏi CLB? Hành động này sẽ chuyển trạng thái thành viên sang "Đã xóa" và họ vẫn có thể đăng ký lại sau này.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Member Info & Additional Info - Gộp lại */}
                <div className={`p-3 rounded-lg border ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border border-gray-200'}`}>
                  <div className="flex items-start space-x-3 mb-3">
                    <div className="flex-shrink-0">
                      {member.userId?.avatarUrl ? (
                        <img
                          className="h-10 w-10 rounded-lg object-cover border border-gray-200"
                          src={member.userId.avatarUrl}
                          alt={member.userId.name || 'User'}
                        />
                      ) : (
                        <div className="h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center border border-gray-200">
                          <span className="text-white text-sm font-bold">
                            {getInitials(member.userId?.name || 'U')}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1.5">
                        <h5 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {member.userId?.name || 'Không có tên'}
                        </h5>
                        <span className={`px-1.5 py-0.5 rounded-full text-xs font-semibold ${getRoleBadgeColor(member.userId?.role)}`}>
                          {getRoleDisplayName(member.userId?.role)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                        <p className={`flex items-center space-x-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          <User size={10} strokeWidth={1.5} />
                          <span className="truncate">{member.userId?.studentId || 'Không có MSSV'}</span>
                        </p>
                        <p className={`flex items-center space-x-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          <Mail size={10} strokeWidth={1.5} />
                          <span className="truncate">{member.userId?.email || 'Không có email'}</span>
                        </p>
                        <p className={`flex items-center space-x-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          <Calendar size={10} strokeWidth={1.5} />
                          <span className="truncate">Tham gia: {new Date(member.joinedAt).toLocaleDateString('vi-VN')}</span>
                        </p>
                        {member.userId?.class && (
                          <p className={`flex items-center space-x-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            <Building size={10} strokeWidth={1.5} />
                            <span className="truncate">Lớp: {member.userId.class}</span>
                          </p>
                        )}
                        {member.userId?.faculty && (
                          <p className={`md:col-span-2 flex items-center space-x-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            <GraduationCap size={10} strokeWidth={1.5} />
                            <span className="truncate">Khoa/Viện: {member.userId.faculty}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Removal History Info */}
                {(member.removalHistory && member.removalHistory.length > 0) && (
                  <div className={`p-3 rounded-lg border ${isDarkMode ? 'bg-orange-500/10 border-orange-500/20' : 'bg-orange-50 border-orange-200'}`}>
                    <div className="flex items-center space-x-2 mb-2">
                      <AlertCircle size={14} className="text-orange-600" strokeWidth={1.5} />
                      <h6 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        Lịch sử xóa thành viên
                      </h6>
                    </div>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
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
                          <div key={index} className={`p-2 rounded border ${isDarkMode ? 'bg-orange-500/5 border-orange-500/10' : 'bg-white border-orange-200'}`}>
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-xs font-medium ${isDarkMode ? 'text-orange-300' : 'text-orange-800'}`}>
                                Lần xóa thứ {index + 1}
                              </span>
                              <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                {new Date(history.removedAt).toLocaleDateString('vi-VN')}
                              </span>
                            </div>
                            <p className={`text-xs mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              <strong>Lý do:</strong> {history.removalReason}
                            </p>
                            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              <strong>Xóa bởi:</strong> {history.removedBy.name} ({history.removedBy.studentId})
                            </p>
                            {history.restoredAt && history.restorationReason && (
                              <div className="mt-1.5 pt-1.5 border-t border-orange-300/30">
                                <p className={`text-xs ${isDarkMode ? 'text-green-400' : 'text-green-700'}`}>
                                  <strong>Đã duyệt lại:</strong> {new Date(history.restoredAt).toLocaleDateString('vi-VN')}
                                </p>
                                <p className={`text-xs ${isDarkMode ? 'text-green-400' : 'text-green-700'}`}>
                                  <strong>Lý do:</strong> {history.restorationReason}
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
                <div className={`p-3 rounded-lg border ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border border-gray-200'}`}>
                  <div className="flex items-center space-x-2 mb-2">
                    <FileEdit size={14} className={`${isDarkMode ? 'text-red-400' : 'text-red-600'}`} strokeWidth={1.5} />
                    <h6 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Lý do xóa <span className="text-red-500">*</span>
                    </h6>
                    <span className={`text-xs font-medium ${isDarkMode ? 'text-red-300' : 'text-red-600'}`}>
                      (Lần thứ {getRemovalCount().removalCount})
                    </span>
                  </div>
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
                    <p className="mt-1.5 text-xs text-red-600 font-medium flex items-center">
                      <AlertCircle size={14} className="mr-1" strokeWidth={1.5} />
                      Vui lòng nhập lý do xóa
                    </p>
                  )}
                </div>

                {/* Final Warning */}
                <div className={`p-3 rounded-lg border ${isDarkMode ? 'bg-orange-500/10 border-orange-500/20' : 'bg-orange-50 border-orange-200'}`}>
                  <div className="flex items-start space-x-2">
                    <AlertTriangle size={14} className="text-orange-600 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                    <div>
                      <p className={`text-xs font-medium ${isDarkMode ? 'text-orange-300' : 'text-orange-800'}`}>
                        <strong>Lưu ý:</strong> Hành động này sẽ chuyển trạng thái thành viên sang "Đã xóa" nhưng không xóa hoàn toàn dữ liệu. Thành viên vẫn có thể đăng ký lại CLB trong tương lai.
                      </p>
                      {(() => {
                        const { removalCount, previousRemovals } = getRemovalCount();
                        
                        if (previousRemovals > 0) {
                          return (
                            <p className={`text-xs mt-1.5 ${isDarkMode ? 'text-orange-200' : 'text-orange-700'}`}>
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
          <div className={`px-3 py-2 border-t ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
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
                    <Loader size={16} className="animate-spin" strokeWidth={1.5} />
                    <span>Đang xóa...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={16} strokeWidth={1.5} />
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
    </>
  );

  return createPortal(modalContent, document.body);
}
