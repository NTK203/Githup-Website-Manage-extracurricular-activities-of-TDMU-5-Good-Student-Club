'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  Loader,
  CheckSquare,
  Info,
  Zap,
  Sunrise,
  Sun,
  Moon,
  CalendarRange,
  UserPlus,
  Loader2,
  Trash2
} from 'lucide-react';
import StudentNav from '@/components/student/StudentNav';
import Footer from '@/components/common/Footer';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import PaginationBar from '@/components/common/PaginationBar';
import RegistrationModal from '@/components/student/RegistrationModal';
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
  approvalStatus?: 'pending' | 'approved' | 'rejected' | 'removed'; // Approval status
  registrationThreshold?: number; // Ngưỡng đăng ký tối thiểu (%)
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
  registrationThreshold?: number; // Ngưỡng đăng ký tối thiểu (%)
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
  const rightColumnScrollRef = useRef<HTMLDivElement>(null);
  const [isScrollingPaused, setIsScrollingPaused] = useState(false);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  
  // Banner/Slider states
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const bannerSliderRef = useRef<HTMLDivElement>(null);
  const [banners, setBanners] = useState<Array<{
    id: string;
    title: string;
    imageUrl: string;
    link?: string | null;
    imageFit?: string;
  }>>([]);

  // Load banners
  useEffect(() => {
    const loadBanners = async () => {
      try {
        const response = await fetch('/api/banners?activeOnly=true');
        const result = await response.json();
        if (result.success && result.data) {
          // Filter and sort active banners
          const activeBanners = result.data
            .filter((b: any) => b.isActive)
            .sort((a: any, b: any) => a.order - b.order);
          setBanners(activeBanners);
        }
      } catch (error) {
        console.error('Error loading banners:', error);
        // Fallback to default banner if API fails
        setBanners([{
          id: 'default',
          title: 'CLB Sinh viên 5 Tốt TDMU',
          imageUrl: 'https://via.placeholder.com/1200x400/6366f1/ffffff?text=CLB+Sinh+viên+5+Tốt+TDMU',
          imageFit: 'cover'
        }]);
      }
    };
    loadBanners();
  }, []);

  // Banner auto-play effect
  useEffect(() => {
    if (banners.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [banners]);
  const [selectedActivityParticipants, setSelectedActivityParticipants] = useState<Array<{
    userId: string;
    name: string;
    email: string;
    avatarUrl?: string;
    approvalStatus?: 'pending' | 'approved' | 'rejected';
  }>>([]);
  const [selectedActivityTitle, setSelectedActivityTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Registration modal states
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [selectedActivityForRegistration, setSelectedActivityForRegistration] = useState<ActivityItem | null>(null);
  const [selectedDaySlotsForRegistration, setSelectedDaySlotsForRegistration] = useState<Array<{ day: number; slot: 'morning' | 'afternoon' | 'evening' }>>([]);
  const [showSingleDayRegistrationModal, setShowSingleDayRegistrationModal] = useState(false);
  const [selectedSingleDaySlots, setSelectedSingleDaySlots] = useState<Array<'morning' | 'afternoon' | 'evening'>>([]);
  const [overlapWarning, setOverlapWarning] = useState<{
    show: boolean;
    overlappingActivities: Array<{ activityName: string; day: number; slot: string; date?: string; startTime?: string; endTime?: string }>;
    day: number;
    slot: string;
    date?: string; // Add date for the selected day
    currentActivityName?: string; // Add current activity name
    currentSlotStartTime?: string; // Add current slot start time
    currentSlotEndTime?: string; // Add current slot end time
  } | null>(null);
  const [parsedScheduleData, setParsedScheduleData] = useState<Array<{
    day: number;
    date: string;
    slots: Array<{
      name: string;
      slotKey: 'morning' | 'afternoon' | 'evening';
      startTime: string;
      endTime: string;
      mapLocation?: { lat: number; lng: number; address: string; radius: number };
      detailedLocation?: string;
    }>;
    dayMapLocation?: { lat: number; lng: number; address: string; radius: number };
    dayDetailedLocation?: string;
  }>>([]);
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set());
  
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
        // Sử dụng user từ context
        const currentUser = user;
        
        // Refetch user data trong background (không block UI)
        if (isAuthenticated && token) {
          // Refetch ngay lập tức nhưng không đợi kết quả
          refetchUser().catch(() => {
            // Silent fail - không ảnh hưởng đến UI
          });
        }

        // Calculate student stats from activities data (will be updated after fetching activities)
        // Initial stats will be set after activities are fetched

        // Fetch available activities (có thể fetch mà không cần token để xem public activities)
        const activitiesResponse = await fetch('/api/activities', {
          headers: token ? {
            Authorization: `Bearer ${token}`,
          } : {},
        });
        
        if (!activitiesResponse.ok) {
          const errorData = await activitiesResponse.json().catch(() => ({}));
          const errorMessage = errorData.message || `HTTP ${activitiesResponse.status}: ${activitiesResponse.statusText}`;
          throw new Error(`Failed to fetch available activities: ${errorMessage}`);
        }
        
        const responseData = await activitiesResponse.json();
        
        if (!responseData.success) {
          throw new Error(responseData.message || 'Failed to fetch available activities');
        }
        
        if (!responseData.data || !Array.isArray(responseData.data.activities)) {
          console.error('Invalid response format:', responseData);
          throw new Error('Invalid response format from activities API');
        }
        
        const activitiesData: RawActivity[] = responseData.data.activities;
        // Filter activities: exclude draft status, and filter by visibility
        const filteredActivities = activitiesData.filter((activity: RawActivity) => {
          // Exclude draft activities
          if (activity.status === 'draft') {
            return false;
          }
          // Filter by visibility
          // If user is not authenticated or role is STUDENT, only show public activities
          if (!isAuthenticated || !currentUser || currentUser?.role === 'STUDENT') {
            return activity.visibility === 'public'; // Unauthenticated users and students only see public activities
          } else {
            return true; // Other roles (CLUB_LEADER, CLUB_DEPUTY, CLUB_MEMBER) can see all non-draft activities (public and private)
          }
        }).map((activity: RawActivity) => {
          // Check if current user is already registered and get approval status (chỉ khi đã đăng nhập)
          let isRegistered = false;
          let approvalStatus: 'pending' | 'approved' | 'rejected' | 'removed' | undefined = undefined;

          if (isAuthenticated && currentUser) {
            const userParticipant = activity.participants?.find((p: any) => {
              const userId = typeof p.userId === 'object' && p.userId !== null
                ? (p.userId._id || p.userId.$oid || String(p.userId))
                : (p.userId?.$oid || p.userId);
              return userId === currentUser?._id;
            });

            if (userParticipant) {
              const participantApprovalStatus = (userParticipant as any).approvalStatus || 'pending';
              
              // If participant is removed, they are not considered registered
              if (participantApprovalStatus === 'removed') {
                isRegistered = false;
                approvalStatus = 'removed';
              } else {
                // For multiple days activities, user must have selected at least one slot to be considered "registered"
                const isMultipleDays = activity.type === 'multiple_days';
                if (isMultipleDays) {
                  const registeredSlots = (userParticipant as any).registeredDaySlots || [];
                  // Only consider registered if user has selected at least one slot
                  if (registeredSlots.length > 0) {
              isRegistered = true;
                    approvalStatus = participantApprovalStatus;
                  } else {
                    // User is in participants but hasn't selected any slots yet - not fully registered
                    isRegistered = false;
                    approvalStatus = undefined;
                  }
                } else {
                  // For single day activities, being in participants means registered
                  isRegistered = true;
                  approvalStatus = participantApprovalStatus;
                }
              }
            }
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
            registeredParticipantsCount: activity.participants?.filter((p: any) => {
              const approvalStatus = p.approvalStatus || 'pending';
              return approvalStatus === 'approved';
            }).length || 0,
            organizer: activity.responsiblePerson?.name || activity.participants?.find(p => p.role === 'Trưởng Nhóm')?.name || activity.participants?.[0]?.name || 'Chưa có',
            organizerAvatarUrl: activity.responsiblePerson?.avatarUrl,
            isRegistered: isRegistered,
            maxParticipants: activity.maxParticipants,
            approvalStatus: approvalStatus,
            registrationThreshold: activity.registrationThreshold,
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

        // Fetch unread notifications count (chỉ khi đã đăng nhập)
        let unreadNotifications = 0;
        if (isAuthenticated && token) {
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
        }

        // Chỉ set stats khi đã đăng nhập
        if (isAuthenticated) {
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
        } else {
          // Nếu chưa đăng nhập, set stats rỗng
          setStudentStats([]);
        }

        // Load attendance records for approved activities (lazy load - chỉ fetch khi cần)
        // Chỉ fetch cho activities đang diễn ra hoặc sắp diễn ra để tối ưu performance
        if (isAuthenticated && token) {
          const now = new Date();
          const relevantActivities = filteredActivities.filter(activity => {
            if (!activity.isRegistered || activity.approvalStatus !== 'approved') return false;
            
            // Chỉ fetch cho activities đang diễn ra hoặc sắp diễn ra (trong vòng 7 ngày)
            try {
              let activityDate: Date | null = null;
              if (activity.isMultipleDays) {
                activityDate = activity.startDate ? new Date(activity.startDate) : null;
              } else {
                const dateParts = activity.date.split('/');
                if (dateParts.length === 3) {
                  activityDate = new Date(
                    parseInt(dateParts[2]),
                    parseInt(dateParts[1]) - 1,
                    parseInt(dateParts[0])
                  );
                }
              }
              
              if (!activityDate || isNaN(activityDate.getTime())) return false;
              
              // Chỉ fetch cho activities trong vòng 7 ngày tới hoặc đã qua (để hiển thị trạng thái)
              const daysDiff = Math.ceil((activityDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              return daysDiff >= -1 && daysDiff <= 7;
            } catch {
              return false;
            }
          });

          // Fetch attendance records trong background (không block UI)
          if (relevantActivities.length > 0) {
            Promise.all(
              relevantActivities.map(async (activity) => {
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
              })
            ).then((attendanceResults) => {
              const attendanceMap: Record<string, AttendanceRecord[]> = {};
              attendanceResults.forEach(({ activityId, records }) => {
                attendanceMap[activityId] = records;
              });
              setAttendanceRecords(prev => ({ ...prev, ...attendanceMap }));
            }).catch((err) => {
              console.error('Error loading attendance records:', err);
            });
          }
        }

        // Fetch recent participations (if user is a club member and authenticated)
        if (isAuthenticated && currentUser?.isClubMember) {
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

    // Fetch data ngay cả khi chưa đăng nhập (để hiển thị public activities)
    console.log('Frontend - User:', user);
    console.log('Frontend - Token:', token ? 'Token available' : 'No token');
    console.log('Frontend - isAuthenticated:', isAuthenticated);
    fetchData();
  }, [isAuthenticated, token, user?.isClubMember, user?.role]);

  // Reload attendance records when page becomes visible (user returns from attendance page)
  // Sử dụng debounce để tránh fetch quá nhiều lần
  useEffect(() => {
    let debounceTimer: NodeJS.Timeout | null = null;
    let lastFetchTime = 0;
    const MIN_FETCH_INTERVAL = 5000; // Chỉ fetch lại sau ít nhất 5 giây

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && isAuthenticated && token && availableActivities.length > 0) {
        const now = Date.now();
        
        // Chỉ fetch nếu đã qua ít nhất MIN_FETCH_INTERVAL kể từ lần fetch cuối
        if (now - lastFetchTime < MIN_FETCH_INTERVAL) {
          return;
        }

        // Debounce để tránh fetch nhiều lần liên tiếp
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }

        debounceTimer = setTimeout(async () => {
          lastFetchTime = Date.now();
          
          // Chỉ reload cho activities đang diễn ra hoặc sắp diễn ra
          const now = new Date();
          const relevantActivities = availableActivities.filter(activity => {
            if (!activity.isRegistered || activity.approvalStatus !== 'approved') return false;
            
            try {
              let activityDate: Date | null = null;
              if (activity.isMultipleDays) {
                activityDate = activity.startDate ? new Date(activity.startDate) : null;
              } else {
                const dateParts = activity.date.split('/');
                if (dateParts.length === 3) {
                  activityDate = new Date(
                    parseInt(dateParts[2]),
                    parseInt(dateParts[1]) - 1,
                    parseInt(dateParts[0])
                  );
                }
              }
              
              if (!activityDate || isNaN(activityDate.getTime())) return false;
              
              const daysDiff = Math.ceil((activityDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              return daysDiff >= -1 && daysDiff <= 7;
            } catch {
              return false;
            }
          });

          if (relevantActivities.length === 0) return;

          // Fetch trong background
          Promise.all(
            relevantActivities.map(async (activity) => {
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
            })
          ).then((attendanceResults) => {
            const attendanceMap: Record<string, AttendanceRecord[]> = {};
            attendanceResults.forEach(({ activityId, records }) => {
              attendanceMap[activityId] = records;
            });
            setAttendanceRecords(prev => ({ ...prev, ...attendanceMap }));
          }).catch((err) => {
            console.error('Error reloading attendance records:', err);
          });
        }, 300); // Debounce 300ms
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
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

  // State for countdown timer
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second for countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Helper function to check if activity is tomorrow
  const isActivityTomorrow = (activity: ActivityItem): boolean => {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      if (activity.isMultipleDays) {
        const startDate = activity.startDate ? new Date(activity.startDate) : null;
        if (!startDate) return false;

        const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
        return startDateOnly.getTime() === tomorrow.getTime();
      } else {
        const dateParts = activity.date.split('/');
        if (dateParts.length !== 3) return false;

        const activityDate = new Date(
          parseInt(dateParts[2]),
          parseInt(dateParts[1]) - 1,
          parseInt(dateParts[0])
        );

        if (isNaN(activityDate.getTime())) return false;

        const activityDateOnly = new Date(
          activityDate.getFullYear(),
          activityDate.getMonth(),
          activityDate.getDate()
        );

        return activityDateOnly.getTime() === tomorrow.getTime();
      }
    } catch (e) {
      return false;
    }
  };

  // Helper function to get time until first slot of tomorrow's activity
  const getTimeUntilFirstSlot = (activity: ActivityItem): { hours: number; minutes: number; seconds: number } | null => {
    try {
      const now = currentTime;
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      let firstSlotTime: Date | null = null;

      if (activity.isMultipleDays) {
        const startDate = activity.startDate ? new Date(activity.startDate) : null;
        if (!startDate) return null;

        const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
        if (startDateOnly.getTime() !== tomorrow.getTime()) return null;

        // Find first slot from schedule
        if (activity.schedule && activity.schedule.length > 0) {
          const tomorrowStr = tomorrow.toISOString().split('T')[0];
          const tomorrowSchedule = activity.schedule.find(s => s.date.startsWith(tomorrowStr));

          if (tomorrowSchedule && tomorrowSchedule.activities) {
            const lines = tomorrowSchedule.activities.split('\n').filter(line => line.trim());

            for (const line of lines) {
              if (line.includes('Buổi Sáng') || line.includes('Buổi Chiều') || line.includes('Buổi Tối')) {
                const timeMatch = line.match(/(\d{2}:\d{2})-(\d{2}:\d{2})/);
                if (timeMatch) {
                  const [startHours, startMinutes] = timeMatch[1].split(':').map(Number);
                  const slotStartTime = new Date(tomorrow);
                  slotStartTime.setHours(startHours, startMinutes, 0, 0);

                  // Subtract 15 minutes (check-in window starts 15 min before)
                  const checkInStartTime = new Date(slotStartTime);
                  checkInStartTime.setMinutes(checkInStartTime.getMinutes() - 15);

                  if (!firstSlotTime || checkInStartTime.getTime() < firstSlotTime.getTime()) {
                    firstSlotTime = checkInStartTime;
                  }
                }
              }
            }
          }
        }
      } else {
        const dateParts = activity.date.split('/');
        if (dateParts.length !== 3) return null;

        const activityDate = new Date(
          parseInt(dateParts[2]),
          parseInt(dateParts[1]) - 1,
          parseInt(dateParts[0])
        );

        if (isNaN(activityDate.getTime())) return null;

        const activityDateOnly = new Date(
          activityDate.getFullYear(),
          activityDate.getMonth(),
          activityDate.getDate()
        );

        if (activityDateOnly.getTime() !== tomorrow.getTime()) return null;

        // Find first slot
        if (activity.timeSlots && activity.timeSlots.length > 0) {
          for (const slot of activity.timeSlots.filter(s => s.isActive)) {
            const [startHours, startMinutes] = slot.startTime.split(':').map(Number);
            const slotStartTime = new Date(activityDate);
            slotStartTime.setHours(startHours, startMinutes, 0, 0);

            // Subtract 15 minutes (check-in window starts 15 min before)
            const checkInStartTime = new Date(slotStartTime);
            checkInStartTime.setMinutes(checkInStartTime.getMinutes() - 15);

            if (!firstSlotTime || checkInStartTime.getTime() < firstSlotTime.getTime()) {
              firstSlotTime = checkInStartTime;
            }
          }
        }
      }

      if (!firstSlotTime) return null;

      // Calculate time difference
      const diff = firstSlotTime.getTime() - now.getTime();
      if (diff <= 0) return null;

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      return { hours, minutes, seconds };
    } catch (e) {
      return null;
    }
  };

  // Helper function to check if activity needs check-in
  // Check-in window: 15 minutes before check-in time to 15 minutes after check-in time
  // Example: If check-in is at 7h, window is 6h45-7h15 (đúng giờ), 7h16-7h30 (trễ), after 7h30 = không được điểm danh
  const isActivityNeedingCheckIn = (activity: ActivityItem): boolean => {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      if (activity.isMultipleDays) {
        const startDate = activity.startDate ? new Date(activity.startDate) : null;
        const endDate = activity.endDate ? new Date(activity.endDate) : null;

        if (!startDate || !endDate) {
          return false;
        }

        const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
        const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

        if (today.getTime() < startDateOnly.getTime() || today.getTime() > endDateOnly.getTime()) {
          return false;
        }

        if (activity.schedule && activity.schedule.length > 0) {
          const todayStr = today.toISOString().split('T')[0];
          const todayDateStr = today.toLocaleDateString('en-CA');
          
          let todaySchedule = activity.schedule.find(s => {
            if (!s.date) return false;
            const scheduleDate = new Date(s.date);
            if (isNaN(scheduleDate.getTime())) return false;
            const scheduleDateOnly = new Date(
              scheduleDate.getFullYear(),
              scheduleDate.getMonth(),
              scheduleDate.getDate()
            );
            return scheduleDateOnly.getTime() === today.getTime();
          });

          if (!todaySchedule) {
            todaySchedule = activity.schedule.find(s => {
              if (!s.date) return false;
              const dateStr = String(s.date);
              return dateStr.startsWith(todayStr) || dateStr.startsWith(todayDateStr);
            });
          }

          if (todaySchedule && todaySchedule.activities) {
            const lines = todaySchedule.activities.split('\n').filter(line => line.trim());

            for (const line of lines) {
              if (line.includes('Buổi Sáng') || line.includes('Buổi Chiều') || line.includes('Buổi Tối')) {
                const timeMatch = line.match(/(\d{2}:\d{2})-(\d{2}:\d{2})/);
                if (timeMatch) {
                  const [startHours, startMinutes] = timeMatch[1].split(':').map(Number);
                  const [endHours, endMinutes] = timeMatch[2].split(':').map(Number);

                  const slotStartTime = new Date(today);
                  slotStartTime.setHours(startHours, startMinutes, 0, 0);

                  const slotEndTime = new Date(today);
                  slotEndTime.setHours(endHours, endMinutes, 0, 0);

                  // Start check-in window: 15 min before to 15 min after start time (6h45-7h15)
                  const startCheckInWindowStart = new Date(slotStartTime);
                  startCheckInWindowStart.setMinutes(startCheckInWindowStart.getMinutes() - 15);
                  const startCheckInWindowEnd = new Date(slotStartTime);
                  startCheckInWindowEnd.setMinutes(startCheckInWindowEnd.getMinutes() + 15);

                  // End check-in window: 15 min before to 15 min after end time
                  const endCheckInWindowStart = new Date(slotEndTime);
                  endCheckInWindowStart.setMinutes(endCheckInWindowStart.getMinutes() - 15);
                  const endCheckInWindowEnd = new Date(slotEndTime);
                  endCheckInWindowEnd.setMinutes(endCheckInWindowEnd.getMinutes() + 15);

                  // Check if within either check-in window (6h30-7h30 for start, or similar for end)
                  if ((now.getTime() >= startCheckInWindowStart.getTime() && now.getTime() <= startCheckInWindowEnd.getTime()) ||
                      (now.getTime() >= endCheckInWindowStart.getTime() && now.getTime() <= endCheckInWindowEnd.getTime())) {
                    return true;
                  }
                }
              }
            }
          }
        }

        return false;
      } else {
        // Single day activity
        const dateParts = activity.date.split('/');
        if (dateParts.length !== 3) {
          return false;
        }

        const activityDate = new Date(
          parseInt(dateParts[2]),
          parseInt(dateParts[1]) - 1,
          parseInt(dateParts[0])
        );

        if (isNaN(activityDate.getTime())) {
          return false;
        }

        const activityDateOnly = new Date(
          activityDate.getFullYear(),
          activityDate.getMonth(),
          activityDate.getDate()
        );

        if (today.getTime() !== activityDateOnly.getTime()) {
          return false;
        }

        if (activity.timeSlots && activity.timeSlots.length > 0) {
          for (const slot of activity.timeSlots.filter(s => s.isActive)) {
            const [startHours, startMinutes] = slot.startTime.split(':').map(Number);
            const [endHours, endMinutes] = slot.endTime.split(':').map(Number);

            const slotStartTime = new Date(activityDate);
            slotStartTime.setHours(startHours, startMinutes, 0, 0);

            const slotEndTime = new Date(activityDate);
            slotEndTime.setHours(endHours, endMinutes, 0, 0);

            // Start check-in window: 15 min before to 15 min after start time
            const startCheckInWindowStart = new Date(slotStartTime);
            startCheckInWindowStart.setMinutes(startCheckInWindowStart.getMinutes() - 15);
            const startCheckInWindowEnd = new Date(slotStartTime);
            startCheckInWindowEnd.setMinutes(startCheckInWindowEnd.getMinutes() + 15);

            // End check-in window: 15 min before to 15 min after end time
            const endCheckInWindowStart = new Date(slotEndTime);
            endCheckInWindowStart.setMinutes(endCheckInWindowStart.getMinutes() - 15);
            const endCheckInWindowEnd = new Date(slotEndTime);
            endCheckInWindowEnd.setMinutes(endCheckInWindowEnd.getMinutes() + 15);

            if ((now.getTime() >= startCheckInWindowStart.getTime() && now.getTime() <= startCheckInWindowEnd.getTime()) ||
                (now.getTime() >= endCheckInWindowStart.getTime() && now.getTime() <= endCheckInWindowEnd.getTime())) {
              return true;
            }
          }
        }

        return false;
      }
    } catch (e) {
      console.error('Error checking activity check-in window:', e);
      return false;
    }
  };

  // Helper function to get check-in slot details
  const getCheckInSlotDetails = (activity: ActivityItem): {
    slotName: string;
    checkInType: 'start' | 'end';
    date: string;
    currentTime: string;
    requiredTime: string;
    isOnTime: boolean;
    statusText: string;
    timeDifference: string;
  } | null => {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      if (activity.isMultipleDays) {
        if (!activity.schedule || activity.schedule.length === 0) return null;

        const todayStr = today.toISOString().split('T')[0];
        const todaySchedule = activity.schedule.find(s => {
          if (!s.date) return false;
          const scheduleDate = new Date(s.date);
          if (isNaN(scheduleDate.getTime())) return false;
          const scheduleDateOnly = new Date(
            scheduleDate.getFullYear(),
            scheduleDate.getMonth(),
            scheduleDate.getDate()
          );
          return scheduleDateOnly.getTime() === today.getTime();
        });

        if (!todaySchedule || !todaySchedule.activities) return null;

        const lines = todaySchedule.activities.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          if (line.includes('Buổi Sáng') || line.includes('Buổi Chiều') || line.includes('Buổi Tối')) {
            const slotName = line.includes('Buổi Sáng') ? 'Sáng' :
                           line.includes('Buổi Chiều') ? 'Chiều' : 'Tối';
            const timeMatch = line.match(/(\d{2}:\d{2})-(\d{2}:\d{2})/);
            if (timeMatch) {
              const [startHours, startMinutes] = timeMatch[1].split(':').map(Number);
              const [endHours, endMinutes] = timeMatch[2].split(':').map(Number);

              const slotStartTime = new Date(today);
              slotStartTime.setHours(startHours, startMinutes, 0, 0);

              const slotEndTime = new Date(today);
              slotEndTime.setHours(endHours, endMinutes, 0, 0);

              // Start check-in window: 15 min before to 15 min after start time (6h45-7h15)
              const startCheckInWindowStart = new Date(slotStartTime);
              startCheckInWindowStart.setMinutes(startCheckInWindowStart.getMinutes() - 15);
              const startCheckInWindowEnd = new Date(slotStartTime);
              startCheckInWindowEnd.setMinutes(startCheckInWindowEnd.getMinutes() + 15);

              // End check-in window: 15 min before to 15 min after end time
              const endCheckInWindowStart = new Date(slotEndTime);
              endCheckInWindowStart.setMinutes(endCheckInWindowStart.getMinutes() - 15);
              const endCheckInWindowEnd = new Date(slotEndTime);
              endCheckInWindowEnd.setMinutes(endCheckInWindowEnd.getMinutes() + 15);

              // Check if within check-in window
              let checkInType: 'start' | 'end' | null = null;
              let requiredTime: Date | null = null;
              let isOnTime: boolean = false;
              let statusText: string = '';
              let timeDifference: string = '';

              if (now.getTime() >= startCheckInWindowStart.getTime() && now.getTime() <= startCheckInWindowEnd.getTime()) {
                // Start check-in window (6h45-7h15)
                checkInType = 'start';
                requiredTime = slotStartTime;
                
                // Đúng giờ: từ 15 phút trước đến 15 phút sau (6h45-7h15)
                // Trễ: từ 7h16-7h30 (không có trong window này, nhưng để logic rõ ràng)
                isOnTime = now.getTime() <= slotStartTime.getTime() + 15 * 60 * 1000; // 15 phút sau giờ điểm danh
                
                const diffMs = slotStartTime.getTime() - now.getTime();
                const totalMinutes = Math.abs(Math.floor(diffMs / (1000 * 60)));
                const hours = Math.floor(totalMinutes / 60);
                const minutes = totalMinutes % 60;
                
                if (now.getTime() <= slotStartTime.getTime() + 15 * 60 * 1000) {
                  // Đúng giờ (6h45-7h15)
                  statusText = 'Đúng giờ';
                  if (totalMinutes > 0) {
                    if (hours > 0 && minutes > 0) {
                      timeDifference = `Còn ${hours} giờ ${minutes} phút`;
                    } else if (hours > 0) {
                      timeDifference = `Còn ${hours} giờ`;
                    } else {
                      timeDifference = `Còn ${minutes} phút`;
                    }
                  } else {
                    timeDifference = 'Đúng giờ';
                  }
                } else {
                  // Trễ (7h16-7h30) - nhưng không nên vào đây vì window chỉ đến 7h15
                  statusText = 'Trễ';
                  const lateMs = now.getTime() - (slotStartTime.getTime() + 15 * 60 * 1000);
                  const lateMinutes = Math.floor(lateMs / (1000 * 60));
                  timeDifference = `Trễ ${lateMinutes} phút`;
                }
              } else if (now.getTime() >= endCheckInWindowStart.getTime() && now.getTime() <= endCheckInWindowEnd.getTime()) {
                // End check-in window
                checkInType = 'end';
                requiredTime = slotEndTime;
                
                isOnTime = now.getTime() <= slotEndTime.getTime() + 15 * 60 * 1000;
                
                const diffMs = slotEndTime.getTime() - now.getTime();
                const totalMinutes = Math.abs(Math.floor(diffMs / (1000 * 60)));
                const hours = Math.floor(totalMinutes / 60);
                const minutes = totalMinutes % 60;
                
                if (now.getTime() <= slotEndTime.getTime() + 15 * 60 * 1000) {
                  statusText = 'Đúng giờ';
                  if (totalMinutes > 0) {
                    if (hours > 0 && minutes > 0) {
                      timeDifference = `Còn ${hours} giờ ${minutes} phút`;
                    } else if (hours > 0) {
                      timeDifference = `Còn ${hours} giờ`;
                    } else {
                      timeDifference = `Còn ${minutes} phút`;
                    }
                  } else {
                    timeDifference = 'Đúng giờ';
                  }
                } else {
                  statusText = 'Trễ';
                  const lateMs = now.getTime() - (slotEndTime.getTime() + 15 * 60 * 1000);
                  const lateMinutes = Math.floor(lateMs / (1000 * 60));
                  timeDifference = `Trễ ${lateMinutes} phút`;
                }
              }

              if (checkInType && requiredTime) {

                const dateStr = today.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' });
                const currentTimeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                const requiredTimeStr = requiredTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

                return {
                  slotName,
                  checkInType,
                  date: dateStr,
                  currentTime: currentTimeStr,
                  requiredTime: requiredTimeStr,
                  isOnTime,
                  statusText,
                  timeDifference
                };
              }
            }
          }
        }
      } else {
        // Single day activity
        const dateParts = activity.date.split('/');
        if (dateParts.length !== 3) return null;

        const activityDate = new Date(
          parseInt(dateParts[2]),
          parseInt(dateParts[1]) - 1,
          parseInt(dateParts[0])
        );

        if (isNaN(activityDate.getTime())) return null;

        const activityDateOnly = new Date(
          activityDate.getFullYear(),
          activityDate.getMonth(),
          activityDate.getDate()
        );

        if (today.getTime() !== activityDateOnly.getTime()) return null;

        if (activity.timeSlots && activity.timeSlots.length > 0) {
          for (const slot of activity.timeSlots.filter(s => s.isActive)) {
            const [startHours, startMinutes] = slot.startTime.split(':').map(Number);
            const [endHours, endMinutes] = slot.endTime.split(':').map(Number);

            const slotStartTime = new Date(activityDate);
            slotStartTime.setHours(startHours, startMinutes, 0, 0);

            const slotEndTime = new Date(activityDate);
            slotEndTime.setHours(endHours, endMinutes, 0, 0);

            // Start check-in window: 15 min before to 15 min after start time
            const startCheckInWindowStart = new Date(slotStartTime);
            startCheckInWindowStart.setMinutes(startCheckInWindowStart.getMinutes() - 15);
            const startCheckInWindowEnd = new Date(slotStartTime);
            startCheckInWindowEnd.setMinutes(startCheckInWindowEnd.getMinutes() + 15);

            // End check-in window: 15 min before to 15 min after end time
            const endCheckInWindowStart = new Date(slotEndTime);
            endCheckInWindowStart.setMinutes(endCheckInWindowStart.getMinutes() - 15);
            const endCheckInWindowEnd = new Date(slotEndTime);
            endCheckInWindowEnd.setMinutes(endCheckInWindowEnd.getMinutes() + 15);

            let checkInType: 'start' | 'end' | null = null;
            let requiredTime: Date | null = null;
            let isOnTime: boolean = false;
            let statusText: string = '';
            let timeDifference: string = '';

            if (now.getTime() >= startCheckInWindowStart.getTime() && now.getTime() <= startCheckInWindowEnd.getTime()) {
              // Start check-in window
              checkInType = 'start';
              requiredTime = slotStartTime;
              
              const onTimeEnd = new Date(slotStartTime);
              onTimeEnd.setMinutes(onTimeEnd.getMinutes() + 15);
              
              if (now.getTime() <= onTimeEnd.getTime()) {
                // Đúng giờ (15 phút trước đến 15 phút sau)
                isOnTime = true;
                statusText = 'Đúng giờ';
                const diffMs = slotStartTime.getTime() - now.getTime();
                const totalMinutes = Math.abs(Math.floor(diffMs / (1000 * 60)));
                const hours = Math.floor(totalMinutes / 60);
                const minutes = totalMinutes % 60;
                
                if (totalMinutes > 0) {
                  if (hours > 0 && minutes > 0) {
                    timeDifference = `Còn ${hours} giờ ${minutes} phút`;
                  } else if (hours > 0) {
                    timeDifference = `Còn ${hours} giờ`;
                  } else {
                    timeDifference = `Còn ${minutes} phút`;
                  }
                } else {
                  timeDifference = 'Đúng giờ';
                }
              } else {
                // Trễ (sau 15 phút nhưng vẫn trong window)
                isOnTime = false;
                statusText = 'Trễ';
                const lateMs = now.getTime() - onTimeEnd.getTime();
                const lateMinutes = Math.floor(lateMs / (1000 * 60));
                const lateHours = Math.floor(lateMinutes / 60);
                const lateMins = lateMinutes % 60;
                
                if (lateHours > 0 && lateMins > 0) {
                  timeDifference = `Trễ ${lateHours} giờ ${lateMins} phút`;
                } else if (lateHours > 0) {
                  timeDifference = `Trễ ${lateHours} giờ`;
                } else {
                  timeDifference = `Trễ ${lateMins} phút`;
                }
              }
            } else if (now.getTime() >= endCheckInWindowStart.getTime() && now.getTime() <= endCheckInWindowEnd.getTime()) {
              // End check-in window
              checkInType = 'end';
              requiredTime = slotEndTime;
              
              const onTimeEnd = new Date(slotEndTime);
              onTimeEnd.setMinutes(onTimeEnd.getMinutes() + 15);
              
              if (now.getTime() <= onTimeEnd.getTime()) {
                isOnTime = true;
                statusText = 'Đúng giờ';
                const diffMs = slotEndTime.getTime() - now.getTime();
                const totalMinutes = Math.abs(Math.floor(diffMs / (1000 * 60)));
                const hours = Math.floor(totalMinutes / 60);
                const minutes = totalMinutes % 60;
                
                if (totalMinutes > 0) {
                  if (hours > 0 && minutes > 0) {
                    timeDifference = `Còn ${hours} giờ ${minutes} phút`;
                  } else if (hours > 0) {
                    timeDifference = `Còn ${hours} giờ`;
                  } else {
                    timeDifference = `Còn ${minutes} phút`;
                  }
                } else {
                  timeDifference = 'Đúng giờ';
                }
              } else {
                isOnTime = false;
                statusText = 'Trễ';
                const lateMs = now.getTime() - onTimeEnd.getTime();
                const lateMinutes = Math.floor(lateMs / (1000 * 60));
                const lateHours = Math.floor(lateMinutes / 60);
                const lateMins = lateMinutes % 60;
                
                if (lateHours > 0 && lateMins > 0) {
                  timeDifference = `Trễ ${lateHours} giờ ${lateMins} phút`;
                } else if (lateHours > 0) {
                  timeDifference = `Trễ ${lateHours} giờ`;
                } else {
                  timeDifference = `Trễ ${lateMins} phút`;
                }
              }
            }

            if (checkInType && requiredTime) {

              const slotName = slot.name.includes('Sáng') ? 'Sáng' :
                             slot.name.includes('Chiều') ? 'Chiều' : 'Tối';
              const dateStr = activityDate.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' });
              const currentTimeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
              const requiredTimeStr = requiredTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

              return {
                slotName,
                checkInType,
                date: dateStr,
                currentTime: currentTimeStr,
                requiredTime: requiredTimeStr,
                isOnTime,
                statusText,
                timeDifference
              };
            }
          }
        }
      }

      return null;
    } catch (e) {
      console.error('Error getting check-in slot details:', e);
      return null;
    }
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
    status: 'not-started' | 'ongoing-checked-in' | 'ongoing-not-checked-in' | 'completed-checked-in' | 'completed-not-checked-in' | 'not-registered' | 'pending' | 'rejected' | 'removed' | 'cancelled';
    label: string;
    color: string;
    bgColor: string;
    borderColor: string;
    bannerBgColor: string;
    bannerBorderColor: string;
    bannerTextColor: string;
    icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  } => {
    // Kiểm tra trạng thái hoạt động (cancelled/postponed)
    if (activity.status === 'cancelled' || activity.status === 'postponed') {
      return {
        status: 'cancelled',
        label: activity.status === 'cancelled' ? 'Đã hủy' : 'Đã hoãn',
        color: isDarkMode ? 'text-orange-300' : 'text-orange-700',
        bgColor: isDarkMode ? 'bg-orange-800' : 'bg-orange-50',
        borderColor: isDarkMode ? 'border-orange-700' : 'border-orange-200',
        bannerBgColor: isDarkMode ? 'bg-orange-600/90' : 'bg-orange-500',
        bannerBorderColor: isDarkMode ? 'border-orange-500' : 'border-orange-600',
        bannerTextColor: isDarkMode ? 'text-orange-100' : 'text-white',
        icon: AlertCircle
      };
    }

    // Nếu chưa đăng ký hoặc chưa được duyệt, không hiển thị trạng thái điểm danh
    if (!activity.isRegistered || activity.approvalStatus !== 'approved') {
      // Kiểm tra approval status
      if (activity.approvalStatus === 'removed') {
        return {
          status: 'removed',
          label: 'Đã bị xóa',
          color: isDarkMode ? 'text-gray-300' : 'text-gray-700',
          bgColor: isDarkMode ? 'bg-gray-800' : 'bg-gray-50',
          borderColor: isDarkMode ? 'border-gray-700' : 'border-gray-200',
          bannerBgColor: isDarkMode ? 'bg-gray-600/90' : 'bg-gray-500',
          bannerBorderColor: isDarkMode ? 'border-gray-500' : 'border-gray-600',
          bannerTextColor: isDarkMode ? 'text-gray-100' : 'text-white',
          icon: Trash2
        };
      }
      
      if (activity.isRegistered && activity.approvalStatus === 'pending') {
        return {
          status: 'pending',
          label: 'Chờ duyệt',
          color: isDarkMode ? 'text-yellow-300' : 'text-yellow-700',
          bgColor: isDarkMode ? 'bg-yellow-800' : 'bg-yellow-50',
          borderColor: isDarkMode ? 'border-yellow-700' : 'border-yellow-200',
          bannerBgColor: isDarkMode ? 'bg-yellow-600/90' : 'bg-yellow-500',
          bannerBorderColor: isDarkMode ? 'border-yellow-500' : 'border-yellow-600',
          bannerTextColor: isDarkMode ? 'text-yellow-100' : 'text-white',
          icon: Clock
        };
      }
      
      if (activity.isRegistered && activity.approvalStatus === 'rejected') {
        return {
          status: 'rejected',
          label: 'Đã từ chối',
          color: isDarkMode ? 'text-red-300' : 'text-red-700',
          bgColor: isDarkMode ? 'bg-red-800' : 'bg-red-50',
          borderColor: isDarkMode ? 'border-red-700' : 'border-red-200',
          bannerBgColor: isDarkMode ? 'bg-red-600/90' : 'bg-red-500',
          bannerBorderColor: isDarkMode ? 'border-red-500' : 'border-red-600',
          bannerTextColor: isDarkMode ? 'text-red-100' : 'text-white',
          icon: XCircle
        };
      }

      const timeStatus = getActivityTimeStatus(activity);
      if (timeStatus === 'before') {
        // Nếu đã đăng ký thì hiển thị "Sắp diễn ra", chưa đăng ký thì "Chưa diễn ra"
        const label = activity.isRegistered ? 'Sắp diễn ra' : 'Chưa diễn ra';
        return {
          status: 'not-started',
          label: label,
          color: isDarkMode ? 'text-green-300' : 'text-green-700',
          bgColor: isDarkMode ? 'bg-green-800' : 'bg-green-50',
          borderColor: isDarkMode ? 'border-green-700' : 'border-green-200',
          bannerBgColor: isDarkMode ? 'bg-green-600/90' : 'bg-green-500',
          bannerBorderColor: isDarkMode ? 'border-green-500' : 'border-green-600',
          bannerTextColor: isDarkMode ? 'text-green-100' : 'text-white',
          icon: Clock
        };
      } else if (timeStatus === 'after') {
        return {
          status: 'completed-not-checked-in',
          label: 'Đã kết thúc',
          color: isDarkMode ? 'text-gray-300' : 'text-gray-600',
          bgColor: isDarkMode ? 'bg-gray-800' : 'bg-gray-50',
          borderColor: isDarkMode ? 'border-gray-700' : 'border-gray-200',
          bannerBgColor: isDarkMode ? 'bg-gray-600/90' : 'bg-gray-500',
          bannerBorderColor: isDarkMode ? 'border-gray-500' : 'border-gray-600',
          bannerTextColor: isDarkMode ? 'text-gray-100' : 'text-white',
          icon: XCircle
        };
      }
      return {
        status: 'not-registered',
        label: 'Đang diễn ra',
        color: isDarkMode ? 'text-red-300' : 'text-red-700',
        bgColor: isDarkMode ? 'bg-red-800' : 'bg-red-50',
        borderColor: isDarkMode ? 'border-red-700' : 'border-red-200',
        bannerBgColor: isDarkMode ? 'bg-red-600/90' : 'bg-red-500',
        bannerBorderColor: isDarkMode ? 'border-red-500' : 'border-red-600',
        bannerTextColor: isDarkMode ? 'text-red-100' : 'text-white',
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
        color: isDarkMode ? 'text-green-300' : 'text-green-700',
        bgColor: isDarkMode ? 'bg-green-800' : 'bg-green-50',
        borderColor: isDarkMode ? 'border-green-700' : 'border-green-200',
        bannerBgColor: isDarkMode ? 'bg-green-600/90' : 'bg-green-500',
        bannerBorderColor: isDarkMode ? 'border-green-500' : 'border-green-600',
        bannerTextColor: isDarkMode ? 'text-green-100' : 'text-white',
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
          bannerBgColor: isDarkMode ? 'bg-gray-600/90' : 'bg-gray-500',
          bannerBorderColor: isDarkMode ? 'border-gray-500' : 'border-gray-600',
          bannerTextColor: isDarkMode ? 'text-gray-100' : 'text-white',
          icon: CheckCircle2
        };
      } else {
        return {
          status: 'completed-not-checked-in',
          label: 'Đã kết thúc - Chưa điểm danh',
          color: isDarkMode ? 'text-gray-400' : 'text-gray-500',
          bgColor: isDarkMode ? 'bg-gray-800' : 'bg-gray-50',
          borderColor: isDarkMode ? 'border-gray-700' : 'border-gray-200',
          bannerBgColor: isDarkMode ? 'bg-gray-600/90' : 'bg-gray-500',
          bannerBorderColor: isDarkMode ? 'border-gray-500' : 'border-gray-600',
          bannerTextColor: isDarkMode ? 'text-gray-100' : 'text-white',
          icon: XCircle
        };
      }
    } else {
      // timeStatus === 'during'
      if (hasAnyAttendance) {
        return {
          status: 'ongoing-checked-in',
          label: 'Đang diễn ra - Đã điểm danh',
          color: isDarkMode ? 'text-red-300' : 'text-red-700',
          bgColor: isDarkMode ? 'bg-red-800' : 'bg-red-50',
          borderColor: isDarkMode ? 'border-red-700' : 'border-red-200',
          bannerBgColor: isDarkMode ? 'bg-red-600/90' : 'bg-red-500',
          bannerBorderColor: isDarkMode ? 'border-red-500' : 'border-red-600',
          bannerTextColor: isDarkMode ? 'text-red-100' : 'text-white',
          icon: CheckCircle2
        };
      } else {
        return {
          status: 'ongoing-not-checked-in',
          label: 'Đang diễn ra',
          color: isDarkMode ? 'text-red-300' : 'text-red-700',
          bgColor: isDarkMode ? 'bg-red-800' : 'bg-red-50',
          borderColor: isDarkMode ? 'border-red-700' : 'border-red-200',
          bannerBgColor: isDarkMode ? 'bg-red-600/90' : 'bg-red-500',
          bannerBorderColor: isDarkMode ? 'border-red-500' : 'border-red-600',
          bannerTextColor: isDarkMode ? 'text-red-100' : 'text-white',
          icon: AlertCircle
        };
      }
    }
  };

  // Helper function to get activity date for comparison
  const getActivityDate = (activity: ActivityItem): Date | null => {
    if (activity.isMultipleDays) {
      return activity.startDate ? new Date(activity.startDate) : null;
    } else {
      try {
        const dateParts = activity.date.split('/');
        if (dateParts.length === 3) {
          return new Date(
            parseInt(dateParts[2]),
            parseInt(dateParts[1]) - 1,
            parseInt(dateParts[0])
          );
        }
      } catch {}
      return null;
    }
  };

  // Helper function to get date key for grouping activities
  const getActivityDateKey = (activity: ActivityItem): string => {
    const activityDate = getActivityDate(activity);
    if (!activityDate) return 'unknown';
    
    // Format as YYYY-MM-DD for consistent grouping
    const year = activityDate.getFullYear();
    const month = String(activityDate.getMonth() + 1).padStart(2, '0');
    const day = String(activityDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper function to format date for display in headers
  const formatDateHeader = (dateKey: string): string => {
    try {
      const [year, month, day] = dateKey.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
      
      if (dateKey === todayStr) {
        return 'Hôm nay';
      } else if (dateKey === tomorrowStr) {
        return 'Ngày mai';
      } else {
        return date.toLocaleDateString('vi-VN', { 
          weekday: 'long',
          day: 'numeric', 
          month: 'long',
          year: 'numeric'
        });
      }
    } catch {
      return dateKey;
    }
  };

  // Helper function to group activities by date
  const groupActivitiesByDate = (activities: ActivityItem[]): Array<{ dateKey: string; dateLabel: string; activities: ActivityItem[] }> => {
    const grouped = new Map<string, ActivityItem[]>();
    
    activities.forEach(activity => {
      const dateKey = getActivityDateKey(activity);
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(activity);
    });
    
    // Sort date keys and return grouped activities
    const sortedDateKeys = Array.from(grouped.keys()).sort();
    return sortedDateKeys.map(dateKey => ({
      dateKey,
      dateLabel: formatDateHeader(dateKey),
      activities: grouped.get(dateKey)!
    }));
  };

  // Categorize activities by registration status and time status
  const categorizedActivities = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const unregistered: ActivityItem[] = [];
    const registeredOngoing: ActivityItem[] = [];
    const registeredUpcoming: ActivityItem[] = [];
    const registeredCompleted: ActivityItem[] = [];

    availableActivities.forEach(activity => {
      const activityDate = getActivityDate(activity);
      if (!activityDate || isNaN(activityDate.getTime())) return;

      const activityDateOnly = new Date(
        activityDate.getFullYear(),
        activityDate.getMonth(),
        activityDate.getDate()
      );

      const timeStatus = getActivityTimeStatus(activity);

      if (!activity.isRegistered) {
        // Nếu chưa đăng ký nhưng đã kết thúc, thêm vào completed để hiển thị ở cột bên phải
        if (timeStatus === 'after') {
          registeredCompleted.push(activity);
        } else {
          unregistered.push(activity);
        }
      } else if (activity.isRegistered) {
        if (timeStatus === 'during') {
          registeredOngoing.push(activity);
        } else if (timeStatus === 'before') {
          registeredUpcoming.push(activity);
        } else if (timeStatus === 'after') {
          registeredCompleted.push(activity);
        }
      }
    });

    // Sort each category by date
    const sortByDate = (a: ActivityItem, b: ActivityItem) => {
      const dateA = getActivityDate(a);
      const dateB = getActivityDate(b);
      if (!dateA || !dateB) return 0;
      return dateA.getTime() - dateB.getTime();
    };

    unregistered.sort(sortByDate);
    registeredOngoing.sort(sortByDate);
    registeredUpcoming.sort(sortByDate);
    registeredCompleted.sort((a, b) => {
      const dateA = getActivityDate(a);
      const dateB = getActivityDate(b);
      if (!dateA || !dateB) return 0;
      return dateB.getTime() - dateA.getTime(); // Reverse for completed (newest first)
    });

    return {
      unregistered,
      registeredOngoing,
      registeredUpcoming,
      registeredCompleted
    };
  }, [availableActivities]);

  // Filter and sort activities - Memoized để tránh tính toán lại không cần thiết
  const filteredActivities = useMemo(() => {
    let filtered = [...availableActivities];

    // Filter out completed activities (already ended) - only show ongoing and upcoming activities
    filtered = filtered.filter(activity => {
      const timeStatus = getActivityTimeStatus(activity);
      return timeStatus !== 'after'; // Exclude completed activities
    });

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
        const activityDate = getActivityDate(activity);
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
      const dateA = getActivityDate(a);
      const dateB = getActivityDate(b);

      if (!dateA || !dateB) return 0;

      if (sortOrder === 'newest') {
        return dateB.getTime() - dateA.getTime();
      } else {
        return dateA.getTime() - dateB.getTime();
      }
    });

    return filtered;
  }, [availableActivities, searchQuery, startDate, endDate, activityType, registrationFilter, sortOrder]);

  // Filter categorized activities
  const filteredUnregistered = useMemo(() => {
    return categorizedActivities.unregistered.filter(activity => {
      if (searchQuery) {
        const matches = activity.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          activity.overview?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          activity.location.toLowerCase().includes(searchQuery.toLowerCase());
        if (!matches) return false;
      }
      if (activityType !== 'all') {
        if (activityType === 'single_day' && activity.isMultipleDays) return false;
        if (activityType === 'multiple_days' && !activity.isMultipleDays) return false;
      }
      return true;
    });
  }, [categorizedActivities.unregistered, searchQuery, activityType]);

  const filteredRegisteredOngoing = useMemo(() => {
    return categorizedActivities.registeredOngoing.filter(activity => {
      if (searchQuery) {
        const matches = activity.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          activity.overview?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          activity.location.toLowerCase().includes(searchQuery.toLowerCase());
        if (!matches) return false;
      }
      if (activityType !== 'all') {
        if (activityType === 'single_day' && activity.isMultipleDays) return false;
        if (activityType === 'multiple_days' && !activity.isMultipleDays) return false;
      }
      return true;
    });
  }, [categorizedActivities.registeredOngoing, searchQuery, activityType]);

  const filteredRegisteredUpcoming = useMemo(() => {
    return categorizedActivities.registeredUpcoming.filter(activity => {
      if (searchQuery) {
        const matches = activity.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          activity.overview?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          activity.location.toLowerCase().includes(searchQuery.toLowerCase());
        if (!matches) return false;
      }
      if (activityType !== 'all') {
        if (activityType === 'single_day' && activity.isMultipleDays) return false;
        if (activityType === 'multiple_days' && !activity.isMultipleDays) return false;
      }
      return true;
    });
  }, [categorizedActivities.registeredUpcoming, searchQuery, activityType]);

  const filteredRegisteredCompleted = useMemo(() => {
    return categorizedActivities.registeredCompleted.filter(activity => {
      if (searchQuery) {
        const matches = activity.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          activity.overview?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          activity.location.toLowerCase().includes(searchQuery.toLowerCase());
        if (!matches) return false;
      }
      if (activityType !== 'all') {
        if (activityType === 'single_day' && activity.isMultipleDays) return false;
        if (activityType === 'multiple_days' && !activity.isMultipleDays) return false;
      }
      return true;
    });
  }, [categorizedActivities.registeredCompleted, searchQuery, activityType]);

  // Auto-scroll effect for right column
  useEffect(() => {
    if (!rightColumnScrollRef.current || filteredRegisteredCompleted.length <= activitiesPerPage || isScrollingPaused) {
      return;
    }

    const scrollContainer = rightColumnScrollRef.current;
    let scrollInterval: NodeJS.Timeout;
    let currentScroll = scrollContainer.scrollTop || 0;
    const scrollSpeed = 0.5; // pixels per frame (slower)
    const scrollDelay = 50; // milliseconds between scrolls (slower)

    const startScrolling = () => {
      scrollInterval = setInterval(() => {
        if (isScrollingPaused) {
          if (scrollInterval) {
            clearInterval(scrollInterval);
          }
          return;
        }

        const maxScroll = scrollContainer.scrollHeight - scrollContainer.clientHeight;
        
        if (currentScroll >= maxScroll) {
          // Reset to top when reaching bottom
          currentScroll = 0;
          scrollContainer.scrollTop = 0;
      } else {
          currentScroll += scrollSpeed;
          scrollContainer.scrollTop = currentScroll;
        }
      }, scrollDelay);
    };

    startScrolling();

    return () => {
      if (scrollInterval) {
        clearInterval(scrollInterval);
      }
    };
  }, [filteredRegisteredCompleted.length, activitiesPerPage, isScrollingPaused]);


  const handleViewApprovedParticipants = async (activityId: string, activityTitle: string) => {
    if (!isAuthenticated || !token) {
      alert("Bạn cần đăng nhập để xem danh sách người tham gia.");
      return;
    }

    try {
      const response = await fetch(`/api/activities/${activityId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch activity details');
      }

      const responseData = await response.json();
      const rawActivity = responseData.data.activity;

      if (!rawActivity || !rawActivity.participants) {
        setSelectedActivityParticipants([]);
        setSelectedActivityTitle(activityTitle);
        setShowParticipantsModal(true);
        return;
      }

      // Lọc chỉ những người đã được duyệt (approvalStatus === 'approved')
      const approvedParticipants = rawActivity.participants
        .filter((p: any) => {
          const approvalStatus = p.approvalStatus || 'pending';
          return approvalStatus === 'approved';
        })
        .map((p: any) => {
          const userId = typeof p.userId === 'object' && p.userId !== null
            ? (p.userId._id || p.userId.$oid || String(p.userId))
            : (p.userId?.$oid || p.userId || String(p.userId));
          
          return {
            userId: userId || '',
            name: p.name || 'Không có tên',
            email: p.email || '',
            avatarUrl: p.avatarUrl,
            approvalStatus: p.approvalStatus || 'pending' as 'pending' | 'approved' | 'rejected'
          };
        });

      setSelectedActivityParticipants(approvedParticipants);
      setSelectedActivityTitle(activityTitle);
      setShowParticipantsModal(true);
    } catch (err) {
      console.error('Error loading approved participants:', err);
      alert('Không thể tải danh sách người tham gia. Vui lòng thử lại.');
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

    // If unregistering, proceed directly
    if (isCurrentlyRegistered) {
    setRegisteringActivities(prev => new Set(prev).add(activityId));
    setError(null);
    setSuccessMessage(null);

    try {
      const url = `/api/activities/${activityId}/register`;
        const response = await fetch(url, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ 
            userId: user._id
          }),
        });

        // Check content type before parsing
        const contentType = response.headers.get('content-type');
        const isJson = contentType?.includes('application/json');

        if (!response.ok) {
          let errorMessage = `Không thể hủy đăng ký tham gia hoạt động`;
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
            result = { 
              message: 'Đã hủy đăng ký thành công'
            };
          }
        } else {
          result = { 
            message: 'Đã hủy đăng ký thành công'
          };
        }
        
        // Update activity registration status locally
        setAvailableActivities(prev => prev.map(a => 
          a.id === activityId 
            ? { 
                ...a, 
                isRegistered: false,
                registeredParticipantsCount: (a.registeredParticipantsCount || 0) - 1,
                approvalStatus: undefined
              }
            : a
        ));
        
        setSuccessMessage(result.message || 'Đã hủy đăng ký thành công');
        setTimeout(() => setSuccessMessage(null), 3000);

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Có lỗi xảy ra khi hủy đăng ký';
        setError(errorMessage);
        console.error('Unregister error:', err);
      } finally {
        setRegisteringActivities(prev => {
          const newSet = new Set(prev);
          newSet.delete(activityId);
          return newSet;
        });
      }
      return;
    }

    // If registering for multiple_days activity, fetch details and show modal
    if (activity.isMultipleDays && activity.type === 'multiple_days') {
      try {
        // Fetch activity details to get schedule
        const response = await fetch(`/api/activities/${activityId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Không thể tải thông tin hoạt động');
        }

        const responseData = await response.json();
        const rawActivity = responseData.data.activity;

        if (!rawActivity || !rawActivity.schedule || rawActivity.schedule.length === 0) {
          // If no schedule, proceed with direct registration
          setRegisteringActivities(prev => new Set(prev).add(activityId));
          setError(null);
          setSuccessMessage(null);

          const registerResponse = await fetch(`/api/activities/${activityId}/register`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ 
              userId: user._id, 
              name: user.name, 
              email: user.email, 
              role: 'Người Tham Gia',
              daySlots: []
            }),
          });

          if (!registerResponse.ok) {
            const errorData = await registerResponse.json();
            throw new Error(errorData.message || 'Đăng ký thất bại');
          }

          const result = await registerResponse.json();
          setSuccessMessage(result.message || 'Đăng ký thành công');
          setTimeout(() => setSuccessMessage(null), 3000);

          // Refetch activities
          const activitiesResponse = await fetch('/api/activities', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (activitiesResponse.ok) {
            const activitiesData = await activitiesResponse.json();
            // ... (refetch logic similar to below)
          }

          setRegisteringActivities(prev => {
            const newSet = new Set(prev);
            newSet.delete(activityId);
            return newSet;
          });
          return;
        }

        // Parse schedule data
        const schedule: Array<{ day: number; date: string; activities: string }> = rawActivity.schedule.map((item: any) => ({
          day: item.day,
          date: item.date?.$date ? new Date(item.date.$date).toISOString().split('T')[0] : (item.date ? new Date(item.date).toISOString().split('T')[0] : ''),
          activities: item.activities || ''
        }));

        // Parse schedule to extract slots - using same logic as activity detail page
        const parsedData = schedule.map((daySchedule) => {
          const activitiesText = daySchedule.activities || '';
          const lines = activitiesText.split('\n').filter(line => line.trim());
          
          const slots: Array<{
            name: string;
            slotKey: 'morning' | 'afternoon' | 'evening';
            startTime: string;
            endTime: string;
            activities?: string;
            detailedLocation?: string;
            mapLocation?: {
              address: string;
              lat?: number;
              lng?: number;
              radius?: number;
            };
          }> = [];
          
          let dayDetailedLocation: string | undefined;
          let dayMapLocation: { address: string; lat?: number; lng?: number; radius?: number } | undefined;
          
          lines.forEach(line => {
            const trimmed = line.trim();
            
            // Parse buổi: "Buổi Sáng (07:00-11:30) - ..."
            const slotMatch = trimmed.match(/^Buổi (Sáng|Chiều|Tối)\s*\((\d{2}:\d{2})-(\d{2}:\d{2})\)/);
            if (slotMatch) {
              const slotName = slotMatch[1];
              const slotKey = slotName === 'Sáng' ? 'morning' : slotName === 'Chiều' ? 'afternoon' : 'evening';
              const startTime = slotMatch[2];
              const endTime = slotMatch[3];
              
              // Extract activities description
              const timePattern = /\(\d{2}:\d{2}-\d{2}:\d{2}\)/;
              const timeMatch = trimmed.match(timePattern);
              let activities: string | undefined = undefined;
              if (timeMatch) {
                const afterTime = trimmed.substring(trimmed.indexOf(timeMatch[0]) + timeMatch[0].length);
                const activitiesMatch = afterTime.match(/-\s*([^-]*?)(?:\s*-\s*Địa điểm|$)/);
                if (activitiesMatch && activitiesMatch[1]) {
                  const extracted = activitiesMatch[1].trim();
                  if (extracted && 
                      extracted.length > 0 && 
                      !extracted.includes('Địa điểm') && 
                      !extracted.includes('Bán kính') &&
                      !extracted.includes('(') &&
                      !extracted.match(/^\d+\.\d+/)
                  ) {
                    activities = extracted;
                  }
                }
              }
              
              // Extract detailed location for this slot
              const detailedMatch = trimmed.match(/Địa điểm chi tiết:\s*(.+?)(?:\s*-\s*Địa điểm map|$)/);
              const detailedLocation = detailedMatch ? detailedMatch[1].trim() : undefined;
              
              // Extract map location for this slot - support both formats
              let mapLocation: { address: string; lat?: number; lng?: number; radius?: number } | undefined;
              
              // Format 1: "Địa điểm map: address (lat, lng) - Bán kính: ...m"
              const mapMatch1 = trimmed.match(/Địa điểm map:\s*(.+?)(?:\s*\(([\d.]+),\s*([\d.]+)\)|$)/);
              if (mapMatch1) {
                const address = mapMatch1[1].trim();
                const lat = mapMatch1[2] ? parseFloat(mapMatch1[2]) : undefined;
                const lng = mapMatch1[3] ? parseFloat(mapMatch1[3]) : undefined;
                const radiusMatch = trimmed.match(/Bán kính:\s*(\d+)m/);
                const radius = radiusMatch ? parseInt(radiusMatch[1]) : undefined;
                mapLocation = { address, lat, lng, radius };
              } else {
                // Format 2: "Địa điểm map: lat:...,lng:...,address:...,radius:..."
                const mapMatch2 = trimmed.match(/Địa điểm map:\s*lat:([\d.]+),lng:([\d.]+),address:(.+?),radius:(\d+)/);
                if (mapMatch2) {
                  mapLocation = {
                    address: mapMatch2[3].trim(),
                    lat: parseFloat(mapMatch2[1]),
                    lng: parseFloat(mapMatch2[2]),
                    radius: parseInt(mapMatch2[4])
                  };
                }
              }
              
              slots.push({
                name: `Buổi ${slotName}`,
                slotKey,
                startTime,
                endTime,
                activities,
                detailedLocation,
                mapLocation
              });
            } else if (trimmed.startsWith('Địa điểm chi tiết:') && !trimmed.includes('Buổi')) {
              // Day-level detailed location
              const match = trimmed.match(/Địa điểm chi tiết:\s*(.+?)(?:\s*-\s*Địa điểm map|$)/);
              if (match) {
                dayDetailedLocation = match[1].trim();
              }
            } else if (trimmed.startsWith('Địa điểm map:') && !trimmed.includes('Buổi')) {
              // Day-level map location - support both formats
              // Format 1: "Địa điểm map: address (lat, lng) - Bán kính: ...m"
              const mapMatch1 = trimmed.match(/Địa điểm map:\s*(.+?)(?:\s*\(([\d.]+),\s*([\d.]+)\)|$)/);
              if (mapMatch1) {
                const address = mapMatch1[1].trim();
                const lat = mapMatch1[2] ? parseFloat(mapMatch1[2]) : undefined;
                const lng = mapMatch1[3] ? parseFloat(mapMatch1[3]) : undefined;
                const radiusMatch = trimmed.match(/Bán kính:\s*(\d+)m/);
                const radius = radiusMatch ? parseInt(radiusMatch[1]) : undefined;
                dayMapLocation = { address, lat, lng, radius };
              } else {
                // Format 2: "Địa điểm map: lat:...,lng:...,address:...,radius:..."
                const mapMatch2 = trimmed.match(/Địa điểm map:\s*lat:([\d.]+),lng:([\d.]+),address:(.+?),radius:(\d+)/);
                if (mapMatch2) {
                  dayMapLocation = {
                    address: mapMatch2[3].trim(),
                    lat: parseFloat(mapMatch2[1]),
                    lng: parseFloat(mapMatch2[2]),
                    radius: parseInt(mapMatch2[4])
                  };
                }
              }
            }
          });
          
          // Convert slots mapLocation to required format
          const formattedSlots = slots.map(slot => ({
            ...slot,
            mapLocation: slot.mapLocation && slot.mapLocation.address 
              ? {
                  lat: slot.mapLocation.lat ?? 0,
                  lng: slot.mapLocation.lng ?? 0,
                  address: slot.mapLocation.address,
                  radius: slot.mapLocation.radius ?? 0
                }
              : undefined
          }));

          return {
            day: daySchedule.day,
            date: daySchedule.date,
            slots: formattedSlots,
            dayMapLocation: dayMapLocation && dayMapLocation.address
              ? {
                  lat: dayMapLocation.lat ?? 0,
                  lng: dayMapLocation.lng ?? 0,
                  address: dayMapLocation.address,
                  radius: dayMapLocation.radius ?? 0
                }
              : undefined,
            dayDetailedLocation
          };
        });

        // Create activity object with full details for modal
        // Ensure participants array is properly formatted
        const participants = (rawActivity.participants || []).map((p: any) => ({
          ...p,
          approvalStatus: p.approvalStatus || 'pending',
          registeredDaySlots: p.registeredDaySlots || []
        }));

        const activityForModal: ActivityItem = {
          ...activity,
          maxParticipants: rawActivity.maxParticipants,
          participants: participants,
          registrationThreshold: rawActivity.registrationThreshold !== undefined && rawActivity.registrationThreshold !== null 
            ? rawActivity.registrationThreshold 
            : 80,
          type: rawActivity.type || 'multiple_days'
        };

        // Set parsed data and show modal
        setParsedScheduleData(parsedData);
        setSelectedActivityForRegistration(activityForModal);
        setSelectedDaySlotsForRegistration([]);
        setShowRegistrationModal(true);
        
      } catch (err) {
        console.error('Error loading activity details:', err);
        setError('Không thể tải thông tin hoạt động. Vui lòng thử lại.');
      }
      return;
    }

    // For single_day activities, fetch details and show modal
    if (activity.type === 'single_day') {
      try {
        // Fetch activity details to get timeSlots
        const response = await fetch(`/api/activities/${activityId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Không thể tải thông tin hoạt động');
        }

        const responseData = await response.json();
        const rawActivity = responseData.data.activity;

        if (!rawActivity || !rawActivity.timeSlots || rawActivity.timeSlots.length === 0) {
          // If no timeSlots, proceed with direct registration
          setRegisteringActivities(prev => new Set(prev).add(activityId));
          setError(null);
          setSuccessMessage(null);

          const registerResponse = await fetch(`/api/activities/${activityId}/register`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ 
              userId: user._id, 
              name: user.name, 
              email: user.email, 
              role: 'Người Tham Gia',
              daySlots: []
            }),
          });

          if (!registerResponse.ok) {
            const errorData = await registerResponse.json();
            throw new Error(errorData.message || 'Đăng ký thất bại');
          }

          const result = await registerResponse.json();
          setSuccessMessage(result.message || 'Đăng ký thành công');
          setTimeout(() => setSuccessMessage(null), 3000);

          // Refetch activities
          const activitiesResponse = await fetch('/api/activities', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (activitiesResponse.ok) {
            // ... (refetch logic similar to below)
          }

          setRegisteringActivities(prev => {
            const newSet = new Set(prev);
            newSet.delete(activityId);
            return newSet;
          });
          return;
        }

        // Create activity object with full details for modal
        const participants = (rawActivity.participants || []).map((p: any) => ({
          ...p,
          approvalStatus: p.approvalStatus || 'pending',
          registeredDaySlots: p.registeredDaySlots || []
        }));

        const activityForModal: ActivityItem = {
          ...activity,
          maxParticipants: rawActivity.maxParticipants,
          participants: participants,
          registrationThreshold: rawActivity.registrationThreshold !== undefined && rawActivity.registrationThreshold !== null 
            ? rawActivity.registrationThreshold 
            : 80,
          type: rawActivity.type || 'single_day',
          date: rawActivity.date ? new Date(rawActivity.date).toLocaleDateString('vi-VN') : activity.date,
          timeSlots: rawActivity.timeSlots || []
        };

        // Set activity and show modal
        setSelectedActivityForRegistration(activityForModal);
        setSelectedSingleDaySlots([]);
        setShowSingleDayRegistrationModal(true);
        
      } catch (err) {
        console.error('Error loading activity details:', err);
        setError('Không thể tải thông tin hoạt động. Vui lòng thử lại.');
      }
      return;
    }

    // For other activities (fallback), proceed with direct registration
    setRegisteringActivities(prev => new Set(prev).add(activityId));
    setError(null);
    setSuccessMessage(null);

    try {
      const url = `/api/activities/${activityId}/register`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          userId: user._id, 
          name: user.name, 
          email: user.email, 
          role: 'Người Tham Gia',
          daySlots: []
        }),
      });

      // Check content type before parsing
      const contentType = response.headers.get('content-type');
      const isJson = contentType?.includes('application/json');

      if (!response.ok) {
        let errorMessage = `Không thể đăng ký tham gia hoạt động`;
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
          result = { 
            message: 'Đăng ký tham gia thành công'
          };
        }
      } else {
        result = { 
          message: 'Đăng ký tham gia thành công'
        };
      }
      
      // Update activity registration status locally
      setAvailableActivities(prev => prev.map(a => 
        a.id === activityId 
          ? { 
              ...a, 
              isRegistered: true,
              registeredParticipantsCount: (a.registeredParticipantsCount || 0) + 1,
              approvalStatus: 'pending'
            }
          : a
      ));
      
      // Refetch activities to get latest approval status
        (async () => {
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
                // Filter by visibility based on user role
                // If user role is STUDENT, only show public activities
                if (currentUser?.role === 'STUDENT') {
                  return activity.visibility === 'public'; // Students only see public activities
                } else {
                  return true; // Other roles (CLUB_LEADER, CLUB_DEPUTY, CLUB_MEMBER) can see all non-draft activities (public and private)
                }
              }).map((activity: RawActivity) => {
                // Check if current user is already registered and get approval status
                let isRegistered = false;
                let approvalStatus: 'pending' | 'approved' | 'rejected' | 'removed' | undefined = undefined;

                const userParticipant = activity.participants?.find((p: any) => {
                  const userId = typeof p.userId === 'object' && p.userId !== null
                    ? (p.userId._id || p.userId.$oid || String(p.userId))
                    : (p.userId?.$oid || p.userId);
                  return userId === currentUser?._id;
                });

                if (userParticipant) {
                  const participantApprovalStatus = (userParticipant as any).approvalStatus || 'pending';
                  
                  // If participant is removed, they are not considered registered
                  if (participantApprovalStatus === 'removed') {
                    isRegistered = false;
                    approvalStatus = 'removed';
                  } else {
                    // For multiple days activities, user must have selected at least one slot to be considered "registered"
                    const isMultipleDays = activity.type === 'multiple_days';
                    if (isMultipleDays) {
                      const registeredSlots = (userParticipant as any).registeredDaySlots || [];
                      // Only consider registered if user has selected at least one slot
                      if (registeredSlots.length > 0) {
                        isRegistered = true;
                        approvalStatus = participantApprovalStatus;
                      } else {
                        // User is in participants but hasn't selected any slots yet - not fully registered
                        isRegistered = false;
                        approvalStatus = undefined;
                      }
                    } else {
                      // For single day activities, being in participants means registered
                      isRegistered = true;
                      approvalStatus = participantApprovalStatus;
                    }
                  }
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
                  registeredParticipantsCount: activity.participants?.filter((p: any) => {
              const approvalStatus = p.approvalStatus || 'pending';
              return approvalStatus === 'approved';
            }).length || 0,
                  organizer: activity.responsiblePerson?.name || activity.participants?.find(p => p.role === 'Trưởng Nhóm')?.name || activity.participants?.[0]?.name || 'Chưa có',
                  organizerAvatarUrl: activity.responsiblePerson?.avatarUrl,
                  isRegistered: isRegistered,
                  maxParticipants: activity.maxParticipants,
                  approvalStatus: approvalStatus,
                  registrationThreshold: activity.registrationThreshold,
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
        })();

      setSuccessMessage(result.message || 'Đăng ký tham gia thành công');
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

  // Helper functions for registration modal
  const getRegistrationThreshold = useCallback((): number => {
    return selectedActivityForRegistration?.registrationThreshold ?? 80;
  }, [selectedActivityForRegistration]);

  const calculateRegistrationRate = useCallback((day: number, slot: 'morning' | 'afternoon' | 'evening'): number => {
    if (!selectedActivityForRegistration || !selectedActivityForRegistration.participants) return 0;
    
    if (!selectedActivityForRegistration.maxParticipants || selectedActivityForRegistration.maxParticipants === 0) {
      return 0;
    }

    // Only count approved participants
    const participantsWithSlot = selectedActivityForRegistration.participants.filter((p: any) => {
      const approvalStatus = p.approvalStatus || 'pending';
      // Only count approved participants
      if (approvalStatus !== 'approved') return false;
      
      if (p.registeredDaySlots && Array.isArray(p.registeredDaySlots) && p.registeredDaySlots.length > 0) {
        return p.registeredDaySlots.some((ds: any) => ds.day === day && ds.slot === slot);
      }
      return true; // If no registeredDaySlots, assume registered for all
    }).length;

    return Math.round((participantsWithSlot / selectedActivityForRegistration.maxParticipants) * 100);
  }, [selectedActivityForRegistration]);

  const canRegister = useCallback((day: number, slot: 'morning' | 'afternoon' | 'evening'): boolean => {
    if (!selectedActivityForRegistration) return false;
    
    // Check if activity has maxParticipants limit
    if (selectedActivityForRegistration.maxParticipants && selectedActivityForRegistration.maxParticipants !== Infinity) {
      // Count approved participants for this specific day and slot
      let approvedCount = 0;
      
      if (selectedActivityForRegistration.type === 'multiple_days') {
        approvedCount = selectedActivityForRegistration.participants?.filter((p: any) => {
          const approvalStatus = p.approvalStatus || 'pending';
          if (approvalStatus !== 'approved') return false;
          
          if (p.registeredDaySlots && Array.isArray(p.registeredDaySlots) && p.registeredDaySlots.length > 0) {
            return p.registeredDaySlots.some((ds: any) => ds.day === day && ds.slot === slot);
          }
          return true; // If no registeredDaySlots, assume registered for all
        }).length || 0;
      } else {
        approvedCount = selectedActivityForRegistration.participants?.filter((p: any) => {
          const approvalStatus = p.approvalStatus || 'pending';
          return approvalStatus === 'approved';
        }).length || 0;
      }
      
      // If already full, cannot register
      if (approvedCount >= selectedActivityForRegistration.maxParticipants) {
        return false;
      }
    }
    
    // Check registration rate threshold
    const rate = calculateRegistrationRate(day, slot);
    const threshold = getRegistrationThreshold();
    return rate < threshold;
  }, [calculateRegistrationRate, selectedActivityForRegistration, getRegistrationThreshold]);

  const calculateTotalRegistrationRate = useCallback((): number => {
    if (!selectedActivityForRegistration || selectedDaySlotsForRegistration.length === 0) return 0;
    
    if (selectedActivityForRegistration.type === 'multiple_days' && parsedScheduleData.length > 0) {
      let totalSelected = selectedDaySlotsForRegistration.length;
      let totalAvailable = 0;
      
      parsedScheduleData.forEach((dayData) => {
        const activeSlots = dayData.slots.filter(s => s.slotKey).length;
        totalAvailable += activeSlots;
      });
      
      if (totalAvailable === 0) return 0;
      return Math.round((totalSelected / totalAvailable) * 100);
    }
    return 0;
  }, [selectedActivityForRegistration, selectedDaySlotsForRegistration, parsedScheduleData]);

  // Toggle slot selection for single_day activities
  const toggleSingleDaySlotSelection = async (slot: 'morning' | 'afternoon' | 'evening') => {
    const exists = selectedSingleDaySlots.includes(slot);
    
    if (exists) {
      setSelectedSingleDaySlots(prev => prev.filter(s => s !== slot));
    } else {
      // Check if registration is allowed
      if (!selectedActivityForRegistration) return;
      
      // For single_day, we need to check if the slot can be registered
      // Check maxParticipants if exists
      if (selectedActivityForRegistration.maxParticipants && selectedActivityForRegistration.maxParticipants !== Infinity) {
        const approvedCount = selectedActivityForRegistration.participants?.filter((p: any) => {
          const approvalStatus = p.approvalStatus || 'pending';
          return approvalStatus === 'approved';
        }).length || 0;
        
        if (approvedCount >= selectedActivityForRegistration.maxParticipants) {
          alert('Hoạt động này đã đủ số lượng người tham gia.');
          return;
        }
      }

      // Check for overlapping slots with other activities
      if (user && selectedActivityForRegistration && selectedActivityForRegistration.id && selectedActivityForRegistration.date) {
        try {
          // Convert slot to day number (use day 1 for single_day)
          const slotName = slot === 'morning' ? 'Buổi Sáng' : 
                          slot === 'afternoon' ? 'Buổi Chiều' : 'Buổi Tối';
          const timeSlot = selectedActivityForRegistration.timeSlots?.find((ts: any) => ts.name === slotName && ts.isActive);
          
          if (!timeSlot) {
            alert('Buổi này không tồn tại hoặc đã bị tắt.');
            return;
          }

          const response = await fetch('/api/activities/check-slot-overlap', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              activityId: selectedActivityForRegistration.id,
              day: 1, // Use day 1 for single_day
              slot: slot,
              schedule: undefined, // No schedule for single_day
              date: selectedActivityForRegistration.date // Pass the activity date
            }),
          });

          const result = await response.json();
          
          if (result.success && result.hasOverlap && result.overlappingActivities && result.overlappingActivities.length > 0) {
            const slotNames: { [key: string]: string } = {
              'morning': 'Sáng',
              'afternoon': 'Chiều',
              'evening': 'Tối'
            };

            const overlapMessages = result.overlappingActivities.map((overlap: any) => {
              const slotName = slotNames[overlap.slot] || overlap.slot;
              let message = `"${overlap.activityName}"`;
              if (overlap.date) {
                const date = new Date(overlap.date);
                message += ` - ${date.toLocaleDateString('vi-VN')}`;
              }
              if (overlap.startTime && overlap.endTime) {
                message += ` (${overlap.startTime} - ${overlap.endTime})`;
              }
              return message;
            });

            const slotName = slotNames[slot] || slot;
            const activityDate = selectedActivityForRegistration.date;
            
            // Show beautiful warning modal instead of alert
            setOverlapWarning({
              show: true,
              overlappingActivities: result.overlappingActivities,
              day: 1,
              slot: slotName,
              date: activityDate,
              currentActivityName: selectedActivityForRegistration.title,
              currentSlotStartTime: timeSlot.startTime,
              currentSlotEndTime: timeSlot.endTime
            });
            return; // Block registration - don't add to selection
          }
        } catch (error) {
          console.error('Error checking slot overlap:', error);
          // Continue with selection even if check fails
        }
      }

      setSelectedSingleDaySlots(prev => [...prev, slot]);
    }
  };

  // Handle registration for single_day activities with selected slots
  const handleRegisterSingleDay = async () => {
    if (!isAuthenticated || !token || !selectedActivityForRegistration || !user) {
      alert("Bạn cần đăng nhập để đăng ký hoặc hủy đăng ký hoạt động.");
      return;
    }

    if (selectedSingleDaySlots.length === 0) {
      alert("Vui lòng chọn ít nhất một buổi để đăng ký.");
      return;
    }

    // Check total registration rate for selected slots
    // For single_day: rate = selected slots / total available slots
    const activeSlots = selectedActivityForRegistration.timeSlots?.filter((slot: any) => slot.isActive) || [];
    const totalAvailableSlots = activeSlots.length;
    if (totalAvailableSlots === 0) {
      alert("Không có buổi nào để đăng ký.");
      return;
    }

    const selectedSlotsCount = selectedSingleDaySlots.length;
    const totalRate = Math.round((selectedSlotsCount / totalAvailableSlots) * 100);
    const threshold = getRegistrationThreshold();
    
    if (totalRate < threshold) {
      alert(`Tổng tỷ lệ đăng ký của các buổi đã chọn là ${totalRate}%. Bạn phải chọn đủ buổi để tổng tỷ lệ đạt ít nhất ${threshold}% mới có thể đăng ký.`);
      return;
    }

    // Kiểm tra lại trùng lịch cho tất cả các slot đã chọn trước khi submit
    if (user && selectedActivityForRegistration && selectedActivityForRegistration.id && selectedActivityForRegistration.date) {
      try {
        const overlapChecks = await Promise.all(
          selectedSingleDaySlots.map(async (slot) => {
            const slotName = slot === 'morning' ? 'Buổi Sáng' : 
                            slot === 'afternoon' ? 'Buổi Chiều' : 'Buổi Tối';
            const timeSlot = selectedActivityForRegistration.timeSlots?.find((ts: any) => ts.name === slotName && ts.isActive);
            
            if (!timeSlot) return null;

            const response = await fetch('/api/activities/check-slot-overlap', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({
                activityId: selectedActivityForRegistration.id,
                day: 1,
                slot: slot,
                schedule: undefined,
                date: selectedActivityForRegistration.date
              }),
            });

            const result = await response.json();
            
            if (result.success && result.hasOverlap && result.overlappingActivities && result.overlappingActivities.length > 0) {
              return { slot, slotName, timeSlot, overlappingActivities: result.overlappingActivities };
            }
            return null;
          })
        );

        const foundOverlaps = overlapChecks.filter((check): check is { slot: 'morning' | 'afternoon' | 'evening'; slotName: string; timeSlot: any; overlappingActivities: any[] } => check !== null);
        
        if (foundOverlaps.length > 0) {
          // Hiển thị warning cho slot đầu tiên bị trùng
          const firstOverlap = foundOverlaps[0];
          const slotNames: { [key: string]: string } = {
            'morning': 'Sáng',
            'afternoon': 'Chiều',
            'evening': 'Tối'
          };
          const slotName = slotNames[firstOverlap.slot] || firstOverlap.slot;
          
          setOverlapWarning({
            show: true,
            overlappingActivities: firstOverlap.overlappingActivities,
            day: 1,
            slot: slotName,
            date: selectedActivityForRegistration.date,
            currentActivityName: selectedActivityForRegistration.title,
            currentSlotStartTime: firstOverlap.timeSlot.startTime,
            currentSlotEndTime: firstOverlap.timeSlot.endTime
          });
          return; // Block registration
        }
      } catch (error) {
        console.error('Error checking slot overlap before submit:', error);
        // Continue with registration even if check fails
      }
    }

    setRegisteringActivities(prev => new Set(prev).add(selectedActivityForRegistration.id));
    setError(null);
    setSuccessMessage(null);

    try {
      // Convert selected slots to daySlots format (day = 1 for single_day)
      const daySlots = selectedSingleDaySlots.map(slot => ({
        day: 1,
        slot: slot
      }));

      const url = `/api/activities/${selectedActivityForRegistration.id}/register`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          userId: user._id, 
          name: user.name, 
          email: user.email, 
          role: 'Người Tham Gia',
          daySlots: daySlots
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to register for activity');
      }

      const result = await response.json();
      setSuccessMessage(result.message || 'Đăng ký thành công');
      setTimeout(() => setSuccessMessage(null), 3000);

      // Close modal
      setShowSingleDayRegistrationModal(false);
      setSelectedSingleDaySlots([]);
      setSelectedActivityForRegistration(null);

      // Refetch activities
      const activitiesResponse = await fetch('/api/activities', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (activitiesResponse.ok) {
        const responseData = await activitiesResponse.json();
        const activitiesData: RawActivity[] = responseData.data.activities;
        const updatedUser = await refetchUser();
        const currentUser = updatedUser || user;
        
        const filteredActivities = activitiesData.filter((activity: RawActivity) => {
          if (activity.status === 'draft') {
            return false;
          }
          if (currentUser?.role === 'STUDENT') {
            return activity.visibility === 'public';
          } else {
            return true;
          }
        }).map((activity: RawActivity) => {
          // ... (same mapping logic as in handleRegisterActivity)
          let isRegistered = false;
          let approvalStatus: 'pending' | 'approved' | 'rejected' | 'removed' | undefined = undefined;

          const userParticipant = activity.participants?.find((p: any) => {
            const userId = typeof p.userId === 'object' && p.userId !== null
              ? (p.userId._id || p.userId.$oid || String(p.userId))
              : (p.userId?.$oid || p.userId);
            return userId === currentUser?._id;
          });

          if (userParticipant) {
            const participantApprovalStatus = (userParticipant as any).approvalStatus || 'pending';
            
            if (participantApprovalStatus === 'removed') {
              isRegistered = false;
              approvalStatus = 'removed';
            } else {
              const isMultipleDays = activity.type === 'multiple_days';
              if (isMultipleDays) {
                const registeredSlots = (userParticipant as any).registeredDaySlots || [];
                if (registeredSlots.length > 0) {
                  isRegistered = true;
                  approvalStatus = participantApprovalStatus;
                } else {
                  isRegistered = false;
                  approvalStatus = undefined;
                }
              } else {
                isRegistered = true;
                approvalStatus = participantApprovalStatus;
              }
            }
          }

          const isMultipleDays = activity.type === 'multiple_days';
          let date: string, time: string, timeSlots: any[], numberOfSessions: number;

          if (isMultipleDays) {
            const startDate = activity.startDate ? new Date(activity.startDate) : null;
            const endDate = activity.endDate ? new Date(activity.endDate) : null;

            if (startDate && endDate) {
              const startStr = startDate.toLocaleDateString('vi-VN');
              const endStr = endDate.toLocaleDateString('vi-VN');
              date = startStr === endStr ? startStr : `${startStr} - ${endStr}`;
            } else if (startDate) {
              date = startDate.toLocaleDateString('vi-VN');
            } else {
              date = 'Chưa có';
            }

            let allTimeSlots: any[] = [];
            let totalSessions = 0;

            if (activity.schedule && activity.schedule.length > 0) {
              activity.schedule.forEach((scheduleItem) => {
                const scheduleText = scheduleItem.activities || '';
                const lines = scheduleText.split('\n').filter(line => line.trim());

                lines.forEach((line: string) => {
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
            overview: activity.description || activity.overview,
            numberOfSessions: numberOfSessions,
            registeredParticipantsCount: activity.participants?.filter((p: any) => {
              const approvalStatus = p.approvalStatus || 'pending';
              return approvalStatus === 'approved';
            }).length || 0,
            organizer: activity.responsiblePerson?.name || activity.participants?.find(p => p.role === 'Trưởng Nhóm')?.name || activity.participants?.[0]?.name || 'Chưa có',
            organizerAvatarUrl: activity.responsiblePerson?.avatarUrl,
            isRegistered: isRegistered,
            maxParticipants: activity.maxParticipants,
            approvalStatus: approvalStatus,
            registrationThreshold: activity.registrationThreshold,
            isMultipleDays: isMultipleDays,
            startDate: activity.startDate,
            endDate: activity.endDate,
            schedule: activity.schedule,
          };
        });
        setAvailableActivities(filteredActivities);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Có lỗi xảy ra khi đăng ký';
      setError(errorMessage);
      console.error('Registration error:', err);
    } finally {
      setRegisteringActivities(prev => {
        const newSet = new Set(prev);
        if (selectedActivityForRegistration) {
          newSet.delete(selectedActivityForRegistration.id);
        }
        return newSet;
      });
    }
  };

  const toggleDaySlotSelection = async (day: number, slot: 'morning' | 'afternoon' | 'evening') => {
    const slotName = slot === 'morning' ? 'Buổi Sáng' : slot === 'afternoon' ? 'Buổi Chiều' : 'Buổi Tối';
    const existingIndex = selectedDaySlotsForRegistration.findIndex(ds => ds.day === day && ds.slot === slot);
    
    if (existingIndex >= 0) {
      // Remove if already selected
      setSelectedDaySlotsForRegistration(prev => prev.filter((_, idx) => idx !== existingIndex));
    } else {
      // Check if can register
      if (!canRegister(day, slot)) {
        const threshold = getRegistrationThreshold();
        alert(`Tỷ lệ đăng ký cho ngày ${day}, buổi ${slotName} đã đạt ${calculateRegistrationRate(day, slot)}%. Chỉ có thể đăng ký khi tỷ lệ dưới ${threshold}%.`);
        return;
      }

      // Check for overlapping slots with other activities
      if (user && selectedActivityForRegistration && selectedActivityForRegistration.id) {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch('/api/activities/check-slot-overlap', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              activityId: selectedActivityForRegistration.id,
              day: day,
              slot: slot,
              schedule: selectedActivityForRegistration.schedule
            }),
          });

          const result = await response.json();
          
          if (result.success && result.hasOverlap && result.overlappingActivities && result.overlappingActivities.length > 0) {
            const slotNames: { [key: string]: string } = {
              'morning': 'Sáng',
              'afternoon': 'Chiều',
              'evening': 'Tối'
            };

            const overlapMessages = result.overlappingActivities.map((overlap: any) => {
              const slotName = slotNames[overlap.slot] || overlap.slot;
              let message = `"${overlap.activityName}" (Ngày ${overlap.day}, Buổi ${slotName})`;
              if (overlap.date) {
                const date = new Date(overlap.date);
                message += ` - ${date.toLocaleDateString('vi-VN')}`;
              }
              return message;
            });

            const slotName = slotNames[slot] || slot;
            
            // Find the actual date and time for the selected day from parsedScheduleData
            let selectedDayDate: string | undefined;
            let currentSlotStartTime: string | undefined;
            let currentSlotEndTime: string | undefined;
            if (parsedScheduleData && parsedScheduleData.length > 0) {
              const dayData = parsedScheduleData.find(d => d.day === day);
              if (dayData) {
                selectedDayDate = dayData.date;
                // Find the slot time
                const slotData = dayData.slots.find(s => s.slotKey === slot);
                if (slotData) {
                  currentSlotStartTime = slotData.startTime;
                  currentSlotEndTime = slotData.endTime;
                }
              }
            }
            
            // Show beautiful warning modal instead of alert
            setOverlapWarning({
              show: true,
              overlappingActivities: result.overlappingActivities,
              day: day,
              slot: slotName,
              date: selectedDayDate,
              currentActivityName: selectedActivityForRegistration?.title,
              currentSlotStartTime: currentSlotStartTime,
              currentSlotEndTime: currentSlotEndTime
            });
            return; // Block registration - don't add to selection
          }
        } catch (error) {
          console.error('Error checking slot overlap:', error);
          // Continue with selection even if check fails
        }
      }

      // Add if not selected
      setSelectedDaySlotsForRegistration(prev => [...prev, { day, slot }]);
    }
  };

  const handleRegisterWithDaySlots = async () => {
    if (!selectedActivityForRegistration || !isAuthenticated || !token || !user) return;
    
    const totalRate = calculateTotalRegistrationRate();
    const threshold = getRegistrationThreshold();
    
    if (selectedDaySlotsForRegistration.length === 0) {
      setError('Vui lòng chọn ít nhất một buổi để đăng ký');
      return;
    }
    
    if (totalRate < threshold) {
      setError(`Bạn phải đăng ký ít nhất ${threshold}% tổng số buổi. Hiện tại: ${totalRate}%`);
      return;
    }

    setRegisteringActivities(prev => new Set(prev).add(selectedActivityForRegistration.id));
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/activities/${selectedActivityForRegistration.id}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          userId: user._id, 
          name: user.name, 
          email: user.email, 
          role: 'Người Tham Gia',
          daySlots: selectedDaySlotsForRegistration
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Đăng ký thất bại');
      }

      const result = await response.json();
      setSuccessMessage(result.message || 'Đăng ký thành công');
      setTimeout(() => setSuccessMessage(null), 3000);

      // Close modal and reset
      setShowRegistrationModal(false);
      setSelectedDaySlotsForRegistration([]);
      setSelectedActivityForRegistration(null);
      setParsedScheduleData([]);

      // Refetch activities
      const activitiesResponse = await fetch('/api/activities', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (activitiesResponse.ok) {
        const responseData = await activitiesResponse.json();
        const activitiesData: RawActivity[] = responseData.data.activities;
        const updatedUser = await refetchUser();
        const currentUser = updatedUser || user;
        
        const filteredActivities = activitiesData.filter((activity: RawActivity) => {
          if (activity.status === 'draft') return false;
          if (currentUser?.role === 'STUDENT') {
            return activity.visibility === 'public';
          }
          return true;
        }).map((activity: RawActivity) => {
          let isRegistered = false;
          let approvalStatus: 'pending' | 'approved' | 'rejected' | 'removed' | undefined = undefined;

          const userParticipant = activity.participants?.find((p: any) => {
            const userId = typeof p.userId === 'object' && p.userId !== null
              ? (p.userId._id || p.userId.$oid || String(p.userId))
              : (p.userId?.$oid || p.userId);
            return userId === currentUser?._id;
          });

          if (userParticipant) {
            const participantApprovalStatus = (userParticipant as any).approvalStatus || 'pending';
            
            // If participant is removed, they are not considered registered
            if (participantApprovalStatus === 'removed') {
              isRegistered = false;
              approvalStatus = 'removed';
            } else {
              // For multiple days activities, user must have selected at least one slot to be considered "registered"
              const isMultipleDays = activity.type === 'multiple_days';
              if (isMultipleDays) {
                const registeredSlots = (userParticipant as any).registeredDaySlots || [];
                // Only consider registered if user has selected at least one slot
                if (registeredSlots.length > 0) {
                  isRegistered = true;
                  approvalStatus = participantApprovalStatus;
                } else {
                  // User is in participants but hasn't selected any slots yet - not fully registered
                  isRegistered = false;
                  approvalStatus = undefined;
                }
              } else {
                // For single day activities, being in participants means registered
                isRegistered = true;
                approvalStatus = participantApprovalStatus;
              }
            }
          }

          const isMultipleDays = activity.type === 'multiple_days';
          let date: string, time: string, timeSlots: any[], numberOfSessions: number;

          if (isMultipleDays) {
            const startDate = activity.startDate ? new Date(activity.startDate) : null;
            const endDate = activity.endDate ? new Date(activity.endDate) : null;

            if (startDate && endDate) {
              const startStr = startDate.toLocaleDateString('vi-VN');
              const endStr = endDate.toLocaleDateString('vi-VN');
              date = startStr === endStr ? startStr : `${startStr} - ${endStr}`;
            } else if (startDate) {
              date = startDate.toLocaleDateString('vi-VN');
            } else {
              date = 'Chưa có';
            }

            let allTimeSlots: any[] = [];
            let totalSessions = 0;

            if (activity.schedule && activity.schedule.length > 0) {
              activity.schedule.forEach((scheduleItem) => {
                const scheduleText = scheduleItem.activities || '';
                const lines = scheduleText.split('\n').filter(line => line.trim());

                lines.forEach((line: string) => {
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
            overview: activity.description || activity.overview,
            numberOfSessions: numberOfSessions,
            registeredParticipantsCount: activity.participants?.filter((p: any) => {
              const approvalStatus = p.approvalStatus || 'pending';
              return approvalStatus === 'approved';
            }).length || 0,
            organizer: activity.responsiblePerson?.name || activity.participants?.find(p => p.role === 'Trưởng Nhóm')?.name || activity.participants?.[0]?.name || 'Chưa có',
            organizerAvatarUrl: activity.responsiblePerson?.avatarUrl,
            isRegistered: isRegistered,
            maxParticipants: activity.maxParticipants,
            approvalStatus: approvalStatus,
            registrationThreshold: activity.registrationThreshold,
            isMultipleDays: isMultipleDays,
            startDate: activity.startDate,
            endDate: activity.endDate,
            schedule: activity.schedule,
          };
        });
        setAvailableActivities(filteredActivities);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Có lỗi xảy ra khi đăng ký';
      setError(errorMessage);
      console.error('Registration error:', err);
    } finally {
      setRegisteringActivities(prev => {
        const newSet = new Set(prev);
        newSet.delete(selectedActivityForRegistration.id);
        return newSet;
      });
    }
  };

  if (loading) {
    return (
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
    );
  }

  if (error) {
    return (
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
    );
  }

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-200 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <StudentNav key="student-nav" />
      
      <main className={`flex-1 max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-6 w-full ${isDarkMode ? 'text-white' : 'text-gray-900'}`} style={{ paddingTop: '0', marginTop: '0' }}>
        {/* Banner yêu cầu đăng nhập khi chưa đăng nhập */}
        {!isAuthenticated && (
          <div className={`mb-4 rounded-xl border-2 p-4 ${
            isDarkMode 
              ? 'bg-blue-900/20 border-blue-700 text-blue-200' 
              : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <AlertCircle size={24} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} />
                <div>
                  <p className="font-semibold text-sm sm:text-base">
                    Bạn đang xem ở chế độ khách
                  </p>
                  <p className="text-xs sm:text-sm mt-1 opacity-90">
                    Đăng nhập để đăng ký tham gia các hoạt động và xem thông tin cá nhân
                  </p>
                </div>
              </div>
              <button
                onClick={() => router.push('/auth/login')}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                  isDarkMode 
                    ? 'bg-blue-600 hover:bg-blue-500 text-white' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                Đăng nhập
              </button>
            </div>
          </div>
        )}

        {/* Header Section - Modern & Prominent (chỉ hiển thị khi đã đăng nhập) */}
        {isAuthenticated && user && (
          <div className={`mb-3 sm:mb-4 rounded-xl p-3 sm:p-4 ${
            isDarkMode 
              ? 'bg-gray-800 border border-gray-700/50' 
              : 'bg-white border border-gray-200 shadow-sm'
          }`}>
            <div className="flex items-center gap-3 sm:gap-4">
              <div className={`flex-shrink-0 p-2 sm:p-2.5 rounded-xl ${
                isDarkMode 
                  ? 'bg-gray-700/50' 
                  : 'bg-gray-100'
              }`}>
                <User size={20} className={isDarkMode ? 'text-gray-300' : 'text-gray-700'} strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className={`text-xl sm:text-2xl lg:text-3xl font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Chào mừng, {user?.name || 'Sinh viên'}! 👋
                </h1>
                <p className={`text-xs sm:text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Khám phá và tham gia các hoạt động của CLB Sinh viên 5 Tốt
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Banner/Slider Section */}
        {banners.length > 0 && (
        <div className="mb-3 sm:mb-4 relative flex justify-center">
          <div 
            ref={bannerSliderRef}
            className="relative w-[92%] max-w-6xl h-[200px] sm:h-[220px] md:h-[240px] rounded-lg overflow-hidden shadow-md mx-auto"
          >
            {/* Banner Images */}
            <div className="relative w-full h-full">
              {banners.map((banner, index) => (
                <div
                  key={banner.id}
                  className={`absolute inset-0 transition-opacity duration-500 ${
                    index === currentBannerIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
                  }`}
                >
                  {banner.link ? (
                    <a href={banner.link} className="block w-full h-full">
                      <img
                        src={banner.imageUrl}
                        alt={banner.title}
                        className="w-full h-full"
                        style={{ objectFit: (banner.imageFit || 'cover') as React.CSSProperties['objectFit'] }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/1200x400/6366f1/ffffff?text=Banner+Image';
                        }}
                      />
                    </a>
                  ) : (
                    <img
                      src={banner.imageUrl}
                      alt={banner.title}
                      className="w-full h-full"
                      style={{ objectFit: (banner.imageFit || 'cover') as React.CSSProperties['objectFit'] }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/1200x400/6366f1/ffffff?text=Banner+Image';
                      }}
                    />
                  )}
                  
                  {/* Overlay Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                  
                  {/* Banner Title */}
                  <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3 z-20">
                    <h3 className={`text-sm sm:text-base font-bold text-white drop-shadow-lg`}>
                      {banner.title}
                    </h3>
                  </div>
                </div>
              ))}
            </div>

            {/* Navigation Dots */}
            {banners.length > 1 && (
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 z-30 flex gap-1.5">
                {banners.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentBannerIndex(index)}
                    className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                      index === currentBannerIndex
                        ? 'bg-white w-6'
                        : 'bg-white/50 hover:bg-white/75'
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            )}

            {/* Navigation Arrows */}
            {banners.length > 1 && (
              <>
                <button
                  onClick={() => setCurrentBannerIndex((prev) => (prev - 1 + banners.length) % banners.length)}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 z-30 p-1.5 rounded-full bg-black/30 hover:bg-black/50 text-white transition-all duration-200 backdrop-blur-sm"
                  aria-label="Previous slide"
                >
                  <ChevronDown size={16} className="rotate-90" strokeWidth={2} />
                </button>
                <button
                  onClick={() => setCurrentBannerIndex((prev) => (prev + 1) % banners.length)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 z-30 p-1.5 rounded-full bg-black/30 hover:bg-black/50 text-white transition-all duration-200 backdrop-blur-sm"
                  aria-label="Next slide"
                >
                  <ChevronDown size={16} className="-rotate-90" strokeWidth={2} />
                </button>
              </>
            )}
          </div>
        </div>
        )}

        {/* Tomorrow Activities Countdown Section */}
        {isAuthenticated && user && (() => {
          const tomorrowActivities = availableActivities.filter(activity => {
            // Chỉ hiển thị nếu:
            // 1. Đã đăng ký và được duyệt
            // 2. Diễn ra vào ngày mai
            return activity.isRegistered && 
                   activity.approvalStatus === 'approved' && 
                   isActivityTomorrow(activity);
          });

          if (tomorrowActivities.length === 0) return null;

          return (
            <div 
              id="tomorrow-activities-section"
              className={`mb-4 mt-4 rounded-xl border-2 overflow-visible shadow-lg relative z-30 scroll-mt-24 ${
                isDarkMode 
                  ? 'bg-gradient-to-br from-blue-900/40 via-blue-800/50 to-blue-900/40 border-blue-500/70 ring-2 ring-blue-500/20' 
                  : 'bg-gradient-to-br from-blue-50 via-blue-100/60 to-blue-50 border-blue-400 shadow-blue-300/50 ring-2 ring-blue-200/30'
              }`}
              style={{ 
                scrollMarginTop: '100px',
                position: 'relative',
                isolation: 'isolate',
                marginTop: '20px'
              }}
            >
              {/* Header */}
              <div className={`px-3 sm:px-4 py-2 sm:py-2.5 border-b-2 ${
                isDarkMode 
                  ? 'bg-gradient-to-r from-blue-800/60 via-blue-700/60 to-blue-800/60 border-blue-500/70' 
                  : 'bg-gradient-to-r from-blue-200 via-blue-300/50 to-blue-200 border-blue-400'
              }`}>
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className={`p-1.5 rounded-lg ${
                    isDarkMode 
                      ? 'bg-blue-600/40 text-blue-200' 
                      : 'bg-blue-500 text-white shadow-xl'
                  }`}>
                    <Bell size={16} strokeWidth={2} />
                  </div>
                  <div className="flex-1">
                    <h2 className={`text-sm sm:text-base font-bold mb-0.5 ${
                      isDarkMode ? 'text-blue-100' : 'text-blue-900'
                    }`}>
                      📅 Hoạt động sắp diễn ra
                    </h2>
                    <p className={`text-xs ${isDarkMode ? 'text-blue-200/90' : 'text-blue-800'}`}>
                      Có <span className="font-bold">{tomorrowActivities.length}</span> hoạt động sẽ diễn ra vào ngày mai
                    </p>
                  </div>
                </div>
              </div>

              {/* Activities List */}
              <div className="p-3 sm:p-4">
                {(() => {
                  const groupedByDate = groupActivitiesByDate(tomorrowActivities);
                  const shouldGroup = tomorrowActivities.length > 3; // Chỉ nhóm khi có nhiều hơn 3 hoạt động
                  
                  if (shouldGroup && groupedByDate.length > 0) {
                    return (
                      <div className="space-y-4">
                        {groupedByDate.map(({ dateKey, dateLabel, activities }) => (
                          <div key={dateKey} className="space-y-3">
                            {/* Date Header */}
                            <div className={`px-2 py-1.5 rounded-lg border ${
                              isDarkMode 
                                ? 'bg-blue-800/30 border-blue-500/50' 
                                : 'bg-blue-100/50 border-blue-300'
                            }`}>
                              <div className="flex items-center gap-2">
                                <Calendar size={14} className={isDarkMode ? 'text-blue-300' : 'text-blue-700'} strokeWidth={2} />
                                <h3 className={`text-sm font-bold ${
                                  isDarkMode ? 'text-blue-200' : 'text-blue-900'
                                }`}>
                                  {dateLabel}
                                </h3>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  isDarkMode 
                                    ? 'bg-blue-600/40 text-blue-200' 
                                    : 'bg-blue-500 text-white'
                                }`}>
                                  {activities.length} hoạt động
                                </span>
                              </div>
                            </div>
                            
                            {/* Activities Grid for this date */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {activities.map((activity) => {
                                const timeUntil = getTimeUntilFirstSlot(activity);
                                if (!timeUntil) return null;

                                const formatTime = (value: number) => String(value).padStart(2, '0');

                                return (
                                  <div
                                    key={activity.id}
                                    onClick={() => { router.push(`/student/activities/${activity.id}`); }}
                                    className={`group rounded-lg border-2 overflow-hidden shadow-md transition-all duration-300 hover:shadow-lg hover:scale-[1.02] flex flex-col h-full cursor-pointer ${
                                      isDarkMode 
                                        ? 'bg-gray-800/95 border-blue-500/50 hover:border-blue-400' 
                                        : 'bg-white border-blue-300 hover:border-blue-400'
                                    }`}
                                    style={{ minHeight: '280px', maxHeight: '280px' }}
                                  >
                        {/* Countdown Badge */}
                        <div className={`px-3 py-2 border-b-2 flex-shrink-0 ${
                          isDarkMode
                            ? 'bg-gradient-to-r from-blue-600/50 via-blue-500/50 to-blue-600/50 border-blue-400/50'
                            : 'bg-gradient-to-r from-blue-500 via-blue-600 to-blue-500 border-blue-400'
                        }`}>
                          <div className="flex items-center justify-center gap-1.5">
                            <Clock size={14} className="text-white animate-pulse" strokeWidth={2} />
                            <span className="text-[10px] font-bold uppercase tracking-wide text-white">
                              Điểm danh sau
                            </span>
                          </div>
                        </div>

                        {/* Activity Info */}
                        <div className="p-3 flex-1 flex flex-col min-h-0">
                          {/* Image - Fixed height */}
                          <div className="relative mb-2 rounded-lg overflow-hidden flex-shrink-0" style={{ height: '80px' }}>
                            {activity.imageUrl ? (
                              <img
                                src={activity.imageUrl}
                                alt={activity.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className={`w-full h-full flex items-center justify-center ${
                                isDarkMode ? 'bg-gray-700/50' : 'bg-gray-100'
                              }`}>
                                <ImageIcon size={20} className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} strokeWidth={1.5} />
                              </div>
                            )}
                            {/* Registered Badge - Top Left */}
                            {activity.isRegistered && (
                              <div className="absolute top-1 left-1 z-10">
                                <div className={`p-1 rounded-full shadow-md backdrop-blur-sm ${
                                  activity.approvalStatus === 'approved'
                                    ? isDarkMode 
                                      ? 'bg-green-500/90 text-white border border-green-400/50' 
                                      : 'bg-green-500 text-white border border-green-600'
                                    : activity.approvalStatus === 'pending'
                                    ? isDarkMode 
                                      ? 'bg-yellow-500/90 text-white border border-yellow-400/50' 
                                      : 'bg-yellow-500 text-white border border-yellow-600'
                                    : activity.approvalStatus === 'rejected'
                                    ? isDarkMode 
                                      ? 'bg-red-500/90 text-white border border-red-400/50' 
                                      : 'bg-red-500 text-white border border-red-600'
                                    : isDarkMode 
                                      ? 'bg-gray-500/90 text-white border border-gray-400/50' 
                                      : 'bg-gray-500 text-white border border-gray-600'
                                }`}>
                                  <CheckCircle2 size={10} strokeWidth={2.5} />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Title */}
                          <div className="mb-1 flex-shrink-0" style={{ minHeight: '32px', maxHeight: '32px' }}>
                            <h3 className={`text-xs font-bold line-clamp-2 ${
                              isDarkMode ? 'text-white' : 'text-gray-900'
                            }`}>
                              {activity.title}
                            </h3>
                          </div>

                          {/* Date - Moved up */}
                          <div className={`flex items-center gap-1.5 mb-1.5 text-[10px] flex-shrink-0 ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            <Calendar size={10} />
                            <span className="truncate">
                              {activity.isMultipleDays
                                ? activity.startDate && activity.endDate
                                  ? `${new Date(activity.startDate).toLocaleDateString('vi-VN')} - ${new Date(activity.endDate).toLocaleDateString('vi-VN')}`
                                  : activity.date
                                : activity.date}
                            </span>
                          </div>

                          {/* Countdown Timer */}
                          <div className={`mb-1.5 text-center flex-shrink-0 ${
                            isDarkMode ? 'text-white' : 'text-gray-900'
                          }`}>
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                              isDarkMode 
                                ? 'bg-blue-600/30 border-2 border-blue-500/50' 
                                : 'bg-blue-50 border-2 border-blue-300'
                            }`}>
                              <span className={`text-lg font-bold ${
                                isDarkMode ? 'text-blue-200' : 'text-blue-700'
                              }`}>
                                {formatTime(timeUntil.hours)}:{formatTime(timeUntil.minutes)}:{formatTime(timeUntil.seconds)}
                              </span>
                            </div>
                            <p className={`text-[10px] mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              (Giờ:Phút:Giây)
                            </p>
                          </div>

                          {/* Info Section - Flexible */}
                          <div className="flex-1 flex flex-col justify-end min-h-0">
                            <div className="space-y-1 flex-shrink-0">
                              {/* Location */}
                              {activity.location && (
                                <div className={`flex items-center gap-1.5 text-[10px] ${
                                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                }`}>
                                  <MapPin size={10} />
                                  <span className="truncate">{activity.location}</span>
                                </div>
                              )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  } else {
                    // Không nhóm khi có ít hoạt động
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {tomorrowActivities.map((activity) => {
                          const timeUntil = getTimeUntilFirstSlot(activity);
                          if (!timeUntil) return null;

                          const formatTime = (value: number) => String(value).padStart(2, '0');

                          return (
                            <div
                              key={activity.id}
                              onClick={() => { router.push(`/student/activities/${activity.id}`); }}
                              className={`group rounded-lg border-2 overflow-hidden shadow-md transition-all duration-300 hover:shadow-lg hover:scale-[1.02] flex flex-col h-full cursor-pointer ${
                                isDarkMode 
                                  ? 'bg-gray-800/95 border-blue-500/50 hover:border-blue-400' 
                                  : 'bg-white border-blue-300 hover:border-blue-400'
                              }`}
                              style={{ minHeight: '280px', maxHeight: '280px' }}
                            >
                              {/* Countdown Badge */}
                              <div className={`px-3 py-2 border-b-2 flex-shrink-0 ${
                                isDarkMode
                                  ? 'bg-gradient-to-r from-blue-600/50 via-blue-500/50 to-blue-600/50 border-blue-400/50'
                                  : 'bg-gradient-to-r from-blue-500 via-blue-600 to-blue-500 border-blue-400'
                              }`}>
                                <div className="flex items-center justify-center gap-1.5">
                                  <Clock size={14} className="text-white animate-pulse" strokeWidth={2} />
                                  <span className="text-[10px] font-bold uppercase tracking-wide text-white">
                                    Điểm danh sau
                                  </span>
                                </div>
                              </div>

                              {/* Activity Info */}
                              <div className="p-3 flex-1 flex flex-col min-h-0">
                                {/* Image - Fixed height */}
                                <div className="mb-2 rounded-lg overflow-hidden flex-shrink-0" style={{ height: '80px' }}>
                                  {activity.imageUrl ? (
                                    <img
                                      src={activity.imageUrl}
                                      alt={activity.title}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className={`w-full h-full flex items-center justify-center ${
                                      isDarkMode ? 'bg-gray-700/50' : 'bg-gray-100'
                                    }`}>
                                      <ImageIcon size={20} className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} strokeWidth={1.5} />
                                    </div>
                                  )}
                                </div>

                                {/* Title */}
                                <div className="mb-1 flex-shrink-0" style={{ minHeight: '32px', maxHeight: '32px' }}>
                                  <h3 className={`text-xs font-bold line-clamp-2 ${
                                    isDarkMode ? 'text-white' : 'text-gray-900'
                                  }`}>
                                    {activity.title}
                                  </h3>
                                </div>

                                {/* Date - Moved up */}
                                <div className={`flex items-center gap-1.5 mb-1.5 text-[10px] flex-shrink-0 ${
                                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                }`}>
                                  <Calendar size={10} />
                                  <span className="truncate">
                                    {activity.isMultipleDays
                                      ? activity.startDate && activity.endDate
                                        ? `${new Date(activity.startDate).toLocaleDateString('vi-VN')} - ${new Date(activity.endDate).toLocaleDateString('vi-VN')}`
                                        : activity.date
                                      : activity.date}
                                  </span>
                                </div>

                                {/* Countdown Timer */}
                                <div className={`mb-1.5 text-center flex-shrink-0 ${
                                  isDarkMode ? 'text-white' : 'text-gray-900'
                                }`}>
                                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                                    isDarkMode 
                                      ? 'bg-blue-600/30 border-2 border-blue-500/50' 
                                      : 'bg-blue-50 border-2 border-blue-300'
                                  }`}>
                                    <span className={`text-lg font-bold ${
                                      isDarkMode ? 'text-blue-200' : 'text-blue-700'
                                    }`}>
                                      {formatTime(timeUntil.hours)}:{formatTime(timeUntil.minutes)}:{formatTime(timeUntil.seconds)}
                                    </span>
                                  </div>
                                  <p className={`text-[10px] mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                    (Giờ:Phút:Giây)
                                  </p>
                                </div>

                                {/* Info Section - Flexible */}
                                <div className="flex-1 flex flex-col justify-end min-h-0">
                                  <div className="space-y-1 flex-shrink-0">
                                    {/* Location */}
                                    {activity.location && (
                                      <div className={`flex items-center gap-1.5 text-[10px] ${
                                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                      }`}>
                                        <MapPin size={10} />
                                        <span className="truncate">{activity.location}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }
                })()}
              </div>
            </div>
          );
        })()}

        {/* Urgent Check-in Section - Compact & Modern with Eye-catching Effects */}
        {isAuthenticated && user && (() => {
          const urgentActivities = availableActivities.filter(activity => {
            return activity.isRegistered && 
                   activity.approvalStatus === 'approved' && 
                   isActivityNeedingCheckIn(activity);
          });

          if (urgentActivities.length === 0) return null;

          return (
            <div className={`mb-3 rounded-lg border-2 overflow-hidden shadow-lg relative ${
              isDarkMode 
                ? 'bg-gradient-to-br from-red-900/30 via-red-800/40 to-red-900/30 border-red-500/70' 
                : 'bg-gradient-to-br from-red-50 via-red-100/80 to-red-50 border-red-400 shadow-red-300/50'
            }`}
            style={{
              animation: 'pulse-glow 2s ease-in-out infinite',
            }}>
              {/* Animated border glow */}
              <div className={`absolute inset-0 rounded-lg ${
                isDarkMode 
                  ? 'bg-red-500/20' 
                  : 'bg-red-400/30'
              }`}
              style={{
                animation: 'pulse-border 2s ease-in-out infinite',
                boxShadow: isDarkMode 
                  ? '0 0 20px rgba(239, 68, 68, 0.3)' 
                  : '0 0 20px rgba(248, 113, 113, 0.4)',
              }} />
              
              {/* Compact Header with Animation */}
              <div className={`relative px-3 py-2 border-b-2 flex items-center justify-between ${
                isDarkMode 
                  ? 'bg-gradient-to-r from-red-700 via-red-600 to-red-700 border-red-500' 
                  : 'bg-gradient-to-r from-red-500 via-red-600 to-red-500 border-red-400'
              }`}
              style={{
                animation: 'pulse-header 2s ease-in-out infinite',
              }}>
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${
                    isDarkMode 
                      ? 'bg-red-500 text-white' 
                      : 'bg-red-700 text-white'
                  }`}
                  style={{
                    animation: 'pulse-icon 1.5s ease-in-out infinite',
                    boxShadow: isDarkMode 
                      ? '0 0 10px rgba(255, 255, 255, 0.3)' 
                      : '0 0 10px rgba(255, 255, 255, 0.4)',
                  }}>
                    <CheckSquare size={12} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h2 className={`text-xs font-bold ${
                      isDarkMode ? 'text-white' : 'text-white'
                    }`}
                    style={{
                      animation: 'pulse-text 2s ease-in-out infinite',
                      textShadow: '0 1px 3px rgba(0, 0, 0, 0.5)',
                    }}>
                      ⚠️ Cần điểm danh ngay
                    </h2>
                    <p className={`text-[10px] mt-0.5 font-medium ${
                      isDarkMode ? 'text-red-100' : 'text-red-50'
                    }`}
                    style={{
                      textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                    }}>
                      {urgentActivities.length} hoạt động đang diễn ra
                    </p>
                  </div>
                </div>
                <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                    isDarkMode 
                    ? 'bg-red-500 text-white border-2 border-red-400' 
                    : 'bg-red-700 text-white border-2 border-red-600'
                }`}
                style={{
                  animation: 'pulse-badge 1.5s ease-in-out infinite',
                  boxShadow: isDarkMode 
                    ? '0 0 12px rgba(255, 255, 255, 0.3)' 
                    : '0 0 12px rgba(255, 255, 255, 0.4)',
                }}>
                      {urgentActivities.length}
                </div>
              </div>

              {/* Compact Activities List */}
              <div className="p-2 relative z-10">
                {(() => {
                  const groupedByDate = groupActivitiesByDate(urgentActivities);
                  const shouldGroup = urgentActivities.length > 3; // Chỉ nhóm khi có nhiều hơn 3 hoạt động
                  
                  if (shouldGroup && groupedByDate.length > 0) {
                    return (
                      <div className="space-y-3">
                        {groupedByDate.map(({ dateKey, dateLabel, activities }) => (
                          <div key={dateKey} className="space-y-2">
                            {/* Date Header */}
                            <div className={`px-2 py-1.5 rounded-lg border ${
                              isDarkMode 
                                ? 'bg-red-800/30 border-red-500/50' 
                                : 'bg-red-100/50 border-red-300'
                            }`}>
                              <div className="flex items-center gap-2">
                                <Calendar size={14} className={isDarkMode ? 'text-red-300' : 'text-red-700'} strokeWidth={2} />
                                <h3 className={`text-sm font-bold ${
                                  isDarkMode ? 'text-red-200' : 'text-red-900'
                                }`}>
                                  {dateLabel}
                                </h3>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  isDarkMode 
                                    ? 'bg-red-600/40 text-red-200' 
                                    : 'bg-red-500 text-white'
                                }`}>
                                  {activities.length} hoạt động
                                </span>
                              </div>
                            </div>
                            
                            {/* Activities Grid for this date */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                              {activities.map((activity, index) => {
                                const slotDetails = getCheckInSlotDetails(activity);

                                return (
                      <div
                        key={activity.id}
                        className={`group rounded-lg border-2 overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${
                          isDarkMode 
                            ? 'bg-gray-800/90 border-red-500/40 hover:border-red-400/70' 
                            : 'bg-white border-red-200 hover:border-red-400'
                        }`}
                        style={{
                          animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both, pulse-card 2s ease-in-out infinite`,
                          animationDelay: `${index * 0.1}s, 0.5s`,
                          boxShadow: isDarkMode 
                            ? '0 2px 8px rgba(239, 68, 68, 0.2)' 
                            : '0 2px 8px rgba(239, 68, 68, 0.15)',
                        }}
                      >
                        {/* Compact Content */}
                        <div className="p-2 flex gap-2">
                          {/* Image - Small with hover effect */}
                          <div className="relative w-16 h-16 rounded overflow-hidden flex-shrink-0 group-hover:ring-2 group-hover:ring-red-400/50 transition-all">
                            {activity.imageUrl ? (
                              <img
                                src={activity.imageUrl}
                                alt={activity.title}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                              />
                            ) : (
                              <div className={`w-full h-full flex items-center justify-center ${
                                isDarkMode ? 'bg-gray-700/50' : 'bg-gray-100'
                              }`}>
                                <ImageIcon size={14} className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} strokeWidth={1.5} />
                              </div>
                            )}
                            {/* Registered Badge - Top Left */}
                            {activity.isRegistered && (
                              <div className="absolute top-0.5 left-0.5 z-10">
                                <div className={`p-0.5 rounded-full shadow-md backdrop-blur-sm ${
                                  activity.approvalStatus === 'approved'
                                    ? isDarkMode 
                                      ? 'bg-green-500/90 text-white border border-green-400/50' 
                                      : 'bg-green-500 text-white border border-green-600'
                                    : activity.approvalStatus === 'pending'
                                    ? isDarkMode 
                                      ? 'bg-yellow-500/90 text-white border border-yellow-400/50' 
                                      : 'bg-yellow-500 text-white border border-yellow-600'
                                    : activity.approvalStatus === 'rejected'
                                    ? isDarkMode 
                                      ? 'bg-red-500/90 text-white border border-red-400/50' 
                                      : 'bg-red-500 text-white border border-red-600'
                                    : isDarkMode 
                                      ? 'bg-gray-500/90 text-white border border-gray-400/50' 
                                      : 'bg-gray-500 text-white border border-gray-600'
                                }`}>
                                  <CheckCircle2 size={8} strokeWidth={2.5} />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Info - Compact */}
                          <div className="flex-1 min-w-0 flex flex-col justify-between">
                            <div className="flex-1 min-w-0">
                              <h3 className={`text-[11px] font-bold line-clamp-2 mb-1 group-hover:text-red-500 transition-colors ${
                              isDarkMode ? 'text-white' : 'text-gray-900'
                            }`}>
                              {activity.title}
                            </h3>
                              <div className="space-y-0.5">
                                {/* Check-in Slot Details */}
                                {slotDetails && (
                                  <div className={`px-1.5 py-1 rounded text-[9px] font-semibold mb-1 ${
                                    slotDetails.isOnTime
                                      ? isDarkMode 
                                        ? 'bg-green-600/30 text-green-300 border border-green-500/40' 
                                        : 'bg-green-100 text-green-700 border border-green-300'
                                      : isDarkMode 
                                        ? 'bg-orange-600/30 text-orange-300 border border-orange-500/40' 
                                        : 'bg-orange-100 text-orange-700 border border-orange-300'
                                  }`}>
                                    <div className="space-y-0.5">
                                      <div className="flex items-center gap-1 flex-wrap">
                                        <span className="font-bold">
                                          {slotDetails.checkInType === 'start' ? '📍 Đầu' : '🏁 Cuối'} buổi {slotDetails.slotName}
                                        </span>
                                        <span className="opacity-70">•</span>
                                        <span>{slotDetails.date}</span>
                          </div>
                                      <div className="flex items-center gap-1 flex-wrap text-[8px]">
                                        <span className="opacity-80">Thời gian hiện tại:</span>
                                        <span className="font-bold">{slotDetails.currentTime}</span>
                                        <span className="opacity-70">•</span>
                                        <span className="opacity-80">Cần điểm danh:</span>
                                        <span className="font-bold">{slotDetails.requiredTime}</span>
                                      </div>
                                      <div className="flex items-center gap-1 flex-wrap">
                                        <span className={`font-bold ${
                                          slotDetails.isOnTime 
                                            ? isDarkMode ? 'text-green-400' : 'text-green-600'
                                            : isDarkMode ? 'text-orange-400' : 'text-orange-600'
                                        }`}>
                                          {slotDetails.statusText}
                                        </span>
                                        <span className="opacity-70">•</span>
                                        <span className={slotDetails.isOnTime 
                                          ? isDarkMode ? 'text-green-300' : 'text-green-600'
                                          : isDarkMode ? 'text-orange-300' : 'text-orange-600'
                                        }>
                                          {slotDetails.timeDifference}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                )}
                                <div className={`flex items-center gap-1 text-[9px] ${
                                isDarkMode ? 'text-gray-400' : 'text-gray-600'
                              }`}>
                                  <Calendar size={9} />
                                <span className="truncate">
                                    {activity.isMultipleDays && activity.startDate && activity.endDate
                                      ? `${new Date(activity.startDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} - ${new Date(activity.endDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}`
                                      : activity.date}
                                </span>
                              </div>
                              {activity.location && (
                                  <div className={`flex items-center gap-1 text-[9px] ${
                                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                }`}>
                                    <MapPin size={9} />
                                  <span className="truncate">{activity.location}</span>
                                </div>
                              )}
                            </div>
                          </div>

                            {/* Compact Check-in Button with Animation */}
                          <button
                            onClick={() => router.push(`/student/attendance/${activity.id}`)}
                              className={`mt-1.5 w-full py-1.5 px-2 rounded text-[10px] font-bold transition-all duration-300 border-2 relative overflow-hidden ${
                              isDarkMode 
                                  ? 'bg-gradient-to-r from-red-600 to-red-500 text-white border-red-400 hover:from-red-500 hover:to-red-400' 
                                  : 'bg-gradient-to-r from-red-500 to-red-600 text-white border-red-400 hover:from-red-600 hover:to-red-700'
                            }`}
                            style={{
                                animation: 'pulse-button 1.5s ease-in-out infinite',
                                boxShadow: isDarkMode 
                                  ? '0 2px 8px rgba(239, 68, 68, 0.4)' 
                                  : '0 2px 8px rgba(239, 68, 68, 0.5)',
                              }}
                            >
                              <div className="flex items-center justify-center gap-1 relative z-10">
                                <CheckSquare size={10} strokeWidth={2.5} />
                                <span>Điểm danh</span>
                            </div>
                            {/* Shimmer effect */}
                              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent rounded" />
                                  </button>
                            </div>
                          </div>
                        </div>
                        );
                      })}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  } else {
                    // Không nhóm khi có ít hoạt động
                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {urgentActivities.map((activity, index) => {
                          const slotDetails = getCheckInSlotDetails(activity);

                          return (
                            <div
                              key={activity.id}
                              className={`group rounded-lg border-2 overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${
                                isDarkMode 
                                  ? 'bg-gray-800/90 border-red-500/40 hover:border-red-400/70' 
                                  : 'bg-white border-red-200 hover:border-red-400'
                              }`}
                              style={{
                                animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both, pulse-card 2s ease-in-out infinite`,
                                animationDelay: `${index * 0.1}s, 0.5s`,
                                boxShadow: isDarkMode 
                                  ? '0 2px 8px rgba(239, 68, 68, 0.2)' 
                                  : '0 2px 8px rgba(239, 68, 68, 0.15)',
                              }}
                            >
                              {/* Compact Content */}
                              <div className="p-2 flex gap-2">
                                {/* Image - Small with hover effect */}
                                <div className="relative w-16 h-16 rounded overflow-hidden flex-shrink-0 group-hover:ring-2 group-hover:ring-red-400/50 transition-all">
                                  {activity.imageUrl ? (
                                    <img
                                      src={activity.imageUrl}
                                      alt={activity.title}
                                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                    />
                                  ) : (
                                    <div className={`w-full h-full flex items-center justify-center ${
                                      isDarkMode ? 'bg-gray-700/50' : 'bg-gray-100'
                                    }`}>
                                      <ImageIcon size={14} className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} strokeWidth={1.5} />
                                    </div>
                                  )}
                                  {/* Registered Badge - Top Left */}
                                  {activity.isRegistered && (
                                    <div className="absolute top-0.5 left-0.5 z-10">
                                      <div className={`p-0.5 rounded-full shadow-md backdrop-blur-sm ${
                                        activity.approvalStatus === 'approved'
                                          ? isDarkMode 
                                            ? 'bg-green-500/90 text-white border border-green-400/50' 
                                            : 'bg-green-500 text-white border border-green-600'
                                          : activity.approvalStatus === 'pending'
                                          ? isDarkMode 
                                            ? 'bg-yellow-500/90 text-white border border-yellow-400/50' 
                                            : 'bg-yellow-500 text-white border border-yellow-600'
                                          : activity.approvalStatus === 'rejected'
                                          ? isDarkMode 
                                            ? 'bg-red-500/90 text-white border border-red-400/50' 
                                            : 'bg-red-500 text-white border border-red-600'
                                          : isDarkMode 
                                            ? 'bg-gray-500/90 text-white border border-gray-400/50' 
                                            : 'bg-gray-500 text-white border border-gray-600'
                                      }`}>
                                        <CheckCircle2 size={8} strokeWidth={2.5} />
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Info - Compact */}
                                <div className="flex-1 min-w-0 flex flex-col justify-between">
                                  <div className="flex-1 min-w-0">
                                    <h3 className={`text-[11px] font-bold line-clamp-2 mb-1 group-hover:text-red-500 transition-colors ${
                                    isDarkMode ? 'text-white' : 'text-gray-900'
                                  }`}>
                                    {activity.title}
                                  </h3>
                                    <div className="space-y-0.5">
                                      {/* Check-in Slot Details */}
                                      {slotDetails && (
                                        <div className={`px-1.5 py-1 rounded text-[9px] font-semibold mb-1 ${
                                          slotDetails.isOnTime
                                            ? isDarkMode 
                                              ? 'bg-green-600/30 text-green-300 border border-green-500/40' 
                                              : 'bg-green-100 text-green-700 border border-green-300'
                                            : isDarkMode 
                                              ? 'bg-orange-600/30 text-orange-300 border border-orange-500/40' 
                                              : 'bg-orange-100 text-orange-700 border border-orange-300'
                                        }`}>
                                          <div className="space-y-0.5">
                                            <div className="flex items-center gap-1 flex-wrap">
                                              <span className="font-bold">
                                                {slotDetails.checkInType === 'start' ? '📍 Đầu' : '🏁 Cuối'} buổi {slotDetails.slotName}
                                              </span>
                                              <span className="opacity-70">•</span>
                                              <span>{slotDetails.date}</span>
                                            </div>
                                            <div className="flex items-center gap-1 flex-wrap text-[8px]">
                                              <span className="opacity-80">Thời gian hiện tại:</span>
                                              <span className="font-bold">{slotDetails.currentTime}</span>
                                              <span className="opacity-70">•</span>
                                              <span className="opacity-80">Cần điểm danh:</span>
                                              <span className="font-bold">{slotDetails.requiredTime}</span>
                                            </div>
                                            <div className="flex items-center gap-1 flex-wrap">
                                              <span className={`font-bold ${
                                                slotDetails.isOnTime 
                                                  ? isDarkMode ? 'text-green-400' : 'text-green-600'
                                                  : isDarkMode ? 'text-orange-400' : 'text-orange-600'
                                              }`}>
                                                {slotDetails.statusText}
                                              </span>
                                              <span className="opacity-70">•</span>
                                              <span className={slotDetails.isOnTime 
                                                ? isDarkMode ? 'text-green-300' : 'text-green-600'
                                                : isDarkMode ? 'text-orange-300' : 'text-orange-600'
                                              }>
                                                {slotDetails.timeDifference}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                      <div className={`flex items-center gap-1 text-[9px] ${
                                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                    }`}>
                                      <Calendar size={9} />
                                    <span className="truncate">
                                      {activity.isMultipleDays && activity.startDate && activity.endDate
                                        ? `${new Date(activity.startDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} - ${new Date(activity.endDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}`
                                        : activity.date}
                                    </span>
                                  </div>
                                  {activity.location && (
                                      <div className={`flex items-center gap-1 text-[9px] ${
                                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                    }`}>
                                      <MapPin size={9} />
                                    <span className="truncate">{activity.location}</span>
                                  </div>
                                  )}
                                </div>
                              </div>

                              {/* Compact Check-in Button with Animation */}
                              <button
                                onClick={() => router.push(`/student/attendance/${activity.id}`)}
                                className={`mt-1.5 w-full py-1.5 px-2 rounded text-[10px] font-bold transition-all duration-300 border-2 relative overflow-hidden ${
                                  isDarkMode 
                                      ? 'bg-gradient-to-r from-red-600 to-red-500 text-white border-red-400 hover:from-red-500 hover:to-red-400' 
                                      : 'bg-gradient-to-r from-red-500 to-red-600 text-white border-red-400 hover:from-red-600 hover:to-red-700'
                                }`}
                                style={{
                                    animation: 'pulse-button 1.5s ease-in-out infinite',
                                    boxShadow: isDarkMode 
                                      ? '0 2px 8px rgba(239, 68, 68, 0.4)' 
                                      : '0 2px 8px rgba(239, 68, 68, 0.5)',
                                  }}
                              >
                                <div className="flex items-center justify-center gap-1 relative z-10">
                                  <CheckSquare size={10} strokeWidth={2.5} />
                                  <span>Điểm danh</span>
                                </div>
                                {/* Shimmer effect */}
                                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent rounded" />
                              </button>
                            </div>
                          </div>
                        </div>
                    );
                        })}
                      </div>
                    );
                  }
                })()}
              </div>
            </div>
          );
        })()}

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


          {/* Non-Club Member Section (chỉ hiển thị khi đã đăng nhập) */}
          {isAuthenticated && user && !user?.isClubMember && (
            <div className={`rounded-lg border p-4 mb-4 text-center ${
              isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700'
            }`}>
              <p className="text-sm mb-2">
                Bạn chưa là thành viên CLB. <button onClick={() => router.push('/student/register')} className="underline">Đăng ký ngay</button>
              </p>
            </div>
          )}

          {/* Search Bar and Filters - Professional Implementation */}
          <div className={`w-full mb-3 rounded-lg border px-3 py-2.5 sticky top-0 z-10 ${
            isDarkMode 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-200 shadow-sm'
          }`}>
            <div className="flex flex-col lg:flex-row gap-2 items-stretch w-full">
              {/* Search Bar */}
              <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
                  <Search 
                    size={14} 
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
                  className={`w-full pl-9 pr-8 py-2 text-xs sm:text-sm font-medium transition-all duration-200 rounded-lg border ${
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
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg border transition-all whitespace-nowrap ${
                    isDarkMode
                      ? 'bg-gray-700/50 text-white border-gray-600/50 hover:border-green-500/50 hover:bg-gray-700'
                      : 'bg-white text-gray-900 border-gray-300/50 hover:border-green-400/50 hover:bg-white'
                  } shadow-sm hover:shadow-md focus:outline-none ${
                    (startDate || endDate || activityType !== 'all' || registrationFilter !== 'all' || sortOrder !== 'newest')
                      ? isDarkMode ? 'border-green-500/50 bg-green-500/10' : 'border-green-500 bg-green-50'
                      : ''
                  }`}
                >
                  <Filter size={14} strokeWidth={2} />
                  <span className="hidden sm:inline">Bộ lọc</span>
                  <ChevronDown 
                    size={12} 
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

          {/* Activities Layout - 2 Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4 items-stretch">
            {/* Left Column - Unregistered Activities (8/12) */}
            <div className="lg:col-span-8 flex flex-col h-full min-h-0">
              <div className={`rounded-lg border overflow-hidden flex-shrink-0 flex flex-col h-full ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              }`}>
            {/* Header */}
            <div className={`px-3 sm:px-4 py-3 border-b-2 ${
              isDarkMode 
                    ? 'bg-gradient-to-r from-blue-800/50 via-blue-700/50 to-blue-800/50 border-blue-600' 
                    : 'bg-gradient-to-r from-blue-50 via-blue-100/50 to-blue-50 border-blue-300'
            }`}>
                  <div className="flex items-center justify-between gap-2 sm:gap-3">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className={`p-1.5 rounded-lg ${
                  isDarkMode 
                    ? 'bg-blue-500/20 text-blue-400' 
                    : 'bg-blue-100 text-blue-600'
                }`}>
                  <Calendar size={18} strokeWidth={2} />
                </div>
                      <div>
                        <h2 className={`text-lg sm:text-xl font-bold ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                          Các hoạt động đang diễn ra và sắp diễn ra
                </h2>
                        <p className={`text-xs sm:text-sm mt-0.5 ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          {filteredActivities.length} hoạt động
                        </p>
                      </div>
                    </div>
              </div>
            </div>
            
            {/* Content */}
            <div className="p-2 sm:p-3 w-full flex-1 overflow-y-auto min-h-0">
              {filteredActivities.length === 0 ? (
                // Empty State
                <div className={`w-full min-h-[200px] rounded-lg border-2 border-dashed flex flex-col items-center justify-center py-8 ${
                  isDarkMode ? 'border-gray-700 bg-gray-800/30' : 'border-gray-300 bg-gray-50'
                }`}>
                      <Calendar 
                    size={40} 
                    className={`mb-3 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} 
                        strokeWidth={1.5} 
                      />
                  <p className={`text-sm font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Không có hoạt động
                      </p>
                </div>
              ) : (
                <>
                  {/* Activities Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 w-full">
                    {filteredActivities
                      .slice((currentPage - 1) * activitiesPerPage, currentPage * activitiesPerPage)
                      .map((activity) => {
                    const overallStatus = getActivityOverallStatus(activity);
                    const StatusIcon = overallStatus.icon;
                    const timeStatus = getActivityTimeStatus(activity);
                    // Chỉ cho phép đăng ký/hủy đăng ký khi hoạt động chưa diễn ra
                    const canRegister = timeStatus === 'before';
                    // Tính toán trạng thái điểm danh
                    const activityRecords = attendanceRecords[activity.id] || [];
                    let attendanceStatus = null;
                    if (activity.isRegistered && activity.approvalStatus === 'approved' && timeStatus === 'during') {
                      if (activity.isMultipleDays) {
                        let totalSlots = 0;
                        let completedSlots = 0;
                        if (activity.schedule && activity.schedule.length > 0) {
                          activity.schedule.forEach((scheduleItem) => {
                            const scheduleText = scheduleItem.activities || '';
                            const lines = scheduleText.split('\n').filter(line => line.trim());
                            lines.forEach((line: string) => {
                              if (line.includes('Buổi Sáng') || line.includes('Buổi Chiều') || line.includes('Buổi Tối')) {
                                totalSlots++;
                                const slotName = line.includes('Buổi Sáng') ? 'Buổi Sáng' :
                                               line.includes('Buổi Chiều') ? 'Buổi Chiều' : 'Buổi Tối';
                                const startRecord = activityRecords.find(
                                  (r) => r.timeSlot === slotName && r.checkInType === 'start' && r.status === 'approved'
                                );
                                const endRecord = activityRecords.find(
                                  (r) => r.timeSlot === slotName && r.checkInType === 'end' && r.status === 'approved'
                                );
                                if (startRecord && endRecord) completedSlots++;
                              }
                            });
                          });
                        }
                        if (totalSlots > 0) {
                          attendanceStatus = completedSlots === totalSlots ? 'completed' : activityRecords.length > 0 ? 'partial' : 'not-started';
                        }
                      } else {
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
                            if (startRecord && endRecord) completedSlots++;
                          });
                        }
                        if (totalSlots > 0) {
                          attendanceStatus = completedSlots === totalSlots ? 'completed' : activityRecords.length > 0 ? 'partial' : 'not-started';
                        }
                      }
                    }
                    return (
                    <div key={activity.id} className={`group flex flex-col rounded-lg border-2 overflow-hidden shadow-md transition-all duration-300 hover:shadow-lg hover:scale-[1.01] ${
                      activity.isMultipleDays
                        ? isDarkMode 
                          ? 'bg-gray-800 border-purple-600 hover:border-purple-500' 
                          : 'bg-white border-purple-600 hover:border-purple-700'
                        : isDarkMode 
                          ? 'bg-gray-800 border-blue-600 hover:border-blue-500' 
                          : 'bg-white border-blue-600 hover:border-blue-700'
                    }`}>
                     {/* Status Banner - Compact & Modern với màu sắc trực quan */}
                     <div className={`${overallStatus.bannerBgColor} border-b-2 ${overallStatus.bannerBorderColor} px-2 py-1.5 h-[2.25rem] flex items-center justify-between`}>
                       <div className="flex items-center gap-1.5 flex-1 min-w-0">
                         <div className="p-0.5 rounded">
                           <StatusIcon size={11} className={overallStatus.bannerTextColor} strokeWidth={2} />
                         </div>
                         <span className={`text-[10px] font-bold uppercase tracking-wide truncate ${overallStatus.bannerTextColor}`}>{overallStatus.label}</span>
                       </div>
                       {/* Approval Status Badge - Compact */}
                       {activity.isRegistered && activity.approvalStatus && (
                         // Chỉ hiển thị badge "Đã duyệt" khi hoạt động chưa diễn ra (before)
                         // Badge "Chờ duyệt" và "Từ chối" vẫn hiển thị bình thường
                         (activity.approvalStatus === 'approved' && timeStatus !== 'before') ? null : (
                           <div className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-bold border flex-shrink-0 ${
                           activity.approvalStatus === 'approved'
                             ? isDarkMode ? 'bg-green-500/20 text-green-300 border-green-500/40' : 'bg-green-100 text-green-700 border-green-300'
                             : activity.approvalStatus === 'rejected'
                             ? isDarkMode ? 'bg-red-500/20 text-red-300 border-red-500/40' : 'bg-red-100 text-red-700 border-red-300'
                             : isDarkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-black border-gray-300'
                         }`}>
                             {activity.approvalStatus === 'approved' ? '✓' : activity.approvalStatus === 'rejected' ? '✗' : '⏳'}
                             <span className="hidden sm:inline">
                               {activity.approvalStatus === 'approved' ? 'Đã duyệt' : activity.approvalStatus === 'rejected' ? 'Từ chối' : 'Chờ duyệt'}
                             </span>
                         </div>
                         )
                       )}
                     </div>
                     {/* Image - Compact */}
                     <div className={`relative w-full h-24 overflow-hidden ${
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
                       {/* Registered Badge - Top Left */}
                       {activity.isRegistered && (
                         <div className="absolute top-2 left-2 z-10">
                           <div className={`p-1.5 rounded-full shadow-lg backdrop-blur-sm ${
                             activity.approvalStatus === 'approved'
                               ? isDarkMode 
                                 ? 'bg-green-500/90 text-white border-2 border-green-400/50' 
                                 : 'bg-green-500 text-white border-2 border-green-600'
                               : activity.approvalStatus === 'pending'
                               ? isDarkMode 
                                 ? 'bg-yellow-500/90 text-white border-2 border-yellow-400/50' 
                                 : 'bg-yellow-500 text-white border-2 border-yellow-600'
                               : activity.approvalStatus === 'rejected'
                               ? isDarkMode 
                                 ? 'bg-red-500/90 text-white border-2 border-red-400/50' 
                                 : 'bg-red-500 text-white border-2 border-red-600'
                               : isDarkMode 
                                 ? 'bg-gray-500/90 text-white border-2 border-gray-400/50' 
                                 : 'bg-gray-500 text-white border-2 border-gray-600'
                           }`}>
                             <CheckCircle2 size={12} strokeWidth={2.5} />
                           </div>
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
                     <div className="p-2 flex-1 flex flex-col">
                       <div className="flex items-start justify-between gap-2 mb-1.5 h-[2.5rem]">
                         <div className="flex-1 min-w-0 h-full flex items-start">
                           <h3 className={`text-[11px] sm:text-xs leading-tight activity-title-gradient line-clamp-2 w-full`}>
                             {activity.title}
                           </h3>
                         </div>
                       </div>
                       {/* Info List - Fixed Vertical Layout */}
                       <div className="space-y-1 mb-2">
                         {/* Ngày diễn ra + Số ngày (gộp chung) */}
                         <div className={`flex items-center gap-1.5 px-1.5 py-1 rounded border ${
                           isDarkMode 
                             ? 'bg-transparent border-gray-700 text-gray-300' 
                             : 'bg-transparent border-gray-300 text-gray-700'
                         }`}>
                           <Calendar size={10} className={`${isDarkMode ? 'text-green-300' : 'text-green-600'} flex-shrink-0`} strokeWidth={2} />
                           <div className="flex items-center gap-2 flex-1 min-w-0 text-[10px]">
                             <div className="flex items-center gap-1 flex-shrink-0">
                               <span className={`font-medium opacity-70 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                 Ngày:
                               </span>
                               <span className="font-semibold whitespace-nowrap">
                             {activity.isMultipleDays ? (
                                   (() => {
                                   const startDate = activity.startDate ? new Date(activity.startDate) : null;
                                   const endDate = activity.endDate ? new Date(activity.endDate) : null;
                                   if (startDate && endDate) {
                                     const startStr = startDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
                                     const endStr = endDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
                                     return `${startStr} - ${endStr}`;
                                   }
                                   return activity.date;
                                   })()
                             ) : (
                                   activity.date
                             )}
                               </span>
                           </div>
                                     {(() => {
                               let numberOfDays = 1;
                               if (activity.isMultipleDays && activity.startDate && activity.endDate) {
                                 const startDate = new Date(activity.startDate);
                                 const endDate = new Date(activity.endDate);
                                 const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
                                 numberOfDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                               }
                               return (
                                 <>
                                   <span className={`font-medium opacity-50 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                     •
                                           </span>
                                   <span className="font-semibold whitespace-nowrap flex-shrink-0">
                                     {numberOfDays} ngày
                                       </span>
                                 </>
                               );
                             })()}
                               </div>
                             </div>
                         
                         {/* Đã đăng ký + Ngưỡng đăng ký tối thiểu (gộp chung) */}
                         {activity.registeredParticipantsCount !== undefined && (
                           <div className={`flex items-center gap-1.5 px-1.5 py-1 rounded border ${
                             isDarkMode 
                               ? 'bg-transparent border-gray-700 text-gray-300' 
                               : 'bg-transparent border-gray-300 text-gray-700'
                           }`}>
                             <Users size={10} className={`${isDarkMode ? 'text-green-300' : 'text-green-600'} flex-shrink-0`} strokeWidth={2} />
                             <div className="flex items-center gap-2 flex-1 min-w-0 text-[10px]">
                               <div 
                                 className="flex items-center gap-1 flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                                 onClick={() => handleViewApprovedParticipants(activity.id, activity.title)}
                                 title="Nhấn để xem danh sách người đã được duyệt"
                               >
                                 <span className={`font-medium opacity-70 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                   Số lượng :
                                 </span>
                                 <span className="font-semibold whitespace-nowrap underline decoration-dotted">
                                   {activity.registeredParticipantsCount}
                                   {activity.maxParticipants && activity.maxParticipants > 0 ? `/${activity.maxParticipants}` : ''}
                                 </span>
                               </div>
                               {activity.registrationThreshold !== undefined && activity.registrationThreshold !== null && (
                                 <>
                                   <span className={`font-medium opacity-50 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                     •
                                 </span>
                                   <div className="flex items-center gap-1 flex-shrink-0">
                                     <span className={`font-medium opacity-70 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                       Ngưỡng:
                                     </span>
                                     <span className="font-semibold whitespace-nowrap">
                                       {activity.registrationThreshold}%
                                     </span>
                                   </div>
                                 </>
                               )}
                             </div>
                           </div>
                         )}
                         
                         {/* Thời gian (nếu không có timeSlots) */}
                         {!activity.timeSlots && activity.time && (
                           <div className={`flex items-center gap-1.5 px-1.5 py-1 rounded border ${
                             isDarkMode 
                               ? 'bg-transparent border-gray-700 text-gray-300' 
                               : 'bg-transparent border-gray-300 text-gray-700'
                           }`}>
                             <Clock size={10} className={`${isDarkMode ? 'text-green-300' : 'text-green-600'} flex-shrink-0`} strokeWidth={2} />
                             <div className="flex items-center gap-1.5 flex-1">
                               <span className={`text-[9px] font-medium opacity-70 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                 Thời gian:
                                       </span>
                               <span className="text-[10px] font-semibold">{activity.time}</span>
                                     </div>
                           </div>
                         )}
                         
                         {/* Người phụ trách */}
                         {activity.organizer && (
                           <div className={`flex items-center gap-1.5 px-1.5 py-1 rounded border ${
                              isDarkMode 
                                ? 'bg-transparent border-gray-700 text-gray-300' 
                               : 'bg-transparent border-gray-300 text-gray-700'
                            }`}>
                             <User size={10} className={isDarkMode ? 'text-green-300' : 'text-green-600'} strokeWidth={2} />
                             <div className="flex items-center gap-1.5 flex-1 min-w-0">
                               <span className={`text-[9px] font-medium opacity-70 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                 Phụ trách:
                               </span>
                              {activity.organizerAvatarUrl ? (
                                 <div className={`w-4 h-4 rounded-full overflow-hidden flex-shrink-0 border ${
                                   isDarkMode ? 'border-gray-400' : 'border-gray-300'
                                }`}>
                                  <img 
                                    src={activity.organizerAvatarUrl} 
                                    alt={activity.organizer}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                               ) : null}
                               <span className="text-[10px] font-medium truncate">{activity.organizer}</span>
                              </div>
                            </div>
                          )}

                         {/* Địa điểm */}
                         <div className={`flex items-start gap-1.5 px-1.5 py-1 rounded border ${
                                 isDarkMode 
                             ? 'bg-transparent border-gray-700 text-gray-300' 
                             : 'bg-transparent border-gray-300 text-gray-700'
                               }`}>
                           <MapPin size={10} className={`${isDarkMode ? 'text-green-300' : 'text-green-600'} flex-shrink-0`} strokeWidth={2} />
                           <div className="flex flex-col gap-1 flex-1 min-w-0">
                             <div className="flex items-start gap-1.5">
                               <span className={`text-[9px] font-medium opacity-70 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} flex-shrink-0`}>
                                 Địa điểm:
                               </span>
                               {activity.isMultipleDays ? (
                                 <div className="text-[10px] font-medium flex-1 min-w-0">
                                   {activity.location === 'Địa điểm theo buổi' || activity.location === 'Địa điểm theo ngày' ? (
                                     <span className={`italic ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                       Nhiều địa điểm
                                     </span>
                                   ) : (
                                     <div className="flex flex-col">
                                       <span 
                                         className={`${expandedLocations.has(activity.id) ? '' : 'line-clamp-1'} cursor-pointer hover:underline transition-all ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
                                         onClick={() => {
                                           setExpandedLocations(prev => {
                                             const newSet = new Set(prev);
                                             if (newSet.has(activity.id)) {
                                               newSet.delete(activity.id);
                                             } else {
                                               newSet.add(activity.id);
                                             }
                                             return newSet;
                                           });
                                         }}
                                       >
                                         {activity.location}
                                 </span>
                               </div>
                                   )}
                                 </div>
                               ) : (
                                 <span 
                                   className={`text-[10px] font-medium ${expandedLocations.has(activity.id) ? '' : 'line-clamp-1'} cursor-pointer hover:underline transition-all flex-1 min-w-0 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
                                   onClick={() => {
                                     setExpandedLocations(prev => {
                                       const newSet = new Set(prev);
                                       if (newSet.has(activity.id)) {
                                         newSet.delete(activity.id);
                           } else {
                                         newSet.add(activity.id);
                                       }
                                       return newSet;
                                     });
                                   }}
                                 >
                                   {activity.location}
                                 </span>
                               )}
                               </div>
                           </div>
                         </div>
                       </div>
                       {/* Action Buttons - Modern & Compact */}
                       <div className={`flex flex-col gap-1 mt-auto pt-1.5 border-t ${
                         isDarkMode ? 'border-green-500' : 'border-green-600'
                       }`}>
                         <div className="flex gap-1">
                           <button
                             onClick={() => {
                               // Nếu đã đăng ký, đã duyệt và đang diễn ra, chuyển đến trang điểm danh
                               if (isAuthenticated && activity.isRegistered && activity.approvalStatus === 'approved' && timeStatus === 'during') {
                                 router.push(`/student/attendance/${activity.id}`);
                                 return;
                               }
                               if (!isAuthenticated) {
                                 router.push('/auth/login');
                                 return;
                               }
                              // Nếu đã bị xóa, không cho phép làm gì
                              if (activity.approvalStatus === 'removed') {
                                 return;
                               }
                               // Nếu đang diễn ra hoặc đã kết thúc, không cho phép đăng ký/hủy
                               if (!canRegister && !activity.isRegistered) {
                                 return;
                               }
                              // Nếu đã đăng ký và đã được duyệt, không cho phép hủy
                              if (activity.isRegistered && activity.approvalStatus === 'approved') {
                                return; // Không cho hủy nếu đã được duyệt
                              }
                              // Nếu đã đăng ký và chưa diễn ra, chỉ cho phép hủy nếu đang chờ duyệt
                               if (activity.isRegistered && !canRegister) {
                                 return; // Không cho hủy nếu đang diễn ra hoặc đã kết thúc
                               }
                               handleRegisterActivity(activity.id, activity.title);
                             }}
                             disabled={!isAuthenticated || registeringActivities.has(activity.id) || !!(
                              // Disable nếu đã bị xóa
                              activity.approvalStatus === 'removed' ||
                               // Disable nếu đang diễn ra hoặc đã kết thúc và chưa đăng ký
                               (!canRegister && !activity.isRegistered) ||
                               // Disable nếu đã đầy và chưa đăng ký
                               (activity.maxParticipants && 
                               activity.registeredParticipantsCount !== undefined && 
                               activity.maxParticipants > 0 &&
                               activity.registeredParticipantsCount >= activity.maxParticipants && 
                              !activity.isRegistered) ||
                              // Disable nếu đã đăng ký và đã được duyệt
                              (activity.isRegistered && activity.approvalStatus === 'approved')
                            )}
                             className={`flex-1 py-1.5 px-2 rounded text-[10px] font-bold transition-all duration-200 border ${
                               // Nếu đã bị xóa, hiển thị button màu xám
                               activity.approvalStatus === 'removed'
                                 ? isDarkMode 
                                   ? 'bg-gray-700/50 text-gray-400 border-gray-700 cursor-not-allowed' 
                                   : 'bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed'
                                 : // Nếu đã đăng ký, đã duyệt và đang diễn ra, hiển thị button điểm danh
                                 (isAuthenticated && activity.isRegistered && activity.approvalStatus === 'approved' && timeStatus === 'during')
                                 ? isDarkMode 
                                   ? 'bg-gradient-to-r from-red-600 via-red-500 to-red-600 text-white border-red-400 hover:from-red-500 hover:via-red-400 hover:to-red-500 hover:border-red-300 shadow-md' 
                                   : 'bg-gradient-to-r from-red-500 via-red-600 to-red-500 text-white border-red-400 hover:from-red-600 hover:via-red-700 hover:to-red-600 hover:border-red-500 shadow-md'
                                 : // Nếu đã đăng ký và đã được duyệt nhưng chưa diễn ra hoặc đã kết thúc
                                 (activity.isRegistered && activity.approvalStatus === 'approved')
                                 ? isDarkMode 
                                   ? 'bg-gradient-to-r from-green-600 to-green-700 text-white border-green-500' 
                                   : 'bg-gradient-to-r from-green-600 to-green-700 text-white border-green-700'
                                 : !isAuthenticated
                                 ? isDarkMode 
                                   ? 'bg-gray-700/50 text-gray-500 border-gray-700 cursor-not-allowed' 
                                   : 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                                 : !canRegister
                                 ? isDarkMode 
                                   ? 'bg-gray-700/50 text-gray-500 border-gray-700 cursor-not-allowed' 
                                   : 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                                 : activity.isRegistered
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
                             {!isAuthenticated
                               ? '🔒 Đăng nhập'
                               : registeringActivities.has(activity.id) 
                               ? '⏳...' 
                              : activity.approvalStatus === 'removed'
                              ? '🗑️ Đã bị xóa'
                              : (isAuthenticated && activity.isRegistered && activity.approvalStatus === 'approved' && timeStatus === 'during')
                              ? '📝 Điểm danh'
                               : activity.isRegistered
                              ? (activity.approvalStatus === 'approved')
                                ? (timeStatus === 'during' ? '📝 Điểm danh' : '🔒 Đã đăng ký')
                                : canRegister
                                ? '✗ Hủy'
                                : '🔒 Kết thúc'
                               : !canRegister
                               ? '🔒 Kết thúc'
                               : (activity.maxParticipants && activity.registeredParticipantsCount && activity.registeredParticipantsCount >= activity.maxParticipants)
                               ? '🔒 Đã đầy'
                               : '✓ Đăng ký'}
                           </button>
                           <button
                             onClick={() => { router.push(`/student/activities/${activity.id}`); }}
                             className={`flex-1 border py-1.5 px-2 rounded text-[10px] font-bold transition-all duration-200 ${
                               isDarkMode 
                                 ? 'border-gray-600 text-gray-200 hover:bg-gray-700 hover:border-gray-500' 
                                 : 'border-gray-900 text-gray-900 hover:bg-gray-50 hover:border-gray-800'
                             }`}
                           >
                             <Eye size={10} className="inline mr-0.5" strokeWidth={2} />
                             Chi tiết
                           </button>
                         </div>
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
                        itemsPerPageOptions={[3, 6, 9, 12]}
                      />
                    </div>
                  )}
                </>
              )}
              </div>
              </div>
            </div>

            {/* Right Column - Completed Activities (4/12) */}
            <div className="lg:col-span-4 flex flex-col h-full min-h-0">
              {/* Section: Đã kết thúc */}
              {filteredRegisteredCompleted.length > 0 ? (
                <div className={`rounded-lg border overflow-hidden flex-shrink-0 flex flex-col h-full ${
                  isDarkMode ? 'bg-gray-800 border-gray-600/50' : 'bg-white border-gray-300'
                }`}>
                  <div className={`px-3 sm:px-4 py-3 border-b-2 ${
                    isDarkMode 
                      ? 'bg-gradient-to-r from-gray-700/50 via-gray-600/50 to-gray-700/50 border-gray-600' 
                      : 'bg-gradient-to-r from-gray-50 via-gray-100/50 to-gray-50 border-gray-300'
                  }`}>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className={`p-1.5 rounded-lg ${
                        isDarkMode ? 'bg-gray-500/20 text-gray-400' : 'bg-gray-100 text-gray-600'
                      }`}>
                        <CheckCircle2 size={18} strokeWidth={2} />
                      </div>
                      <div>
                        <h3 className={`text-lg sm:text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          Đã kết thúc
                        </h3>
                        <p className={`text-xs sm:text-sm mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {filteredRegisteredCompleted.length} hoạt động
                        </p>
                      </div>
                    </div>
                  </div>
                  <div 
                    ref={rightColumnScrollRef}
                    className="p-1 sm:p-1.5 flex-1 overflow-y-auto min-h-0"
                    style={{ 
                      maxHeight: `${activitiesPerPage * 121 + (activitiesPerPage - 1) * 4 + 12}px` 
                    }}
                    onMouseEnter={() => setIsScrollingPaused(true)}
                    onMouseLeave={() => setIsScrollingPaused(false)}
                  >
                    <div className="space-y-1">
                      {filteredRegisteredCompleted.map((activity) => {
                        const overallStatus = getActivityOverallStatus(activity);
                        return (
                          <div
                            key={activity.id}
                            onClick={() => router.push(`/student/activities/${activity.id}`)}
                            className={`group flex flex-row rounded-lg border overflow-hidden shadow-sm transition-all duration-300 hover:shadow-md hover:scale-[1.01] cursor-pointer h-[120px] ${
                              activity.isMultipleDays
                                ? isDarkMode 
                                  ? 'bg-gray-800 border-purple-500/50 hover:border-purple-500' 
                                  : 'bg-white border-purple-400 hover:border-purple-500'
                                : isDarkMode 
                                  ? 'bg-gray-800 border-blue-500/50 hover:border-blue-500' 
                                  : 'bg-white border-blue-400 hover:border-blue-500'
                            }`}
                          >
                            {/* Image - Left Side */}
                            <div className={`relative w-16 h-20 flex-shrink-0 overflow-hidden ml-2 my-auto rounded ${
                              isDarkMode 
                                ? 'bg-gradient-to-br from-gray-700 to-gray-800' 
                                : 'bg-gradient-to-br from-gray-100 to-gray-200'
                            }`}>
                              {activity.imageUrl ? (
                                <img
                                  src={activity.imageUrl}
                                  alt={activity.title}
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300 rounded"
                                />
                              ) : (
                                <div className={`w-full h-full flex items-center justify-center ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-100'} rounded`}>
                                  <ImageIcon size={16} className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} strokeWidth={1.5} />
                                </div>
                              )}
                              {/* Registered Badge - Top Left */}
                              {activity.isRegistered && (
                                <div className="absolute top-1 left-1 z-10">
                                  <div className={`p-1 rounded-full shadow-md backdrop-blur-sm ${
                                    activity.approvalStatus === 'approved'
                                      ? isDarkMode 
                                        ? 'bg-green-500/90 text-white border border-green-400/50' 
                                        : 'bg-green-500 text-white border border-green-600'
                                      : activity.approvalStatus === 'pending'
                                      ? isDarkMode 
                                        ? 'bg-yellow-500/90 text-white border border-yellow-400/50' 
                                        : 'bg-yellow-500 text-white border border-yellow-600'
                                      : activity.approvalStatus === 'rejected'
                                      ? isDarkMode 
                                        ? 'bg-red-500/90 text-white border border-red-400/50' 
                                        : 'bg-red-500 text-white border border-red-600'
                                      : isDarkMode 
                                        ? 'bg-gray-500/90 text-white border border-gray-400/50' 
                                        : 'bg-gray-500 text-white border border-gray-600'
                                  }`}>
                                    <CheckCircle2 size={10} strokeWidth={2.5} />
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Content - Right Side */}
                            <div className="flex-1 flex flex-col p-2.5 min-w-0 justify-between h-full overflow-hidden">
                              {/* Top Section */}
                              <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
                                {/* Status Badge - Bên phải */}
                                <div className="flex items-center justify-end gap-1.5 mb-2 flex-wrap">
                                  <div className={`${overallStatus.bannerBgColor} border ${overallStatus.bannerBorderColor} px-1.5 py-0.5 rounded inline-flex items-center gap-1 w-fit flex-shrink-0`}>
                                    <CheckCircle2 size={9} className={overallStatus.bannerTextColor} strokeWidth={2} />
                                    <span className={`text-[9px] font-bold uppercase tracking-wide ${overallStatus.bannerTextColor} leading-tight`}>
                                      {overallStatus.label}
                                    </span>
                                  </div>
                                  {/* Activity Type Badge */}
                                  {activity.isMultipleDays ? (
                                    <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-bold shadow-lg backdrop-blur-sm border flex-shrink-0 ${
                                      isDarkMode 
                                        ? 'bg-purple-600/90 text-white border-purple-400/50' 
                                        : 'bg-purple-600 text-white border-purple-700'
                                    }`}>
                                      📅 Nhiều ngày
                                    </span>
                                  ) : (
                                    <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-bold shadow-lg backdrop-blur-sm border flex-shrink-0 ${
                                      isDarkMode 
                                        ? 'bg-blue-600/90 text-white border-blue-400/50' 
                                        : 'bg-blue-600 text-white border-blue-700'
                                    }`}>
                                      📆 Một ngày
                                    </span>
                                  )}
                                </div>

                                {/* Title */}
                                <h3 className={`text-xs font-bold mb-2 line-clamp-2 leading-tight overflow-hidden ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {activity.title}
                                </h3>

                                {/* Info - Compact */}
                                <div className="space-y-1.5 flex-1 min-h-0">
                                  {/* Ngày và Số lượng - Cùng một hàng */}
                                  <div className="flex items-center gap-3 flex-wrap">
                                    {/* Ngày */}
                                    <div className={`flex items-center gap-1.5 text-[10px] flex-shrink-0 ${
                                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                    }`}>
                                      <Calendar size={10} className={`flex-shrink-0 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                                      <span className="truncate min-w-0">
                                        {activity.isMultipleDays && activity.startDate && activity.endDate
                                          ? `${new Date(activity.startDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} - ${new Date(activity.endDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
                                          : activity.date}
                                      </span>
                                    </div>

                                    {/* Số lượng */}
                                    {activity.registeredParticipantsCount !== undefined && (
                                      <div 
                                        className={`flex items-center gap-1.5 text-[10px] cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0 ${
                                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                        }`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleViewApprovedParticipants(activity.id, activity.title);
                                        }}
                                        title="Nhấn để xem danh sách người đã được duyệt"
                                      >
                                        <Users size={10} className={`flex-shrink-0 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
                                        <span className="truncate min-w-0">
                                          {activity.registeredParticipantsCount}
                                          {activity.maxParticipants && activity.maxParticipants > 0 ? `/${activity.maxParticipants}` : ''}
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Địa điểm - Luôn hiển thị */}
                                  {activity.location && (
                                    <div className={`flex items-center gap-1.5 text-[10px] ${
                                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                    }`}>
                                      <MapPin size={10} className={`flex-shrink-0 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                                      <span className={`font-medium opacity-70 flex-shrink-0 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                        Vị trí:
                                      </span>
                                      <div 
                                        className={`flex-1 min-w-0 ${expandedLocations.has(activity.id) ? '' : 'line-clamp-1'} cursor-pointer hover:underline transition-all text-[10px] leading-relaxed`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setExpandedLocations(prev => {
                                            const newSet = new Set(prev);
                                            if (newSet.has(activity.id)) {
                                              newSet.delete(activity.id);
                                            } else {
                                              newSet.add(activity.id);
                                            }
                                            return newSet;
                                          });
                                        }}
                                      >
                                        {activity.location}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className={`rounded-lg border p-6 text-center ${
                  isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                }`}>
                  <CheckCircle2 size={32} className={`mx-auto mb-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Chưa có hoạt động đã kết thúc
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Participations (chỉ hiển thị khi đã đăng nhập) */}
          {isAuthenticated && user?.isClubMember && recentParticipations.length > 0 && (
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

        {isAuthenticated && <Footer isDarkMode={isDarkMode} />}

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
                      Danh sách người đã được duyệt
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

        {/* Registration Modal */}
        <RegistrationModal
          isOpen={showRegistrationModal && !!selectedActivityForRegistration && parsedScheduleData.length > 0}
          onClose={() => {
            setShowRegistrationModal(false);
            setSelectedDaySlotsForRegistration([]);
            setSelectedActivityForRegistration(null);
            setParsedScheduleData([]);
          }}
          parsedScheduleData={parsedScheduleData}
          selectedDaySlots={selectedDaySlotsForRegistration}
          onToggleSlot={toggleDaySlotSelection}
          onRegister={handleRegisterWithDaySlots}
          isRegistering={selectedActivityForRegistration ? registeringActivities.has(selectedActivityForRegistration.id) : false}
          isRegistered={false}
          activity={selectedActivityForRegistration ? {
            type: selectedActivityForRegistration.type || 'multiple_days',
            maxParticipants: selectedActivityForRegistration.maxParticipants,
            participants: selectedActivityForRegistration.participants || [],
            registrationThreshold: selectedActivityForRegistration.registrationThreshold
          } : null}
          isDarkMode={isDarkMode}
          calculateRegistrationRate={calculateRegistrationRate}
          canRegister={canRegister}
          getRegistrationThreshold={getRegistrationThreshold}
          calculateTotalRegistrationRate={calculateTotalRegistrationRate}
        />

        {/* Single Day Registration Modal */}
        {showSingleDayRegistrationModal && selectedActivityForRegistration && selectedActivityForRegistration.type === 'single_day' && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`rounded-lg border max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col ${
              isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
            }`}>
              {/* Modal Header */}
              <div className={`px-4 py-3 border-b flex items-center justify-between ${
                isDarkMode ? 'border-blue-600 bg-blue-700' : 'border-blue-500 bg-blue-600'
              }`}>
                <div className="flex items-center gap-2">
                  <Calendar size={18} className="text-white" />
                  <h2 className="text-base font-bold text-white">
                    Đăng ký tham gia
                  </h2>
                </div>
                <button
                  onClick={() => {
                    setShowSingleDayRegistrationModal(false);
                    setSelectedSingleDaySlots([]);
                    setSelectedActivityForRegistration(null);
                  }}
                  className={`p-1.5 rounded transition-colors ${
                    isDarkMode ? 'hover:bg-blue-600 text-white' : 'hover:bg-blue-700 text-white'
                  }`}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Info Banner */}
              <div className={`px-4 py-2.5 border-b ${
                isDarkMode ? 'bg-blue-600/20 border-blue-600/30' : 'bg-blue-50 border-blue-200'
              }`}>
                <div className="flex items-center justify-center gap-2">
                  <AlertCircle size={14} className={isDarkMode ? 'text-blue-300' : 'text-blue-600'} />
                  <p className={`text-xs font-semibold ${
                    isDarkMode ? 'text-blue-200' : 'text-blue-700'
                  }`}>
                    Để tham gia hoạt động này, bạn phải chọn đăng ký ít nhất <span className="font-bold text-base">{selectedActivityForRegistration.registrationThreshold !== undefined && selectedActivityForRegistration.registrationThreshold !== null ? selectedActivityForRegistration.registrationThreshold : 80}%</span> tổng số buổi có sẵn
                  </p>
                </div>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="mb-4">
                  {selectedActivityForRegistration.date && (
                    <p className={`text-xs mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Ngày: {new Date(selectedActivityForRegistration.date).toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  )}
                </div>

                {/* Time Slots */}
                <div className="space-y-3">
                  {selectedActivityForRegistration.timeSlots?.filter((slot: any) => slot.isActive).map((slot: any) => {
                    const slotKey = slot.name === 'Buổi Sáng' ? 'morning' : 
                                   slot.name === 'Buổi Chiều' ? 'afternoon' : 'evening';
                    const isSelected = selectedSingleDaySlots.includes(slotKey);
                    const SlotIcon = slotKey === 'morning' ? Sunrise : slotKey === 'afternoon' ? Sun : Moon;
                    
                    return (
                      <button
                        key={slot.name}
                        type="button"
                        onClick={() => toggleSingleDaySlotSelection(slotKey)}
                        className={`w-full p-3 rounded border text-left transition-all ${
                          isSelected
                            ? isDarkMode
                              ? 'bg-blue-600/50 border-blue-400'
                              : 'bg-blue-200 border-blue-500'
                            : isDarkMode
                              ? 'bg-gray-700/30 border-gray-600 hover:border-gray-500 hover:bg-gray-700/50'
                              : 'bg-white border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {/* Icon */}
                          <div className={`p-1.5 rounded flex-shrink-0 ${
                            isSelected
                              ? isDarkMode ? 'bg-blue-500/60' : 'bg-blue-300'
                              : isDarkMode ? 'bg-gray-600/50' : 'bg-gray-100'
                          }`}>
                            <SlotIcon size={14} className={
                              isSelected
                                ? isDarkMode ? 'text-blue-200' : 'text-blue-700'
                                : isDarkMode ? 'text-gray-300' : 'text-gray-600'
                            } />
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            {/* Header with name */}
                            <div className="flex items-center justify-between mb-1.5">
                              <span className={`text-sm font-bold ${
                                isSelected
                                  ? isDarkMode ? 'text-blue-200' : 'text-blue-800'
                                  : isDarkMode ? 'text-white' : 'text-gray-900'
                              }`}>
                                {slot.name}
                              </span>
                              {isSelected && (
                                <CheckCircle2 size={14} className={isDarkMode ? 'text-blue-300' : 'text-blue-700'} />
                              )}
                            </div>
                            
                            {/* Time */}
                            <div className="mb-1.5">
                              <div className={`flex items-center gap-1 text-xs ${
                                isDarkMode ? 'text-gray-400' : 'text-gray-600'
                              }`}>
                                <Clock size={11} />
                                <span>{slot.startTime} - {slot.endTime}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer */}
              <div className={`px-4 py-3 border-t flex items-center justify-between gap-3 ${
                isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
              }`}>
                {/* Left: Summary Info */}
                <div className="flex items-center gap-2 flex-1">
                  {selectedSingleDaySlots.length > 0 ? (
                    <>
                      <span className={`text-sm font-bold px-2 py-1 rounded ${
                        isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-200 text-gray-700'
                      }`}>
                        {selectedSingleDaySlots.length} buổi
                      </span>
                      {(() => {
                        const activeSlots = selectedActivityForRegistration.timeSlots?.filter((slot: any) => slot.isActive) || [];
                        const totalAvailableSlots = activeSlots.length;
                        const selectedSlotsCount = selectedSingleDaySlots.length;
                        const totalRate = totalAvailableSlots > 0 
                          ? Math.round((selectedSlotsCount / totalAvailableSlots) * 100) 
                          : 0;
                        const threshold = selectedActivityForRegistration.registrationThreshold !== undefined && selectedActivityForRegistration.registrationThreshold !== null 
                          ? selectedActivityForRegistration.registrationThreshold 
                          : 80;
                        const isRateSufficient = totalRate >= threshold;
                        
                        return (
                          <>
                            {totalAvailableSlots > 0 && (
                              <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                / {totalAvailableSlots} buổi
                              </span>
                            )}
                            <span className={`text-sm font-bold px-2 py-1 rounded ${
                              isRateSufficient
                                ? isDarkMode 
                                  ? 'bg-green-500/20 text-green-300' 
                                  : 'bg-green-100 text-green-700'
                                : isDarkMode
                                  ? 'bg-orange-500/20 text-orange-300'
                                  : 'bg-orange-100 text-orange-700'
                            }`}>
                              {totalRate}%
                            </span>
                            <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              / {threshold}%
                            </span>
                            {isRateSufficient && (
                              <CheckCircle2 size={14} className={isDarkMode ? 'text-green-300' : 'text-green-600'} />
                            )}
                          </>
                        );
                      })()}
                    </>
                  ) : (
                    <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Chưa chọn buổi nào
                    </span>
                  )}
                </div>
                
                {/* Right: Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setShowSingleDayRegistrationModal(false);
                      setSelectedSingleDaySlots([]);
                      setSelectedActivityForRegistration(null);
                    }}
                    className={`px-4 py-2 rounded text-sm font-semibold transition-colors ${
                      isDarkMode
                        ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Hủy
                  </button>
                  {(() => {
                    // Tính toán tỷ lệ đăng ký để kiểm tra điều kiện disable
                    const activeSlots = selectedActivityForRegistration.timeSlots?.filter((slot: any) => slot.isActive) || [];
                    const totalAvailableSlots = activeSlots.length;
                    const selectedSlotsCount = selectedSingleDaySlots.length;
                    const totalRate = totalAvailableSlots > 0 
                      ? Math.round((selectedSlotsCount / totalAvailableSlots) * 100) 
                      : 0;
                    const threshold = selectedActivityForRegistration.registrationThreshold !== undefined && selectedActivityForRegistration.registrationThreshold !== null 
                      ? selectedActivityForRegistration.registrationThreshold 
                      : 80;
                    const isRateSufficient = totalRate >= threshold;
                    const isDisabled = (selectedActivityForRegistration ? registeringActivities.has(selectedActivityForRegistration.id) : false) || selectedSingleDaySlots.length === 0 || !isRateSufficient;

                    return (
                      <button
                        onClick={handleRegisterSingleDay}
                        disabled={isDisabled}
                        className={`px-4 py-2 rounded text-sm font-bold transition-all flex items-center gap-2 ${
                          isDisabled
                            ? 'bg-gray-400 text-white cursor-not-allowed'
                            : isDarkMode
                              ? 'bg-blue-600 text-white hover:bg-blue-500'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {(selectedActivityForRegistration ? registeringActivities.has(selectedActivityForRegistration.id) : false) ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            <span>Đang đăng ký...</span>
                          </>
                        ) : (
                          <>
                            <UserPlus size={14} />
                            <span>Đăng ký</span>
                          </>
                        )}
                      </button>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Overlap Warning Modal */}
        {overlapWarning && overlapWarning.show && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className={`rounded-lg border shadow-xl max-w-md w-full ${
              isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'
            }`}>
              {/* Header */}
              <div className={`px-4 py-3 border-b flex items-center gap-3 ${
                isDarkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'
              }`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  isDarkMode ? 'bg-orange-500/20' : 'bg-orange-100'
                }`}>
                  <AlertCircle size={20} className={isDarkMode ? 'text-orange-400' : 'text-orange-600'} strokeWidth={2.5} />
                </div>
                <div className="flex-1">
                  <h3 className={`text-base font-semibold ${
                    isDarkMode ? 'text-gray-200' : 'text-gray-800'
                  }`}>
                    Không thể đăng ký
                  </h3>
                  <p className={`text-xs mt-0.5 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Buổi này trùng với hoạt động khác
                  </p>
                </div>
                <button
                  onClick={() => setOverlapWarning(null)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
                  }`}
                >
                  <X size={18} strokeWidth={2.5} />
                </button>
              </div>

              {/* Content */}
              <div className="p-4">
                <div className={`mb-3 p-3 rounded-lg border ${
                  isDarkMode ? 'bg-gray-700/30 border-gray-600' : 'bg-gray-50 border-gray-200'
                }`}>
                  <p className={`text-sm font-semibold mb-1 ${
                    isDarkMode ? 'text-gray-200' : 'text-gray-800'
                  }`}>
                    Ngày {overlapWarning.day}, Buổi {overlapWarning.slot}
                    {overlapWarning.date && (
                      <span className={`ml-2 text-xs font-normal ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        ({new Date(overlapWarning.date).toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })})
                      </span>
                    )}
                  </p>
                  <p className={`text-xs ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Buổi này đã được đăng ký trong các hoạt động sau:
                  </p>
                </div>

                {/* Overlapping Activities List */}
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {/* Current Activity Slot */}
                  {overlapWarning.currentActivityName && (
                    <div
                      className={`p-3 rounded-lg border ${
                        isDarkMode ? 'bg-blue-900/20 border-blue-500/30' : 'bg-blue-50 border-blue-200'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          isDarkMode ? 'bg-blue-500/30' : 'bg-blue-200'
                        }`}>
                          <Clock size={10} className={isDarkMode ? 'text-blue-300' : 'text-blue-600'} strokeWidth={2} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold mb-1.5 ${
                            isDarkMode ? 'text-blue-200' : 'text-blue-800'
                          }`}>
                            {overlapWarning.currentActivityName}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 text-xs mb-1.5">
                            <span className={`px-2 py-0.5 rounded ${
                              isDarkMode ? 'bg-blue-600/40 text-blue-300' : 'bg-blue-100 text-blue-700'
                            }`}>
                              Ngày {overlapWarning.day}
                            </span>
                            <span className={`px-2 py-0.5 rounded ${
                              isDarkMode ? 'bg-blue-600/40 text-blue-300' : 'bg-blue-100 text-blue-700'
                            }`}>
                              Buổi {overlapWarning.slot}
                            </span>
                            {overlapWarning.date && (
                              <span className={`px-2 py-0.5 rounded ${
                                isDarkMode ? 'bg-blue-600/40 text-blue-300' : 'bg-blue-100 text-blue-700'
                              }`}>
                                {new Date(overlapWarning.date).toLocaleDateString('vi-VN')}
                              </span>
                            )}
                          </div>
                          {overlapWarning.currentSlotStartTime && overlapWarning.currentSlotEndTime && (
                            <div className={`flex items-center gap-1.5 text-xs mt-1 ${
                              isDarkMode ? 'text-blue-300' : 'text-blue-700'
                            }`}>
                              <Clock size={11} strokeWidth={2} />
                              <span className="font-medium">
                                {overlapWarning.currentSlotStartTime} - {overlapWarning.currentSlotEndTime}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Other Overlapping Activities */}
                  {overlapWarning.overlappingActivities.map((overlap, index) => {
                    const slotNames: { [key: string]: string } = {
                      'morning': 'Sáng',
                      'afternoon': 'Chiều',
                      'evening': 'Tối'
                    };
                    const slotName = slotNames[overlap.slot] || overlap.slot;
                    
                    return (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border ${
                          isDarkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            isDarkMode ? 'bg-orange-500/30' : 'bg-orange-100'
                          }`}>
                            <AlertCircle size={10} className={isDarkMode ? 'text-orange-400' : 'text-orange-600'} strokeWidth={2} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-bold mb-2 ${
                              isDarkMode ? 'text-gray-200' : 'text-gray-900'
                            }`}>
                              {overlap.activityName}
                            </p>
                            
                            {/* Buổi bị trùng - Highlighted */}
                            <div className={`mb-2 p-2 rounded ${
                              isDarkMode ? 'bg-orange-900/20 border border-orange-500/30' : 'bg-orange-50 border border-orange-200'
                            }`}>
                              <p className={`text-xs font-semibold mb-1 ${
                                isDarkMode ? 'text-orange-300' : 'text-orange-700'
                              }`}>
                                Buổi bị trùng:
                              </p>
                              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                <span className={`px-2 py-1 rounded font-semibold ${
                                  isDarkMode ? 'bg-orange-600/40 text-orange-200' : 'bg-orange-200 text-orange-800'
                                }`}>
                                  Ngày {overlap.day}
                                </span>
                                <span className={`px-2 py-1 rounded font-semibold ${
                                  isDarkMode ? 'bg-orange-600/40 text-orange-200' : 'bg-orange-200 text-orange-800'
                                }`}>
                                  Buổi {slotName}
                                </span>
                                {overlap.date && (
                                  <span className={`px-2 py-1 rounded font-semibold ${
                                    isDarkMode ? 'bg-orange-600/40 text-orange-200' : 'bg-orange-200 text-orange-800'
                                  }`}>
                                    {new Date(overlap.date).toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                  </span>
                                )}
                              </div>
                              {overlap.startTime && overlap.endTime && (
                                <div className={`flex items-center gap-1.5 text-xs mt-1.5 ${
                                  isDarkMode ? 'text-orange-300' : 'text-orange-700'
                                }`}>
                                  <Clock size={11} strokeWidth={2} />
                                  <span className="font-semibold">
                                    {overlap.startTime} - {overlap.endTime}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer Message */}
                <div className={`mt-4 p-3 rounded-lg border ${
                  isDarkMode ? 'bg-gray-700/30 border-gray-600' : 'bg-gray-50 border-gray-200'
                }`}>
                  <p className={`text-xs text-center ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    <span className="font-semibold">Vui lòng:</span> Chọn buổi khác hoặc hủy đăng ký hoạt động trùng lặp trước khi tiếp tục.
                  </p>
                </div>
              </div>

              {/* Footer Button */}
              <div className={`px-4 py-3 border-t flex justify-end ${
                isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
              }`}>
                <button
                  onClick={() => setOverlapWarning(null)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isDarkMode
                      ? 'bg-gray-700 text-white hover:bg-gray-600'
                      : 'bg-gray-700 text-white hover:bg-gray-600'
                  }`}
                >
                  Đã hiểu
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
  );
}