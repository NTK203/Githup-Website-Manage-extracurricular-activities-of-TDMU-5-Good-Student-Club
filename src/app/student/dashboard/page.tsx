'use client';

import { useState, useEffect } from 'react';
import { 
  Target, 
  Award, 
  Calendar, 
  Bell, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle,
  MapPin,
  Users,
  User,
  Eye,
  X,
  Image as ImageIcon,
  FileText,
  Search,
  Filter,
  ChevronDown,
  CalendarDays,
  Loader
} from 'lucide-react';
import StudentNav from '@/components/student/StudentNav';
import Footer from '@/components/common/Footer';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import PaginationBar from '@/components/common/PaginationBar';
import { useAuth } from '@/hooks/useAuth';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useRouter } from 'next/navigation';

interface StudentStat {
  title: string;
  value: string;
  change: string;
  changeType: 'increase' | 'decrease';
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  iconColor: string;
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
  organizerAvatarUrl?: string; // Add organizer avatar
  isRegistered?: boolean; // Track if user is registered
  maxParticipants?: number; // Max participants allowed
  approvalStatus?: 'pending' | 'approved' | 'rejected'; // Approval status
  // Multiple days activity fields
  isMultipleDays?: boolean; // Flag to indicate if this is a multiple days activity
  startDate?: string; // For multiple days activities
  endDate?: string; // For multiple days activities
  schedule?: Array<{ // For multiple days activities
    day: number;
    date: string;
    activities: string;
  }>;
  participants?: Array<{ // Participants list
    userId: string;
    name: string;
    email: string;
    avatarUrl?: string;
    approvalStatus?: 'pending' | 'approved' | 'rejected';
  }>;
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
  description?: string; // Mô tả chi tiết
  overview?: string; // Tóm tắt ngắn
  maxParticipants?: number; // Add maxParticipants
  responsiblePerson?: {
    _id?: string;
    name?: string;
    email?: string;
    avatarUrl?: string;
  };
  participants?: Array<{
    userId: { $oid: string } | string;
    name: string;
    email: string;
    role: string;
    joinedAt: { $date: string } | Date | string;
    approvalStatus?: 'pending' | 'approved' | 'rejected';
  }>;
  // Multiple days activity fields
  startDate?: string;
  endDate?: string;
  schedule?: Array<{
    day: number;
    date: string;
    activities: string;
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
  const [currentPage, setCurrentPage] = useState(1);
  const [activitiesPerPage, setActivitiesPerPage] = useState(6);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [selectedActivityParticipants, setSelectedActivityParticipants] = useState<Array<{
    userId: string;
    name: string;
    email: string;
    avatarUrl?: string;
    approvalStatus?: 'pending' | 'approved' | 'rejected';
  }>>([]);
  const [selectedActivityTitle, setSelectedActivityTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activityType, setActivityType] = useState<'all' | 'single_day' | 'multiple_days'>('all');
  const [registrationFilter, setRegistrationFilter] = useState<'all' | 'registered' | 'not_registered'>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!token) {
          throw new Error("User not authenticated or token not available.");
        }

        // Sử dụng user từ context trước, refetch sau để không block UI
        const currentUser = user;
        
        // Refetch user data sau 2 giây để không block load ban đầu
        setTimeout(() => {
          refetchUser().catch(() => {
            // Silent fail
          });
        }, 2000);

        // Calculate student stats from activities data (will be updated after fetching activities)
        // Initial stats will be set after activities are fetched

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
        // Filter activities: exclude draft status, and filter by visibility
        const filteredActivities = activitiesData.filter((activity: RawActivity) => {
          // Exclude draft activities
          if (activity.status === 'draft') {
            return false;
          }
          // Filter by visibility based on club membership
          if (currentUser?.isClubMember) {
            return true; // Club members can see all non-draft activities (public and private)
          } else {
            return activity.visibility === 'public'; // Non-club members only see public non-draft activities
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

          // Check if this is a multiple days activity
          const isMultipleDays = activity.type === 'multiple_days';

          let date: string, time: string, timeSlots: any[], numberOfSessions: number;

          if (isMultipleDays) {
            // For multiple days activities
            const startDate = activity.startDate ? new Date(activity.startDate) : null;
            const endDate = activity.endDate ? new Date(activity.endDate) : null;

            // Format date range for multiple days
            if (startDate && endDate) {
              const startStr = startDate.toLocaleDateString('vi-VN');
              const endStr = endDate.toLocaleDateString('vi-VN');
              date = startStr === endStr ? startStr : `${startStr} - ${endStr}`;
            } else if (startDate) {
              date = startDate.toLocaleDateString('vi-VN');
            } else {
              date = 'Chưa có';
            }

            // Parse schedule to extract time slots and activities
            let allTimeSlots: any[] = [];
            let totalSessions = 0;

            if (activity.schedule && activity.schedule.length > 0) {
              activity.schedule.forEach((scheduleItem) => {
                const scheduleText = scheduleItem.activities || '';
                const lines = scheduleText.split('\n').filter(line => line.trim());

                lines.forEach((line: string) => {
                  // Parse time slot information from schedule
                  if (line.includes('Buổi Sáng') || line.includes('Buổi Chiều') || line.includes('Buổi Tối')) {
                    const timeMatch = line.match(/(\d{2}:\d{2})-(\d{2}:\d{2})/);
                    if (timeMatch) {
                      const slotName = line.includes('Buổi Sáng') ? 'Buổi Sáng' :
                                     line.includes('Buổi Chiều') ? 'Buổi Chiều' : 'Buổi Tối';

                      allTimeSlots.push({
                        name: slotName,
                        startTime: timeMatch[1],
                        endTime: timeMatch[2],
                        isActive: true
                      });
                      totalSessions++;
                    }
                  }
                });
              });
            }

            timeSlots = allTimeSlots;
            numberOfSessions = totalSessions;
            time = allTimeSlots.map(slot => `${slot.startTime} - ${slot.endTime}`).join(', ') || 'Chưa có';
          } else {
            // For single day activities (existing logic)
            const activeTimeSlots = activity.timeSlots?.filter(slot => slot.isActive) || [];

            date = new Date(activity.date).toLocaleDateString('vi-VN');
            time = activeTimeSlots.map((slot: any) => `${slot.startTime} - ${slot.endTime}`).join(', ') || 'Chưa có';
            timeSlots = activeTimeSlots.map((slot: any) => ({
              name: slot.name || 'Buổi',
              startTime: slot.startTime || '',
              endTime: slot.endTime || '',
              isActive: slot.isActive !== undefined ? slot.isActive : true
            }));
            numberOfSessions = activeTimeSlots.length;
          }

          return {
            id: activity._id,
            title: activity.name,
            date: date,
            time: time,
            timeSlots: timeSlots,
            location: activity.location,
            points: activity.points || 0,
            status: activity.status,
            type: activity.type,
            visibility: activity.visibility,
            imageUrl: activity.imageUrl,
            overview: activity.description || activity.overview, // Ưu tiên description (mô tả chi tiết)
            numberOfSessions: numberOfSessions,
            registeredParticipantsCount: activity.participants?.length || 0,
            organizer: activity.responsiblePerson?.name || activity.participants?.find(p => p.role === 'Trưởng Nhóm')?.name || activity.participants?.[0]?.name || 'Chưa có',
            organizerAvatarUrl: activity.responsiblePerson?.avatarUrl,
            isRegistered: isRegistered,
            maxParticipants: activity.maxParticipants,
            approvalStatus: approvalStatus,
            // Multiple days fields
            isMultipleDays: isMultipleDays,
            startDate: activity.startDate,
            endDate: activity.endDate,
            schedule: activity.schedule,
            participants: activity.participants?.map((p: any) => ({
              userId: typeof p.userId === 'object' && p.userId !== null
                ? (p.userId._id || p.userId.$oid || String(p.userId))
                : (p.userId?.$oid || p.userId || ''),
              name: p.name || 'Không có tên',
              email: p.email || '',
              avatarUrl: p.avatarUrl,
              approvalStatus: p.approvalStatus,
            })) || [],
          };
        });
        setAvailableActivities(filteredActivities);

        // Calculate student stats from activities
        const now = new Date();
        const registeredActivities = filteredActivities.filter(a => a.isRegistered);
        const completedActivities = filteredActivities.filter(a => {
          if (!a.isRegistered) return false;

          try {
            if (a.isMultipleDays) {
              // For multiple days activities, check if endDate has passed
              if (!a.endDate) return false;
              const endDate = new Date(a.endDate);
              return !isNaN(endDate.getTime()) && endDate < now && a.status === 'completed';
            } else {
              // For single day activities (existing logic)
              const dateParts = a.date.split('/');
              if (dateParts.length !== 3) return false;
              const activityDate = new Date(
                parseInt(dateParts[2]),
                parseInt(dateParts[1]) - 1,
                parseInt(dateParts[0])
              );
              return !isNaN(activityDate.getTime()) && activityDate < now && a.status === 'completed';
            }
          } catch {
            return false;
          }
        });
        const pendingActivities = filteredActivities.filter(a => {
          if (!a.isRegistered) return false;

          try {
            if (a.isMultipleDays) {
              // For multiple days activities, check if startDate is in the future or current
              if (!a.startDate) return false;
              const startDate = new Date(a.startDate);
              return !isNaN(startDate.getTime()) && startDate >= now;
            } else {
              // For single day activities (existing logic)
              const dateParts = a.date.split('/');
              if (dateParts.length !== 3) return false;
              const activityDate = new Date(
                parseInt(dateParts[2]),
                parseInt(dateParts[1]) - 1,
                parseInt(dateParts[0])
              );
              return !isNaN(activityDate.getTime()) && activityDate >= now;
            }
          } catch {
            return false;
          }
        });
        const totalPoints = completedActivities.reduce((sum, a) => sum + (a.points || 0), 0);

        // Fetch unread notifications count
        let unreadNotifications = 0;
        try {
          const notificationsResponse = await fetch('/api/notifications/unread-count', {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (notificationsResponse.ok) {
            const notificationsData = await notificationsResponse.json();
            if (notificationsData.success) {
              unreadNotifications = notificationsData.data.count || 0;
            }
          }
        } catch (err) {
          console.error('Error fetching unread notifications:', err);
        }

        setStudentStats([
          { 
            title: 'Hoạt động đã tham gia', 
            value: completedActivities.length.toString(), 
            change: '+0', 
            changeType: 'increase', 
            icon: Target, 
            iconColor: isDarkMode ? 'text-blue-400' : 'text-blue-600'
          },
          { 
            title: 'Điểm tích lũy', 
            value: totalPoints.toFixed(1), 
            change: '+0', 
            changeType: 'increase', 
            icon: Award, 
            iconColor: isDarkMode ? 'text-amber-400' : 'text-amber-600'
          },
          { 
            title: 'Hoạt động đang đăng ký', 
            value: pendingActivities.length.toString(), 
            change: '+0', 
            changeType: 'increase', 
            icon: Calendar, 
            iconColor: isDarkMode ? 'text-orange-400' : 'text-orange-600'
          },
          { 
            title: 'Thông báo mới', 
            value: unreadNotifications.toString(), 
            change: '+0', 
            changeType: 'increase', 
            icon: Bell, 
            iconColor: isDarkMode ? 'text-pink-400' : 'text-pink-600'
          },
        ]);

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
            return { activityId: activity.id, records: [] };
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

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showFilters && !target.closest('.filter-dropdown-container')) {
        setShowFilters(false);
      }
    };

    if (showFilters) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showFilters]);

  // Helper function to translate activity type to Vietnamese
  const getActivityTypeLabel = (type: string): string => {
    const typeMap: Record<string, string> = {
      'single_day': 'Hoạt động một ngày',
      'multiple_days': 'Hoạt động nhiều ngày',
      'workshop': 'Workshop',
      'seminar': 'Seminar',
      'volunteer': 'Tình nguyện',
      'training': 'Đào tạo',
      'event': 'Sự kiện',
      'meeting': 'Cuộc họp',
      'competition': 'Cuộc thi',
      'social': 'Hoạt động xã hội',
    };
    return typeMap[type] || type;
  };

  // Helper function to check activity time status
  const getActivityTimeStatus = (activity: ActivityItem): 'before' | 'during' | 'after' => {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      if (activity.isMultipleDays) {
        // For multiple days activities
        const startDate = activity.startDate ? new Date(activity.startDate) : null;
        const endDate = activity.endDate ? new Date(activity.endDate) : null;

        if (!startDate || !endDate) {
          return 'after'; // Invalid date range
        }

        const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
        const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

        if (today.getTime() < startDateOnly.getTime()) {
          return 'before'; // Before start date
        }

        if (today.getTime() > endDateOnly.getTime()) {
          return 'after'; // After end date
        }

        // Between start and end date - check if there are active sessions today
        if (activity.schedule && activity.schedule.length > 0) {
          // Find today's schedule
          const todayStr = today.toISOString().split('T')[0];
          const todaySchedule = activity.schedule.find(s => s.date.startsWith(todayStr));

          if (todaySchedule && todaySchedule.activities) {
            const lines = todaySchedule.activities.split('\n').filter(line => line.trim());
            const hasActiveSessionsToday = lines.some(line =>
              line.includes('Buổi Sáng') || line.includes('Buổi Chiều') || line.includes('Buổi Tối')
            );

            if (hasActiveSessionsToday) {
              // Check if today's sessions have ended
              const endTimes: Date[] = [];

              lines.forEach((line: string) => {
                if (line.includes('Buổi Sáng') || line.includes('Buổi Chiều') || line.includes('Buổi Tối')) {
                  const timeMatch = line.match(/(\d{2}:\d{2})-(\d{2}:\d{2})/);
                  if (timeMatch) {
                    const [endHours, endMinutes] = timeMatch[2].split(':').map(Number);
                    const slotEndTime = new Date(today);
                    slotEndTime.setHours(endHours, endMinutes, 0, 0);

                    // Add 15 minutes buffer (check-in window)
                    const checkInWindowEnd = new Date(slotEndTime);
                    checkInWindowEnd.setMinutes(checkInWindowEnd.getMinutes() + 15);

                    endTimes.push(checkInWindowEnd);
                  }
                }
              });

              if (endTimes.length > 0) {
                const latestEndTime = endTimes.reduce((latest, current) =>
                  current.getTime() > latest.getTime() ? current : latest
                );

                if (now.getTime() > latestEndTime.getTime()) {
                  return 'after'; // Today's sessions have ended
                }
              }

              return 'during'; // Has active sessions today
            }
          }
        }

        return 'during'; // Within date range but no specific sessions today
      } else {
        // For single day activities (existing logic)
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
      }
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
    icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  } => {
    // Nếu chưa đăng ký hoặc chưa được duyệt, không hiển thị trạng thái điểm danh
    if (!activity.isRegistered || activity.approvalStatus !== 'approved') {
      const timeStatus = getActivityTimeStatus(activity);
      if (timeStatus === 'before') {
        return {
          status: 'not-started',
          label: 'Chưa diễn ra',
          color: isDarkMode ? 'text-gray-300' : 'text-gray-600',
          bgColor: isDarkMode ? 'bg-gray-800' : 'bg-gray-50',
          borderColor: isDarkMode ? 'border-gray-700' : 'border-gray-200',
          icon: Clock
        };
      } else if (timeStatus === 'after') {
        return {
          status: 'completed-not-checked-in',
          label: 'Đã kết thúc',
          color: isDarkMode ? 'text-gray-300' : 'text-gray-600',
          bgColor: isDarkMode ? 'bg-gray-800' : 'bg-gray-50',
          borderColor: isDarkMode ? 'border-gray-700' : 'border-gray-200',
          icon: XCircle
        };
      }
      return {
        status: 'not-registered',
        label: 'Đang diễn ra',
        color: isDarkMode ? 'text-gray-300' : 'text-gray-600',
        bgColor: isDarkMode ? 'bg-gray-800' : 'bg-gray-50',
        borderColor: isDarkMode ? 'border-gray-700' : 'border-gray-200',
        icon: Calendar
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
        color: isDarkMode ? 'text-gray-300' : 'text-gray-600',
        bgColor: isDarkMode ? 'bg-gray-800' : 'bg-gray-50',
        borderColor: isDarkMode ? 'border-gray-700' : 'border-gray-200',
        icon: Clock
      };
    } else if (timeStatus === 'after') {
      if (isAllCompleted || hasAnyAttendance) {
        return {
          status: 'completed-checked-in',
          label: 'Đã kết thúc - Đã điểm danh',
          color: isDarkMode ? 'text-gray-300' : 'text-gray-600',
          bgColor: isDarkMode ? 'bg-gray-800' : 'bg-gray-50',
          borderColor: isDarkMode ? 'border-gray-700' : 'border-gray-200',
          icon: CheckCircle2
        };
      } else {
        return {
          status: 'completed-not-checked-in',
          label: 'Đã kết thúc - Chưa điểm danh',
          color: isDarkMode ? 'text-gray-400' : 'text-gray-500',
          bgColor: isDarkMode ? 'bg-gray-800' : 'bg-gray-50',
          borderColor: isDarkMode ? 'border-gray-700' : 'border-gray-200',
          icon: XCircle
        };
      }
    } else {
      // timeStatus === 'during'
      if (hasAnyAttendance) {
        return {
          status: 'ongoing-checked-in',
          label: 'Đang diễn ra - Đã điểm danh',
          color: isDarkMode ? 'text-gray-300' : 'text-gray-600',
          bgColor: isDarkMode ? 'bg-gray-800' : 'bg-gray-50',
          borderColor: isDarkMode ? 'border-gray-700' : 'border-gray-200',
          icon: CheckCircle2
        };
      } else {
        return {
          status: 'ongoing-not-checked-in',
          label: 'Đang diễn ra - Chưa điểm danh',
          color: isDarkMode ? 'text-gray-400' : 'text-gray-500',
          bgColor: isDarkMode ? 'bg-gray-800' : 'bg-gray-50',
          borderColor: isDarkMode ? 'border-gray-700' : 'border-gray-200',
          icon: AlertCircle
        };
      }
    }
  };

  // Filter and sort activities
  const getFilteredAndSortedActivities = () => {
    let filtered = [...availableActivities];

    // Text search filter
    if (searchQuery) {
      filtered = filtered.filter(activity =>
        activity.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        activity.overview?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        activity.location.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Date range filter
    if (startDate || endDate) {
      filtered = filtered.filter(activity => {
        let activityDate: Date | null = null;
        
        if (activity.isMultipleDays) {
          activityDate = activity.startDate ? new Date(activity.startDate) : null;
        } else {
          try {
            const dateParts = activity.date.split('/');
            if (dateParts.length === 3) {
              activityDate = new Date(
                parseInt(dateParts[2]),
                parseInt(dateParts[1]) - 1,
                parseInt(dateParts[0])
              );
            }
          } catch {
            return false;
          }
        }

        if (!activityDate || isNaN(activityDate.getTime())) return false;

        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          if (activityDate < start) return false;
        }

        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (activityDate > end) return false;
        }

        return true;
      });
    }

    // Activity type filter
    if (activityType !== 'all') {
      filtered = filtered.filter(activity => {
        if (activityType === 'single_day') return !activity.isMultipleDays;
        if (activityType === 'multiple_days') return activity.isMultipleDays;
        return true;
      });
    }

    // Registration filter
    if (registrationFilter !== 'all') {
      filtered = filtered.filter(activity => {
        if (registrationFilter === 'registered') return activity.isRegistered === true;
        if (registrationFilter === 'not_registered') return activity.isRegistered !== true;
        return true;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      let dateA: Date | null = null;
      let dateB: Date | null = null;

      if (a.isMultipleDays) {
        dateA = a.startDate ? new Date(a.startDate) : null;
      } else {
        try {
          const dateParts = a.date.split('/');
          if (dateParts.length === 3) {
            dateA = new Date(
              parseInt(dateParts[2]),
              parseInt(dateParts[1]) - 1,
              parseInt(dateParts[0])
            );
          }
        } catch {}
      }

      if (b.isMultipleDays) {
        dateB = b.startDate ? new Date(b.startDate) : null;
      } else {
        try {
          const dateParts = b.date.split('/');
          if (dateParts.length === 3) {
            dateB = new Date(
              parseInt(dateParts[2]),
              parseInt(dateParts[1]) - 1,
              parseInt(dateParts[0])
            );
          }
        } catch {}
      }

      if (!dateA || !dateB) return 0;

      if (sortOrder === 'newest') {
        return dateB.getTime() - dateA.getTime();
      } else {
        return dateA.getTime() - dateB.getTime();
      }
    });

    return filtered;
  };

  const filteredActivities = getFilteredAndSortedActivities();

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
                // Exclude draft activities
                if (activity.status === 'draft') {
                  return false;
                }
                // Filter by visibility based on club membership
                if (currentUser?.isClubMember) {
                  return true; // Club members can see all non-draft activities (public and private)
                } else {
                  return activity.visibility === 'public'; // Non-club members only see public non-draft activities
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

                // Check if this is a multiple days activity
                const isMultipleDays = activity.type === 'multiple_days';

                let date: string, time: string, timeSlots: any[], numberOfSessions: number;

                if (isMultipleDays) {
                  // For multiple days activities
                  const startDate = activity.startDate ? new Date(activity.startDate) : null;
                  const endDate = activity.endDate ? new Date(activity.endDate) : null;

                  // Format date range for multiple days
                  if (startDate && endDate) {
                    const startStr = startDate.toLocaleDateString('vi-VN');
                    const endStr = endDate.toLocaleDateString('vi-VN');
                    date = startStr === endStr ? startStr : `${startStr} - ${endStr}`;
                  } else if (startDate) {
                    date = startDate.toLocaleDateString('vi-VN');
                  } else {
                    date = 'Chưa có';
                  }

                  // Parse schedule to extract time slots and activities
                  let allTimeSlots: any[] = [];
                  let totalSessions = 0;

                  if (activity.schedule && activity.schedule.length > 0) {
                    activity.schedule.forEach((scheduleItem) => {
                      const scheduleText = scheduleItem.activities || '';
                      const lines = scheduleText.split('\n').filter(line => line.trim());

                      lines.forEach((line: string) => {
                        // Parse time slot information from schedule
                        if (line.includes('Buổi Sáng') || line.includes('Buổi Chiều') || line.includes('Buổi Tối')) {
                          const timeMatch = line.match(/(\d{2}:\d{2})-(\d{2}:\d{2})/);
                          if (timeMatch) {
                            const slotName = line.includes('Buổi Sáng') ? 'Buổi Sáng' :
                                           line.includes('Buổi Chiều') ? 'Buổi Chiều' : 'Buổi Tối';

                            allTimeSlots.push({
                              name: slotName,
                              startTime: timeMatch[1],
                              endTime: timeMatch[2],
                              isActive: true
                            });
                            totalSessions++;
                          }
                        }
                      });
                    });
                  }

                  timeSlots = allTimeSlots;
                  numberOfSessions = totalSessions;
                  time = allTimeSlots.map(slot => `${slot.startTime} - ${slot.endTime}`).join(', ') || 'Chưa có';
                } else {
                  // For single day activities (existing logic)
                  const activeTimeSlots = activity.timeSlots?.filter(slot => slot.isActive) || [];

                  date = new Date(activity.date).toLocaleDateString('vi-VN');
                  time = activeTimeSlots.map((slot: any) => `${slot.startTime} - ${slot.endTime}`).join(', ') || 'Chưa có';
                  timeSlots = activeTimeSlots.map((slot: any) => ({
                    name: slot.name || 'Buổi',
                    startTime: slot.startTime || '',
                    endTime: slot.endTime || '',
                    isActive: slot.isActive !== undefined ? slot.isActive : true
                  }));
                  numberOfSessions = activeTimeSlots.length;
                }

                return {
                  id: activity._id,
                  title: activity.name,
                  date: date,
                  time: time,
                  timeSlots: timeSlots,
                  location: activity.location,
                  points: activity.points || 0,
                  status: activity.status,
                  type: activity.type,
                  visibility: activity.visibility,
                  imageUrl: activity.imageUrl,
                  overview: activity.description || activity.overview, // Ưu tiên description (mô tả chi tiết)
                  numberOfSessions: numberOfSessions,
                  registeredParticipantsCount: activity.participants?.length || 0,
                  organizer: activity.responsiblePerson?.name || activity.participants?.find(p => p.role === 'Trưởng Nhóm')?.name || activity.participants?.[0]?.name || 'Chưa có',
                  organizerAvatarUrl: activity.responsiblePerson?.avatarUrl,
                  isRegistered: isRegistered,
                  maxParticipants: activity.maxParticipants,
                  approvalStatus: approvalStatus,
                  // Multiple days fields
                  isMultipleDays: isMultipleDays,
                  startDate: activity.startDate,
                  endDate: activity.endDate,
                  schedule: activity.schedule,
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
          <div className={`flex flex-col items-center justify-center ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            <Loader 
              size={64} 
              className={`animate-spin mb-6 ${
                isDarkMode ? 'text-blue-400' : 'text-blue-600'
              }`}
              strokeWidth={2}
            />
            
            <p className={`text-sm font-semibold mb-2 ${
              isDarkMode ? 'text-gray-200' : 'text-gray-700'
            }`}>
              Đang tải dữ liệu
            </p>
            
            <div className="flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${
                isDarkMode ? 'bg-blue-400' : 'bg-blue-500'
              } animate-pulse`} style={{ animationDelay: '0s' }}></span>
              <span className={`w-1.5 h-1.5 rounded-full ${
                isDarkMode ? 'bg-blue-400' : 'bg-blue-500'
              } animate-pulse`} style={{ animationDelay: '0.2s' }}></span>
              <span className={`w-1.5 h-1.5 rounded-full ${
                isDarkMode ? 'bg-blue-400' : 'bg-blue-500'
              } animate-pulse`} style={{ animationDelay: '0.4s' }}></span>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute requiredRole="CLUB_STUDENT">
        <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
          <div className={`text-center p-6 rounded-lg shadow-lg ${
            isDarkMode ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-800'
          }`}>
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
        <div className={`min-h-screen flex flex-col transition-colors duration-200 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
          <StudentNav key="student-nav" />
          
          <main className={`flex-1 max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8 w-full ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          {/* Header Section - Modern & Prominent */}
          <div className={`mb-4 sm:mb-5 rounded-2xl p-5 sm:p-6 ${
            isDarkMode 
              ? 'bg-gray-800 border border-gray-700/50' 
              : 'bg-white border border-gray-200 shadow-md'
          }`}>
            <div className="flex items-center gap-4 sm:gap-5">
              <div className={`flex-shrink-0 p-3 sm:p-4 rounded-2xl ${
                isDarkMode 
                  ? 'bg-gray-700/50' 
                  : 'bg-gray-100'
              }`}>
                <User size={28} className={isDarkMode ? 'text-gray-300' : 'text-gray-700'} strokeWidth={2.5} />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className={`text-2xl sm:text-3xl lg:text-4xl font-extrabold mb-1.5 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Chào mừng, {user?.name || 'Sinh viên'}! 👋
                </h1>
                <p className={`text-sm sm:text-base ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Khám phá và tham gia các hoạt động của CLB Sinh viên 5 Tốt
                </p>
              </div>
            </div>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className={`mb-4 p-3 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} strokeWidth={1.5} />
                <p className="text-sm">{successMessage}</p>
                <button
                  onClick={() => setSuccessMessage(null)}
                  className={`ml-auto ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} p-1 rounded`}
                >
                  <X size={14} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} strokeWidth={1.5} />
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className={`mb-4 p-3 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} strokeWidth={1.5} />
                <p className="text-sm">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className={`ml-auto ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} p-1 rounded`}
                >
                  <X size={14} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} strokeWidth={1.5} />
                </button>
              </div>
            </div>
          )}

          {/* Stats Cards - Modern & Beautiful */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-3">
            {studentStats.map((stat, index) => {
              const IconComponent = stat.icon;
              
              // Define gradient colors for each stat type
              const getGradientColors = () => {
                if (stat.title.includes('Hoạt động đã tham gia')) {
                  return isDarkMode 
                    ? 'from-blue-600/20 via-blue-500/30 to-cyan-500/20' 
                    : 'from-blue-50 via-blue-100/50 to-cyan-50';
                } else if (stat.title.includes('Điểm tích lũy')) {
                  return isDarkMode 
                    ? 'from-amber-600/20 via-yellow-500/30 to-orange-500/20' 
                    : 'from-amber-50 via-yellow-100/50 to-orange-50';
                } else if (stat.title.includes('Hoạt động đang đăng ký')) {
                  return isDarkMode 
                    ? 'from-orange-600/20 via-orange-500/30 to-red-500/20' 
                    : 'from-orange-50 via-orange-100/50 to-red-50';
                } else if (stat.title.includes('Thông báo mới')) {
                  return isDarkMode 
                    ? 'from-pink-600/20 via-rose-500/30 to-purple-500/20' 
                    : 'from-pink-50 via-rose-100/50 to-purple-50';
                }
                return isDarkMode ? 'from-gray-700/20 to-gray-600/20' : 'from-gray-50 to-gray-100';
              };

              const getIconBgGradient = () => {
                if (stat.title.includes('Hoạt động đã tham gia')) {
                  return isDarkMode 
                    ? 'bg-gradient-to-br from-blue-500/30 to-cyan-500/30' 
                    : 'bg-gradient-to-br from-blue-100 to-cyan-100';
                } else if (stat.title.includes('Điểm tích lũy')) {
                  return isDarkMode 
                    ? 'bg-gradient-to-br from-amber-500/30 to-yellow-500/30' 
                    : 'bg-gradient-to-br from-amber-100 to-yellow-100';
                } else if (stat.title.includes('Hoạt động đang đăng ký')) {
                  return isDarkMode 
                    ? 'bg-gradient-to-br from-orange-500/30 to-red-500/30' 
                    : 'bg-gradient-to-br from-orange-100 to-red-100';
                } else if (stat.title.includes('Thông báo mới')) {
                  return isDarkMode 
                    ? 'bg-gradient-to-br from-pink-500/30 to-purple-500/30' 
                    : 'bg-gradient-to-br from-pink-100 to-purple-100';
                }
                return isDarkMode ? 'bg-gray-700/30' : 'bg-gray-100';
              };

              const getBorderColor = () => {
                if (stat.title.includes('Hoạt động đã tham gia')) {
                  return isDarkMode ? 'border-blue-500/40' : 'border-blue-200';
                } else if (stat.title.includes('Điểm tích lũy')) {
                  return isDarkMode ? 'border-amber-500/40' : 'border-amber-200';
                } else if (stat.title.includes('Hoạt động đang đăng ký')) {
                  return isDarkMode ? 'border-orange-500/40' : 'border-orange-200';
                } else if (stat.title.includes('Thông báo mới')) {
                  return isDarkMode ? 'border-pink-500/40' : 'border-pink-200';
                }
                return isDarkMode ? 'border-gray-700' : 'border-gray-200';
              };
              
              return (
                <div 
                  key={index} 
                  className={`group relative rounded-xl overflow-hidden border transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${
                    isDarkMode 
                      ? `bg-gradient-to-br ${getGradientColors()} ${getBorderColor()} backdrop-blur-sm` 
                      : `bg-gradient-to-br ${getGradientColors()} ${getBorderColor()} shadow-md`
                  }`}
                  style={{
                    animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both`
                  }}
                >
                  {/* Animated background glow */}
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
                    stat.title.includes('Hoạt động đã tham gia')
                      ? 'bg-gradient-to-br from-blue-400/20 to-cyan-400/20'
                      : stat.title.includes('Điểm tích lũy')
                      ? 'bg-gradient-to-br from-amber-400/20 to-yellow-400/20'
                      : stat.title.includes('Hoạt động đang đăng ký')
                      ? 'bg-gradient-to-br from-orange-400/20 to-red-400/20'
                      : 'bg-gradient-to-br from-pink-400/20 to-purple-400/20'
                  }`} />
                  
                  {/* Decorative corner accent */}
                  <div className={`absolute top-0 right-0 w-12 h-12 opacity-10 group-hover:opacity-20 transition-opacity duration-300 ${
                    stat.title.includes('Hoạt động đã tham gia')
                      ? 'bg-gradient-to-br from-blue-400 to-cyan-400 rounded-bl-full'
                      : stat.title.includes('Điểm tích lũy')
                      ? 'bg-gradient-to-br from-amber-400 to-yellow-400 rounded-bl-full'
                      : stat.title.includes('Hoạt động đang đăng ký')
                      ? 'bg-gradient-to-br from-orange-400 to-red-400 rounded-bl-full'
                      : 'bg-gradient-to-br from-pink-400 to-purple-400 rounded-bl-full'
                  }`} />

                  <div className="relative p-3 sm:p-4 z-10">
                    {/* Icon with animated background */}
                    <div className="flex items-start justify-between mb-2">
                      <div className={`p-2 rounded-lg ${getIconBgGradient()} shadow-md group-hover:scale-110 transition-transform duration-300`}>
                        <IconComponent 
                          size={18} 
                          className={`${stat.iconColor} drop-shadow-sm`} 
                          strokeWidth={2}
                        />
                      </div>
                      {/* Change indicator */}
                      {stat.change && (
                        <div className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                          stat.changeType === 'increase'
                            ? isDarkMode ? 'bg-green-500/20 text-green-300' : 'bg-green-100 text-green-700'
                            : isDarkMode ? 'bg-red-500/20 text-red-300' : 'bg-red-100 text-red-700'
                        }`}>
                          {stat.change}
                        </div>
                      )}
                    </div>
                    
                    {/* Content */}
                    <div>
                      <p className={`text-[10px] sm:text-xs font-semibold mb-1.5 uppercase tracking-wide ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-600'
                      }`}>
                        {stat.title}
                      </p>
                      <div className="flex items-baseline gap-1.5">
                        <p className={`text-xl sm:text-2xl font-extrabold bg-gradient-to-r ${
                          stat.title.includes('Hoạt động đã tham gia')
                            ? isDarkMode ? 'from-blue-300 to-cyan-300' : 'from-blue-600 to-cyan-600'
                            : stat.title.includes('Điểm tích lũy')
                            ? isDarkMode ? 'from-amber-300 to-yellow-300' : 'from-amber-600 to-yellow-600'
                            : stat.title.includes('Hoạt động đang đăng ký')
                            ? isDarkMode ? 'from-orange-300 to-red-300' : 'from-orange-600 to-red-600'
                            : isDarkMode ? 'from-pink-300 to-purple-300' : 'from-pink-600 to-purple-600'
                        } bg-clip-text text-transparent drop-shadow-sm`}>
                          {stat.value}
                        </p>
                      </div>
                    </div>

                    {/* Animated bottom border */}
                    <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${
                      stat.title.includes('Hoạt động đã tham gia')
                        ? 'bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500'
                        : stat.title.includes('Điểm tích lũy')
                        ? 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500'
                        : stat.title.includes('Hoạt động đang đăng ký')
                        ? 'bg-gradient-to-r from-orange-500 via-red-500 to-orange-500'
                        : 'bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500'
                    } opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                  </div>

                  {/* Shimmer effect on hover */}
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                </div>
              );
            })}
          </div>

          {/* Non-Club Member Section */}
          {!user?.isClubMember && (
            <div className={`rounded-lg border p-4 mb-4 text-center ${
              isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700'
            }`}>
              <p className="text-sm mb-2">
                Bạn chưa là thành viên CLB. <button onClick={() => router.push('/student/register')} className="underline">Đăng ký ngay</button>
              </p>
            </div>
          )}

          {/* Search Bar and Filters - Professional Implementation */}
          <div className={`w-full mb-4 rounded-lg border px-3 sm:px-4 py-3 sticky top-0 z-10 ${
            isDarkMode 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-200 shadow-sm'
          }`}>
            <div className="flex flex-col lg:flex-row gap-3 items-stretch w-full">
              {/* Search Bar */}
              <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
                <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
                  <Search 
                    size={16} 
                    className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} 
                    strokeWidth={2} 
                  />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Tìm theo tên, mô tả hoặc địa điểm..."
                  className={`w-full pl-10 pr-9 py-2.5 text-sm font-medium transition-all duration-200 rounded-lg border ${
                    isDarkMode
                      ? 'bg-gray-700/50 text-white placeholder-gray-400 border-gray-600/50 focus:border-green-500/50 focus:bg-gray-700'
                      : 'bg-white text-gray-900 placeholder-gray-500 border-gray-300/50 focus:border-green-400/50 focus:bg-white'
                  } shadow-sm focus:shadow-md focus:outline-none`}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    type="button"
                    className={`absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center transition-all duration-200 rounded ${
                      isDarkMode 
                        ? 'text-gray-400 hover:bg-gray-600 hover:text-white' 
                        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                    }`}
                  >
                    <X size={14} strokeWidth={2} />
                  </button>
                )}
              </div>

              {/* Filter Button */}
              <div className="relative filter-dropdown-container flex-shrink-0">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  type="button"
                  className={`flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border transition-all whitespace-nowrap ${
                    isDarkMode
                      ? 'bg-gray-700/50 text-white border-gray-600/50 hover:border-green-500/50 hover:bg-gray-700'
                      : 'bg-white text-gray-900 border-gray-300/50 hover:border-green-400/50 hover:bg-white'
                  } shadow-sm hover:shadow-md focus:outline-none ${
                    (startDate || endDate || activityType !== 'all' || registrationFilter !== 'all' || sortOrder !== 'newest')
                      ? isDarkMode ? 'border-green-500/50 bg-green-500/10' : 'border-green-500 bg-green-50'
                      : ''
                  }`}
                >
                  <Filter size={16} strokeWidth={2} />
                  <span className="hidden sm:inline">Bộ lọc</span>
                  <ChevronDown 
                    size={14} 
                    className={`transition-transform ${showFilters ? 'rotate-180' : ''}`}
                    strokeWidth={2}
                  />
                </button>

                  {/* Filter Dropdown */}
                  {showFilters && (
                    <div className={`absolute right-0 top-full mt-2 w-[320px] sm:w-[400px] rounded-xl border-2 shadow-2xl z-20 ${
                      isDarkMode
                        ? 'bg-gray-800 border-gray-700'
                        : 'bg-white border-gray-200'
                    }`}>
                      <div className="p-4 space-y-4">
                        {/* Date Range */}
                        <div>
                          <label className={`block text-xs font-semibold mb-2 ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>
                            <CalendarDays size={14} className="inline mr-1" />
                            Khoảng thời gian
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <input
                                type="date"
                                value={startDate}
                                onChange={(e) => {
                                  setStartDate(e.target.value);
                                  setCurrentPage(1);
                                }}
                                className={`w-full px-3 py-2 text-sm rounded-lg border-2 transition-all ${
                                  isDarkMode
                                    ? 'bg-gray-700 border-gray-600 text-white focus:border-green-500'
                                    : 'bg-white border-gray-300 text-gray-900 focus:border-green-500'
                                }`}
                              />
                              <p className={`text-[10px] mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Từ ngày</p>
                            </div>
                            <div>
                              <input
                                type="date"
                                value={endDate}
                                onChange={(e) => {
                                  setEndDate(e.target.value);
                                  setCurrentPage(1);
                                }}
                                className={`w-full px-3 py-2 text-sm rounded-lg border-2 transition-all ${
                                  isDarkMode
                                    ? 'bg-gray-700 border-gray-600 text-white focus:border-green-500'
                                    : 'bg-white border-gray-300 text-gray-900 focus:border-green-500'
                                }`}
                              />
                              <p className={`text-[10px] mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Đến ngày</p>
                            </div>
                          </div>
                        </div>

                        {/* Activity Type */}
                        <div>
                          <label className={`block text-xs font-semibold mb-2 ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>
                            Loại hoạt động
                          </label>
                          <select
                            value={activityType}
                            onChange={(e) => {
                              setActivityType(e.target.value as 'all' | 'single_day' | 'multiple_days');
                              setCurrentPage(1);
                            }}
                            className={`w-full px-3 py-2 text-sm rounded-lg border-2 transition-all ${
                              isDarkMode
                                ? 'bg-gray-700 border-gray-600 text-white focus:border-green-500'
                                : 'bg-white border-gray-300 text-gray-900 focus:border-green-500'
                            }`}
                          >
                            <option value="all">Tất cả</option>
                            <option value="single_day">Một ngày</option>
                            <option value="multiple_days">Nhiều ngày</option>
                          </select>
                        </div>

                        {/* Registration Filter */}
                        <div>
                          <label className={`block text-xs font-semibold mb-2 ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>
                            Trạng thái đăng ký
                          </label>
                          <select
                            value={registrationFilter}
                            onChange={(e) => {
                              setRegistrationFilter(e.target.value as 'all' | 'registered' | 'not_registered');
                              setCurrentPage(1);
                            }}
                            className={`w-full px-3 py-2 text-sm rounded-lg border-2 transition-all ${
                              isDarkMode
                                ? 'bg-gray-700 border-gray-600 text-white focus:border-green-500'
                                : 'bg-white border-gray-300 text-gray-900 focus:border-green-500'
                            }`}
                          >
                            <option value="all">Tất cả</option>
                            <option value="registered">Đã đăng ký</option>
                            <option value="not_registered">Chưa đăng ký</option>
                          </select>
                        </div>

                        {/* Sort Order */}
                        <div>
                          <label className={`block text-xs font-semibold mb-2 ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>
                            Sắp xếp
                          </label>
                          <select
                            value={sortOrder}
                            onChange={(e) => {
                              setSortOrder(e.target.value as 'newest' | 'oldest');
                              setCurrentPage(1);
                            }}
                            className={`w-full px-3 py-2 text-sm rounded-lg border-2 transition-all ${
                              isDarkMode
                                ? 'bg-gray-700 border-gray-600 text-white focus:border-green-500'
                                : 'bg-white border-gray-300 text-gray-900 focus:border-green-500'
                            }`}
                          >
                            <option value="newest">Mới nhất</option>
                            <option value="oldest">Cũ nhất</option>
                          </select>
                        </div>

                        {/* Clear Filters Button */}
                        {(startDate || endDate || activityType !== 'all' || registrationFilter !== 'all' || sortOrder !== 'newest') && (
                          <button
                            onClick={() => {
                              setStartDate('');
                              setEndDate('');
                              setActivityType('all');
                              setRegistrationFilter('all');
                              setSortOrder('newest');
                              setCurrentPage(1);
                            }}
                            className={`w-full px-3 py-2 text-sm font-medium rounded-lg border-2 transition-all ${
                              isDarkMode
                                ? 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600'
                                : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            Xóa bộ lọc
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

          {/* Available Activities */}
          <div className={`w-full rounded-lg border mb-4 overflow-hidden flex-shrink-0 ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`} style={{ width: '100%', minWidth: '100%', maxWidth: '100%' }}>
            {/* Header */}
            <div className={`px-4 sm:px-6 py-4 sm:py-5 border-b-2 ${
              isDarkMode 
                ? 'bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 border-gray-600' 
                : 'bg-gradient-to-r from-gray-50 via-white to-gray-50 border-gray-300'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  isDarkMode 
                    ? 'bg-blue-500/20 text-blue-400' 
                    : 'bg-blue-100 text-blue-600'
                }`}>
                  <Calendar size={24} strokeWidth={2.5} />
                </div>
                <h2 className={`text-xl sm:text-2xl lg:text-3xl font-extrabold ${
                  isDarkMode 
                    ? 'text-white' 
                    : 'text-gray-900'
                }`}>
                  Hoạt động 
                </h2>
              </div>
            </div>
            
            {/* Content */}
            <div className="p-2 sm:p-4 w-full">
              {filteredActivities.length === 0 ? (
                // Empty State - Compact & Visible at Top
                <div className={`w-full min-h-[350px] md:min-h-[400px] rounded-lg border-2 border-dashed flex flex-col items-center justify-center py-12 sm:py-16 md:py-20 ${
                  isDarkMode ? 'border-gray-700 bg-gray-800/30' : 'border-gray-300 bg-gray-50'
                }`} style={{ 
                  width: '100%', 
                  maxWidth: '100%',
                  boxSizing: 'border-box'
                }}>
                  {searchQuery ? (
                    <>
                      <Search 
                        size={56} 
                        className={`mb-5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} 
                        strokeWidth={1.5} 
                      />
                      <p className={`text-lg sm:text-xl font-semibold mb-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Không tìm thấy hoạt động nào
                      </p>
                      <p className={`text-sm sm:text-base ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                        Thử tìm kiếm với từ khóa khác
                      </p>
                    </>
                  ) : (
                    <>
                      <Calendar 
                        size={56} 
                        className={`mb-5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} 
                        strokeWidth={1.5} 
                      />
                      <p className={`text-lg sm:text-xl font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Không có hoạt động nào.
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <>
                  {/* Filtered Results Info */}
                  {(searchQuery || startDate || endDate || activityType !== 'all' || registrationFilter !== 'all' || sortOrder !== 'newest') && (
                    <div className={`mb-3 px-3 py-2 rounded-lg border ${
                      isDarkMode 
                        ? 'bg-gray-800/50 border-gray-700 text-gray-300' 
                        : 'bg-gray-50 border-gray-200 text-gray-700'
                    }`}>
                      <p className="text-xs sm:text-sm">
                        Tìm thấy <span className="font-semibold">{filteredActivities.length}</span> hoạt động
                        {searchQuery && ` cho "${searchQuery}"`}
                        {(startDate || endDate || activityType !== 'all' || registrationFilter !== 'all') && (
                          <span className="ml-1">
                            {searchQuery && ' • '}
                            <span className="text-[10px] opacity-75">
                              {startDate && endDate && `Từ ${new Date(startDate).toLocaleDateString('vi-VN')} đến ${new Date(endDate).toLocaleDateString('vi-VN')}`}
                              {startDate && !endDate && `Từ ${new Date(startDate).toLocaleDateString('vi-VN')}`}
                              {!startDate && endDate && `Đến ${new Date(endDate).toLocaleDateString('vi-VN')}`}
                              {activityType !== 'all' && ` • ${activityType === 'single_day' ? 'Một ngày' : 'Nhiều ngày'}`}
                              {registrationFilter !== 'all' && ` • ${registrationFilter === 'registered' ? 'Đã đăng ký' : 'Chưa đăng ký'}`}
                              {sortOrder !== 'newest' && ' • Cũ nhất'}
                            </span>
                          </span>
                        )}
                      </p>
                    </div>
                  )}

                  {/* Pagination - Top */}
                  {!loading && filteredActivities.length > 0 && (
                    <div className={`mb-3 sm:mb-4 pb-2 sm:pb-3 border-b ${
                      isDarkMode ? 'border-gray-700' : 'border-gray-200'
                    }`}>
                      <PaginationBar
                        totalItems={filteredActivities.length}
                        currentPage={currentPage}
                        itemsPerPage={activitiesPerPage}
                        onPageChange={(page) => setCurrentPage(page)}
                        onItemsPerPageChange={(newItemsPerPage) => {
                          setActivitiesPerPage(newItemsPerPage);
                          setCurrentPage(1);
                        }}
                        itemLabel="hoạt động"
                        isDarkMode={isDarkMode}
                        itemsPerPageOptions={[6, 12, 18, 24, 30]}
                      />
                    </div>
                  )}

                  {/* Activities Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 w-full">
                    {filteredActivities
                      .slice((currentPage - 1) * activitiesPerPage, currentPage * activitiesPerPage)
                      .map((activity) => {
                    const overallStatus = getActivityOverallStatus(activity);
                    const StatusIcon = overallStatus.icon;
                    return (
                    <div key={activity.id} className={`group flex flex-col rounded-xl border-2 overflow-hidden shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02] ${
                      activity.isMultipleDays
                        ? isDarkMode 
                          ? 'bg-gray-800 border-purple-600 hover:border-purple-500' 
                          : 'bg-white border-purple-600 hover:border-purple-700'
                        : isDarkMode 
                          ? 'bg-gray-800 border-blue-600 hover:border-blue-500' 
                          : 'bg-white border-blue-600 hover:border-blue-700'
                    }`}>
                     {/* Status Banner - Compact & Modern */}
                     <div className={`${isDarkMode ? 'bg-green-600/90' : 'bg-green-600'} border-b-2 ${isDarkMode ? 'border-green-500' : 'border-green-700'} px-3 py-2 flex items-center justify-between`}>
                       <div className="flex items-center gap-2">
                         <div className="p-1 rounded-md">
                           <StatusIcon size={12} className={isDarkMode ? 'text-green-100' : 'text-white'} strokeWidth={2} />
                         </div>
                         <span className={`text-[11px] font-bold uppercase tracking-wide ${isDarkMode ? 'text-green-100' : 'text-white'}`}>{overallStatus.label}</span>
                       </div>
                       {/* Approval Status Badge - Modern */}
                       {activity.isRegistered && activity.approvalStatus && (
                         <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold border ${
                           activity.approvalStatus === 'approved'
                             ? isDarkMode ? 'bg-green-500/20 text-green-300 border-green-500/40' : 'bg-green-100 text-green-700 border-green-300'
                             : activity.approvalStatus === 'rejected'
                             ? isDarkMode ? 'bg-red-500/20 text-red-300 border-red-500/40' : 'bg-red-100 text-red-700 border-red-300'
                             : isDarkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-black border-gray-300'
                         }`}>
                           {activity.approvalStatus === 'approved' ? '✓ Đã duyệt' : activity.approvalStatus === 'rejected' ? '✗ Từ chối' : '⏳ Chờ duyệt'}
                         </div>
                       )}
                     </div>
                     {/* Image - Compact */}
                     <div className={`relative w-full h-28 overflow-hidden ${
                       isDarkMode 
                         ? 'bg-gradient-to-br from-gray-700 to-gray-800' 
                         : 'bg-gradient-to-br from-gray-100 to-gray-200'
                     }`}>
                       {activity.imageUrl ? (
                         <img
                           src={activity.imageUrl}
                           alt={activity.title}
                           className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                         />
                       ) : (
                         <div className={`w-full h-full flex items-center justify-center ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
                           <ImageIcon size={28} className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} strokeWidth={1.5} />
                         </div>
                       )}
                       {/* Activity Type Badge Overlay */}
                       {activity.isMultipleDays ? (
                         <div className="absolute top-2 right-2">
                           <span className={`px-2 py-1 rounded-md text-[10px] font-bold shadow-lg backdrop-blur-sm border ${
                             isDarkMode 
                               ? 'bg-purple-600/90 text-white border-purple-400/50' 
                               : 'bg-purple-600 text-white border-purple-700'
                           }`}>
                             📅 Nhiều ngày
                           </span>
                         </div>
                       ) : (
                         <div className="absolute top-2 right-2">
                           <span className={`px-2 py-1 rounded-md text-[10px] font-bold shadow-lg backdrop-blur-sm border ${
                             isDarkMode 
                               ? 'bg-blue-600/90 text-white border-blue-400/50' 
                               : 'bg-blue-600 text-white border-blue-700'
                           }`}>
                             📆 Một ngày
                           </span>
                         </div>
                       )}
                     </div>
                     {/* Content - Compact & Modern */}
                     <div className="p-3.5 flex-1 flex flex-col">
                       <div className="flex items-start justify-between gap-2 mb-2.5">
                         <div className="flex-1 min-w-0">
                           <h3 className={`text-sm leading-tight activity-title-gradient`}>
                             {activity.title}
                           </h3>
                         </div>
                       </div>
                       {/* Info Grid - Compact & Modern */}
                       <div className="space-y-1.5 mb-3">
                         {/* Mô tả hoạt động */}
                         <div className={`flex items-start gap-2 px-2 py-1.5 rounded-md border-2 ${
                           isDarkMode 
                             ? 'bg-transparent border-gray-700 text-gray-300' 
                             : 'bg-transparent border-black text-gray-700'
                         }`}>
                           <div className="p-1 rounded flex-shrink-0">
                             <FileText size={12} className={isDarkMode ? 'text-green-300' : 'text-green-600'} strokeWidth={2} />
                           </div>
                           <div className="flex-1 min-w-0">
                             <p className={`text-[11px] leading-relaxed line-clamp-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                               {activity.overview || 'Chưa có mô tả'}
                             </p>
                           </div>
                         </div>
                         {/* Ngày diễn ra - Smart Display */}
                         <div className={`flex items-center gap-2 px-2 py-1.5 rounded-md border-2 ${
                           isDarkMode 
                             ? 'bg-transparent border-gray-700 text-gray-300' 
                             : 'bg-transparent border-black text-gray-700'
                         }`}>
                           <div className="p-1 rounded">
                             <Calendar size={12} className={isDarkMode ? 'text-green-300' : 'text-green-600'} strokeWidth={2} />
                           </div>
                           <div className="flex-1 min-w-0">
                             {activity.isMultipleDays ? (
                               <div className="text-[11px] font-semibold">
                                 {(() => {
                                   const startDate = activity.startDate ? new Date(activity.startDate) : null;
                                   const endDate = activity.endDate ? new Date(activity.endDate) : null;
                                   if (startDate && endDate) {
                                     const startStr = startDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
                                     const endStr = endDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
                                     return `${startStr} - ${endStr}`;
                                   }
                                   return activity.date;
                                 })()}
                               </div>
                             ) : (
                               <span className="text-[11px] font-semibold">{activity.date}</span>
                             )}
                           </div>
                         </div>
                         
                         {/* Thời gian - Smart Display (Compact) */}
                         {activity.timeSlots && activity.timeSlots.length > 0 ? (
                           <div className={`px-2 py-1.5 rounded-md border-2 ${
                             isDarkMode 
                               ? 'bg-transparent border-gray-700 text-gray-300' 
                               : 'bg-transparent border-black text-gray-700'
                           }`}>
                             <div className="flex items-start gap-2">
                               <div className="p-1 rounded">
                                 <Clock size={12} className={isDarkMode ? 'text-green-300' : 'text-green-600'} strokeWidth={2} />
                               </div>
                               <div className="flex-1 min-w-0">
                                 {activity.isMultipleDays ? (
                                   // Multiple days: Show summary only
                                   <div className="text-[11px] font-bold">
                                     {(() => {
                                       const startDate = activity.startDate ? new Date(activity.startDate) : null;
                                       const endDate = activity.endDate ? new Date(activity.endDate) : null;
                                       if (startDate && endDate) {
                                         const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                                         return `${days} ngày`;
                                       }
                                       return activity.date;
                                     })()}
                                     {' • '}
                                     {activity.numberOfSessions || (activity.timeSlots?.length || 0)} buổi
                                     {activity.timeSlots.length > 2 && (
                                       <span className={`text-[10px] font-normal ml-1 ${
                                         isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                       }`}>
                                         ({activity.timeSlots.slice(0, 2).map((slot, idx) => (
                                           <span key={idx}>
                                             {slot.name} {slot.startTime}-{slot.endTime}
                                             {idx < 1 ? ', ' : ''}
                                           </span>
                                         ))}...)
                                       </span>
                                     )}
                                   </div>
                                 ) : (
                                   // Single day: Show slots with ellipsis if too many
                                   activity.timeSlots.length <= 2 ? (
                                     activity.timeSlots.map((slot, idx) => (
                                       <div key={idx} className="text-[11px] font-medium">
                                         <span className="font-bold">{slot.name}:</span> {slot.startTime} - {slot.endTime}
                                       </div>
                                     ))
                                   ) : (
                                     <>
                                       {activity.timeSlots.slice(0, 2).map((slot, idx) => (
                                         <div key={idx} className="text-[11px] font-medium">
                                           <span className="font-bold">{slot.name}:</span> {slot.startTime} - {slot.endTime}
                                         </div>
                                       ))}
                                       <div className={`text-[11px] font-medium ${
                                         isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                       }`}>
                                         ... +{activity.timeSlots.length - 2} buổi khác
                                       </div>
                                     </>
                                   )
                                 )}
                               </div>
                             </div>
                           </div>
                         ) : (
                           <div className={`flex items-center gap-2 px-2 py-1.5 rounded-md border-2 ${
                             isDarkMode 
                               ? 'bg-transparent border-gray-700 text-gray-300' 
                               : 'bg-transparent border-black text-gray-700'
                           }`}>
                             <div className="p-1 rounded">
                               <Clock size={12} className={isDarkMode ? 'text-green-300' : 'text-green-600'} strokeWidth={2} />
                             </div>
                             <span className="text-[11px] font-semibold">{activity.time}</span>
                           </div>
                         )}
                         
                         {/* Địa điểm - Smart Display */}
                         <div className={`flex items-start gap-2 px-2 py-1.5 rounded-md border-2 ${
                           isDarkMode 
                             ? 'bg-transparent border-gray-700 text-gray-300' 
                             : 'bg-transparent border-black text-gray-700'
                         }`}>
                           <div className="p-1 rounded">
                             <MapPin size={12} className={isDarkMode ? 'text-green-300' : 'text-green-600'} strokeWidth={2} />
                           </div>
                           <div className="flex-1 min-w-0">
                             {activity.isMultipleDays ? (
                               <div className="text-[11px] font-medium">
                                 {activity.location === 'Địa điểm theo buổi' || activity.location === 'Địa điểm theo ngày' ? (
                                   <span className={`italic ${
                                     isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                   }`}>
                                     {activity.location === 'Địa điểm theo buổi' ? 'Nhiều địa điểm theo buổi' : 'Nhiều địa điểm theo ngày'}
                                   </span>
                                 ) : (
                                   <span className="line-clamp-2">{activity.location}</span>
                                 )}
                               </div>
                             ) : (
                               <span className="text-[11px] font-medium line-clamp-2">{activity.location}</span>
                             )}
                           </div>
                         </div>
                         
                         {/* Đã đăng ký với progress bar */}
                         {activity.registeredParticipantsCount !== undefined && (
                           <div className={`flex flex-col gap-1.5 px-2 py-1.5 rounded-md border-2 ${
                             isDarkMode 
                               ? 'bg-transparent border-gray-700 text-gray-300' 
                               : 'bg-transparent border-black text-gray-700'
                           }`}>
                             <div className="flex items-center justify-between">
                               <div className="flex items-center gap-1.5">
                                 <div className="p-1 rounded">
                                   <Users size={11} className={isDarkMode ? 'text-green-300' : 'text-green-600'} strokeWidth={2} />
                                 </div>
                                 <span className="text-[11px] font-semibold">
                                   {activity.registeredParticipantsCount}
                                   {activity.maxParticipants && activity.maxParticipants > 0 ? `/${activity.maxParticipants}` : ''}
                                 </span>
                               </div>
                               {activity.maxParticipants && activity.maxParticipants > 0 && (
                                 <span className="text-[10px] font-medium opacity-70">
                                   {Math.round((activity.registeredParticipantsCount / activity.maxParticipants) * 100)}%
                                 </span>
                               )}
                             </div>
                             {activity.maxParticipants && activity.maxParticipants > 0 && (
                               <div className={`w-full h-2 rounded-full overflow-hidden shadow-inner ${
                                 isDarkMode ? 'bg-gray-800/50' : 'bg-gray-100'
                               }`}>
                                 <div 
                                   className={`h-full rounded-full transition-all duration-500 ease-out relative ${
                                     (activity.registeredParticipantsCount / activity.maxParticipants) >= 1
                                       ? 'bg-gradient-to-r from-red-500 via-red-500 to-red-600 shadow-lg shadow-red-500/50'
                                       : (activity.registeredParticipantsCount / activity.maxParticipants) >= 0.8
                                       ? 'bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 shadow-lg shadow-orange-500/50'
                                       : 'bg-gradient-to-r from-green-400 via-green-500 to-green-600 shadow-lg shadow-green-500/50'
                                   }`}
                                   style={{ 
                                     width: `${Math.min((activity.registeredParticipantsCount / activity.maxParticipants) * 100, 100)}%` 
                                   }}
                                 >
                                   <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                                 </div>
                               </div>
                             )}
                           </div>
                         )}
                         
                         {/* Danh sách người tham gia */}
                         {activity.participants && activity.participants.length > 0 && (
                           <div className={`px-2 py-1.5 rounded-md border-2 ${
                             isDarkMode 
                               ? 'bg-transparent border-gray-700 text-gray-300' 
                               : 'bg-transparent border-black text-gray-700'
                           }`}>
                             <div className="flex items-center justify-between mb-1.5">
                               <div className="flex items-center gap-1.5">
                                 <Users size={11} className={isDarkMode ? 'text-green-300' : 'text-green-600'} strokeWidth={2} />
                                 <span className="text-[10px] font-semibold opacity-70">Người tham gia</span>
                               </div>
                               <button
                                 onClick={() => {
                                   setSelectedActivityParticipants(activity.participants || []);
                                   setSelectedActivityTitle(activity.title);
                                   setShowParticipantsModal(true);
                                 }}
                                 className={`text-[10px] font-medium hover:underline ${
                                   isDarkMode ? 'text-blue-400' : 'text-blue-600'
                                 }`}
                               >
                                 Xem tất cả ({activity.participants.length})
                               </button>
                             </div>
                             <div className="flex items-center gap-1.5 flex-wrap">
                               {activity.participants.slice(0, 3).map((participant, idx) => (
                                 <div key={idx} className="flex items-center gap-1">
                                   {participant.avatarUrl ? (
                                     <div className={`w-5 h-5 rounded-full overflow-hidden flex-shrink-0 border ${
                                       isDarkMode ? 'border-gray-600' : 'border-gray-300'
                                     }`}>
                                       <img
                                         src={participant.avatarUrl}
                                         alt={participant.name}
                                         className="w-full h-full object-cover"
                                       />
                                     </div>
                                   ) : (
                                     <div className={`w-5 h-5 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center flex-shrink-0 border ${
                                       isDarkMode ? 'border-gray-600' : 'border-gray-300'
                                     }`}>
                                       <span className="text-[8px] font-bold text-white">
                                         {participant.name.charAt(0).toUpperCase()}
                                       </span>
                                     </div>
                                   )}
                                   <span className="text-[10px] font-medium truncate max-w-[60px]">
                                     {participant.name}
                                   </span>
                                 </div>
                               ))}
                               {activity.participants.length > 3 && (
                                 <span className={`text-[10px] ${
                                   isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                 }`}>
                                   +{activity.participants.length - 3} người khác
                                 </span>
                               )}
                             </div>
                           </div>
                         )}
                         
                         {/* Trưởng nhóm */}
                         {activity.organizer && (
                            <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md border-2 ${
                              isDarkMode 
                                ? 'bg-transparent border-gray-700 text-gray-300' 
                                : 'bg-transparent border-black text-gray-700'
                            }`}>
                              {activity.organizerAvatarUrl ? (
                                <div className={`w-5 h-5 rounded-full overflow-hidden flex-shrink-0 border-2 ${
                                  isDarkMode ? 'border-gray-400' : 'border-black'
                                }`}>
                                  <img 
                                    src={activity.organizerAvatarUrl} 
                                    alt={activity.organizer}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="p-1 rounded flex-shrink-0">
                                  <User size={11} className={isDarkMode ? 'text-green-300' : 'text-green-600'} strokeWidth={2} />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="text-[10px] font-semibold opacity-70 mb-0.5">Người phụ trách</div>
                                <span className="text-[11px] font-medium truncate block">{activity.organizer}</span>
                              </div>
                            </div>
                          )}

                         {/* Trạng thái điểm danh - Modern Badge */}
                         {activity.isRegistered && activity.approvalStatus === 'approved' && (() => {
                           const timeStatus = getActivityTimeStatus(activity);

                           // Nếu chưa đến ngày hoặc đã qua ngày, hiển thị trạng thái đặc biệt
                           if (timeStatus === 'before') {
                             return (
                               <div className={`flex items-center gap-2 px-2 py-1.5 rounded-md border ${
                                 isDarkMode 
                                   ? 'bg-blue-500/10 border-blue-500/30 text-blue-300' 
                                   : 'bg-blue-50 border-blue-200 text-blue-700'
                               }`}>
                                 <Clock size={12} className={isDarkMode ? 'text-green-300' : 'text-green-600'} strokeWidth={2} />
                                 <span className="text-[11px] font-semibold">Chưa đến ngày điểm danh</span>
                               </div>
                             );
                           }

                           if (timeStatus === 'after') {
                             return (
                               <div className={`flex items-center gap-2 px-2 py-1.5 rounded-md border ${
                                 isDarkMode 
                                   ? 'bg-gray-500/10 border-gray-500/30 text-gray-300' 
                                   : 'bg-gray-50 border-gray-200 text-gray-700'
                               }`}>
                                 <XCircle size={12} className={isDarkMode ? 'text-gray-300' : 'text-gray-600'} strokeWidth={2} />
                                 <span className="text-[11px] font-semibold">Hoạt động đã kết thúc</span>
                               </div>
                             );
                           }

                           // Đang trong thời gian hoạt động - hiển thị thông tin điểm danh
                           const activityRecords = attendanceRecords[activity.id] || [];

                           if (activity.isMultipleDays) {
                             // For multiple days activities, calculate attendance across all days
                             let totalSlots = 0;
                             let completedSlots = 0;

                             // Count total slots and completed slots from schedule
                             if (activity.schedule && activity.schedule.length > 0) {
                               activity.schedule.forEach((scheduleItem) => {
                                 const scheduleText = scheduleItem.activities || '';
                                 const lines = scheduleText.split('\n').filter(line => line.trim());

                                 lines.forEach((line: string) => {
                                   if (line.includes('Buổi Sáng') || line.includes('Buổi Chiều') || line.includes('Buổi Tối')) {
                                     totalSlots++;

                                     // Check if this slot has been completed (both start and end approved)
                                     const slotName = line.includes('Buổi Sáng') ? 'Buổi Sáng' :
                                                    line.includes('Buổi Chiều') ? 'Buổi Chiều' : 'Buổi Tối';

                                     const startRecord = activityRecords.find(
                                       (r) => r.timeSlot === slotName && r.checkInType === 'start' && r.status === 'approved'
                                     );
                                     const endRecord = activityRecords.find(
                                       (r) => r.timeSlot === slotName && r.checkInType === 'end' && r.status === 'approved'
                                     );

                                     if (startRecord && endRecord) {
                                       completedSlots++;
                                     }
                                   }
                                 });
                               });
                             }

                             const isCompleted = completedSlots === totalSlots && totalSlots > 0;
                             const hasAnyAttendance = activityRecords.length > 0;

                             return (
                               <div className={`flex items-center gap-2 px-2 py-1.5 rounded-md border ${
                                 isCompleted
                                   ? isDarkMode 
                                     ? 'bg-green-500/10 border-green-500/30 text-green-300' 
                                     : 'bg-green-50 border-green-200 text-green-700'
                                   : hasAnyAttendance
                                   ? isDarkMode 
                                     ? 'bg-orange-500/10 border-orange-500/30 text-orange-300' 
                                     : 'bg-orange-50 border-orange-200 text-orange-700'
                                   : isDarkMode 
                                     ? 'bg-red-500/10 border-red-500/30 text-red-300' 
                                     : 'bg-red-50 border-red-200 text-red-700'
                               }`}>
                                 {isCompleted ? (
                                   <CheckCircle2 size={12} className={isDarkMode ? 'text-green-300' : 'text-green-600'} strokeWidth={2} />
                                 ) : hasAnyAttendance ? (
                                   <Clock size={12} className={isDarkMode ? 'text-orange-300' : 'text-orange-600'} strokeWidth={2} />
                                 ) : (
                                   <AlertCircle size={12} className={isDarkMode ? 'text-red-300' : 'text-red-600'} strokeWidth={2} />
                                 )}
                                 <span className="text-[11px] font-bold">
                                   {isCompleted
                                     ? '✓ Đã hoàn thành'
                                     : totalSlots === 1
                                     ? 'Chưa hoàn thành'
                                     : totalSlots > 1
                                     ? `Đã đi ${completedSlots}/${totalSlots} buổi`
                                     : 'Chưa điểm danh'}
                                 </span>
                               </div>
                             );
                           } else {
                             // For single day activities (existing logic)
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
                               <div className={`flex items-center gap-2 px-2 py-1.5 rounded-md border ${
                                 isCompleted
                                   ? isDarkMode 
                                     ? 'bg-green-500/10 border-green-500/30 text-green-300' 
                                     : 'bg-green-50 border-green-200 text-green-700'
                                   : hasAnyAttendance
                                   ? isDarkMode 
                                     ? 'bg-orange-500/10 border-orange-500/30 text-orange-300' 
                                     : 'bg-orange-50 border-orange-200 text-orange-700'
                                   : isDarkMode 
                                     ? 'bg-red-500/10 border-red-500/30 text-red-300' 
                                     : 'bg-red-50 border-red-200 text-red-700'
                               }`}>
                                 {isCompleted ? (
                                   <CheckCircle2 size={12} className={isDarkMode ? 'text-green-300' : 'text-green-600'} strokeWidth={2} />
                                 ) : hasAnyAttendance ? (
                                   <Clock size={12} className={isDarkMode ? 'text-orange-300' : 'text-orange-600'} strokeWidth={2} />
                                 ) : (
                                   <AlertCircle size={12} className={isDarkMode ? 'text-red-300' : 'text-red-600'} strokeWidth={2} />
                                 )}
                                 <span className="text-[11px] font-bold">
                                   {isCompleted
                                     ? '✓ Đã hoàn thành'
                                     : totalSlots === 1
                                     ? 'Chưa hoàn thành'
                                     : totalSlots > 1
                                     ? `Đã đi ${completedSlots}/${totalSlots} buổi`
                                     : 'Chưa điểm danh'}
                                 </span>
                               </div>
                             );
                           }
                         })()}
                       </div>
                       {/* Action Buttons - Modern & Compact */}
                       <div className={`flex gap-2 mt-auto pt-3 border-t-2 ${
                         isDarkMode ? 'border-green-500' : 'border-green-600'
                       }`}>
                         <button
                           onClick={() => handleRegisterActivity(activity.id, activity.title)}
                           disabled={registeringActivities.has(activity.id) || !!(
                             activity.maxParticipants && 
                             activity.registeredParticipantsCount !== undefined && 
                             activity.maxParticipants > 0 &&
                             activity.registeredParticipantsCount >= activity.maxParticipants && 
                             !activity.isRegistered
                           )}
                           className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold transition-all duration-200 border-2 ${
                             activity.isRegistered
                               ? isDarkMode 
                                 ? 'bg-gray-700 text-gray-200 border-gray-600 hover:bg-gray-600 hover:border-gray-500' 
                                 : 'bg-gray-200 text-gray-800 border-gray-300 hover:bg-gray-300 hover:border-gray-400'
                               : (activity.maxParticipants && activity.registeredParticipantsCount && activity.registeredParticipantsCount >= activity.maxParticipants)
                               ? isDarkMode 
                                 ? 'bg-gray-700/50 text-gray-500 border-gray-700 cursor-not-allowed' 
                                 : 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                               : registeringActivities.has(activity.id)
                               ? isDarkMode 
                                 ? 'bg-gray-700/50 text-gray-500 border-gray-700 cursor-wait' 
                                 : 'bg-gray-200 text-gray-500 border-gray-300 cursor-wait'
                               : isDarkMode 
                                 ? 'bg-gradient-to-r from-green-600 to-green-700 text-white border-green-500 hover:from-green-500 hover:to-green-600 shadow-lg' 
                                 : 'bg-gradient-to-r from-green-600 to-green-700 text-white border-green-700 hover:from-green-700 hover:to-green-800 shadow-lg'
                           }`}
                         >
                           {registeringActivities.has(activity.id) 
                             ? '⏳ Đang xử lý...' 
                             : activity.isRegistered
                             ? '✗ Hủy đăng ký'
                             : (activity.maxParticipants && activity.registeredParticipantsCount && activity.registeredParticipantsCount >= activity.maxParticipants)
                             ? '🔒 Đã đầy'
                             : '✓ Đăng ký'}
                         </button>
                         <button
                           onClick={() => { router.push(`/student/activities/${activity.id}`); }}
                           className={`flex-1 border-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all duration-200 ${
                             isDarkMode 
                               ? 'border-gray-600 text-gray-200 hover:bg-gray-700 hover:border-gray-500' 
                               : 'border-gray-900 text-gray-900 hover:bg-gray-50 hover:border-gray-800'
                           }`}
                         >
                           <Eye size={12} className="inline mr-1.5" strokeWidth={2.5} />
                           Chi tiết
                         </button>
                       </div>
                     </div>
                    </div>
                    );
                      })}
                  </div>
                  {/* Pagination - Bottom */}
                  {!loading && filteredActivities.length > 0 && (
                    <div className={`mt-3 sm:mt-4 pt-2 sm:pt-3 border-t ${
                      isDarkMode ? 'border-gray-700' : 'border-gray-200'
                    }`}>
                      <PaginationBar
                        totalItems={filteredActivities.length}
                        currentPage={currentPage}
                        itemsPerPage={activitiesPerPage}
                        onPageChange={(page) => setCurrentPage(page)}
                        onItemsPerPageChange={(newItemsPerPage) => {
                          setActivitiesPerPage(newItemsPerPage);
                          setCurrentPage(1);
                        }}
                        itemLabel="hoạt động"
                        isDarkMode={isDarkMode}
                        itemsPerPageOptions={[6, 12, 18, 24, 30]}
                      />
                    </div>
                  )}
                </>
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

        <Footer isDarkMode={isDarkMode} />

          {/* Participants Modal */}
        {showParticipantsModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4" onClick={() => setShowParticipantsModal(false)}>
            <div 
              className={`max-w-2xl w-full max-h-[90vh] sm:max-h-[80vh] overflow-hidden rounded-lg sm:rounded-xl shadow-2xl ${
                isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              } border`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className={`px-3 sm:px-6 py-3 sm:py-4 border-b ${
                isDarkMode ? 'border-gray-700' : 'border-gray-200'
              }`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-base sm:text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Danh sách người tham gia
                    </h3>
                    <p className={`text-xs sm:text-sm mt-1 truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {selectedActivityTitle}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowParticipantsModal(false)}
                    className={`p-1.5 sm:p-2 rounded-lg transition-colors flex-shrink-0 ${
                      isDarkMode 
                        ? 'hover:bg-gray-700 text-gray-300' 
                        : 'hover:bg-gray-100 text-gray-600'
                    }`}
                  >
                    <X size={18} className="sm:w-5 sm:h-5" strokeWidth={2} />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-3 sm:p-6 overflow-y-auto max-h-[calc(90vh-140px)] sm:max-h-[calc(80vh-120px)]">
                {selectedActivityParticipants.length === 0 ? (
                  <div className="text-center py-8">
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Chưa có người tham gia
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedActivityParticipants.map((participant, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border ${
                          isDarkMode 
                            ? 'bg-gray-700/50 border-gray-600 hover:bg-gray-700' 
                            : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                        } transition-colors`}
                      >
                        {participant.avatarUrl ? (
                          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden flex-shrink-0 border-2 ${
                            isDarkMode ? 'border-gray-600' : 'border-gray-300'
                          }`}>
                            <img
                              src={participant.avatarUrl}
                              alt={participant.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center flex-shrink-0 border-2 ${
                            isDarkMode ? 'border-gray-600' : 'border-gray-300'
                          }`}>
                            <span className="text-sm sm:text-lg font-bold text-white">
                              {participant.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                            <p className={`text-sm sm:text-base font-semibold truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              {participant.name}
                            </p>
                            {participant.approvalStatus && (
                              <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-medium whitespace-nowrap ${
                                participant.approvalStatus === 'approved'
                                  ? isDarkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-700'
                                  : participant.approvalStatus === 'rejected'
                                  ? isDarkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-700'
                                  : isDarkMode ? 'bg-yellow-900/30 text-yellow-300' : 'bg-yellow-100 text-yellow-700'
                              }`}>
                                {participant.approvalStatus === 'approved' ? 'Đã duyệt' : 
                                 participant.approvalStatus === 'rejected' ? 'Từ chối' : 'Chờ duyệt'}
                              </span>
                            )}
                          </div>
                          <p className={`text-xs sm:text-sm mt-0.5 truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {participant.email}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className={`px-3 sm:px-6 py-3 sm:py-4 border-t ${
                isDarkMode ? 'border-gray-700' : 'border-gray-200'
              }`}>
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-xs sm:text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Tổng cộng: <span className="font-semibold">{selectedActivityParticipants.length}</span> người
                  </p>
                  <button
                    onClick={() => setShowParticipantsModal(false)}
                    className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                      isDarkMode 
                        ? 'bg-gray-700 text-white hover:bg-gray-600' 
                        : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                    }`}
                  >
                    Đóng
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