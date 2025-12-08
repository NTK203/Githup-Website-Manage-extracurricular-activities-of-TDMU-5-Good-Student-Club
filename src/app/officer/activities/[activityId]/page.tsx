'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Calendar, Clock, MapPin, Users, User, BookOpen, Target, FileText, CheckCircle2, XCircle, AlertCircle, Sunrise, Sun, Moon, ArrowLeft, Eye, UserPlus, UserMinus, ClipboardCheck, X, Loader2, StickyNote, ChevronLeft, ChevronRight, CalendarRange, Globe } from 'lucide-react';
import OfficerNav from '@/components/officer/OfficerNav';
import Footer from '@/components/common/Footer';
import { useAuth } from '@/hooks/useAuth';
import { useDarkMode } from '@/hooks/useDarkMode';
import dynamic from 'next/dynamic';

// Dynamically import OpenStreetMapPicker with SSR disabled
const OpenStreetMapPicker = dynamic(() => import('@/components/common/OpenStreetMapPicker'), {
  ssr: false,
  loading: () => (
    <div className="h-64 w-full rounded-lg border border-gray-300 bg-gray-50/50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-2" />
        <p className="text-xs text-gray-500">Đang tải OpenStreetMap...</p>
      </div>
    </div>
  )
});

const ReadOnlyMultiTimeLocationViewer = dynamic(() => import('@/components/common/ReadOnlyMultiTimeLocationViewer'), {
  ssr: false,
  loading: () => (
    <div className="h-64 w-full rounded-lg border border-gray-300 bg-gray-50/50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-2" />
        <p className="text-xs text-gray-500">Đang tải bản đồ...</p>
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

interface DaySchedule {
  day: number;
  date: string; // ISO date string
  activities: string;
}

interface ActivityDetail {
  _id: string;
  name: string;
  description: string;
  date: string; // For single_day
  startDate?: string; // For multiple_days
  endDate?: string; // For multiple_days
  location: string;
  timeSlots: Array<{
    startTime: string;
    endTime: string;
    isActive: boolean;
    name: string;
    activities?: string;
    detailedLocation?: { [key: string]: string };
  }>;
  schedule?: DaySchedule[]; // For multiple_days
  points?: number;
  status: string;
  type: 'single_day' | 'multiple_days';
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
  // Location data for multiple days
  dailyLocations?: { [day: number]: LocationData };
  perDayDetailedLocation?: { [day: number]: string };
  weeklySlotLocations?: { [day: number]: { [slot: string]: LocationData } };
}

export default function OfficerActivityDetailPage() {
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
  const [locationPickerKey, setLocationPickerKey] = useState(0);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<'morning' | 'afternoon' | 'evening' | null>(null);
  const [selectedDaySlot, setSelectedDaySlot] = useState<{ day: number; slot: 'morning' | 'afternoon' | 'evening' } | null>(null);
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0); // Index của tuần hiện tại đang xem

  // Parse schedule data for multiple days into structured format
  const [parsedScheduleData, setParsedScheduleData] = useState<Array<{
    day: number;
    date: string;
    slots: Array<{
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
    }>;
    dayMapLocation?: {
      address: string;
      lat?: number;
      lng?: number;
      radius?: number;
    };
    dayDetailedLocation?: string;
  }>>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<Array<{
    _id: string;
    timeSlot: string;
    checkInType: string;
    checkInTime: string;
    status: string;
  }>>([]);

  // Load attendance records from API
  const loadAttendanceRecords = useCallback(async () => {
    if (!isAuthenticated || !token || !activityId || !user?._id) {
      return;
    }

    try {
      const response = await fetch(`/api/activities/${activityId}/attendance/officer`, {
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
  }, [isAuthenticated, token, activityId, user?._id]);

  useEffect(() => {
    let isMounted = true;

    const fetchActivityDetails = async () => {
      if (!isMounted) return;

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

        if (!isMounted) return;

        const isMultiTimeMode = rawActivity.location === 'Nhiều địa điểm' || (rawActivity.multiTimeLocations && rawActivity.multiTimeLocations.length > 0);
        const isMultipleDays = rawActivity.type === 'multiple_days';

        // Parse schedule for multiple days
        let schedule: DaySchedule[] = [];
        if (isMultipleDays && rawActivity.schedule) {
          schedule = rawActivity.schedule.map((item: any) => ({
            day: item.day,
            date: item.date?.$date ? new Date(item.date.$date).toISOString().split('T')[0] : (item.date ? new Date(item.date).toISOString().split('T')[0] : ''),
            activities: item.activities || ''
          }));
        }

        // Parse location data for multiple days
        let dailyLocations: { [day: number]: LocationData } = {};
        let perDayDetailedLocation: { [day: number]: string } = {};
        let weeklySlotLocations: { [day: number]: { [slot: string]: LocationData } } = {};

        if (isMultipleDays && schedule.length > 0) {
          schedule.forEach((daySchedule) => {
            // Parse activities string to extract location data
            const activitiesText = daySchedule.activities || '';

            // Extract per day detailed location
            const detailedLocationMatch = activitiesText.match(/Địa điểm chi tiết:\s*(.+?)(?:\n|$)/);
            if (detailedLocationMatch) {
              perDayDetailedLocation[daySchedule.day] = detailedLocationMatch[1].trim();
            }

            // Extract map location for per day mode
            const mapLocationMatch = activitiesText.match(/Địa điểm map:\s*lat:([\d.]+),lng:([\d.]+),address:(.+?),radius:(\d+)/);
            if (mapLocationMatch) {
              dailyLocations[daySchedule.day] = {
                lat: parseFloat(mapLocationMatch[1]),
                lng: parseFloat(mapLocationMatch[2]),
                address: mapLocationMatch[3].trim(),
                radius: parseInt(mapLocationMatch[4])
              };
            }

            // Extract per slot locations
            const slotMatches = activitiesText.matchAll(/Buổi (Sáng|Chiều|Tối).*?Địa điểm map:\s*lat:([\d.]+),lng:([\d.]+),address:(.+?),radius:(\d+)/g);
            for (const match of slotMatches) {
              const slotName = match[1];
              const slotKey = slotName === 'Sáng' ? 'morning' : slotName === 'Chiều' ? 'afternoon' : 'evening';
              if (!weeklySlotLocations[daySchedule.day]) {
                weeklySlotLocations[daySchedule.day] = {};
              }
              weeklySlotLocations[daySchedule.day][slotKey] = {
                lat: parseFloat(match[2]),
                lng: parseFloat(match[3]),
                address: match[4].trim(),
                radius: parseInt(match[5])
              };
            }
          });
        }

        const activityDetails: ActivityDetail = {
          _id: rawActivity._id,
          name: rawActivity.name,
          description: rawActivity.description,
          date: isMultipleDays ? '' : (rawActivity.date?.$date ? new Date(rawActivity.date.$date).toLocaleDateString('vi-VN') : new Date(rawActivity.date).toLocaleDateString('vi-VN')),
          startDate: isMultipleDays && rawActivity.startDate ? (rawActivity.startDate?.$date ? new Date(rawActivity.startDate.$date).toLocaleDateString('vi-VN') : new Date(rawActivity.startDate).toLocaleDateString('vi-VN')) : undefined,
          endDate: isMultipleDays && rawActivity.endDate ? (rawActivity.endDate?.$date ? new Date(rawActivity.endDate.$date).toLocaleDateString('vi-VN') : new Date(rawActivity.endDate).toLocaleDateString('vi-VN')) : undefined,
          location: rawActivity.location,
          timeSlots: rawActivity.timeSlots?.map((slot: any) => ({
            ...slot,
            activities: slot.activities || '',
            detailedLocation: slot.detailedLocation || {}
          })) || [],
          schedule: schedule.length > 0 ? schedule : undefined,
          points: rawActivity.points || 0,
          status: rawActivity.status,
          type: rawActivity.type,
          visibility: rawActivity.visibility,
          imageUrl: rawActivity.imageUrl,
          overview: rawActivity.overview,
          numberOfSessions: isMultipleDays ? schedule.length : (rawActivity.timeSlots?.filter((slot: { isActive: boolean; }) => slot.isActive).length || 0),
          registeredParticipantsCount: rawActivity.participants?.length || 0,
          organizer: rawActivity.responsiblePerson?.name || rawActivity.participants?.find((p: { role: string; }) => p.role === 'Trưởng Nhóm')?.name || rawActivity.participants?.[0]?.name || 'N/A',
          participants: rawActivity.participants || [],
          locationData: rawActivity.locationData,
          multiTimeLocations: rawActivity.multiTimeLocations?.map((mtl: any) => {
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
          dailyLocations,
          perDayDetailedLocation,
          weeklySlotLocations,
        };

        setActivity(activityDetails);

        // Parse schedule data for multiple days
        if (isMultipleDays && schedule.length > 0) {
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

                const activitiesMatch = trimmed.match(/-\s*([^-]+?)(?:\s*-\s*Địa điểm chi tiết|$)/);
                const activities = activitiesMatch ? activitiesMatch[1].trim() : undefined;

                const detailedMatch = trimmed.match(/Địa điểm chi tiết:\s*(.+?)(?:\s*-\s*Địa điểm map|$)/);
                const detailedLocation = detailedMatch ? detailedMatch[1].trim() : undefined;

                const mapMatch = trimmed.match(/Địa điểm map:\s*(.+?)(?:\s*\(([\d.]+),\s*([\d.]+)\)|$)/);
                let mapLocation: { address: string; lat?: number; lng?: number; radius?: number } | undefined;
                if (mapMatch) {
                  const address = mapMatch[1].trim();
                  const lat = mapMatch[2] ? parseFloat(mapMatch[2]) : undefined;
                  const lng = mapMatch[3] ? parseFloat(mapMatch[3]) : undefined;
                  const radiusMatch = trimmed.match(/Bán kính:\s*(\d+)m/);
                  const radius = radiusMatch ? parseInt(radiusMatch[1]) : undefined;
                  mapLocation = { address, lat, lng, radius };
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
                const match = trimmed.match(/Địa điểm chi tiết:\s*(.+?)(?:\s*-\s*Địa điểm map|$)/);
                if (match) {
                  dayDetailedLocation = match[1].trim();
                }
              } else if (trimmed.startsWith('Địa điểm map:') && !trimmed.includes('Buổi')) {
                const mapMatch = trimmed.match(/Địa điểm map:\s*(.+?)(?:\s*\(([\d.]+),\s*([\d.]+)\)|$)/);
                if (mapMatch) {
                  const address = mapMatch[1].trim();
                  const lat = mapMatch[2] ? parseFloat(mapMatch[2]) : undefined;
                  const lng = mapMatch[3] ? parseFloat(mapMatch[3]) : undefined;
                  const radiusMatch = trimmed.match(/Bán kính:\s*(\d+)m/);
                  const radius = radiusMatch ? parseInt(radiusMatch[1]) : undefined;
                  dayMapLocation = { address, lat, lng, radius };
                }
              }
            });

            // Also check weeklySlotLocations and dailyLocations from parsed data
            if (weeklySlotLocations[daySchedule.day]) {
              Object.entries(weeklySlotLocations[daySchedule.day]).forEach(([slotKey, locationData]) => {
                const slot = slots.find(s => s.slotKey === slotKey);
                if (slot && !slot.mapLocation) {
                  slot.mapLocation = {
                    address: locationData.address,
                    lat: locationData.lat,
                    lng: locationData.lng,
                    radius: locationData.radius
                  };
                }
              });
            }

            if (dailyLocations[daySchedule.day] && !dayMapLocation) {
              dayMapLocation = {
                address: dailyLocations[daySchedule.day].address,
                lat: dailyLocations[daySchedule.day].lat,
                lng: dailyLocations[daySchedule.day].lng,
                radius: dailyLocations[daySchedule.day].radius
              };
            }

            if (perDayDetailedLocation[daySchedule.day] && !dayDetailedLocation) {
              dayDetailedLocation = perDayDetailedLocation[daySchedule.day];
            }

            return {
              day: daySchedule.day,
              date: daySchedule.date,
              slots,
              dayMapLocation,
              dayDetailedLocation
            };
          });

          setParsedScheduleData(parsedData);
        }

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

        if (!isMounted) return;

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
        if (!isMounted) return;
        console.error("Failed to fetch activity details:", err);
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (isAuthenticated && activityId && user?._id) {
      fetchActivityDetails();
    }

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, token, activityId, user?._id, loadAttendanceRecords]);

  // Auto-select when only 1 location exists
  useEffect(() => {
    if (activity?.isMultiTimeLocation && activity.multiTimeLocations && activity.multiTimeLocations.length === 1 && !selectedTimeSlot) {
      setSelectedTimeSlot(activity.multiTimeLocations[0].timeSlot);
    }
  }, [activity?.isMultiTimeLocation, activity?.multiTimeLocations?.length, selectedTimeSlot]);

  // Reload attendance records when page becomes visible (user returns from attendance page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isRegistered && approvalStatus === 'approved' && isAuthenticated && token && activityId && user?._id) {
        loadAttendanceRecords();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [isRegistered, approvalStatus, isAuthenticated, token, activityId, user?._id, loadAttendanceRecords]);

  // Helper function to check activity time status
  const getActivityTimeStatus = (): 'before' | 'during' | 'after' => {
    if (!activity) return 'after';

    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Handle multiple days activities
      if (activity.type === 'multiple_days' && activity.startDate && activity.endDate) {
        const startParts = activity.startDate.split('/');
        const endParts = activity.endDate.split('/');

        if (startParts.length === 3 && endParts.length === 3) {
          const startDate = new Date(
            parseInt(startParts[2]),
            parseInt(startParts[1]) - 1,
            parseInt(startParts[0])
          );
          const endDate = new Date(
            parseInt(endParts[2]),
            parseInt(endParts[1]) - 1,
            parseInt(endParts[0])
          );

          if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
            const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
            const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

            if (today < startDateOnly) {
              return 'before';
            } else if (today >= startDateOnly && today <= endDateOnly) {
              return 'during';
            } else {
              return 'after';
            }
          }
        }
        return 'after';
      }

      // Handle single day activities
      if (!activity.date) return 'after';

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

  // Helper function để format date
  const formatDateForDisplay = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  // Helper function để lấy dayKey từ date (Thứ 2 = 1, Chủ nhật = 0)
  const getDayKeyFromDate = (dateStr: string): number => {
    try {
      const d = new Date(dateStr);
      const day = d.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      // Convert to Monday = 0, Tuesday = 1, ..., Sunday = 6
      return day === 0 ? 6 : day - 1;
    } catch {
      return 0;
    }
  };

  // Nhóm các ngày theo tuần (từ thứ 2 đến chủ nhật)
  const weeks = useMemo(() => {
    if (!parsedScheduleData || parsedScheduleData.length === 0) return [];

    type WeekDay = {
      day: number;
      date: string;
      dayIndex: number;
      dayKey: number; // 0 = Monday, 6 = Sunday
      data?: typeof parsedScheduleData[0];
    };

    type Week = {
      weekNumber: number;
      days: WeekDay[];
    };

    const result: Week[] = [];

    let currentWeek: Week | null = null;
    let weekNumber = 1;

    parsedScheduleData.forEach((dayData, idx) => {
      const dayKey = getDayKeyFromDate(dayData.date);

      // Bắt đầu tuần mới khi gặp thứ 2 hoặc khi tuần hiện tại đã đủ 7 ngày
      if (!currentWeek || dayKey === 0 || (currentWeek.days.length > 0 && currentWeek.days[currentWeek.days.length - 1].dayKey === 6)) {
        // Đảm bảo tuần trước có đủ 7 ngày trước khi tạo tuần mới
        if (currentWeek && currentWeek.days.length < 7) {
          while (currentWeek.days.length < 7) {
            const lastDayKey = currentWeek.days.length;
            currentWeek.days.push({
              day: 0,
              date: '',
              dayIndex: -1,
              dayKey: lastDayKey,
              data: undefined
            });
          }
        }
        currentWeek = { weekNumber, days: [] };
        result.push(currentWeek);
        weekNumber++;
      }

      // Đảm bảo các ngày được sắp xếp đúng vị trí trong tuần
      // Nếu có khoảng trống trước ngày này, điền vào
      if (currentWeek) {
        while (currentWeek.days.length < dayKey) {
          const lastDayKey = currentWeek.days.length;
          currentWeek.days.push({
            day: 0,
            date: '',
            dayIndex: -1,
            dayKey: lastDayKey,
            data: undefined
          });
        }

        currentWeek.days.push({
          day: dayData.day,
          date: dayData.date,
          dayIndex: idx,
          dayKey,
          data: dayData
        });
      }
    });

    // Đảm bảo tuần cuối có đủ 7 ngày
    if (result.length > 0) {
      const lastWeek = result[result.length - 1];
      while (lastWeek.days.length < 7) {
        const lastDayKey = lastWeek.days.length;
        lastWeek.days.push({
          day: 0,
          date: '',
          dayIndex: -1,
          dayKey: lastDayKey,
          data: undefined
        });
      }
    }

    return result;
  }, [parsedScheduleData]);

  // Reset currentWeekIndex khi parsedScheduleData thay đổi
  useEffect(() => {
    setCurrentWeekIndex(0);
  }, [parsedScheduleData.length]);

  // Tự động chọn ngày đầu tiên có dữ liệu khi chưa có ngày nào được chọn
  useEffect(() => {
    if (!selectedDaySlot && parsedScheduleData.length > 0) {
      const firstDay = parsedScheduleData[0];
      if (firstDay && firstDay.slots.length > 0) {
        setSelectedDaySlot({ day: firstDay.day, slot: firstDay.slots[0].slotKey });
      }
    }
  }, [parsedScheduleData, selectedDaySlot]);

  // Tính toán thông tin tuần hiện tại
  const weekInfo = useMemo(() => {
    if (weeks.length === 0) {
      return {
        totalWeeks: 0,
        currentWeek: null,
        canGoPrev: false,
        canGoNext: false,
        startDateStr: '',
        endDateStr: ''
      };
    }
    const totalWeeks = weeks.length;
    const currentWeek = weeks[currentWeekIndex] || weeks[0];
    const canGoPrev = currentWeekIndex > 0;
    const canGoNext = currentWeekIndex < totalWeeks - 1;
    const startDateStr = currentWeek?.days?.[0] ? formatDateForDisplay(currentWeek.days[0].date) : '';
    const endDateStr = currentWeek?.days && currentWeek.days.length > 0 ? formatDateForDisplay(currentWeek.days[currentWeek.days.length - 1].date) : '';
    return {
      totalWeeks,
      currentWeek,
      canGoPrev,
      canGoNext,
      startDateStr,
      endDateStr
    };
  }, [weeks, currentWeekIndex]);

  // Tạo mảng 7 ngày từ thứ 2 đến chủ nhật cho tuần hiện tại
  const currentWeekDays = useMemo(() => {
    if (!weekInfo.currentWeek) {
      // Nếu chưa có tuần, tạo mảng rỗng với 7 ngày
      return Array.from({ length: 7 }, (_, i) => ({
        dayKey: i, // 0 = Monday, 6 = Sunday
        day: null as number | null,
        date: null as string | null,
        data: null as typeof parsedScheduleData[0] | null
      }));
    }

    // Tạo mảng 7 ngày từ thứ 2 đến chủ nhật, đảm bảo đúng thứ tự
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const dayKey = i; // 0 = Monday, 6 = Sunday
      // Tìm ngày có dayKey tương ứng trong tuần hiện tại
      const dayInWeek = weekInfo.currentWeek.days.find(d => d.dayKey === dayKey);

      if (dayInWeek && dayInWeek.data) {
        return {
          dayKey,
          day: dayInWeek.day,
          date: dayInWeek.date,
          data: dayInWeek.data
        };
      }

      // Ngày không có trong tuần hiện tại
      return {
        dayKey,
        day: null,
        date: null,
        data: null
      };
    });

    return weekDays;
  }, [weekInfo.currentWeek]);

  // Day labels
  const dayLabels = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];

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

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-sm font-medium">Đang tải chi tiết hoạt động...</p>
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
    <div className={`min-h-screen flex flex-col ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <OfficerNav key="officer-nav" />
      <main className="flex-1 max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4 w-full">
        {/* Hero Section - Compact & Smart */}
        <div className={`mb-3 rounded-xl overflow-hidden border-2 ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
          {activity.imageUrl && (
            <div className="relative h-48 sm:h-56 overflow-hidden">
              <img
                src={activity.imageUrl}
                alt={activity.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h1 className={`text-xl sm:text-2xl font-bold text-white mb-1.5 drop-shadow-lg`}>
                  {activity.name}
                </h1>
                {activity.overview && (
                  <p className={`text-sm text-white/95 line-clamp-2 drop-shadow-md`}>
                    {activity.overview}
                  </p>
                )}
              </div>
            </div>
          )}
          {!activity.imageUrl && (
            <div className={`p-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <h1 className={`text-xl sm:text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {activity.name}
              </h1>
              {activity.overview && (
                <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  {activity.overview}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Quick Action Buttons - Sticky on Mobile */}
        <div className="sticky top-0 z-20 mb-3 -mx-3 sm:mx-0 px-3 sm:px-0">
          <div className={`rounded-xl border-2 p-2 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'}`}>
            <div className="flex flex-col sm:flex-row gap-2">
              {/* Attendance/Check-in Button */}
              {isAuthenticated && user && (() => {
                const timeStatus = getActivityTimeStatus();
                const hasAttendanceRecords = attendanceRecords.length > 0;

                if (isRegistered && timeStatus === 'after' && hasAttendanceRecords) {
                  return (
                    <button
                      onClick={() => router.push(`/officer/attendance/${activityId}`)}
                      className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-lg ${
                        isDarkMode
                          ? 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-blue-500/50'
                          : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-blue-500/30'
                      }`}
                    >
                      <Eye size={16} />
                      <span>Xem điểm danh</span>
                    </button>
                  );
                }

                if (isRegistered && approvalStatus === 'approved' && timeStatus === 'during') {
                  return (
                    <button
                      onClick={() => router.push(`/officer/attendance/${activityId}`)}
                      className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-lg ${
                        isDarkMode
                          ? 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-blue-500/50'
                          : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-blue-500/30'
                      }`}
                    >
                      <ClipboardCheck size={16} />
                      <span>Điểm danh</span>
                    </button>
                  );
                }

                return null;
              })()}

              {/* Manage Participants Button - Always visible for officers */}
              <button
                onClick={() => router.push(`/officer/activities/${activityId}/participants`)}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-lg ${
                  isDarkMode
                    ? 'bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white shadow-purple-500/50'
                    : 'bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white shadow-purple-500/30'
                }`}
              >
                <Users size={16} />
                <span>Quản lý người tham gia</span>
              </button>

              {/* Back Button */}
              <button
                onClick={() => window.history.back()}
                className={`py-2.5 px-4 rounded-lg text-sm font-semibold transition-all border flex items-center justify-center gap-2 ${
                  isDarkMode
                    ? 'border-gray-600 text-gray-100 hover:bg-gray-700/50'
                    : 'border-gray-300 text-gray-800 hover:bg-gray-50'
                }`}
              >
                <ArrowLeft size={16} />
                <span className="hidden sm:inline">Quay lại</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Info Cards Grid - Compact & Clean */}
        <div className={`mb-3 rounded-xl border-2 p-3 ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
          <div className="flex flex-wrap gap-2.5">
            {/* Ngày diễn ra */}
            <div key="date-card" className={`flex-1 min-w-[140px] rounded-lg border ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
              <div className="p-2.5 flex flex-col items-center text-center h-full">
                <Calendar size={18} className="text-blue-500 mb-1.5" strokeWidth={2} />
                <p className={`text-[10px] font-medium mb-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {activity.type === 'multiple_days' ? 'Thời gian' : 'Ngày'}
                </p>
                <p className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} line-clamp-2 leading-tight`}>
                  {activity.type === 'multiple_days'
                    ? activity.startDate && activity.endDate
                      ? `${activity.startDate} - ${activity.endDate}`
                      : 'N/A'
                    : activity.date}
                </p>
              </div>
            </div>

            {/* Địa điểm - Single Location */}
            {!activity.isMultiTimeLocation && (
              <div key="single-location-card" className={`flex-1 min-w-[140px] rounded-lg border ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                <div className="p-2.5 flex flex-col items-center text-center h-full">
                  <MapPin size={18} className="text-red-500 mb-1.5" strokeWidth={2} />
                  <p className={`text-[10px] font-medium mb-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Địa điểm
                  </p>
                  <p className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} line-clamp-2 leading-tight`}>
                    {activity.locationData?.address || activity.location || 'N/A'}
                  </p>
                </div>
              </div>
            )}

            {/* Số buổi / Số ngày */}
            {activity.numberOfSessions !== undefined && activity.numberOfSessions > 0 && (
              <div key="number-of-sessions-card" className={`flex-1 min-w-[140px] rounded-lg border ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                <div className="p-2.5 flex flex-col items-center text-center h-full">
                  <BookOpen size={18} className="text-purple-500 mb-1.5" strokeWidth={2} />
                  <p className={`text-[10px] font-medium mb-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {activity.type === 'multiple_days' ? 'Số ngày' : 'Số buổi'}
                  </p>
                  <p className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {activity.numberOfSessions}
                  </p>
                </div>
              </div>
            )}

            {/* Đã đăng ký */}
            {activity.registeredParticipantsCount !== undefined && (
              <div key="registered-count-card" className={`flex-1 min-w-[140px] rounded-lg border ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                <div className="p-2.5 flex flex-col items-center text-center h-full">
                  <Users size={18} className="text-green-500 mb-1.5" strokeWidth={2} />
                  <p className={`text-[10px] font-medium mb-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Đã đăng ký
                  </p>
                  <p className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {activity.registeredParticipantsCount}
                  </p>
                </div>
              </div>
            )}

            {/* Trạng thái điểm danh - Chỉ hiển thị khi đã đăng ký và được duyệt */}
            {isRegistered && approvalStatus === 'approved' && (() => {
              const timeStatus = getActivityTimeStatus();

              // Nếu chưa đến ngày hoặc đã qua ngày, hiển thị trạng thái đặc biệt
              if (timeStatus === 'before') {
                return (
                  <div key="attendance-status-card" className={`flex-1 min-w-[140px] rounded-lg border ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                    <div className="p-2.5 flex flex-col items-center text-center h-full">
                      <Clock size={18} className="text-amber-500 mb-1.5" strokeWidth={2} />
                      <p className={`text-[10px] font-medium mb-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Trạng thái
                      </p>
                      <p className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} line-clamp-2 leading-tight`}>
                        Chưa đến ngày
                      </p>
                    </div>
                  </div>
                );
              }

              if (timeStatus === 'after') {
                return (
                  <div key="attendance-status-card" className={`flex-1 min-w-[140px] rounded-lg border ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                    <div className="p-2.5 flex flex-col items-center text-center h-full">
                      <XCircle size={18} className="text-red-500 mb-1.5" strokeWidth={2} />
                      <p className={`text-[10px] font-medium mb-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Trạng thái
                      </p>
                      <p className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} line-clamp-2 leading-tight`}>
                        Đã kết thúc
                      </p>
                    </div>
                  </div>
                );
              }

              // Đang trong thời gian hoạt động - hiển thị thông tin điểm danh
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

                  if (startRecord && endRecord) {
                    completedSlots++;
                  }
                });
              }

              const isCompleted = completedSlots === totalSlots && totalSlots > 0;
              const hasAnyAttendance = (attendanceRecords || []).length > 0;

              const StatusIcon = isCompleted ? CheckCircle2 : hasAnyAttendance ? Clock : AlertCircle;
              const iconColor = isCompleted ? 'text-green-500' : hasAnyAttendance ? 'text-blue-500' : 'text-gray-500';

              return (
                <div key="attendance-status-card" className={`flex-1 min-w-[140px] rounded-lg border ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                  <div className="p-2.5 flex flex-col items-center text-center h-full">
                    <StatusIcon size={18} className={iconColor} strokeWidth={2} />
                    <p className={`text-[10px] font-medium mb-0.5 mt-1.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Trạng thái
                    </p>
                    <p className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} line-clamp-2 leading-tight`}>
                      {isCompleted
                        ? 'Đã hoàn thành'
                        : totalSlots === 1
                        ? 'Chưa hoàn thành'
                        : totalSlots > 1
                        ? `${completedSlots}/${totalSlots} buổi`
                        : 'Chưa điểm danh'}
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Description Section */}
        <div className={`mb-3 rounded-xl border-2 p-3 ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
          <div className="flex items-center gap-2 mb-3">
            <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-cyan-500/20' : 'bg-cyan-50'}`}>
              <FileText size={18} className="text-cyan-500" />
            </div>
            <h2 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Mô tả chi tiết</h2>
          </div>
          <div className={`prose prose-sm max-w-none ${isDarkMode ? 'prose-invert' : ''}`}>
            <p className={`text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              {activity.description}
            </p>
          </div>
        </div>

        {/* Participants Section */}
        {activity.participants && activity.participants.length > 0 && (
          <div className={`mb-3 rounded-xl border-2 p-3 ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
            <div className="flex items-center gap-2 mb-3">
              <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-green-500/20' : 'bg-green-50'}`}>
                <Users size={18} className="text-green-500" />
              </div>
              <h2 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Danh sách người đăng ký ({activity.participants.length})
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {activity.participants.map((participant, index) => (
                <div
                  key={participant._id || participant.userId || `participant-${index}`}
                  className={`p-2 rounded-lg border-2 ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}
                >
                  <div className="flex items-center gap-2">
                    <img
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(participant.name)}&background=random&color=fff`}
                      alt={participant.name}
                      className="w-8 h-8 rounded-full flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{participant.name}</p>
                      <p className={`text-[10px] truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{participant.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Schedule Section for Multiple Days - Card View */}
        {activity.type === 'multiple_days' && parsedScheduleData.length > 0 && (
          <div className={`mb-3 rounded-xl border-2 p-3 ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-blue-500/20' : 'bg-blue-50'}`}>
                  <Calendar size={18} className="text-blue-500" />
                </div>
                <h2 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Lịch trình hoạt động
                </h2>
              </div>
              {selectedDaySlot && (
                <button
                  onClick={() => {
                    setSelectedDaySlot(null);
                    setTimeout(() => {
                      const mapSection = document.getElementById('map-section');
                      if (mapSection) {
                        mapSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }, 100);
                  }}
                  className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                    isDarkMode
                      ? 'bg-gray-700 hover:bg-gray-600 text-white'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  Xem tất cả
                </button>
              )}
            </div>

            {/* Week Navigation - Luôn hiển thị */}
            {weeks.length > 0 && (
              <div className={`mb-3 rounded-lg border ${isDarkMode ? 'border-gray-600 bg-gray-800/50' : 'border-gray-300 bg-gray-50'} p-2`}>
                <div className="flex items-center justify-between gap-3">
                  {/* Nút Previous */}
                  <button
                    onClick={() => setCurrentWeekIndex(prev => Math.max(0, prev - 1))}
                    disabled={!weekInfo.canGoPrev}
                    className={`flex items-center justify-center w-10 h-10 rounded-lg transition-all ${
                      weekInfo.canGoPrev
                        ? isDarkMode
                          ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 hover:scale-105 border border-blue-500/30'
                          : 'bg-blue-50 text-blue-600 hover:bg-blue-100 hover:scale-105 border border-blue-200'
                        : isDarkMode
                          ? 'bg-gray-800/50 text-gray-500 opacity-50 cursor-not-allowed border border-gray-700'
                          : 'bg-gray-100 text-gray-400 opacity-50 cursor-not-allowed border border-gray-300'
                    }`}
                    title="Tuần trước"
                  >
                    <ChevronLeft size={20} strokeWidth={2.5} />
                  </button>

                  {/* Week Info Card - Enhanced */}
                  <div className={`flex-1 flex items-center justify-center gap-3 px-4 py-3 rounded-lg ${
                    isDarkMode
                      ? 'bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border border-purple-500/30'
                      : 'bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200'
                  }`}>
                    <CalendarRange size={20} strokeWidth={2.5} className={isDarkMode ? 'text-purple-300' : 'text-purple-600'} />
                    <div className="flex flex-col items-center gap-1">
                      <div className={`flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        <span className="text-base font-bold">Tuần</span>
                        <span className="text-lg font-extrabold">{weekInfo.currentWeek?.weekNumber || 1}</span>
                        {weekInfo.totalWeeks > 1 && (
                          <>
                            <span className="text-sm opacity-70">/</span>
                            <span className="text-sm opacity-70">{weekInfo.totalWeeks}</span>
                          </>
                        )}
                      </div>
                      {weekInfo.currentWeek && weekInfo.startDateStr && weekInfo.endDateStr && (
                        <div className={`flex items-center gap-1.5 text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          <Calendar size={12} strokeWidth={2} />
                          <span>{weekInfo.startDateStr} - {weekInfo.endDateStr}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Nút Next */}
                  <button
                    onClick={() => setCurrentWeekIndex(prev => Math.min(weekInfo.totalWeeks - 1, prev + 1))}
                    disabled={!weekInfo.canGoNext}
                    className={`flex items-center justify-center w-10 h-10 rounded-lg transition-all ${
                      weekInfo.canGoNext
                        ? isDarkMode
                          ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 hover:scale-105 border border-blue-500/30'
                          : 'bg-blue-50 text-blue-600 hover:bg-blue-100 hover:scale-105 border border-blue-200'
                        : isDarkMode
                          ? 'bg-gray-800/50 text-gray-500 opacity-50 cursor-not-allowed border border-gray-700'
                          : 'bg-gray-100 text-gray-400 opacity-50 cursor-not-allowed border border-gray-300'
                    }`}
                    title="Tuần tiếp theo"
                  >
                    <ChevronRight size={20} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            )}

            {/* Day Tabs - Hiển thị đầy đủ từ Thứ 2 đến Chủ nhật */}
            <div className="flex justify-center overflow-x-auto gap-1.5 mb-3 no-scrollbar">
              {currentWeekDays.map((weekDay, idx) => {
                const dayLabel = dayLabels[idx];
                const dayData = weekDay.data;
                const isInCurrentWeek = !!dayData;
                const isSelected = dayData && selectedDaySlot?.day === dayData.day;

                if (!dayData) {
                  return (
                    <div
                      key={`day-tab-${idx}-${weekDay.dayKey}`}
                      className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-semibold border-2 ${
                        isDarkMode
                          ? 'bg-gray-800/40 text-gray-400 opacity-60 border-gray-700/50'
                          : 'bg-gray-50 text-gray-400 opacity-60 border-gray-200'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span className="font-bold">{dayLabel}</span>
                        <span className={`text-[9px] italic ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                          Ngoài phạm vi
                        </span>
                      </div>
                    </div>
                  );
                }

                const scheduleDate = new Date(dayData.date);
                const dayDateShort = `${scheduleDate.getDate()}/${scheduleDate.getMonth() + 1}`;
                const activeSlots = dayData.slots.filter(s => s.slotKey).length;
                const totalSlots = 3;

                return (
                  <button
                    key={`day-tab-${idx}-${dayData.day}`}
                    type="button"
                    onClick={() => {
                      setSelectedDaySlot(isSelected ? null : { day: dayData.day, slot: 'morning' });
                    }}
                    className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-semibold transition-all relative border-2 ${
                      isSelected
                        ? isDarkMode
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md border-blue-400'
                          : 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-sm border-blue-300'
                        : isDarkMode
                          ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 border-gray-600'
                          : 'bg-white text-gray-600 hover:bg-gray-100 border-gray-300'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold">{dayLabel}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                          activeSlots > 0
                            ? isSelected
                              ? (isDarkMode ? 'bg-white/20 text-white' : 'bg-white/30 text-white')
                              : (isDarkMode ? 'bg-green-500/40 text-green-100' : 'bg-green-100 text-green-700')
                            : isSelected
                              ? (isDarkMode ? 'bg-white/10 text-white/70' : 'bg-white/20 text-white/80')
                              : (isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500')
                        }`}>{activeSlots}/{totalSlots}</span>
                      </div>
                      <span className={`text-[10px] font-medium ${
                        isSelected
                          ? isDarkMode ? 'text-white/90' : 'text-white'
                          : isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        {dayDateShort}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Time Slot Cards - Hiển thị các buổi của ngày được chọn - Layout Grid Đẹp Mắt */}
            {!selectedDaySlot && (
              <div className={`text-center py-6 rounded-lg border-2 ${isDarkMode ? 'border-gray-600 bg-gray-800/50' : 'border-gray-300 bg-gray-50'}`}>
                <Calendar size={24} className={`mx-auto mb-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                <p className={`text-base font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Chọn một ngày để xem lịch trình hoạt động
                </p>
                <p className={`text-sm mt-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                  Nhấn vào một ngày ở trên để xem các buổi hoạt động của ngày đó
                </p>
              </div>
            )}
            {selectedDaySlot && (() => {
              const dayData = parsedScheduleData.find(d => d.day === selectedDaySlot.day);
              if (!dayData) return null;

              // Chỉ hiển thị các buổi thực sự có trong ngày này
              const availableSlots = dayData.slots.filter(s => s.slotKey);
              if (availableSlots.length === 0) {
                return (
                  <div className={`text-center py-6 rounded-lg border-2 ${isDarkMode ? 'border-gray-600 bg-gray-800/50' : 'border-gray-300 bg-gray-50'}`}>
                    <Calendar size={24} className={`mx-auto mb-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                    <p className={`text-base font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Ngày này chưa có lịch trình hoạt động
                    </p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-stretch">
                  {availableSlots.map((slotItem) => {
                    const slotKey = slotItem.slotKey;
                    const slot = slotItem;
                    const slotName = slotKey === 'morning' ? 'Buổi Sáng' : slotKey === 'afternoon' ? 'Buổi Chiều' : 'Buổi Tối';
                    const SlotIcon = slotKey === 'morning' ? Sunrise : slotKey === 'afternoon' ? Sun : Moon;

                    const isActive = !!slot;
                    const location = slot?.mapLocation || dayData.dayMapLocation;
                    const hasLocation = !!(location?.lat && location?.lng);
                    const isSelected = selectedDaySlot.slot === slotKey;

                    // Màu sắc và gradient riêng cho từng buổi
                    const getSlotStyles = () => {
                      if (slotKey === 'morning') {
                        return {
                          iconBg: isActive
                            ? (isSelected
                              ? (isDarkMode ? 'bg-gradient-to-br from-yellow-500/40 to-orange-500/30' : 'bg-gradient-to-br from-yellow-100 to-orange-100')
                              : (isDarkMode ? 'bg-yellow-500/20' : 'bg-yellow-50'))
                            : (isDarkMode ? 'bg-gray-700/30' : 'bg-gray-100'),
                          iconColor: isActive
                            ? (isDarkMode ? 'text-yellow-300' : 'text-yellow-600')
                            : (isDarkMode ? 'text-gray-500' : 'text-gray-400'),
                          border: isActive
                            ? (isSelected
                              ? (isDarkMode ? 'border-yellow-500/60 ring-2 ring-yellow-400/50' : 'border-yellow-400 ring-2 ring-yellow-300/50')
                              : (isDarkMode ? 'border-yellow-500/30' : 'border-yellow-300'))
                            : (isDarkMode ? 'border-gray-700/50' : 'border-gray-300'),
                          bg: isActive
                            ? (isSelected
                              ? (isDarkMode ? 'bg-gradient-to-br from-yellow-900/30 via-orange-900/20 to-amber-900/20' : 'bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-50')
                              : (isDarkMode ? 'bg-gradient-to-br from-yellow-900/15 to-orange-900/10' : 'bg-gradient-to-br from-yellow-50/50 to-orange-50/50'))
                            : (isDarkMode ? 'bg-gray-800/30' : 'bg-gray-50'),
                          shadow: isSelected ? 'shadow-lg shadow-yellow-500/20' : 'shadow-sm',
                          timeColor: isActive ? (isDarkMode ? 'text-yellow-200' : 'text-yellow-700') : (isDarkMode ? 'text-gray-500' : 'text-gray-400'),
                        };
                      } else if (slotKey === 'afternoon') {
                        return {
                          iconBg: isActive
                            ? (isSelected
                              ? (isDarkMode ? 'bg-gradient-to-br from-orange-500/40 to-red-500/30' : 'bg-gradient-to-br from-orange-100 to-red-100')
                              : (isDarkMode ? 'bg-orange-500/20' : 'bg-orange-50'))
                            : (isDarkMode ? 'bg-gray-700/30' : 'bg-gray-100'),
                          iconColor: isActive
                            ? (isDarkMode ? 'text-orange-300' : 'text-orange-600')
                            : (isDarkMode ? 'text-gray-500' : 'text-gray-400'),
                          border: isActive
                            ? (isSelected
                              ? (isDarkMode ? 'border-orange-500/60 ring-2 ring-orange-400/50' : 'border-orange-400 ring-2 ring-orange-300/50')
                              : (isDarkMode ? 'border-orange-500/30' : 'border-orange-300'))
                            : (isDarkMode ? 'border-gray-700/50' : 'border-gray-300'),
                          bg: isActive
                            ? (isSelected
                              ? (isDarkMode ? 'bg-gradient-to-br from-orange-900/30 via-red-900/20 to-pink-900/20' : 'bg-gradient-to-br from-orange-50 via-red-50 to-pink-50')
                              : (isDarkMode ? 'bg-gradient-to-br from-orange-900/15 to-red-900/10' : 'bg-gradient-to-br from-orange-50/50 to-red-50/50'))
                            : (isDarkMode ? 'bg-gray-800/30' : 'bg-gray-50'),
                          shadow: isSelected ? 'shadow-lg shadow-orange-500/20' : 'shadow-sm',
                          timeColor: isActive ? (isDarkMode ? 'text-orange-200' : 'text-orange-700') : (isDarkMode ? 'text-gray-500' : 'text-gray-400'),
                        };
                      } else {
                        return {
                          iconBg: isActive
                            ? (isSelected
                              ? (isDarkMode ? 'bg-gradient-to-br from-blue-500/40 to-indigo-500/30' : 'bg-gradient-to-br from-blue-100 to-indigo-100')
                              : (isDarkMode ? 'bg-blue-500/20' : 'bg-blue-50'))
                            : (isDarkMode ? 'bg-gray-700/30' : 'bg-gray-100'),
                          iconColor: isActive
                            ? (isDarkMode ? 'text-blue-300' : 'text-blue-600')
                            : (isDarkMode ? 'text-gray-500' : 'text-gray-400'),
                          border: isActive
                            ? (isSelected
                              ? (isDarkMode ? 'border-blue-500/60 ring-2 ring-blue-400/50' : 'border-blue-400 ring-2 ring-blue-300/50')
                              : (isDarkMode ? 'border-blue-500/30' : 'border-blue-300'))
                            : (isDarkMode ? 'border-gray-700/50' : 'border-gray-300'),
                          bg: isActive
                            ? (isSelected
                              ? (isDarkMode ? 'bg-gradient-to-br from-blue-900/30 via-indigo-900/20 to-purple-900/20' : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50')
                              : (isDarkMode ? 'bg-gradient-to-br from-blue-900/15 to-indigo-900/10' : 'bg-gradient-to-br from-blue-50/50 to-indigo-50/50'))
                            : (isDarkMode ? 'bg-gray-800/30' : 'bg-gray-50'),
                          shadow: isSelected ? 'shadow-lg shadow-blue-500/20' : 'shadow-sm',
                          timeColor: isActive ? (isDarkMode ? 'text-blue-200' : 'text-blue-700') : (isDarkMode ? 'text-gray-500' : 'text-gray-400'),
                        };
                      }
                    };

                    const styles = getSlotStyles();

                    return (
                      <div
                        key={slotKey}
                        onClick={() => {
                          if (isActive) {
                            setSelectedDaySlot({ day: dayData.day, slot: slotKey as 'morning' | 'afternoon' | 'evening' });
                            setTimeout(() => {
                              const mapSection = document.getElementById('map-section');
                              if (mapSection) {
                                mapSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              }
                            }, 100);
                          }
                        }}
                        className={`rounded-xl border-2 p-4 transition-all duration-300 ${styles.border} ${
                          isDarkMode ? 'bg-gray-800' : 'bg-white'
                        } ${
                          !isActive ? 'opacity-60' : ''
                        } ${
                          isActive ? 'cursor-pointer hover:shadow-lg' : 'cursor-default'
                        } flex flex-col h-full`}
                      >
                        {/* Slot Header - Enhanced */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3 flex-1">
                            {/* Icon */}
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                              isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                            } transition-transform duration-300 ${isSelected ? 'scale-110' : ''}`}>
                              <SlotIcon size={20} strokeWidth={2.5} className={styles.iconColor} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className={`text-sm font-bold ${isActive ? (isDarkMode ? 'text-white' : 'text-gray-900') : (isDarkMode ? 'text-gray-500' : 'text-gray-400')}`}>
                                  {slotName}
                                </p>
                                {isActive && (
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                    isDarkMode
                                      ? 'bg-green-500/30 text-green-200 border border-green-500/50'
                                      : 'bg-green-100 text-green-700 border border-green-300'
                                  }`}>
                                    Hoạt động
                                  </span>
                                )}
                              </div>
                              {slot && (
                                <div className="flex items-center gap-1.5">
                                  <Clock size={12} strokeWidth={2} className={styles.timeColor} />
                                  <p className={`text-xs font-semibold ${styles.timeColor}`}>
                                    {slot.startTime} - {slot.endTime}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                          {isSelected && isActive && (
                            <div className={`w-2.5 h-2.5 rounded-full ${
                              slotKey === 'morning'
                                ? isDarkMode ? 'bg-yellow-400' : 'bg-yellow-500'
                                : slotKey === 'afternoon'
                                ? isDarkMode ? 'bg-orange-400' : 'bg-orange-500'
                                : isDarkMode ? 'bg-blue-400' : 'bg-blue-500'
                            } animate-pulse shadow-lg`} title="Đang được chọn"></div>
                          )}
                        </div>

                        {/* Slot Content - Enhanced */}
                        {isActive && slot ? (
                          <div className={`space-y-3 pt-3 border-t flex-1 flex flex-col ${isDarkMode ? 'border-gray-700/50' : 'border-gray-200'}`}>
                            {/* Activity Description - Always show */}
                            <div className={`p-2.5 rounded-lg min-h-[80px] flex flex-col ${
                              isDarkMode ? 'border border-gray-700' : 'border border-gray-200'
                            }`}>
                              <label className={`block mb-1.5 text-[11px] font-bold uppercase tracking-wide flex items-center gap-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                <BookOpen size={11} strokeWidth={2} />
                                <span>Mô tả hoạt động</span>
                              </label>
                              <p className={`text-xs leading-relaxed flex-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                {slot.activities || <span className="italic opacity-60">Chưa cập nhật</span>}
                              </p>
                            </div>

                            {/* Detailed Location - Always show */}
                            <div className={`p-2.5 rounded-lg min-h-[60px] flex flex-col ${
                              isDarkMode ? 'border border-gray-700' : 'border border-gray-200'
                            }`}>
                              <label className={`block mb-1.5 text-[11px] font-bold uppercase tracking-wide flex items-center gap-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                <FileText size={11} strokeWidth={2} />
                                <span>Địa điểm chi tiết</span>
                              </label>
                              <p className={`text-xs leading-relaxed flex-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                {(slot.detailedLocation || dayData.dayDetailedLocation) || <span className="italic opacity-60">Chưa cập nhật</span>}
                              </p>
                            </div>

                            {/* Map Location - Always show */}
                            <div className="flex-1 flex flex-col">
                              <label className={`block mb-2 text-[11px] font-bold uppercase tracking-wide flex items-center gap-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                <Globe size={11} strokeWidth={2} />
                                <span>Địa điểm trên bản đồ</span>
                              </label>
                              {hasLocation ? (
                                <button
                                  onClick={() => {
                                    setSelectedDaySlot({ day: dayData.day, slot: slotKey as 'morning' | 'afternoon' | 'evening' });
                                    setTimeout(() => {
                                      const mapSection = document.getElementById('map-section');
                                      if (mapSection) {
                                        mapSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                      }
                                    }, 100);
                                  }}
                                  className={`w-full rounded-lg border-2 px-3 py-2.5 text-left transition-all duration-300 ${
                                    isSelected
                                      ? isDarkMode
                                        ? 'border-blue-500 bg-blue-500/10 text-blue-200'
                                        : 'border-blue-400 bg-blue-50 text-blue-800'
                                      : isDarkMode
                                        ? 'border-gray-600 text-gray-300 hover:border-gray-500'
                                        : 'border-gray-300 text-gray-700 hover:border-gray-400'
                                  }`}
                                >
                                  <div className="flex items-start gap-2">
                                    <MapPin size={14} strokeWidth={2.5} className="mt-0.5 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <p className={`font-semibold text-xs mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                        {location.address}
                                      </p>
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`text-[10px] font-mono ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                          {location.lat?.toFixed(5)}, {location.lng?.toFixed(5)}
                                        </span>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                                          isDarkMode
                                            ? 'bg-gray-700/50 text-gray-300'
                                            : 'bg-gray-200 text-gray-700'
                                        }`}>
                                          {location.radius || 200}m
                                        </span>
                                      </div>
                                    </div>
                                    {isSelected && (
                                      <div className={`w-1.5 h-1.5 rounded-full ${
                                        slotKey === 'morning'
                                          ? isDarkMode ? 'bg-yellow-400' : 'bg-yellow-500'
                                          : slotKey === 'afternoon'
                                          ? isDarkMode ? 'bg-orange-400' : 'bg-orange-500'
                                          : isDarkMode ? 'bg-blue-400' : 'bg-blue-500'
                                      } animate-pulse`}></div>
                                    )}
                                  </div>
                                </button>
                              ) : (
                                <div className={`w-full rounded-lg border-2 border-dashed px-3 py-2.5 min-h-[60px] flex items-center ${
                                  isDarkMode ? 'border-gray-600' : 'border-gray-300'
                                }`}>
                                  <p className={`text-xs italic ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                    Chưa có địa điểm trên bản đồ
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          /* Empty State - Enhanced */
                          <div className={`text-center py-8 rounded-lg flex-1 flex flex-col items-center justify-center ${
                            isDarkMode ? 'border border-gray-700' : 'border border-gray-200'
                          }`}>
                            <div className={`w-10 h-10 mx-auto mb-2 rounded-full flex items-center justify-center ${
                              isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                            }`}>
                              <XCircle size={18} className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} strokeWidth={2} />
                            </div>
                            <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                              Buổi này chưa được kích hoạt
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* Info Message */}
            {selectedDaySlot && (
              <div className={`mt-3 p-2 rounded-lg border ${isDarkMode ? 'border-blue-500/30' : 'border-blue-400/50'}`}>
                <div className="flex items-center gap-2">
                  <AlertCircle size={14} className="text-blue-500" />
                  <p className={`text-xs font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                    Đang hiển thị địa điểm cho {selectedDaySlot.slot === 'morning' ? 'Buổi Sáng' : selectedDaySlot.slot === 'afternoon' ? 'Buổi Chiều' : 'Buổi Tối'} - Ngày {selectedDaySlot.day} trên bản đồ
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Combined Time Slots and Locations Section - For Single Day */}
        {activity.type === 'single_day' && activity.timeSlots && activity.timeSlots.length > 0 && (
          <div className={`mb-4 p-3 rounded-lg border-2 ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
            <div className="flex items-center gap-2 mb-4">
              <Clock size={18} className="text-orange-500" />
              <h2 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Lịch trình hoạt động và Địa điểm
              </h2>
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
                        Icon: Sunrise,
                        iconColor: 'text-yellow-500',
                        borderColor: isSelected ? (isDarkMode ? 'border-yellow-500' : 'border-yellow-400') : (isDarkMode ? 'border-gray-600' : 'border-gray-300'),
                      };
                    case 'Buổi Chiều':
                      return {
                        Icon: Sun,
                        iconColor: 'text-orange-500',
                        borderColor: isSelected ? (isDarkMode ? 'border-orange-500' : 'border-orange-400') : (isDarkMode ? 'border-gray-600' : 'border-gray-300'),
                      };
                    case 'Buổi Tối':
                      return {
                        Icon: Moon,
                        iconColor: 'text-blue-500',
                        borderColor: isSelected ? (isDarkMode ? 'border-blue-500' : 'border-blue-400') : (isDarkMode ? 'border-gray-600' : 'border-gray-300'),
                      };
                    default:
                      return {
                        Icon: Clock,
                        iconColor: 'text-gray-500',
                        borderColor: isDarkMode ? 'border-gray-600' : 'border-gray-300',
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

                const slotDetailedText = (() => {
                  if (!slot?.detailedLocation) return '';
                  if (typeof slot.detailedLocation === 'string') return slot.detailedLocation;
                  return (
                    slot.detailedLocation?.[slotMapName] ||
                    slot.detailedLocation?.default ||
                    slot.detailedLocation?.general ||
                    ''
                  );
                })();

                const hasActivities = Boolean(slot?.activities?.trim());
                const hasDetailedLocation = Boolean(slotDetailedText?.trim());
                const hasLocation = Boolean(location);

                return (
                  <div
                    key={slotName}
                    className={`rounded-lg border-2 transition-all duration-300 ${
                      isActive
                        ? `${config.borderColor}`
                        : isDarkMode
                        ? 'border-gray-600 opacity-60'
                        : 'border-gray-300 opacity-60'
                    }`}
                  >
                    {/* Header */}
                    <div className={`p-2 border-b ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                      <div className="flex items-start gap-2">
                        <config.Icon size={18} className={`${config.iconColor} mt-0.5`} />
                        <div className="flex-1">
                          <h3 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {slotName}
                          </h3>
                          <p className={`text-[11px] font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {isActive ? 'Đang hoạt động' : 'Không hoạt động'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-3 space-y-2 text-left">
                      {/* Time */}
                      <div>
                        <p className={`text-[10px] uppercase tracking-wide font-semibold mb-0.5 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                          Thời gian
                        </p>
                        <p className={`text-xs font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                          {slot?.startTime || '--:--'} - {slot?.endTime || '--:--'}
                        </p>
                      </div>

                      {/* Activity Description */}
                      <div className={`pt-2 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                        <p className={`text-[10px] font-semibold mb-1 uppercase tracking-wide ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Mô tả hoạt động
                        </p>
                        <p className={`text-[11px] leading-relaxed ${hasActivities ? (isDarkMode ? 'text-gray-300' : 'text-gray-700') : 'italic text-gray-500'}`}>
                          {hasActivities ? slot?.activities : 'Chưa cập nhật'}
                        </p>
                      </div>

                      <div className={`pt-2 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                        <p className={`text-[10px] font-semibold mb-1 uppercase tracking-wide ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Địa điểm chi tiết
                        </p>
                        <p className={`text-[11px] leading-relaxed ${hasDetailedLocation ? (isDarkMode ? 'text-gray-300' : 'text-gray-700') : 'italic text-gray-500'}`}>
                          {hasDetailedLocation ? slotDetailedText : 'Chưa cập nhật'}
                        </p>
                      </div>

                      {/* Location Information - Địa điểm riêng cho mỗi buổi (nếu có multiTimeLocation) */}
                      {activity.isMultiTimeLocation && isActive && (
                        <div className={`pt-2 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                          <div className="mb-2 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                            <MapPin size={10} />
                            Địa điểm riêng
                          </div>
                          {hasLocation ? (
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
                              className={`w-full p-2 rounded text-left transition-all duration-300 border ${
                                isSelected
                                  ? isDarkMode
                                    ? 'border-blue-500'
                                    : 'border-blue-400'
                                  : isDarkMode
                                    ? 'border-gray-600 hover:border-gray-500'
                                    : 'border-gray-300 hover:border-gray-400'
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <MapPin size={12} className="text-red-500 mt-0.5" />
                                <div>
                                  <p className={`text-xs font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                    {location?.address || 'Không có địa chỉ'}
                                  </p>
                                  {location?.radius && (
                                    <p className={`text-[10px] mt-0.5 flex items-center gap-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                      <Target size={10} />
                                      {location.radius}m
                                    </p>
                                  )}
                                </div>
                              </div>
                            </button>
                          ) : (
                            <div className={`w-full p-2 rounded border-2 border-dashed ${isDarkMode ? 'border-gray-600 text-gray-500' : 'border-gray-300 text-gray-500'} text-sm italic`}>
                              Chưa có địa điểm riêng
                            </div>
                          )}
                        </div>
                      )}

                      {/* Single Location Information - Địa điểm chung cho tất cả các buổi */}
                      {!activity.isMultiTimeLocation && activity.locationData && isActive && (
                        <div className={`pt-2 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                          <div className="mb-2 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                            <MapPin size={10} />
                            Hoạt động diễn ra cùng 1 địa điểm
                          </div>
                          <div className={`w-full p-2 rounded border ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                            <div className="flex items-start gap-2">
                              <MapPin size={12} className="text-red-500 mt-0.5" />
                              <div>
                                <p className={`text-xs font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {activity.locationData.address || activity.location || 'Không có địa chỉ'}
                                </p>
                                {activity.locationData.radius && (
                                  <p className={`text-[10px] mt-0.5 flex items-center gap-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                    <Target size={10} />
                                    {activity.locationData.radius}m
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

            {/* Thông báo địa điểm chung (nằm phía dưới các card) */}
            {!activity.isMultiTimeLocation && activity.locationData && (
              <div className={`mt-3 flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold ${
                isDarkMode ? 'text-green-200' : 'text-green-700'
              }`}>
                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${
                  isDarkMode ? 'bg-green-500/30 text-green-200' : 'bg-green-100 text-green-600'
                }`}>
                  <MapPin size={14} strokeWidth={2} />
                </span>
                <span>Hoạt động diễn ra cùng 1 địa điểm</span>
              </div>
            )}

            {selectedTimeSlot && activity.isMultiTimeLocation && activity.multiTimeLocations && activity.multiTimeLocations.length > 1 && (
              <div className={`mt-3 p-2 rounded border ${isDarkMode ? 'border-blue-500/50' : 'border-blue-400/50'}`}>
                <div className="flex items-center space-x-2">
                  <AlertCircle size={14} className="text-blue-500" />
                  <p className={`text-xs font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                    Đang hiển thị địa điểm cho {selectedTimeSlot === 'morning' ? 'Buổi Sáng' : selectedTimeSlot === 'afternoon' ? 'Buổi Chiều' : 'Buổi Tối'} trên bản đồ
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Map Section */}
        <div id="map-section" className={`mb-3 rounded-xl border-2 p-3 ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-red-500/20' : 'bg-red-50'}`}>
                <MapPin size={18} className="text-red-500" />
              </div>
              <h2 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Vị trí hoạt động trên bản đồ
              </h2>
            </div>
            {(selectedTimeSlot || selectedDaySlot) && (
              <button
                onClick={() => {
                  setSelectedTimeSlot(null);
                  setSelectedDaySlot(null);
                }}
                className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                  isDarkMode
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                Xem tất cả
              </button>
            )}
          </div>

          {/* Map Rendering - Chỉ hiển thị 1 map tại một thời điểm */}
          {(() => {
            // Multiple Days Activity Map
            if (activity.type === 'multiple_days' && parsedScheduleData.length > 0) {
              // If a specific day/slot is selected
              if (selectedDaySlot) {
                const dayData = parsedScheduleData.find(d => d.day === selectedDaySlot.day);
                if (dayData) {
                  const slot = dayData.slots.find(s => s.slotKey === selectedDaySlot.slot);
                  const location = slot?.mapLocation || dayData.dayMapLocation;

                  if (location && location.lat && location.lng) {
                    return (
                      <ReadOnlyMultiTimeLocationViewer
                        key={`multiple-days-selected-${selectedDaySlot.day}-${selectedDaySlot.slot}-${locationPickerKey}`}
                        initialLocations={[{
                          id: `selected-${selectedDaySlot.day}-${selectedDaySlot.slot}`,
                          timeSlot: selectedDaySlot.slot,
                          location: {
                            lat: location.lat,
                            lng: location.lng,
                            address: location.address || `Ngày ${selectedDaySlot.day} - ${selectedDaySlot.slot === 'morning' ? 'Buổi Sáng' : selectedDaySlot.slot === 'afternoon' ? 'Buổi Chiều' : 'Buổi Tối'}`
                          },
                          radius: location.radius
                        }]}
                        isDarkMode={isDarkMode}
                      />
                    );
                  } else {
                    // Hiển thị thông báo khi không có địa điểm
                    const slotName = selectedDaySlot.slot === 'morning' ? 'Buổi Sáng' : selectedDaySlot.slot === 'afternoon' ? 'Buổi Chiều' : 'Buổi Tối';
                    return (
                      <div className={`text-center py-8 rounded-lg border-2 ${isDarkMode ? 'border-gray-600 bg-gray-800/50' : 'border-gray-300 bg-gray-50'}`}>
                        <MapPin size={32} className={`mx-auto mb-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Chưa có thông tin địa điểm
                        </p>
                        <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                          {slotName} - Ngày {selectedDaySlot.day}
                        </p>
                      </div>
                    );
                  }
                }
              }

              // Show all locations for multiple days
              const allLocations: Array<{
                id: string;
                timeSlot: 'morning' | 'afternoon' | 'evening';
                location: { lat: number; lng: number; address: string };
                radius?: number;
              }> = [];

              parsedScheduleData.forEach((dayData) => {
                dayData.slots.forEach((slot) => {
                  const location = slot.mapLocation || dayData.dayMapLocation;
                  if (location && location.lat && location.lng) {
                    allLocations.push({
                      id: `day-${dayData.day}-${slot.slotKey}`,
                      timeSlot: slot.slotKey,
                      location: {
                        lat: location.lat,
                        lng: location.lng,
                        address: location.address || `Ngày ${dayData.day} - ${slot.name}`
                      },
                      radius: location.radius
                    });
                  }
                });

                // Also add day location if no slot locations
                if (dayData.dayMapLocation && dayData.dayMapLocation.lat && dayData.dayMapLocation.lng && dayData.slots.length === 0) {
                  allLocations.push({
                    id: `day-${dayData.day}-all`,
                    timeSlot: 'morning', // default
                    location: {
                      lat: dayData.dayMapLocation.lat,
                      lng: dayData.dayMapLocation.lng,
                      address: dayData.dayMapLocation.address || `Ngày ${dayData.day}`
                    },
                    radius: dayData.dayMapLocation.radius
                  });
                }
              });

              if (allLocations.length > 0) {
                return (
                  <ReadOnlyMultiTimeLocationViewer
                    key={`multiple-days-all-${locationPickerKey}`}
                    initialLocations={allLocations}
                    isDarkMode={isDarkMode}
                  />
                );
              }

              return (
                <div className={`text-center py-16 rounded-xl border-2 border-dashed ${isDarkMode ? 'border-gray-600 bg-gray-700/30' : 'border-gray-300 bg-gray-50/50'}`}>
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    <MapPin className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className={`text-lg font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Chưa có dữ liệu vị trí bản đồ
                  </p>
                  <p className={`text-sm mt-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    Nhấn vào một buổi trong lịch trình để xem địa điểm
                  </p>
                </div>
              );
            }

            // Single Day Activity Map - Multi Time Location
            if (activity.type === 'single_day' && activity.isMultiTimeLocation) {
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
            }

            // Single Day Activity Map - Single Location
            if (activity.type === 'single_day' && !activity.isMultiTimeLocation && activity.locationData) {
              return (
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
              );
            }

            // No location data
            return (
              <div key="no-location-data" className={`text-center py-16 rounded-xl border-2 border-dashed ${isDarkMode ? 'border-gray-600 bg-gray-700/30' : 'border-gray-300 bg-gray-50/50'}`}>
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className={`text-lg font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Không có dữ liệu vị trí bản đồ</p>
                <p className={`text-sm mt-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Vui lòng kiểm tra lại thông tin hoạt động</p>
              </div>
            );
          })()}
        </div>

        {/* Success/Error Messages */}
        {(successMessage || error) && (
          <div className="mb-6">
            {successMessage && (
              <div className={`p-2 rounded-lg border ${isDarkMode ? 'bg-green-500/10 border-green-500/30 text-green-300' : 'bg-green-50 border-green-200 text-green-700'}`}>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} />
                  <p className="text-xs font-medium flex-1">{successMessage}</p>
                  <button
                    onClick={() => setSuccessMessage(null)}
                    className={`w-4 h-4 rounded flex items-center justify-center transition-all ${
                      isDarkMode ? 'hover:bg-green-500/20' : 'hover:bg-green-100'
                    }`}
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className={`p-2 rounded-lg border ${isDarkMode ? 'bg-red-500/10 border-red-500/30 text-red-300' : 'bg-red-50 border-red-200 text-red-700'}`}>
                <div className="flex items-center gap-2">
                  <AlertCircle size={14} />
                  <p className="text-xs font-medium flex-1">{error}</p>
                  <button
                    onClick={() => setError(null)}
                    className={`w-4 h-4 rounded flex items-center justify-center transition-all ${
                      isDarkMode ? 'hover:bg-red-500/20' : 'hover:bg-red-100'
                    }`}
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </main>
      <Footer />
    </div>
  );
}
