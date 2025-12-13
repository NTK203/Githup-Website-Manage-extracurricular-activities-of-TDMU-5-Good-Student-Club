'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Calendar, Clock, MapPin, Users, User, BookOpen, Target, FileText, CheckCircle2, XCircle, AlertCircle, Sunrise, Sun, Moon, ArrowLeft, Eye, UserPlus, UserMinus, ClipboardCheck, X, Loader2, StickyNote, ChevronLeft, ChevronRight, CalendarRange, Globe } from 'lucide-react';
import StudentNav from '@/components/student/StudentNav';
import Footer from '@/components/common/Footer';
import RegistrationModal from '@/components/student/RegistrationModal';
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
  maxParticipants?: number;
  registrationThreshold?: number; // Phần trăm tối thiểu để đăng ký (mặc định 80)
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
  const [approvalStatus, setApprovalStatus] = useState<'pending' | 'approved' | 'rejected' | 'removed' | undefined>(undefined);
  const [rejectionReason, setRejectionReason] = useState<string | undefined>(undefined);
  const [rejectedAt, setRejectedAt] = useState<string | undefined>(undefined);
  const [removedAt, setRemovedAt] = useState<string | undefined>(undefined);
  const [removedBy, setRemovedBy] = useState<string | { _id: string; name: string; email: string } | undefined>(undefined);
  const [removalReason, setRemovalReason] = useState<string | undefined>(undefined);
  const [checkedIn, setCheckedIn] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [locationPickerKey, setLocationPickerKey] = useState(0);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<'morning' | 'afternoon' | 'evening' | null>(null);
  const [selectedDaySlot, setSelectedDaySlot] = useState<{ day: number; slot: 'morning' | 'afternoon' | 'evening' } | null>(null);
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0); // Index của tuần hiện tại đang xem
  const [selectedDaySlotsForRegistration, setSelectedDaySlotsForRegistration] = useState<Array<{ day: number; slot: 'morning' | 'afternoon' | 'evening' }>>([]);
  const [userRegisteredDaySlots, setUserRegisteredDaySlots] = useState<Array<{ day: number; slot: 'morning' | 'afternoon' | 'evening' }>>([]);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
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
          registeredParticipantsCount: rawActivity.participants?.filter((p: any) => {
            const approvalStatus = p.approvalStatus || 'pending';
            return approvalStatus === 'approved';
          }).length || 0,
          maxParticipants: rawActivity.maxParticipants,
          registrationThreshold: rawActivity.registrationThreshold !== undefined && rawActivity.registrationThreshold !== null ? rawActivity.registrationThreshold : 80,
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
                
                // Extract activities description - more precise pattern
                // Pattern: "Buổi Sáng (07:00-11:30) - mô tả hoạt động - Địa điểm..."
                const timePattern = /\(\d{2}:\d{2}-\d{2}:\d{2}\)/;
                const timeMatch = trimmed.match(timePattern);
                let activities: string | undefined = undefined;
                if (timeMatch) {
                  const afterTime = trimmed.substring(trimmed.indexOf(timeMatch[0]) + timeMatch[0].length);
                  const activitiesMatch = afterTime.match(/-\s*([^-]*?)(?:\s*-\s*Địa điểm|$)/);
                  if (activitiesMatch && activitiesMatch[1]) {
                    const extracted = activitiesMatch[1].trim();
                    // Only set if it's not empty and doesn't look like it's part of location info
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
          setRejectionReason(userParticipant.rejectionReason);
          setRejectedAt(userParticipant.rejectedAt);
          setRemovedAt(userParticipant.removedAt);
          setRemovedBy(userParticipant.removedBy);
          setRemovalReason(userParticipant.removalReason);
          setCheckedIn(userParticipant.checkedIn || false);
          
          // Store registeredDaySlots if available
          if (userParticipant.registeredDaySlots && Array.isArray(userParticipant.registeredDaySlots)) {
            setUserRegisteredDaySlots(userParticipant.registeredDaySlots);
          } else {
            setUserRegisteredDaySlots([]);
          }
        } else {
          setIsRegistered(false);
          setApprovalStatus(undefined);
          setRejectionReason(undefined);
          setRejectedAt(undefined);
          setRemovedAt(undefined);
          setRemovedBy(undefined);
          setRemovalReason(undefined);
          setCheckedIn(false);
          setUserRegisteredDaySlots([]);
        }
        
        // Load attendance records if user is registered and approved (fetch song song để tối ưu)
        if (userParticipant && userParticipant.approvalStatus === 'approved') {
          // Fetch trong background, không block UI
          loadAttendanceRecords().catch(err => {
            console.error('Error loading attendance records:', err);
          });
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

  // Helper function to get registration threshold (default 80 if not set)
  const getRegistrationThreshold = useCallback((): number => {
    if (!activity) return 80;
    return activity.registrationThreshold !== undefined && activity.registrationThreshold !== null ? activity.registrationThreshold : 80;
  }, [activity]);

  // Calculate registration rate for a specific day and slot
  const calculateRegistrationRate = useCallback((day: number, slot: 'morning' | 'afternoon' | 'evening'): number => {
    if (!activity) {
      return 0;
    }

    // If maxParticipants is not set or is 0, we can't calculate a meaningful rate
    // Return 0% to indicate no limit (or show as 0% until maxParticipants is set)
    if (!activity.maxParticipants || activity.maxParticipants === 0 || activity.maxParticipants === Infinity) {
      return 0;
    }

    // Count participants registered for this specific day and slot
    // For multiple_days activities, count participants who registered for this specific day/slot
    // For single_day activities, count all participants
    // Only count approved participants
    let registeredCount = 0;
    
    if (!activity.participants || activity.participants.length === 0) {
      return 0;
    }
    
    if (activity.type === 'multiple_days') {
      // Count participants who have registered for this specific day and slot
      // Only count approved participants
      registeredCount = activity.participants.filter((p: any) => {
        const approvalStatus = p.approvalStatus || 'pending';
        // Only count approved participants
        if (approvalStatus !== 'approved') {
          return false;
        }
        
        // Check if participant has registeredDaySlots and includes this day/slot
        if (p.registeredDaySlots && Array.isArray(p.registeredDaySlots) && p.registeredDaySlots.length > 0) {
          return p.registeredDaySlots.some((ds: any) => ds.day === day && ds.slot === slot);
        }
        // If no registeredDaySlots, assume they registered for all slots (backward compatibility)
        // This handles old registrations that didn't specify day/slot
        // For new system, we should count them for all days/slots
        return true;
      }).length;
    } else {
      // For single_day activities, count only approved participants
      registeredCount = activity.participants.filter((p: any) => {
        const approvalStatus = p.approvalStatus || 'pending';
        return approvalStatus === 'approved';
      }).length;
    }

    const rate = (registeredCount / activity.maxParticipants) * 100;
    return Math.round(rate);
  }, [activity]);

  // Check if registration is allowed (rate < registrationThreshold and not full)
  const canRegister = useCallback((day: number, slot: 'morning' | 'afternoon' | 'evening'): boolean => {
    if (!activity) return false;
    
    // Check if activity has maxParticipants limit
    if (activity.maxParticipants && activity.maxParticipants !== Infinity) {
      // Count approved participants for this specific day and slot
      let approvedCount = 0;
      
      if (activity.type === 'multiple_days') {
        approvedCount = activity.participants?.filter((p: any) => {
          const approvalStatus = p.approvalStatus || 'pending';
          if (approvalStatus !== 'approved') return false;
          
          if (p.registeredDaySlots && Array.isArray(p.registeredDaySlots) && p.registeredDaySlots.length > 0) {
            return p.registeredDaySlots.some((ds: any) => ds.day === day && ds.slot === slot);
          }
          return true; // If no registeredDaySlots, assume registered for all
        }).length || 0;
      } else {
        approvedCount = activity.participants?.filter((p: any) => {
          const approvalStatus = p.approvalStatus || 'pending';
          return approvalStatus === 'approved';
        }).length || 0;
      }
      
      // If already full, cannot register
      if (approvedCount >= activity.maxParticipants) {
        return false;
      }
    }
    
    // Check registration rate threshold
    const rate = calculateRegistrationRate(day, slot);
    const threshold = getRegistrationThreshold();
    return rate < threshold;
  }, [calculateRegistrationRate, activity, getRegistrationThreshold]);

  const handleRegisterToggle = async () => {
    if (!isAuthenticated || !token || !activity || !user) {
      alert("Bạn cần đăng nhập để đăng ký hoặc hủy đăng ký hoạt động.");
      return;
    }

    // Check if activity has ended or is ongoing - don't allow registration if it has
    const timeStatus = getActivityTimeStatus();
    if (!isRegistered && (timeStatus === 'after' || timeStatus === 'during')) {
      if (timeStatus === 'after') {
        alert("Hoạt động này đã kết thúc. Bạn không thể đăng ký tham gia.");
      } else {
        alert("Hoạt động này đang diễn ra. Bạn không thể đăng ký tham gia.");
      }
      return;
    }

    // If unregistering, proceed directly
    if (isRegistered) {
    setIsRegistering(true);
    setError(null);

    try {
      const url = `/api/activities/${activity._id}/register`;
        const response = await fetch(url, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ userId: user._id }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to unregister from activity');
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
              maxParticipants: rawUpdatedActivity.maxParticipants,
              registrationThreshold: rawUpdatedActivity.registrationThreshold !== undefined && rawUpdatedActivity.registrationThreshold !== null ? rawUpdatedActivity.registrationThreshold : 80,
              organizer: rawUpdatedActivity.responsiblePerson?.name || rawUpdatedActivity.participants?.find((p: { role: string; }) => p.role === 'Trưởng Nhóm')?.name || rawUpdatedActivity.participants?.[0]?.name || 'N/A',
              participants: rawUpdatedActivity.participants || [],
              locationData: rawUpdatedActivity.locationData,
              multiTimeLocations: rawUpdatedActivity.multiTimeLocations?.map((mtl: any) => {
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
              setRejectionReason(userParticipant.rejectionReason);
              setRejectedAt(userParticipant.rejectedAt);
              setRemovedAt(userParticipant.removedAt);
              setRemovedBy(userParticipant.removedBy);
              setRemovalReason(userParticipant.removalReason);
              setCheckedIn(userParticipant.checkedIn || false);
              
              // Store registeredDaySlots if available
              if (userParticipant.registeredDaySlots && Array.isArray(userParticipant.registeredDaySlots)) {
                setUserRegisteredDaySlots(userParticipant.registeredDaySlots);
              } else {
                setUserRegisteredDaySlots([]);
              }
            } else {
              setIsRegistered(false);
              setApprovalStatus(undefined);
              setRejectionReason(undefined);
              setRejectedAt(undefined);
              setRemovedAt(undefined);
              setRemovedBy(undefined);
              setRemovalReason(undefined);
              setCheckedIn(false);
              setUserRegisteredDaySlots([]);
            }
          }
        }

        setSuccessMessage(result.message);
        setTimeout(() => setSuccessMessage(null), 3000);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
      } finally {
        setIsRegistering(false);
      }
      return;
    }

    // If registering for multiple_days activity, show modal to select days/slots
    if (activity.type === 'multiple_days' && activity.schedule && activity.schedule.length > 0) {
      setShowRegistrationModal(true);
      setSelectedDaySlotsForRegistration([]);
      return;
    }

    // For single_day activities, show modal to select slots and check overlap
    if (activity.type === 'single_day' && activity.timeSlots && activity.timeSlots.length > 0) {
      const activeSlots = activity.timeSlots.filter((slot: any) => slot.isActive);
      if (activeSlots.length > 0) {
        setShowSingleDayRegistrationModal(true);
        setSelectedSingleDaySlots([]);
        return;
      }
    }

    // For single_day activities without slots or fallback, proceed with registration
    setIsRegistering(true);
    setError(null);

    try {
      const url = `/api/activities/${activity._id}/register`;
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
          daySlots: [] // Empty for single_day
        }),
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
            maxParticipants: rawUpdatedActivity.maxParticipants,
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
            setRejectionReason(userParticipant.rejectionReason);
            setRejectedAt(userParticipant.rejectedAt);
            setRemovedAt(userParticipant.removedAt);
            setRemovedBy(userParticipant.removedBy);
            setCheckedIn(userParticipant.checkedIn || false);
            
            // Store registeredDaySlots if available
            if (userParticipant.registeredDaySlots && Array.isArray(userParticipant.registeredDaySlots)) {
              setUserRegisteredDaySlots(userParticipant.registeredDaySlots);
              console.log('✅ Loaded user registeredDaySlots (handleRegisterWithDaySlots):', {
                registeredDaySlots: userParticipant.registeredDaySlots,
                length: userParticipant.registeredDaySlots.length,
                activityType: activity.type
              });
            } else {
              setUserRegisteredDaySlots([]);
              console.log('⚠️ No registeredDaySlots found (handleRegisterWithDaySlots):', {
                hasRegisteredDaySlots: !!userParticipant.registeredDaySlots,
                isArray: Array.isArray(userParticipant.registeredDaySlots),
                activityType: activity.type,
                userParticipantKeys: Object.keys(userParticipant)
              });
            }
            
            // Load attendance records if user is approved
            if (userParticipant.approvalStatus === 'approved') {
              await loadAttendanceRecords();
            } else {
              setAttendanceRecords([]);
            }
          } else {
            setIsRegistered(false);
            setApprovalStatus(undefined);
            setRejectionReason(undefined);
            setRejectedAt(undefined);
            setRemovedAt(undefined);
            setRemovedBy(undefined);
            setCheckedIn(false);
            setAttendanceRecords([]);
            setUserRegisteredDaySlots([]);
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

  // Calculate total registration rate based on selected slots (not participants)
  // Rate = number of selected slots / total available slots * 100
  const calculateTotalRegistrationRate = useCallback((): number => {
    if (!activity || selectedDaySlotsForRegistration.length === 0) {
      return 0;
    }

    if (activity.type === 'multiple_days' && parsedScheduleData.length > 0) {
      // Count total available slots across all days
      let totalAvailableSlots = 0;
      parsedScheduleData.forEach((dayData) => {
        // Count active slots for this day
        const activeSlots = dayData.slots.filter(s => s.slotKey).length;
        totalAvailableSlots += activeSlots;
      });

      if (totalAvailableSlots === 0) {
        return 0;
      }

      // Rate = selected slots / total available slots * 100
      const selectedSlotsCount = selectedDaySlotsForRegistration.length;
      const totalRate = (selectedSlotsCount / totalAvailableSlots) * 100;
      return Math.round(totalRate);
    }

    // For single_day activities, use maxParticipants logic
    if (!activity.maxParticipants || activity.maxParticipants === 0) {
      return 0;
    }

    // Count total unique participants across all selected day slots
    const uniqueParticipants = new Set<string>();
    
    selectedDaySlotsForRegistration.forEach(({ day, slot }) => {
      if (activity.participants && activity.participants.length > 0) {
        activity.participants.forEach((p: any) => {
          const approvalStatus = p.approvalStatus || 'pending';
          if (approvalStatus === 'rejected' || approvalStatus === 'removed') {
            return;
          }
          
          const participantId = typeof p.userId === 'object' && p.userId !== null
            ? (p.userId._id || p.userId.$oid || String(p.userId))
            : (p.userId?.$oid || p.userId || String(p.userId));
          
          // Check if participant has registered for this day/slot
          if (p.registeredDaySlots && Array.isArray(p.registeredDaySlots) && p.registeredDaySlots.length > 0) {
            if (p.registeredDaySlots.some((ds: any) => ds.day === day && ds.slot === slot)) {
              uniqueParticipants.add(participantId);
            }
          } else {
            // Backward compatibility: assume registered for all slots
            uniqueParticipants.add(participantId);
          }
        });
      }
    });

    const totalRegisteredCount = uniqueParticipants.size;
    const totalRate = (totalRegisteredCount / activity.maxParticipants) * 100;
    return Math.round(totalRate);
  }, [activity, selectedDaySlotsForRegistration, parsedScheduleData]);

  // Handle registration with selected day slots (also handles update if already registered)
  const handleRegisterWithDaySlots = async () => {
    if (!isAuthenticated || !token || !activity || !user) {
      alert("Bạn cần đăng nhập để đăng ký hoặc hủy đăng ký hoạt động.");
      return;
    }

    // Check if activity has ended or is ongoing - don't allow registration if it has
    const timeStatus = getActivityTimeStatus();
    if (!isRegistered && (timeStatus === 'after' || timeStatus === 'during')) {
      if (timeStatus === 'after') {
        alert("Hoạt động này đã kết thúc. Bạn không thể đăng ký tham gia.");
      } else {
        alert("Hoạt động này đang diễn ra. Bạn không thể đăng ký tham gia.");
      }
      return;
    }

    if (selectedDaySlotsForRegistration.length === 0) {
      alert("Vui lòng chọn ít nhất một ngày và buổi để đăng ký.");
      return;
    }

    // Check total registration rate for all selected slots
    // For multiple_days: rate = selected slots / total available slots
    // Must be >= registrationThreshold% to register
    const totalRate = calculateTotalRegistrationRate();
    const threshold = getRegistrationThreshold();
    if (totalRate < threshold) {
      alert(`Tổng tỷ lệ đăng ký của các buổi đã chọn là ${totalRate}%. Bạn phải chọn đủ buổi để tổng tỷ lệ đạt ít nhất ${threshold}% mới có thể đăng ký.`);
      return;
    }

    setIsRegistering(true);
    setError(null);

    try {
      const url = `/api/activities/${activity._id}/register`;
      // Use PATCH if already registered, POST if new registration
      const method = isRegistered ? 'PATCH' : 'POST';
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
          role: 'Người Tham Gia',
          daySlots: selectedDaySlotsForRegistration
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to register for activity');
      }

      const result = await response.json();
      alert(result.message);

      // Refresh activity data (same as handleRegisterToggle)
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
            maxParticipants: rawUpdatedActivity.maxParticipants,
            organizer: rawUpdatedActivity.responsiblePerson?.name || rawUpdatedActivity.participants?.find((p: { role: string; }) => p.role === 'Trưởng Nhóm')?.name || rawUpdatedActivity.participants?.[0]?.name || 'N/A',
            participants: rawUpdatedActivity.participants || [],
            locationData: rawUpdatedActivity.locationData,
            multiTimeLocations: rawUpdatedActivity.multiTimeLocations?.map((mtl: any) => {
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
            setRejectionReason(userParticipant.rejectionReason);
            setRejectedAt(userParticipant.rejectedAt);
            setRemovedAt(userParticipant.removedAt);
            setRemovedBy(userParticipant.removedBy);
            setRemovalReason(userParticipant.removalReason);
            setCheckedIn(userParticipant.checkedIn || false);
            
            // Store registeredDaySlots if available
            if (userParticipant.registeredDaySlots && Array.isArray(userParticipant.registeredDaySlots)) {
              setUserRegisteredDaySlots(userParticipant.registeredDaySlots);
              console.log('✅ Loaded user registeredDaySlots:', userParticipant.registeredDaySlots);
            } else {
              setUserRegisteredDaySlots([]);
            }
            
            if (userParticipant.approvalStatus === 'approved') {
              await loadAttendanceRecords();
            } else {
              setAttendanceRecords([]);
            }
          } else {
            setIsRegistered(false);
            setApprovalStatus(undefined);
            setRejectionReason(undefined);
            setRejectedAt(undefined);
            setRemovedAt(undefined);
            setRemovedBy(undefined);
            setRemovalReason(undefined);
            setCheckedIn(false);
            setAttendanceRecords([]);
            setUserRegisteredDaySlots([]);
          }
        }
      }

      setShowRegistrationModal(false);
      setSelectedDaySlotsForRegistration([]);
      setSuccessMessage(result.message);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setIsRegistering(false);
    }
  };

  // Toggle day slot selection for registration
  const toggleDaySlotSelection = async (day: number, slot: 'morning' | 'afternoon' | 'evening') => {
    const exists = selectedDaySlotsForRegistration.find(ds => ds.day === day && ds.slot === slot);
    
    if (exists) {
      setSelectedDaySlotsForRegistration(prev => prev.filter(ds => !(ds.day === day && ds.slot === slot)));
    } else {
      // Check if registration is allowed (rate < registrationThreshold)
      if (!canRegister(day, slot)) {
        if (!activity) return;
        const slotName = slot === 'morning' ? 'Sáng' : slot === 'afternoon' ? 'Chiều' : 'Tối';
        const threshold = getRegistrationThreshold();
        alert(`Tỷ lệ đăng ký cho ngày ${day}, buổi ${slotName} đã đạt ${calculateRegistrationRate(day, slot)}%. Chỉ có thể đăng ký khi tỷ lệ dưới ${threshold}%.`);
        return;
      }

      // Check for overlapping slots with other activities
      if (user && activity && activity._id) {
        try {
          const response = await fetch('/api/activities/check-slot-overlap', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              activityId: activity._id,
              day: day,
              slot: slot,
              schedule: activity.schedule
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
              currentActivityName: activity.name,
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

      setSelectedDaySlotsForRegistration(prev => [...prev, { day, slot }]);
    }
  };

  // Toggle slot selection for single_day activities
  const toggleSingleDaySlotSelection = async (slot: 'morning' | 'afternoon' | 'evening') => {
    const exists = selectedSingleDaySlots.includes(slot);
    
    if (exists) {
      setSelectedSingleDaySlots(prev => prev.filter(s => s !== slot));
    } else {
      // Check if registration is allowed (rate < registrationThreshold)
      if (!activity) return;
      
      // For single_day, we need to check if the slot can be registered
      // Check maxParticipants if exists
      if (activity.maxParticipants && activity.maxParticipants !== Infinity) {
        const approvedCount = activity.participants?.filter((p: any) => {
          const approvalStatus = p.approvalStatus || 'pending';
          return approvalStatus === 'approved';
        }).length || 0;
        
        if (approvedCount >= activity.maxParticipants) {
          alert('Hoạt động này đã đủ số lượng người tham gia.');
          return;
        }
      }

      // Check for overlapping slots with other activities
      if (user && activity && activity._id && activity.date) {
        try {
          // Convert slot to day number (use day 1 for single_day)
          const slotName = slot === 'morning' ? 'Buổi Sáng' : 
                          slot === 'afternoon' ? 'Buổi Chiều' : 'Buổi Tối';
          const timeSlot = activity.timeSlots?.find((ts: any) => ts.name === slotName && ts.isActive);
          
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
              activityId: activity._id,
              day: 1, // Use day 1 for single_day
              slot: slot,
              schedule: undefined, // No schedule for single_day
              date: activity.date // Pass the activity date
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
            const activityDate = new Date(activity.date);
            
            // Show beautiful warning modal instead of alert
            setOverlapWarning({
              show: true,
              overlappingActivities: result.overlappingActivities,
              day: 1,
              slot: slotName,
              date: activity.date,
              currentActivityName: activity.name,
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
    if (!isAuthenticated || !token || !activity || !user) {
      alert("Bạn cần đăng nhập để đăng ký hoặc hủy đăng ký hoạt động.");
      return;
    }

    // Check if activity has ended or is ongoing - don't allow registration if it has
    const timeStatus = getActivityTimeStatus();
    if (!isRegistered && (timeStatus === 'after' || timeStatus === 'during')) {
      if (timeStatus === 'after') {
        alert("Hoạt động này đã kết thúc. Bạn không thể đăng ký tham gia.");
      } else {
        alert("Hoạt động này đang diễn ra. Bạn không thể đăng ký tham gia.");
      }
      return;
    }

    if (selectedSingleDaySlots.length === 0) {
      alert("Vui lòng chọn ít nhất một buổi để đăng ký.");
      return;
    }

    // Check total registration rate for selected slots
    // For single_day: rate = selected slots / total available slots
    const activeSlots = activity.timeSlots?.filter((slot: any) => slot.isActive) || [];
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
    if (user && activity && activity._id && activity.date) {
      try {
        const overlapChecks = await Promise.all(
          selectedSingleDaySlots.map(async (slot) => {
            const slotName = slot === 'morning' ? 'Buổi Sáng' : 
                            slot === 'afternoon' ? 'Buổi Chiều' : 'Buổi Tối';
            const timeSlot = activity.timeSlots?.find((ts: any) => ts.name === slotName && ts.isActive);
            
            if (!timeSlot) return null;

            const response = await fetch('/api/activities/check-slot-overlap', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({
                activityId: activity._id,
                day: 1,
                slot: slot,
                schedule: undefined,
                date: activity.date
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
            date: activity.date,
            currentActivityName: activity.name,
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

    setIsRegistering(true);
    setError(null);

    try {
      // Convert selected slots to daySlots format (day = 1 for single_day)
      const daySlots = selectedSingleDaySlots.map(slot => ({
        day: 1,
        slot: slot
      }));

      // Use PATCH if already registered, POST if new registration
      const method = isRegistered ? 'PATCH' : 'POST';

      const url = `/api/activities/${activity._id}/register`;
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
          role: 'Người Tham Gia',
          daySlots: daySlots
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to register for activity');
      }

      const result = await response.json();
      alert(result.message);

      // Close modal
      setShowSingleDayRegistrationModal(false);
      setSelectedSingleDaySlots([]);

      // Reload activity data
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
            maxParticipants: rawUpdatedActivity.maxParticipants,
            registrationThreshold: rawUpdatedActivity.registrationThreshold !== undefined && rawUpdatedActivity.registrationThreshold !== null ? rawUpdatedActivity.registrationThreshold : 80,
            organizer: rawUpdatedActivity.responsiblePerson?.name || rawUpdatedActivity.participants?.find((p: { role: string; }) => p.role === 'Trưởng Nhóm')?.name || rawUpdatedActivity.participants?.[0]?.name || 'N/A',
            participants: rawUpdatedActivity.participants || [],
            locationData: rawUpdatedActivity.locationData,
            multiTimeLocations: rawUpdatedActivity.multiTimeLocations?.map((mtl: any) => {
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
            setRejectionReason(userParticipant.rejectionReason);
            setRejectedAt(userParticipant.rejectedAt);
            setRemovedAt(userParticipant.removedAt);
            setRemovedBy(userParticipant.removedBy);
            setCheckedIn(userParticipant.checkedIn || false);
            
            if (userParticipant.registeredDaySlots && Array.isArray(userParticipant.registeredDaySlots)) {
              setUserRegisteredDaySlots(userParticipant.registeredDaySlots);
            } else {
              setUserRegisteredDaySlots([]);
            }
            
            if (userParticipant.approvalStatus === 'approved') {
              await loadAttendanceRecords();
            } else {
              setAttendanceRecords([]);
            }
          } else {
            setIsRegistered(false);
            setApprovalStatus(undefined);
            setRejectionReason(undefined);
            setRejectedAt(undefined);
            setRemovedAt(undefined);
            setRemovedBy(undefined);
            setCheckedIn(false);
            setAttendanceRecords([]);
            setUserRegisteredDaySlots([]);
          }
          
          setLocationPickerKey(prev => prev + 1);

          if (isMultiTimeMode && updatedActivityDetails.multiTimeLocations && updatedActivityDetails.multiTimeLocations.length === 1) {
            setSelectedTimeSlot(updatedActivityDetails.multiTimeLocations[0].timeSlot);
          }
        }
      }

    } catch (err: unknown) {
      console.error('Error registering:', err);
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

  // Helper function to render status badge
  const renderStatusBadge = () => {
    if (!isAuthenticated || !isRegistered || !approvalStatus) return null;
    
    return (
      <div className="absolute top-2 right-2 z-10">
        {approvalStatus === 'approved' && (
          <div className={`px-2 py-0.5 rounded-full text-[8px] font-semibold flex items-center gap-1 shadow-lg ${
            isDarkMode 
              ? 'bg-green-600/90 text-white' 
              : 'bg-green-600 text-white'
          }`}>
            <CheckCircle2 size={9} />
            <span>Đã duyệt</span>
          </div>
        )}
        {approvalStatus === 'pending' && (
          <div className={`px-2 py-0.5 rounded-full text-[8px] font-semibold flex items-center gap-1 shadow-lg ${
            isDarkMode 
              ? 'bg-blue-600/90 text-white' 
              : 'bg-blue-600 text-white'
          }`}>
            <Clock size={9} />
            <span>Chờ duyệt</span>
          </div>
        )}
        {approvalStatus === 'rejected' && (
          <div className={`px-2 py-0.5 rounded-full text-[8px] font-semibold flex items-center gap-1 shadow-lg ${
            isDarkMode 
              ? 'bg-red-600/90 text-white' 
              : 'bg-red-600 text-white'
          }`}>
            <XCircle size={9} />
            <span>Từ chối</span>
          </div>
        )}
        {approvalStatus === 'removed' && (
          <div className={`px-2 py-0.5 rounded-full text-[8px] font-semibold flex items-center gap-1 shadow-lg ${
            isDarkMode 
              ? 'bg-orange-600/90 text-white' 
              : 'bg-orange-600 text-white'
          }`}>
            <UserMinus size={9} />
            <span>Đã xóa</span>
          </div>
        )}
      </div>
    );
  };

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
      <StudentNav key="student-nav" />
      <main className="flex-1 max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4 w-full">
        {/* Hero Section */}
        <div className={`mb-2 rounded-lg overflow-hidden border shadow-lg ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
          {activity.imageUrl && (
            <div className="relative h-48 sm:h-64 md:h-72 overflow-hidden group">
              <img
                src={activity.imageUrl}
                alt={activity.name}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                loading="eager"
                fetchPriority="high"
                decoding="async"
                style={{
                  imageRendering: 'crisp-edges',
                  WebkitBackfaceVisibility: 'hidden',
                  backfaceVisibility: 'hidden',
                  transform: 'translateZ(0)',
                  willChange: 'transform'
                }}
              />
              {/* Enhanced gradient overlay for better text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20"></div>
              {/* Subtle overlay pattern for depth */}
              <div className="absolute inset-0 opacity-30" style={{
                backgroundImage: 'radial-gradient(circle at 50% 50%, transparent 0%, rgba(0,0,0,0.3) 100%)'
              }}></div>
              {renderStatusBadge()}
              <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5 backdrop-blur-sm bg-gradient-to-t from-black/60 via-black/30 to-transparent">
                <h1 className={`text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2 drop-shadow-2xl leading-tight`}>
                  {activity.name}
                </h1>
                {activity.overview && (
                  <p className={`text-sm sm:text-base text-white/95 line-clamp-2 drop-shadow-lg leading-relaxed`}>
                    {activity.overview}
                  </p>
                )}
              </div>
            </div>
          )}
          {!activity.imageUrl && (
            <div className={`relative p-3 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
              {renderStatusBadge()}
              <h1 className={`text-lg sm:text-xl font-bold mb-1.5 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {activity.name}
              </h1>
              {activity.overview && (
                <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  {activity.overview}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Quick Action Buttons */}
        <div className="sticky top-0 z-20 mb-2 -mx-3 sm:mx-0 px-3 sm:px-0">
          <div className={`rounded-lg border p-0.5 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'}`}>
            <div className="flex flex-col sm:flex-row gap-0.5">
              {/* Attendance/Check-in Button */}
              {isAuthenticated && user && (() => {
                const timeStatus = getActivityTimeStatus();
                
                // Hiển thị button điểm danh khi đã đăng ký và được duyệt (không cần chờ đến ngày)
                if (isRegistered && approvalStatus === 'approved') {
                  if (timeStatus === 'after') {
                  return (
                    <button
                      onClick={() => router.push(`/student/attendance/${activityId}`)}
                        className={`flex-1 py-1 px-2 rounded text-[10px] font-medium transition-all flex items-center justify-center gap-1 ${
                        isDarkMode
                            ? 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white'
                            : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white'
                      }`}
                    >
                        <Eye size={11} />
                      <span>Xem điểm danh</span>
                    </button>
                  );
                }
                
                  return (
                    <button
                      onClick={handleCheckIn}
                      disabled={isCheckingIn}
                      className={`flex-1 py-1 px-2 rounded text-[10px] font-medium transition-all flex items-center justify-center gap-1 ${
                        isDarkMode
                          ? 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white'
                          : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white'
                      } ${isCheckingIn ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {isCheckingIn ? (
                        <>
                          <Loader2 className="w-2.5 h-2.5 animate-spin" />
                          <span>Đang xử lý...</span>
                        </>
                      ) : (
                        <>
                          {timeStatus === 'during' ? (
                            <>
                              <ClipboardCheck size={11} />
                          <span>Điểm danh</span>
                            </>
                          ) : (
                            <>
                              <Eye size={11} />
                              <span>Xem điểm danh</span>
                            </>
                          )}
                        </>
                      )}
                    </button>
                  );
                }
                
                return null;
              })()}

              {/* Register/Unregister Button */}
              {isAuthenticated && user && (
                <>
                  {!isRegistered && (() => {
                    const timeStatus = getActivityTimeStatus();
                    // Don't show register button if activity has ended or is currently ongoing
                    if (timeStatus === 'after' || timeStatus === 'during') {
                      return null;
                    }
                    
                    return (
                    <button
                      onClick={handleRegisterToggle}
                      disabled={isRegistering}
                        className={`flex-1 py-1 px-2 rounded text-[10px] font-medium transition-all flex items-center justify-center gap-1 ${
                        isDarkMode
                            ? 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white'
                            : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white'
                      } ${isRegistering ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {isRegistering ? (
                        <>
                            <Loader2 className="w-2.5 h-2.5 animate-spin" />
                          <span>Đang đăng ký...</span>
                        </>
                      ) : (
                        <>
                            <UserPlus size={11} />
                          <span>Đăng ký tham gia</span>
                        </>
                      )}
                    </button>
                    );
                  })()}
                  
                  {isRegistered && activity.type === 'multiple_days' && (
                    <button
                      onClick={() => {
                        setSelectedDaySlotsForRegistration([...userRegisteredDaySlots]);
                        setShowRegistrationModal(true);
                      }}
                      className={`flex-1 py-1 px-2 rounded text-[10px] font-medium transition-all flex items-center justify-center gap-1 ${
                        isDarkMode
                          ? 'bg-blue-600 hover:bg-blue-500 text-white'
                          : 'bg-blue-500 hover:bg-blue-600 text-white'
                      }`}
                    >
                      <Eye size={11} />
                      <span>Xem/Chỉnh sửa buổi đã đăng ký</span>
                    </button>
                  )}
                  
                  {isRegistered && activity.type === 'single_day' && (
                    <button
                      onClick={() => {
                        // Convert registeredDaySlots to selectedSingleDaySlots format
                        // Nếu có userRegisteredDaySlots, dùng nó; nếu không, để trống để user chọn lại
                        const slots = userRegisteredDaySlots.length > 0 
                          ? userRegisteredDaySlots.map(ds => ds.slot)
                          : [];
                        setSelectedSingleDaySlots(slots);
                        setShowSingleDayRegistrationModal(true);
                      }}
                      className={`flex-1 py-1 px-2 rounded text-[10px] font-medium transition-all flex items-center justify-center gap-1 ${
                        isDarkMode
                          ? 'bg-blue-600 hover:bg-blue-500 text-white'
                          : 'bg-blue-500 hover:bg-blue-600 text-white'
                      }`}
                    >
                      <Eye size={11} />
                      <span>Xem/Chỉnh sửa buổi đã đăng ký</span>
                    </button>
                  )}
                  
                  {isRegistered && approvalStatus === 'pending' && (
                    <button
                      onClick={handleRegisterToggle}
                      disabled={isRegistering}
                      className={`flex-1 py-1 px-2 rounded text-[10px] font-medium transition-all flex items-center justify-center gap-1 ${
                        isDarkMode
                          ? 'bg-red-600 hover:bg-red-500 text-white'
                          : 'bg-red-500 hover:bg-red-600 text-white'
                      } ${isRegistering ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {isRegistering ? (
                        <>
                          <Loader2 className="w-2.5 h-2.5 animate-spin" />
                          <span>Đang hủy...</span>
                        </>
                      ) : (
                        <>
                          <UserMinus size={11} />
                          <span>Hủy đăng ký</span>
                        </>
                      )}
                    </button>
                  )}
                </>
              )}
              
              <button
                onClick={() => window.history.back()}
                className={`py-1 px-2 rounded text-[10px] font-medium transition-all border flex items-center justify-center gap-1 ${
                  isDarkMode 
                    ? 'border-gray-600 text-gray-100 hover:bg-gray-700/50' 
                    : 'border-gray-300 text-gray-800 hover:bg-gray-50'
                }`}
              >
                <ArrowLeft size={11} />
                <span className="hidden sm:inline">Quay lại</span>
              </button>
            </div>
          </div>
        </div>

        {/* Rejection/Removal Reason Section */}
        {isAuthenticated && isRegistered && (
          <>
            {approvalStatus === 'rejected' && rejectionReason && (
              <div className={`mb-2 rounded-lg border p-2 ${isDarkMode ? 'border-red-700 bg-red-900/10' : 'border-red-300 bg-red-50'}`}>
                <div className="flex items-start gap-1.5">
                  <XCircle size={14} className={`mt-0.5 flex-shrink-0 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`} />
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-xs font-bold mb-0.5 ${isDarkMode ? 'text-red-300' : 'text-red-800'}`}>
                      Lý do từ chối
                    </h3>
                    <p className={`text-[10px] leading-relaxed ${isDarkMode ? 'text-red-200' : 'text-red-700'}`}>
                      {rejectionReason}
                    </p>
                    {rejectedAt && (
                      <p className={`text-[9px] mt-1 ${isDarkMode ? 'text-red-300/70' : 'text-red-600/70'}`}>
                        {new Date(rejectedAt).toLocaleString('vi-VN')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {approvalStatus === 'removed' && removalReason && (
              <div className={`mb-2 rounded-lg border p-2 ${isDarkMode ? 'border-orange-700 bg-orange-900/10' : 'border-orange-300 bg-orange-50'}`}>
                <div className="flex items-start gap-1.5">
                  <UserMinus size={14} className={`mt-0.5 flex-shrink-0 ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`} />
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-xs font-bold mb-0.5 ${isDarkMode ? 'text-orange-300' : 'text-orange-800'}`}>
                      Lý do xóa đăng ký
                    </h3>
                    <p className={`text-[10px] leading-relaxed ${isDarkMode ? 'text-orange-200' : 'text-orange-700'}`}>
                      {removalReason}
                    </p>
                    {removedAt && (
                      <p className={`text-[9px] mt-1 ${isDarkMode ? 'text-orange-300/70' : 'text-orange-600/70'}`}>
                        {new Date(removedAt).toLocaleString('vi-VN')}
                        {removedBy && (
                          <span> • {typeof removedBy === 'object' ? removedBy.name : removedBy}</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Main Info Cards Grid */}
        <div className={`mb-2 rounded-lg border p-2 ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
          <div className="flex flex-wrap gap-2">
            {/* Ngày diễn ra */}
            <div key="date-card" className={`flex-1 min-w-[120px] rounded-lg border ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
              <div className="p-2 flex flex-col items-center text-center h-full">
                <Calendar size={16} className="text-blue-500 mb-1" strokeWidth={2} />
                <p className={`text-[9px] font-medium mb-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {activity.type === 'multiple_days' ? 'Thời gian' : 'Ngày'}
                </p>
                <p className={`text-[10px] font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} line-clamp-2 leading-tight`}>
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
              <div key="single-location-card" className={`flex-1 min-w-[120px] rounded-lg border ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                <div className="p-2 flex flex-col items-center text-center h-full">
                  <MapPin size={16} className="text-red-500 mb-1" strokeWidth={2} />
                  <p className={`text-[9px] font-medium mb-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Địa điểm
                  </p>
                  <p className={`text-[10px] font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} line-clamp-2 leading-tight`}>
                    {activity.locationData?.address || activity.location || 'N/A'}
                  </p>
                </div>
              </div>
            )}

            {/* Số buổi / Số ngày */}
            {activity.numberOfSessions !== undefined && activity.numberOfSessions > 0 && (
              <div key="number-of-sessions-card" className={`flex-1 min-w-[120px] rounded-lg border ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                <div className="p-2 flex flex-col items-center text-center h-full">
                  <BookOpen size={16} className="text-purple-500 mb-1" strokeWidth={2} />
                  <p className={`text-[9px] font-medium mb-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {activity.type === 'multiple_days' ? 'Số ngày' : 'Số buổi'}
                  </p>
                  <p className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {activity.numberOfSessions}
                  </p>
                </div>
              </div>
            )}
            {/* Đã đăng ký */}
            {activity.registeredParticipantsCount !== undefined && (
              <div key="registered-count-card" className={`flex-1 min-w-[120px] rounded-lg border ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                <div className="p-2 flex flex-col items-center text-center h-full">
                  <Users size={16} className="text-green-500 mb-1" strokeWidth={2} />
                  <p className={`text-[9px] font-medium mb-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Đã đăng ký
                  </p>
                  <p className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {activity.registeredParticipantsCount}/{activity.maxParticipants || 0}
                  </p>
                </div>
              </div>
            )}

            {/* Trạng thái điểm danh */}
            {isRegistered && approvalStatus === 'approved' && (() => {
              const timeStatus = getActivityTimeStatus();
              
              if (timeStatus === 'before') {
                return (
                  <div key="attendance-status-card" className={`flex-1 min-w-[120px] rounded-lg border ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                    <div className="p-2 flex flex-col items-center text-center h-full">
                      <Clock size={16} className="text-amber-500 mb-1" strokeWidth={2} />
                      <p className={`text-[9px] font-medium mb-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Trạng thái
                      </p>
                      <p className={`text-[10px] font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} line-clamp-2 leading-tight`}>
                        Chưa đến ngày
                      </p>
                    </div>
                  </div>
                );
              }

              if (timeStatus === 'after') {
                return (
                  <div key="attendance-status-card" className={`flex-1 min-w-[120px] rounded-lg border ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                    <div className="p-2 flex flex-col items-center text-center h-full">
                      <XCircle size={16} className="text-red-500 mb-1" strokeWidth={2} />
                      <p className={`text-[9px] font-medium mb-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Trạng thái
                      </p>
                      <p className={`text-[10px] font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} line-clamp-2 leading-tight`}>
                        Đã kết thúc
                      </p>
                    </div>
                  </div>
                );
              }

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
                <div key="attendance-status-card" className={`flex-1 min-w-[120px] rounded-lg border ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                  <div className="p-2 flex flex-col items-center text-center h-full">
                    <StatusIcon size={16} className={iconColor} strokeWidth={2} />
                    <p className={`text-[9px] font-medium mb-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Trạng thái
                    </p>
                    <p className={`text-[10px] font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} line-clamp-2 leading-tight`}>
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

        {/* Schedule Section for Multiple Days */}
        {activity.type === 'multiple_days' && parsedScheduleData.length > 0 && (
          <div className={`mb-2 rounded-lg border p-2 ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <div className={`p-1 rounded-lg ${isDarkMode ? 'bg-blue-500/20' : 'bg-blue-50'}`}>
                  <Calendar size={14} className="text-blue-500" />
                </div>
                <h2 className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
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
            
            {/* Week Navigation */}
            {weeks.length > 0 && (
              <div className={`mb-2 rounded-lg border ${isDarkMode ? 'border-gray-600 bg-gray-800/50' : 'border-gray-300 bg-gray-50'} p-1.5`}>
                <div className="flex items-center justify-between gap-2">
                  {/* Nút Previous */}
                  <button
                    onClick={() => setCurrentWeekIndex(prev => Math.max(0, prev - 1))}
                    disabled={!weekInfo.canGoPrev}
                    className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${
                      weekInfo.canGoPrev
                        ? isDarkMode 
                          ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border border-blue-500/30' 
                          : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200'
                        : isDarkMode 
                          ? 'bg-gray-800/50 text-gray-500 opacity-50 cursor-not-allowed border border-gray-700' 
                          : 'bg-gray-100 text-gray-400 opacity-50 cursor-not-allowed border border-gray-300'
                    }`}
                    title="Tuần trước"
                  >
                    <ChevronLeft size={16} strokeWidth={2} />
                  </button>
                  
                  {/* Week Info Card */}
                  <div className={`flex-1 flex items-center justify-center gap-2 px-2 py-1.5 rounded-lg ${
                    isDarkMode 
                      ? 'bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border border-purple-500/30' 
                      : 'bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200'
                  }`}>
                    <CalendarRange size={14} strokeWidth={2} className={isDarkMode ? 'text-purple-300' : 'text-purple-600'} />
                    <div className="flex flex-col items-center gap-0.5">
                      <div className={`flex items-center gap-1.5 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        <span className="text-xs font-bold">Tuần</span>
                        <span className="text-sm font-extrabold">{weekInfo.currentWeek?.weekNumber || 1}</span>
                        {weekInfo.totalWeeks > 1 && (
                          <>
                            <span className="text-[10px] opacity-70">/</span>
                            <span className="text-[10px] opacity-70">{weekInfo.totalWeeks}</span>
                          </>
                        )}
                      </div>
                      {weekInfo.currentWeek && weekInfo.startDateStr && weekInfo.endDateStr && (
                        <div className={`flex items-center gap-1 text-[9px] font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          <Calendar size={10} strokeWidth={2} />
                          <span>{weekInfo.startDateStr} - {weekInfo.endDateStr}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Nút Next */}
                  <button
                    onClick={() => setCurrentWeekIndex(prev => Math.min(weekInfo.totalWeeks - 1, prev + 1))}
                    disabled={!weekInfo.canGoNext}
                    className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${
                      weekInfo.canGoNext
                        ? isDarkMode 
                          ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border border-blue-500/30' 
                          : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200'
                        : isDarkMode 
                          ? 'bg-gray-800/50 text-gray-500 opacity-50 cursor-not-allowed border border-gray-700' 
                          : 'bg-gray-100 text-gray-400 opacity-50 cursor-not-allowed border border-gray-300'
                    }`}
                    title="Tuần tiếp theo"
                  >
                    <ChevronRight size={16} strokeWidth={2} />
                  </button>
                </div>
              </div>
            )}

            {/* Day Tabs */}
            <div className="flex justify-center overflow-x-auto gap-1 mb-2 no-scrollbar">
              {currentWeekDays.map((weekDay, idx) => {
                const dayLabel = dayLabels[idx];
                const dayData = weekDay.data;
                const isInCurrentWeek = !!dayData;
                const isSelected = dayData && selectedDaySlot?.day === dayData.day;
                
                if (!dayData) {
                  return (
                    <div
                      key={`day-tab-out-${idx}-${weekDay.dayKey}`}
                      className={`flex-shrink-0 px-2 py-1 rounded-lg text-[10px] font-semibold border ${
                        isDarkMode
                          ? 'bg-gray-800/40 text-gray-400 opacity-60 border-gray-700/50'
                          : 'bg-gray-50 text-gray-400 opacity-60 border-gray-200'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="font-bold">{dayLabel}</span>
                        <span className={`text-[8px] italic ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
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
                    key={`day-tab-${dayData.day}-${idx}`}
                    type="button"
                    onClick={() => {
                      setSelectedDaySlot(isSelected ? null : { day: dayData.day, slot: 'morning' });
                    }}
                    className={`flex-shrink-0 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all relative border ${
                      isSelected
                        ? isDarkMode
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md border-blue-400'
                          : 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-sm border-blue-300'
                        : isDarkMode
                          ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 border-gray-600'
                          : 'bg-white text-gray-600 hover:bg-gray-100 border-gray-300'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <div className="flex items-center gap-1">
                        <span className="font-bold">{dayLabel}</span>
                        <span className={`text-[9px] px-1 py-0.5 rounded-full font-semibold ${
                          activeSlots > 0
                            ? isSelected
                              ? isDarkMode ? 'bg-white/20 text-white' : 'bg-white/30 text-white'
                              : isDarkMode ? 'bg-green-500/40 text-green-100' : 'bg-green-100 text-green-700'
                            : isSelected
                              ? isDarkMode ? 'bg-white/10 text-white/70' : 'bg-white/20 text-white/80'
                              : isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500'
                        }`}>{activeSlots}/{totalSlots}</span>
                      </div>
                      <span className={`text-[9px] font-medium ${
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
              <div className={`text-center py-4 rounded-lg border ${isDarkMode ? 'border-gray-600 bg-gray-800/50' : 'border-gray-300 bg-gray-50'}`}>
                <Calendar size={20} className={`mx-auto mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Chọn một ngày để xem lịch trình hoạt động
                </p>
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
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
                  <div className={`text-center py-4 rounded-lg border ${isDarkMode ? 'border-gray-600 bg-gray-800/50' : 'border-gray-300 bg-gray-50'}`}>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Ngày này chưa có lịch trình hoạt động
                    </p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-stretch">
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
                        key={`day-${dayData.day}-slot-${slotKey}`}
                        onClick={() => {
                          if (isActive) {
                            setSelectedDaySlot({ day: dayData.day, slot: slotKey as 'morning' | 'afternoon' | 'evening' });
                            // Scroll to map section to show location
                            setTimeout(() => {
                              const mapSection = document.getElementById('map-section');
                              if (mapSection) {
                                mapSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              }
                            }, 100);
                          }
                        }}
                        className={`rounded-lg border-2 p-2.5 transition-all duration-300 ${
                          isSelected && isActive
                            ? slotKey === 'morning'
                              ? isDarkMode
                                ? 'border-yellow-500 ring-2 ring-yellow-400/50 shadow-lg shadow-yellow-500/20'
                                : 'border-yellow-500 ring-2 ring-yellow-300/50 shadow-lg shadow-yellow-500/20'
                              : slotKey === 'afternoon'
                              ? isDarkMode
                                ? 'border-orange-500 ring-2 ring-orange-400/50 shadow-lg shadow-orange-500/20'
                                : 'border-orange-500 ring-2 ring-orange-300/50 shadow-lg shadow-orange-500/20'
                              : isDarkMode
                                ? 'border-blue-500 ring-2 ring-blue-400/50 shadow-lg shadow-blue-500/20'
                                : 'border-blue-500 ring-2 ring-blue-300/50 shadow-lg shadow-blue-500/20'
                            : styles.border
                        } ${
                          isDarkMode ? 'bg-gray-800' : 'bg-white'
                        } ${
                          !isActive ? 'opacity-60' : ''
                        } ${
                          isActive ? 'cursor-pointer hover:shadow-lg hover:scale-[1.02]' : 'cursor-default'
                        } flex flex-col h-full`}
                      >
                        {/* Slot Header */}
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2 flex-1">
                            {/* Icon */}
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                            } transition-transform duration-300 ${isSelected ? 'scale-105' : ''}`}>
                              <SlotIcon size={16} strokeWidth={2} className={styles.iconColor} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <p className={`text-xs font-bold ${isActive ? (isDarkMode ? 'text-white' : 'text-gray-900') : (isDarkMode ? 'text-gray-500' : 'text-gray-400')}`}>
                                  {slotName}
                                </p>
                                {isActive && (
                                  <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-semibold ${
                                    isDarkMode 
                                      ? 'bg-green-500/30 text-green-200 border border-green-500/50' 
                                      : 'bg-green-100 text-green-700 border border-green-300'
                                  }`}>
                                    Hoạt động
                                  </span>
                                )}
                              </div>
                              {slot && (
                                <div className="flex items-center gap-1">
                                  <Clock size={10} strokeWidth={2} className={styles.timeColor} />
                                  <p className={`text-[10px] font-semibold ${styles.timeColor}`}>
                                    {slot.startTime} - {slot.endTime}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                          {isSelected && isActive && (
                            <div className={`w-2 h-2 rounded-full ${
                              slotKey === 'morning' 
                                ? isDarkMode ? 'bg-yellow-400' : 'bg-yellow-500'
                                : slotKey === 'afternoon'
                                ? isDarkMode ? 'bg-orange-400' : 'bg-orange-500'
                                : isDarkMode ? 'bg-blue-400' : 'bg-blue-500'
                            } animate-pulse shadow-lg`} title="Đang được chọn"></div>
                          )}
                        </div>

                        {/* Slot Content */}
                        {isActive && slot ? (
                          <div className={`space-y-2 pt-2 border-t flex-1 flex flex-col ${isDarkMode ? 'border-gray-700/50' : 'border-gray-200'}`}>
                            {/* Activity Description */}
                            <div className={`p-2 rounded-lg min-h-[60px] flex flex-col ${
                              isDarkMode ? 'border border-gray-700' : 'border border-gray-200'
                            }`}>
                              <div className="flex items-center justify-between mb-1">
                                <label className={`block text-[9px] font-bold uppercase tracking-wide flex items-center gap-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                  <BookOpen size={9} strokeWidth={2} />
                                  <span>Mô tả hoạt động</span>
                                </label>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedDaySlot({ day: dayData.day, slot: slotKey as 'morning' | 'afternoon' | 'evening' });
                                    setTimeout(() => {
                                      const mapSection = document.getElementById('map-section');
                                      if (mapSection) {
                                        mapSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                      }
                                    }, 100);
                                  }}
                                  className={`px-1.5 py-0.5 rounded text-[8px] font-semibold transition-all flex items-center gap-1 ${
                                    isDarkMode
                                      ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border border-blue-500/30'
                                      : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200'
                                  }`}
                                  title="Xem địa điểm trên bản đồ"
                                >
                                  <Calendar size={8} strokeWidth={2} />
                                  <span>Lịch trình</span>
                                </button>
                              </div>
                              <p className={`text-[10px] leading-relaxed flex-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                {slot.activities || <span className="italic opacity-60">Chưa cập nhật</span>}
                              </p>
                            </div>

                            {/* Detailed Location */}
                            <div className={`p-2 rounded-lg min-h-[50px] flex flex-col ${
                              isDarkMode ? 'border border-gray-700' : 'border border-gray-200'
                            }`}>
                              <div className="flex items-center justify-between mb-1">
                                <label className={`block text-[9px] font-bold uppercase tracking-wide flex items-center gap-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                  <FileText size={9} strokeWidth={2} />
                                  <span>Địa điểm chi tiết</span>
                                </label>
                                {hasLocation && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedDaySlot({ day: dayData.day, slot: slotKey as 'morning' | 'afternoon' | 'evening' });
                                      setTimeout(() => {
                                        const mapSection = document.getElementById('map-section');
                                        if (mapSection) {
                                          mapSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                        }
                                      }, 100);
                                    }}
                                    className={`px-1.5 py-0.5 rounded text-[8px] font-semibold transition-all flex items-center gap-1 ${
                                      isDarkMode
                                        ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30'
                                        : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                                    }`}
                                    title="Xem địa điểm trên bản đồ"
                                  >
                                    <MapPin size={8} strokeWidth={2} />
                                    <span>Địa điểm</span>
                                  </button>
                                )}
                              </div>
                              <p className={`text-[10px] leading-relaxed flex-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                {(slot.detailedLocation || dayData.dayDetailedLocation) || <span className="italic opacity-60">Chưa cập nhật</span>}
                              </p>
                            </div>

                            {/* Map Location */}
                            <div className="flex-1 flex flex-col">
                              <label className={`block mb-1.5 text-[9px] font-bold uppercase tracking-wide flex items-center gap-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                <Globe size={9} strokeWidth={2} />
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
                                  className={`w-full rounded-lg border px-2 py-1.5 text-left transition-all duration-300 ${
                                    isSelected
                                      ? isDarkMode
                                        ? 'border-blue-500 bg-blue-500/10 text-blue-200'
                                        : 'border-blue-400 bg-blue-50 text-blue-800'
                                      : isDarkMode
                                        ? 'border-gray-600 text-gray-300 hover:border-gray-500'
                                        : 'border-gray-300 text-gray-700 hover:border-gray-400'
                                  }`}
                                >
                                  <div className="flex items-start gap-1.5">
                                    <MapPin size={12} strokeWidth={2} className="mt-0.5 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <p className={`font-semibold text-[10px] mb-0.5 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                        {location.address}
                                      </p>
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className={`text-[9px] font-mono ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                          {location.lat?.toFixed(5)}, {location.lng?.toFixed(5)}
                                        </span>
                                        <span className={`text-[9px] px-1 py-0.5 rounded-full font-semibold ${
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
                                <div className={`w-full rounded-lg border border-dashed px-2 py-1.5 min-h-[50px] flex items-center ${
                                  isDarkMode ? 'border-gray-600' : 'border-gray-300'
                                }`}>
                                  <p className={`text-[10px] italic ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                    Chưa có địa điểm trên bản đồ
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          /* Empty State */
                          <div className={`text-center py-6 rounded-lg flex-1 flex flex-col items-center justify-center ${
                            isDarkMode ? 'border border-gray-700' : 'border border-gray-200'
                          }`}>
                            <div className={`w-8 h-8 mx-auto mb-1.5 rounded-full flex items-center justify-center ${
                              isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                            }`}>
                              <XCircle size={14} className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} strokeWidth={2} />
                            </div>
                            <p className={`text-[10px] font-medium ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
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
              <div className={`mt-2 p-1.5 rounded-lg border ${isDarkMode ? 'bg-blue-500/10 border-blue-500/30' : 'bg-blue-50 border-blue-200'}`}>
                <div className="flex items-center gap-1.5">
                  <AlertCircle size={12} className="text-blue-500" />
                  <p className={`text-[10px] font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                    Đang hiển thị địa điểm cho {selectedDaySlot.slot === 'morning' ? 'Buổi Sáng' : selectedDaySlot.slot === 'afternoon' ? 'Buổi Chiều' : 'Buổi Tối'} - Ngày {selectedDaySlot.day} trên bản đồ
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Legacy Schedule Section */}
        {activity.type === 'multiple_days' && parsedScheduleData.length === 0 && activity.schedule && activity.schedule.length > 0 && (
          <div className={`mb-2 rounded-lg border p-2 ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
            <div className="flex items-center gap-1.5 mb-2">
              <div className={`p-1 rounded-lg ${isDarkMode ? 'bg-blue-500/20' : 'bg-blue-50'}`}>
                <Calendar size={14} className="text-blue-500" />
              </div>
              <h2 className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Lịch trình theo ngày
              </h2>
            </div>
            <div className="space-y-3">
              {activity.schedule.map((daySchedule) => {
                const scheduleDate = new Date(daySchedule.date);
                const formattedDate = scheduleDate.toLocaleDateString('vi-VN', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                });

                // Parse activities text theo format từ admin
                const activitiesText = daySchedule.activities || '';
                const lines = activitiesText.split('\n').filter(line => line.trim());
                
                // Parse các buổi từ format: "Buổi Sáng (07:00-11:30) - [mô tả] - Địa điểm chi tiết: ... - Địa điểm map: ..."
                interface ParsedSlot {
                  name: string;
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
                }
                
                const parsedSlots: ParsedSlot[] = [];
                let dayDetailedLocation: string | undefined;
                let dayMapLocation: { address: string; lat?: number; lng?: number; radius?: number } | undefined;
                let freeText: string[] = [];
                
                lines.forEach(line => {
                  const trimmed = line.trim();
                  
                  // Parse buổi: "Buổi Sáng (07:00-11:30) - ..."
                  const slotMatch = trimmed.match(/^Buổi (Sáng|Chiều|Tối)\s*\((\d{2}:\d{2})-(\d{2}:\d{2})\)/);
                  if (slotMatch) {
                    const slotName = `Buổi ${slotMatch[1]}`;
                    const startTime = slotMatch[2];
                    const endTime = slotMatch[3];
                    
                    // Extract mô tả hoạt động - more precise pattern
                    // Pattern: "Buổi Sáng (07:00-11:30) - mô tả hoạt động - Địa điểm..."
                    const timePattern = /\(\d{2}:\d{2}-\d{2}:\d{2}\)/;
                    const timeMatch = trimmed.match(timePattern);
                    let activities: string | undefined = undefined;
                    if (timeMatch) {
                      const afterTime = trimmed.substring(trimmed.indexOf(timeMatch[0]) + timeMatch[0].length);
                      const activitiesMatch = afterTime.match(/-\s*([^-]*?)(?:\s*-\s*Địa điểm|$)/);
                      if (activitiesMatch && activitiesMatch[1]) {
                        const extracted = activitiesMatch[1].trim();
                        // Only set if it's not empty and doesn't look like it's part of location info
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
                    
                    // Extract địa điểm chi tiết: "Địa điểm chi tiết: ..."
                    const detailedMatch = trimmed.match(/Địa điểm chi tiết:\s*(.+?)(?:\s*-\s*Địa điểm map|$)/);
                    const detailedLocation = detailedMatch ? detailedMatch[1].trim() : undefined;
                    
                    // Extract địa điểm map: "Địa điểm map: [address] (lat, lng) - Bán kính: [radius]m"
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
                    
                    parsedSlots.push({
                      name: slotName,
                      startTime,
                      endTime,
                      activities,
                      detailedLocation,
                      mapLocation
                    });
                  } 
                  // Parse địa điểm chi tiết theo ngày (perDay mode): "Địa điểm chi tiết: ..."
                  else if (trimmed.startsWith('Địa điểm chi tiết:') && !trimmed.includes('Buổi')) {
                    const match = trimmed.match(/Địa điểm chi tiết:\s*(.+?)(?:\s*-\s*Địa điểm map|$)/);
                    if (match) {
                      dayDetailedLocation = match[1].trim();
                    }
                  }
                  // Parse địa điểm map theo ngày (perDay mode): "Địa điểm map: ..."
                  else if (trimmed.startsWith('Địa điểm map:') && !trimmed.includes('Buổi')) {
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
                  // Free text (ghi chú)
                  else if (trimmed && !trimmed.includes('Địa điểm') && !trimmed.includes('Buổi')) {
                    freeText.push(trimmed);
                  }
                });

                // Icons cho từng buổi
                const getSlotIcon = (name: string) => {
                  if (name.includes('Sáng')) return <Sunrise size={14} className={isDarkMode ? 'text-yellow-400' : 'text-yellow-600'} />;
                  if (name.includes('Chiều')) return <Sun size={14} className={isDarkMode ? 'text-orange-400' : 'text-orange-600'} />;
                  if (name.includes('Tối')) return <Moon size={14} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} />;
                  return <Clock size={14} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />;
                };

                return (
                  <div key={`schedule-day-${daySchedule.day}-${daySchedule.date}`} className={`p-2.5 rounded-lg border-2 ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                    {/* Day Header */}
                    <div className="flex items-start justify-between mb-2.5 pb-2 border-b ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}">
                      <div>
                        <h3 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          Ngày {daySchedule.day}
                        </h3>
                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {formattedDate}
                        </p>
                      </div>
                      {parsedSlots.length > 0 && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-blue-500/20 text-blue-200' : 'bg-blue-100 text-blue-700'}`}>
                          {parsedSlots.length} buổi
                        </span>
                      )}
                    </div>

                    {/* Time Slots */}
                    {parsedSlots.length > 0 && (
                      <div className="mb-3 space-y-2">
                        {parsedSlots.map((slot, idx) => (
                          <div key={`day-${daySchedule.day}-slot-${slot.name}-${idx}`} className={`p-2 rounded border ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                            {/* Slot Header */}
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {getSlotIcon(slot.name)}
                                <span className={`text-xs font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {slot.name}
                                </span>
                              </div>
                              <span className={`text-[10px] ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                {slot.startTime} - {slot.endTime}
                              </span>
                            </div>

                            {/* Activities Description */}
                            {slot.activities && (
                              <div className="mb-2">
                                <p className={`text-[10px] ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                  {slot.activities}
                                </p>
                              </div>
                            )}

                            {/* Detailed Location for this slot */}
                            {slot.detailedLocation && (
                              <div className="mb-2 flex items-start gap-1.5">
                                <FileText size={10} className={`mt-0.5 flex-shrink-0 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                                <div className="flex-1 min-w-0">
                                  <p className={`text-[10px] font-medium mb-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                    Địa điểm chi tiết
                                  </p>
                                  <p className={`text-[10px] ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                    {slot.detailedLocation}
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Map Location for this slot */}
                            {slot.mapLocation && (
                              <div className="flex items-start gap-1.5">
                                <MapPin size={10} className={`mt-0.5 flex-shrink-0 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                                <div className="flex-1 min-w-0">
                                  <p className={`text-[10px] font-medium mb-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                    Địa điểm trên bản đồ
                                  </p>
                                  <p className={`text-[10px] ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                    {slot.mapLocation.address}
                                  </p>
                                  {(slot.mapLocation.lat !== undefined && slot.mapLocation.lng !== undefined) && (
                                    <p className={`text-[9px] mt-0.5 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                                      {slot.mapLocation.lat.toFixed(5)}, {slot.mapLocation.lng.toFixed(5)}
                                      {slot.mapLocation.radius && ` • ${slot.mapLocation.radius}m`}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Per Day Location (perDay mode) */}
                    {(dayMapLocation || dayDetailedLocation) && (
                      <div className={`mb-3 p-2 rounded border ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                        <div className="flex items-center gap-1.5 mb-2">
                          <MapPin size={12} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
                          <p className={`text-xs font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            Địa điểm chung cho ngày
                          </p>
                        </div>
                        {dayDetailedLocation && (
                          <div className="mb-2">
                            <p className={`text-[10px] font-medium mb-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              Địa điểm chi tiết
                            </p>
                            <p className={`text-[10px] ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              {dayDetailedLocation}
                            </p>
                          </div>
                        )}
                        {dayMapLocation && (
                          <div>
                            <p className={`text-[10px] font-medium mb-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              Địa điểm trên bản đồ
                            </p>
                            <p className={`text-[10px] ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              {dayMapLocation.address}
                            </p>
                            {(dayMapLocation.lat !== undefined && dayMapLocation.lng !== undefined) && (
                              <p className={`text-[9px] mt-0.5 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                                {dayMapLocation.lat.toFixed(5)}, {dayMapLocation.lng.toFixed(5)}
                                {dayMapLocation.radius && ` • ${dayMapLocation.radius}m`}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Free Text Notes */}
                    {freeText.length > 0 && (
                      <div className={`p-2 rounded border ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                        <div className="flex items-center gap-1.5 mb-1">
                          <StickyNote size={12} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
                          <p className={`text-[10px] font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            Ghi chú
                          </p>
                        </div>
                        <p className={`text-[10px] whitespace-pre-line ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {freeText.join('\n')}
                        </p>
                      </div>
                    )}

                    {/* Empty State */}
                    {parsedSlots.length === 0 && !dayMapLocation && !dayDetailedLocation && freeText.length === 0 && (
                      <div className={`text-center py-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        <p className="text-xs">Chưa có thông tin lịch trình cho ngày này</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Combined Time Slots and Locations Section */}
        {activity.type === 'single_day' && activity.timeSlots && activity.timeSlots.length > 0 && (
          <div className={`mb-2 p-2 rounded-lg border ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
            <div className="flex items-center gap-1.5 mb-2">
              <Clock size={14} className="text-orange-500" />
              <h2 className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Lịch trình hoạt động và Địa điểm
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
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
                    key={`slot-${slotName}-${slot?.startTime || ''}-${slot?.endTime || ''}`}
                    onClick={() => {
                      if (isActive && hasLocation) {
                        if (activity.multiTimeLocations && activity.multiTimeLocations.length === 1) {
                          setSelectedTimeSlot(slotMapName);
                        } else {
                          setSelectedTimeSlot(isSelected ? null : slotMapName);
                        }
                        // Scroll to map section to show location
                        setTimeout(() => {
                          const mapSection = document.getElementById('map-section');
                          if (mapSection) {
                            mapSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }
                        }, 100);
                      }
                    }}
                    className={`rounded-lg border-2 transition-all duration-300 ${
                      isSelected && isActive
                        ? slotName === 'Buổi Sáng'
                          ? isDarkMode
                            ? 'border-yellow-500 ring-2 ring-yellow-400/50 shadow-lg shadow-yellow-500/20'
                            : 'border-yellow-500 ring-2 ring-yellow-300/50 shadow-lg shadow-yellow-500/20'
                          : slotName === 'Buổi Chiều'
                          ? isDarkMode
                            ? 'border-orange-500 ring-2 ring-orange-400/50 shadow-lg shadow-orange-500/20'
                            : 'border-orange-500 ring-2 ring-orange-300/50 shadow-lg shadow-orange-500/20'
                          : isDarkMode
                            ? 'border-blue-500 ring-2 ring-blue-400/50 shadow-lg shadow-blue-500/20'
                            : 'border-blue-500 ring-2 ring-blue-300/50 shadow-lg shadow-blue-500/20'
                        : isActive
                        ? `${config.borderColor}`
                        : isDarkMode
                        ? 'border-gray-600 opacity-60'
                        : 'border-gray-300 opacity-60'
                    } ${
                      isActive && hasLocation ? 'cursor-pointer hover:shadow-lg hover:scale-[1.02]' : 'cursor-default'
                    }`}
                  >
                    {/* Header */}
                    <div className={`p-1.5 border-b ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                      <div className="flex items-start gap-1.5">
                        <config.Icon size={14} className={`${config.iconColor} mt-0.5`} />
                        <div className="flex-1">
                          <h3 className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {slotName}
                          </h3>
                          <p className={`text-[10px] font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {isActive ? 'Đang hoạt động' : 'Không hoạt động'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-2 space-y-1.5 text-left">
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
                        <div className="flex items-center justify-between mb-1">
                          <p className={`text-[10px] font-semibold uppercase tracking-wide ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            Mô tả hoạt động
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
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
                            className={`px-1.5 py-0.5 rounded text-[8px] font-semibold transition-all flex items-center gap-1 ${
                              isDarkMode
                                ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border border-blue-500/30'
                                : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200'
                            }`}
                            title="Xem địa điểm trên bản đồ"
                          >
                            <Calendar size={8} strokeWidth={2} />
                            <span>Lịch trình</span>
                          </button>
                        </div>
                        <p className={`text-[11px] leading-relaxed ${hasActivities ? (isDarkMode ? 'text-gray-300' : 'text-gray-700') : 'italic text-gray-500'}`}>
                          {hasActivities ? slot?.activities : 'Chưa cập nhật'}
                        </p>
                      </div>

                      <div className={`pt-2 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                        <div className="flex items-center justify-between mb-1">
                          <p className={`text-[10px] font-semibold uppercase tracking-wide ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            Địa điểm chi tiết
                          </p>
                          {hasLocation && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
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
                              className={`px-1.5 py-0.5 rounded text-[8px] font-semibold transition-all flex items-center gap-1 ${
                                isDarkMode
                                  ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30'
                                  : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                              }`}
                              title="Xem địa điểm trên bản đồ"
                            >
                              <MapPin size={8} strokeWidth={2} />
                              <span>Địa điểm</span>
                            </button>
                          )}
                        </div>
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
                                <MapPin size={14} className="text-red-500 mt-0.5" />
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

        {/* Legacy Locations Section */}
        {(!activity.timeSlots || activity.timeSlots.length === 0) && activity.isMultiTimeLocation && activity.multiTimeLocations && activity.multiTimeLocations.length > 0 && (
          <div className={`mb-2 p-2 rounded-lg border ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
            <div className="flex items-center gap-1.5 mb-2">
              <MapPin size={14} className="text-red-500" />
              <div>
                <h2 className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Địa điểm theo từng buổi
                </h2>
                <p className={`text-[10px] ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Nhấn vào địa điểm để xem trên bản đồ
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
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
                          ? 'bg-gray-700 border-gray-600' 
                          : 'bg-gray-100 border-gray-300'
                        : isDarkMode
                          ? 'bg-gray-800 border-gray-700'
                          : 'bg-white border-gray-200'
                    }`}>
                      <div className="flex items-start space-x-3 mb-3">
                        <MapPin size={16} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
                        <div className="flex-1">
                          <h3 className={`font-bold text-base mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            Hoạt động cùng 1 địa điểm
                          </h3>
                          <p className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                            {firstLocation.address || 'Không có địa chỉ'}
                          </p>
                          {firstLocation.radius && (
                            <div className="flex items-center space-x-2 mb-3">
                              <span className={`text-xs px-2 py-1 rounded flex items-center gap-1 border ${isDarkMode ? 'bg-gray-700 text-gray-300 border-gray-600' : 'bg-gray-100 text-gray-700 border-gray-300'}`}>
                                <Target size={12} />
                                Bán kính: {firstLocation.radius}m
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        {group.map((mtl, mtlIdx) => {
                          const timeSlotName = mtl.timeSlot === 'morning' ? 'Buổi Sáng' :
                                              mtl.timeSlot === 'afternoon' ? 'Buổi Chiều' :
                                              mtl.timeSlot === 'evening' ? 'Buổi Tối' : mtl.timeSlot;
                          const TimeSlotIcon = mtl.timeSlot === 'morning' ? Sunrise :
                                               mtl.timeSlot === 'afternoon' ? Sun :
                                               mtl.timeSlot === 'evening' ? Moon : MapPin;
                          const isSelected = selectedTimeSlot === mtl.timeSlot;
                          const timeSlot = activity.timeSlots.find(slot => slot.isActive && slotMap[slot.name as keyof typeof slotMap] === mtl.timeSlot);
                          const detailedLocation = timeSlot?.detailedLocation?.[mtl.timeSlot];

                          return (
                            <button
                              key={`mtl-${mtl.id || mtl.timeSlot}-${mtl.timeSlot}-${mtlIdx}`}
                              onClick={() => {
                                setSelectedTimeSlot(isSelected ? null : mtl.timeSlot);
                                setTimeout(() => {
                                  const mapSection = document.getElementById('map-section');
                                  if (mapSection) {
                                    mapSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                  }
                                }, 100);
                              }}
                              className={`w-full p-2 rounded-lg text-left transition-all duration-300 border ${
                                isSelected
                                  ? isDarkMode
                                    ? 'bg-gray-700 border-gray-600'
                                    : 'bg-gray-100 border-gray-300'
                                  : isDarkMode
                                    ? 'bg-gray-700/30 border-gray-600/50 hover:bg-gray-700/50'
                                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <TimeSlotIcon size={18} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
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
                                      <p className={`text-xs mt-1 flex items-center gap-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                        <Target size={12} />
                                        {detailedLocation}
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
                const TimeSlotIcon = mtl.timeSlot === 'morning' ? Sunrise :
                                     mtl.timeSlot === 'afternoon' ? Sun :
                                     mtl.timeSlot === 'evening' ? Moon : MapPin;
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
                    key={`mtl-single-${mtl.id || mtl.timeSlot}-${mtl.timeSlot}`}
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
                      <TimeSlotIcon size={28} className={isDarkMode ? 'text-gray-300' : 'text-gray-600'} />
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
                            <p className={`text-xs mb-1 flex items-center gap-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              <Clock size={12} />
                              {timeSlot.startTime} - {timeSlot.endTime}
                            </p>
                          );
                        })()}
                        {detailedLocation && (
                          <p className={`text-xs flex items-center gap-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            <Target size={12} />
                            {detailedLocation}
                          </p>
                        )}
                        {mtl.radius && (
                          <div className="mt-2 flex items-center space-x-2">
                            <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${getBadgeClasses()}`}>
                              <Target size={12} />
                              Bán kính: {mtl.radius}m
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
              <div className={`mt-2 p-1.5 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className="flex items-center gap-1.5">
                  <AlertCircle size={12} className="text-blue-500" />
                  <p className={`text-[10px] font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                    Đang hiển thị địa điểm cho {selectedTimeSlot === 'morning' ? 'Buổi Sáng' : selectedTimeSlot === 'afternoon' ? 'Buổi Chiều' : 'Buổi Tối'} trên bản đồ
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Description Section */}
        <div className={`mb-2 rounded-lg border p-2 ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
          <div className="flex items-center gap-1.5 mb-2">
            <div className={`p-1 rounded-lg ${isDarkMode ? 'bg-cyan-500/20' : 'bg-cyan-50'}`}>
              <FileText size={14} className="text-cyan-500" />
            </div>
            <h2 className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Mô tả chi tiết</h2>
          </div>
          <div className={`prose prose-sm max-w-none ${isDarkMode ? 'prose-invert' : ''}`}>
            <p className={`text-[10px] sm:text-xs leading-relaxed whitespace-pre-wrap ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              {activity.description}
            </p>
          </div>
        </div>

        {/* Participants Section */}
        {(() => {
          const approvedParticipants = activity.participants?.filter((p: any) => {
            const approvalStatus = p.approvalStatus || 'pending';
            return approvalStatus === 'approved';
          }) || [];
          
          return (
            <div className={`mb-2 rounded-lg border p-2 ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
              <div className="flex items-center gap-1.5 mb-2">
                <div className={`p-1 rounded-lg ${isDarkMode ? 'bg-green-500/20' : 'bg-green-50'}`}>
                  <Users size={14} className="text-green-500" />
              </div>
                <h2 className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Danh sách người tham gia ({approvedParticipants.length})
              </h2>
            </div>
              {approvedParticipants.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
                  {approvedParticipants.map((participant: any, index: number) => (
                <div
                  key={participant._id || participant.userId || `participant-${index}`}
                      className={`p-1.5 rounded-lg border ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}
                >
                      <div className="flex items-center gap-1.5">
                    <img
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(participant.name)}&background=random&color=fff`}
                      alt={participant.name}
                          className="w-6 h-6 rounded-full flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                          <p className={`text-[10px] font-semibold truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{participant.name}</p>
                          <p className={`text-[9px] truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{participant.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
              ) : (
                <div className={`text-center py-6 rounded-lg border border-dashed ${isDarkMode ? 'border-gray-600 bg-gray-800/30' : 'border-gray-300 bg-gray-50/50'}`}>
                  <Users size={24} className={`mx-auto mb-1.5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                  <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Chưa có người nào đăng ký
                  </p>
          </div>
        )}
            </div>
          );
        })()}

        {/* Map Section */}
        <div id="map-section" className={`mb-2 rounded-lg border p-2 ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <div className={`p-1 rounded-lg ${isDarkMode ? 'bg-red-500/20' : 'bg-red-50'}`}>
                <MapPin size={14} className="text-red-500" />
              </div>
              <h2 className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Vị trí hoạt động trên bản đồ
              </h2>
            </div>
            {(selectedTimeSlot || selectedDaySlot) && (
              <button
                onClick={() => {
                  setSelectedTimeSlot(null);
                  setSelectedDaySlot(null);
                }}
                className={`px-2 py-1 rounded text-xs font-medium transition-all duration-300 ${
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
                      <OpenStreetMapPicker
                        key={`multiple-days-selected-${selectedDaySlot.day}-${selectedDaySlot.slot}-${locationPickerKey}`}
                        initialLocation={{
                          lat: location.lat,
                          lng: location.lng,
                          address: location.address || '',
                          radius: location.radius || 200
                        }}
                        isDarkMode={isDarkMode}
                        onLocationChange={() => {}}
                        isReadOnly={true}
                      />
                    );
                  } else {
                    // Hiển thị thông báo khi không có địa điểm
                    const slotName = selectedDaySlot.slot === 'morning' ? 'Buổi Sáng' : selectedDaySlot.slot === 'afternoon' ? 'Buổi Chiều' : 'Buổi Tối';
                    return (
                      <div className={`text-center py-8 rounded-lg border ${isDarkMode ? 'border-gray-600 bg-gray-800/50' : 'border-gray-300 bg-gray-50'}`}>
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
                <div className={`text-center py-8 rounded-lg border border-dashed ${isDarkMode ? 'border-gray-600 bg-gray-700/30' : 'border-gray-300 bg-gray-50/50'}`}>
                  <div className="w-12 h-12 mx-auto mb-2 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Chưa có dữ liệu vị trí bản đồ
                  </p>
                  <p className={`text-[10px] mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
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
                <div key="no-location-data" className={`text-center py-8 rounded-lg border border-dashed ${isDarkMode ? 'border-gray-600 bg-gray-700/30' : 'border-gray-300 bg-gray-50/50'}`}>
                  <div className="w-12 h-12 mx-auto mb-2 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </div>
                  <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Không có dữ liệu vị trí bản đồ</p>
                  <p className={`text-[10px] mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Vui lòng kiểm tra lại thông tin hoạt động</p>
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

      {/* Registration Modal for Multiple Days Activities */}
      <RegistrationModal
        isOpen={showRegistrationModal && activity?.type === 'multiple_days' && parsedScheduleData.length > 0}
        onClose={() => {
                  setShowRegistrationModal(false);
                  setSelectedDaySlotsForRegistration([]);
                }}
        parsedScheduleData={parsedScheduleData as any}
        selectedDaySlots={selectedDaySlotsForRegistration}
        onToggleSlot={toggleDaySlotSelection}
        onRegister={handleRegisterWithDaySlots}
        isRegistering={isRegistering}
        isRegistered={isRegistered}
        activity={activity as any || null}
        isDarkMode={isDarkMode}
        calculateRegistrationRate={calculateRegistrationRate}
        canRegister={canRegister}
        getRegistrationThreshold={getRegistrationThreshold}
        calculateTotalRegistrationRate={calculateTotalRegistrationRate}
      />

      {/* Single Day Registration Modal */}
      {showSingleDayRegistrationModal && activity && activity.type === 'single_day' && (
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
                  Để tham gia hoạt động này, bạn phải chọn đăng ký ít nhất <span className="font-bold text-base">{activity.registrationThreshold !== undefined && activity.registrationThreshold !== null ? activity.registrationThreshold : 80}%</span> tổng số buổi có sẵn
                </p>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="mb-4">
                {activity.date && (
                  <p className={`text-xs mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Ngày: {new Date(activity.date).toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                )}
              </div>

              {/* Time Slots */}
              <div className="space-y-3">
                {activity.timeSlots?.filter((slot: any) => slot.isActive).map((slot: any) => {
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
                          
                          {/* Location */}
                          {(() => {
                            // Kiểm tra vị trí từ multiTimeLocations
                            let locationText: string | undefined = undefined;
                            const multiTimeLocation = activity.multiTimeLocations?.find((mtl: any) => mtl.timeSlot === slotKey);
                            if (multiTimeLocation && multiTimeLocation.address) {
                              locationText = multiTimeLocation.address;
                            }
                            // Nếu không có trong multiTimeLocations, kiểm tra detailedLocation của slot
                            else if (slot.detailedLocation) {
                              locationText = slot.detailedLocation;
                            }
                            // Nếu không có, kiểm tra locationData chung
                            else if (activity.locationData && activity.locationData.address) {
                              locationText = activity.locationData.address;
                            }
                            // Nếu không có, kiểm tra detailedLocation chung
                            else if (activity.detailedLocation) {
                              locationText = activity.detailedLocation;
                            }
                            // Nếu không có, dùng location chung
                            else if (activity.location && activity.location !== 'Nhiều địa điểm') {
                              locationText = activity.location;
                            }

                            if (locationText) {
                              return (
                                <div className={`flex items-start gap-1 mb-1.5 text-left ${
                                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                }`}>
                                  <MapPin size={10} className="mt-0.5 flex-shrink-0" />
                                  <span className="text-xs line-clamp-1 text-left">{locationText}</span>
                                </div>
                              );
                            }
                            return null;
                          })()}
                          
                          {/* Activities description */}
                          {slot.activities && (
                            <p className={`text-xs mt-1.5 pt-1.5 border-t ${
                              isSelected
                                ? isDarkMode ? 'border-blue-500/60 text-gray-400' : 'border-blue-400 text-gray-600'
                                : isDarkMode ? 'border-gray-700 text-gray-500' : 'border-gray-200 text-gray-500'
                            }`}>
                              {slot.activities}
                            </p>
                          )}
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
                      const activeSlots = activity.timeSlots?.filter((slot: any) => slot.isActive) || [];
                      const totalAvailableSlots = activeSlots.length;
                      const selectedSlotsCount = selectedSingleDaySlots.length;
                      const totalRate = totalAvailableSlots > 0 
                        ? Math.round((selectedSlotsCount / totalAvailableSlots) * 100) 
                        : 0;
                      const threshold = activity.registrationThreshold !== undefined && activity.registrationThreshold !== null 
                        ? activity.registrationThreshold 
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
                  const activeSlots = activity.timeSlots?.filter((slot: any) => slot.isActive) || [];
                  const totalAvailableSlots = activeSlots.length;
                  const selectedSlotsCount = selectedSingleDaySlots.length;
                  const totalRate = totalAvailableSlots > 0 
                    ? Math.round((selectedSlotsCount / totalAvailableSlots) * 100) 
                    : 0;
                  const threshold = activity.registrationThreshold !== undefined && activity.registrationThreshold !== null 
                    ? activity.registrationThreshold 
                    : 80;
                  const isRateSufficient = totalRate >= threshold;
                  const isDisabled = isRegistering || selectedSingleDaySlots.length === 0 || !isRateSufficient;

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
                      {isRegistering ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          <span>{isRegistered ? 'Đang cập nhật...' : 'Đang đăng ký...'}</span>
                        </>
                      ) : (
                        <>
                          {isRegistered ? (
                            <>
                              <CheckCircle2 size={14} />
                              <span>Cập nhật</span>
                            </>
                          ) : (
                            <>
                              <UserPlus size={14} />
                              <span>Đăng ký</span>
                            </>
                          )}
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

      <Footer />
    </div>
  );
}
