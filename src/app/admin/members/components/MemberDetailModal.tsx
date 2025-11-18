'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { User, X, Mail, Phone, Building, Calendar, GraduationCap, Shield, Users, Crown, CheckCircle2, XCircle, Clock, AlertCircle, Loader } from 'lucide-react';

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
  status: 'ACTIVE' | 'PENDING' | 'REJECTED';
  joinedAt: string;
  approvedAt?: string;
  approvedBy?: {
    _id: string;
    name: string;
    studentId: string;
  };
  motivation?: string;
  experience?: string;
  expectations?: string;
  commitment?: string;
  createdAt: string;
  updatedAt: string;
}

interface MemberDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberId: string | null;
  isDarkMode: boolean;
}

export default function MemberDetailModal({ isOpen, onClose, memberId, isDarkMode }: MemberDetailModalProps) {
  const [member, setMember] = useState<ClubMember | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const getRoleBadgeColor = (role: string | undefined | null) => {
    if (!role || role.trim() === '') {
      return 'bg-gray-600 text-white shadow-lg';
    }
    
    switch (role) {
      case 'SUPER_ADMIN': return 'bg-purple-600 text-white shadow-lg';
      case 'CLUB_LEADER': return 'bg-red-600 text-white shadow-lg';
      case 'CLUB_DEPUTY': return 'bg-orange-600 text-white shadow-lg';
      case 'CLUB_MEMBER': return 'bg-blue-600 text-white shadow-lg';
      case 'CLUB_STUDENT': return 'bg-emerald-600 text-white shadow-lg';
      case 'STUDENT': return 'bg-gray-600 text-white shadow-lg';
      default: return 'bg-gray-600 text-white shadow-lg';
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

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-600 text-white shadow-lg';
      case 'PENDING': return 'bg-yellow-600 text-white shadow-lg';
      case 'REJECTED': return 'bg-red-600 text-white shadow-lg';
      default: return 'bg-gray-600 text-white shadow-lg';
    }
  };

  const getStatusDisplayName = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'Đang hoạt động';
      case 'PENDING': return 'Chờ duyệt';
      case 'REJECTED': return 'Đã từ chối';
      default: return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
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
      <div 
        className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none"
        style={{
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          margin: 0,
          padding: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100000
        }}
      >
        <div 
          className={`relative rounded-lg text-left overflow-hidden shadow-2xl transform transition-all duration-300 w-full max-w-lg pointer-events-auto ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}
          onClick={(e) => e.stopPropagation()}
          style={{ 
            margin: '0 auto',
            maxHeight: '85vh',
            overflowY: 'auto',
            zIndex: 100000
          }}
        >
          {/* Header */}
          <div className={`px-3 py-2 border-b ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <User size={16} className={`${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} strokeWidth={1.5} />
                <h3 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Chi tiết thành viên CLB
                </h3>
              </div>
              <button
                onClick={onClose}
                className={`p-1 rounded-md transition-all duration-300 hover:scale-110 ${isDarkMode ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-3 py-3">
            {loading ? (
              <div className="text-center py-6">
                <Loader size={32} className="animate-spin text-blue-600 mx-auto mb-2" strokeWidth={1.5} />
                <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Đang tải thông tin...</p>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <div className={`p-4 rounded-lg max-w-md mx-auto ${isDarkMode ? 'bg-red-900/20 border border-red-700' : 'bg-red-50 border border-red-200'}`}>
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <AlertCircle size={20} className="text-red-600" strokeWidth={1.5} />
                  </div>
                  <p className="text-red-600 font-semibold text-base">{error}</p>
                </div>
              </div>
            ) : member ? (
              <div className="space-y-2">
                {/* Member Info Card */}
                <div className={`p-2.5 rounded-md ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} shadow-sm`}>
                  <div className="flex items-center space-x-2.5">
                    <div className="flex-shrink-0">
                      {member.userId?.avatarUrl ? (
                        <img
                          className="h-10 w-10 rounded-md object-cover border border-gray-200"
                          src={member.userId.avatarUrl}
                          alt={member.userId.name || 'User'}
                        />
                      ) : (
                        <div className="h-10 w-10 bg-blue-600 rounded-md flex items-center justify-center border border-gray-200">
                          <span className="text-white text-xs font-bold">
                            {getInitials(member.userId?.name || 'U')}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-base font-bold mb-0.5 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {member.userId?.name || 'Không có tên'}
                      </h4>
                      <p className={`text-sm mb-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} font-medium`}>
                        {member.userId?.studentId || 'Không có MSSV'}
                      </p>
                      <div className="flex items-center space-x-1.5 flex-wrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-bold rounded ${getRoleBadgeColor(member.userId?.role)}`}>
                          {getRoleDisplayName(member.userId?.role)}
                        </span>
                        <span className={`inline-flex px-2 py-1 text-xs font-bold rounded ${getStatusBadgeColor(member.status)}`}>
                          {getStatusDisplayName(member.status)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact Info Card */}
                <div className={`p-2.5 rounded-md ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} shadow-sm`}>
                  <h5 className={`text-sm font-bold mb-1.5 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Thông tin liên hệ
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                    <div className={`p-2 rounded ${isDarkMode ? 'bg-gray-700 border border-gray-600' : 'bg-gray-50 border border-gray-200'}`}>
                      <p className={`text-xs font-semibold mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} uppercase`}>Email</p>
                      <p className={`font-medium text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {member.userId?.email || 'Không có email'}
                      </p>
                    </div>
                    {member.userId?.phone && (
                      <div className={`p-2 rounded ${isDarkMode ? 'bg-gray-700 border border-gray-600' : 'bg-gray-50 border border-gray-200'}`}>
                        <p className={`text-xs font-semibold mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} uppercase`}>Số điện thoại</p>
                        <p className={`font-medium text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{member.userId.phone}</p>
                      </div>
                    )}
                    {member.userId?.class && (
                      <div className={`p-2 rounded ${isDarkMode ? 'bg-gray-700 border border-gray-600' : 'bg-gray-50 border border-gray-200'}`}>
                        <p className={`text-xs font-semibold mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} uppercase`}>Lớp</p>
                        <p className={`font-medium text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{member.userId.class}</p>
                      </div>
                    )}
                    {member.userId?.faculty && (
                      <div className={`p-2 rounded ${isDarkMode ? 'bg-gray-700 border border-gray-600' : 'bg-gray-50 border border-gray-200'}`}>
                        <p className={`text-xs font-semibold mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} uppercase`}>Khoa/Viện</p>
                        <p className={`font-medium text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{member.userId.faculty}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Membership Info Card */}
                <div className={`p-2.5 rounded-md ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} shadow-sm`}>
                  <h5 className={`text-sm font-bold mb-1.5 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Thông tin thành viên
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                    <div className={`p-2 rounded ${isDarkMode ? 'bg-gray-700 border border-gray-600' : 'bg-gray-50 border border-gray-200'}`}>
                      <p className={`text-xs font-semibold mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} uppercase`}>Ngày tham gia</p>
                      <p className={`font-medium text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {formatDate(member.joinedAt)}
                      </p>
                    </div>
                    {member.approvedAt && (
                      <div className={`p-2 rounded ${isDarkMode ? 'bg-gray-700 border border-gray-600' : 'bg-gray-50 border border-gray-200'}`}>
                        <p className={`text-xs font-semibold mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} uppercase`}>Ngày duyệt</p>
                        <p className={`font-medium text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {formatDate(member.approvedAt)}
                        </p>
                      </div>
                    )}
                    {member.approvedBy && (
                      <div className={`p-2 rounded ${isDarkMode ? 'bg-gray-700 border border-gray-600' : 'bg-gray-50 border border-gray-200'} md:col-span-2`}>
                        <p className={`text-xs font-semibold mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} uppercase`}>Người duyệt</p>
                        <p className={`font-medium text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {member.approvedBy.name} ({member.approvedBy.studentId})
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Application Details Card */}
                {(member.motivation || member.experience || member.expectations || member.commitment) && (
                  <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} shadow-sm`}>
                    <h5 className={`text-base font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Chi tiết đơn đăng ký
                    </h5>
                    <div className="space-y-2">
                      {member.motivation && (
                        <div className={`p-2 rounded ${isDarkMode ? 'bg-gray-700 border border-gray-600' : 'bg-gray-50 border border-gray-200'}`}>
                          <p className={`text-xs font-semibold mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} uppercase`}>
                            Động lực tham gia
                          </p>
                          <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} leading-relaxed text-sm`}>
                            {member.motivation}
                          </p>
                        </div>
                      )}
                      {member.experience && (
                        <div className={`p-2 rounded ${isDarkMode ? 'bg-gray-700 border border-gray-600' : 'bg-gray-50 border border-gray-200'}`}>
                          <p className={`text-xs font-semibold mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} uppercase`}>
                            Kinh nghiệm
                          </p>
                          <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} leading-relaxed text-sm`}>
                            {member.experience}
                          </p>
                        </div>
                      )}
                      {member.expectations && (
                        <div className={`p-2 rounded ${isDarkMode ? 'bg-gray-700 border border-gray-600' : 'bg-gray-50 border border-gray-200'}`}>
                          <p className={`text-xs font-semibold mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} uppercase`}>
                            Kỳ vọng
                          </p>
                          <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} leading-relaxed text-sm`}>
                            {member.expectations}
                          </p>
                        </div>
                      )}
                      {member.commitment && (
                        <div className={`p-2 rounded ${isDarkMode ? 'bg-gray-700 border border-gray-600' : 'bg-gray-50 border border-gray-200'}`}>
                          <p className={`text-xs font-semibold mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} uppercase`}>
                            Cam kết
                          </p>
                          <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} leading-relaxed text-sm`}>
                            {member.commitment}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className={`p-6 rounded-xl max-w-md mx-auto ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-gray-50 border border-gray-200'}`}>
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <p className={`text-base font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Không tìm thấy thông tin thành viên
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={`px-3 py-2 border-t ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className={`px-4 py-2 rounded-md text-sm font-semibold transition-all duration-300 hover:scale-105 shadow-md ${isDarkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
}
