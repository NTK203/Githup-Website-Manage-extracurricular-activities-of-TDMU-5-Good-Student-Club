'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface RemovalNotificationProps {
  isDarkMode: boolean;
}

interface RemovalInfo {
  removedAt?: string | Date;
  removalReason?: string;
  removedBy?: {
    name?: string;
    studentId?: string;
  };
}

export default function RemovalNotification({ isDarkMode }: RemovalNotificationProps) {
  const { user } = useAuth();
  const [removalInfo, setRemovalInfo] = useState<RemovalInfo | null>(null);
  const [showNotification, setShowNotification] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      checkRemovalStatus();
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
           setShowNotification(true);
         }
       }
    } catch (error) {
      console.error('Error checking removal status:', error);
    } finally {
      setLoading(false);
    }
  };

  const dismissNotification = () => {
    setShowNotification(false);
    // Optionally mark as dismissed in localStorage
    localStorage.setItem('removalNotificationDismissed', 'true');
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

  if (loading || !showNotification || !removalInfo) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md w-full">
      <div className={`${isDarkMode ? 'bg-red-900 border-red-700' : 'bg-red-50 border-red-200'} border rounded-lg shadow-lg p-4`}>
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-red-800' : 'bg-red-100'}`}>
              <span className="text-red-600 dark:text-red-400 text-lg">⚠️</span>
            </div>
          </div>
          
          <div className="ml-3 flex-1">
            <h3 className={`text-sm font-medium ${isDarkMode ? 'text-red-200' : 'text-red-800'}`}>
              Thông báo quan trọng
            </h3>
            
            <div className={`mt-2 text-sm ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>
              <p className="font-medium mb-2">
                Bạn đã bị xóa khỏi CLB Sinh viên 5 Tốt TDMU
              </p>
              
                             <div className="space-y-1 text-xs">
                 <div>
                   <strong>Thời gian:</strong> {removalInfo.removedAt ? formatDate(removalInfo.removedAt) : 'Không xác định'}
                 </div>
                 <div>
                   <strong>Người thực hiện:</strong> {removalInfo.removedBy?.name || 'Không xác định'} ({removalInfo.removedBy?.studentId || 'N/A'})
                 </div>
                 <div>
                   <strong>Lý do:</strong> {removalInfo.removalReason || 'Không có lý do'}
                 </div>
               </div>
              
              <div className={`mt-3 p-2 rounded ${isDarkMode ? 'bg-red-800' : 'bg-red-100'}`}>
                <p className="text-xs">
                  💡 <strong>Lưu ý:</strong> Bạn có thể đăng ký lại tham gia câu lạc bộ sau khi đã khắc phục các vấn đề được nêu trong lý do xóa.
                </p>
              </div>
            </div>
          </div>
          
          <div className="ml-4 flex-shrink-0">
            <button
              onClick={dismissNotification}
              className={`inline-flex text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none focus:text-gray-600 dark:focus:text-gray-300`}
            >
              <span className="sr-only">Đóng</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
