'use client';

import { useState, useEffect } from 'react';
import StudentNav from '@/components/student/StudentNav';
import Footer from '@/components/common/Footer';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useRouter } from 'next/navigation'; // Import useRouter

interface StudentStat {
  title: string;
  value: string;
  change: string;
  changeType: 'increase' | 'decrease';
  icon: string;
  color: string;
}

interface AttendanceRecord {
  _id: string;
  timeSlot: string;
  checkInType: string;
  checkInTime: string;
  status: string;
}

interface ActivityItem {
  id: string;
  title: string;
  date: string;
  time: string;
  timeSlots?: Array<{
    name: string;
    startTime: string;
    endTime: string;
    isActive: boolean;
  }>;
  location: string;
  points: number;
  status: string;
  type: string;
  visibility: 'public' | 'private';
  imageUrl?: string;
  overview?: string; // Add overview to the interface
  numberOfSessions?: number; // Add numberOfSessions to the interface
  registeredParticipantsCount?: number; // Add registeredParticipantsCount
  organizer?: string; // Add organizer
  isRegistered?: boolean; // Track if user is registered
  maxParticipants?: number; // Max participants allowed
  approvalStatus?: 'pending' | 'approved' | 'rejected'; // Approval status
}

interface ParticipationItem {
  id: string;
  title: string;
  date: string;
  points: number;
  status: string;
}

interface RawActivity {
  _id: string;
  name: string;
  date: string;
  location: string;
  points?: number;
  status: string;
  type: string;
  visibility: 'public' | 'private';
  timeSlots?: Array<{
    id?: string;
    name: string;
    startTime: string;
    endTime: string;
    isActive: boolean;
    activities?: string;
    detailedLocation?: string;
  }>;
  imageUrl?: string;
  overview?: string; // Add overview to RawActivity
  maxParticipants?: number; // Add maxParticipants
  participants?: Array<{
    userId: { $oid: string } | string;
    name: string;
    email: string;
    role: string;
    joinedAt: { $date: string } | Date | string;
    approvalStatus?: 'pending' | 'approved' | 'rejected';
  }>;
}

interface RawParticipation {
  _id: string;
  activityName: string;
  joinedAt: string;
  points?: number;
  status: string;
}

export default function StudentDashboard() {
  const { user, token, isAuthenticated, refetchUser } = useAuth();
  const { isDarkMode } = useDarkMode();
  const router = useRouter(); // Initialize useRouter

  const [studentStats, setStudentStats] = useState<StudentStat[]>([]);
  const [availableActivities, setAvailableActivities] = useState<ActivityItem[]>([]);
  const [recentParticipations, setRecentParticipations] = useState<ParticipationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [registeringActivities, setRegisteringActivities] = useState<Set<string>>(new Set());
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, AttendanceRecord[]>>({});

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!token) {
          throw new Error("User not authenticated or token not available.");
        }

        // Refetch user data to ensure the latest role and isClubMember status
        const updatedUser = await refetchUser();
        const currentUser = updatedUser || user; // Use updated user or current user from context

        console.log('Frontend - After refetchUser, User:', currentUser);
        console.log('Frontend - After refetchUser, isClubMember:', currentUser?.isClubMember);
        console.log('Frontend - After refetchUser, Role:', currentUser?.role);

        // Fetch student stats
        // The /api/users/stats is for overall user statistics, not individual student stats.
        // We will remove this call and calculate student-specific stats based on other data or default values.
        // const statsResponse = await fetch('/api/users/stats', {
        //   headers: {
        //     Authorization: `Bearer ${token}`,
        //   },
        // });
        // if (!statsResponse.ok) {
        //   throw new Error('Failed to fetch student stats');
        // }
        // const statsData = await statsResponse.json();
        setStudentStats([
          { title: 'Hoạt động đã tham gia', value: '0', change: '+0', changeType: 'increase', icon: '🎯', color: 'bg-purple-500' },
          { title: 'Điểm tích lũy', value: '0.0', change: '+0', changeType: 'increase', icon: '⭐', color: 'bg-yellow-500' },
          { title: 'Hoạt động đang đăng ký', value: '0', change: '+0', changeType: 'increase', icon: '📝', color: 'bg-blue-500' },
          { title: 'Thông báo mới', value: '0', change: '+0', changeType: 'increase', icon: '📢', color: 'bg-red-500' },
        ]);

        // Fetch available activities
        const activitiesResponse = await fetch('/api/activities', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!activitiesResponse.ok) {
          throw new Error('Failed to fetch available activities');
        }
        const responseData = await activitiesResponse.json();
        const activitiesData: RawActivity[] = responseData.data.activities;
        // Filter activities based on user's club membership status and activity visibility
        const filteredActivities = activitiesData.filter((activity: RawActivity) => {
          if (currentUser?.isClubMember) {
            return true; // Club members can see all activities
          } else {
            return activity.visibility === 'public'; // Non-club members only see public activities
          }
        }).map((activity: RawActivity) => {
          // Check if current user is already registered and get approval status
          let isRegistered = false;
          let approvalStatus: 'pending' | 'approved' | 'rejected' | undefined = undefined;
          
          const userParticipant = activity.participants?.find((p: any) => {
            const userId = typeof p.userId === 'object' && p.userId !== null
              ? (p.userId._id || p.userId.$oid || String(p.userId))
              : (p.userId?.$oid || p.userId);
            return userId === currentUser?._id;
          });

          if (userParticipant) {
            isRegistered = true;
            approvalStatus = userParticipant.approvalStatus || 'pending';
          }

          const activeTimeSlots = activity.timeSlots?.filter(slot => slot.isActive) || [];
          
          return {
            id: activity._id,
            title: activity.name,
            date: new Date(activity.date).toLocaleDateString('vi-VN'),
            time: activeTimeSlots.map((slot: any) => `${slot.startTime} - ${slot.endTime}`).join(', ') || 'N/A',
            timeSlots: activeTimeSlots.map((slot: any) => ({
              name: slot.name || 'Buổi',
              startTime: slot.startTime || '',
              endTime: slot.endTime || '',
              isActive: slot.isActive !== undefined ? slot.isActive : true
            })),
            location: activity.location,
            points: activity.points || 0,
            status: activity.status,
            type: activity.type,
            visibility: activity.visibility,
            imageUrl: activity.imageUrl,
            overview: activity.overview,
            numberOfSessions: activeTimeSlots.length,
            registeredParticipantsCount: activity.participants?.length || 0,
            organizer: activity.participants?.find(p => p.role === 'Trưởng Nhóm')?.name || activity.participants?.[0]?.name || 'N/A',
            isRegistered: isRegistered,
            maxParticipants: activity.maxParticipants,
            approvalStatus: approvalStatus,
          };
        });
        setAvailableActivities(filteredActivities);

        // Load attendance records for approved activities
        const attendancePromises = filteredActivities
          .filter(activity => activity.isRegistered && activity.approvalStatus === 'approved')
          .map(async (activity) => {
            try {
              const response = await fetch(`/api/activities/${activity.id}/attendance/student`, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });

              if (response.ok) {
                const data = await response.json();
                if (data.success && data.data && data.data.attendances && Array.isArray(data.data.attendances)) {
                  return { activityId: activity.id, records: data.data.attendances };
                }
              }
            } catch (err) {
              console.error(`Error loading attendance for activity ${activity.id}:`, err);
            }
            return { activityId: activity.id, records: [] };
          });

        const attendanceResults = await Promise.all(attendancePromises);
        const attendanceMap: Record<string, AttendanceRecord[]> = {};
        attendanceResults.forEach(({ activityId, records }) => {
          attendanceMap[activityId] = records;
        });
        setAttendanceRecords(attendanceMap);

        // Fetch recent participations (if user is a club member)
        if (currentUser?.isClubMember) {
          try {
            const participationsResponse = await fetch('/api/memberships/my-status', {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });
            
            if (!participationsResponse.ok) {
              // Check if it's a client error (4xx) vs server error (5xx)
              const errorData = await participationsResponse.json().catch(() => ({}));
              const errorMessage = errorData.error || 'Failed to fetch recent participations';
              
              // If the API explicitly says user is not a club member or no participations, 
              // treat it as expected, not an error
              if (errorMessage.includes('not a club member') || errorMessage.includes('no participations found')) {
                console.log('No participations found for club member - this is expected');
                setRecentParticipations([]);
              } else {
                // For other errors, log as warning
                console.warn("Could not fetch participations for club member:", errorMessage);
                setRecentParticipations([]);
              }
            } else {
              const participationsResponseData = await participationsResponse.json();

              // The API returns a single membership object, not an array of participations.
              // Check if the response has an error message
              if (participationsResponseData.error) {
                const errorMessage = participationsResponseData.error;
                if (errorMessage.includes('not a club member') || errorMessage.includes('no participations found')) {
                  console.log('No participations found - this is expected');
                  setRecentParticipations([]);
                } else {
                  console.warn("API returned error:", errorMessage);
                  setRecentParticipations([]);
                }
                return;
              }

              // The API returns a single membership object, not an array of participations.
              const singleMembership = participationsResponseData.data?.membership;
              
              // If membership is null, user might not have a membership record yet
              if (!singleMembership) {
                console.log('No membership record found - this is expected');
                setRecentParticipations([]);
                return;
              }

              // Membership object doesn't have activityName, so we can't create participation items from it
              // The membership API returns membership status, not activity participations
              // For now, we'll set empty participations since membership != participation
              setRecentParticipations([]);
            }
          } catch (participationError) {
            // Only log unexpected errors as warnings
            const errorMessage = participationError instanceof Error ? participationError.message : String(participationError);
            if (!errorMessage.includes('not a club member') && !errorMessage.includes('no participations found')) {
              console.warn("Could not fetch participations for club member:", participationError);
            }
            setRecentParticipations([]); // Clear participations if fetch failed
          }
        } else {
          // User is not a club member - this is expected, not an error
          setRecentParticipations([]); // Clear participations for non-club members
        }

      } catch (err: unknown) {
        // Filter out expected/benign errors to avoid logging them as errors
        const errorMessage = err instanceof Error ? err.message : String(err);
        const isExpectedError = 
          errorMessage.includes('not a club member') || 
          errorMessage.includes('no participations found') ||
          errorMessage.includes('No participations found');
        
        if (!isExpectedError) {
          console.error("Failed to fetch dashboard data:", err);
          setError(errorMessage);
        } else {
          // Expected error - just log for debugging, don't show to user
          console.log("Expected condition (not an error):", errorMessage);
        }
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      console.log('Frontend - User:', user);
      console.log('Frontend - Token:', token ? 'Token available' : 'No token');
      console.log('Frontend - isAuthenticated:', isAuthenticated);
      fetchData();
    }
  }, [isAuthenticated, token, user?.isClubMember]);

  // Reload attendance records when page becomes visible (user returns from attendance page)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && isAuthenticated && token && availableActivities.length > 0) {
        // Reload attendance records for approved activities
        const attendancePromises = availableActivities
          .filter(activity => activity.isRegistered && activity.approvalStatus === 'approved')
          .map(async (activity) => {
            try {
              const response = await fetch(`/api/activities/${activity.id}/attendance/student`, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });

              if (response.ok) {
                const data = await response.json();
                if (data.success && data.data && data.data.attendances && Array.isArray(data.data.attendances)) {
                  return { activityId: activity.id, records: data.data.attendances };
                }
              }
            } catch (err) {
              console.error(`Error loading attendance for activity ${activity.id}:`, err);
            }
            return { activityId: activity.id, records: attendanceRecords[activity.id] || [] };
          });

        const attendanceResults = await Promise.all(attendancePromises);
        const attendanceMap: Record<string, AttendanceRecord[]> = {};
        attendanceResults.forEach(({ activityId, records }) => {
          attendanceMap[activityId] = records;
        });
        setAttendanceRecords(prev => ({ ...prev, ...attendanceMap }));
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [isAuthenticated, token, availableActivities]);

  // Helper function to check activity time status
  const getActivityTimeStatus = (activity: ActivityItem): 'before' | 'during' | 'after' => {
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

  // Helper function to get overall activity status (time + attendance)
  const getActivityOverallStatus = (activity: ActivityItem): {
    status: 'not-started' | 'ongoing-checked-in' | 'ongoing-not-checked-in' | 'completed-checked-in' | 'completed-not-checked-in' | 'not-registered';
    label: string;
    color: string;
    bgColor: string;
    borderColor: string;
    icon: string;
  } => {
    // Nếu chưa đăng ký hoặc chưa được duyệt, không hiển thị trạng thái điểm danh
    if (!activity.isRegistered || activity.approvalStatus !== 'approved') {
      const timeStatus = getActivityTimeStatus(activity);
      if (timeStatus === 'before') {
        return {
          status: 'not-started',
          label: 'Chưa diễn ra',
          color: isDarkMode ? 'text-amber-300' : 'text-amber-700',
          bgColor: isDarkMode ? 'bg-amber-900/20' : 'bg-amber-50',
          borderColor: isDarkMode ? 'border-amber-700/50' : 'border-amber-300',
          icon: '⏰'
        };
      } else if (timeStatus === 'after') {
        return {
          status: 'completed-not-checked-in',
          label: 'Đã kết thúc',
          color: isDarkMode ? 'text-gray-300' : 'text-gray-700',
          bgColor: isDarkMode ? 'bg-gray-900/20' : 'bg-gray-50',
          borderColor: isDarkMode ? 'border-gray-700/50' : 'border-gray-300',
          icon: '🏁'
        };
      }
      return {
        status: 'not-registered',
        label: 'Đang diễn ra',
        color: isDarkMode ? 'text-blue-300' : 'text-blue-700',
        bgColor: isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50',
        borderColor: isDarkMode ? 'border-blue-700/50' : 'border-blue-300',
        icon: '📅'
      };
    }

    const timeStatus = getActivityTimeStatus(activity);
    const activityRecords = attendanceRecords[activity.id] || [];
    const totalSlots = activity.timeSlots?.filter(slot => slot.isActive).length || 0;
    let completedSlots = 0;

    if (activity.timeSlots) {
      activity.timeSlots.filter(slot => slot.isActive).forEach((slot) => {
        const startRecord = activityRecords.find(
          (r) => r.timeSlot === slot.name && r.checkInType === 'start' && r.status === 'approved'
        );
        const endRecord = activityRecords.find(
          (r) => r.timeSlot === slot.name && r.checkInType === 'end' && r.status === 'approved'
        );

        if (startRecord && endRecord) {
          completedSlots++;
        }
      });
    }

    const hasAnyAttendance = activityRecords.length > 0;
    const isAllCompleted = completedSlots === totalSlots && totalSlots > 0;

    if (timeStatus === 'before') {
      return {
        status: 'not-started',
        label: 'Chưa diễn ra',
        color: isDarkMode ? 'text-amber-300' : 'text-amber-700',
        bgColor: isDarkMode ? 'bg-amber-900/20' : 'bg-amber-50',
        borderColor: isDarkMode ? 'border-amber-700/50' : 'border-amber-300',
        icon: '⏰'
      };
    } else if (timeStatus === 'after') {
      if (isAllCompleted || hasAnyAttendance) {
        return {
          status: 'completed-checked-in',
          label: 'Đã kết thúc - Đã điểm danh',
          color: isDarkMode ? 'text-green-300' : 'text-green-700',
          bgColor: isDarkMode ? 'bg-green-900/20' : 'bg-green-50',
          borderColor: isDarkMode ? 'border-green-700/50' : 'border-green-300',
          icon: '✅'
        };
      } else {
        return {
          status: 'completed-not-checked-in',
          label: 'Đã kết thúc - Chưa điểm danh',
          color: isDarkMode ? 'text-red-300' : 'text-red-700',
          bgColor: isDarkMode ? 'bg-red-900/20' : 'bg-red-50',
          borderColor: isDarkMode ? 'border-red-700/50' : 'border-red-300',
          icon: '❌'
        };
      }
    } else {
      // timeStatus === 'during'
      if (hasAnyAttendance) {
        return {
          status: 'ongoing-checked-in',
          label: 'Đang diễn ra - Đã điểm danh',
          color: isDarkMode ? 'text-blue-300' : 'text-blue-700',
          bgColor: isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50',
          borderColor: isDarkMode ? 'border-blue-700/50' : 'border-blue-400',
          icon: '✅'
        };
      } else {
        return {
          status: 'ongoing-not-checked-in',
          label: 'Đang diễn ra - Chưa điểm danh',
          color: isDarkMode ? 'text-orange-300' : 'text-orange-700',
          bgColor: isDarkMode ? 'bg-orange-900/20' : 'bg-orange-50',
          borderColor: isDarkMode ? 'border-orange-700/50' : 'border-orange-400',
          icon: '⚠️'
        };
      }
    }
  };

  const handleRegisterActivity = async (activityId: string, activityTitle: string) => {
    if (!isAuthenticated || !token || !user) {
      alert("Bạn cần đăng nhập để đăng ký tham gia hoạt động.");
      return;
    }

    // Find activity to check current status
    const activity = availableActivities.find(a => a.id === activityId);
    if (!activity) {
      setError('Không tìm thấy hoạt động');
      return;
    }

    const isCurrentlyRegistered = activity.isRegistered || false;
    const isRegistering = registeringActivities.has(activityId);

    if (isRegistering) return; // Prevent multiple clicks

    setRegisteringActivities(prev => new Set(prev).add(activityId));
    setError(null);
    setSuccessMessage(null);

    try {
      const url = `/api/activities/${activityId}/register`;
      const method = isCurrentlyRegistered ? 'DELETE' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          userId: user._id, 
          name: user.name, 
          email: user.email, 
          role: 'Người Tham Gia' 
        }),
      });

      // Check content type before parsing
      const contentType = response.headers.get('content-type');
      const isJson = contentType?.includes('application/json');

      if (!response.ok) {
        let errorMessage = `Không thể ${isCurrentlyRegistered ? 'hủy đăng ký' : 'đăng ký'} tham gia hoạt động`;
        if (isJson) {
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
          } catch {
            errorMessage = `Lỗi ${response.status}: ${response.statusText}`;
          }
        } else {
          errorMessage = `Lỗi ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      let result;
      if (isJson) {
        try {
          result = await response.json();
        } catch (parseError) {
          // If JSON parsing fails, use default message
          result = { 
            message: isCurrentlyRegistered 
              ? 'Đã hủy đăng ký thành công' 
              : 'Đăng ký tham gia thành công' 
          };
        }
      } else {
        // If response is not JSON, assume success if status is OK
        result = { 
          message: isCurrentlyRegistered 
            ? 'Đã hủy đăng ký thành công' 
            : 'Đăng ký tham gia thành công' 
        };
      }
      
      // Update activity registration status locally
      setAvailableActivities(prev => prev.map(a => 
        a.id === activityId 
          ? { 
              ...a, 
              isRegistered: !isCurrentlyRegistered,
              registeredParticipantsCount: isCurrentlyRegistered 
                ? (a.registeredParticipantsCount || 0) - 1 
                : (a.registeredParticipantsCount || 0) + 1,
              approvalStatus: isCurrentlyRegistered ? undefined : 'pending'
            }
          : a
      ));
      
      // Refetch activities to get latest approval status
      if (!isCurrentlyRegistered) {
        // Small delay to allow backend to process
        setTimeout(async () => {
          try {
            const activitiesResponse = await fetch('/api/activities', {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (activitiesResponse.ok) {
              const responseData = await activitiesResponse.json();
              const activitiesData: RawActivity[] = responseData.data.activities;
              const updatedUser = await refetchUser();
              const currentUser = updatedUser || user;
              
              const filteredActivities = activitiesData.filter((activity: RawActivity) => {
                if (currentUser?.isClubMember) {
                  return true;
                } else {
                  return activity.visibility === 'public';
                }
              }).map((activity: RawActivity) => {
                let isRegistered = false;
                let approvalStatus: 'pending' | 'approved' | 'rejected' | undefined = undefined;
                
                const userParticipant = activity.participants?.find((p: any) => {
                  const userId = typeof p.userId === 'object' && p.userId !== null
                    ? (p.userId._id || p.userId.$oid || String(p.userId))
                    : (p.userId?.$oid || p.userId);
                  return userId === currentUser?._id;
                });

                if (userParticipant) {
                  isRegistered = true;
                  approvalStatus = userParticipant.approvalStatus || 'pending';
                }

                const activeTimeSlots = activity.timeSlots?.filter(slot => slot.isActive) || [];
                
                return {
                  id: activity._id,
                  title: activity.name,
                  date: new Date(activity.date).toLocaleDateString('vi-VN'),
                  time: activeTimeSlots.map((slot: any) => `${slot.startTime} - ${slot.endTime}`).join(', ') || 'N/A',
                  timeSlots: activeTimeSlots.map((slot: any) => ({
                    name: slot.name || 'Buổi',
                    startTime: slot.startTime || '',
                    endTime: slot.endTime || '',
                    isActive: slot.isActive !== undefined ? slot.isActive : true
                  })),
                  location: activity.location,
                  points: activity.points || 0,
                  status: activity.status,
                  type: activity.type,
                  visibility: activity.visibility,
                  imageUrl: activity.imageUrl,
                  overview: activity.overview,
                  numberOfSessions: activeTimeSlots.length,
                  registeredParticipantsCount: activity.participants?.length || 0,
                  organizer: activity.participants?.find(p => p.role === 'Trưởng Nhóm')?.name || activity.participants?.[0]?.name || 'N/A',
                  isRegistered: isRegistered,
                  maxParticipants: activity.maxParticipants,
                  approvalStatus: approvalStatus,
                };
              });
              setAvailableActivities(filteredActivities);

              // Reload attendance records for approved activities
              const attendancePromises = filteredActivities
                .filter(activity => activity.isRegistered && activity.approvalStatus === 'approved')
                .map(async (activity) => {
                  try {
                    const response = await fetch(`/api/activities/${activity.id}/attendance/student`, {
                      headers: {
                        'Authorization': `Bearer ${token}`,
                      },
                    });

                    if (response.ok) {
                      const data = await response.json();
                      if (data.success && data.data && data.data.attendances && Array.isArray(data.data.attendances)) {
                        return { activityId: activity.id, records: data.data.attendances };
                      }
                    }
                  } catch (err) {
                    console.error(`Error loading attendance for activity ${activity.id}:`, err);
                  }
                  return { activityId: activity.id, records: [] };
                });

              const attendanceResults = await Promise.all(attendancePromises);
              const attendanceMap: Record<string, AttendanceRecord[]> = {};
              attendanceResults.forEach(({ activityId, records }) => {
                attendanceMap[activityId] = records;
              });
              setAttendanceRecords(prev => ({ ...prev, ...attendanceMap }));
            }
          } catch (err) {
            console.error('Error refreshing activities:', err);
          }
        }, 500);
      }

      setSuccessMessage(result.message || (isCurrentlyRegistered ? 'Đã hủy đăng ký thành công' : 'Đăng ký tham gia thành công'));
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Có lỗi xảy ra khi đăng ký';
      setError(errorMessage);
      console.error('Registration error:', err);
    } finally {
      setRegisteringActivities(prev => {
        const newSet = new Set(prev);
        newSet.delete(activityId);
        return newSet;
      });
    }
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRole="CLUB_STUDENT">
        <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <p className="text-lg font-semibold">Đang tải dữ liệu bảng điều khiển...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute requiredRole="CLUB_STUDENT">
        <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
          <div className="text-center p-6 rounded-lg shadow-lg bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300">
            <p className="text-lg font-semibold mb-2">Đã xảy ra lỗi khi tải dữ liệu:</p>
            <p className="text-sm mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
            >
              Thử lại
            </button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="CLUB_STUDENT">
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <StudentNav key="student-nav" />
          
          <main className="flex-1 max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
          {/* Welcome Section */}
          <div className="mb-6 sm:mb-8">
            <h1 className={`text-2xl sm:text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
              Chào mừng, {user?.name || 'Sinh viên'}!
            </h1>
            <p className={`text-sm sm:text-base ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Khám phá và tham gia các hoạt động ngoại khóa thú vị
            </p>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className={`mb-6 p-4 rounded-xl border ${isDarkMode ? 'bg-green-500/10 border-green-500/30 text-green-300' : 'bg-green-50 border-green-200 text-green-700'}`}>
              <div className="flex items-center gap-2">
                <span>✅</span>
                <p className="text-sm font-medium">{successMessage}</p>
                <button
                  onClick={() => setSuccessMessage(null)}
                  className={`ml-auto text-xs px-2 py-1 rounded ${isDarkMode ? 'hover:bg-green-500/20' : 'hover:bg-green-100'}`}
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className={`mb-6 p-4 rounded-xl border ${isDarkMode ? 'bg-red-500/10 border-red-500/30 text-red-300' : 'bg-red-50 border-red-200 text-red-700'}`}>
              <div className="flex items-center gap-2">
                <span>⚠️</span>
                <p className="text-sm font-medium">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className={`ml-auto text-xs px-2 py-1 rounded ${isDarkMode ? 'hover:bg-red-500/20' : 'hover:bg-red-100'}`}
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
            {studentStats.map((stat, index) => (
              <div key={index} className={`rounded-lg shadow p-4 sm:p-6 ${
                isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
              }`}>
                <div className="flex items-center">
                  <div className={`${stat.color} p-2 sm:p-3 rounded-full`}>
                    <span className="text-xl sm:text-2xl">{stat.icon}</span>
                  </div>
                  <div className="ml-3 sm:ml-4">
                    <p className={`text-xs sm:text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{stat.title}</p>
                    <p className={`text-xl sm:text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stat.value}</p>
                  </div>
                </div>
                <div className="mt-3 sm:mt-4">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    stat.changeType === 'increase' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' 
                      : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                  }`}>
                    {stat.change}
                  </span>
                  <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'} ml-2`}>so với tháng trước</span>
                </div>
              </div>
            ))}
          </div>

          {/* Non-Club Member Section */}
          {!user?.isClubMember && (
            <div className={`rounded-lg shadow p-6 sm:p-8 mb-6 sm:mb-8 text-center ${
              isDarkMode ? 'bg-blue-900/30 border border-blue-700 text-blue-100' : 'bg-blue-50 border border-blue-200 text-blue-700'
            }`}>
              <h2 className="text-xl sm:text-2xl font-bold mb-3">
                Bạn chưa là thành viên CLB Sinh viên 5 Tốt
              </h2>
              <p className="text-base sm:text-lg mb-4">
                Để khám phá toàn bộ hoạt động và quyền lợi, hãy đăng ký trở thành thành viên ngay!
              </p>
              <button
                onClick={() => { /* Handle membership registration navigation */ }}
                className={`px-6 py-3 rounded-md font-semibold transition-colors ${
                  isDarkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                Đăng ký thành viên CLB
              </button>
            </div>
          )}

          {/* Available Activities */}
          <div className={`rounded-lg shadow mb-8 ${
            isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}>
            <div className={`px-6 py-4 border-b ${
              isDarkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Hoạt động đang mở đăng ký</h2>
              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Đăng ký tham gia để tích lũy điểm</p>
            </div>
            {/* Status Legend */}
            <div className={`px-6 py-3 border-b ${isDarkMode ? 'border-gray-700 bg-gray-900/30' : 'border-gray-200 bg-gray-50'}`}>
              <p className={`text-xs font-semibold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Chú thích trạng thái:</p>
              <div className="flex flex-wrap gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className={`w-3 h-3 rounded-full ${isDarkMode ? 'bg-amber-500' : 'bg-amber-400'}`}></div>
                  <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>⏰ Chưa diễn ra</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`w-3 h-3 rounded-full ${isDarkMode ? 'bg-blue-500' : 'bg-blue-400'}`}></div>
                  <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>✅ Đang diễn ra - Đã điểm danh</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`w-3 h-3 rounded-full ${isDarkMode ? 'bg-orange-500' : 'bg-orange-400'}`}></div>
                  <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>⚠️ Đang diễn ra - Chưa điểm danh</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`w-3 h-3 rounded-full ${isDarkMode ? 'bg-green-500' : 'bg-green-400'}`}></div>
                  <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>✅ Đã kết thúc - Đã điểm danh</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`w-3 h-3 rounded-full ${isDarkMode ? 'bg-red-500' : 'bg-red-400'}`}></div>
                  <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>❌ Đã kết thúc - Chưa điểm danh</span>
                </div>
              </div>
            </div>
            <div className="p-6 relative">
              {availableActivities.length === 0 ? (
                <div className={`text-center py-8 rounded-lg border-2 border-dashed ${
                  isDarkMode ? 'border-gray-700 bg-gray-900/20 text-gray-400' : 'border-gray-300 bg-gray-50 text-gray-500'
                }`}>
                  <p className="text-lg font-semibold">Không có hoạt động nào đang mở đăng ký.</p>
                  {!user?.isClubMember && (
                    <p className="text-sm mt-2">Đăng ký thành viên CLB để xem thêm các hoạt động Private.</p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {availableActivities.map((activity) => {
                    const overallStatus = getActivityOverallStatus(activity);
                    
                    // Thêm class đặc biệt cho các trạng thái quan trọng (cần điểm danh)
                    const isImportantStatus = overallStatus.status === 'ongoing-not-checked-in' || overallStatus.status === 'completed-not-checked-in';
                    const borderWidth = isImportantStatus ? 'border-4' : 'border-2';
                    
                    // Shadow style dựa trên trạng thái
                    let shadowStyle = 'shadow-lg';
                    if (overallStatus.status === 'ongoing-not-checked-in') {
                      shadowStyle = 'shadow-xl shadow-orange-500/30';
                    } else if (overallStatus.status === 'completed-not-checked-in') {
                      shadowStyle = 'shadow-xl shadow-red-500/30';
                    } else if (overallStatus.status === 'ongoing-checked-in') {
                      shadowStyle = 'shadow-xl shadow-blue-500/20';
                    } else if (overallStatus.status === 'completed-checked-in') {
                      shadowStyle = 'shadow-xl shadow-green-500/20';
                    }
                    
                    return (
                    <div key={activity.id} className={`relative group rounded-xl ${shadowStyle} transform transition-all duration-300 hover:scale-[1.03] overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-white'} ${borderWidth} ${overallStatus.borderColor}`}>
                     {/* Status Banner - Top of card */}
                     <div className={`${overallStatus.bgColor} ${overallStatus.borderColor} border-b-2 px-4 py-2.5 flex items-center justify-between`}>
                       <div className="flex items-center gap-2">
                         <span className="text-lg">{overallStatus.icon}</span>
                         <span className={`text-xs font-bold ${overallStatus.color}`}>{overallStatus.label}</span>
                       </div>
                       {/* Approval Status Badge - Top right corner */}
                       {activity.isRegistered && activity.approvalStatus && (
                         <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-bold shadow-sm ${
                           activity.approvalStatus === 'approved'
                             ? isDarkMode ? 'bg-green-500/90 text-white' : 'bg-green-500 text-white'
                             : activity.approvalStatus === 'rejected'
                             ? isDarkMode ? 'bg-red-500/90 text-white' : 'bg-red-500 text-white'
                             : isDarkMode ? 'bg-yellow-500/90 text-white' : 'bg-yellow-500 text-white'
                         }`}>
                           <span className="text-xs">
                             {activity.approvalStatus === 'approved' ? '✅' : activity.approvalStatus === 'rejected' ? '❌' : '⏳'}
                           </span>
                           <span className="text-xs">
                             {activity.approvalStatus === 'approved' ? 'Đã duyệt' : activity.approvalStatus === 'rejected' ? 'Đã từ chối' : 'Chờ duyệt'}
                           </span>
                         </div>
                       )}
                     </div>
                     <div className="relative w-full h-56 overflow-hidden">
                       {activity.imageUrl ? (
                         <img
                           src={activity.imageUrl}
                           alt={activity.title}
                           className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                         />
                       ) : (
                         <div className={`w-full h-full flex items-center justify-center ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                           <span className="text-4xl">🖼️</span>
                         </div>
                       )}
                       <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-4 rounded-t-xl">
                         <h3 className="text-white font-extrabold text-xl leading-tight drop-shadow-md">{activity.title}</h3>
                         <div className="flex flex-wrap gap-2 mt-2">
                           <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${isDarkMode ? 'bg-blue-900/50 text-blue-200' : 'bg-blue-600 text-white'} drop-shadow`}>
                             <span className="mr-1">🏷️</span> {activity.type}
                           </span>
                           <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${isDarkMode ? 'bg-yellow-900/50 text-yellow-200' : 'bg-yellow-600 text-white'} drop-shadow`}>
                             <span className="mr-1">⭐</span> {activity.points} điểm
                           </span>
                         </div>
                       </div>
                     </div>
                     <div className="p-5">
                       {activity.overview && (
                         <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-4 line-clamp-3`}>
                           {activity.overview}
                         </p>
                       )}
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-5">
                         {/* Ngày diễn ra */}
                         <div className={`flex items-center p-3 rounded-lg ${isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800'}`}>
                           <span className="mr-3 text-lg text-purple-500">🗓️</span>
                           <div className="flex-1 min-w-0">
                             <p className="font-medium">Ngày diễn ra:</p>
                             <p className="text-sm font-semibold truncate">{activity.date}</p>
                           </div>
                         </div>
                         
                         {/* Số buổi */}
                         {activity.numberOfSessions !== undefined && activity.numberOfSessions > 0 && (
                           <div className={`flex items-center p-3 rounded-lg ${isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800'}`}>
                             <span className="mr-3 text-lg text-yellow-500">📖</span>
                             <div className="flex-1 min-w-0">
                               <p className="font-medium">Số buổi:</p>
                               <p className="text-sm font-semibold">{activity.numberOfSessions}</p>
                             </div>
                           </div>
                         )}
                         
                         {/* Thời gian các buổi - Compact design */}
                         {activity.timeSlots && activity.timeSlots.length > 0 ? (
                           <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800'}`}>
                             <div className="flex items-start gap-2 mb-2">
                               <span className="text-lg text-green-500 mt-0.5">⏱️</span>
                               <div className="flex-1 min-w-0">
                                 <p className="font-medium mb-2">Thời gian các buổi:</p>
                                 <div className="space-y-1.5">
                                   {activity.timeSlots.map((slot, idx) => {
                                     const slotIcons: { [key: string]: string } = {
                                       'Buổi Sáng' : '🌅',
                                       'Buổi Chiều': '☀️',
                                       'Buổi Tối'  : '🌙'
                                     };
                                     const slotColors: { [key: string]: string } = {
                                       'Buổi Sáng' : isDarkMode ? 'text-yellow-400' : 'text-yellow-600',
                                       'Buổi Chiều': isDarkMode ? 'text-orange-400' : 'text-orange-600',
                                       'Buổi Tối'  : isDarkMode ? 'text-blue-400' : 'text-blue-600'
                                     };
                                     return (
                                       <div key={idx} className={`flex items-center gap-1.5 text-xs ${slotColors[slot.name] || (isDarkMode ? 'text-gray-300' : 'text-gray-700')}`}>
                                         <span className="text-sm">{slotIcons[slot.name] || '🕐'}</span>
                                         <span className="font-semibold">{slot.name}:</span>
                                         <span className="truncate">{slot.startTime} - {slot.endTime}</span>
                                       </div>
                                     );
                                   })}
                                 </div>
                               </div>
                             </div>
                           </div>
                         ) : (
                           <div className={`flex items-center p-3 rounded-lg ${isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800'}`}>
                             <span className="mr-3 text-lg text-green-500">⏱️</span>
                             <div className="flex-1 min-w-0">
                               <p className="font-medium">Thời gian:</p>
                               <p className="text-sm font-semibold truncate">{activity.time}</p>
                             </div>
                           </div>
                         )}
                         
                         {/* Địa điểm */}
                         <div className={`flex items-start p-3 rounded-lg ${isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800'}`}>
                           <span className="mr-3 text-lg text-blue-500 mt-0.5">🗺️</span>
                           <div className="flex-1 min-w-0">
                             <p className="font-medium">Địa điểm:</p>
                             <p className="text-sm font-semibold line-clamp-2">{activity.location}</p>
                           </div>
                         </div>
                         
                         {/* Đã đăng ký */}
                         {activity.registeredParticipantsCount !== undefined && (
                           <div className={`flex items-center p-3 rounded-lg ${isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800'}`}>
                             <span className="mr-3 text-lg text-orange-500">👥</span>
                             <div className="flex-1 min-w-0">
                               <p className="font-medium">Đã đăng ký:</p>
                               <p className="text-sm font-semibold">{activity.registeredParticipantsCount} người</p>
                             </div>
                           </div>
                         )}
                         
                         {/* Trưởng nhóm */}
                         {activity.organizer && (
                           <div className={`flex items-center p-3 rounded-lg ${isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800'}`}>
                             <span className="mr-3 text-lg text-indigo-500">👨‍💼</span>
                             <div className="flex-1 min-w-0">
                               <p className="font-medium">Trưởng nhóm:</p>
                               <p className="text-sm font-semibold truncate">{activity.organizer}</p>
                             </div>
                           </div>
                         )}

                         {/* Trạng thái điểm danh - Chỉ hiển thị khi đã đăng ký và được duyệt */}
                         {activity.isRegistered && activity.approvalStatus === 'approved' && (() => {
                           const timeStatus = getActivityTimeStatus(activity);
                           
                           // Nếu chưa đến ngày hoặc đã qua ngày, hiển thị trạng thái đặc biệt
                           if (timeStatus === 'before') {
                             return (
                               <div className={`flex items-center p-3 rounded-lg ${
                                 isDarkMode ? 'bg-amber-900/30 border border-amber-700/50' : 'bg-amber-50 border border-amber-200'
                               }`}>
                                 <span className="mr-3 text-lg text-amber-500">⏰</span>
                                 <div className="flex-1 min-w-0">
                                   <p className={`font-medium ${
                                     isDarkMode ? 'text-amber-300' : 'text-amber-700'
                                   }`}>Trạng thái điểm danh:</p>
                                   <p className={`text-sm font-semibold ${
                                     isDarkMode ? 'text-amber-300' : 'text-amber-700'
                                   }`}>
                                     Chưa đến ngày điểm danh
                                   </p>
                                 </div>
                               </div>
                             );
                           }

                           if (timeStatus === 'after') {
                             return (
                               <div className={`flex items-center p-3 rounded-lg ${
                                 isDarkMode ? 'bg-gray-900/30 border border-gray-700/50' : 'bg-gray-100 border border-gray-300'
                               }`}>
                                 <span className="mr-3 text-lg text-gray-500">🏁</span>
                                 <div className="flex-1 min-w-0">
                                   <p className={`font-medium ${
                                     isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                   }`}>Trạng thái:</p>
                                   <p className={`text-sm font-semibold ${
                                     isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                   }`}>
                                     Hoạt động đã kết thúc
                                   </p>
                                 </div>
                               </div>
                             );
                           }

                           // Đang trong thời gian hoạt động - hiển thị thông tin điểm danh
                           const activityRecords = attendanceRecords[activity.id] || [];
                           // Tính số buổi đã hoàn thành (cả đầu và cuối buổi đều được approved)
                           const totalSlots = activity.timeSlots?.filter(slot => slot.isActive).length || 0;
                           let completedSlots = 0;

                           if (activity.timeSlots) {
                             activity.timeSlots.filter(slot => slot.isActive).forEach((slot) => {
                               const startRecord = activityRecords.find(
                                 (r) => r.timeSlot === slot.name && r.checkInType === 'start' && r.status === 'approved'
                               );
                               const endRecord = activityRecords.find(
                                 (r) => r.timeSlot === slot.name && r.checkInType === 'end' && r.status === 'approved'
                               );

                               // Nếu cả đầu và cuối buổi đều được approved thì tính là hoàn thành
                               if (startRecord && endRecord) {
                                 completedSlots++;
                               }
                             });
                           }

                           const isCompleted = completedSlots === totalSlots && totalSlots > 0;
                           const hasAnyAttendance = activityRecords.length > 0;

                           return (
                             <div className={`flex items-center p-3 rounded-lg ${
                               isCompleted
                                 ? isDarkMode ? 'bg-green-900/30 border border-green-700/50' : 'bg-green-50 border border-green-200'
                                 : hasAnyAttendance
                                 ? isDarkMode ? 'bg-blue-900/30 border border-blue-700/50' : 'bg-blue-50 border border-blue-200'
                                 : isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800'
                             }`}>
                               <span className={`mr-3 text-lg ${
                                 isCompleted
                                   ? 'text-green-500'
                                   : hasAnyAttendance
                                   ? 'text-blue-500'
                                   : 'text-gray-500'
                               }`}>
                                 {isCompleted ? '✅' : hasAnyAttendance ? '📊' : '⏸️'}
                               </span>
                               <div className="flex-1 min-w-0">
                                 <p className={`font-medium ${
                                   isCompleted
                                     ? isDarkMode ? 'text-green-300' : 'text-green-700'
                                     : hasAnyAttendance
                                     ? isDarkMode ? 'text-blue-300' : 'text-blue-700'
                                     : ''
                                 }`}>Trạng thái điểm danh:</p>
                                 <p className={`text-sm font-semibold ${
                                   isCompleted
                                     ? isDarkMode ? 'text-green-300' : 'text-green-700'
                                     : hasAnyAttendance
                                     ? isDarkMode ? 'text-blue-300' : 'text-blue-700'
                                     : ''
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
                           );
                         })()}
                       </div>
                       <div className="flex flex-col sm:flex-row gap-3 mt-4">
                         <button
                           onClick={() => handleRegisterActivity(activity.id, activity.title)}
                           disabled={registeringActivities.has(activity.id) || !!(
                             activity.maxParticipants && 
                             activity.registeredParticipantsCount !== undefined && 
                             activity.maxParticipants > 0 &&
                             activity.registeredParticipantsCount >= activity.maxParticipants && 
                             !activity.isRegistered
                           )}
                           className={`flex-1 py-3 px-4 rounded-lg text-base font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 ${
                             activity.isRegistered
                               ? isDarkMode
                                 ? 'bg-red-600 text-white hover:bg-red-700'
                                 : 'bg-red-600 text-white hover:bg-red-700'
                               : (activity.maxParticipants && activity.registeredParticipantsCount && activity.registeredParticipantsCount >= activity.maxParticipants)
                               ? isDarkMode
                                 ? 'bg-red-900/50 text-red-300 cursor-not-allowed'
                                 : 'bg-red-100 text-red-700 cursor-not-allowed'
                               : registeringActivities.has(activity.id)
                               ? isDarkMode
                                 ? 'bg-purple-700/50 text-purple-300 cursor-wait'
                                 : 'bg-purple-400 text-white cursor-wait'
                               : 'bg-purple-600 text-white hover:bg-purple-700'
                           }`}
                         >
                           {registeringActivities.has(activity.id) 
                             ? 'Đang xử lý...' 
                             : activity.isRegistered
                             ? 'Hủy đăng ký'
                             : (activity.maxParticipants && activity.registeredParticipantsCount && activity.registeredParticipantsCount >= activity.maxParticipants)
                             ? 'Đã đầy'
                             : 'Đăng ký tham gia'}
                         </button>
                         <button
                           onClick={() => { router.push(`/student/activities/${activity.id}`); }}
                           className={`flex-1 border py-3 px-4 rounded-lg text-base font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 ${isDarkMode ? 'border-gray-500 text-gray-100 hover:bg-gray-600' : 'border-gray-300 text-gray-800 hover:bg-gray-100'}`}
                         >
                           Xem chi tiết
                         </button>
                       </div>
                     </div>
                    </div>
                    );
                  })}
               </div>
              )}
            </div>
          </div>

          {/* Recent Participations */}
          {user?.isClubMember && recentParticipations.length > 0 && (
            <div className={`rounded-lg shadow ${
              isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
            }`}>
              <div className={`px-6 py-4 border-b ${
                isDarkMode ? 'border-gray-700' : 'border-gray-200'
              }`}>
                <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Hoạt động đã tham gia</h2>
                <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Lịch sử tham gia hoạt động</p>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recentParticipations.map((participation) => (
                  <div key={participation.id} className={`rounded-lg shadow p-5 ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                    <h3 className={`font-semibold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-3`}>{participation.title}</h3>
                    <div className={`space-y-2 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-4`}>
                      <p className="flex items-center"><span className="mr-2 text-base text-gray-400">📅</span> Ngày tham gia: <span className="ml-1 font-semibold">{participation.date}</span></p>
                      <p className="flex items-center"><span className="mr-2 text-base text-gray-400">⭐</span> Điểm nhận được: <span className="ml-1 font-semibold text-yellow-500">{participation.points} điểm</span></p>
                      <p className="flex items-center"><span className="mr-2 text-base text-gray-400">✅</span> Trạng thái: <span className="ml-1 font-semibold text-green-500">{participation.status}</span></p>
                    </div>
                    <button
                      onClick={() => { router.push(`/student/activities/${participation.id}`); }}
                      className={`w-full border py-2.5 px-4 rounded-lg text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 ${isDarkMode ? 'border-gray-500 text-gray-100 hover:bg-gray-600' : 'border-gray-300 text-gray-800 hover:bg-gray-100'}`}
                    >
                      Xem chi tiết
                    </button>
                  </div>
                ))}
              </div>
              <div className={`px-6 py-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <button className={`text-purple-600 ${isDarkMode ? 'hover:text-purple-400' : 'hover:text-purple-900'} text-sm font-medium`}>
                  Xem tất cả hoạt động đã tham gia →
                </button>
              </div>
            </div>
          )}
        </main>

        <Footer />
      </div>
    </ProtectedRoute>
  );
}
