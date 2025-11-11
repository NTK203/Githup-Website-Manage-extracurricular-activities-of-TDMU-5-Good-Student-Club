'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import StudentNav from '@/components/student/StudentNav';
import Footer from '@/components/common/Footer';
import { useAuth } from '@/hooks/useAuth';
import { useDarkMode } from '@/hooks/useDarkMode';
import dynamic from 'next/dynamic';

// Dynamically import OpenStreetMapPicker with SSR disabled
const OpenStreetMapPicker = dynamic(() => import('@/components/common/OpenStreetMapPicker'), {
  ssr: false,
  loading: () => (
    <div className="h-64 w-full rounded-xl border-2 border-gray-300 bg-gray-50/50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-3 bg-gray-200/50">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <p className="text-sm text-gray-500">Đang tải OpenStreetMap...</p>
      </div>
    </div>
  )
});

const ReadOnlyMultiTimeLocationViewer = dynamic(() => import('@/components/common/ReadOnlyMultiTimeLocationViewer'), {
  ssr: false,
  loading: () => (
    <div className="h-64 w-full rounded-xl border-2 border-gray-300 bg-gray-50/50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-3 bg-gray-200/50">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <p className="text-sm text-gray-500">Đang tải bản đồ...</p>
      </div>
    </div>
  )
});

const slotMap: { [key: string]: 'morning' | 'afternoon' | 'evening' } = {
  'Buổi Sáng': 'morning',
  'Buổi Chiều': 'afternoon',
  'Buổi Tối': 'evening'
};

interface Participant {
  _id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
}

interface LocationData {
  lat: number;
  lng: number;
  address: string;
  radius: number;
}

interface MultiTimeLocation {
  id: string;
  timeSlot: 'morning' | 'afternoon' | 'evening';
  lat: number;
  lng: number;
  address: string;
  radius: number;
}

interface ActivityDetail {
  _id: string;
  name: string;
  description: string;
  date: string;
  location: string;
  timeSlots: Array<{
    startTime: string;
    endTime: string;
    isActive: boolean;
    name: string;
    activities?: string;
    detailedLocation?: { [key: string]: string };
  }>;
  points?: number;
  status: string;
  type: string;
  visibility: 'public' | 'private';
  imageUrl?: string;
  overview?: string;
  numberOfSessions?: number;
  registeredParticipantsCount?: number;
  organizer?: string;
  participants: Participant[];
  locationData?: LocationData;
  multiTimeLocations?: MultiTimeLocation[];
  detailedLocation?: string;
  isMultiTimeLocation: boolean;
}

export default function ActivityDetailPage() {
  const { activityId } = useParams();
  const router = useRouter();
  const { user, token, isAuthenticated, refetchUser } = useAuth();
  const { isDarkMode } = useDarkMode();

  const [activity, setActivity] = useState<ActivityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<'pending' | 'approved' | 'rejected' | undefined>(undefined);
  const [checkedIn, setCheckedIn] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [locationPickerKey, setLocationPickerKey] = useState(0);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<'morning' | 'afternoon' | 'evening' | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<Array<{
    _id: string;
    timeSlot: string;
    checkInType: string;
    checkInTime: string;
    status: string;
  }>>([]);

  // Load attendance records from API
  const loadAttendanceRecords = useCallback(async () => {
    if (!isAuthenticated || !token || !activityId || !user) {
      return;
    }

    try {
      const response = await fetch(`/api/activities/${activityId}/attendance/student`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data && data.data.attendances && Array.isArray(data.data.attendances)) {
          setAttendanceRecords(data.data.attendances);
        } else {
          setAttendanceRecords([]);
        }
      }
    } catch (err) {
      console.error('Error loading attendance records:', err);
      setAttendanceRecords([]);
    }
  }, [isAuthenticated, token, activityId, user]);

  useEffect(() => {
    const fetchActivityDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!token || !activityId || !user) {
          throw new Error("User not authenticated or activity ID not available.");
        }

        const response = await fetch(`/api/activities/${activityId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch activity details');
        }

        const responseData = await response.json();
        const rawActivity = responseData.data.activity;

        if (!rawActivity) {
          throw new Error("Activity not found.");
        }

        const isMultiTimeMode = rawActivity.location === 'Nhiều địa điểm' || (rawActivity.multiTimeLocations && rawActivity.multiTimeLocations.length > 0);

        const activityDetails: ActivityDetail = {
          _id: rawActivity._id,
          name: rawActivity.name,
          description: rawActivity.description,
          date: rawActivity.date?.$date ? new Date(rawActivity.date.$date).toLocaleDateString('vi-VN') : new Date(rawActivity.date).toLocaleDateString('vi-VN'),
          location: rawActivity.location,
          timeSlots: rawActivity.timeSlots?.map((slot: any) => ({ 
            ...slot, 
            activities: slot.activities || '',
            detailedLocation: slot.detailedLocation || {} 
          })) || [],
          points: rawActivity.points || 0,
          status: rawActivity.status,
          type: rawActivity.type,
          visibility: rawActivity.visibility,
          imageUrl: rawActivity.imageUrl,
          overview: rawActivity.overview,
          numberOfSessions: rawActivity.timeSlots?.filter((slot: { isActive: boolean; }) => slot.isActive).length || 0,
          registeredParticipantsCount: rawActivity.participants?.length || 0,
          organizer: rawActivity.responsiblePerson?.name || rawActivity.participants?.find((p: { role: string; }) => p.role === 'Trưởng Nhóm')?.name || rawActivity.participants?.[0]?.name || 'N/A',
          participants: rawActivity.participants || [],
          locationData: rawActivity.locationData,
          multiTimeLocations: rawActivity.multiTimeLocations?.map((mtl: any) => {
            // Lấy radius từ mtl (giá trị thực tế từ database)
            // mtl.radius là giá trị ở cấp độ root của multiTimeLocation object
            const actualRadius = mtl.radius !== undefined && mtl.radius !== null ? mtl.radius : undefined;
            return {
              ...mtl, 
              lat: mtl.location?.lat ?? 0, 
              lng: mtl.location?.lng ?? 0, 
              address: mtl.location?.address ?? '', 
              radius: actualRadius
            };
          }) || [],
          detailedLocation: rawActivity.detailedLocation,
          isMultiTimeLocation: isMultiTimeMode,
        };

        setActivity(activityDetails);

        // Check if user is registered and get approval status and attendance status
        const userParticipant = rawActivity.participants.find(
          (p: any) => {
            const participantUserId = typeof p.userId === 'object' && p.userId !== null
              ? (p.userId._id || p.userId.$oid || String(p.userId))
              : (p.userId?.$oid || p.userId || String(p.userId));
            return participantUserId === user._id;
          }
        );
        
        if (userParticipant) {
          setIsRegistered(true);
          setApprovalStatus(userParticipant.approvalStatus || 'pending');
          setCheckedIn(userParticipant.checkedIn || false);
        } else {
          setIsRegistered(false);
          setApprovalStatus(undefined);
          setCheckedIn(false);
        }
        
        // Load attendance records if user is registered and approved
        if (userParticipant && userParticipant.approvalStatus === 'approved') {
          await loadAttendanceRecords();
        }
        
        setLocationPickerKey(prev => prev + 1);

        // Nếu chỉ có 1 địa điểm, tự động chọn và hiển thị
        if (isMultiTimeMode && activityDetails.multiTimeLocations && activityDetails.multiTimeLocations.length === 1) {
          setSelectedTimeSlot(activityDetails.multiTimeLocations[0].timeSlot);
          // Tự động scroll đến map section sau khi render
          setTimeout(() => {
            const mapSection = document.getElementById('map-section');
            if (mapSection) {
              mapSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 300);
        }

      } catch (err: unknown) {
        console.error("Failed to fetch activity details:", err);
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated && activityId && user) {
      fetchActivityDetails();
    }
  }, [isAuthenticated, token, activityId, user]);

  // Auto-select when only 1 location exists
  useEffect(() => {
    if (activity?.isMultiTimeLocation && activity.multiTimeLocations && activity.multiTimeLocations.length === 1 && !selectedTimeSlot) {
      setSelectedTimeSlot(activity.multiTimeLocations[0].timeSlot);
      // Scroll to map section
      setTimeout(() => {
        const mapSection = document.getElementById('map-section');
        if (mapSection) {
          mapSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 300);
    }
  }, [activity, selectedTimeSlot]);

  // Reload attendance records when page becomes visible (user returns from attendance page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isRegistered && approvalStatus === 'approved' && isAuthenticated && token && activityId && user) {
        loadAttendanceRecords();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [isRegistered, approvalStatus, isAuthenticated, token, activityId, user, loadAttendanceRecords]);

  // Helper function to check activity time status
  const getActivityTimeStatus = (): 'before' | 'during' | 'after' => {
    if (!activity) return 'after';
    
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Parse activity date (format: DD/MM/YYYY)
      const dateParts = activity.date.split('/');
      if (dateParts.length !== 3) {
        return 'after'; // If date format is invalid, assume it's in the past
      }

      const activityDate = new Date(
        parseInt(dateParts[2]),
        parseInt(dateParts[1]) - 1,
        parseInt(dateParts[0])
      );

      if (isNaN(activityDate.getTime())) {
        return 'after';
      }

      const activityDateOnly = new Date(
        activityDate.getFullYear(),
        activityDate.getMonth(),
        activityDate.getDate()
      );

      // Compare dates
      if (today.getTime() < activityDateOnly.getTime()) {
        return 'before'; // Chưa đến ngày
      }

      if (today.getTime() > activityDateOnly.getTime()) {
        return 'after'; // Đã qua ngày
      }

      // Same day - check if activity has ended
      if (activity.timeSlots && activity.timeSlots.length > 0) {
        // Find the latest end time
        let latestEndTime: Date | null = null;
        
        activity.timeSlots
          .filter(slot => slot.isActive)
          .forEach(slot => {
            const [endHours, endMinutes] = slot.endTime.split(':').map(Number);
            const slotEndTime = new Date(activityDate);
            slotEndTime.setHours(endHours, endMinutes, 0, 0);
            
            // Add 15 minutes buffer (check-in window)
            const checkInWindowEnd = new Date(slotEndTime);
            checkInWindowEnd.setMinutes(checkInWindowEnd.getMinutes() + 15);
            
            if (!latestEndTime || checkInWindowEnd.getTime() > latestEndTime.getTime()) {
              latestEndTime = checkInWindowEnd;
            }
          });

        if (latestEndTime) {
          const endTime: Date = latestEndTime;
          if (now.getTime() > endTime.getTime()) {
            return 'after'; // Đã qua thời gian kết thúc
          }
        }
      }

      return 'during'; // Đang trong thời gian hoạt động
    } catch (e) {
      return 'after'; // Default to 'after' on error
    }
  };

  const handleRegisterToggle = async () => {
    if (!isAuthenticated || !token || !activity || !user) {
      alert("Bạn cần đăng nhập để đăng ký hoặc hủy đăng ký hoạt động.");
      return;
    }

    setIsRegistering(true);
    setError(null);

    try {
      const url = `/api/activities/${activity._id}/register`;
      const method = isRegistered ? 'DELETE' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: user._id, name: user.name, email: user.email, role: 'Người Tham Gia' }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to ${isRegistered ? 'unregister from' : 'register for'} activity`);
      }

      const result = await response.json();
      alert(result.message);

      if (activityId && user) {
        const updatedActivityResponse = await fetch(`/api/activities/${activityId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const updatedActivityData = await updatedActivityResponse.json();
        const rawUpdatedActivity = updatedActivityData.data.activity;

        if (rawUpdatedActivity) {
          const isMultiTimeMode = rawUpdatedActivity.location === 'Nhiều địa điểm' || (rawUpdatedActivity.multiTimeLocations && rawUpdatedActivity.multiTimeLocations.length > 0);
          const updatedActivityDetails: ActivityDetail = {
            _id: rawUpdatedActivity._id,
            name: rawUpdatedActivity.name,
            description: rawUpdatedActivity.description,
            date: rawUpdatedActivity.date?.$date ? new Date(rawUpdatedActivity.date.$date).toLocaleDateString('vi-VN') : new Date(rawUpdatedActivity.date).toLocaleDateString('vi-VN'),
            location: rawUpdatedActivity.location,
            timeSlots: rawUpdatedActivity.timeSlots?.map((slot: any) => ({ 
              ...slot, 
              activities: slot.activities || '',
              detailedLocation: slot.detailedLocation || {} 
            })) || [],
            points: rawUpdatedActivity.points || 0,
            status: rawUpdatedActivity.status,
            type: rawUpdatedActivity.type,
            visibility: rawUpdatedActivity.visibility,
            imageUrl: rawUpdatedActivity.imageUrl,
            overview: rawUpdatedActivity.overview,
            numberOfSessions: rawUpdatedActivity.timeSlots?.filter((slot: { isActive: boolean; }) => slot.isActive).length || 0,
            registeredParticipantsCount: rawUpdatedActivity.participants?.length || 0,
            organizer: rawUpdatedActivity.responsiblePerson?.name || rawUpdatedActivity.participants?.find((p: { role: string; }) => p.role === 'Trưởng Nhóm')?.name || rawUpdatedActivity.participants?.[0]?.name || 'N/A',
            participants: rawUpdatedActivity.participants || [],
            locationData: rawUpdatedActivity.locationData,
            multiTimeLocations: rawUpdatedActivity.multiTimeLocations?.map((mtl: any) => {
              // Lấy radius từ mtl (giá trị thực tế từ database)
              const actualRadius = mtl.radius !== undefined && mtl.radius !== null ? mtl.radius : undefined;
              return {
                ...mtl, 
                lat: mtl.location?.lat ?? 0, 
                lng: mtl.location?.lng ?? 0, 
                address: mtl.location?.address ?? '', 
                radius: actualRadius
              };
            }) || [],
            detailedLocation: rawUpdatedActivity.detailedLocation,
            isMultiTimeLocation: isMultiTimeMode,
          };
          setActivity(updatedActivityDetails);
          
          // Update registration, approval status and attendance status
          const userParticipant = rawUpdatedActivity.participants.find(
            (p: any) => {
              const participantUserId = typeof p.userId === 'object' && p.userId !== null
                ? (p.userId._id || p.userId.$oid || String(p.userId))
                : (p.userId?.$oid || p.userId || String(p.userId));
              return participantUserId === user._id;
            }
          );
          
          if (userParticipant) {
            setIsRegistered(true);
            setApprovalStatus(userParticipant.approvalStatus || 'pending');
            setCheckedIn(userParticipant.checkedIn || false);
            
            // Load attendance records if user is approved
            if (userParticipant.approvalStatus === 'approved') {
              await loadAttendanceRecords();
            } else {
              setAttendanceRecords([]);
            }
          } else {
            setIsRegistered(false);
            setApprovalStatus(undefined);
            setCheckedIn(false);
            setAttendanceRecords([]);
          }
          
          setLocationPickerKey(prev => prev + 1);

          // Nếu chỉ có 1 địa điểm, tự động chọn và hiển thị
          if (isMultiTimeMode && updatedActivityDetails.multiTimeLocations && updatedActivityDetails.multiTimeLocations.length === 1) {
            setSelectedTimeSlot(updatedActivityDetails.multiTimeLocations[0].timeSlot);
          }
        }
      }

    } catch (err: unknown) {
      console.error(`Error ${isRegistered ? 'unregistering' : 'registering'}:`, err);
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setIsRegistering(false);
    }
  };

  // Helper function to parse time string (HH:MM) to Date
  // const parseTimeToDate = (timeString: string, baseDate: Date): Date => {
  //   const [hours, minutes] = timeString.split(':').map(Number);
  //   const date = new Date(baseDate);
  //   date.setHours(hours, minutes, 0, 0);
  //   return date;
  // };

  // Helper function to check if current time is within check-in window
  // const checkTimeSlotAvailability = (): { isValid: boolean; message: string; currentSlot: any } => {
  //   if (!activity || !activity.timeSlots || activity.timeSlots.length === 0) {
  //     return {
  //       isValid: false,
  //       message: 'Hoạt động không có thông tin thời gian',
  //       currentSlot: null
  //     };
  //   }

  //   const now = new Date();
  //   const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
  //   // Parse activity date
  //   let activityDate: Date;
  //   try {
  //     // Try to parse the date string (format: DD/MM/YYYY)
  //     const dateParts = activity.date.split('/');
  //     if (dateParts.length === 3) {
  //       activityDate = new Date(parseInt(dateParts[2]), parseInt(dateParts[1]) - 1, parseInt(dateParts[0]));
  //     } else {
  //       // Try ISO format
  //       activityDate = new Date(activity.date);
  //     }
      
  //     if (isNaN(activityDate.getTime())) {
  //       return {
  //         isValid: false,
  //         message: 'Ngày hoạt động không hợp lệ',
  //         currentSlot: null
  //       };
  //     }
  //   } catch (e) {
  //     return {
  //       isValid: false,
  //       message: 'Không thể xác định ngày hoạt động',
  //       currentSlot: null
  //     };
  //   }

  //   const activityDateOnly = new Date(activityDate.getFullYear(), activityDate.getMonth(), activityDate.getDate());
  //   const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  //   // Check if today is the activity date
  //   if (activityDateOnly.getTime() !== todayOnly.getTime()) {
  //     const daysDiff = Math.floor((activityDateOnly.getTime() - todayOnly.getTime()) / (1000 * 60 * 60 * 24));
  //     if (daysDiff > 0) {
  //       return {
  //         isValid: false,
  //         message: `Hoạt động sẽ diễn ra vào ngày ${activity.date}. Bạn chỉ có thể điểm danh vào ngày đó.`,
  //         currentSlot: null
  //       };
  //     } else {
  //       return {
  //         isValid: false,
  //         message: `Hoạt động đã diễn ra vào ngày ${activity.date}.`,
  //         currentSlot: null
  //       };
  //     }
  //   }

  //   // Check each active time slot
  //   const activeSlots = activity.timeSlots.filter(slot => slot.isActive);
  //   if (activeSlots.length === 0) {
  //     return {
  //       isValid: false,
  //       message: 'Không có buổi nào được kích hoạt cho hoạt động này',
  //       currentSlot: null
  //     };
  //   }

  //   // Check-in window: 30 minutes before start time to 30 minutes after end time
  //   const CHECK_IN_BUFFER_MINUTES = 30;

  //   for (const slot of activeSlots) {
  //     const startTime = parseTimeToDate(slot.startTime, today);
  //     const endTime = parseTimeToDate(slot.endTime, today);
      
  //     // Calculate check-in window
  //     const checkInStart = new Date(startTime.getTime() - CHECK_IN_BUFFER_MINUTES * 60 * 1000);
  //     const checkInEnd = new Date(endTime.getTime() + CHECK_IN_BUFFER_MINUTES * 60 * 1000);

  //     // Check if current time is within check-in window
  //     if (now >= checkInStart && now <= checkInEnd) {
  //       // Additional check: if checking in, must be before end time + buffer
  //       // If checking out, can be anytime after check-in
  //       if (!checkedIn) {
  //         // Checking in: must be between check-in start and end time + buffer
  //         if (now < startTime) {
  //           // Before start time (within buffer)
  //           return {
  //             isValid: true,
  //             message: `Bạn có thể điểm danh đầu buổi ${slot.name} (${slot.startTime} - ${slot.endTime})`,
  //             currentSlot: slot
  //           };
  //         } else if (now >= startTime && now <= endTime) {
  //           // During the slot
  //           return {
  //             isValid: true,
  //             message: `Bạn đang trong thời gian buổi ${slot.name} (${slot.startTime} - ${slot.endTime})`,
  //             currentSlot: slot
  //           };
  //         } else if (now > endTime && now <= checkInEnd) {
  //           // After end time but within buffer (late check-in)
  //           return {
  //             isValid: true,
  //             message: `Bạn có thể điểm danh cuối buổi ${slot.name} (${slot.startTime} - ${slot.endTime})`,
  //             currentSlot: slot
  //           };
  //         }
  //       } else {
  //         // Checking out: can be done anytime after check-in
  //         return {
  //           isValid: true,
  //           message: `Bạn có thể hủy điểm danh`,
  //           currentSlot: slot
  //         };
  //       }
  //     }
  //   }

  //   // If we get here, current time is not within any check-in window
  //   const nextSlot = activeSlots.find(slot => {
  //     const startTime = parseTimeToDate(slot.startTime, today);
  //     const checkInStart = new Date(startTime.getTime() - CHECK_IN_BUFFER_MINUTES * 60 * 1000);
  //     return now < checkInStart;
  //   });

  //   if (nextSlot) {
  //     const startTime = parseTimeToDate(nextSlot.startTime, today);
  //     const checkInStart = new Date(startTime.getTime() - CHECK_IN_BUFFER_MINUTES * 60 * 1000);
  //     const timeUntilCheckIn = Math.floor((checkInStart.getTime() - now.getTime()) / (1000 * 60));
  //     const hours = Math.floor(timeUntilCheckIn / 60);
  //     const minutes = timeUntilCheckIn % 60;
      
  //     return {
  //       isValid: false,
  //       message: `Chưa đến thời gian điểm danh. Buổi ${nextSlot.name} (${nextSlot.startTime} - ${nextSlot.endTime}) sẽ mở điểm danh sau ${hours > 0 ? `${hours} giờ ` : ''}${minutes} phút.`,
  //       currentSlot: null
  //     };
  //   }

  //   // All slots have passed
  //   const lastSlot = activeSlots[activeSlots.length - 1];
  //   const endTime = parseTimeToDate(lastSlot.endTime, today);
  //   const checkInEnd = new Date(endTime.getTime() + CHECK_IN_BUFFER_MINUTES * 60 * 1000);
    
  //   if (now > checkInEnd) {
  //     return {
  //       isValid: false,
  //       message: `Thời gian điểm danh đã kết thúc. Tất cả các buổi đã kết thúc.`,
  //       currentSlot: null
  //     };
  //   }

  //   return {
  //     isValid: false,
  //     message: 'Không thể xác định thời gian điểm danh',
  //     currentSlot: null
  //   };
  // };

  const handleCheckIn = () => {
    // Navigate to attendance page instead of checking in directly
    router.push(`/student/attendance/${activityId}`);
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50 text-gray-900'}`}>
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-purple-500 mx-auto mb-6"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 bg-purple-500/20 rounded-full"></div>
            </div>
          </div>
          <p className="text-xl font-semibold">Đang tải chi tiết hoạt động...</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Vui lòng đợi trong giây lát</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50 text-gray-900'}`}>
        <div className="text-center p-8 rounded-3xl shadow-2xl max-w-md mx-4 bg-red-50 dark:bg-red-900/30 border-2 border-red-200 dark:border-red-800">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-xl font-bold mb-2 text-red-800 dark:text-red-300">Đã xảy ra lỗi</p>
          <p className="text-sm mb-6 text-red-700 dark:text-red-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-all duration-300 hover:scale-105 shadow-lg"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50 text-gray-900'}`}>
        <div className="text-center p-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-xl font-semibold">Không tìm thấy hoạt động</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Vui lòng kiểm tra lại đường dẫn</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col ${isDarkMode ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'}`}>
      <StudentNav key="student-nav" />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full">
        {/* Hero Section with Image */}
        <div className={`mb-8 rounded-3xl overflow-hidden shadow-2xl ${isDarkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700' : 'bg-white border border-gray-200'}`}>
          {activity.imageUrl && (
            <div className="relative h-96 sm:h-[500px] overflow-hidden">
              <img
                src={activity.imageUrl}
                alt={activity.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
              <div className="absolute bottom-0 left-0 right-0 p-8">
                <h1 className={`text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-3 drop-shadow-lg`}>
                  {activity.name}
                </h1>
                {activity.overview && (
                  <p className={`text-lg sm:text-xl text-white/90 max-w-3xl drop-shadow-md`}>
                    {activity.overview}
                  </p>
                )}
              </div>
            </div>
          )}
          {!activity.imageUrl && (
            <div className="p-8 sm:p-12">
              <h1 className={`text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {activity.name}
              </h1>
              {activity.overview && (
                <p className={`text-lg sm:text-xl ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} max-w-3xl`}>
                  {activity.overview}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Main Info Cards Grid */}
        <div className={`mb-6 p-5 sm:p-6 rounded-2xl ${isDarkMode ? 'bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl border border-gray-700/50' : 'bg-white/90 backdrop-blur-xl border border-gray-200/50'} shadow-xl`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Ngày diễn ra */}
            <div key="date-card" className={`p-4 rounded-xl transition-all duration-300 hover:scale-[1.02] ${isDarkMode ? 'bg-gradient-to-br from-purple-900/30 to-purple-800/20 border border-purple-700/50' : 'bg-gradient-to-br from-purple-50 to-purple-100/50 border border-purple-200'}`}>
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDarkMode ? 'bg-purple-500/20' : 'bg-purple-100'}`}>
                  <span className="text-xl">🗓️</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium ${isDarkMode ? 'text-purple-300' : 'text-purple-700'} mb-1`}>Ngày diễn ra</p>
                  <p className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} truncate`}>{activity.date}</p>
                </div>
              </div>
            </div>

            {/* Thời gian - Chi tiết hơn */}
            <div key="time-card" className={`p-4 rounded-xl transition-all duration-300 hover:scale-[1.02] ${isDarkMode ? 'bg-gradient-to-br from-green-900/30 to-green-800/20 border border-green-700/50' : 'bg-gradient-to-br from-green-50 to-green-100/50 border border-green-200'}`}>
              <div className="flex items-start space-x-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDarkMode ? 'bg-green-500/20' : 'bg-green-100'}`}>
                  <span className="text-xl">⏱️</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium ${isDarkMode ? 'text-green-300' : 'text-green-700'} mb-2`}>Thời gian</p>
                  <div className="space-y-1.5">
                    {activity.timeSlots.filter(slot => slot.isActive).length > 0 ? (
                      activity.timeSlots.filter(slot => slot.isActive).map((slot, idx) => {
                        const slotIcon = slot.name === 'Buổi Sáng' ? '🌅' : slot.name === 'Buổi Chiều' ? '☀️' : '🌙';
                        const slotColor = slot.name === 'Buổi Sáng' ? (isDarkMode ? 'text-yellow-300' : 'text-yellow-600') :
                                         slot.name === 'Buổi Chiều' ? (isDarkMode ? 'text-orange-300' : 'text-orange-600') :
                                         (isDarkMode ? 'text-blue-300' : 'text-blue-600');
                        return (
                          <div key={idx} className="flex items-center space-x-2">
                            <span className="text-xs">{slotIcon}</span>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-semibold ${slotColor}`}>{slot.name}</p>
                              <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                {slot.startTime} - {slot.endTime}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>N/A</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Địa điểm - Single Location - Chi tiết hơn */}
            {!activity.isMultiTimeLocation && (
              <div key="single-location-card" className={`p-4 rounded-xl transition-all duration-300 hover:scale-[1.02] ${isDarkMode ? 'bg-gradient-to-br from-blue-900/30 to-blue-800/20 border border-blue-700/50' : 'bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200'}`}>
                <div className="flex items-start space-x-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
                    <span className="text-xl">🗺️</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-700'} mb-2`}>Địa điểm</p>
                    <div className="space-y-1.5">
                      <p className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} truncate`}>{activity.location}</p>
                      {activity.locationData?.address && (
                        <div className="flex items-start space-x-1.5">
                          <span className="text-xs mt-0.5">📍</span>
                          <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            {activity.locationData.address}
                          </p>
                        </div>
                      )}
                      {activity.detailedLocation && (
                        <div className="flex items-start space-x-1.5">
                          <span className="text-xs mt-0.5">📌</span>
                          <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {activity.detailedLocation}
                          </p>
                        </div>
                      )}
                      {activity.locationData?.radius && (
                        <div className="flex items-center space-x-1.5">
                          <span className="text-xs">📏</span>
                          <p className={`text-xs font-medium ${isDarkMode ? 'text-green-300' : 'text-green-600'}`}>
                            Bán kính: {activity.locationData.radius}m
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Số buổi */}
            {activity.numberOfSessions !== undefined && activity.numberOfSessions > 0 && (
              <div key="number-of-sessions-card" className={`p-4 rounded-xl transition-all duration-300 hover:scale-[1.02] ${isDarkMode ? 'bg-gradient-to-br from-yellow-900/30 to-yellow-800/20 border border-yellow-700/50' : 'bg-gradient-to-br from-yellow-50 to-yellow-100/50 border border-yellow-200'}`}>
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDarkMode ? 'bg-yellow-500/20' : 'bg-yellow-100'}`}>
                    <span className="text-xl">📖</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium ${isDarkMode ? 'text-yellow-300' : 'text-yellow-700'} mb-1`}>Số buổi</p>
                    <p className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{activity.numberOfSessions}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Đã đăng ký */}
            {activity.registeredParticipantsCount !== undefined && (
              <div key="registered-count-card" className={`p-4 rounded-xl transition-all duration-300 hover:scale-[1.02] ${isDarkMode ? 'bg-gradient-to-br from-orange-900/30 to-orange-800/20 border border-orange-700/50' : 'bg-gradient-to-br from-orange-50 to-orange-100/50 border border-orange-200'}`}>
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDarkMode ? 'bg-orange-500/20' : 'bg-orange-100'}`}>
                    <span className="text-xl">👥</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium ${isDarkMode ? 'text-orange-300' : 'text-orange-700'} mb-1`}>Đã đăng ký</p>
                    <p className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{activity.registeredParticipantsCount} người</p>
                  </div>
                </div>
              </div>
            )}

            {/* Trưởng nhóm */}
            {activity.organizer && (
              <div key="organizer-card" className={`p-4 rounded-xl transition-all duration-300 hover:scale-[1.02] ${isDarkMode ? 'bg-gradient-to-br from-indigo-900/30 to-indigo-800/20 border border-indigo-700/50' : 'bg-gradient-to-br from-indigo-50 to-indigo-100/50 border border-indigo-200'}`}>
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDarkMode ? 'bg-indigo-500/20' : 'bg-indigo-100'}`}>
                    <span className="text-xl">👨‍💼</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium ${isDarkMode ? 'text-indigo-300' : 'text-indigo-700'} mb-1`}>Trưởng nhóm</p>
                    <p className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} truncate`}>{activity.organizer}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Trạng thái điểm danh - Chỉ hiển thị khi đã đăng ký và được duyệt */}
            {isRegistered && approvalStatus === 'approved' && (() => {
              const timeStatus = getActivityTimeStatus();
              
              // Nếu chưa đến ngày hoặc đã qua ngày, hiển thị trạng thái đặc biệt
              if (timeStatus === 'before') {
                return (
                  <div key="attendance-status-card" className={`p-4 rounded-xl transition-all duration-300 hover:scale-[1.02] ${
                    isDarkMode ? 'bg-gradient-to-br from-amber-900/30 to-amber-800/20 border border-amber-700/50' : 'bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200'
                  }`}>
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isDarkMode ? 'bg-amber-500/20' : 'bg-amber-100'
                      }`}>
                        <span className="text-xl">⏰</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium mb-1 ${
                          isDarkMode ? 'text-amber-300' : 'text-amber-700'
                        }`}>Trạng thái điểm danh</p>
                        <p className={`text-sm font-bold ${
                          isDarkMode ? 'text-amber-300' : 'text-amber-700'
                        }`}>
                          Chưa đến ngày điểm danh
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }

              if (timeStatus === 'after') {
                return (
                  <div key="attendance-status-card" className={`p-4 rounded-xl transition-all duration-300 hover:scale-[1.02] ${
                    isDarkMode ? 'bg-gradient-to-br from-gray-900/30 to-gray-800/20 border border-gray-700/50' : 'bg-gradient-to-br from-gray-50 to-gray-100/50 border border-gray-300'
                  }`}>
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isDarkMode ? 'bg-gray-500/20' : 'bg-gray-100'
                      }`}>
                        <span className="text-xl">🏁</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium mb-1 ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>Trạng thái</p>
                        <p className={`text-sm font-bold ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          Hoạt động đã kết thúc
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }

              // Đang trong thời gian hoạt động - hiển thị thông tin điểm danh
              // Tính số buổi đã hoàn thành (cả đầu và cuối buổi đều được approved)
              const totalSlots = activity?.timeSlots?.filter(slot => slot.isActive).length || 0;
              let completedSlots = 0;

              if (activity && activity.timeSlots) {
                activity.timeSlots.filter(slot => slot.isActive).forEach((slot) => {
                  const startRecord = (attendanceRecords || []).find(
                    (r) => r.timeSlot === slot.name && r.checkInType === 'start' && r.status === 'approved'
                  );
                  const endRecord = (attendanceRecords || []).find(
                    (r) => r.timeSlot === slot.name && r.checkInType === 'end' && r.status === 'approved'
                  );

                  // Nếu cả đầu và cuối buổi đều được approved thì tính là hoàn thành
                  if (startRecord && endRecord) {
                    completedSlots++;
                  }
                });
              }

              const isCompleted = completedSlots === totalSlots && totalSlots > 0;
              const hasAnyAttendance = (attendanceRecords || []).length > 0;

              return (
                <div key="attendance-status-card" className={`p-4 rounded-xl transition-all duration-300 hover:scale-[1.02] ${
                  isCompleted
                    ? isDarkMode ? 'bg-gradient-to-br from-green-900/30 to-green-800/20 border border-green-700/50' : 'bg-gradient-to-br from-green-50 to-green-100/50 border border-green-200'
                    : hasAnyAttendance
                    ? isDarkMode ? 'bg-gradient-to-br from-blue-900/30 to-blue-800/20 border border-blue-700/50' : 'bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200'
                    : isDarkMode ? 'bg-gradient-to-br from-gray-900/30 to-gray-800/20 border border-gray-700/50' : 'bg-gradient-to-br from-gray-50 to-gray-100/50 border border-gray-200'
                }`}>
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isCompleted
                        ? isDarkMode ? 'bg-green-500/20' : 'bg-green-100'
                        : hasAnyAttendance
                        ? isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'
                        : isDarkMode ? 'bg-gray-500/20' : 'bg-gray-100'
                    }`}>
                      <span className="text-xl">
                        {isCompleted ? '✅' : hasAnyAttendance ? '📊' : '⏸️'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium mb-1 ${
                        isCompleted
                          ? isDarkMode ? 'text-green-300' : 'text-green-700'
                          : hasAnyAttendance
                          ? isDarkMode ? 'text-blue-300' : 'text-blue-700'
                          : isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>Trạng thái điểm danh</p>
                      <p className={`text-sm font-bold ${
                        isCompleted
                          ? isDarkMode ? 'text-green-300' : 'text-green-700'
                          : hasAnyAttendance
                          ? isDarkMode ? 'text-blue-300' : 'text-blue-700'
                          : isDarkMode ? 'text-gray-300' : 'text-gray-600'
                      }`}>
                        {isCompleted
                          ? 'Đã hoàn thành'
                          : totalSlots === 1
                          ? 'Chưa hoàn thành'
                          : totalSlots > 1
                          ? `Đã đi ${completedSlots}/${totalSlots} buổi`
                          : 'Chưa điểm danh'}
                      </p>
                      {!isCompleted && totalSlots > 1 && completedSlots > 0 && (
                        <p className={`text-xs mt-0.5 ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          Cần hoàn thành thêm {totalSlots - completedSlots} buổi
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Combined Time Slots and Locations Section */}
        {activity.timeSlots && activity.timeSlots.length > 0 && (
          <div className={`mb-6 p-5 sm:p-6 rounded-2xl ${isDarkMode ? 'bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl border border-gray-700/50' : 'bg-white/90 backdrop-blur-xl border border-gray-200/50'} shadow-xl`}>
            <div className="flex flex-col items-center mb-6">
              <div className="text-center">
                <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Lịch trình hoạt động và Địa điểm
                </h2>
                {activity.isMultiTimeLocation && activity.multiTimeLocations && activity.multiTimeLocations.length > 0 && (
                  <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
                    Nhấn vào địa điểm để xem trên bản đồ
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {['Buổi Sáng', 'Buổi Chiều', 'Buổi Tối'].map((slotName) => {
                const slot = activity.timeSlots.find(s => s.name === slotName);
                const isActive = slot?.isActive || false;
                const slotMapName = slotName === 'Buổi Sáng' ? 'morning' : slotName === 'Buổi Chiều' ? 'afternoon' : 'evening';
                
                // Tìm location cho buổi này - hiển thị riêng biệt cho từng buổi
                let location: MultiTimeLocation | null = null;
                if (activity.isMultiTimeLocation && activity.multiTimeLocations && activity.multiTimeLocations.length > 0) {
                  location = activity.multiTimeLocations.find(mtl => mtl.timeSlot === slotMapName) || null;
                }
                
                const isSelected = selectedTimeSlot === slotMapName;
                
                // Icons và màu sắc cho từng buổi
                const getSlotConfig = (name: string) => {
                  switch (name) {
                    case 'Buổi Sáng':
                      return {
                        icon: '🌅',
                        iconBg: isDarkMode ? 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20' : 'bg-gradient-to-br from-yellow-100 to-orange-100',
                        cardBg: isDarkMode ? 'bg-gradient-to-br from-yellow-900/20 to-orange-900/20 border-yellow-700/50' : 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200',
                        headerBg: isDarkMode ? 'bg-gradient-to-r from-yellow-700/30 to-orange-700/30' : 'bg-gradient-to-r from-yellow-100 to-orange-100',
                        textColor: isDarkMode ? 'text-yellow-300' : 'text-yellow-700',
                        selectedBorder: isDarkMode ? 'border-yellow-500 ring-4 ring-yellow-500/20' : 'border-yellow-400 ring-4 ring-yellow-400/20',
                      };
                    case 'Buổi Chiều':
                      return {
                        icon: '☀️',
                        iconBg: isDarkMode ? 'bg-gradient-to-br from-orange-500/20 to-red-500/20' : 'bg-gradient-to-br from-orange-100 to-red-100',
                        cardBg: isDarkMode ? 'bg-gradient-to-br from-orange-900/20 to-red-900/20 border-orange-700/50' : 'bg-gradient-to-br from-orange-50 to-red-50 border-orange-200',
                        headerBg: isDarkMode ? 'bg-gradient-to-r from-orange-700/30 to-red-700/30' : 'bg-gradient-to-r from-orange-100 to-red-100',
                        textColor: isDarkMode ? 'text-orange-300' : 'text-orange-700',
                        selectedBorder: isDarkMode ? 'border-orange-500 ring-4 ring-orange-500/20' : 'border-orange-400 ring-4 ring-orange-400/20',
                      };
                    case 'Buổi Tối':
                      return {
                        icon: '🌙',
                        iconBg: isDarkMode ? 'bg-gradient-to-br from-blue-500/20 to-indigo-500/20' : 'bg-gradient-to-br from-blue-100 to-indigo-100',
                        cardBg: isDarkMode ? 'bg-gradient-to-br from-blue-900/20 to-indigo-900/20 border-blue-700/50' : 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200',
                        headerBg: isDarkMode ? 'bg-gradient-to-r from-blue-700/30 to-indigo-700/30' : 'bg-gradient-to-r from-blue-100 to-indigo-100',
                        textColor: isDarkMode ? 'text-blue-300' : 'text-blue-700',
                        selectedBorder: isDarkMode ? 'border-blue-500 ring-4 ring-blue-500/20' : 'border-blue-400 ring-4 ring-blue-400/20',
                      };
                    default:
                      return {
                        icon: '🕒',
                        iconBg: isDarkMode ? 'bg-gray-500/20' : 'bg-gray-100',
                        cardBg: isDarkMode ? 'bg-gray-900/20 border-gray-700/50' : 'bg-gray-50 border-gray-200',
                        headerBg: isDarkMode ? 'bg-gray-700/30' : 'bg-gray-100',
                        textColor: isDarkMode ? 'text-gray-300' : 'text-gray-700',
                        selectedBorder: isDarkMode ? 'border-gray-500 ring-4 ring-gray-500/20' : 'border-gray-400 ring-4 ring-gray-400/20',
                      };
                  }
                };

                const config = getSlotConfig(slotName);
                const formatTime = (time: string) => {
                  if (!time) return '';
                  const [hours, minutes] = time.split(':');
                  const hour = parseInt(hours, 10);
                  const ampm = hour >= 12 ? 'PM' : 'AM';
                  const hour12 = hour % 12 || 12;
                  return `${hour12}:${minutes} ${ampm}`;
                };

                return (
                  <div
                    key={slotName}
                    className={`rounded-2xl border-2 transition-all duration-300 hover:shadow-xl ${
                      isActive
                        ? `${config.cardBg} shadow-lg ${isSelected ? config.selectedBorder : ''}`
                        : isDarkMode
                        ? 'bg-gray-800/30 border-gray-700/30 opacity-60'
                        : 'bg-gray-100/50 border-gray-300/30 opacity-60'
                    }`}
                  >
                    {/* Header */}
                    <div className={`p-4 rounded-t-2xl border-b-2 ${config.headerBg} ${isDarkMode ? 'border-gray-700/50' : 'border-gray-200/50'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${config.iconBg}`}>
                            <span className="text-2xl">{config.icon}</span>
                          </div>
                          <div>
                            <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              {slotName}
                            </h3>
                            <p className={`text-xs font-medium ${config.textColor}`}>
                              {isActive ? 'Đang hoạt động' : 'Không hoạt động'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-4">
                      {/* Start Time */}
                      <div>
                        <label className={`block text-xs font-medium mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Thời gian bắt đầu
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={slot?.startTime ? formatTime(slot.startTime) : ''}
                            readOnly
                            className={`w-full px-4 py-2.5 rounded-lg border-2 ${
                              isDarkMode
                                ? 'bg-gray-800/50 border-gray-700 text-gray-300'
                                : 'bg-gray-50 border-gray-300 text-gray-900'
                            } focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-not-allowed`}
                            placeholder="--:-- --"
                          />
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <svg
                              className={`w-5 h-5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      {/* End Time */}
                      <div>
                        <label className={`block text-xs font-medium mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Thời gian kết thúc
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={slot?.endTime ? formatTime(slot.endTime) : ''}
                            readOnly
                            className={`w-full px-4 py-2.5 rounded-lg border-2 ${
                              isDarkMode
                                ? 'bg-gray-800/50 border-gray-700 text-gray-300'
                                : 'bg-gray-50 border-gray-300 text-gray-900'
                            } focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-not-allowed`}
                            placeholder="--:-- --"
                          />
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <svg
                              className={`w-5 h-5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      {/* Activity Description */}
                      <div>
                        <label className={`block text-xs font-medium mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Mô tả hoạt động
                        </label>
                        <textarea
                          value={slot?.activities || ''}
                          readOnly
                          rows={3}
                          className={`w-full px-4 py-2.5 rounded-lg border-2 ${
                            isDarkMode
                              ? 'bg-gray-800/50 border-gray-700 text-gray-300'
                              : 'bg-gray-50 border-gray-300 text-gray-900'
                          } focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none cursor-not-allowed`}
                          placeholder="Chưa có mô tả hoạt động"
                        />
                      </div>

                      {/* Location Information */}
                      {activity.isMultiTimeLocation && isActive && location && (
                        <div className="pt-4 border-t-2 border-dashed border-gray-300 dark:border-gray-600">
                          <label className={`block text-xs font-medium mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            Địa điểm
                          </label>
                          <button
                            onClick={() => {
                              if (activity.multiTimeLocations && activity.multiTimeLocations.length === 1) {
                                setSelectedTimeSlot(slotMapName);
                              } else {
                                setSelectedTimeSlot(isSelected ? null : slotMapName);
                              }
                              setTimeout(() => {
                                const mapSection = document.getElementById('map-section');
                                if (mapSection) {
                                  mapSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }
                              }, 100);
                            }}
                            className={`w-full p-3 rounded-lg text-left transition-all duration-300 ${
                              isSelected
                                ? isDarkMode
                                  ? 'bg-blue-600/30 border-2 border-blue-400'
                                  : 'bg-blue-100 border-2 border-blue-400'
                                : isDarkMode
                                ? 'bg-gray-700/30 border border-gray-600/50 hover:bg-gray-700/50'
                                : 'bg-gray-50 border border-gray-300 hover:bg-gray-100'
                            }`}
                          >
                            <div className="flex items-start space-x-2">
                              <span className="text-lg mt-0.5">📍</span>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} truncate`}>
                                  {location.address || 'Không có địa chỉ'}
                                </p>
                                {location.radius && (
                                  <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                    📏 Bán kính: {location.radius}m
                                  </p>
                                )}
                                <p className={`text-xs mt-1 ${isDarkMode ? 'text-blue-300' : 'text-blue-600'} font-medium`}>
                                  {isSelected ? '✓ Đang hiển thị trên bản đồ' : 'Nhấn để xem trên bản đồ'}
                                </p>
                              </div>
                              {isSelected && (
                                <div className={`w-2 h-2 rounded-full ${
                                  config.textColor.includes('yellow') ? (isDarkMode ? 'bg-yellow-400' : 'bg-yellow-600') :
                                  config.textColor.includes('orange') ? (isDarkMode ? 'bg-orange-400' : 'bg-orange-600') :
                                  (isDarkMode ? 'bg-blue-400' : 'bg-blue-600')
                                } animate-pulse`}></div>
                              )}
                            </div>
                          </button>
                        </div>
                      )}

                      {/* Single Location Information (if not multi-time) */}
                      {!activity.isMultiTimeLocation && activity.locationData && slotName === 'Buổi Sáng' && (
                        <div className="pt-4 border-t-2 border-dashed border-gray-300 dark:border-gray-600">
                          <label className={`block text-xs font-medium mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            Địa điểm
                          </label>
                          <div className={`w-full p-3 rounded-lg ${
                            isDarkMode ? 'bg-gray-700/30 border border-gray-600/50' : 'bg-gray-50 border border-gray-300'
                          }`}>
                            <div className="flex items-start space-x-2">
                              <span className="text-lg mt-0.5">📍</span>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {activity.locationData.address || activity.location || 'Không có địa chỉ'}
                                </p>
                                {activity.locationData.radius && (
                                  <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                    📏 Bán kính: {activity.locationData.radius}m
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedTimeSlot && activity.isMultiTimeLocation && activity.multiTimeLocations && activity.multiTimeLocations.length > 1 && (
              <div className={`mt-4 p-4 rounded-xl ${isDarkMode ? 'bg-blue-900/20 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'}`}>
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className={`text-sm font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                    Đang hiển thị địa điểm cho {selectedTimeSlot === 'morning' ? 'Buổi Sáng' : selectedTimeSlot === 'afternoon' ? 'Buổi Chiều' : 'Buổi Tối'} trên bản đồ
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Legacy Locations Section - Only show if multiTimeLocation but no timeSlots */}
        {(!activity.timeSlots || activity.timeSlots.length === 0) && activity.isMultiTimeLocation && activity.multiTimeLocations && activity.multiTimeLocations.length > 0 && (
          <div className={`mb-6 p-5 sm:p-6 rounded-2xl ${isDarkMode ? 'bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl border border-gray-700/50' : 'bg-white/90 backdrop-blur-xl border border-gray-200/50'} shadow-xl`}>
            <div className="flex items-center mb-5">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
                <span className="text-xl">🗺️</span>
              </div>
              <div>
                <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Địa điểm theo từng buổi
                </h2>
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Nhấn vào địa điểm để xem trên bản đồ
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(() => {
                // Nhóm các locations theo địa điểm (so sánh lat, lng)
                const areLocationsSame = (loc1: MultiTimeLocation, loc2: MultiTimeLocation): boolean => {
                  const latDiff = Math.abs(loc1.lat - loc2.lat);
                  const lngDiff = Math.abs(loc1.lng - loc2.lng);
                  return latDiff < 0.0001 && lngDiff < 0.0001; // ~11m
                };

                const locationGroups = new Map<string, MultiTimeLocation[]>();
                const processedIds = new Set<string>();

                if (!activity.multiTimeLocations) return [];

                activity.multiTimeLocations.forEach((mtl) => {
                if (processedIds.has(mtl.id)) return;

                // Tìm nhóm có cùng địa điểm
                let foundGroup = false;
                for (const [key, group] of locationGroups.entries()) {
                  if (group.length > 0 && areLocationsSame(mtl, group[0])) {
                    group.push(mtl);
                    processedIds.add(mtl.id);
                    foundGroup = true;
                    break;
                  }
                }

                // Nếu không tìm thấy nhóm, tạo nhóm mới
                if (!foundGroup) {
                  const groupKey = `${mtl.lat.toFixed(6)},${mtl.lng.toFixed(6)}`;
                  locationGroups.set(groupKey, [mtl]);
                  processedIds.add(mtl.id);
                }
              });

                return Array.from(locationGroups.values()).map((group, groupIdx) => {
                  // Nếu nhóm có nhiều hơn 1 buổi, hiển thị card "Cùng địa điểm"
                  if (group.length > 1) {
                    const firstLocation = group[0];
                    const anySelected = group.some(mtl => selectedTimeSlot === mtl.timeSlot);

                    return (
                      <div key={`group-${groupIdx}`} className={`col-span-full p-4 rounded-xl border-2 transition-all duration-300 ${
                      anySelected 
                        ? isDarkMode 
                          ? 'bg-gradient-to-br from-purple-900/50 to-purple-800/30 border-purple-500 shadow-xl' 
                          : 'bg-gradient-to-br from-purple-50 to-purple-100 border-purple-400 shadow-xl'
                        : isDarkMode
                          ? 'bg-gradient-to-br from-gray-700/50 to-gray-800/30 border-gray-600/50'
                          : 'bg-gradient-to-br from-gray-50 to-gray-100/50 border-gray-300'
                    }`}>
                      <div className="flex items-start space-x-3 mb-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          isDarkMode ? 'bg-purple-500/20' : 'bg-purple-100'
                        }`}>
                          <span className="text-xl">📍</span>
                        </div>
                        <div className="flex-1">
                          <h3 className={`font-bold text-base mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            Hoạt động cùng 1 địa điểm
                          </h3>
                          <p className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                            {firstLocation.address || 'Không có địa chỉ'}
                          </p>
                          {firstLocation.radius && (
                            <div className="flex items-center space-x-2 mb-3">
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                isDarkMode 
                                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                  : 'bg-purple-100 text-purple-700 border border-purple-200'
                              }`}>
                                📏 Bán kính: {firstLocation.radius}m
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        {group.map((mtl) => {
                          const timeSlotName = mtl.timeSlot === 'morning' ? 'Buổi Sáng' :
                                              mtl.timeSlot === 'afternoon' ? 'Buổi Chiều' :
                                              mtl.timeSlot === 'evening' ? 'Buổi Tối' : mtl.timeSlot;
                          const timeSlotIcon = mtl.timeSlot === 'morning' ? '🌅' :
                                               mtl.timeSlot === 'afternoon' ? '☀️' :
                                               mtl.timeSlot === 'evening' ? '🌙' : '📍';
                          const isSelected = selectedTimeSlot === mtl.timeSlot;
                          const timeSlot = activity.timeSlots.find(slot => slot.isActive && slotMap[slot.name as keyof typeof slotMap] === mtl.timeSlot);
                          const detailedLocation = timeSlot?.detailedLocation?.[mtl.timeSlot];

                          return (
                            <button
                              key={mtl.id}
                              onClick={() => {
                                setSelectedTimeSlot(isSelected ? null : mtl.timeSlot);
                                setTimeout(() => {
                                  const mapSection = document.getElementById('map-section');
                                  if (mapSection) {
                                    mapSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                  }
                                }, 100);
                              }}
                              className={`w-full p-3 rounded-lg text-left transition-all duration-300 ${
                                isSelected
                                  ? isDarkMode
                                    ? 'bg-purple-500/30 border-2 border-purple-400'
                                    : 'bg-purple-100 border-2 border-purple-300'
                                  : isDarkMode
                                    ? 'bg-gray-700/30 border border-gray-600/50 hover:bg-gray-700/50'
                                    : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <span className="text-lg">{timeSlotIcon}</span>
                                  <div>
                                    <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                      {timeSlotName}
                                    </p>
                                    {timeSlot && (
                                      <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                        {timeSlot.startTime} - {timeSlot.endTime}
                                      </p>
                                    )}
                                    {detailedLocation && (
                                      <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                        📌 {detailedLocation}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                {isSelected && (
                                  <div className={`w-2 h-2 rounded-full ${
                                    isDarkMode ? 'bg-purple-400' : 'bg-purple-600'
                                  } animate-pulse`}></div>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                }

                // Nếu chỉ có 1 buổi, hiển thị như card bình thường
                const mtl = group[0];
                const timeSlotName = mtl.timeSlot === 'morning' ? 'Buổi Sáng' :
                                    mtl.timeSlot === 'afternoon' ? 'Buổi Chiều' :
                                    mtl.timeSlot === 'evening' ? 'Buổi Tối' : mtl.timeSlot;
                const timeSlotIcon = mtl.timeSlot === 'morning' ? '🌅' :
                                     mtl.timeSlot === 'afternoon' ? '☀️' :
                                     mtl.timeSlot === 'evening' ? '🌙' : '📍';
                const isSelected = selectedTimeSlot === mtl.timeSlot;
                const detailedLocation = activity.timeSlots.find(slot => slot.isActive && slotMap[slot.name as keyof typeof slotMap] === mtl.timeSlot)?.detailedLocation?.[mtl.timeSlot];

                // Dynamic color classes based on time slot
                const getCardClasses = () => {
                  if (isSelected) {
                    if (mtl.timeSlot === 'morning') {
                      return isDarkMode 
                        ? 'bg-gradient-to-br from-purple-900/50 to-purple-800/30 border-2 border-purple-500 shadow-xl ring-4 ring-purple-500/20'
                        : 'bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-400 shadow-xl ring-4 ring-purple-400/20';
                    } else if (mtl.timeSlot === 'afternoon') {
                      return isDarkMode 
                        ? 'bg-gradient-to-br from-orange-900/50 to-orange-800/30 border-2 border-orange-500 shadow-xl ring-4 ring-orange-500/20'
                        : 'bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-400 shadow-xl ring-4 ring-orange-400/20';
                    } else {
                      return isDarkMode 
                        ? 'bg-gradient-to-br from-indigo-900/50 to-indigo-800/30 border-2 border-indigo-500 shadow-xl ring-4 ring-indigo-500/20'
                        : 'bg-gradient-to-br from-indigo-50 to-indigo-100 border-2 border-indigo-400 shadow-xl ring-4 ring-indigo-400/20';
                    }
                  } else {
                    if (mtl.timeSlot === 'morning') {
                      return isDarkMode 
                        ? 'bg-gradient-to-br from-purple-900/20 to-purple-800/10 border border-purple-700/50 hover:border-purple-500/50 hover:shadow-lg'
                        : 'bg-gradient-to-br from-purple-50/50 to-purple-100/50 border border-purple-200 hover:border-purple-300 hover:shadow-lg';
                    } else if (mtl.timeSlot === 'afternoon') {
                      return isDarkMode 
                        ? 'bg-gradient-to-br from-orange-900/20 to-orange-800/10 border border-orange-700/50 hover:border-orange-500/50 hover:shadow-lg'
                        : 'bg-gradient-to-br from-orange-50/50 to-orange-100/50 border border-orange-200 hover:border-orange-300 hover:shadow-lg';
                    } else {
                      return isDarkMode 
                        ? 'bg-gradient-to-br from-indigo-900/20 to-indigo-800/10 border border-indigo-700/50 hover:border-indigo-500/50 hover:shadow-lg'
                        : 'bg-gradient-to-br from-indigo-50/50 to-indigo-100/50 border border-indigo-200 hover:border-indigo-300 hover:shadow-lg';
                    }
                  }
                };

                const getIconBgClasses = () => {
                  if (isSelected) {
                    if (mtl.timeSlot === 'morning') {
                      return isDarkMode ? 'bg-purple-500/30' : 'bg-purple-200';
                    } else if (mtl.timeSlot === 'afternoon') {
                      return isDarkMode ? 'bg-orange-500/30' : 'bg-orange-200';
                    } else {
                      return isDarkMode ? 'bg-indigo-500/30' : 'bg-indigo-200';
                    }
                  } else {
                    if (mtl.timeSlot === 'morning') {
                      return isDarkMode ? 'bg-purple-500/20' : 'bg-purple-100';
                    } else if (mtl.timeSlot === 'afternoon') {
                      return isDarkMode ? 'bg-orange-500/20' : 'bg-orange-100';
                    } else {
                      return isDarkMode ? 'bg-indigo-500/20' : 'bg-indigo-100';
                    }
                  }
                };

                const getBadgeClasses = () => {
                  if (mtl.timeSlot === 'morning') {
                    return isDarkMode 
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : 'bg-purple-100 text-purple-700 border border-purple-200';
                  } else if (mtl.timeSlot === 'afternoon') {
                    return isDarkMode 
                      ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                      : 'bg-orange-100 text-orange-700 border border-orange-200';
                  } else {
                    return isDarkMode 
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      : 'bg-indigo-100 text-indigo-700 border border-indigo-200';
                  }
                };

                const getIndicatorColor = () => {
                  if (mtl.timeSlot === 'morning') {
                    return isDarkMode ? 'bg-purple-400' : 'bg-purple-600';
                  } else if (mtl.timeSlot === 'afternoon') {
                    return isDarkMode ? 'bg-orange-400' : 'bg-orange-600';
                  } else {
                    return isDarkMode ? 'bg-indigo-400' : 'bg-indigo-600';
                  }
                };

                return (
                  <button
                    key={mtl.id}
                    onClick={() => {
                      // Nếu chỉ có 1 địa điểm, luôn hiển thị (không toggle)
                      if (activity.multiTimeLocations && activity.multiTimeLocations.length === 1) {
                        setSelectedTimeSlot(mtl.timeSlot);
                      } else {
                        setSelectedTimeSlot(isSelected ? null : mtl.timeSlot);
                      }
                      // Scroll to map section
                      setTimeout(() => {
                        const mapSection = document.getElementById('map-section');
                        if (mapSection) {
                          mapSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                      }, 100);
                    }}
                    className={`p-5 rounded-2xl transition-all duration-300 text-left hover:scale-105 ${getCardClasses()}`}
                  >
                    <div className="flex items-start space-x-4">
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${getIconBgClasses()}`}>
                        <span className="text-2xl">{timeSlotIcon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className={`font-bold text-base ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {timeSlotName}
                          </h3>
                          {isSelected && (
                            <div className={`w-2 h-2 rounded-full ${getIndicatorColor()} animate-pulse`}></div>
                          )}
                        </div>
                        <p className={`text-sm font-semibold mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {mtl.address || 'Không có địa chỉ'}
                        </p>
                        {(() => {
                          const timeSlot = activity.timeSlots.find(slot => slot.isActive && slotMap[slot.name as keyof typeof slotMap] === mtl.timeSlot);
                          return timeSlot && (
                            <p className={`text-xs mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              ⏰ {timeSlot.startTime} - {timeSlot.endTime}
                            </p>
                          );
                        })()}
                        {detailedLocation && (
                          <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            📍 {detailedLocation}
                          </p>
                        )}
                        {mtl.radius && (
                          <div className="mt-2 flex items-center space-x-2">
                            <span className={`text-xs px-2 py-1 rounded-full ${getBadgeClasses()}`}>
                              📏 Bán kính: {mtl.radius}m
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                  );
                });
              })()}
            </div>
            
            {selectedTimeSlot && (
              <div className={`mt-4 p-4 rounded-xl ${isDarkMode ? 'bg-blue-900/20 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'}`}>
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className={`text-sm font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                    Đang hiển thị địa điểm cho {selectedTimeSlot === 'morning' ? 'Buổi Sáng' : selectedTimeSlot === 'afternoon' ? 'Buổi Chiều' : 'Buổi Tối'} trên bản đồ
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Description Section */}
        <div className={`mb-6 p-5 sm:p-6 rounded-2xl ${isDarkMode ? 'bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl border border-gray-700/50' : 'bg-white/90 backdrop-blur-xl border border-gray-200/50'} shadow-xl`}>
          <div className="flex items-center mb-6">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mr-4 ${isDarkMode ? 'bg-cyan-500/20' : 'bg-cyan-100'}`}>
              <span className="text-2xl">📝</span>
            </div>
            <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Mô tả chi tiết</h2>
          </div>
          <div className={`prose prose-lg max-w-none ${isDarkMode ? 'prose-invert' : ''}`}>
            <p className={`text-base leading-relaxed whitespace-pre-wrap ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              {activity.description}
            </p>
          </div>
        </div>

        {/* Participants Section */}
        {activity.participants && activity.participants.length > 0 && (
          <div className={`mb-6 p-5 sm:p-6 rounded-2xl ${isDarkMode ? 'bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl border border-gray-700/50' : 'bg-white/90 backdrop-blur-xl border border-gray-200/50'} shadow-xl`}>
            <div className="flex items-center mb-6">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mr-4 ${isDarkMode ? 'bg-emerald-500/20' : 'bg-emerald-100'}`}>
                <span className="text-2xl">👥</span>
              </div>
              <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Danh sách người đăng ký ({activity.participants.length})
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {activity.participants.map((participant, index) => (
                <div
                  key={participant._id || participant.userId || `participant-${index}`}
                  className={`p-4 rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-lg ${isDarkMode ? 'bg-gray-700/50 border border-gray-600/50' : 'bg-gray-50 border border-gray-200'}`}
                >
                  <div className="flex items-center space-x-3">
                    <img
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(participant.name)}&background=random&color=fff`}
                      alt={participant.name}
                      className="w-12 h-12 rounded-full ring-2 ring-purple-200 dark:ring-purple-800"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{participant.name}</p>
                      <p className={`text-xs truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{participant.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Map Section */}
        <div id="map-section" className={`mb-6 p-5 sm:p-6 rounded-2xl ${isDarkMode ? 'bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl border border-gray-700/50' : 'bg-white/90 backdrop-blur-xl border border-gray-200/50'} shadow-xl`}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mr-4 ${isDarkMode ? 'bg-teal-500/20' : 'bg-teal-100'}`}>
                <span className="text-2xl">📍</span>
              </div>
              <div>
                <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Vị trí hoạt động trên bản đồ
                </h2>
                {selectedTimeSlot && activity.isMultiTimeLocation && (
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
                    Đang hiển thị: {selectedTimeSlot === 'morning' ? 'Buổi Sáng' : selectedTimeSlot === 'afternoon' ? 'Buổi Chiều' : 'Buổi Tối'}
                  </p>
                )}
              </div>
            </div>
            {selectedTimeSlot && activity.isMultiTimeLocation && activity.multiTimeLocations && activity.multiTimeLocations.length > 1 && (
              <button
                onClick={() => setSelectedTimeSlot(null)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                  isDarkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                Xem tất cả
              </button>
            )}
          </div>
          {activity.isMultiTimeLocation && (() => {
            // Nếu chỉ có 1 địa điểm, luôn hiển thị địa điểm đó
            if (activity.multiTimeLocations && activity.multiTimeLocations.length === 1) {
              const singleLocation = activity.multiTimeLocations[0];
              return (
                <ReadOnlyMultiTimeLocationViewer
                  key={`single-location-${locationPickerKey}`}
                  initialLocations={[{
                    id: singleLocation.id,
                    timeSlot: singleLocation.timeSlot,
                    location: { 
                      lat: singleLocation.lat ?? 0, 
                      lng: singleLocation.lng ?? 0, 
                      address: singleLocation.address 
                    },
                    radius: singleLocation.radius,
                  }]}
                  isDarkMode={isDarkMode}
                />
              );
            }
            
            // Nếu có nhiều địa điểm và đã chọn một buổi, hiển thị địa điểm được chọn
            if (selectedTimeSlot) {
              const selectedLocation = activity.multiTimeLocations?.find(mtl => mtl.timeSlot === selectedTimeSlot);
              if (selectedLocation) {
                return (
                  <ReadOnlyMultiTimeLocationViewer
                    key={`selected-${selectedTimeSlot}-${locationPickerKey}`}
                    initialLocations={[{
                      id: selectedLocation.id,
                      timeSlot: selectedTimeSlot,
                      location: { 
                        lat: selectedLocation.lat ?? 0, 
                        lng: selectedLocation.lng ?? 0, 
                        address: selectedLocation.address 
                      },
                      radius: selectedLocation.radius,
                    }]}
                    isDarkMode={isDarkMode}
                  />
                );
              }
            }
            
            // Nếu có nhiều địa điểm và chưa chọn, hiển thị tất cả
            return (
              <ReadOnlyMultiTimeLocationViewer
                key={`all-locations-${locationPickerKey}`}
                initialLocations={activity.multiTimeLocations?.map(mtl => ({
                  id: mtl.id,
                  timeSlot: mtl.timeSlot,
                  location: { lat: mtl.lat ?? 0, lng: mtl.lng ?? 0, address: mtl.address },
                  radius: mtl.radius,
                }))}
                isDarkMode={isDarkMode}
              />
            );
          })()}
          {!activity.isMultiTimeLocation && activity.locationData && (
            <OpenStreetMapPicker
              key={`single-location-${locationPickerKey}`}
              initialLocation={activity.locationData ? { 
                ...activity.locationData, 
                lat: activity.locationData.lat ?? 0, 
                lng: activity.locationData.lng ?? 0, 
                radius: (activity.locationData.radius && !isNaN(activity.locationData.radius)) ? activity.locationData.radius : 200 
              } : undefined}
              isDarkMode={isDarkMode}
              onLocationChange={() => {}}
              isReadOnly={true}
            />
          )}
          {!activity.isMultiTimeLocation && !activity.locationData && (
            <div key="no-location-data" className={`text-center py-16 rounded-xl border-2 border-dashed ${isDarkMode ? 'border-gray-600 bg-gray-700/30' : 'border-gray-300 bg-gray-50/50'}`}>
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <p className={`text-lg font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Không có dữ liệu vị trí bản đồ</p>
              <p className={`text-sm mt-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Vui lòng kiểm tra lại thông tin hoạt động</p>
            </div>
          )}
        </div>

        {/* Success/Error Messages */}
        {(successMessage || error) && (
          <div className="mb-6">
            {successMessage && (
              <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-green-500/10 border-green-500/30 text-green-300' : 'bg-green-50 border-green-200 text-green-700'}`}>
                <div className="flex items-center gap-2">
                  <span className="text-lg">✅</span>
                  <p className="text-sm font-medium flex-1">{successMessage}</p>
                  <button
                    onClick={() => setSuccessMessage(null)}
                    className={`w-6 h-6 rounded flex items-center justify-center text-xs transition-all ${
                      isDarkMode ? 'hover:bg-green-500/20' : 'hover:bg-green-100'
                    }`}
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-red-500/10 border-red-500/30 text-red-300' : 'bg-red-50 border-red-200 text-red-700'}`}>
                <div className="flex items-center gap-2">
                  <span className="text-lg">⚠️</span>
                  <p className="text-sm font-medium flex-1">{error}</p>
                  <button
                    onClick={() => setError(null)}
                    className={`w-6 h-6 rounded flex items-center justify-center text-xs transition-all ${
                      isDarkMode ? 'hover:bg-red-500/20' : 'hover:bg-red-100'
                    }`}
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Check-in Button - TEST MODE: Always show if authenticated */}
          {isAuthenticated && user && (
            <div className="flex-1">
              <button
                onClick={handleCheckIn}
                disabled={isCheckingIn}
                className={`w-full py-4 px-6 rounded-2xl text-base font-bold transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-green-500/50 shadow-xl hover:shadow-2xl ${
                  checkedIn
                    ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white hover:from-gray-700 hover:to-gray-800'
                    : 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800'
                } ${isCheckingIn ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
              >
                {isCheckingIn ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Đang xử lý...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    {checkedIn ? (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span>Hủy điểm danh</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Điểm danh</span>
                      </>
                    )}
                  </div>
                )}
              </button>
            </div>
          )}

          {/* Register/Unregister Button */}
          {isAuthenticated && user && (
            <button
              onClick={handleRegisterToggle}
              disabled={isRegistering}
              className={`flex-1 py-4 px-6 rounded-2xl text-base font-bold transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-purple-500/50 shadow-xl hover:shadow-2xl ${
                isRegistered
                  ? 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800'
                  : 'bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800'
              } ${isRegistering ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
            >
              {isRegistering ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {isRegistered ? 'Đang hủy...' : 'Đang đăng ký...'}
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  {isRegistered ? (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span>Hủy đăng ký</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <span>Đăng ký tham gia</span>
                    </>
                  )}
                </div>
              )}
            </button>
          )}
          
          {/* Back Button */}
          <button
            onClick={() => window.history.back()}
            className={`flex-1 py-4 px-6 rounded-2xl text-base font-bold transition-all duration-300 border-2 focus:outline-none focus:ring-4 focus:ring-gray-500/50 shadow-lg hover:shadow-xl hover:scale-105 ${
              isDarkMode 
                ? 'border-gray-600 text-gray-100 hover:bg-gray-700/50' 
                : 'border-gray-300 text-gray-800 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Quay lại</span>
            </div>
          </button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
