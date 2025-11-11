'use client';

import { useState, useEffect, useMemo, Fragment } from 'react';
import { useParams, useRouter } from 'next/navigation';
import OfficerNav from '@/components/officer/OfficerNav';
import Footer from '@/components/common/Footer';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';

interface AttendanceRecord {
  _id: string;
  timeSlot: string;
  checkInType: string;
  checkInTime: string;
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
  photoUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  verifiedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  verifiedAt?: string;
  verificationNote?: string;
  lateReason?: string;
}

interface Participant {
  userId: string | { _id: string; name: string; email: string };
  name: string;
  email: string;
  role: string;
  checkedIn: boolean;
  checkedInAt?: string;
  checkedInBy?: string;
  checkInLocation?: {
    lat: number;
    lng: number;
    address?: string;
  };
  attendances?: AttendanceRecord[];
}

interface TimeSlot {
  name: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

interface Activity {
  _id: string;
  name: string;
  date: string;
  location: string;
  locationData?: {
    lat: number;
    lng: number;
    address: string;
    radius: number;
  };
  timeSlots?: TimeSlot[];
  multiTimeLocations?: Array<{
    timeSlot: 'morning' | 'afternoon' | 'evening';
    location: {
      lat: number;
      lng: number;
      address?: string;
    };
    radius: number;
  }>;
}

interface AttendanceStats {
  total: number;
  checkedIn: number;
  notCheckedIn: number;
  attendanceRate: number;
  perfect: number;
  lateButValid: number;
  invalid: number;
}

// Image Modal Component
function ImageModal({ 
  imageUrl, 
  isOpen, 
  onClose 
}: { 
  imageUrl: string | null; 
  isOpen: boolean; 
  onClose: () => void;
}) {
  if (!isOpen || !imageUrl) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="relative max-w-7xl max-h-[90vh] p-4">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <img
          src={imageUrl}
          alt="Ảnh điểm danh"
          className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
          <a
            href={imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white text-sm font-medium transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            Mở trong tab mới
          </a>
        </div>
      </div>
    </div>
  );
}

export default function AttendancePage() {
  const { activityId } = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [stats, setStats] = useState<AttendanceStats>({
    total: 0,
    checkedIn: 0,
    notCheckedIn: 0,
    attendanceRate: 0,
    perfect: 0,
    lateButValid: 0,
    invalid: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [processing, setProcessing] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'checkedIn' | 'notCheckedIn'>('all');
  const [filterParticipationStatus, setFilterParticipationStatus] = useState<'all' | 'fullyAttended' | 'incomplete' | 'notAttended'>('all');
  const [filterAttendanceStatus, setFilterAttendanceStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [filterValidationStatus, setFilterValidationStatus] = useState<'all' | 'perfect' | 'late_but_valid' | 'invalid'>('all');
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set());
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [verifyingAttendance, setVerifyingAttendance] = useState<Set<string>>(new Set());
  const [verificationNote, setVerificationNote] = useState<{ [key: string]: string }>({});
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [cancelModal, setCancelModal] = useState<{ open: boolean; attendanceId: string | null; participantId?: string | null }>({ open: false, attendanceId: null, participantId: null });
  const [cancelReason, setCancelReason] = useState<string>('');
  const [checkInAllModal, setCheckInAllModal] = useState<{ open: boolean; checkedIn: boolean }>({ open: false, checkedIn: true });

  const hasAccess = user && (user.role === 'CLUB_DEPUTY' || user.role === 'OFFICER' || user.role === 'CLUB_MEMBER');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
    
    if (!authLoading && hasAccess) {
      fetchAttendance();
    } else if (user && !hasAccess) {
      setLoading(false);
      setError('Bạn không có quyền truy cập trang này.');
    }
  }, [activityId, hasAccess, authLoading, user]);

  useEffect(() => {
    const handleThemeChange = () => {
      const savedTheme = localStorage.getItem('theme');
      setIsDarkMode(savedTheme === 'dark');
    };
    
    window.addEventListener('themeChange', handleThemeChange);
    return () => window.removeEventListener('themeChange', handleThemeChange);
  }, []);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/activities/${activityId}/attendance`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Không thể tải danh sách điểm danh');
      }

      const data = await response.json();
      if (data.success && data.data) {
        // Fetch full activity data to get timeSlots and multiTimeLocations
        const activityResponse = await fetch(`/api/activities/${activityId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (activityResponse.ok) {
          const activityData = await activityResponse.json();
          if (activityData.success && activityData.data?.activity) {
            setActivity({
              ...data.data.activity,
              timeSlots: activityData.data.activity.timeSlots,
              multiTimeLocations: activityData.data.activity.multiTimeLocations
            });
          } else {
            setActivity(data.data.activity);
          }
        } else {
          setActivity(data.data.activity);
        }
        
        setParticipants(data.data.participants || []);
        const baseStats = data.data.statistics || {
          total: 0,
          checkedIn: 0,
          notCheckedIn: 0,
          attendanceRate: 0
        };
        setStats({
          ...baseStats,
          perfect: 0,
          lateButValid: 0,
          invalid: 0
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (participant: Participant, checkedIn: boolean) => {
    const participantId = typeof participant.userId === 'object' && participant.userId !== null
      ? participant.userId._id || String(participant.userId)
      : String(participant.userId);
    
    if (processing.has(participantId)) return;
    
    try {
      setProcessing(prev => new Set(prev).add(participantId));
      setError(null);
      
      let location = null;
      if (checkedIn && navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            address: null
          };
        } catch (geoError) {
          console.log('Could not get location:', geoError);
        }
      }
      
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/activities/${activityId}/attendance`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: participantId,
          checkedIn: checkedIn,
          location: location
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Không thể điểm danh');
      }

      await fetchAttendance();
      setSuccessMessage(checkedIn ? 'Đã điểm danh thành công' : 'Đã hủy điểm danh thành công');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setProcessing(prev => {
        const newSet = new Set(prev);
        newSet.delete(participantId);
        return newSet;
      });
    }
  };

  const handleVerifyAttendance = async (attendanceId: string, status: 'approved' | 'rejected') => {
    if (verifyingAttendance.has(attendanceId)) return;
    
    try {
      setVerifyingAttendance(prev => new Set(prev).add(attendanceId));
      setError(null);
      
      const token = localStorage.getItem('token');
      const note = verificationNote[attendanceId] || '';
      
      const requestBody: { status: string; verificationNote?: string; cancelReason?: string } = {
        status: status
      };
      
      if (status === 'rejected') {
        // When rejecting, send cancelReason (and verificationNote for backward compatibility)
        if (note.trim()) {
          requestBody.cancelReason = note.trim();
          requestBody.verificationNote = note.trim();
        }
      } else if (status === 'approved') {
        // When approving, send verificationNote
        if (note.trim()) {
          requestBody.verificationNote = note.trim();
        }
      }
      
      const response = await fetch(`/api/attendance/${attendanceId}/verify`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Không thể xác nhận điểm danh');
      }

      await fetchAttendance();
      setSuccessMessage(status === 'approved' ? 'Đã xác nhận điểm danh thành công' : 'Đã từ chối điểm danh thành công');
      setTimeout(() => setSuccessMessage(null), 3000);
      
      setVerificationNote(prev => {
        const newNotes = { ...prev };
        delete newNotes[attendanceId];
        return newNotes;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setVerifyingAttendance(prev => {
        const newSet = new Set(prev);
        newSet.delete(attendanceId);
        return newSet;
      });
    }
  };

  const handleBulkCheckIn = async (checkedIn: boolean) => {
    if (selectedParticipants.size === 0) return;
    
    try {
      setError(null);
      const token = localStorage.getItem('token');
      
      const promises = Array.from(selectedParticipants).map(async (participantId) => {
        const response = await fetch(`/api/activities/${activityId}/attendance`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            userId: participantId,
            checkedIn: checkedIn
          }),
        });
        return response.ok;
      });

      const results = await Promise.all(promises);
      const successCount = results.filter(r => r).length;
      
      await fetchAttendance();
      setSelectedParticipants(new Set());
      setSuccessMessage(`Đã ${checkedIn ? 'điểm danh' : 'hủy điểm danh'} ${successCount} người thành công`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    }
  };

  const handleCheckInAll = async (checkedIn: boolean) => {
    if (filteredParticipants.length === 0) return;
    
    try {
      setError(null);
      const token = localStorage.getItem('token');
      
      // Lấy tất cả userId từ filteredParticipants
      const allParticipantIds = filteredParticipants.map(p => {
        return typeof p.userId === 'object' && p.userId !== null
          ? p.userId._id || String(p.userId)
          : String(p.userId);
      });
      
      const promises = allParticipantIds.map(async (participantId) => {
        const response = await fetch(`/api/activities/${activityId}/attendance`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            userId: participantId,
            checkedIn: checkedIn
          }),
        });
        return response.ok;
      });

      const results = await Promise.all(promises);
      const successCount = results.filter(r => r).length;
      
      await fetchAttendance();
      setSelectedParticipants(new Set());
      setSuccessMessage(`Đã ${checkedIn ? 'điểm danh' : 'hủy điểm danh'} ${successCount}/${filteredParticipants.length} người thành công`);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi điểm danh hàng loạt');
    }
  };

  const toggleSelectParticipant = (participantId: string) => {
    setSelectedParticipants(prev => {
      const newSet = new Set(prev);
      if (newSet.has(participantId)) {
        newSet.delete(participantId);
      } else {
        newSet.add(participantId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedParticipants.size === filteredParticipants.length) {
      setSelectedParticipants(new Set());
    } else {
      setSelectedParticipants(new Set(filteredParticipants.map(p => {
        return typeof p.userId === 'object' && p.userId !== null
          ? p.userId._id || String(p.userId)
          : String(p.userId);
      })));
    }
  };

  const toggleRowExpansion = (participantId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(participantId)) {
        newSet.delete(participantId);
      } else {
        newSet.add(participantId);
      }
      return newSet;
    });
  };

  // Helper functions - must be defined before useMemo hooks that use them
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Helper function to get verifier name
  const getVerifierName = (verifiedBy: any): string => {
    if (!verifiedBy) {
      return 'Người quản trị';
    }
    
    if (typeof verifiedBy === 'object') {
      // Check name field first (most common)
      if (verifiedBy.name && typeof verifiedBy.name === 'string' && verifiedBy.name.trim().length > 0) {
        return verifiedBy.name.trim();
      }
      
      // Fallback to other possible fields
      if (verifiedBy.fullName && typeof verifiedBy.fullName === 'string' && verifiedBy.fullName.trim().length > 0) {
        return verifiedBy.fullName.trim();
      }
      
      if (verifiedBy.username && typeof verifiedBy.username === 'string' && verifiedBy.username.trim().length > 0) {
        return verifiedBy.username.trim();
      }
      
      // Don't use email as name - just return default
      return 'Người quản trị';
    }
    
    return 'Người quản trị';
  };

  // Calculate distance between two GPS coordinates (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  // Validate location
  const validateLocation = (attendance: AttendanceRecord): { valid: boolean; distance?: number; message?: string } => {
    if (!activity || !attendance.location) {
      return { valid: true, message: 'Không yêu cầu vị trí' };
    }

    const userLat = attendance.location.lat;
    const userLng = attendance.location.lng;

    // Check single location
    if (activity.locationData) {
      const distance = calculateDistance(
        userLat,
        userLng,
        activity.locationData.lat,
        activity.locationData.lng
      );
      
      if (distance <= activity.locationData.radius) {
        return { valid: true, distance };
      } else {
        return {
          valid: false,
          distance,
          message: `Cách vị trí hoạt động ${distance.toFixed(0)}m (yêu cầu: trong ${activity.locationData.radius}m)`
        };
      }
    }

    // Check multi-time locations
    if (activity.multiTimeLocations && activity.multiTimeLocations.length > 0) {
      // Map time slot name to enum
      const timeSlotMap: { [key: string]: 'morning' | 'afternoon' | 'evening' } = {
        'Buổi Sáng': 'morning',
        'Buổi Chiều': 'afternoon',
        'Buổi Tối': 'evening'
      };
      const timeSlot = timeSlotMap[attendance.timeSlot];
      
      if (timeSlot) {
        const targetLocation = activity.multiTimeLocations.find(mtl => mtl.timeSlot === timeSlot);
        if (targetLocation) {
          const distance = calculateDistance(
            userLat,
            userLng,
            targetLocation.location.lat,
            targetLocation.location.lng
          );
          
          if (distance <= targetLocation.radius) {
            return { valid: true, distance };
          } else {
            return {
              valid: false,
              distance,
              message: `Cách vị trí ${attendance.timeSlot} ${distance.toFixed(0)}m (yêu cầu: trong ${targetLocation.radius}m)`
            };
          }
        }
      }
      
      // Check against all locations if timeSlot not found
      let minDistance = Infinity;
      let closestLocation = null;

      for (const mtl of activity.multiTimeLocations) {
        const distance = calculateDistance(
          userLat,
          userLng,
          mtl.location.lat,
          mtl.location.lng
        );
        
        if (distance <= mtl.radius) {
          return { valid: true, distance };
        }
        
        if (distance < minDistance) {
          minDistance = distance;
          closestLocation = mtl;
        }
      }

      if (closestLocation) {
        const timeSlotNames: { [key: string]: string } = {
          'morning': 'Buổi Sáng',
          'afternoon': 'Buổi Chiều',
          'evening': 'Buổi Tối'
        };
        return {
          valid: false,
          distance: minDistance,
          message: `Cách vị trí ${timeSlotNames[closestLocation.timeSlot]} ${minDistance.toFixed(0)}m (yêu cầu: trong ${closestLocation.radius}m)`
        };
      }
    }

    return { valid: true, message: 'Không yêu cầu vị trí' };
  };

  // Validate time with late detection (updated to use two-window logic: on-time and late window)
  const validateTime = (attendance: AttendanceRecord): { valid: boolean; message?: string; isLate?: boolean; isOnTime?: boolean; isEarly?: boolean; isInLateWindow?: boolean } => {
    if (!activity || !activity.timeSlots || activity.timeSlots.length === 0) {
      return { valid: true, message: 'Không yêu cầu thời gian cụ thể', isOnTime: true };
    }

    const checkInTime = new Date(attendance.checkInTime);
    const activityDate = new Date(activity.date);
    
    // Find the time slot
    const timeSlot = activity.timeSlots.find(ts => ts.name === attendance.timeSlot && ts.isActive);
    if (!timeSlot) {
      return { valid: false, message: 'Không tìm thấy thông tin thời gian cho buổi này' };
    }

    // Parse start and end times
    const [startHours, startMinutes] = timeSlot.startTime.split(':').map(Number);
    const [endHours, endMinutes] = timeSlot.endTime.split(':').map(Number);
    
    const slotStartTime = new Date(activityDate);
    slotStartTime.setHours(startHours, startMinutes, 0, 0);
    
    const slotEndTime = new Date(activityDate);
    slotEndTime.setHours(endHours, endMinutes, 0, 0);

    let targetTime: Date;
    if (attendance.checkInType === 'start') {
      targetTime = slotStartTime;
    } else {
      targetTime = slotEndTime;
    }
    
    // On-time window: 15 minutes before to 15 minutes after target time (auto-approve)
    const onTimeStart = new Date(targetTime);
    onTimeStart.setMinutes(onTimeStart.getMinutes() - 15);
    const onTimeEnd = new Date(targetTime);
    onTimeEnd.setMinutes(onTimeEnd.getMinutes() + 15);
    
    // Late window: from 15 minutes after to 30 minutes after target time (pending, needs approval)
    const lateWindowStart = new Date(targetTime);
    lateWindowStart.setMinutes(lateWindowStart.getMinutes() + 15);
    const lateWindowEnd = new Date(targetTime);
    lateWindowEnd.setMinutes(lateWindowEnd.getMinutes() + 30);
    
    // Check if within on-time window (auto-approve)
    if (checkInTime >= onTimeStart && checkInTime <= onTimeEnd) {
      return { 
        valid: true, 
        isOnTime: true,
        isLate: false,
        isEarly: false,
        isInLateWindow: false
      };
    }
    
    // Check if within late window (pending, but valid)
    if (checkInTime > onTimeEnd && checkInTime <= lateWindowEnd) {
      const diffMinutes = Math.round((checkInTime.getTime() - targetTime.getTime()) / (1000 * 60));
      return { 
        valid: true, 
        isOnTime: false,
        isLate: true,
        isEarly: false,
        isInLateWindow: true,
        message: `Điểm danh muộn ${diffMinutes} phút so với thời gian quy định (trong cửa sổ trễ hợp lệ)` 
      };
    }
    
    // Check if too early (before on-time window)
    if (checkInTime < onTimeStart) {
      const diffMinutes = Math.round((targetTime.getTime() - checkInTime.getTime()) / (1000 * 60));
      return { 
        valid: false, 
        isOnTime: false,
        isLate: false,
        isEarly: true,
        isInLateWindow: false,
        message: `Điểm danh sớm ${diffMinutes} phút so với thời gian quy định` 
      };
    }
    
    // Check if too late (after late window, > 30 minutes after target time)
    if (checkInTime > lateWindowEnd) {
      const diffMinutes = Math.round((checkInTime.getTime() - targetTime.getTime()) / (1000 * 60));
      return { 
        valid: false, 
        isOnTime: false,
        isLate: true,
        isEarly: false,
        isInLateWindow: false,
        message: `Điểm danh quá trễ ${diffMinutes} phút so với thời gian quy định (quá 30 phút sau giờ quy định)` 
      };
    }
    
    return { valid: false, message: 'Thời gian điểm danh không hợp lệ' };
  };

  // Calculate completed sessions count for a participant
  // Returns: completed (both start and end approved), partial (only start or only end approved), total
  const getCompletedSessionsCount = (participant: Participant): { 
    completed: number; 
    partial: number;
    total: number;
  } => {
    if (!activity || !activity.timeSlots || activity.timeSlots.length === 0) {
      return { completed: 0, partial: 0, total: 0 };
    }

    const totalSlots = activity.timeSlots.length;
    let completedSlots = 0;
    let partialSlots = 0;

    activity.timeSlots.forEach((slot) => {
      const startRecord = participant.attendances?.find(
        (a) => a.timeSlot === slot.name && a.checkInType === 'start' && a.status === 'approved'
      );
      const endRecord = participant.attendances?.find(
        (a) => a.timeSlot === slot.name && a.checkInType === 'end' && a.status === 'approved'
      );

      // If both start and end are approved, the session is completed
      if (startRecord && endRecord) {
        completedSlots++;
      } else if (startRecord || endRecord) {
        // If only one of them is approved, it's a partial session
        partialSlots++;
      }
    });

    return { completed: completedSlots, partial: partialSlots, total: totalSlots };
  };

  // Check if participant has fully attended (all sessions completed)
  const isFullyAttended = (participant: Participant): boolean => {
    const sessionCount = getCompletedSessionsCount(participant);
    // Fully attended means: all sessions are completed (both start and end approved)
    // and there are no partial sessions
    return sessionCount.total > 0 && 
           sessionCount.completed === sessionCount.total && 
           sessionCount.partial === 0;
  };

  // Check if participant has incomplete attendance (has partial sessions or missing sessions)
  const hasIncompleteAttendance = (participant: Participant): boolean => {
    const sessionCount = getCompletedSessionsCount(participant);
    // Incomplete means: 
    // 1. Has partial sessions (only start or only end approved), OR
    // 2. Has not completed all sessions (completed < total)
    return sessionCount.total > 0 && 
           (sessionCount.partial > 0 || sessionCount.completed < sessionCount.total);
  };

  // Classify attendance type with detailed invalid information
  // Updated logic: 
  // - approved status = auto-approved (perfect: valid location, valid time, has photo)
  // - pending status = needs review (late/early but valid location, has photo)
  // - rejected status = invalid location
  const getAttendanceType = (participant: Participant): 'perfect' | 'late_but_valid' | 'invalid_location' | 'invalid_time' | 'invalid_both' | 'invalid' | 'not_checked_in' => {
    if (!participant.attendances || participant.attendances.length === 0) {
      return 'not_checked_in';
    }

    // Get approved attendances (may be auto-approved or manually approved by officer)
    const approvedAttendances = participant.attendances.filter(
      att => att.status === 'approved'
    );

    // Get pending attendances (needs officer review: late/early but valid location)
    const pendingAttendances = participant.attendances.filter(
      att => att.status === 'pending'
    );

    // Get rejected attendances (invalid location or time)
    const rejectedAttendances = participant.attendances.filter(
      att => att.status === 'rejected'
    );

    // Check approved attendances: if all are on-time, it's perfect
    // If any approved attendance is in late window (but approved by officer), it's late_but_valid
    if (approvedAttendances.length > 0) {
      let allOnTime = true;
      let hasLateButApproved = false;
      
      for (const attendance of approvedAttendances) {
        const timeValidation = validateTime(attendance);
        const locationValidation = validateLocation(attendance);
        
        // If location is invalid, it shouldn't be approved (but handle it)
        if (!locationValidation.valid) {
          // This is unusual - approved but invalid location
          // Continue checking other attendances
          continue;
        }
        
        // Check if on-time
        if (timeValidation.isOnTime) {
          // This is perfect (auto-approved or approved on-time)
          continue;
        } else if (timeValidation.isInLateWindow || (timeValidation.valid && timeValidation.isLate)) {
          // Approved but in late window = late_but_valid (approved by officer)
          hasLateButApproved = true;
          allOnTime = false;
        } else {
          // Approved but time is invalid (shouldn't happen, but handle it)
          allOnTime = false;
        }
      }
      
      // If all approved attendances are on-time and valid location, it's perfect
      if (allOnTime && !hasLateButApproved) {
        return 'perfect';
      }
      
      // If has any late but approved attendances, it's late_but_valid
      if (hasLateButApproved) {
        return 'late_but_valid';
      }
      
      // If approved but not all on-time (and not in late window), still show as perfect
      // This handles edge cases where officer approved despite some issues
      return 'perfect';
    }

    // If has rejected attendances, it means invalid location
    if (rejectedAttendances.length > 0) {
      return 'invalid_location';
    }

    // If has pending attendances, check validation to classify
    if (pendingAttendances.length > 0) {
      let hasInvalidLocation = false;
      let hasInvalidTime = false;
      let hasLateButValid = false; // Valid location, valid time but in late window (15-30 min after)

      for (const attendance of pendingAttendances) {
        const locationValidation = validateLocation(attendance);
        const timeValidation = validateTime(attendance);

        if (!locationValidation.valid) {
          hasInvalidLocation = true;
        }
        
        // Check if time is invalid (too early or too late > 30 min)
        if (!timeValidation.valid) {
          hasInvalidTime = true;
        }
        
        // Check if in late window (15-30 minutes after) - this is valid but needs approval
        // This should be classified as "late_but_valid"
        if (locationValidation.valid && timeValidation.valid && timeValidation.isInLateWindow) {
          hasLateButValid = true;
        }
      }

      // Classify based on validation results
      // Priority: invalid_both > invalid_location > late_but_valid > invalid_time
      if (hasInvalidLocation && hasInvalidTime) {
        return 'invalid_both';
      } else if (hasInvalidLocation) {
        return 'invalid_location';
      } else if (hasLateButValid) {
        // Valid location, valid time but in late window (15-30 min after) = late_but_valid
        // This is the correct classification for pending attendances in the late window
        return 'late_but_valid';
      } else if (hasInvalidTime) {
        // Valid location but invalid time (too early or too late > 30 min)
        return 'invalid_time';
      }
      
      // If pending but both location and time are valid, and not in late window
      // This shouldn't happen (should be approved), but classify as late_but_valid for safety
      return 'late_but_valid';
    }

    // No attendances or all attendances have unknown status
    return 'not_checked_in';
  };

  const filteredParticipants = useMemo(() => {
    return participants.filter(p => {
      const participantName = p.name || '';
      const participantEmail = p.email || '';
      
      const searchLower = searchQuery.toLowerCase().trim();
      const matchesSearch = searchLower === '' || 
        participantName.toLowerCase().includes(searchLower) ||
        participantEmail.toLowerCase().includes(searchLower);
      
      const matchesRole = selectedRole === 'all' || (p.role || 'Người Tham Gia') === selectedRole;
      
      const matchesStatus = filterStatus === 'all' ||
        (filterStatus === 'checkedIn' && p.checkedIn) ||
        (filterStatus === 'notCheckedIn' && !p.checkedIn);
      
      // Filter by participation status (fully attended, incomplete, not attended)
      const matchesParticipationStatus = filterParticipationStatus === 'all' ||
        (filterParticipationStatus === 'fullyAttended' && isFullyAttended(p)) ||
        (filterParticipationStatus === 'incomplete' && hasIncompleteAttendance(p)) ||
        (filterParticipationStatus === 'notAttended' && !isFullyAttended(p) && !hasIncompleteAttendance(p) && (!p.attendances || p.attendances.length === 0));
      
      const matchesAttendanceStatus = filterAttendanceStatus === 'all' ||
        (p.attendances && p.attendances.length > 0 && 
         p.attendances.some((a: AttendanceRecord) => a.status === filterAttendanceStatus));
      
      const attendanceType = getAttendanceType(p);
      const matchesValidationStatus = filterValidationStatus === 'all' ||
        (filterValidationStatus === 'perfect' && attendanceType === 'perfect') ||
        (filterValidationStatus === 'late_but_valid' && attendanceType === 'late_but_valid') ||
        (filterValidationStatus === 'invalid' && (
          attendanceType === 'invalid' || 
          attendanceType === 'invalid_location' || 
          attendanceType === 'invalid_time' || 
          attendanceType === 'invalid_both'
        ));
      
      return matchesSearch && matchesRole && matchesStatus && matchesParticipationStatus && matchesAttendanceStatus && matchesValidationStatus;
    });
  }, [participants, searchQuery, selectedRole, filterStatus, filterParticipationStatus, filterAttendanceStatus, filterValidationStatus, activity]);

  // Calculate statistics with validation types
  const calculatedStats = useMemo(() => {
    let perfect = 0;
    let lateButValid = 0;
    let invalid = 0;
    
    participants.forEach(p => {
      const type = getAttendanceType(p);
      if (type === 'perfect') perfect++;
      else if (type === 'late_but_valid') lateButValid++;
      else if (type === 'invalid' || type === 'invalid_location' || type === 'invalid_time' || type === 'invalid_both') invalid++;
    });
    
    return {
      perfect,
      lateButValid,
      invalid
    };
  }, [participants, activity]);

  const uniqueRoles = useMemo(() => {
    const roles = new Set(participants.map(p => p.role || 'Người Tham Gia'));
    return Array.from(roles).sort();
  }, [participants]);

  const roleConfig: { [key: string]: { icon: string; color: string; bg: string; gradient: string } } = {
    'Trưởng Nhóm': {
      icon: '👑',
      color: isDarkMode ? 'text-red-300' : 'text-red-700',
      bg: isDarkMode ? 'bg-red-500/10' : 'bg-red-50',
      gradient: 'from-red-500 to-red-600'
    },
    'Phó Trưởng Nhóm': {
      icon: '👨‍💼',
      color: isDarkMode ? 'text-orange-300' : 'text-orange-700',
      bg: isDarkMode ? 'bg-orange-500/10' : 'bg-orange-50',
      gradient: 'from-orange-500 to-orange-600'
    },
    'Thành Viên Ban Tổ Chức': {
      icon: '📋',
      color: isDarkMode ? 'text-purple-300' : 'text-purple-700',
      bg: isDarkMode ? 'bg-purple-500/10' : 'bg-purple-50',
      gradient: 'from-purple-500 to-purple-600'
    },
    'Người Giám Sát': {
      icon: '👁️',
      color: isDarkMode ? 'text-blue-300' : 'text-blue-700',
      bg: isDarkMode ? 'bg-blue-500/10' : 'bg-blue-50',
      gradient: 'from-blue-500 to-blue-600'
    },
    'Người Tham Gia': {
      icon: '👥',
      color: isDarkMode ? 'text-gray-300' : 'text-gray-700',
      bg: isDarkMode ? 'bg-gray-500/10' : 'bg-gray-50',
      gradient: 'from-gray-500 to-gray-600'
    }
  };

  if (authLoading || loading) {
    return (
      <ProtectedRoute requiredRole="CLUB_MEMBER">
        <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!authLoading && user && !hasAccess) {
    return (
      <ProtectedRoute requiredRole="CLUB_MEMBER">
        <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
          <div className="text-center">
            <p className={`text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Bạn không có quyền truy cập trang này
            </p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="CLUB_MEMBER">
      <div className={`min-h-screen flex flex-col transition-colors duration-200 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <OfficerNav />
        
        <main className="flex-1 w-full">
          {/* Header Section */}
          {activity && (
            <div className={`border-b shadow-sm ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => router.back()}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      isDarkMode 
                        ? 'text-gray-300 hover:text-white hover:bg-gray-700' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    <span>Quay lại</span>
                  </button>
                  
                  <button
                    onClick={() => router.push(`/officer/activities/${activityId}/participants`)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm ${
                      isDarkMode
                        ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    👥 Quản lý người tham gia
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Quản lý điểm danh
                    </h1>
                    <h2 className={`text-lg font-semibold mt-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      {activity.name}
                    </h2>
                  </div>
                  
                  {/* Stats Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    <div className={`rounded-xl p-4 shadow-sm border ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}>
                      <div className={`text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Tổng số
                      </div>
                      <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {stats.total}
                      </div>
                    </div>
                    <div className={`rounded-xl p-4 shadow-sm border ${isDarkMode ? 'bg-green-500/10 border-green-500/20' : 'bg-green-50 border-green-200'}`}>
                      <div className={`text-sm font-medium mb-1 ${isDarkMode ? 'text-green-400' : 'text-green-700'}`}>
                        Đã điểm danh
                      </div>
                      <div className={`text-2xl font-bold ${isDarkMode ? 'text-green-300' : 'text-green-600'}`}>
                        {stats.checkedIn}
                      </div>
                    </div>
                    <div className={`rounded-xl p-4 shadow-sm border ${isDarkMode ? 'bg-orange-500/10 border-orange-500/20' : 'bg-orange-50 border-orange-200'}`}>
                      <div className={`text-sm font-medium mb-1 ${isDarkMode ? 'text-orange-400' : 'text-orange-700'}`}>
                        Chưa điểm danh
                      </div>
                      <div className={`text-2xl font-bold ${isDarkMode ? 'text-orange-300' : 'text-orange-600'}`}>
                        {stats.notCheckedIn}
                      </div>
                    </div>
                    <div className={`rounded-xl p-4 shadow-sm border ${
                      stats.attendanceRate >= 80
                        ? isDarkMode ? 'bg-green-500/10 border-green-500/20' : 'bg-green-50 border-green-200'
                        : stats.attendanceRate >= 50
                        ? isDarkMode ? 'bg-orange-500/10 border-orange-500/20' : 'bg-orange-50 border-orange-200'
                        : isDarkMode ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-200'
                    }`}>
                      <div className={`text-sm font-medium mb-1 ${
                        stats.attendanceRate >= 80
                          ? isDarkMode ? 'text-green-400' : 'text-green-700'
                          : stats.attendanceRate >= 50
                          ? isDarkMode ? 'text-orange-400' : 'text-orange-700'
                          : isDarkMode ? 'text-red-400' : 'text-red-700'
                      }`}>
                        Tỷ lệ
                      </div>
                      <div className={`text-2xl font-bold ${
                        stats.attendanceRate >= 80
                          ? isDarkMode ? 'text-green-300' : 'text-green-600'
                          : stats.attendanceRate >= 50
                          ? isDarkMode ? 'text-orange-300' : 'text-orange-600'
                          : isDarkMode ? 'text-red-300' : 'text-red-600'
                      }`}>
                        {stats.attendanceRate}%
                      </div>
                    </div>
                  </div>

                  {/* Validation Stats Cards */}
                  {activity && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <div className={`rounded-xl p-4 shadow-sm border ${isDarkMode ? 'bg-green-500/10 border-green-500/20' : 'bg-green-50 border-green-200'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">✅</span>
                          <div className={`text-sm font-medium ${isDarkMode ? 'text-green-400' : 'text-green-700'}`}>
                            Đúng giờ & đúng địa điểm
                          </div>
                        </div>
                        <div className={`text-2xl font-bold ${isDarkMode ? 'text-green-300' : 'text-green-600'}`}>
                          {calculatedStats.perfect}
                        </div>
                      </div>
                      <div className={`rounded-xl p-4 shadow-sm border ${isDarkMode ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-yellow-50 border-yellow-200'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">⏰</span>
                          <div className={`text-sm font-medium ${isDarkMode ? 'text-yellow-400' : 'text-yellow-700'}`}>
                            Trễ nhưng hợp lệ
                          </div>
                        </div>
                        <div className={`text-2xl font-bold ${isDarkMode ? 'text-yellow-300' : 'text-yellow-600'}`}>
                          {calculatedStats.lateButValid}
                        </div>
                      </div>
                      <div className={`rounded-xl p-4 shadow-sm border ${isDarkMode ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-200'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">❌</span>
                          <div className={`text-sm font-medium ${isDarkMode ? 'text-red-400' : 'text-red-700'}`}>
                            Không hợp lệ
                          </div>
                        </div>
                        <div className={`text-2xl font-bold ${isDarkMode ? 'text-red-300' : 'text-red-600'}`}>
                          {calculatedStats.invalid}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                      <span>📅</span>
                      <span>
                        {(() => {
                          try {
                            const date = activity.date ? new Date(activity.date) : new Date();
                            if (isNaN(date.getTime())) return 'Chưa có ngày';
                            return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
                          } catch {
                            return 'Chưa có ngày';
                          }
                        })()}
                      </span>
                    </div>
                    {activity.location && (
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                        <span>📍</span>
                        <span className="max-w-md truncate">
                          {activity.location.length > 50 ? activity.location.substring(0, 50) + '...' : activity.location}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Left Sidebar - Filters */}
              <aside className="lg:w-72 flex-shrink-0">
                <div className="sticky top-6 space-y-4">
                  {/* View Mode Toggle */}
                  <div className={`rounded-xl p-4 border shadow-sm ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <h3 className={`text-sm font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Chế độ xem
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setViewMode('table')}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          viewMode === 'table'
                            ? isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white'
                            : isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        📊 Bảng
                      </button>
                      <button
                        onClick={() => setViewMode('cards')}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          viewMode === 'cards'
                            ? isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white'
                            : isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        🎴 Thẻ
                      </button>
                    </div>
                  </div>

                  {/* Search & Filter */}
                  <div className={`rounded-xl p-4 border shadow-sm ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        🔍 Tìm kiếm & Lọc
                      </h3>
                      {(searchQuery || selectedRole !== 'all' || filterStatus !== 'all' || filterParticipationStatus !== 'all' || filterAttendanceStatus !== 'all' || filterValidationStatus !== 'all') && (
                        <button
                          onClick={() => {
                            setSearchQuery('');
                            setSelectedRole('all');
                            setFilterStatus('all');
                            setFilterParticipationStatus('all');
                            setFilterAttendanceStatus('all');
                            setFilterValidationStatus('all');
                          }}
                          className={`text-xs px-2 py-1 rounded-md transition-all ${
                            isDarkMode 
                              ? 'text-gray-400 hover:text-white hover:bg-gray-700' 
                              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                          }`}
                          title="Xóa tất cả bộ lọc"
                        >
                          🔄 Xóa bộ lọc
                        </button>
                      )}
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className={`block text-xs font-medium mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Tìm kiếm
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Tên hoặc email..."
                            className={`w-full px-3 py-2 pr-8 rounded-lg border text-sm transition-all ${
                              isDarkMode 
                                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20' 
                                : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                            } focus:outline-none`}
                          />
                          {searchQuery && (
                            <button
                              onClick={() => setSearchQuery('')}
                              className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-600 transition-colors ${
                                isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-600'
                              }`}
                              title="Xóa tìm kiếm"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className={`block text-xs font-medium mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Vai trò
                        </label>
                        <select
                          value={selectedRole}
                          onChange={(e) => setSelectedRole(e.target.value)}
                          className={`w-full px-3 py-2 rounded-lg border text-sm transition-all ${
                            isDarkMode 
                              ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20' 
                              : 'bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                          } focus:outline-none`}
                        >
                          <option value="all">Tất cả vai trò</option>
                          {uniqueRoles.map(role => (
                            <option key={role} value={role}>{role}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={`block text-xs font-medium mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Trạng thái điểm danh
                        </label>
                        <select
                          value={filterStatus}
                          onChange={(e) => setFilterStatus(e.target.value as 'all' | 'checkedIn' | 'notCheckedIn')}
                          className={`w-full px-3 py-2 rounded-lg border text-sm transition-all ${
                            isDarkMode 
                              ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20' 
                              : 'bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                          } focus:outline-none`}
                        >
                          <option value="all">Tất cả</option>
                          <option value="checkedIn">✅ Đã điểm danh</option>
                          <option value="notCheckedIn">❌ Chưa điểm danh</option>
                        </select>
                      </div>
                      <div>
                        <label className={`block text-xs font-medium mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Tham gia buổi
                        </label>
                        <select
                          value={filterParticipationStatus}
                          onChange={(e) => setFilterParticipationStatus(e.target.value as 'all' | 'fullyAttended' | 'incomplete' | 'notAttended')}
                          className={`w-full px-3 py-2 rounded-lg border text-sm transition-all ${
                            isDarkMode 
                              ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20' 
                              : 'bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                          } focus:outline-none`}
                        >
                          <option value="all">Tất cả</option>
                          <option value="fullyAttended">✅ Tham gia đầy đủ</option>
                          <option value="incomplete">⚠️ Tham gia không đầy đủ (thiếu buổi)</option>
                          <option value="notAttended">❌ Chưa tham gia</option>
                        </select>
                      </div>
                      <div>
                        <label className={`block text-xs font-medium mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Trạng thái xác nhận
                        </label>
                        <select
                          value={filterAttendanceStatus}
                          onChange={(e) => setFilterAttendanceStatus(e.target.value as 'all' | 'pending' | 'approved' | 'rejected')}
                          className={`w-full px-3 py-2 rounded-lg border text-sm transition-all ${
                            isDarkMode 
                              ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20' 
                              : 'bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                          } focus:outline-none`}
                        >
                          <option value="all">Tất cả</option>
                          <option value="pending">⏳ Chờ xác nhận</option>
                          <option value="approved">✅ Đã xác nhận</option>
                          <option value="rejected">❌ Đã từ chối</option>
                        </select>
                      </div>
                      <div>
                        <label className={`block text-xs font-medium mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Phân loại điểm danh
                        </label>
                        <select
                          value={filterValidationStatus}
                          onChange={(e) => setFilterValidationStatus(e.target.value as 'all' | 'perfect' | 'late_but_valid' | 'invalid')}
                          className={`w-full px-3 py-2 rounded-lg border text-sm transition-all ${
                            isDarkMode 
                              ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20' 
                              : 'bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                          } focus:outline-none`}
                        >
                          <option value="all">Tất cả</option>
                          <option value="perfect">✅ Đúng giờ & đúng địa điểm</option>
                          <option value="late_but_valid">⏰ Trễ nhưng hợp lệ</option>
                          <option value="invalid">❌ Không hợp lệ</option>
                        </select>
                      </div>
                      <div className={`pt-3 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                        <div className="flex items-center justify-between">
                          <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            Hiển thị <span className={`font-semibold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{filteredParticipants.length}</span> / <span className={`font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{participants.length}</span> người
                          </p>
                          {filteredParticipants.length !== participants.length && (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              isDarkMode 
                                ? 'bg-blue-500/20 text-blue-300' 
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              Đang lọc
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </aside>

              {/* Main Content Area */}
              <div className="flex-1 min-w-0">
                {/* Success/Error Messages */}
                {successMessage && (
                  <div className={`mb-4 p-4 rounded-xl border shadow-sm ${isDarkMode ? 'bg-green-500/10 border-green-500/30 text-green-300' : 'bg-green-50 border-green-200 text-green-800'}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-lg">✅</span>
                      <p className="text-sm font-medium flex-1">{successMessage}</p>
                      <button
                        onClick={() => setSuccessMessage(null)}
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all ${
                          isDarkMode ? 'hover:bg-green-500/20' : 'hover:bg-green-100'
                        }`}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}

                {error && (
                  <div className={`mb-4 p-4 rounded-xl border shadow-sm ${isDarkMode ? 'bg-red-500/10 border-red-500/30 text-red-300' : 'bg-red-50 border-red-200 text-red-800'}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-lg">⚠️</span>
                      <p className="text-sm font-medium flex-1">{error}</p>
                      <button
                        onClick={() => setError(null)}
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all ${
                          isDarkMode ? 'hover:bg-red-500/20' : 'hover:bg-red-100'
                        }`}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}

                {/* Check In All Button */}
                {filteredParticipants.length > 0 && (
                  <div className={`mb-4 p-4 rounded-xl border shadow-sm ${isDarkMode ? 'bg-purple-500/10 border-purple-500/30' : 'bg-purple-50 border-purple-200'}`}>
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div>
                        <p className={`text-sm font-semibold mb-1 ${isDarkMode ? 'text-purple-300' : 'text-purple-700'}`}>
                          Điểm danh hàng loạt
                        </p>
                        <p className={`text-xs ${isDarkMode ? 'text-purple-200' : 'text-purple-600'}`}>
                          Điểm danh tất cả {filteredParticipants.length} người đang hiển thị
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => setCheckInAllModal({ open: true, checkedIn: true })}
                          className="px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-all shadow-sm"
                        >
                          ✅ Điểm danh tất cả
                        </button>
                        <button
                          onClick={() => setCheckInAllModal({ open: true, checkedIn: false })}
                          className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-600 text-white hover:bg-gray-700 transition-all shadow-sm"
                        >
                          ❌ Hủy điểm danh tất cả
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bulk Actions */}
                {selectedParticipants.size > 0 && (
                  <div className={`mb-4 p-4 rounded-xl border shadow-sm ${isDarkMode ? 'bg-blue-500/10 border-blue-500/30' : 'bg-blue-50 border-blue-200'}`}>
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <span className={`text-sm font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                        Đã chọn {selectedParticipants.size} người
                      </span>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => handleBulkCheckIn(true)}
                          className="px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-all shadow-sm"
                        >
                          ✅ Điểm danh đã chọn
                        </button>
                        <button
                          onClick={() => handleBulkCheckIn(false)}
                          className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-600 text-white hover:bg-gray-700 transition-all shadow-sm"
                        >
                          ❌ Hủy điểm danh
                        </button>
                        <button
                          onClick={() => setSelectedParticipants(new Set())}
                          className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition-all"
                        >
                          Bỏ chọn
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Participants List */}
                {filteredParticipants.length > 0 ? (
                  viewMode === 'table' ? (
                    /* Table View */
                    <div className={`rounded-xl border shadow-sm overflow-hidden ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className={isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}>
                            <tr>
                              <th className="px-4 py-3 text-left">
                                <input
                                  type="checkbox"
                                  checked={selectedParticipants.size === filteredParticipants.length && filteredParticipants.length > 0}
                                  onChange={toggleSelectAll}
                                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                              </th>
                              <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                Người tham gia
                              </th>
                              <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                Vai trò
                              </th>
                              <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                Điểm danh
                              </th>
                              <th className={`px-4 py-3 text-left text-xs font-semibold uppercase ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                Thao tác
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredParticipants.map((participant) => {
                              const participantId = typeof participant.userId === 'object' && participant.userId !== null
                                ? participant.userId._id || String(participant.userId)
                                : String(participant.userId);
                              
                              const config = roleConfig[participant.role] || roleConfig['Người Tham Gia'];
                              const isSelected = selectedParticipants.has(participantId);
                              const isProcessing = processing.has(participantId);
                              const isExpanded = expandedRows.has(participantId);
                              const pendingAttendances = participant.attendances?.filter(a => a.status === 'pending') || [];
                              const hasAttendances = participant.attendances && participant.attendances.length > 0;

                              return (
                                <Fragment key={participantId}>
                                  <tr 
                                    className={`transition-colors ${
                                      isSelected
                                        ? isDarkMode ? 'bg-blue-500/10' : 'bg-blue-50'
                                        : isDarkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'
                                    } ${participant.checkedIn ? (isDarkMode ? 'ring-1 ring-green-500/30' : 'ring-1 ring-green-500/20') : ''}`}
                                  >
                                    <td className="px-4 py-4">
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => toggleSelectParticipant(participantId)}
                                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                      />
                                    </td>
                                    <td className="px-4 py-4">
                                      <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold bg-gradient-to-br ${config.gradient} text-white shadow-sm`}>
                                          {getInitials(participant.name)}
                                        </div>
                                        <div className="min-w-0">
                                          <div className={`font-semibold text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                            {participant.name}
                                          </div>
                                          <div className={`text-xs truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                            {participant.email}
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-4 py-4">
                                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${config.bg} ${config.color}`}>
                                        {config.icon} {participant.role}
                                      </span>
                                    </td>
                                    <td className="px-4 py-4">
                                      <div className="space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                          {participant.checkedIn ? (
                                            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${isDarkMode ? 'bg-green-500/20 text-green-300' : 'bg-green-100 text-green-700'}`}>
                                              ✅ Đã điểm danh
                                            </span>
                                          ) : (
                                            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${isDarkMode ? 'bg-gray-500/20 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                                              ❌ Chưa điểm danh
                                            </span>
                                          )}
                                          {participant.checkedIn && activity && (() => {
                                            const attendanceType = getAttendanceType(participant);
                                            if (attendanceType === 'perfect') {
                                              return (
                                                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${isDarkMode ? 'bg-green-600/20 text-green-300 border border-green-500/30' : 'bg-green-100 text-green-700 border border-green-300'}`}>
                                                  ✅ Đúng giờ & đúng địa điểm
                                                </span>
                                              );
                                            } else if (attendanceType === 'late_but_valid') {
                                              return (
                                                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${isDarkMode ? 'bg-yellow-600/20 text-yellow-300 border border-yellow-500/30' : 'bg-yellow-100 text-yellow-700 border border-yellow-300'}`}>
                                                  ⏰ Trễ nhưng hợp lệ
                                                </span>
                                              );
                                            } else if (attendanceType === 'invalid_location') {
                                              return (
                                                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${isDarkMode ? 'bg-red-600/20 text-red-300 border border-red-500/30' : 'bg-red-100 text-red-700 border border-red-300'}`}>
                                                  ❌ Địa điểm không hợp lệ
                                                </span>
                                              );
                                            } else if (attendanceType === 'invalid_time') {
                                              return (
                                                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${isDarkMode ? 'bg-red-600/20 text-red-300 border border-red-500/30' : 'bg-red-100 text-red-700 border border-red-300'}`}>
                                                  ❌ Thời gian không hợp lệ
                                                </span>
                                              );
                                            } else if (attendanceType === 'invalid_both') {
                                              return (
                                                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${isDarkMode ? 'bg-red-600/20 text-red-300 border border-red-500/30' : 'bg-red-100 text-red-700 border border-red-300'}`}>
                                                  ❌ Địa điểm & thời gian không hợp lệ
                                                </span>
                                              );
                                            } else if (attendanceType === 'invalid') {
                                              return (
                                                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${isDarkMode ? 'bg-red-600/20 text-red-300 border border-red-500/30' : 'bg-red-100 text-red-700 border border-red-300'}`}>
                                                  ❌ Không hợp lệ
                                                </span>
                                              );
                                            }
                                            return null;
                                          })()}
                                          {/* Badge "Thiếu buổi" nếu tham gia không đầy đủ (trừ trường hợp 1 buổi chỉ điểm danh 1 lần - đã có text riêng) */}
                                          {activity && (() => {
                                            const sessionCount = getCompletedSessionsCount(participant);
                                            // Không hiển thị badge "Thiếu buổi" cho trường hợp 1 buổi chỉ điểm danh 1 lần (đã có text riêng rõ ràng)
                                            const isOneSessionPartialOnly = sessionCount.total === 1 && sessionCount.partial === 1 && sessionCount.completed === 0;
                                            if (hasIncompleteAttendance(participant) && !isOneSessionPartialOnly) {
                                              return (
                                                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${isDarkMode ? 'bg-orange-600/20 text-orange-300 border border-orange-500/30' : 'bg-orange-100 text-orange-700 border border-orange-300'}`}>
                                                  ⚠️ Thiếu buổi
                                                </span>
                                              );
                                            }
                                            return null;
                                          })()}
                                        </div>
                                        {/* Hiển thị số buổi đã điểm danh */}
                                        {activity && (() => {
                                          const sessionCount = getCompletedSessionsCount(participant);
                                          if (sessionCount.total > 0) {
                                            // Trường hợp đặc biệt: 1 buổi chỉ điểm danh 1 lần
                                            if (sessionCount.total === 1 && sessionCount.partial === 1 && sessionCount.completed === 0) {
                                              return (
                                                <div className={`text-xs font-semibold ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                                                  ⚠️ Chỉ điểm danh 1 lần (thiếu 1 lần)
                                                </div>
                                              );
                                            }
                                            
                                            if (sessionCount.completed === sessionCount.total && sessionCount.partial === 0) {
                                              // Hoàn thành tất cả buổi
                                              return (
                                                <div className={`text-xs font-semibold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                                                  ✅ Đã hoàn thành {sessionCount.completed}/{sessionCount.total} buổi
                                                </div>
                                              );
                                            } else if (sessionCount.completed > 0 || sessionCount.partial > 0) {
                                              // Có buổi hoàn thành hoặc một phần
                                              return (
                                                <div className="space-y-1">
                                                  {sessionCount.completed > 0 && (
                                                    <div className={`text-xs font-semibold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                                                      ✅ Hoàn thành đầy đủ: {sessionCount.completed}/{sessionCount.total} buổi
                                                    </div>
                                                  )}
                                                  {sessionCount.partial > 0 && (
                                                    <div className={`text-xs font-semibold ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                                                      ⚠️ Chỉ điểm danh một phần: {sessionCount.partial} buổi
                                                    </div>
                                                  )}
                                                  {sessionCount.completed + sessionCount.partial < sessionCount.total && (
                                                    <div className={`text-xs font-semibold ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                                                      ❌ Chưa điểm danh: {sessionCount.total - sessionCount.completed - sessionCount.partial} buổi
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            } else {
                                              // Chưa có buổi nào được approved
                                              return (
                                                <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                  ⏸️ Chưa hoàn thành buổi nào ({sessionCount.total} buổi)
                                                </div>
                                              );
                                            }
                                          }
                                          return null;
                                        })()}
                                        {hasAttendances && (
                                          <button
                                            onClick={() => toggleRowExpansion(participantId)}
                                            className={`text-xs ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'} font-medium`}
                                          >
                                            {isExpanded ? '▲ Thu gọn' : '▼ Xem chi tiết (' + participant.attendances!.length + ')'}
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-4 py-4">
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() => {
                                            if (participant.checkedIn) {
                                              // Show cancel modal for canceling attendance
                                              setCancelModal({ 
                                                open: true, 
                                                attendanceId: null, 
                                                participantId: participantId 
                                              });
                                              setCancelReason('');
                                            } else {
                                              // Direct check-in for new attendance
                                              handleCheckIn(participant, true);
                                            }
                                          }}
                                          disabled={isProcessing}
                                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shadow-sm ${
                                            participant.checkedIn
                                              ? isDarkMode 
                                                ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' 
                                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                              : 'bg-green-600 text-white hover:bg-green-700'
                                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                                        >
                                          {isProcessing ? '⏳' : participant.checkedIn ? '❌ Hủy' : '✅ Điểm danh'}
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                  {isExpanded && hasAttendances && (
                                    <tr key={`${participantId}-expanded`}>
                                      <td colSpan={5} className={`px-4 py-4 ${isDarkMode ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
                                        <div className="space-y-4">
                                          {participant.attendances!.map((attendance: AttendanceRecord) => (
                                            <div key={attendance._id} className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                                              <div className="flex items-start justify-between mb-3">
                                                <div>
                                                  <p className={`text-sm font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                                    {attendance.timeSlot} - {attendance.checkInType === 'start' ? 'Đầu buổi' : 'Cuối buổi'}
                                                  </p>
                                                  <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                    {new Date(attendance.checkInTime).toLocaleString('vi-VN')}
                                                  </p>
                                                </div>
                                                <div className="flex flex-col gap-2 items-end">
                                                  {(() => {
                                                    const timeValidation = validateTime(attendance);
                                                    const isLate = attendance.lateReason || (timeValidation.valid && timeValidation.isLate === true);
                                                    
                                                    return (
                                                      <>
                                                        {isLate && (
                                                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
                                                            isDarkMode ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' : 'bg-orange-100 text-orange-700 border border-orange-300'
                                                          }`}>
                                                            ⏰ Trễ
                                                          </span>
                                                        )}
                                                        <span className={`px-3 py-1 rounded-md text-xs font-medium ${
                                                          attendance.status === 'approved'
                                                            ? isDarkMode ? 'bg-green-500/20 text-green-300' : 'bg-green-100 text-green-700'
                                                            : attendance.status === 'rejected'
                                                            ? isDarkMode ? 'bg-red-500/20 text-red-300' : 'bg-red-100 text-red-700'
                                                            : isDarkMode ? 'bg-yellow-500/20 text-yellow-300' : 'bg-yellow-100 text-yellow-700'
                                                        }`}>
                                                          {attendance.status === 'approved' && '✅ Đã điểm danh'}
                                                          {attendance.status === 'rejected' && '❌ Đã từ chối'}
                                                          {attendance.status === 'pending' && '⏳ Chờ xác nhận'}
                                                        </span>
                                                      </>
                                                    );
                                                  })()}
                                                </div>
                                              </div>
                                              
                                              {/* Validation Info - Show for pending/rejected, or approved but in late window */}
                                              {(() => {
                                                const locationValidation = validateLocation(attendance);
                                                const timeValidation = validateTime(attendance);
                                                const isInvalid = !locationValidation.valid || !timeValidation.valid;
                                                const isInLateWindow = timeValidation.isInLateWindow || false;
                                                
                                                // Hide validation info only if approved, valid, on-time (perfect case)
                                                // Show validation info if: pending/rejected, or approved but in late window, or invalid
                                                if (attendance.status === 'approved' && !isInvalid && !isInLateWindow && timeValidation.isOnTime) {
                                                  return null;
                                                }
                                                
                                                return (
                                                  <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {/* Location Validation */}
                                                    <div className={`p-3 rounded-lg border ${
                                                      locationValidation.valid
                                                        ? isDarkMode ? 'bg-green-500/10 border-green-500/30' : 'bg-green-50 border-green-200'
                                                        : isDarkMode ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-200'
                                                    }`}>
                                                      <div className="flex items-start gap-2">
                                                        {locationValidation.valid ? (
                                                          <span className="text-lg">✅</span>
                                                        ) : (
                                                          <span className="text-lg">❌</span>
                                                        )}
                                                        <div className="flex-1">
                                                          <p className={`text-xs font-semibold mb-1 ${
                                                            locationValidation.valid
                                                              ? isDarkMode ? 'text-green-300' : 'text-green-700'
                                                              : isDarkMode ? 'text-red-300' : 'text-red-700'
                                                          }`}>
                                                            {locationValidation.valid ? 'Vị trí hợp lệ' : 'Vị trí không hợp lệ'}
                                                          </p>
                                                          {locationValidation.distance !== undefined && (
                                                            <p className={`text-xs ${
                                                              isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                                            }`}>
                                                              Khoảng cách: {locationValidation.distance.toFixed(0)}m
                                                            </p>
                                                          )}
                                                          {locationValidation.message && (
                                                            <p className={`text-xs mt-1 ${
                                                              isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                                            }`}>
                                                              {locationValidation.message}
                                                            </p>
                                                          )}
                                                        </div>
                                                      </div>
                                                    </div>

                                                    {/* Time Validation */}
                                                    <div className={`p-3 rounded-lg border ${
                                                      timeValidation.valid
                                                        ? timeValidation.isLate
                                                          ? isDarkMode ? 'bg-orange-500/10 border-orange-500/30' : 'bg-orange-50 border-orange-200'
                                                          : isDarkMode ? 'bg-green-500/10 border-green-500/30' : 'bg-green-50 border-green-200'
                                                        : isDarkMode ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-200'
                                                    }`}>
                                                      <div className="flex items-start gap-2">
                                                        {timeValidation.valid ? (
                                                          timeValidation.isLate ? (
                                                            <span className="text-lg">⏰</span>
                                                          ) : (
                                                            <span className="text-lg">✅</span>
                                                          )
                                                        ) : (
                                                          <span className="text-lg">❌</span>
                                                        )}
                                                        <div className="flex-1">
                                                          <p className={`text-xs font-semibold mb-1 ${
                                                            timeValidation.valid
                                                              ? timeValidation.isLate
                                                                ? isDarkMode ? 'text-orange-300' : 'text-orange-700'
                                                                : isDarkMode ? 'text-green-300' : 'text-green-700'
                                                              : isDarkMode ? 'text-red-300' : 'text-red-700'
                                                          }`}>
                                                            {timeValidation.valid 
                                                              ? timeValidation.isLate 
                                                                ? 'Thời gian hợp lệ (Trễ)' 
                                                                : 'Thời gian hợp lệ'
                                                              : 'Thời gian không hợp lệ'}
                                                          </p>
                                                          {timeValidation.message && (
                                                            <p className={`text-xs mt-1 ${
                                                              isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                                            }`}>
                                                              {timeValidation.message}
                                                            </p>
                                                          )}
                                                        </div>
                                                      </div>
                                                    </div>
                                                  </div>
                                                );
                                              })()}

                                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {attendance.photoUrl && (
                                                  <div>
                                                    <p className={`text-xs font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                                      📸 Ảnh điểm danh
                                                    </p>
                                                    <div 
                                                      className="relative group cursor-pointer rounded-lg overflow-hidden border-2 border-gray-300 dark:border-gray-600"
                                                      onClick={() => setViewingImage(attendance.photoUrl || null)}
                                                    >
                                                      <img
                                                        src={attendance.photoUrl}
                                                        alt={`Điểm danh ${attendance.timeSlot}`}
                                                        className="w-full h-48 object-cover hover:opacity-90 transition-opacity"
                                                      />
                                                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                                        <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                                        </svg>
                                                      </div>
                                                    </div>
                                                  </div>
                                                )}
                                                
                                                <div className="space-y-3">
                                                  {attendance.location && (
                                                    <div>
                                                      <p className={`text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                                        📍 Vị trí
                                                      </p>
                                                      <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                        {attendance.location.address || `${attendance.location.lat.toFixed(6)}, ${attendance.location.lng.toFixed(6)}`}
                                                      </p>
                                                      {attendance.location.lat && attendance.location.lng && (
                                                        <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                                                          Tọa độ: {attendance.location.lat.toFixed(6)}, {attendance.location.lng.toFixed(6)}
                                                        </p>
                                                      )}
                                                    </div>
                                                  )}
                                                  
                                                  {/* Time Info */}
                                                  <div>
                                                    <p className={`text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                                      🕐 Thời gian điểm danh
                                                    </p>
                                                    <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                      {new Date(attendance.checkInTime).toLocaleString('vi-VN', {
                                                        day: '2-digit',
                                                        month: '2-digit',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                        second: '2-digit'
                                                      })}
                                                    </p>
                                                  </div>

                                                  {/* Expected Time Range */}
                                                  {activity?.timeSlots && (() => {
                                                    const timeSlot = activity.timeSlots.find(ts => ts.name === attendance.timeSlot && ts.isActive);
                                                    if (timeSlot) {
                                                      return (
                                                        <div>
                                                          <p className={`text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                                            ⏰ Thời gian dự kiến
                                                          </p>
                                                          <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                            {attendance.checkInType === 'start' 
                                                              ? `Bắt đầu: ${timeSlot.startTime}`
                                                              : `Kết thúc: ${timeSlot.endTime}`
                                                            }
                                                          </p>
                                                          {attendance.checkInType === 'start' && timeSlot.endTime && (
                                                            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                              Kết thúc: {timeSlot.endTime}
                                                            </p>
                                                          )}
                                                        </div>
                                                      );
                                                    }
                                                    return null;
                                                  })()}
                                                  
                                                  {/* Late Reason from Student */}
                                                  {attendance.lateReason && (
                                                    <div className={`mb-3 p-3 rounded-lg border ${
                                                      isDarkMode ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200'
                                                    }`}>
                                                      <div className="flex items-start gap-2 mb-2">
                                                        <span className="text-base">⏰</span>
                                                        <div className="flex-1">
                                                          <p className={`text-xs font-bold mb-1 ${isDarkMode ? 'text-amber-300' : 'text-amber-700'}`}>
                                                            Lý do trễ từ người tham gia
                                                          </p>
                                                          <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                                            {attendance.lateReason}
                                                          </p>
                                                        </div>
                                                      </div>
                                                    </div>
                                                  )}

                                                  {attendance.verifiedBy && attendance.verifiedAt && (
                                                    <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
                                                      <p className={`text-xs mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                                        <span className="font-medium">Xác nhận bởi:</span> {getVerifierName(attendance.verifiedBy)}
                                                      </p>
                                                      <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                        {new Date(attendance.verifiedAt).toLocaleString('vi-VN')}
                                                      </p>
                                                      {attendance.verificationNote && (
                                                        <p className={`text-xs mt-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                                          <span className="font-medium">Ghi chú:</span> {attendance.verificationNote}
                                                        </p>
                                                      )}
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                              
                                              {(() => {
                                                const locationValidation = validateLocation(attendance);
                                                const timeValidation = validateTime(attendance);
                                                const isInvalid = !locationValidation.valid || !timeValidation.valid;
                                                
                                                // Only show verification UI for pending or rejected
                                                // If approved, show readonly info only (unless invalid and needs re-review)
                                                const isPending = attendance.status === 'pending';
                                                const isRejected = attendance.status === 'rejected';
                                                const isApproved = attendance.status === 'approved';
                                                const isApprovedButInvalid = isApproved && isInvalid;
                                                
                                                // Show verification UI only for: pending, rejected
                                                // For approved but invalid, show info but allow adjustment with warning
                                                if (isPending || isRejected) {
                                                  return (
                                                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                                      {/* Show validation errors if invalid */}
                                                      {isInvalid && (
                                                        <div className={`mb-3 p-3 rounded-lg border ${
                                                          isDarkMode ? 'bg-orange-500/10 border-orange-500/30' : 'bg-orange-50 border-orange-200'
                                                        }`}>
                                                          <p className={`text-xs font-semibold mb-2 ${isDarkMode ? 'text-orange-300' : 'text-orange-700'}`}>
                                                            ⚠️ Điểm danh không hợp lệ - Cần xem xét
                                                          </p>
                                                          {!locationValidation.valid && (
                                                            <p className={`text-xs mb-1 ${isDarkMode ? 'text-orange-200' : 'text-orange-600'}`}>
                                                              • Vị trí: {locationValidation.message || 'Không hợp lệ'}
                                                            </p>
                                                          )}
                                                          {!timeValidation.valid && (
                                                            <p className={`text-xs ${isDarkMode ? 'text-orange-200' : 'text-orange-600'}`}>
                                                              • Thời gian: {timeValidation.message || 'Không hợp lệ'}
                                                            </p>
                                                          )}
                                                        </div>
                                                      )}
                                                      
                                                      <div className="space-y-2">
                                                        <label className={`block text-xs font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                                          {isPending ? 'Xác nhận điểm danh' : 'Xem xét lại điểm danh'}
                                                        </label>
                                                        <textarea
                                                          placeholder={isInvalid ? "Nhập lý do duyệt (bắt buộc). VD: Đã xác minh lý do trễ, chấp nhận điểm danh..." : "Ghi chú xác nhận (tùy chọn)..."}
                                                          value={verificationNote[attendance._id] || ''}
                                                          onChange={(e) => setVerificationNote(prev => ({
                                                            ...prev,
                                                            [attendance._id]: e.target.value
                                                          }))}
                                                          className={`w-full px-3 py-2 rounded-lg text-sm border resize-none ${
                                                            isDarkMode 
                                                              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                                                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                                                          } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                                                          rows={3}
                                                        />
                                                      </div>
                                                      <div className="flex gap-2">
                                                        <button
                                                          onClick={() => handleVerifyAttendance(attendance._id, 'approved')}
                                                          disabled={verifyingAttendance.has(attendance._id) || (isInvalid && !verificationNote[attendance._id]?.trim())}
                                                          className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                                          title={isInvalid && !verificationNote[attendance._id]?.trim() ? 'Vui lòng nhập lý do duyệt cho điểm danh không hợp lệ' : ''}
                                                        >
                                                          {verifyingAttendance.has(attendance._id) 
                                                            ? '⏳ Đang xử lý...' 
                                                            : '✅ Duyệt'}
                                                        </button>
                                                        <button
                                                          onClick={() => handleVerifyAttendance(attendance._id, 'rejected')}
                                                          disabled={verifyingAttendance.has(attendance._id)}
                                                          className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                          {verifyingAttendance.has(attendance._id) ? '⏳ Đang xử lý...' : '❌ Từ chối'}
                                                        </button>
                                                      </div>
                                                      {attendance.verificationNote && isRejected && (
                                                        <div className={`mt-3 p-2 rounded text-xs ${
                                                          isDarkMode ? 'bg-red-500/10 text-red-300' : 'bg-red-50 text-red-700'
                                                        }`}>
                                                          <span className="font-semibold">Ghi chú trước:</span> {attendance.verificationNote}
                                                        </div>
                                                      )}
                                                    </div>
                                                  );
                                                }
                                                
                                                // If approved but invalid, show info with option to adjust
                                                if (isApprovedButInvalid) {
                                                  return (
                                                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                                      {/* Current verification info */}
                                                      {attendance.verifiedBy && attendance.verifiedAt && (
                                                        <div className={`mb-3 p-3 rounded-lg ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
                                                          <p className={`text-xs mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                                            <span className="font-medium">✅ Đã duyệt bởi:</span> {getVerifierName(attendance.verifiedBy)}
                                                          </p>
                                                          <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                            {new Date(attendance.verifiedAt).toLocaleString('vi-VN')}
                                                          </p>
                                                          {attendance.verificationNote && (
                                                            <p className={`text-xs mt-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                                              <span className="font-medium">Ghi chú:</span> {attendance.verificationNote}
                                                            </p>
                                                          )}
                                                        </div>
                                                      )}
                                                      
                                                      {/* Warning about invalid status */}
                                                      <div className={`mb-3 p-3 rounded-lg border ${
                                                        isDarkMode ? 'bg-orange-500/10 border-orange-500/30' : 'bg-orange-50 border-orange-200'
                                                      }`}>
                                                        <p className={`text-xs font-semibold mb-2 ${isDarkMode ? 'text-orange-300' : 'text-orange-700'}`}>
                                                          ⚠️ Điểm danh đã được duyệt nhưng không hợp lệ - Có thể điều chỉnh lại
                                                        </p>
                                                        {!locationValidation.valid && (
                                                          <p className={`text-xs mb-1 ${isDarkMode ? 'text-orange-200' : 'text-orange-600'}`}>
                                                            • Vị trí: {locationValidation.message || 'Không hợp lệ'}
                                                          </p>
                                                        )}
                                                        {!timeValidation.valid && (
                                                          <p className={`text-xs ${isDarkMode ? 'text-orange-200' : 'text-orange-600'}`}>
                                                            • Thời gian: {timeValidation.message || 'Không hợp lệ'}
                                                          </p>
                                                        )}
                                                      </div>
                                                      
                                                      {/* Adjustment section */}
                                                      <div className="space-y-2">
                                                        <label className={`block text-xs font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                                          Xem xét lại và điều chỉnh trạng thái
                                                          <span className="text-red-500 ml-1">*</span>
                                                        </label>
                                                        <textarea
                                                          placeholder="Nhập lý do điều chỉnh (bắt buộc). VD: Xác nhận lại sau khi xem xét, điểm danh không hợp lệ vì lý do..., hoặc giữ nguyên trạng thái với lý do..."
                                                          value={verificationNote[attendance._id] || ''}
                                                          onChange={(e) => setVerificationNote(prev => ({
                                                            ...prev,
                                                            [attendance._id]: e.target.value
                                                          }))}
                                                          className={`w-full px-3 py-2 rounded-lg text-sm border resize-none ${
                                                            isDarkMode 
                                                              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                                                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                                                          } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                                                          rows={3}
                                                        />
                                                      </div>
                                                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                        <button
                                                          onClick={() => handleVerifyAttendance(attendance._id, 'approved')}
                                                          disabled={verifyingAttendance.has(attendance._id) || !verificationNote[attendance._id]?.trim()}
                                                          className="px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                                          title={!verificationNote[attendance._id]?.trim() ? 'Vui lòng nhập lý do điều chỉnh' : 'Xác nhận lại điểm danh là hợp lệ'}
                                                        >
                                                          {verifyingAttendance.has(attendance._id) 
                                                            ? '⏳ Đang xử lý...' 
                                                            : '✅ Xác nhận hợp lệ'}
                                                        </button>
                                                        <button
                                                          onClick={() => handleVerifyAttendance(attendance._id, 'rejected')}
                                                          disabled={verifyingAttendance.has(attendance._id) || !verificationNote[attendance._id]?.trim()}
                                                          className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                                          title={!verificationNote[attendance._id]?.trim() ? 'Vui lòng nhập lý do từ chối' : 'Từ chối điểm danh - Đánh dấu không hợp lệ'}
                                                        >
                                                          {verifyingAttendance.has(attendance._id) ? '⏳ Đang xử lý...' : '❌ Không hợp lệ'}
                                                        </button>
                                                        <button
                                                          onClick={() => {
                                                            setCancelModal({ open: true, attendanceId: attendance._id });
                                                            setCancelReason('');
                                                          }}
                                                          className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-500 text-white hover:bg-gray-600 transition-all shadow-sm"
                                                          title="Hủy điểm danh - Yêu cầu nhập lý do"
                                                        >
                                                          Hủy
                                                        </button>
                                                      </div>
                                                    </div>
                                                  );
                                                }
                                                
                                                // Show simple readonly info if approved and valid
                                                if (isApproved && !isInvalid) {
                                                  return (
                                                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                                      <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-green-500/10 border border-green-500/30' : 'bg-green-50 border border-green-200'}`}>
                                                        <div className="flex items-center justify-between">
                                                          <div className="flex items-center gap-2">
                                                            <span className="text-lg">✅</span>
                                                            <div>
                                                              <p className={`text-sm font-bold ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>
                                                                Đã điểm danh
                                                              </p>
                                                              <p className={`text-xs ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                                                                Trạng thái: Hợp lệ
                                                              </p>
                                                            </div>
                                                          </div>
                                                          {attendance.verifiedBy && (
                                                            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                              {getVerifierName(attendance.verifiedBy)}
                                                            </p>
                                                          )}
                                                        </div>
                                                      </div>
                                                    </div>
                                                  );
                                                }
                                                
                                                return null;
                                              })()}
                                            </div>
                                          ))}
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    /* Cards View */
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {filteredParticipants.map((participant, idx) => {
                        const participantId = typeof participant.userId === 'object' && participant.userId !== null
                          ? participant.userId._id || String(participant.userId)
                          : String(participant.userId);
                        
                        const config = roleConfig[participant.role] || roleConfig['Người Tham Gia'];
                        const isSelected = selectedParticipants.has(participantId);
                        const isProcessing = processing.has(participantId);
                        const isExpanded = expandedRows.has(participantId);
                        const hasAttendances = participant.attendances && participant.attendances.length > 0;

                        return (
                          <div
                            key={`${participantId}-${idx}`}
                            className={`rounded-xl border shadow-sm transition-all ${
                              isSelected
                                ? isDarkMode ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/20' : 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/20'
                                : isDarkMode 
                                  ? 'bg-gray-800 border-gray-700 hover:border-gray-600 hover:shadow-md' 
                                  : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md'
                            } ${participant.checkedIn ? (isDarkMode ? 'ring-1 ring-green-500/30' : 'ring-1 ring-green-500/20') : ''}`}
                          >
                            <div className="p-5">
                              <div className="flex items-start gap-3 mb-4">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSelectParticipant(participantId)}
                                  className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold bg-gradient-to-br ${config.gradient} text-white shadow-md`}>
                                  {getInitials(participant.name)}
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  <h3 className={`font-bold text-sm mb-1 truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                    {participant.name}
                                  </h3>
                                  <p className={`text-xs truncate mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                    {participant.email}
                                  </p>
                                  <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${config.bg} ${config.color}`}>
                                    {config.icon} {participant.role}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="mb-4 space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  {participant.checkedIn ? (
                                    <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium ${isDarkMode ? 'bg-green-500/20 text-green-300' : 'bg-green-100 text-green-700'}`}>
                                      ✅ Đã điểm danh
                                    </span>
                                  ) : (
                                    <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium ${isDarkMode ? 'bg-gray-500/20 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                                      ❌ Chưa điểm danh
                                    </span>
                                  )}
                                  {participant.checkedIn && activity && (() => {
                                    const attendanceType = getAttendanceType(participant);
                                    if (attendanceType === 'perfect') {
                                      return (
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${isDarkMode ? 'bg-green-600/20 text-green-300 border border-green-500/30' : 'bg-green-100 text-green-700 border border-green-300'}`}>
                                          ✅ Đúng giờ & đúng địa điểm
                                        </span>
                                      );
                                    } else if (attendanceType === 'late_but_valid') {
                                      return (
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${isDarkMode ? 'bg-yellow-600/20 text-yellow-300 border border-yellow-500/30' : 'bg-yellow-100 text-yellow-700 border border-yellow-300'}`}>
                                          ⏰ Trễ nhưng hợp lệ
                                        </span>
                                      );
                                    } else if (attendanceType === 'invalid_location') {
                                      return (
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${isDarkMode ? 'bg-red-600/20 text-red-300 border border-red-500/30' : 'bg-red-100 text-red-700 border border-red-300'}`}>
                                          ❌ Địa điểm không hợp lệ
                                        </span>
                                      );
                                    } else if (attendanceType === 'invalid_time') {
                                      return (
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${isDarkMode ? 'bg-red-600/20 text-red-300 border border-red-500/30' : 'bg-red-100 text-red-700 border border-red-300'}`}>
                                          ❌ Thời gian không hợp lệ
                                        </span>
                                      );
                                    } else if (attendanceType === 'invalid_both') {
                                      return (
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${isDarkMode ? 'bg-red-600/20 text-red-300 border border-red-500/30' : 'bg-red-100 text-red-700 border border-red-300'}`}>
                                          ❌ Địa điểm & thời gian không hợp lệ
                                        </span>
                                      );
                                    } else if (attendanceType === 'invalid') {
                                      return (
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${isDarkMode ? 'bg-red-600/20 text-red-300 border border-red-500/30' : 'bg-red-100 text-red-700 border border-red-300'}`}>
                                          ❌ Không hợp lệ
                                        </span>
                                      );
                                    }
                                    return null;
                                  })()}
                                  {/* Badge "Thiếu buổi" nếu tham gia không đầy đủ (trừ trường hợp 1 buổi chỉ điểm danh 1 lần - đã có text riêng) */}
                                  {activity && (() => {
                                    const sessionCount = getCompletedSessionsCount(participant);
                                    // Không hiển thị badge "Thiếu buổi" cho trường hợp 1 buổi chỉ điểm danh 1 lần (đã có text riêng rõ ràng)
                                    const isOneSessionPartialOnly = sessionCount.total === 1 && sessionCount.partial === 1 && sessionCount.completed === 0;
                                    if (hasIncompleteAttendance(participant) && !isOneSessionPartialOnly) {
                                      return (
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${isDarkMode ? 'bg-orange-600/20 text-orange-300 border border-orange-500/30' : 'bg-orange-100 text-orange-700 border border-orange-300'}`}>
                                          ⚠️ Thiếu buổi
                                        </span>
                                      );
                                    }
                                    return null;
                                  })()}
                                </div>
                                {/* Hiển thị số buổi đã điểm danh */}
                                {activity && (() => {
                                  const sessionCount = getCompletedSessionsCount(participant);
                                  if (sessionCount.total > 0) {
                                    // Trường hợp đặc biệt: 1 buổi chỉ điểm danh 1 lần
                                    if (sessionCount.total === 1 && sessionCount.partial === 1 && sessionCount.completed === 0) {
                                      return (
                                        <div className={`text-xs font-semibold mt-2 ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                                          ⚠️ Chỉ điểm danh 1 lần (thiếu 1 lần)
                                        </div>
                                      );
                                    }
                                    
                                    if (sessionCount.completed === sessionCount.total && sessionCount.partial === 0) {
                                      // Hoàn thành tất cả buổi
                                      return (
                                        <div className={`text-xs font-semibold mt-2 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                                          ✅ Đã hoàn thành {sessionCount.completed}/{sessionCount.total} buổi
                                        </div>
                                      );
                                    } else if (sessionCount.completed > 0 || sessionCount.partial > 0) {
                                      // Có buổi hoàn thành hoặc một phần
                                      return (
                                        <div className="space-y-1 mt-2">
                                          {sessionCount.completed > 0 && (
                                            <div className={`text-xs font-semibold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                                              ✅ Hoàn thành đầy đủ: {sessionCount.completed}/{sessionCount.total} buổi
                                            </div>
                                          )}
                                          {sessionCount.partial > 0 && (
                                            <div className={`text-xs font-semibold ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                                              ⚠️ Chỉ điểm danh một phần: {sessionCount.partial} buổi
                                            </div>
                                          )}
                                          {sessionCount.completed + sessionCount.partial < sessionCount.total && (
                                            <div className={`text-xs font-semibold ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                                              ❌ Chưa điểm danh: {sessionCount.total - sessionCount.completed - sessionCount.partial} buổi
                                            </div>
                                          )}
                                        </div>
                                      );
                                    } else {
                                      // Chưa có buổi nào được approved
                                      return (
                                        <div className={`text-xs mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                          ⏸️ Chưa hoàn thành buổi nào ({sessionCount.total} buổi)
                                        </div>
                                      );
                                    }
                                  }
                                  return null;
                                })()}
                              </div>

                              {hasAttendances && (
                                <div className="mb-4">
                                  <button
                                    onClick={() => toggleRowExpansion(participantId)}
                                    className={`w-full text-xs px-3 py-2 rounded-lg font-medium transition-all ${
                                      isDarkMode 
                                        ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30' 
                                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                                    }`}
                                  >
                                    {isExpanded ? '▲ Thu gọn' : '▼ Xem chi tiết (' + participant.attendances!.length + ')'}
                                  </button>
                                </div>
                              )}
                              
                              {isExpanded && hasAttendances && (
                                <div className="mb-4 space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                                  {participant.attendances!.map((attendance: AttendanceRecord) => (
                                    <div key={attendance._id} className={`p-3 rounded-lg border ${isDarkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                                      <div className="flex items-center justify-between mb-2">
                                        <div>
                                          <p className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                            {attendance.timeSlot} - {attendance.checkInType === 'start' ? 'Đầu' : 'Cuối'}
                                          </p>
                                          <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                            {new Date(attendance.checkInTime).toLocaleString('vi-VN')}
                                          </p>
                                        </div>
                                        <div className="flex flex-col gap-1.5 items-end">
                                          {(() => {
                                            const timeValidation = validateTime(attendance);
                                            const isLate = attendance.lateReason || (timeValidation.valid && timeValidation.isLate === true);
                                            
                                            return (
                                              <>
                                                {isLate && (
                                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                                    isDarkMode ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' : 'bg-orange-100 text-orange-700 border border-orange-300'
                                                  }`}>
                                                    ⏰ Trễ
                                                  </span>
                                                )}
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                  attendance.status === 'approved'
                                                    ? isDarkMode ? 'bg-green-500/20 text-green-300' : 'bg-green-100 text-green-700'
                                                    : attendance.status === 'rejected'
                                                    ? isDarkMode ? 'bg-red-500/20 text-red-300' : 'bg-red-100 text-red-700'
                                                    : isDarkMode ? 'bg-yellow-500/20 text-yellow-300' : 'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                  {attendance.status === 'approved' && '✅'}
                                                  {attendance.status === 'rejected' && '❌'}
                                                  {attendance.status === 'pending' && '⏳'}
                                                </span>
                                              </>
                                            );
                                          })()}
                                        </div>
                                      </div>

                                      {/* Validation Info */}
                                      {(() => {
                                        const locationValidation = validateLocation(attendance);
                                        const timeValidation = validateTime(attendance);
                                        return (
                                          <div className="mb-3 space-y-2">
                                            {/* Location Validation */}
                                            <div className={`p-2 rounded-lg border text-xs ${
                                              locationValidation.valid
                                                ? isDarkMode ? 'bg-green-500/10 border-green-500/30' : 'bg-green-50 border-green-200'
                                                : isDarkMode ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-200'
                                            }`}>
                                              <div className="flex items-start gap-2">
                                                {locationValidation.valid ? (
                                                  <span>✅</span>
                                                ) : (
                                                  <span>❌</span>
                                                )}
                                                <div className="flex-1">
                                                  <p className={`font-semibold ${
                                                    locationValidation.valid
                                                      ? isDarkMode ? 'text-green-300' : 'text-green-700'
                                                      : isDarkMode ? 'text-red-300' : 'text-red-700'
                                                  }`}>
                                                    {locationValidation.valid ? 'Vị trí hợp lệ' : 'Vị trí không hợp lệ'}
                                                  </p>
                                                  {locationValidation.distance !== undefined && (
                                                    <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                      Khoảng cách: {locationValidation.distance.toFixed(0)}m
                                                    </p>
                                                  )}
                                                </div>
                                              </div>
                                            </div>

                                            {/* Time Validation */}
                                            <div className={`p-2 rounded-lg border text-xs ${
                                              timeValidation.valid
                                                ? timeValidation.isLate
                                                  ? isDarkMode ? 'bg-orange-500/10 border-orange-500/30' : 'bg-orange-50 border-orange-200'
                                                  : isDarkMode ? 'bg-green-500/10 border-green-500/30' : 'bg-green-50 border-green-200'
                                                : isDarkMode ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-200'
                                            }`}>
                                              <div className="flex items-start gap-2">
                                                {timeValidation.valid ? (
                                                  timeValidation.isLate ? (
                                                    <span>⏰</span>
                                                  ) : (
                                                    <span>✅</span>
                                                  )
                                                ) : (
                                                  <span>❌</span>
                                                )}
                                                <div className="flex-1">
                                                  <p className={`font-semibold ${
                                                    timeValidation.valid
                                                      ? timeValidation.isLate
                                                        ? isDarkMode ? 'text-orange-300' : 'text-orange-700'
                                                        : isDarkMode ? 'text-green-300' : 'text-green-700'
                                                      : isDarkMode ? 'text-red-300' : 'text-red-700'
                                                  }`}>
                                                    {timeValidation.valid 
                                                      ? timeValidation.isLate 
                                                        ? 'Thời gian hợp lệ (Trễ)' 
                                                        : 'Thời gian hợp lệ'
                                                      : 'Thời gian không hợp lệ'}
                                                  </p>
                                                  {timeValidation.message && (
                                                    <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                      {timeValidation.message}
                                                    </p>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })()}
                                      
                                      {attendance.photoUrl && (
                                        <div className="mb-2">
                                          <div 
                                            className="relative group cursor-pointer rounded-lg overflow-hidden border-2 border-gray-300 dark:border-gray-600"
                                            onClick={() => setViewingImage(attendance.photoUrl || null)}
                                          >
                                            <img
                                              src={attendance.photoUrl}
                                              alt={`Điểm danh ${attendance.timeSlot}`}
                                              className="w-full h-32 object-cover hover:opacity-90 transition-opacity"
                                            />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                              <svg className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                              </svg>
                                            </div>
                                          </div>
                                        </div>
                                      )}

                                      {/* Location Info */}
                                      {attendance.location && (
                                        <div className="mb-2">
                                          <p className={`text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                            📍 Vị trí
                                          </p>
                                          <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                            {attendance.location.address || `${attendance.location.lat.toFixed(6)}, ${attendance.location.lng.toFixed(6)}`}
                                          </p>
                                        </div>
                                      )}

                                      {/* Expected Time Range */}
                                      {activity?.timeSlots && (() => {
                                        const timeSlot = activity.timeSlots.find(ts => ts.name === attendance.timeSlot && ts.isActive);
                                        if (timeSlot) {
                                          return (
                                            <div className="mb-2">
                                              <p className={`text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                                ⏰ Thời gian dự kiến
                                              </p>
                                              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                {attendance.checkInType === 'start' 
                                                  ? `Bắt đầu: ${timeSlot.startTime}`
                                                  : `Kết thúc: ${timeSlot.endTime}`
                                                }
                                              </p>
                                            </div>
                                          );
                                        }
                                        return null;
                                      })()}

                                      {/* Late Reason from Student */}
                                      {attendance.lateReason && (
                                        <div className={`mb-2 p-2 rounded-lg border ${
                                          isDarkMode ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200'
                                        }`}>
                                          <div className="flex items-start gap-2">
                                            <span className="text-sm">⏰</span>
                                            <div className="flex-1">
                                              <p className={`text-xs font-bold mb-1 ${isDarkMode ? 'text-amber-300' : 'text-amber-700'}`}>
                                                Lý do trễ từ người tham gia
                                              </p>
                                              <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                                {attendance.lateReason}
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                      
                                      {(() => {
                                        const locationValidation = validateLocation(attendance);
                                        const timeValidation = validateTime(attendance);
                                        const isInvalid = !locationValidation.valid || !timeValidation.valid;
                                        
                                        const isPending = attendance.status === 'pending';
                                        const isRejected = attendance.status === 'rejected';
                                        const isApproved = attendance.status === 'approved';
                                        const isApprovedButInvalid = isApproved && isInvalid;
                                        
                                        // Show verification UI only for pending or rejected
                                        if (isPending || isRejected) {
                                          return (
                                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                                              {/* Show validation errors if invalid */}
                                              {isInvalid && (
                                                <div className={`mb-2 p-2 rounded border ${
                                                  isDarkMode ? 'bg-orange-500/10 border-orange-500/30' : 'bg-orange-50 border-orange-200'
                                                }`}>
                                                  <p className={`text-xs font-semibold mb-1 ${isDarkMode ? 'text-orange-300' : 'text-orange-700'}`}>
                                                    ⚠️ Không hợp lệ
                                                  </p>
                                                  {!locationValidation.valid && (
                                                    <p className={`text-xs mb-1 ${isDarkMode ? 'text-orange-200' : 'text-orange-600'}`}>
                                                      • {locationValidation.message || 'Vị trí không hợp lệ'}
                                                    </p>
                                                  )}
                                                  {!timeValidation.valid && (
                                                    <p className={`text-xs ${isDarkMode ? 'text-orange-200' : 'text-orange-600'}`}>
                                                      • {timeValidation.message || 'Thời gian không hợp lệ'}
                                                    </p>
                                                  )}
                                                </div>
                                              )}
                                              
                                              <label className={`block text-xs font-semibold mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                                {isPending ? 'Xác nhận điểm danh' : 'Xem xét lại'}
                                                {isInvalid && <span className="text-red-500"> *</span>}
                                              </label>
                                              <textarea
                                                placeholder={isInvalid ? "Nhập lý do duyệt (bắt buộc)..." : "Ghi chú (tùy chọn)..."}
                                                value={verificationNote[attendance._id] || ''}
                                                onChange={(e) => setVerificationNote(prev => ({
                                                  ...prev,
                                                  [attendance._id]: e.target.value
                                                }))}
                                                className={`w-full px-2 py-1.5 rounded text-xs border resize-none mb-2 ${
                                                  isDarkMode 
                                                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                                                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                                                } focus:outline-none focus:ring-1 focus:ring-blue-500`}
                                                rows={2}
                                              />
                                              <div className="flex gap-2">
                                                <button
                                                  onClick={() => handleVerifyAttendance(attendance._id, 'approved')}
                                                  disabled={verifyingAttendance.has(attendance._id) || (isInvalid && !verificationNote[attendance._id]?.trim())}
                                                  className="flex-1 px-2 py-1.5 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                  title={isInvalid && !verificationNote[attendance._id]?.trim() ? 'Vui lòng nhập lý do duyệt' : ''}
                                                >
                                                  ✅
                                                </button>
                                                <button
                                                  onClick={() => handleVerifyAttendance(attendance._id, 'rejected')}
                                                  disabled={verifyingAttendance.has(attendance._id)}
                                                  className="flex-1 px-2 py-1.5 rounded-lg text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                  ❌
                                                </button>
                                              </div>
                                            </div>
                                          );
                                        }
                                        
                                        // If approved but invalid, show minimal adjustment option
                                        if (isApprovedButInvalid) {
                                          return (
                                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                                              <div className={`mb-2 p-2 rounded border ${
                                                isDarkMode ? 'bg-green-500/10 border-green-500/30' : 'bg-green-50 border-green-200'
                                              }`}>
                                                <p className={`text-xs font-semibold ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>
                                                  ✅ Đã duyệt {attendance.verifiedBy && ` • ${getVerifierName(attendance.verifiedBy)}`}
                                                </p>
                                                {attendance.verificationNote && (
                                                  <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                                    📝 {attendance.verificationNote}
                                                  </p>
                                                )}
                                              </div>
                                              <div className={`mb-2 p-1.5 rounded border ${
                                                isDarkMode ? 'bg-orange-500/10 border-orange-500/30' : 'bg-orange-50 border-orange-200'
                                              }`}>
                                                <p className={`text-xs mb-2 ${isDarkMode ? 'text-orange-300' : 'text-orange-700'}`}>
                                                  ⚠️ Không hợp lệ - Xem xét lại
                                                </p>
                                                <textarea
                                                  placeholder="Lý do (bắt buộc)..."
                                                  value={verificationNote[attendance._id] || ''}
                                                  onChange={(e) => setVerificationNote(prev => ({
                                                    ...prev,
                                                    [attendance._id]: e.target.value
                                                  }))}
                                                  className={`w-full px-2 py-1 rounded text-xs border resize-none mb-2 ${
                                                    isDarkMode 
                                                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                                                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                                                  } focus:outline-none focus:ring-1 focus:ring-blue-500`}
                                                  rows={2}
                                                />
                                                <div className="flex gap-1">
                                                  <button
                                                    onClick={() => handleVerifyAttendance(attendance._id, 'approved')}
                                                    disabled={verifyingAttendance.has(attendance._id) || !verificationNote[attendance._id]?.trim()}
                                                    className="flex-1 px-2 py-1 rounded text-xs font-medium bg-green-600 text-white hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                    title="Xác nhận hợp lệ"
                                                  >
                                                    ✅
                                                  </button>
                                                  <button
                                                    onClick={() => handleVerifyAttendance(attendance._id, 'rejected')}
                                                    disabled={verifyingAttendance.has(attendance._id) || !verificationNote[attendance._id]?.trim()}
                                                    className="flex-1 px-2 py-1 rounded text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                    title="Đánh dấu không hợp lệ"
                                                  >
                                                    ❌
                                                  </button>
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        }
                                        
                                        // Show simple readonly info if approved and valid
                                        if (isApproved && !isInvalid) {
                                          return (
                                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                                              <div className={`p-2 rounded border ${
                                                isDarkMode ? 'bg-green-500/10 border-green-500/30' : 'bg-green-50 border-green-200'
                                              }`}>
                                                <div className="flex items-center justify-between">
                                                  <div>
                                                    <p className={`text-xs font-bold ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>
                                                      ✅ Đã điểm danh
                                                    </p>
                                                    <p className={`text-xs ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                                                      Trạng thái: Hợp lệ
                                                    </p>
                                                  </div>
                                                  {attendance.verifiedBy && (
                                                    <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                      {getVerifierName(attendance.verifiedBy)}
                                                    </p>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        }
                                        
                                        return null;
                                      })()}
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              <button
                                onClick={() => {
                                  if (participant.checkedIn) {
                                    // Show cancel modal for canceling attendance
                                    const participantId = typeof participant.userId === 'object' && participant.userId !== null
                                      ? participant.userId._id || String(participant.userId)
                                      : String(participant.userId);
                                    setCancelModal({ 
                                      open: true, 
                                      attendanceId: null, 
                                      participantId: participantId 
                                    });
                                    setCancelReason('');
                                  } else {
                                    // Direct check-in for new attendance
                                    handleCheckIn(participant, true);
                                  }
                                }}
                                disabled={processing.has(typeof participant.userId === 'object' && participant.userId !== null
                                  ? participant.userId._id || String(participant.userId)
                                  : String(participant.userId))}
                                className={`w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-all shadow-sm ${
                                  participant.checkedIn
                                    ? isDarkMode 
                                      ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' 
                                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    : 'bg-green-600 text-white hover:bg-green-700'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                              >
                                {processing.has(typeof participant.userId === 'object' && participant.userId !== null
                                  ? participant.userId._id || String(participant.userId)
                                  : String(participant.userId)) ? '⏳ Đang xử lý...' : participant.checkedIn ? '❌ Hủy điểm danh' : '✅ Điểm danh thủ công'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : (
                  <div className={`text-center py-16 rounded-xl border border-dashed ${isDarkMode ? 'bg-gray-800/30 border-gray-700 text-gray-400' : 'bg-white border-gray-200 text-gray-500'}`}>
                    <div className={`w-16 h-16 mx-auto rounded-xl flex items-center justify-center mb-4 ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
                      <span className="text-3xl">👥</span>
                    </div>
                    <h3 className={`text-lg font-bold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {participants.length === 0 ? 'Chưa có người tham gia' : 'Không tìm thấy kết quả'}
                    </h3>
                    <p className="text-sm">
                      {participants.length === 0 
                        ? 'Chưa có ai được duyệt tham gia hoạt động này'
                        : 'Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

        <Footer isDarkMode={isDarkMode} />
        
        {/* Image Modal */}
        <ImageModal 
          imageUrl={viewingImage}
          isOpen={!!viewingImage}
          onClose={() => setViewingImage(null)}
        />

        {/* Cancel Attendance Modal */}
        {cancelModal.open && (cancelModal.attendanceId || cancelModal.participantId) && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className={`w-full max-w-md mx-4 rounded-2xl shadow-2xl ${
              isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
            }`}>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    isDarkMode ? 'bg-red-500/20' : 'bg-red-100'
                  }`}>
                    <span className="text-2xl">⚠️</span>
                  </div>
                  <div>
                    <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Cảnh báo hủy điểm danh
                    </h3>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {cancelModal.attendanceId 
                        ? 'Bạn có chắc chắn muốn hủy điểm danh này?'
                        : 'Bạn có chắc chắn muốn hủy điểm danh của người tham gia này?'
                      }
                    </p>
                  </div>
                </div>

                <div className={`mb-4 p-4 rounded-lg ${
                  isDarkMode ? 'bg-red-500/10 border border-red-500/30' : 'bg-red-50 border border-red-200'
                }`}>
                  <p className={`text-sm font-semibold mb-2 ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>
                    ⚠️ Lưu ý
                  </p>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {cancelModal.attendanceId
                      ? 'Khi hủy điểm danh, người tham gia sẽ nhận được thông báo và lý do hủy. Hành động này sẽ đánh dấu điểm danh là không hợp lệ.'
                      : 'Khi hủy điểm danh, tất cả các bản ghi điểm danh của người tham gia sẽ bị hủy và họ sẽ nhận được thông báo với lý do hủy. Hành động này sẽ đánh dấu điểm danh là không hợp lệ.'
                    }
                  </p>
                </div>

                <div className="mb-4">
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Lý do hủy <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Vui lòng nhập lý do hủy điểm danh (bắt buộc). VD: Điểm danh không hợp lệ, vi phạm quy định..."
                    className={`w-full px-4 py-3 rounded-lg border resize-none ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500'
                    } focus:outline-none focus:ring-2 focus:ring-red-500/20`}
                    rows={4}
                  />
                  <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Lý do này sẽ được gửi đến người tham gia để họ biết vì sao điểm danh bị hủy.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setCancelModal({ open: false, attendanceId: null, participantId: null });
                      setCancelReason('');
                    }}
                    className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                      isDarkMode 
                        ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Đóng
                  </button>
                  <button
                    onClick={async () => {
                      if (!cancelReason.trim()) {
                        setError('Vui lòng nhập lý do hủy');
                        return;
                      }
                      
                      try {
                        if (cancelModal.attendanceId) {
                          // Cancel specific attendance record
                          setVerificationNote(prev => ({
                            ...prev,
                            [cancelModal.attendanceId!]: cancelReason.trim()
                          }));
                          
                          await handleVerifyAttendance(cancelModal.attendanceId!, 'rejected');
                          
                          setCancelModal({ open: false, attendanceId: null, participantId: null });
                          setCancelReason('');
                          setVerificationNote(prev => {
                            const newState = { ...prev };
                            delete newState[cancelModal.attendanceId!];
                            return newState;
                          });
                        } else if (cancelModal.participantId) {
                          // Cancel all attendance records for participant
                          const participant = participants.find(p => {
                            const pid = typeof p.userId === 'object' && p.userId !== null
                              ? p.userId._id || String(p.userId)
                              : String(p.userId);
                            return pid === cancelModal.participantId;
                          });
                          
                          if (participant && participant.attendances && participant.attendances.length > 0) {
                            // Reject all attendance records
                            const token = localStorage.getItem('token');
                            for (const attendance of participant.attendances) {
                              try {
                                await fetch(`/api/attendance/${attendance._id}/verify`, {
                                  method: 'PATCH',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${token}`,
                                  },
                                  body: JSON.stringify({
                                    status: 'rejected',
                                    cancelReason: cancelReason.trim(),
                                    verificationNote: cancelReason.trim() // For backward compatibility
                                  }),
                                });
                              } catch (err) {
                                console.error(`Error rejecting attendance ${attendance._id}:`, err);
                              }
                            }
                          }
                          
                          // Also uncheck the participant
                          if (participant) {
                            await handleCheckIn(participant, false);
                          }
                          
                          setCancelModal({ open: false, attendanceId: null, participantId: null });
                          setCancelReason('');
                          setSuccessMessage('Đã hủy điểm danh thành công');
                          setTimeout(() => setSuccessMessage(null), 3000);
                          await fetchAttendance();
                        }
                      } catch (err) {
                        console.error('Error canceling attendance:', err);
                        setError('Có lỗi xảy ra khi hủy điểm danh');
                      }
                    }}
                    disabled={Boolean(!cancelReason.trim() || (cancelModal.attendanceId ? verifyingAttendance.has(cancelModal.attendanceId) : false) || (cancelModal.participantId ? processing.has(cancelModal.participantId) : false))}
                    className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                      isDarkMode 
                        ? 'bg-red-600 text-white hover:bg-red-700' 
                        : 'bg-red-500 text-white hover:bg-red-600'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {((cancelModal.attendanceId && verifyingAttendance.has(cancelModal.attendanceId)) || (cancelModal.participantId && processing.has(cancelModal.participantId))) ? '⏳ Đang xử lý...' : '✅ Xác nhận hủy'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Check In All Confirmation Modal */}
        {checkInAllModal.open && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className={`rounded-xl border shadow-2xl max-w-md w-full ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    checkInAllModal.checkedIn
                      ? isDarkMode ? 'bg-green-500/20' : 'bg-green-100'
                      : isDarkMode ? 'bg-gray-500/20' : 'bg-gray-100'
                  }`}>
                    <span className="text-2xl">
                      {checkInAllModal.checkedIn ? '✅' : '❌'}
                    </span>
                  </div>
                  <div>
                    <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {checkInAllModal.checkedIn ? 'Xác nhận điểm danh tất cả' : 'Xác nhận hủy điểm danh tất cả'}
                    </h3>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Bạn có chắc chắn muốn {checkInAllModal.checkedIn ? 'điểm danh' : 'hủy điểm danh'} tất cả người tham gia?
                    </p>
                  </div>
                </div>
                
                <div className={`mb-4 p-3 rounded-lg ${
                  isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'
                }`}>
                  <p className={`text-sm font-semibold mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Số lượng người sẽ được {checkInAllModal.checkedIn ? 'điểm danh' : 'hủy điểm danh'}:
                  </p>
                  <p className={`text-lg font-bold ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                    {filteredParticipants.length} người
                  </p>
                  {filteredParticipants.length !== participants.length && (
                    <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      (Chỉ áp dụng cho {filteredParticipants.length} người đang hiển thị sau khi lọc)
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setCheckInAllModal({ open: false, checkedIn: true })}
                    className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                      isDarkMode 
                        ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Hủy
                  </button>
                  <button
                    onClick={async () => {
                      await handleCheckInAll(checkInAllModal.checkedIn);
                      setCheckInAllModal({ open: false, checkedIn: true });
                    }}
                    className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                      checkInAllModal.checkedIn
                        ? isDarkMode 
                          ? 'bg-green-600 text-white hover:bg-green-700' 
                          : 'bg-green-500 text-white hover:bg-green-600'
                        : isDarkMode 
                          ? 'bg-gray-600 text-white hover:bg-gray-700' 
                          : 'bg-gray-500 text-white hover:bg-gray-600'
                    }`}
                  >
                    {checkInAllModal.checkedIn ? '✅ Xác nhận điểm danh' : '❌ Xác nhận hủy'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
